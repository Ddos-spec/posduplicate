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

const assertOutlet = async (tenantId: number, outletId: number) => {
  const outlet = await prisma.outlets.findFirst({ where: { id: outletId, tenant_id: tenantId }, select: { id: true, name: true } });
  if (!outlet) throw Object.assign(new Error('Outlet bukan milik tenant ini'), { status: 403, code: 'OUTLET_ACCESS_DENIED' });
  return outlet;
};

const getSelfEmployee = async (tenantId: number, userId: number) => {
  const employee = await prisma.employees.findFirst({
    where: { tenant_id: tenantId, user_id: userId, status: 'active' },
    include: { users: { select: { id: true, name: true, email: true } } },
  });
  if (!employee) throw Object.assign(new Error('User belum terhubung ke employee aktif'), { status: 404, code: 'EMPLOYEE_PROFILE_REQUIRED' });
  return employee;
};

const parseLimit = (value: unknown, fallback = 100) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 300);
};

export const getEmployeeDirectory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const status = req.query.status ? String(req.query.status) : undefined;
    const department = req.query.department ? String(req.query.department) : undefined;
    const limit = parseLimit(req.query.limit, 100);

    const rows = await prisma.employees.findMany({
      where: {
        tenant_id: tenantId,
        ...(status && { status }),
        ...(department && { department }),
      },
      include: { users: { select: { id: true, name: true, email: true, is_active: true } } },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      take: limit,
    });

    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const outletId = req.query.outletId ? Number(req.query.outletId) : null;
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : null;
    const limit = parseLimit(req.query.limit, 150);
    if (outletId) await assertOutlet(tenantId, outletId);

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT a.*,
             e.employee_id AS employee_code,
             e.name AS employee_name,
             e.department,
             e.position,
             o.name AS outlet_name,
             CASE
               WHEN a.clock_out_at IS NULL THEN NULL
               ELSE FLOOR(EXTRACT(EPOCH FROM (a.clock_out_at - a.clock_in_at)) / 60)::int
             END AS duration_minutes
      FROM public.workforce_attendance_sessions a
      JOIN accounting.employees e ON e.id = a.employee_id AND e.tenant_id = a.tenant_id
      JOIN public.outlets o ON o.id = a.outlet_id
      WHERE a.tenant_id = ${tenantId}
        ${outletId ? Prisma.sql`AND a.outlet_id = ${outletId}` : Prisma.empty}
        ${employeeId ? Prisma.sql`AND a.employee_id = ${employeeId}` : Prisma.empty}
      ORDER BY a.clock_in_at DESC
      LIMIT ${limit}
    `);

    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const getMyAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employee = await getSelfEmployee(tenantId, userId);
    const limit = parseLimit(req.query.limit, 30);

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT a.*, o.name AS outlet_name,
             CASE WHEN a.clock_out_at IS NULL THEN NULL
                  ELSE FLOOR(EXTRACT(EPOCH FROM (a.clock_out_at - a.clock_in_at)) / 60)::int END AS duration_minutes
      FROM public.workforce_attendance_sessions a
      JOIN public.outlets o ON o.id = a.outlet_id
      WHERE a.tenant_id = ${tenantId} AND a.employee_id = ${employee.id}
      ORDER BY a.clock_in_at DESC
      LIMIT ${limit}
    `);

    res.json({ success: true, data: { employee, sessions: rows, openSession: rows.find((row) => row.status === 'open' && !row.clock_out_at) || null } });
  } catch (error) {
    next(error);
  }
};

export const clockInSelf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const outletId = Number(req.body.outletId);
    if (!Number.isInteger(outletId) || outletId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'OUTLET_REQUIRED', message: 'Outlet ID wajib valid' } });
    }
    await assertOutlet(tenantId, outletId);
    const employee = await getSelfEmployee(tenantId, userId);
    const notes = req.body.notes === undefined || req.body.notes === null ? null : String(req.body.notes).trim() || null;

    try {
      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.workforce_attendance_sessions
          (tenant_id, employee_id, user_id, outlet_id, status, source, notes)
        VALUES
          (${tenantId}, ${employee.id}, ${userId}, ${outletId}, 'open', 'self_service', ${notes})
        RETURNING *
      `);
      return res.status(201).json({ success: true, data: rows[0], message: 'Clock-in berhasil' });
    } catch (error: any) {
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: { code: 'ATTENDANCE_ALREADY_OPEN', message: 'Masih ada sesi attendance yang belum clock-out' } });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

export const clockOutSelf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employee = await getSelfEmployee(tenantId, userId);
    const notes = req.body.notes === undefined || req.body.notes === null ? null : String(req.body.notes).trim() || null;

    const closed = await prisma.$transaction(async (tx) => {
      const current = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.workforce_attendance_sessions
        WHERE tenant_id = ${tenantId}
          AND employee_id = ${employee.id}
          AND status = 'open'
          AND clock_out_at IS NULL
        ORDER BY clock_in_at DESC
        LIMIT 1
        FOR UPDATE
      `);
      if (!current[0]) throw Object.assign(new Error('Tidak ada sesi attendance aktif'), { status: 409, code: 'NO_OPEN_ATTENDANCE' });

      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.workforce_attendance_sessions
        SET clock_out_at = NOW(),
            status = 'closed',
            notes = CASE WHEN ${notes}::text IS NULL THEN notes ELSE ${notes} END,
            updated_at = NOW()
        WHERE id = ${Number(current[0].id)}
          AND tenant_id = ${tenantId}
          AND status = 'open'
          AND clock_out_at IS NULL
        RETURNING *
      `);
      if (!rows[0]) throw Object.assign(new Error('Sesi attendance berubah saat clock-out'), { status: 409, code: 'ATTENDANCE_CONCURRENT_UPDATE' });
      return rows[0];
    });

    res.json({ success: true, data: closed, message: 'Clock-out berhasil' });
  } catch (error) {
    next(error);
  }
};
