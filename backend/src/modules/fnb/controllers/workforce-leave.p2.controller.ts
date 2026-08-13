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

const parseLimit = (value: unknown, fallback = 100) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 300);
};

const parseDateOnly = (value: unknown, field: string) => {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw Object.assign(new Error(`${field} wajib format YYYY-MM-DD`), { status: 400, code: 'INVALID_DATE' });
  }
  return text;
};

const inclusiveDays = (startDate: string, endDate: string) => {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (end < start) throw Object.assign(new Error('Tanggal akhir tidak boleh sebelum tanggal mulai'), { status: 400, code: 'INVALID_LEAVE_PERIOD' });
  return Math.floor((end - start) / 86400000) + 1;
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
    where: { id: employeeId, tenant_id: tenantId },
    select: { id: true, employee_id: true, name: true, status: true },
  });
  if (!employee) throw Object.assign(new Error('Employee tidak ditemukan pada tenant ini'), { status: 404, code: 'EMPLOYEE_NOT_FOUND' });
  return employee;
};

const assertLeaveType = async (tenantId: number, leaveTypeId: number, activeOnly = true) => {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT * FROM public.workforce_leave_types
    WHERE id = ${leaveTypeId} AND tenant_id = ${tenantId}
      ${activeOnly ? Prisma.sql`AND is_active = TRUE` : Prisma.empty}
    LIMIT 1
  `);
  if (!rows[0]) throw Object.assign(new Error('Leave type tidak ditemukan'), { status: 404, code: 'LEAVE_TYPE_NOT_FOUND' });
  return rows[0];
};

export const getLeaveTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const includeInactive = String(req.query.includeInactive || '') === 'true';
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.workforce_leave_types
      WHERE tenant_id = ${tenantId}
        ${includeInactive ? Prisma.empty : Prisma.sql`AND is_active = TRUE`}
      ORDER BY is_active DESC, name ASC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const createLeaveType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const code = String(req.body.code || '').trim().toUpperCase();
    const name = String(req.body.name || '').trim();
    if (!code || !name) return res.status(400).json({ success: false, error: { code: 'LEAVE_TYPE_REQUIRED', message: 'Code dan nama leave type wajib diisi' } });
    const trackBalance = req.body.trackBalance !== false;
    const allowNegative = req.body.allowNegative === true;
    try {
      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.workforce_leave_types
          (tenant_id, code, name, track_balance, allow_negative, is_active, created_by)
        VALUES (${tenantId}, ${code}, ${name}, ${trackBalance}, ${allowNegative}, TRUE, ${userId})
        RETURNING *
      `);
      res.status(201).json({ success: true, data: rows[0] });
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ success: false, error: { code: 'LEAVE_TYPE_EXISTS', message: 'Code leave type sudah digunakan' } });
      throw error;
    }
  } catch (error) { next(error); }
};

export const getLeaveAllocations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : null;
    const limit = parseLimit(req.query.limit, 150);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT a.*, e.employee_id AS employee_code, e.name AS employee_name,
             t.code AS leave_type_code, t.name AS leave_type_name,
             (a.allocated_days - a.reserved_days - a.used_days) AS available_days
      FROM public.workforce_leave_allocations a
      JOIN accounting.employees e ON e.id = a.employee_id AND e.tenant_id = a.tenant_id
      JOIN public.workforce_leave_types t ON t.id = a.leave_type_id AND t.tenant_id = a.tenant_id
      WHERE a.tenant_id = ${tenantId}
        ${employeeId ? Prisma.sql`AND a.employee_id = ${employeeId}` : Prisma.empty}
      ORDER BY a.period_start DESC, e.name ASC
      LIMIT ${limit}
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const createLeaveAllocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employeeId = Number(req.body.employeeId);
    const leaveTypeId = Number(req.body.leaveTypeId);
    const allocatedDays = Number(req.body.allocatedDays);
    const periodStart = parseDateOnly(req.body.periodStart, 'periodStart');
    const periodEnd = parseDateOnly(req.body.periodEnd, 'periodEnd');
    inclusiveDays(periodStart, periodEnd);
    if (!Number.isInteger(employeeId) || employeeId <= 0 || !Number.isInteger(leaveTypeId) || leaveTypeId <= 0 || !Number.isFinite(allocatedDays) || allocatedDays < 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ALLOCATION', message: 'Employee, leave type, dan allocated days wajib valid' } });
    }
    await assertEmployee(tenantId, employeeId);
    const leaveType = await assertLeaveType(tenantId, leaveTypeId);
    if (!leaveType.track_balance) return res.status(409).json({ success: false, error: { code: 'LEAVE_TYPE_UNTRACKED', message: 'Leave type ini tidak menggunakan balance allocation' } });
    const notes = req.body.notes == null ? null : String(req.body.notes).trim() || null;

    const allocation = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, ${employeeId})`);
      const overlap = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT id FROM public.workforce_leave_allocations
        WHERE tenant_id = ${tenantId}
          AND employee_id = ${employeeId}
          AND leave_type_id = ${leaveTypeId}
          AND status = 'active'
          AND period_start <= ${periodEnd}::date
          AND period_end >= ${periodStart}::date
        LIMIT 1
      `);
      if (overlap[0]) throw Object.assign(new Error('Allocation aktif overlap untuk employee dan leave type yang sama'), { status: 409, code: 'LEAVE_ALLOCATION_OVERLAP' });
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.workforce_leave_allocations
          (tenant_id, employee_id, leave_type_id, period_start, period_end, allocated_days, notes, created_by)
        VALUES (${tenantId}, ${employeeId}, ${leaveTypeId}, ${periodStart}::date, ${periodEnd}::date, ${allocatedDays}, ${notes}, ${userId})
        RETURNING *
      `);
      return rows[0];
    });
    res.status(201).json({ success: true, data: allocation });
  } catch (error) { next(error); }
};

export const getMyLeave = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employee = await getSelfEmployee(tenantId, userId);
    const allocations = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT a.*, t.code AS leave_type_code, t.name AS leave_type_name,
             (a.allocated_days - a.reserved_days - a.used_days) AS available_days
      FROM public.workforce_leave_allocations a
      JOIN public.workforce_leave_types t ON t.id = a.leave_type_id AND t.tenant_id = a.tenant_id
      WHERE a.tenant_id = ${tenantId} AND a.employee_id = ${employee.id} AND a.status = 'active'
      ORDER BY a.period_end ASC
    `);
    const requests = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT r.*, t.code AS leave_type_code, t.name AS leave_type_name
      FROM public.workforce_leave_requests r
      JOIN public.workforce_leave_types t ON t.id = r.leave_type_id AND t.tenant_id = r.tenant_id
      WHERE r.tenant_id = ${tenantId} AND r.employee_id = ${employee.id}
      ORDER BY r.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, data: { employee, allocations, requests } });
  } catch (error) { next(error); }
};

export const requestLeaveSelf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employee = await getSelfEmployee(tenantId, userId);
    const leaveTypeId = Number(req.body.leaveTypeId);
    if (!Number.isInteger(leaveTypeId) || leaveTypeId <= 0) return res.status(400).json({ success: false, error: { code: 'LEAVE_TYPE_REQUIRED', message: 'Leave type wajib valid' } });
    const startDate = parseDateOnly(req.body.startDate, 'startDate');
    const endDate = parseDateOnly(req.body.endDate, 'endDate');
    const requestedDays = inclusiveDays(startDate, endDate);
    const reason = req.body.reason == null ? null : String(req.body.reason).trim() || null;
    const leaveType = await assertLeaveType(tenantId, leaveTypeId);

    const request = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, ${employee.id})`);
      const overlap = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT id FROM public.workforce_leave_requests
        WHERE tenant_id = ${tenantId}
          AND employee_id = ${employee.id}
          AND status IN ('pending','approved')
          AND start_date <= ${endDate}::date
          AND end_date >= ${startDate}::date
        LIMIT 1
      `);
      if (overlap[0]) throw Object.assign(new Error('Tanggal cuti overlap dengan request aktif lain'), { status: 409, code: 'LEAVE_REQUEST_OVERLAP' });

      let allocationId: number | null = null;
      if (leaveType.track_balance) {
        const allocations = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT * FROM public.workforce_leave_allocations
          WHERE tenant_id = ${tenantId}
            AND employee_id = ${employee.id}
            AND leave_type_id = ${leaveTypeId}
            AND status = 'active'
            AND period_start <= ${startDate}::date
            AND period_end >= ${endDate}::date
          ORDER BY period_end ASC
          LIMIT 1
          FOR UPDATE
        `);
        const allocation = allocations[0];
        if (!allocation) throw Object.assign(new Error('Tidak ada allocation aktif yang mencakup periode cuti'), { status: 409, code: 'NO_LEAVE_ALLOCATION' });
        const available = Number(allocation.allocated_days) - Number(allocation.reserved_days) - Number(allocation.used_days);
        if (!leaveType.allow_negative && available < requestedDays) {
          throw Object.assign(new Error(`Saldo cuti tidak cukup. Tersedia ${available} hari, diminta ${requestedDays} hari`), { status: 409, code: 'INSUFFICIENT_LEAVE_BALANCE' });
        }
        allocationId = Number(allocation.id);
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.workforce_leave_allocations
          SET reserved_days = reserved_days + ${requestedDays}, updated_at = NOW()
          WHERE id = ${allocationId} AND tenant_id = ${tenantId}
        `);
      }

      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.workforce_leave_requests
          (tenant_id, employee_id, leave_type_id, allocation_id, start_date, end_date, requested_days, reason, status, requested_by)
        VALUES
          (${tenantId}, ${employee.id}, ${leaveTypeId}, ${allocationId}, ${startDate}::date, ${endDate}::date, ${requestedDays}, ${reason}, 'pending', ${userId})
        RETURNING *
      `);
      return rows[0];
    });

    res.status(201).json({ success: true, data: request, message: 'Request cuti berhasil dibuat' });
  } catch (error) { next(error); }
};

export const getLeaveRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const status = req.query.status ? String(req.query.status) : null;
    const limit = parseLimit(req.query.limit, 150);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT r.*, e.employee_id AS employee_code, e.name AS employee_name, e.department, e.position,
             t.code AS leave_type_code, t.name AS leave_type_name
      FROM public.workforce_leave_requests r
      JOIN accounting.employees e ON e.id = r.employee_id AND e.tenant_id = r.tenant_id
      JOIN public.workforce_leave_types t ON t.id = r.leave_type_id AND t.tenant_id = r.tenant_id
      WHERE r.tenant_id = ${tenantId}
        ${status ? Prisma.sql`AND r.status = ${status}` : Prisma.empty}
      ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.created_at DESC
      LIMIT ${limit}
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const decideLeaveRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const requestId = Number(req.params.id);
    const decision = String(req.body.decision || '').trim().toLowerCase();
    const note = req.body.note == null ? null : String(req.body.note).trim() || null;
    if (!Number.isInteger(requestId) || requestId <= 0 || !['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_LEAVE_DECISION', message: 'Decision wajib approved atau rejected' } });
    }

    const result = await prisma.$transaction(async (tx) => {
      const requests = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.workforce_leave_requests
        WHERE id = ${requestId} AND tenant_id = ${tenantId}
        LIMIT 1 FOR UPDATE
      `);
      const request = requests[0];
      if (!request) throw Object.assign(new Error('Leave request tidak ditemukan'), { status: 404, code: 'LEAVE_REQUEST_NOT_FOUND' });
      if (request.status !== 'pending') throw Object.assign(new Error('Hanya leave request pending yang dapat diputuskan'), { status: 409, code: 'LEAVE_REQUEST_NOT_PENDING' });

      if (request.allocation_id) {
        const allocations = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT * FROM public.workforce_leave_allocations
          WHERE id = ${Number(request.allocation_id)} AND tenant_id = ${tenantId}
          LIMIT 1 FOR UPDATE
        `);
        const allocation = allocations[0];
        if (!allocation) throw Object.assign(new Error('Allocation leave request tidak ditemukan'), { status: 409, code: 'LEAVE_ALLOCATION_MISSING' });
        const days = Number(request.requested_days);
        if (Number(allocation.reserved_days) < days) throw Object.assign(new Error('Reserved balance leave tidak konsisten'), { status: 409, code: 'LEAVE_RESERVATION_INCONSISTENT' });
        if (decision === 'approved') {
          await tx.$executeRaw(Prisma.sql`
            UPDATE public.workforce_leave_allocations
            SET reserved_days = reserved_days - ${days}, used_days = used_days + ${days}, updated_at = NOW()
            WHERE id = ${Number(allocation.id)} AND tenant_id = ${tenantId}
          `);
        } else {
          await tx.$executeRaw(Prisma.sql`
            UPDATE public.workforce_leave_allocations
            SET reserved_days = reserved_days - ${days}, updated_at = NOW()
            WHERE id = ${Number(allocation.id)} AND tenant_id = ${tenantId}
          `);
        }
      }

      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.workforce_leave_requests
        SET status = ${decision}, decided_by = ${userId}, decision_note = ${note}, decided_at = NOW(), updated_at = NOW()
        WHERE id = ${requestId} AND tenant_id = ${tenantId} AND status = 'pending'
        RETURNING *
      `);
      if (!rows[0]) throw Object.assign(new Error('Leave request berubah saat proses approval'), { status: 409, code: 'LEAVE_REQUEST_CONCURRENT_UPDATE' });
      return rows[0];
    });

    res.json({ success: true, data: result, message: decision === 'approved' ? 'Cuti disetujui' : 'Cuti ditolak' });
  } catch (error) { next(error); }
};

export const cancelMyLeaveRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employee = await getSelfEmployee(tenantId, userId);
    const requestId = Number(req.params.id);
    if (!Number.isInteger(requestId) || requestId <= 0) return res.status(400).json({ success: false, error: { code: 'INVALID_LEAVE_REQUEST', message: 'Leave request ID wajib valid' } });

    const result = await prisma.$transaction(async (tx) => {
      const requests = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.workforce_leave_requests
        WHERE id = ${requestId} AND tenant_id = ${tenantId} AND employee_id = ${employee.id}
        LIMIT 1 FOR UPDATE
      `);
      const request = requests[0];
      if (!request) throw Object.assign(new Error('Leave request tidak ditemukan'), { status: 404, code: 'LEAVE_REQUEST_NOT_FOUND' });
      if (request.status !== 'pending') throw Object.assign(new Error('Hanya request pending yang dapat dibatalkan sendiri'), { status: 409, code: 'LEAVE_CANCEL_NOT_ALLOWED' });

      if (request.allocation_id) {
        const allocations = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT * FROM public.workforce_leave_allocations
          WHERE id = ${Number(request.allocation_id)} AND tenant_id = ${tenantId}
          LIMIT 1 FOR UPDATE
        `);
        const allocation = allocations[0];
        const days = Number(request.requested_days);
        if (!allocation || Number(allocation.reserved_days) < days) throw Object.assign(new Error('Reserved balance leave tidak konsisten'), { status: 409, code: 'LEAVE_RESERVATION_INCONSISTENT' });
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.workforce_leave_allocations
          SET reserved_days = reserved_days - ${days}, updated_at = NOW()
          WHERE id = ${Number(allocation.id)} AND tenant_id = ${tenantId}
        `);
      }

      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.workforce_leave_requests
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = ${requestId} AND tenant_id = ${tenantId} AND employee_id = ${employee.id} AND status = 'pending'
        RETURNING *
      `);
      if (!rows[0]) throw Object.assign(new Error('Leave request berubah saat proses cancel'), { status: 409, code: 'LEAVE_REQUEST_CONCURRENT_UPDATE' });
      return rows[0];
    });

    res.json({ success: true, data: result, message: 'Request cuti dibatalkan' });
  } catch (error) { next(error); }
};
