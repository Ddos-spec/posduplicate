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

const nonNegativeInt = (value: unknown, code: string, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw Object.assign(new Error(`${code} harus berupa integer non-negatif`), { status: 400, code });
  return parsed;
};

const cleanText = (value: unknown, max = 5000) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
};

const optionalDateOnly = (value: unknown, code: string) => {
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

const parseLimit = (value: unknown, fallback = 150) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 500);
};

const getSelfEmployee = async (tenantId: number, userId: number) => {
  const employee = await prisma.employees.findFirst({
    where: { tenant_id: tenantId, user_id: userId, status: 'active' },
    select: { id: true, employee_id: true, name: true, department: true, position: true, user_id: true },
  });
  if (!employee) throw Object.assign(new Error('User belum terhubung ke employee aktif'), { status: 404, code: 'EMPLOYEE_PROFILE_REQUIRED' });
  return employee;
};

const assertEmployee = async (tenantId: number, employeeId: number) => {
  const employee = await prisma.employees.findFirst({
    where: { id: employeeId, tenant_id: tenantId, status: 'active' },
    select: { id: true, employee_id: true, name: true },
  });
  if (!employee) throw Object.assign(new Error('Employee aktif tidak ditemukan pada tenant ini'), { status: 404, code: 'SERVICE_EMPLOYEE_NOT_FOUND' });
  return employee;
};

const assertTenantOutlet = async (tenantId: number, outletId: number) => {
  const outlet = await prisma.outlets.findFirst({ where: { id: outletId, tenant_id: tenantId }, select: { id: true } });
  if (!outlet) throw Object.assign(new Error('Outlet bukan milik tenant ini'), { status: 403, code: 'OUTLET_ACCESS_DENIED' });
};

const assertTenantUser = async (tenantId: number, userId: number) => {
  const user = await prisma.users.findFirst({ where: { id: userId, tenant_id: tenantId, is_active: true }, select: { id: true } });
  if (!user) throw Object.assign(new Error('User tidak aktif atau bukan milik tenant ini'), { status: 404, code: 'SERVICE_USER_NOT_FOUND' });
};

const assertTenantCustomer = async (tenantId: number, customerId: number) => {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT c.id
    FROM public.customers c
    JOIN public.outlets o ON o.id = c.outlet_id
    WHERE c.id = ${customerId} AND o.tenant_id = ${tenantId}
    LIMIT 1
  `);
  if (!rows[0]) throw Object.assign(new Error('Customer tidak ditemukan pada tenant ini'), { status: 404, code: 'SERVICE_CUSTOMER_NOT_FOUND' });
};

const PROJECT_TRANSITIONS: Record<string, string[]> = {
  draft: ['open', 'cancelled'],
  open: ['on_hold', 'completed', 'cancelled'],
  on_hold: ['open', 'cancelled'],
  completed: [],
  cancelled: [],
};

const TASK_TRANSITIONS: Record<string, string[]> = {
  todo: ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['blocked', 'done', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  done: [],
  cancelled: [],
};

const PLANNING_TRANSITIONS: Record<string, string[]> = {
  planned: ['confirmed', 'cancelled'],
  confirmed: ['done', 'cancelled'],
  done: [],
  cancelled: [],
};

export const getServiceProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const status = req.query.status ? String(req.query.status) : null;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT p.*, o.name AS outlet_name, c.name AS customer_name, u.name AS owner_name,
             COUNT(t.id)::int AS task_count,
             COUNT(t.id) FILTER (WHERE t.status = 'done')::int AS done_task_count,
             COALESCE((SELECT SUM(ts.minutes)::int FROM public.service_timesheet_entries ts WHERE ts.tenant_id = p.tenant_id AND ts.project_id = p.id AND ts.status = 'approved'), 0) AS approved_minutes
      FROM public.service_projects p
      LEFT JOIN public.outlets o ON o.id = p.outlet_id AND o.tenant_id = p.tenant_id
      LEFT JOIN public.customers c ON c.id = p.customer_id
      LEFT JOIN public.users u ON u.id = p.owner_user_id AND u.tenant_id = p.tenant_id
      LEFT JOIN public.service_project_tasks t ON t.project_id = p.id AND t.tenant_id = p.tenant_id
      WHERE p.tenant_id = ${tenantId}
        ${status ? Prisma.sql`AND p.status = ${status}` : Prisma.empty}
      GROUP BY p.id, o.name, c.name, u.name
      ORDER BY p.created_at DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const createServiceProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const code = cleanText(req.body.code, 60)?.toUpperCase();
    const name = cleanText(req.body.name, 180);
    if (!code || !name) return res.status(400).json({ success: false, error: { code: 'SERVICE_PROJECT_FIELDS_REQUIRED', message: 'Code dan nama project wajib diisi' } });

    const outletId = optionalPositiveInt(req.body.outletId, 'INVALID_OUTLET_ID');
    const customerId = optionalPositiveInt(req.body.customerId, 'INVALID_CUSTOMER_ID');
    const ownerUserId = optionalPositiveInt(req.body.ownerUserId, 'INVALID_OWNER_USER_ID');
    if (outletId) await assertTenantOutlet(tenantId, outletId);
    if (customerId) await assertTenantCustomer(tenantId, customerId);
    if (ownerUserId) await assertTenantUser(tenantId, ownerUserId);
    const startDate = optionalDateOnly(req.body.startDate, 'INVALID_PROJECT_START_DATE');
    const dueDate = optionalDateOnly(req.body.dueDate, 'INVALID_PROJECT_DUE_DATE');
    if (startDate && dueDate && dueDate < startDate) return res.status(400).json({ success: false, error: { code: 'INVALID_PROJECT_PERIOD', message: 'Due date tidak boleh sebelum start date' } });
    const plannedMinutes = nonNegativeInt(req.body.plannedMinutes, 'INVALID_PROJECT_PLANNED_MINUTES');

    try {
      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.service_projects
          (tenant_id, outlet_id, customer_id, code, name, description, owner_user_id, status, start_date, due_date, planned_minutes, created_by, updated_by)
        VALUES
          (${tenantId}, ${outletId}, ${customerId}, ${code}, ${name}, ${cleanText(req.body.description)}, ${ownerUserId}, 'draft', ${startDate}::date, ${dueDate}::date, ${plannedMinutes}, ${userId}, ${userId})
        RETURNING *
      `);
      res.status(201).json({ success: true, data: rows[0] });
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ success: false, error: { code: 'SERVICE_PROJECT_CODE_EXISTS', message: 'Code project sudah digunakan tenant ini' } });
      throw error;
    }
  } catch (error) { next(error); }
};

export const updateServiceProjectStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const projectId = positiveInt(req.params.id, 'INVALID_PROJECT_ID');
    const target = String(req.body.status || '').trim();

    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.service_projects
        WHERE id = ${projectId} AND tenant_id = ${tenantId}
        FOR UPDATE
      `);
      const project = rows[0];
      if (!project) throw Object.assign(new Error('Project tidak ditemukan'), { status: 404, code: 'SERVICE_PROJECT_NOT_FOUND' });
      if (!(PROJECT_TRANSITIONS[project.status] || []).includes(target)) {
        throw Object.assign(new Error(`Transition project ${project.status} -> ${target} tidak diizinkan`), { status: 409, code: 'INVALID_PROJECT_TRANSITION' });
      }
      if (target === 'completed') {
        const pending = await tx.$queryRaw<Array<{ count: number }>>(Prisma.sql`
          SELECT COUNT(*)::int AS count FROM public.service_project_tasks
          WHERE tenant_id = ${tenantId} AND project_id = ${projectId} AND status NOT IN ('done','cancelled')
        `);
        if (Number(pending[0]?.count || 0) > 0) throw Object.assign(new Error('Project masih memiliki task aktif'), { status: 409, code: 'PROJECT_TASKS_INCOMPLETE' });
      }
      const changed = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.service_projects
        SET status = ${target},
            completed_at = CASE WHEN ${target} = 'completed' THEN NOW() ELSE completed_at END,
            cancelled_at = CASE WHEN ${target} = 'cancelled' THEN NOW() ELSE cancelled_at END,
            updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${projectId} AND tenant_id = ${tenantId} AND status = ${String(project.status)}
        RETURNING *
      `);
      if (!changed[0]) throw Object.assign(new Error('Project berubah saat update status'), { status: 409, code: 'PROJECT_CONCURRENT_UPDATE' });
      return changed[0];
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const getServiceTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const projectId = req.query.projectId ? positiveInt(req.query.projectId, 'INVALID_PROJECT_ID') : null;
    const status = req.query.status ? String(req.query.status) : null;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT t.*, p.code AS project_code, p.name AS project_name,
             e.employee_id AS assignee_code, e.name AS assignee_name,
             COALESCE((SELECT SUM(ts.minutes)::int FROM public.service_timesheet_entries ts WHERE ts.tenant_id = t.tenant_id AND ts.task_id = t.id AND ts.status = 'approved'), 0) AS approved_minutes
      FROM public.service_project_tasks t
      JOIN public.service_projects p ON p.id = t.project_id AND p.tenant_id = t.tenant_id
      LEFT JOIN accounting.employees e ON e.id = t.assignee_employee_id AND e.tenant_id = t.tenant_id
      WHERE t.tenant_id = ${tenantId}
        ${projectId ? Prisma.sql`AND t.project_id = ${projectId}` : Prisma.empty}
        ${status ? Prisma.sql`AND t.status = ${status}` : Prisma.empty}
      ORDER BY t.created_at DESC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const createServiceTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const projectId = positiveInt(req.body.projectId, 'INVALID_PROJECT_ID');
    const title = cleanText(req.body.title, 220);
    if (!title) return res.status(400).json({ success: false, error: { code: 'SERVICE_TASK_TITLE_REQUIRED', message: 'Title task wajib diisi' } });
    const assigneeEmployeeId = optionalPositiveInt(req.body.assigneeEmployeeId, 'INVALID_EMPLOYEE_ID');
    if (assigneeEmployeeId) await assertEmployee(tenantId, assigneeEmployeeId);
    const priority = String(req.body.priority || 'normal');
    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) return res.status(400).json({ success: false, error: { code: 'INVALID_TASK_PRIORITY', message: 'Priority task tidak valid' } });
    const plannedMinutes = nonNegativeInt(req.body.plannedMinutes, 'INVALID_TASK_PLANNED_MINUTES');
    const dueAt = req.body.dueAt ? timestamp(req.body.dueAt, 'INVALID_TASK_DUE_AT') : null;

    const created = await prisma.$transaction(async (tx) => {
      const projectRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.service_projects WHERE id = ${projectId} AND tenant_id = ${tenantId} FOR UPDATE
      `);
      const project = projectRows[0];
      if (!project) throw Object.assign(new Error('Project tidak ditemukan'), { status: 404, code: 'SERVICE_PROJECT_NOT_FOUND' });
      if (!['draft', 'open'].includes(project.status)) throw Object.assign(new Error('Task tidak dapat ditambah ke project terminal/on-hold'), { status: 409, code: 'PROJECT_NOT_TASK_EDITABLE' });
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.service_project_tasks
          (tenant_id, project_id, title, description, assignee_employee_id, status, priority, planned_minutes, due_at, created_by, updated_by)
        VALUES
          (${tenantId}, ${projectId}, ${title}, ${cleanText(req.body.description)}, ${assigneeEmployeeId}, 'todo', ${priority}, ${plannedMinutes}, ${dueAt}, ${userId}, ${userId})
        RETURNING *
      `);
      return rows[0];
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) { next(error); }
};

export const updateServiceTaskStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const taskId = positiveInt(req.params.id, 'INVALID_TASK_ID');
    const target = String(req.body.status || '').trim();
    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT t.*, p.status AS project_status
        FROM public.service_project_tasks t
        JOIN public.service_projects p ON p.id = t.project_id AND p.tenant_id = t.tenant_id
        WHERE t.id = ${taskId} AND t.tenant_id = ${tenantId}
        FOR UPDATE OF t
      `);
      const task = rows[0];
      if (!task) throw Object.assign(new Error('Task tidak ditemukan'), { status: 404, code: 'SERVICE_TASK_NOT_FOUND' });
      if (['completed', 'cancelled'].includes(task.project_status)) throw Object.assign(new Error('Project sudah terminal'), { status: 409, code: 'PROJECT_TERMINAL' });
      if (!(TASK_TRANSITIONS[task.status] || []).includes(target)) throw Object.assign(new Error(`Transition task ${task.status} -> ${target} tidak diizinkan`), { status: 409, code: 'INVALID_TASK_TRANSITION' });
      const changed = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.service_project_tasks
        SET status = ${target},
            started_at = CASE WHEN ${target} = 'in_progress' AND started_at IS NULL THEN NOW() ELSE started_at END,
            completed_at = CASE WHEN ${target} = 'done' THEN NOW() ELSE completed_at END,
            cancelled_at = CASE WHEN ${target} = 'cancelled' THEN NOW() ELSE cancelled_at END,
            updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${taskId} AND tenant_id = ${tenantId} AND status = ${String(task.status)}
        RETURNING *
      `);
      if (!changed[0]) throw Object.assign(new Error('Task berubah saat update status'), { status: 409, code: 'TASK_CONCURRENT_UPDATE' });
      return changed[0];
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const getServiceTimesheets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const projectId = req.query.projectId ? positiveInt(req.query.projectId, 'INVALID_PROJECT_ID') : null;
    const employeeId = req.query.employeeId ? positiveInt(req.query.employeeId, 'INVALID_EMPLOYEE_ID') : null;
    const status = req.query.status ? String(req.query.status) : null;
    const limit = parseLimit(req.query.limit);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT ts.*, p.code AS project_code, p.name AS project_name, t.title AS task_title,
             e.employee_id AS employee_code, e.name AS employee_name, u.name AS approved_by_name
      FROM public.service_timesheet_entries ts
      JOIN public.service_projects p ON p.id = ts.project_id AND p.tenant_id = ts.tenant_id
      JOIN accounting.employees e ON e.id = ts.employee_id AND e.tenant_id = ts.tenant_id
      LEFT JOIN public.service_project_tasks t ON t.id = ts.task_id AND t.tenant_id = ts.tenant_id
      LEFT JOIN public.users u ON u.id = ts.approved_by AND u.tenant_id = ts.tenant_id
      WHERE ts.tenant_id = ${tenantId}
        ${projectId ? Prisma.sql`AND ts.project_id = ${projectId}` : Prisma.empty}
        ${employeeId ? Prisma.sql`AND ts.employee_id = ${employeeId}` : Prisma.empty}
        ${status ? Prisma.sql`AND ts.status = ${status}` : Prisma.empty}
      ORDER BY ts.work_date DESC, ts.created_at DESC
      LIMIT ${limit}
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const getMyServiceTimesheets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employee = await getSelfEmployee(tenantId, userId);
    const limit = parseLimit(req.query.limit, 100);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT ts.*, p.code AS project_code, p.name AS project_name, t.title AS task_title
      FROM public.service_timesheet_entries ts
      JOIN public.service_projects p ON p.id = ts.project_id AND p.tenant_id = ts.tenant_id
      LEFT JOIN public.service_project_tasks t ON t.id = ts.task_id AND t.tenant_id = ts.tenant_id
      WHERE ts.tenant_id = ${tenantId} AND ts.employee_id = ${employee.id}
      ORDER BY ts.work_date DESC, ts.created_at DESC
      LIMIT ${limit}
    `);
    res.json({ success: true, data: { employee, entries: rows } });
  } catch (error) { next(error); }
};

export const submitMyServiceTimesheet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employee = await getSelfEmployee(tenantId, userId);
    const projectId = positiveInt(req.body.projectId, 'INVALID_PROJECT_ID');
    const taskId = optionalPositiveInt(req.body.taskId, 'INVALID_TASK_ID');
    const workDate = optionalDateOnly(req.body.workDate, 'INVALID_WORK_DATE') || new Date().toISOString().slice(0, 10);
    const minutes = positiveInt(req.body.minutes, 'INVALID_TIMESHEET_MINUTES');
    if (minutes > 1440) return res.status(400).json({ success: false, error: { code: 'INVALID_TIMESHEET_MINUTES', message: 'Timesheet maksimal 1440 menit per entry' } });

    const created = await prisma.$transaction(async (tx) => {
      const projects = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.service_projects WHERE id = ${projectId} AND tenant_id = ${tenantId} FOR UPDATE
      `);
      const project = projects[0];
      if (!project) throw Object.assign(new Error('Project tidak ditemukan'), { status: 404, code: 'SERVICE_PROJECT_NOT_FOUND' });
      if (!['open', 'on_hold'].includes(project.status)) throw Object.assign(new Error('Timesheet hanya dapat dicatat pada project open/on-hold'), { status: 409, code: 'PROJECT_NOT_TIME_EDITABLE' });
      if (taskId) {
        const tasks = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT id, status FROM public.service_project_tasks
          WHERE id = ${taskId} AND tenant_id = ${tenantId} AND project_id = ${projectId}
          LIMIT 1
        `);
        if (!tasks[0]) throw Object.assign(new Error('Task tidak ditemukan pada project ini'), { status: 404, code: 'SERVICE_TASK_NOT_FOUND' });
        if (tasks[0].status === 'cancelled') throw Object.assign(new Error('Timesheet tidak dapat dicatat pada task cancelled'), { status: 409, code: 'TASK_CANCELLED' });
      }
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.service_timesheet_entries
          (tenant_id, project_id, task_id, employee_id, work_date, minutes, billable, description, status, created_by, updated_by)
        VALUES
          (${tenantId}, ${projectId}, ${taskId}, ${employee.id}, ${workDate}::date, ${minutes}, ${req.body.billable !== false}, ${cleanText(req.body.description)}, 'submitted', ${userId}, ${userId})
        RETURNING *
      `);
      return rows[0];
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) { next(error); }
};

export const decideServiceTimesheet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const id = positiveInt(req.params.id, 'INVALID_TIMESHEET_ID');
    const decision = String(req.body.decision || '').trim();
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ success: false, error: { code: 'INVALID_TIMESHEET_DECISION', message: 'Decision harus approved atau rejected' } });
    const reason = cleanText(req.body.reason);
    if (decision === 'rejected' && !reason) return res.status(400).json({ success: false, error: { code: 'TIMESHEET_REJECTION_REASON_REQUIRED', message: 'Alasan rejection wajib diisi' } });

    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.service_timesheet_entries
        WHERE id = ${id} AND tenant_id = ${tenantId}
        FOR UPDATE
      `);
      const current = rows[0];
      if (!current) throw Object.assign(new Error('Timesheet tidak ditemukan'), { status: 404, code: 'SERVICE_TIMESHEET_NOT_FOUND' });
      if (current.status !== 'submitted') throw Object.assign(new Error('Timesheet sudah diproses'), { status: 409, code: 'TIMESHEET_ALREADY_DECIDED' });
      const changed = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.service_timesheet_entries
        SET status = ${decision}, approved_by = ${decision === 'approved' ? userId : null},
            approved_at = CASE WHEN ${decision} = 'approved' THEN NOW() ELSE NULL END,
            rejected_reason = ${decision === 'rejected' ? reason : null}, updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'submitted'
        RETURNING *
      `);
      if (!changed[0]) throw Object.assign(new Error('Timesheet berubah saat decision'), { status: 409, code: 'TIMESHEET_CONCURRENT_UPDATE' });
      return changed[0];
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const getServicePlanning = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const employeeId = req.query.employeeId ? positiveInt(req.query.employeeId, 'INVALID_EMPLOYEE_ID') : null;
    const projectId = req.query.projectId ? positiveInt(req.query.projectId, 'INVALID_PROJECT_ID') : null;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT a.*, e.employee_id AS employee_code, e.name AS employee_name,
             p.code AS project_code, p.name AS project_name, t.title AS task_title
      FROM public.service_planning_allocations a
      JOIN accounting.employees e ON e.id = a.employee_id AND e.tenant_id = a.tenant_id
      LEFT JOIN public.service_projects p ON p.id = a.project_id AND p.tenant_id = a.tenant_id
      LEFT JOIN public.service_project_tasks t ON t.id = a.task_id AND t.tenant_id = a.tenant_id
      WHERE a.tenant_id = ${tenantId}
        ${employeeId ? Prisma.sql`AND a.employee_id = ${employeeId}` : Prisma.empty}
        ${projectId ? Prisma.sql`AND a.project_id = ${projectId}` : Prisma.empty}
      ORDER BY a.start_at ASC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const createServicePlanning = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employeeId = positiveInt(req.body.employeeId, 'INVALID_EMPLOYEE_ID');
    const projectId = optionalPositiveInt(req.body.projectId, 'INVALID_PROJECT_ID');
    const taskId = optionalPositiveInt(req.body.taskId, 'INVALID_TASK_ID');
    const startAt = timestamp(req.body.startAt, 'INVALID_PLANNING_START');
    const endAt = timestamp(req.body.endAt, 'INVALID_PLANNING_END');
    if (endAt <= startAt) return res.status(400).json({ success: false, error: { code: 'INVALID_PLANNING_PERIOD', message: 'Planning end harus setelah start' } });
    await assertEmployee(tenantId, employeeId);

    const created = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, 74001)`);
      if (projectId) {
        const projects = await tx.$queryRaw<any[]>(Prisma.sql`SELECT id, status FROM public.service_projects WHERE id = ${projectId} AND tenant_id = ${tenantId} LIMIT 1`);
        if (!projects[0]) throw Object.assign(new Error('Project tidak ditemukan'), { status: 404, code: 'SERVICE_PROJECT_NOT_FOUND' });
        if (['completed', 'cancelled'].includes(projects[0].status)) throw Object.assign(new Error('Planning tidak dapat dibuat untuk project terminal'), { status: 409, code: 'PROJECT_TERMINAL' });
      }
      if (taskId) {
        if (!projectId) throw Object.assign(new Error('Task planning membutuhkan projectId'), { status: 400, code: 'PLANNING_PROJECT_REQUIRED' });
        const tasks = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT id, status FROM public.service_project_tasks
          WHERE id = ${taskId} AND tenant_id = ${tenantId} AND project_id = ${projectId}
          LIMIT 1
        `);
        if (!tasks[0]) throw Object.assign(new Error('Task tidak ditemukan pada project ini'), { status: 404, code: 'SERVICE_TASK_NOT_FOUND' });
        if (['done', 'cancelled'].includes(tasks[0].status)) throw Object.assign(new Error('Planning tidak dapat dibuat untuk task terminal'), { status: 409, code: 'TASK_TERMINAL' });
      }
      const overlap = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT id FROM public.service_planning_allocations
        WHERE tenant_id = ${tenantId} AND employee_id = ${employeeId}
          AND status IN ('planned','confirmed')
          AND start_at < ${endAt} AND end_at > ${startAt}
        LIMIT 1
      `);
      if (overlap[0]) throw Object.assign(new Error('Employee sudah memiliki planning yang overlap'), { status: 409, code: 'PLANNING_OVERLAP' });
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.service_planning_allocations
          (tenant_id, project_id, task_id, employee_id, start_at, end_at, status, notes, created_by, updated_by)
        VALUES
          (${tenantId}, ${projectId}, ${taskId}, ${employeeId}, ${startAt}, ${endAt}, 'planned', ${cleanText(req.body.notes)}, ${userId}, ${userId})
        RETURNING *
      `);
      return rows[0];
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) { next(error); }
};

export const updateServicePlanningStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const id = positiveInt(req.params.id, 'INVALID_PLANNING_ID');
    const target = String(req.body.status || '').trim();
    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.service_planning_allocations
        WHERE id = ${id} AND tenant_id = ${tenantId}
        FOR UPDATE
      `);
      const current = rows[0];
      if (!current) throw Object.assign(new Error('Planning tidak ditemukan'), { status: 404, code: 'SERVICE_PLANNING_NOT_FOUND' });
      if (!(PLANNING_TRANSITIONS[current.status] || []).includes(target)) throw Object.assign(new Error(`Transition planning ${current.status} -> ${target} tidak diizinkan`), { status: 409, code: 'INVALID_PLANNING_TRANSITION' });
      const changed = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.service_planning_allocations
        SET status = ${target}, updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = ${String(current.status)}
        RETURNING *
      `);
      if (!changed[0]) throw Object.assign(new Error('Planning berubah saat update status'), { status: 409, code: 'PLANNING_CONCURRENT_UPDATE' });
      return changed[0];
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};
