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

const optionalPositiveInt = (value: unknown, code: string) => {
  if (value === undefined || value === null || value === '') return null;
  return positiveInt(value, code);
};

const nonNegativeNumber = (value: unknown, code: string, required = false) => {
  if ((value === undefined || value === null || value === '') && !required) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw Object.assign(new Error(`${code} harus berupa angka non-negatif`), { status: 400, code });
  return parsed;
};

const dateOnly = (value: unknown, code: string) => {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw Object.assign(new Error(`${code} harus berformat YYYY-MM-DD`), { status: 400, code });
  }
  return text;
};

const timestamp = (value: unknown, code: string) => {
  const parsed = new Date(String(value || ''));
  if (Number.isNaN(parsed.getTime())) throw Object.assign(new Error(`${code} tidak valid`), { status: 400, code });
  return parsed;
};

const cleanText = (value: unknown, max = 5000) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
};

const assertTenantOutlet = async (tenantId: number, outletId: number) => {
  const outlet = await prisma.outlets.findFirst({ where: { id: outletId, tenant_id: tenantId }, select: { id: true } });
  if (!outlet) throw Object.assign(new Error('Outlet bukan milik tenant ini'), { status: 403, code: 'OUTLET_ACCESS_DENIED' });
};

const assertTenantUser = async (tenantId: number, userId: number) => {
  const user = await prisma.users.findFirst({ where: { id: userId, tenant_id: tenantId, is_active: true }, select: { id: true } });
  if (!user) throw Object.assign(new Error('User tidak aktif atau bukan milik tenant ini'), { status: 400, code: 'INVALID_TENANT_USER' });
};

const VACANCY_TRANSITIONS: Record<string, string[]> = {
  draft: ['open', 'closed'],
  open: ['paused', 'closed'],
  paused: ['open', 'closed'],
  closed: [],
};

const DIRECT_APPLICANT_TRANSITIONS: Record<string, string[]> = {
  applied: ['screening', 'rejected', 'withdrawn'],
  screening: ['rejected', 'withdrawn'],
  interview: ['rejected', 'withdrawn'],
  offer: ['rejected', 'withdrawn'],
  hired: [],
  rejected: [],
  withdrawn: [],
};

const OFFER_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'withdrawn'],
  sent: ['accepted', 'declined', 'withdrawn'],
  accepted: ['withdrawn'],
  declined: [],
  withdrawn: [],
};

export const getRecruitmentVacancies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const status = req.query.status ? String(req.query.status) : null;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT v.*,
             o.name AS outlet_name,
             u.name AS hiring_manager_name,
             COUNT(a.id)::int AS applicant_count,
             COUNT(a.id) FILTER (WHERE a.stage = 'hired')::int AS hired_count
      FROM public.workforce_recruitment_vacancies v
      LEFT JOIN public.outlets o ON o.id = v.outlet_id AND o.tenant_id = v.tenant_id
      LEFT JOIN public.users u ON u.id = v.hiring_manager_user_id
      LEFT JOIN public.workforce_recruitment_applicants a ON a.vacancy_id = v.id AND a.tenant_id = v.tenant_id
      WHERE v.tenant_id = ${tenantId}
        ${status ? Prisma.sql`AND v.status = ${status}` : Prisma.empty}
      GROUP BY v.id, o.name, u.name
      ORDER BY v.created_at DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const createRecruitmentVacancy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const code = cleanText(req.body.code, 60);
    const title = cleanText(req.body.title, 160);
    if (!code || !title) return res.status(400).json({ success: false, error: { code: 'VACANCY_FIELDS_REQUIRED', message: 'Code dan title vacancy wajib diisi' } });

    const outletId = optionalPositiveInt(req.body.outletId, 'INVALID_OUTLET_ID');
    const managerId = optionalPositiveInt(req.body.hiringManagerUserId, 'INVALID_MANAGER_ID');
    if (outletId) await assertTenantOutlet(tenantId, outletId);
    if (managerId) await assertTenantUser(tenantId, managerId);

    const employmentType = String(req.body.employmentType || 'full_time');
    if (!['full_time', 'part_time', 'contract', 'internship', 'temporary'].includes(employmentType)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_EMPLOYMENT_TYPE', message: 'Employment type tidak valid' } });
    }
    const headcount = positiveInt(req.body.headcount ?? 1, 'INVALID_HEADCOUNT');
    const targetStartDate = dateOnly(req.body.targetStartDate, 'INVALID_TARGET_START_DATE');

    try {
      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.workforce_recruitment_vacancies
          (tenant_id, outlet_id, code, title, department, employment_type, headcount, status, description,
           hiring_manager_user_id, target_start_date, created_by, updated_by)
        VALUES
          (${tenantId}, ${outletId}, ${code}, ${title}, ${cleanText(req.body.department, 120)}, ${employmentType}, ${headcount}, 'draft',
           ${cleanText(req.body.description)}, ${managerId}, ${targetStartDate}::date, ${userId}, ${userId})
        RETURNING *
      `);
      res.status(201).json({ success: true, data: rows[0] });
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ success: false, error: { code: 'VACANCY_CODE_EXISTS', message: 'Code vacancy sudah digunakan tenant ini' } });
      throw error;
    }
  } catch (error) { next(error); }
};

export const updateRecruitmentVacancyStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const id = positiveInt(req.params.id, 'INVALID_VACANCY_ID');
    const target = String(req.body.status || '').trim();

    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.workforce_recruitment_vacancies
        WHERE id = ${id} AND tenant_id = ${tenantId}
        FOR UPDATE
      `);
      const current = rows[0];
      if (!current) throw Object.assign(new Error('Vacancy tidak ditemukan'), { status: 404, code: 'VACANCY_NOT_FOUND' });
      if (!(VACANCY_TRANSITIONS[current.status] || []).includes(target)) {
        throw Object.assign(new Error(`Transition vacancy ${current.status} -> ${target} tidak diizinkan`), { status: 409, code: 'INVALID_VACANCY_TRANSITION' });
      }

      const result = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.workforce_recruitment_vacancies
        SET status = ${target},
            opened_at = CASE WHEN ${target} = 'open' AND opened_at IS NULL THEN NOW() ELSE opened_at END,
            closed_at = CASE WHEN ${target} = 'closed' THEN NOW() ELSE closed_at END,
            updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `);
      return result[0];
    });

    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const getRecruitmentApplicants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const vacancyId = req.query.vacancyId ? positiveInt(req.query.vacancyId, 'INVALID_VACANCY_ID') : null;
    const stage = req.query.stage ? String(req.query.stage) : null;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT a.*, v.code AS vacancy_code, v.title AS vacancy_title, v.department,
             e.employee_id AS hired_employee_code,
             e.name AS hired_employee_name
      FROM public.workforce_recruitment_applicants a
      JOIN public.workforce_recruitment_vacancies v ON v.id = a.vacancy_id AND v.tenant_id = a.tenant_id
      LEFT JOIN accounting.employees e ON e.id = a.hired_employee_id AND e.tenant_id = a.tenant_id
      WHERE a.tenant_id = ${tenantId}
        ${vacancyId ? Prisma.sql`AND a.vacancy_id = ${vacancyId}` : Prisma.empty}
        ${stage ? Prisma.sql`AND a.stage = ${stage}` : Prisma.empty}
      ORDER BY a.created_at DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const createRecruitmentApplicant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const vacancyId = positiveInt(req.body.vacancyId, 'INVALID_VACANCY_ID');
    const applicantName = cleanText(req.body.name, 180);
    if (!applicantName) return res.status(400).json({ success: false, error: { code: 'APPLICANT_NAME_REQUIRED', message: 'Nama kandidat wajib diisi' } });

    const vacancy = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, status FROM public.workforce_recruitment_vacancies
      WHERE id = ${vacancyId} AND tenant_id = ${tenantId}
      LIMIT 1
    `);
    if (!vacancy[0]) return res.status(404).json({ success: false, error: { code: 'VACANCY_NOT_FOUND', message: 'Vacancy tidak ditemukan' } });
    if (vacancy[0].status !== 'open') return res.status(409).json({ success: false, error: { code: 'VACANCY_NOT_OPEN', message: 'Kandidat hanya dapat ditambahkan ke vacancy yang open' } });

    const expectedSalary = nonNegativeNumber(req.body.expectedSalary, 'INVALID_EXPECTED_SALARY');
    const email = cleanText(req.body.email, 255)?.toLowerCase() || null;

    try {
      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.workforce_recruitment_applicants
          (tenant_id, vacancy_id, applicant_name, email, phone, source, stage, resume_url, notes, expected_salary, created_by, updated_by)
        VALUES
          (${tenantId}, ${vacancyId}, ${applicantName}, ${email}, ${cleanText(req.body.phone, 60)}, ${cleanText(req.body.source, 80)},
           'applied', ${cleanText(req.body.resumeUrl)}, ${cleanText(req.body.notes)}, ${expectedSalary}, ${userId}, ${userId})
        RETURNING *
      `);
      res.status(201).json({ success: true, data: rows[0] });
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ success: false, error: { code: 'DUPLICATE_APPLICANT', message: 'Email kandidat sudah terdaftar pada vacancy ini' } });
      throw error;
    }
  } catch (error) { next(error); }
};

export const moveRecruitmentApplicantStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const id = positiveInt(req.params.id, 'INVALID_APPLICANT_ID');
    const target = String(req.body.stage || '').trim();
    if (['interview', 'offer', 'hired'].includes(target)) {
      return res.status(409).json({ success: false, error: { code: 'DEDICATED_ACTION_REQUIRED', message: `Stage ${target} hanya dapat dicapai melalui action khusus` } });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.workforce_recruitment_applicants
        WHERE id = ${id} AND tenant_id = ${tenantId}
        FOR UPDATE
      `);
      const current = rows[0];
      if (!current) throw Object.assign(new Error('Applicant tidak ditemukan'), { status: 404, code: 'APPLICANT_NOT_FOUND' });
      if (!(DIRECT_APPLICANT_TRANSITIONS[current.stage] || []).includes(target)) {
        throw Object.assign(new Error(`Transition applicant ${current.stage} -> ${target} tidak diizinkan`), { status: 409, code: 'INVALID_APPLICANT_TRANSITION' });
      }
      if (current.stage === 'offer' && ['rejected', 'withdrawn'].includes(target)) {
        const accepted = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT id FROM public.workforce_recruitment_offers
          WHERE tenant_id = ${tenantId} AND applicant_id = ${id} AND status = 'accepted'
          LIMIT 1
        `);
        if (accepted[0]) throw Object.assign(new Error('Accepted offer harus di-withdraw terlebih dahulu sebelum applicant ditutup'), { status: 409, code: 'ACCEPTED_OFFER_ACTIVE' });
      }
      const result = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.workforce_recruitment_applicants
        SET stage = ${target}, notes = COALESCE(${cleanText(req.body.note)}, notes), stage_updated_at = NOW(), updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `);
      return result[0];
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const getRecruitmentInterviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const applicantId = req.query.applicantId ? positiveInt(req.query.applicantId, 'INVALID_APPLICANT_ID') : null;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT i.*, a.applicant_name, v.title AS vacancy_title, u.name AS interviewer_name
      FROM public.workforce_recruitment_interviews i
      JOIN public.workforce_recruitment_applicants a ON a.id = i.applicant_id AND a.tenant_id = i.tenant_id
      JOIN public.workforce_recruitment_vacancies v ON v.id = a.vacancy_id AND v.tenant_id = a.tenant_id
      LEFT JOIN public.users u ON u.id = i.interviewer_user_id
      WHERE i.tenant_id = ${tenantId}
        ${applicantId ? Prisma.sql`AND i.applicant_id = ${applicantId}` : Prisma.empty}
      ORDER BY i.scheduled_at DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const scheduleRecruitmentInterview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const applicantId = positiveInt(req.params.id, 'INVALID_APPLICANT_ID');
    const interviewerId = optionalPositiveInt(req.body.interviewerUserId, 'INVALID_INTERVIEWER_ID');
    if (interviewerId) await assertTenantUser(tenantId, interviewerId);
    const scheduledAt = timestamp(req.body.scheduledAt, 'INVALID_INTERVIEW_TIME');
    const durationMinutes = positiveInt(req.body.durationMinutes ?? 60, 'INVALID_INTERVIEW_DURATION');
    if (durationMinutes > 480) return res.status(400).json({ success: false, error: { code: 'INVALID_INTERVIEW_DURATION', message: 'Durasi interview maksimal 480 menit' } });

    const interview = await prisma.$transaction(async (tx) => {
      const applicants = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.workforce_recruitment_applicants
        WHERE id = ${applicantId} AND tenant_id = ${tenantId}
        FOR UPDATE
      `);
      const applicant = applicants[0];
      if (!applicant) throw Object.assign(new Error('Applicant tidak ditemukan'), { status: 404, code: 'APPLICANT_NOT_FOUND' });
      if (!['screening', 'interview'].includes(applicant.stage)) {
        throw Object.assign(new Error('Interview hanya dapat dijadwalkan dari stage screening/interview'), { status: 409, code: 'INVALID_INTERVIEW_STAGE' });
      }

      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.workforce_recruitment_interviews
          (tenant_id, applicant_id, interviewer_user_id, scheduled_at, duration_minutes, status, created_by, updated_by)
        VALUES (${tenantId}, ${applicantId}, ${interviewerId}, ${scheduledAt}, ${durationMinutes}, 'scheduled', ${userId}, ${userId})
        RETURNING *
      `);
      if (applicant.stage === 'screening') {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.workforce_recruitment_applicants
          SET stage = 'interview', stage_updated_at = NOW(), updated_by = ${userId}, updated_at = NOW()
          WHERE id = ${applicantId} AND tenant_id = ${tenantId}
        `);
      }
      return rows[0];
    });
    res.status(201).json({ success: true, data: interview });
  } catch (error) { next(error); }
};

export const completeRecruitmentInterview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const interviewId = positiveInt(req.params.id, 'INVALID_INTERVIEW_ID');
    const score = nonNegativeNumber(req.body.score, 'INVALID_INTERVIEW_SCORE');
    if (score !== null && score > 100) return res.status(400).json({ success: false, error: { code: 'INVALID_INTERVIEW_SCORE', message: 'Score interview maksimal 100' } });

    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.workforce_recruitment_interviews
        WHERE id = ${interviewId} AND tenant_id = ${tenantId}
        FOR UPDATE
      `);
      const current = rows[0];
      if (!current) throw Object.assign(new Error('Interview tidak ditemukan'), { status: 404, code: 'INTERVIEW_NOT_FOUND' });
      if (current.status !== 'scheduled') throw Object.assign(new Error('Interview tidak lagi berstatus scheduled'), { status: 409, code: 'INTERVIEW_NOT_SCHEDULED' });
      const result = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.workforce_recruitment_interviews
        SET status = 'completed', score = ${score}, feedback = ${cleanText(req.body.feedback)}, completed_at = NOW(), updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${interviewId} AND tenant_id = ${tenantId} AND status = 'scheduled'
        RETURNING *
      `);
      if (!result[0]) throw Object.assign(new Error('Interview berubah saat diproses'), { status: 409, code: 'INTERVIEW_CONCURRENT_UPDATE' });
      return result[0];
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const cancelRecruitmentInterview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const interviewId = positiveInt(req.params.id, 'INVALID_INTERVIEW_ID');
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.workforce_recruitment_interviews
      SET status = 'cancelled', feedback = COALESCE(${cleanText(req.body.reason)}, feedback), updated_by = ${userId}, updated_at = NOW()
      WHERE id = ${interviewId} AND tenant_id = ${tenantId} AND status = 'scheduled'
      RETURNING *
    `);
    if (!rows[0]) return res.status(409).json({ success: false, error: { code: 'INTERVIEW_NOT_CANCELLABLE', message: 'Interview tidak ditemukan atau tidak lagi scheduled' } });
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

export const getRecruitmentOffers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const applicantId = req.query.applicantId ? positiveInt(req.query.applicantId, 'INVALID_APPLICANT_ID') : null;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT o.*, a.applicant_name, v.title AS vacancy_title
      FROM public.workforce_recruitment_offers o
      JOIN public.workforce_recruitment_applicants a ON a.id = o.applicant_id AND a.tenant_id = o.tenant_id
      JOIN public.workforce_recruitment_vacancies v ON v.id = a.vacancy_id AND v.tenant_id = a.tenant_id
      WHERE o.tenant_id = ${tenantId}
        ${applicantId ? Prisma.sql`AND o.applicant_id = ${applicantId}` : Prisma.empty}
      ORDER BY o.created_at DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const createRecruitmentOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const applicantId = positiveInt(req.params.id, 'INVALID_APPLICANT_ID');
    const offeredSalary = nonNegativeNumber(req.body.offeredSalary, 'INVALID_OFFER_SALARY', true)!;
    const startDate = dateOnly(req.body.startDate, 'INVALID_OFFER_START_DATE');

    const offer = await prisma.$transaction(async (tx) => {
      const applicants = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.workforce_recruitment_applicants
        WHERE id = ${applicantId} AND tenant_id = ${tenantId}
        FOR UPDATE
      `);
      const applicant = applicants[0];
      if (!applicant) throw Object.assign(new Error('Applicant tidak ditemukan'), { status: 404, code: 'APPLICANT_NOT_FOUND' });
      if (!['interview', 'offer'].includes(applicant.stage)) {
        throw Object.assign(new Error('Offer hanya dapat dibuat setelah applicant mencapai interview'), { status: 409, code: 'INVALID_OFFER_STAGE' });
      }
      const versionRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT COALESCE(MAX(version), 0)::int + 1 AS next_version
        FROM public.workforce_recruitment_offers
        WHERE tenant_id = ${tenantId} AND applicant_id = ${applicantId}
      `);
      const version = Number(versionRows[0]?.next_version || 1);
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.workforce_recruitment_offers
          (tenant_id, applicant_id, version, offered_salary, start_date, status, notes, created_by, updated_by)
        VALUES (${tenantId}, ${applicantId}, ${version}, ${offeredSalary}, ${startDate}::date, 'draft', ${cleanText(req.body.notes)}, ${userId}, ${userId})
        RETURNING *
      `);
      if (applicant.stage === 'interview') {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.workforce_recruitment_applicants
          SET stage = 'offer', stage_updated_at = NOW(), updated_by = ${userId}, updated_at = NOW()
          WHERE id = ${applicantId} AND tenant_id = ${tenantId}
        `);
      }
      return rows[0];
    });
    res.status(201).json({ success: true, data: offer });
  } catch (error) { next(error); }
};

export const updateRecruitmentOfferStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const offerId = positiveInt(req.params.id, 'INVALID_OFFER_ID');
    const target = String(req.body.status || '').trim();

    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT o.*, a.stage AS applicant_stage
        FROM public.workforce_recruitment_offers o
        JOIN public.workforce_recruitment_applicants a ON a.id = o.applicant_id AND a.tenant_id = o.tenant_id
        WHERE o.id = ${offerId} AND o.tenant_id = ${tenantId}
        FOR UPDATE OF o, a
      `);
      const current = rows[0];
      if (!current) throw Object.assign(new Error('Offer tidak ditemukan'), { status: 404, code: 'OFFER_NOT_FOUND' });
      if (!(OFFER_TRANSITIONS[current.status] || []).includes(target)) {
        throw Object.assign(new Error(`Transition offer ${current.status} -> ${target} tidak diizinkan`), { status: 409, code: 'INVALID_OFFER_TRANSITION' });
      }
      try {
        const result = await tx.$queryRaw<any[]>(Prisma.sql`
          UPDATE public.workforce_recruitment_offers
          SET status = ${target},
              offered_at = CASE WHEN ${target} = 'sent' THEN NOW() ELSE offered_at END,
              responded_at = CASE WHEN ${target} IN ('accepted','declined') THEN NOW() ELSE responded_at END,
              notes = COALESCE(${cleanText(req.body.note)}, notes),
              updated_by = ${userId}, updated_at = NOW()
          WHERE id = ${offerId} AND tenant_id = ${tenantId}
          RETURNING *
        `);
        if (target === 'declined' && current.applicant_stage === 'offer') {
          await tx.$executeRaw(Prisma.sql`
            UPDATE public.workforce_recruitment_applicants
            SET stage = 'withdrawn', stage_updated_at = NOW(), updated_by = ${userId}, updated_at = NOW()
            WHERE id = ${Number(current.applicant_id)} AND tenant_id = ${tenantId}
          `);
        }
        return result[0];
      } catch (error: any) {
        if (error?.code === '23505') throw Object.assign(new Error('Applicant sudah memiliki accepted offer lain'), { status: 409, code: 'ACCEPTED_OFFER_EXISTS' });
        throw error;
      }
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const hireRecruitmentApplicant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const actorUserId = requireUser(req);
    const applicantId = positiveInt(req.params.id, 'INVALID_APPLICANT_ID');
    const employeeCode = cleanText(req.body.employeeId, 50);
    if (!employeeCode) return res.status(400).json({ success: false, error: { code: 'EMPLOYEE_ID_REQUIRED', message: 'Employee ID wajib diisi saat hiring' } });
    const employeeUserId = optionalPositiveInt(req.body.userId, 'INVALID_EMPLOYEE_USER_ID');
    if (employeeUserId) await assertTenantUser(tenantId, employeeUserId);
    const basicSalary = nonNegativeNumber(req.body.basicSalary, 'INVALID_BASIC_SALARY') ?? 0;
    const joinDateText = dateOnly(req.body.joinDate, 'INVALID_JOIN_DATE');
    const joinDate = joinDateText ? new Date(`${joinDateText}T00:00:00.000Z`) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const applicants = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT a.*, v.title AS vacancy_title, v.department AS vacancy_department, v.headcount, v.status AS vacancy_status
        FROM public.workforce_recruitment_applicants a
        JOIN public.workforce_recruitment_vacancies v ON v.id = a.vacancy_id AND v.tenant_id = a.tenant_id
        WHERE a.id = ${applicantId} AND a.tenant_id = ${tenantId}
        FOR UPDATE OF a, v
      `);
      const applicant = applicants[0];
      if (!applicant) throw Object.assign(new Error('Applicant tidak ditemukan'), { status: 404, code: 'APPLICANT_NOT_FOUND' });
      if (applicant.stage !== 'offer' || applicant.hired_employee_id) {
        throw Object.assign(new Error('Applicant tidak berada pada stage offer atau sudah pernah di-hire'), { status: 409, code: 'APPLICANT_NOT_HIRABLE' });
      }

      const accepted = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.workforce_recruitment_offers
        WHERE tenant_id = ${tenantId} AND applicant_id = ${applicantId} AND status = 'accepted'
        ORDER BY version DESC LIMIT 1
      `);
      if (!accepted[0]) throw Object.assign(new Error('Hiring membutuhkan offer berstatus accepted'), { status: 409, code: 'ACCEPTED_OFFER_REQUIRED' });

      const duplicateCode = await tx.employees.findFirst({ where: { tenant_id: tenantId, employee_id: employeeCode }, select: { id: true } });
      if (duplicateCode) throw Object.assign(new Error('Employee ID sudah digunakan tenant ini'), { status: 409, code: 'EMPLOYEE_ID_EXISTS' });
      if (employeeUserId) {
        const linkedUser = await tx.employees.findFirst({ where: { tenant_id: tenantId, user_id: employeeUserId }, select: { id: true } });
        if (linkedUser) throw Object.assign(new Error('User sudah terhubung ke employee lain'), { status: 409, code: 'EMPLOYEE_USER_ALREADY_LINKED' });
      }

      const employee = await tx.employees.create({
        data: {
          tenant_id: tenantId,
          employee_id: employeeCode,
          user_id: employeeUserId,
          name: String(applicant.applicant_name),
          department: cleanText(req.body.department, 100) || applicant.vacancy_department || null,
          position: cleanText(req.body.position, 100) || applicant.vacancy_title || null,
          join_date: joinDate,
          basic_salary: basicSalary,
          status: 'active',
          created_by: actorUserId,
          created_at: new Date(),
          updated_by: actorUserId,
          updated_at: new Date(),
        },
      });

      const hiredRows = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.workforce_recruitment_applicants
        SET stage = 'hired', hired_employee_id = ${employee.id}, hired_at = NOW(), stage_updated_at = NOW(), updated_by = ${actorUserId}, updated_at = NOW()
        WHERE id = ${applicantId} AND tenant_id = ${tenantId} AND stage = 'offer' AND hired_employee_id IS NULL
        RETURNING *
      `);
      if (!hiredRows[0]) throw Object.assign(new Error('Applicant berubah saat proses hiring'), { status: 409, code: 'APPLICANT_CONCURRENT_UPDATE' });

      const hiredCountRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT COUNT(*)::int AS hired_count
        FROM public.workforce_recruitment_applicants
        WHERE tenant_id = ${tenantId} AND vacancy_id = ${Number(applicant.vacancy_id)} AND stage = 'hired'
      `);
      if (Number(hiredCountRows[0]?.hired_count || 0) >= Number(applicant.headcount || 1)) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.workforce_recruitment_vacancies
          SET status = 'closed', closed_at = COALESCE(closed_at, NOW()), updated_by = ${actorUserId}, updated_at = NOW()
          WHERE id = ${Number(applicant.vacancy_id)} AND tenant_id = ${tenantId} AND status IN ('open','paused')
        `);
      }

      return { applicant: hiredRows[0], employee, acceptedOffer: accepted[0] };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};
