import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const requireTenant = (req: Request) => {
  if (!req.tenantId) throw Object.assign(new Error('Tenant context is required'), { status: 400, code: 'TENANT_REQUIRED' });
  return req.tenantId;
};

const requireUser = (req: Request) => {
  if (!req.userId) throw Object.assign(new Error('Authenticated user is required'), { status: 401, code: 'USER_REQUIRED' });
  return req.userId;
};

const positiveInt = (value: unknown, code: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw Object.assign(new Error(`${code} harus berupa integer positif`), { status: 400, code });
  return parsed;
};

const cleanText = (value: unknown, max = 5000) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
};

const dateOnly = (value: unknown, code: string) => {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw Object.assign(new Error(`${code} harus berformat YYYY-MM-DD`), { status: 400, code });
  }
  return text;
};

const score5 = (value: unknown, code: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5) {
    throw Object.assign(new Error(`${code} harus bernilai 0 sampai 5`), { status: 400, code });
  }
  return parsed;
};

const getSelfEmployee = async (tenantId: number, userId: number) => {
  const employee = await prisma.employees.findFirst({
    where: { tenant_id: tenantId, user_id: userId, status: 'active' },
    select: { id: true, employee_id: true, name: true, department: true, position: true },
  });
  if (!employee) throw Object.assign(new Error('User belum terhubung ke employee aktif'), { status: 404, code: 'EMPLOYEE_PROFILE_REQUIRED' });
  return employee;
};

const normalizeGoals = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    throw Object.assign(new Error('Goals wajib berisi 1 sampai 50 item'), { status: 400, code: 'APPRAISAL_GOALS_REQUIRED' });
  }
  const goals = value.map((raw: any, index) => {
    const title = cleanText(raw?.title, 200);
    const weight = Number(raw?.weight);
    if (!title) throw Object.assign(new Error(`Goal #${index + 1} wajib memiliki title`), { status: 400, code: 'APPRAISAL_GOAL_TITLE_REQUIRED' });
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
      throw Object.assign(new Error(`Weight goal #${index + 1} tidak valid`), { status: 400, code: 'INVALID_APPRAISAL_GOAL_WEIGHT' });
    }
    return { title, description: cleanText(raw?.description), weight };
  });
  const totalWeight = goals.reduce((sum, goal) => sum + goal.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw Object.assign(new Error(`Total weight appraisal harus 100, saat ini ${totalWeight}`), { status: 400, code: 'APPRAISAL_WEIGHT_TOTAL_INVALID' });
  }
  return goals;
};

const normalizeScoreEntries = (value: unknown, scoreKey: 'selfScore' | 'reviewerScore', commentKey: 'selfComment' | 'reviewerComment') => {
  if (!Array.isArray(value) || value.length === 0) {
    throw Object.assign(new Error('Nilai goal wajib dikirim'), { status: 400, code: 'APPRAISAL_GOAL_SCORES_REQUIRED' });
  }
  const seen = new Set<number>();
  return value.map((raw: any) => {
    const goalId = positiveInt(raw?.goalId, 'INVALID_APPRAISAL_GOAL_ID');
    if (seen.has(goalId)) throw Object.assign(new Error('Goal appraisal duplikat'), { status: 400, code: 'DUPLICATE_APPRAISAL_GOAL_SCORE' });
    seen.add(goalId);
    return { goalId, score: score5(raw?.[scoreKey], 'INVALID_APPRAISAL_SCORE'), comment: cleanText(raw?.[commentKey]) };
  });
};

const CYCLE_TRANSITIONS: Record<string, string[]> = {
  draft: ['open'],
  open: ['closed'],
  closed: [],
};

export const getAppraisalCycles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const status = req.query.status ? String(req.query.status) : null;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT c.*,
             COUNT(a.id)::int AS appraisal_count,
             COUNT(a.id) FILTER (WHERE a.status = 'completed')::int AS completed_count
      FROM public.workforce_appraisal_cycles c
      LEFT JOIN public.workforce_appraisals a ON a.cycle_id = c.id AND a.tenant_id = c.tenant_id
      WHERE c.tenant_id = ${tenantId}
        ${status ? Prisma.sql`AND c.status = ${status}` : Prisma.empty}
      GROUP BY c.id
      ORDER BY c.period_start DESC, c.created_at DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const createAppraisalCycle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const code = cleanText(req.body.code, 60);
    const name = cleanText(req.body.name, 160);
    if (!code || !name) return res.status(400).json({ success: false, error: { code: 'APPRAISAL_CYCLE_FIELDS_REQUIRED', message: 'Code dan name appraisal cycle wajib diisi' } });
    const periodStart = dateOnly(req.body.periodStart, 'INVALID_APPRAISAL_PERIOD_START');
    const periodEnd = dateOnly(req.body.periodEnd, 'INVALID_APPRAISAL_PERIOD_END');
    if (periodEnd < periodStart) return res.status(400).json({ success: false, error: { code: 'INVALID_APPRAISAL_PERIOD', message: 'Period end tidak boleh sebelum period start' } });

    try {
      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.workforce_appraisal_cycles
          (tenant_id, code, name, period_start, period_end, status, description, created_by, updated_by)
        VALUES
          (${tenantId}, ${code}, ${name}, ${periodStart}::date, ${periodEnd}::date, 'draft', ${cleanText(req.body.description)}, ${userId}, ${userId})
        RETURNING *
      `);
      res.status(201).json({ success: true, data: rows[0] });
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ success: false, error: { code: 'APPRAISAL_CYCLE_CODE_EXISTS', message: 'Code appraisal cycle sudah digunakan tenant ini' } });
      throw error;
    }
  } catch (error) { next(error); }
};

export const updateAppraisalCycleStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const id = positiveInt(req.params.id, 'INVALID_APPRAISAL_CYCLE_ID');
    const target = String(req.body.status || '').trim();

    const updated = await prisma.$transaction(async (tx) => {
      const cycles = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.workforce_appraisal_cycles
        WHERE id = ${id} AND tenant_id = ${tenantId}
        FOR UPDATE
      `);
      const current = cycles[0];
      if (!current) throw Object.assign(new Error('Appraisal cycle tidak ditemukan'), { status: 404, code: 'APPRAISAL_CYCLE_NOT_FOUND' });
      if (!(CYCLE_TRANSITIONS[current.status] || []).includes(target)) {
        throw Object.assign(new Error(`Transition appraisal cycle ${current.status} -> ${target} tidak diizinkan`), { status: 409, code: 'INVALID_APPRAISAL_CYCLE_TRANSITION' });
      }
      if (target === 'closed') {
        const pending = await tx.$queryRaw<Array<{ count: number }>>(Prisma.sql`
          SELECT COUNT(*)::int AS count
          FROM public.workforce_appraisals
          WHERE tenant_id = ${tenantId} AND cycle_id = ${id} AND status NOT IN ('completed','cancelled')
        `);
        if (Number(pending[0]?.count || 0) > 0) {
          throw Object.assign(new Error('Cycle masih memiliki appraisal yang belum selesai'), { status: 409, code: 'APPRAISALS_INCOMPLETE' });
        }
      }
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.workforce_appraisal_cycles
        SET status = ${target},
            opened_at = CASE WHEN ${target} = 'open' AND opened_at IS NULL THEN NOW() ELSE opened_at END,
            closed_at = CASE WHEN ${target} = 'closed' THEN NOW() ELSE closed_at END,
            updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `);
      return rows[0];
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const getAppraisals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const cycleId = req.query.cycleId ? positiveInt(req.query.cycleId, 'INVALID_APPRAISAL_CYCLE_ID') : null;
    const employeeId = req.query.employeeId ? positiveInt(req.query.employeeId, 'INVALID_EMPLOYEE_ID') : null;
    const status = req.query.status ? String(req.query.status) : null;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT a.*, c.code AS cycle_code, c.name AS cycle_name, c.period_start, c.period_end,
             e.employee_id AS employee_code, e.name AS employee_name, e.department, e.position,
             u.name AS reviewer_name, u.email AS reviewer_email,
             COALESCE((
               SELECT json_agg(g ORDER BY g.id)
               FROM public.workforce_appraisal_goals g
               WHERE g.tenant_id = a.tenant_id AND g.appraisal_id = a.id
             ), '[]'::json) AS goals
      FROM public.workforce_appraisals a
      JOIN public.workforce_appraisal_cycles c ON c.id = a.cycle_id AND c.tenant_id = a.tenant_id
      JOIN accounting.employees e ON e.id = a.employee_id AND e.tenant_id = a.tenant_id
      JOIN public.users u ON u.id = a.reviewer_user_id AND u.tenant_id = a.tenant_id
      WHERE a.tenant_id = ${tenantId}
        ${cycleId ? Prisma.sql`AND a.cycle_id = ${cycleId}` : Prisma.empty}
        ${employeeId ? Prisma.sql`AND a.employee_id = ${employeeId}` : Prisma.empty}
        ${status ? Prisma.sql`AND a.status = ${status}` : Prisma.empty}
      ORDER BY a.created_at DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const getMyAppraisals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employee = await getSelfEmployee(tenantId, userId);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT a.*, c.code AS cycle_code, c.name AS cycle_name, c.period_start, c.period_end,
             u.name AS reviewer_name,
             COALESCE((
               SELECT json_agg(g ORDER BY g.id)
               FROM public.workforce_appraisal_goals g
               WHERE g.tenant_id = a.tenant_id AND g.appraisal_id = a.id
             ), '[]'::json) AS goals
      FROM public.workforce_appraisals a
      JOIN public.workforce_appraisal_cycles c ON c.id = a.cycle_id AND c.tenant_id = a.tenant_id
      JOIN public.users u ON u.id = a.reviewer_user_id AND u.tenant_id = a.tenant_id
      WHERE a.tenant_id = ${tenantId} AND a.employee_id = ${employee.id}
      ORDER BY a.created_at DESC
    `);
    res.json({ success: true, data: { employee, appraisals: rows } });
  } catch (error) { next(error); }
};

export const createAppraisal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const cycleId = positiveInt(req.body.cycleId, 'INVALID_APPRAISAL_CYCLE_ID');
    const employeeId = positiveInt(req.body.employeeId, 'INVALID_EMPLOYEE_ID');
    const reviewerUserId = positiveInt(req.body.reviewerUserId, 'INVALID_REVIEWER_USER_ID');
    const goals = normalizeGoals(req.body.goals);

    try {
      const created = await prisma.$transaction(async (tx) => {
        const cycles = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT * FROM public.workforce_appraisal_cycles
          WHERE id = ${cycleId} AND tenant_id = ${tenantId}
          FOR UPDATE
        `);
        if (!cycles[0]) throw Object.assign(new Error('Appraisal cycle tidak ditemukan'), { status: 404, code: 'APPRAISAL_CYCLE_NOT_FOUND' });
        if (cycles[0].status !== 'open') throw Object.assign(new Error('Appraisal hanya dapat dibuat pada cycle yang open'), { status: 409, code: 'APPRAISAL_CYCLE_NOT_OPEN' });

        const employee = await tx.employees.findFirst({ where: { id: employeeId, tenant_id: tenantId, status: 'active' }, select: { id: true } });
        if (!employee) throw Object.assign(new Error('Employee aktif tidak ditemukan pada tenant ini'), { status: 404, code: 'APPRAISAL_EMPLOYEE_NOT_FOUND' });
        const reviewer = await tx.users.findFirst({ where: { id: reviewerUserId, tenant_id: tenantId, is_active: true }, select: { id: true } });
        if (!reviewer) throw Object.assign(new Error('Reviewer aktif tidak ditemukan pada tenant ini'), { status: 404, code: 'APPRAISAL_REVIEWER_NOT_FOUND' });

        const appraisalRows = await tx.$queryRaw<any[]>(Prisma.sql`
          INSERT INTO public.workforce_appraisals
            (tenant_id, cycle_id, employee_id, reviewer_user_id, status, created_by, updated_by)
          VALUES
            (${tenantId}, ${cycleId}, ${employeeId}, ${reviewerUserId}, 'self_review', ${userId}, ${userId})
          RETURNING *
        `);
        const appraisal = appraisalRows[0];
        for (const goal of goals) {
          await tx.$queryRaw(Prisma.sql`
            INSERT INTO public.workforce_appraisal_goals
              (tenant_id, appraisal_id, title, description, weight)
            VALUES
              (${tenantId}, ${Number(appraisal.id)}, ${goal.title}, ${goal.description}, ${goal.weight})
          `);
        }
        return appraisal;
      });
      res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ success: false, error: { code: 'APPRAISAL_ALREADY_EXISTS', message: 'Employee sudah memiliki appraisal pada cycle ini' } });
      throw error;
    }
  } catch (error) { next(error); }
};

export const submitMyAppraisal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employee = await getSelfEmployee(tenantId, userId);
    const id = positiveInt(req.params.id, 'INVALID_APPRAISAL_ID');
    const scores = normalizeScoreEntries(req.body.goals, 'selfScore', 'selfComment');
    const summary = cleanText(req.body.selfSummary);

    const updated = await prisma.$transaction(async (tx) => {
      const appraisals = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.workforce_appraisals
        WHERE id = ${id} AND tenant_id = ${tenantId} AND employee_id = ${employee.id}
        FOR UPDATE
      `);
      const appraisal = appraisals[0];
      if (!appraisal) throw Object.assign(new Error('Appraisal tidak ditemukan untuk employee login'), { status: 404, code: 'APPRAISAL_NOT_FOUND' });
      if (appraisal.status !== 'self_review') throw Object.assign(new Error('Self review sudah ditutup atau belum tersedia'), { status: 409, code: 'INVALID_APPRAISAL_SELF_REVIEW_STATUS' });

      const goals = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.workforce_appraisal_goals
        WHERE tenant_id = ${tenantId} AND appraisal_id = ${id}
        ORDER BY id
        FOR UPDATE
      `);
      if (scores.length !== goals.length) throw Object.assign(new Error('Semua goal wajib diberi self score'), { status: 400, code: 'APPRAISAL_GOALS_INCOMPLETE' });
      const goalIds = new Set(goals.map((goal) => Number(goal.id)));
      if (scores.some((entry) => !goalIds.has(entry.goalId))) throw Object.assign(new Error('Goal score bukan milik appraisal ini'), { status: 400, code: 'APPRAISAL_GOAL_ACCESS_DENIED' });

      for (const entry of scores) {
        await tx.$queryRaw(Prisma.sql`
          UPDATE public.workforce_appraisal_goals
          SET self_score = ${entry.score}, self_comment = ${entry.comment}, updated_at = NOW()
          WHERE id = ${entry.goalId} AND tenant_id = ${tenantId} AND appraisal_id = ${id}
        `);
      }
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.workforce_appraisals
        SET status = 'manager_review', self_summary = ${summary}, self_submitted_at = NOW(), updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND employee_id = ${employee.id} AND status = 'self_review'
        RETURNING *
      `);
      if (!rows[0]) throw Object.assign(new Error('Appraisal berubah saat self submit'), { status: 409, code: 'APPRAISAL_CONCURRENT_UPDATE' });
      return rows[0];
    });
    res.json({ success: true, data: updated, message: 'Self review berhasil dikirim' });
  } catch (error) { next(error); }
};

export const finalizeAppraisal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const id = positiveInt(req.params.id, 'INVALID_APPRAISAL_ID');
    const scores = normalizeScoreEntries(req.body.goals, 'reviewerScore', 'reviewerComment');
    const summary = cleanText(req.body.managerSummary);

    const updated = await prisma.$transaction(async (tx) => {
      const appraisals = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.workforce_appraisals
        WHERE id = ${id} AND tenant_id = ${tenantId}
        FOR UPDATE
      `);
      const appraisal = appraisals[0];
      if (!appraisal) throw Object.assign(new Error('Appraisal tidak ditemukan'), { status: 404, code: 'APPRAISAL_NOT_FOUND' });
      if (Number(appraisal.reviewer_user_id) !== userId) throw Object.assign(new Error('Hanya reviewer yang ditugaskan dapat memfinalisasi appraisal'), { status: 403, code: 'APPRAISAL_REVIEWER_MISMATCH' });
      if (appraisal.status !== 'manager_review') throw Object.assign(new Error('Appraisal belum siap untuk manager review'), { status: 409, code: 'INVALID_APPRAISAL_MANAGER_REVIEW_STATUS' });

      const goals = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.workforce_appraisal_goals
        WHERE tenant_id = ${tenantId} AND appraisal_id = ${id}
        ORDER BY id
        FOR UPDATE
      `);
      if (scores.length !== goals.length) throw Object.assign(new Error('Semua goal wajib diberi reviewer score'), { status: 400, code: 'APPRAISAL_GOALS_INCOMPLETE' });
      const byId = new Map(scores.map((entry) => [entry.goalId, entry]));
      if (goals.some((goal) => !byId.has(Number(goal.id)))) throw Object.assign(new Error('Reviewer score tidak mencakup seluruh goal appraisal'), { status: 400, code: 'APPRAISAL_GOALS_INCOMPLETE' });

      let weightedScore = 0;
      for (const goal of goals) {
        const entry = byId.get(Number(goal.id))!;
        weightedScore += (Number(goal.weight) * entry.score) / 100;
        await tx.$queryRaw(Prisma.sql`
          UPDATE public.workforce_appraisal_goals
          SET reviewer_score = ${entry.score}, reviewer_comment = ${entry.comment}, updated_at = NOW()
          WHERE id = ${Number(goal.id)} AND tenant_id = ${tenantId} AND appraisal_id = ${id}
        `);
      }
      const overallScore = Math.round(weightedScore * 100) / 100;
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.workforce_appraisals
        SET status = 'completed', manager_summary = ${summary}, overall_score = ${overallScore}, completed_at = NOW(), updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND reviewer_user_id = ${userId} AND status = 'manager_review'
        RETURNING *
      `);
      if (!rows[0]) throw Object.assign(new Error('Appraisal berubah saat finalisasi'), { status: 409, code: 'APPRAISAL_CONCURRENT_UPDATE' });
      return rows[0];
    });
    res.json({ success: true, data: updated, message: 'Appraisal berhasil difinalisasi' });
  } catch (error) { next(error); }
};

export const cancelAppraisal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const id = positiveInt(req.params.id, 'INVALID_APPRAISAL_ID');
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.workforce_appraisals
        WHERE id = ${id} AND tenant_id = ${tenantId}
        FOR UPDATE
      `);
      if (!current[0]) throw Object.assign(new Error('Appraisal tidak ditemukan'), { status: 404, code: 'APPRAISAL_NOT_FOUND' });
      if (['completed', 'cancelled'].includes(current[0].status)) throw Object.assign(new Error('Appraisal terminal tidak dapat dibatalkan ulang'), { status: 409, code: 'INVALID_APPRAISAL_CANCEL_STATUS' });
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.workforce_appraisals
        SET status = 'cancelled', cancelled_at = NOW(), updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status NOT IN ('completed','cancelled')
        RETURNING *
      `);
      if (!rows[0]) throw Object.assign(new Error('Appraisal berubah saat dibatalkan'), { status: 409, code: 'APPRAISAL_CONCURRENT_UPDATE' });
      return rows[0];
    });
    res.json({ success: true, data: updated, message: 'Appraisal dibatalkan' });
  } catch (error) { next(error); }
};
