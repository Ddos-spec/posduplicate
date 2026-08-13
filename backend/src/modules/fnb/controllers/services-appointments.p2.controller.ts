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

const boundedInt = (value: unknown, code: string, min: number, max: number, fallback?: number) => {
  if ((value === undefined || value === null || value === '') && fallback !== undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw Object.assign(new Error(`${code} harus integer ${min}-${max}`), { status: 400, code });
  }
  return parsed;
};

const cleanText = (value: unknown, max = 5000) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
};

const timestamp = (value: unknown, code: string) => {
  const parsed = new Date(String(value || ''));
  if (Number.isNaN(parsed.getTime())) throw Object.assign(new Error(`${code} tidak valid`), { status: 400, code });
  return parsed;
};

const shiftMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);

const generateAppointmentCode = (tenantId: number) =>
  `APT-${tenantId}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const assertOutlet = async (tenantId: number, outletId: number) => {
  const outlet = await prisma.outlets.findFirst({ where: { id: outletId, tenant_id: tenantId }, select: { id: true } });
  if (!outlet) throw Object.assign(new Error('Outlet bukan milik tenant ini'), { status: 403, code: 'OUTLET_ACCESS_DENIED' });
};

const assertEmployee = async (tenantId: number, employeeId: number) => {
  const employee = await prisma.employees.findFirst({
    where: { id: employeeId, tenant_id: tenantId, status: 'active' },
    select: { id: true, employee_id: true, name: true },
  });
  if (!employee) throw Object.assign(new Error('Employee aktif tidak ditemukan pada tenant ini'), { status: 404, code: 'APPOINTMENT_EMPLOYEE_NOT_FOUND' });
  return employee;
};

const getSelfEmployee = async (tenantId: number, userId: number) => {
  const employee = await prisma.employees.findFirst({
    where: { tenant_id: tenantId, user_id: userId, status: 'active' },
    select: { id: true, employee_id: true, name: true, user_id: true },
  });
  if (!employee) throw Object.assign(new Error('User belum terhubung ke employee aktif'), { status: 404, code: 'EMPLOYEE_PROFILE_REQUIRED' });
  return employee;
};

const getCustomer = async (tenantId: number, customerId: number) => {
  const rows = await prisma.$queryRaw<Array<{ id: number; outlet_id: number; name: string }>>(Prisma.sql`
    SELECT c.id, c.outlet_id, c.name
    FROM public.customers c
    JOIN public.outlets o ON o.id = c.outlet_id
    WHERE c.id = ${customerId} AND o.tenant_id = ${tenantId}
    LIMIT 1
  `);
  if (!rows[0]) throw Object.assign(new Error('Customer tidak ditemukan pada tenant ini'), { status: 404, code: 'APPOINTMENT_CUSTOMER_NOT_FOUND' });
  return rows[0];
};

const getAppointmentType = async (tenantId: number, typeId: number, activeOnly = true) => {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT * FROM public.service_appointment_types
    WHERE id = ${typeId} AND tenant_id = ${tenantId}
      ${activeOnly ? Prisma.sql`AND is_active = TRUE` : Prisma.empty}
    LIMIT 1
  `);
  if (!rows[0]) throw Object.assign(new Error('Appointment type tidak ditemukan'), { status: 404, code: 'APPOINTMENT_TYPE_NOT_FOUND' });
  return rows[0];
};

const insertEvent = async (
  tx: Prisma.TransactionClient,
  tenantId: number,
  appointmentId: number,
  eventType: string,
  actorUserId: number,
  actorEmployeeId: number | null,
  notes: string | null,
  payload: Record<string, unknown> = {},
) => {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.service_appointment_events
      (tenant_id, appointment_id, event_type, actor_user_id, actor_employee_id, notes, payload)
    VALUES
      (${tenantId}, ${appointmentId}, ${eventType}, ${actorUserId}, ${actorEmployeeId}, ${notes}, ${JSON.stringify(payload)}::jsonb)
  `);
};

const assertNoPlanningOverlap = async (
  tx: Prisma.TransactionClient,
  tenantId: number,
  employeeId: number,
  startAt: Date,
  endAt: Date,
  excludePlanningId?: number,
) => {
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT id FROM public.service_planning_allocations
    WHERE tenant_id = ${tenantId}
      AND employee_id = ${employeeId}
      AND status IN ('planned','confirmed')
      AND start_at < ${endAt}
      AND end_at > ${startAt}
      ${excludePlanningId ? Prisma.sql`AND id <> ${excludePlanningId}` : Prisma.empty}
    LIMIT 1
  `);
  if (rows[0]) throw Object.assign(new Error('Employee sudah memiliki planning yang overlap'), { status: 409, code: 'PLANNING_OVERLAP' });
};

export const getAppointmentTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT t.*, o.name AS outlet_name
      FROM public.service_appointment_types t
      LEFT JOIN public.outlets o ON o.id = t.outlet_id AND o.tenant_id = t.tenant_id
      WHERE t.tenant_id = ${tenantId}
      ORDER BY t.is_active DESC, t.name ASC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const createAppointmentType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const code = cleanText(req.body.code, 60)?.toUpperCase();
    const name = cleanText(req.body.name, 180);
    if (!code || !name) return res.status(400).json({ success: false, error: { code: 'APPOINTMENT_TYPE_FIELDS_REQUIRED', message: 'Code dan nama appointment type wajib diisi' } });
    const outletId = optionalPositiveInt(req.body.outletId, 'INVALID_OUTLET_ID');
    if (outletId) await assertOutlet(tenantId, outletId);
    const durationMinutes = boundedInt(req.body.durationMinutes, 'INVALID_APPOINTMENT_DURATION', 1, 1440);
    const bufferBefore = boundedInt(req.body.bufferBeforeMinutes, 'INVALID_APPOINTMENT_BUFFER_BEFORE', 0, 1440, 0);
    const bufferAfter = boundedInt(req.body.bufferAfterMinutes, 'INVALID_APPOINTMENT_BUFFER_AFTER', 0, 1440, 0);
    try {
      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.service_appointment_types
          (tenant_id, outlet_id, code, name, description, duration_minutes, buffer_before_minutes, buffer_after_minutes, created_by, updated_by)
        VALUES
          (${tenantId}, ${outletId}, ${code}, ${name}, ${cleanText(req.body.description)}, ${durationMinutes}, ${bufferBefore}, ${bufferAfter}, ${userId}, ${userId})
        RETURNING *
      `);
      res.status(201).json({ success: true, data: rows[0] });
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ success: false, error: { code: 'APPOINTMENT_TYPE_CODE_EXISTS', message: 'Code appointment type sudah dipakai tenant ini' } });
      throw error;
    }
  } catch (error) { next(error); }
};

export const getAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const employeeId = req.query.employeeId ? positiveInt(req.query.employeeId, 'INVALID_EMPLOYEE_ID') : null;
    const customerId = req.query.customerId ? positiveInt(req.query.customerId, 'INVALID_CUSTOMER_ID') : null;
    const status = req.query.status ? String(req.query.status).trim() : null;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT a.*, t.code AS type_code, t.name AS type_name,
             c.name AS customer_name, e.employee_id AS employee_code, e.name AS employee_name,
             o.name AS outlet_name, p.start_at AS blocked_start, p.end_at AS blocked_end, p.status AS planning_status
      FROM public.service_appointments a
      JOIN public.service_appointment_types t ON t.id = a.appointment_type_id AND t.tenant_id = a.tenant_id
      JOIN public.customers c ON c.id = a.customer_id
      JOIN accounting.employees e ON e.id = a.assigned_employee_id AND e.tenant_id = a.tenant_id
      LEFT JOIN public.outlets o ON o.id = a.outlet_id AND o.tenant_id = a.tenant_id
      JOIN public.service_planning_allocations p ON p.id = a.planning_allocation_id AND p.tenant_id = a.tenant_id
      WHERE a.tenant_id = ${tenantId}
        ${employeeId ? Prisma.sql`AND a.assigned_employee_id = ${employeeId}` : Prisma.empty}
        ${customerId ? Prisma.sql`AND a.customer_id = ${customerId}` : Prisma.empty}
        ${status ? Prisma.sql`AND a.status = ${status}` : Prisma.empty}
      ORDER BY a.scheduled_start ASC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const getMyAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employee = await getSelfEmployee(tenantId, userId);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT a.*, t.name AS type_name, c.name AS customer_name, o.name AS outlet_name
      FROM public.service_appointments a
      JOIN public.service_appointment_types t ON t.id = a.appointment_type_id AND t.tenant_id = a.tenant_id
      JOIN public.customers c ON c.id = a.customer_id
      LEFT JOIN public.outlets o ON o.id = a.outlet_id AND o.tenant_id = a.tenant_id
      WHERE a.tenant_id = ${tenantId} AND a.assigned_employee_id = ${employee.id}
      ORDER BY a.scheduled_start ASC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const getAppointmentEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const appointmentId = positiveInt(req.params.id, 'INVALID_APPOINTMENT_ID');
    const exists = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT id FROM public.service_appointments WHERE id = ${appointmentId} AND tenant_id = ${tenantId} LIMIT 1`);
    if (!exists[0]) return res.status(404).json({ success: false, error: { code: 'APPOINTMENT_NOT_FOUND', message: 'Appointment tidak ditemukan' } });
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT ev.*, u.name AS actor_name, e.name AS actor_employee_name
      FROM public.service_appointment_events ev
      LEFT JOIN public.users u ON u.id = ev.actor_user_id
      LEFT JOIN accounting.employees e ON e.id = ev.actor_employee_id AND e.tenant_id = ev.tenant_id
      WHERE ev.tenant_id = ${tenantId} AND ev.appointment_id = ${appointmentId}
      ORDER BY ev.created_at ASC, ev.id ASC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const createAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const appointmentTypeId = positiveInt(req.body.appointmentTypeId, 'INVALID_APPOINTMENT_TYPE_ID');
    const customerId = positiveInt(req.body.customerId, 'INVALID_CUSTOMER_ID');
    const employeeId = positiveInt(req.body.employeeId, 'INVALID_EMPLOYEE_ID');
    const startAt = timestamp(req.body.startAt, 'INVALID_APPOINTMENT_START');
    const appointmentType = await getAppointmentType(tenantId, appointmentTypeId, true);
    const customer = await getCustomer(tenantId, customerId);
    await assertEmployee(tenantId, employeeId);
    const requestedOutletId = optionalPositiveInt(req.body.outletId, 'INVALID_OUTLET_ID');
    if (requestedOutletId) await assertOutlet(tenantId, requestedOutletId);
    if (appointmentType.outlet_id && requestedOutletId && Number(appointmentType.outlet_id) !== requestedOutletId) {
      return res.status(409).json({ success: false, error: { code: 'APPOINTMENT_TYPE_OUTLET_MISMATCH', message: 'Appointment type dibatasi ke outlet lain' } });
    }
    const outletId = requestedOutletId || Number(appointmentType.outlet_id || customer.outlet_id);
    await assertOutlet(tenantId, outletId);

    const durationMinutes = Number(appointmentType.duration_minutes);
    const bufferBeforeMinutes = Number(appointmentType.buffer_before_minutes || 0);
    const bufferAfterMinutes = Number(appointmentType.buffer_after_minutes || 0);
    const endAt = shiftMinutes(startAt, durationMinutes);
    const blockedStart = shiftMinutes(startAt, -bufferBeforeMinutes);
    const blockedEnd = shiftMinutes(endAt, bufferAfterMinutes);
    const code = generateAppointmentCode(tenantId);
    const title = cleanText(req.body.title, 220) || `${String(appointmentType.name)} - ${customer.name}`;

    const created = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, 74001)`);
      await assertNoPlanningOverlap(tx, tenantId, employeeId, blockedStart, blockedEnd);
      const planning = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.service_planning_allocations
          (tenant_id, employee_id, start_at, end_at, status, notes, created_by, updated_by)
        VALUES
          (${tenantId}, ${employeeId}, ${blockedStart}, ${blockedEnd}, 'planned', ${`Appointment ${code}`}, ${userId}, ${userId})
        RETURNING *
      `);
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.service_appointments
          (tenant_id, outlet_id, appointment_type_id, customer_id, assigned_employee_id, planning_allocation_id,
           code, title, notes, status, scheduled_start, scheduled_end, duration_minutes, buffer_before_minutes,
           buffer_after_minutes, created_by, updated_by)
        VALUES
          (${tenantId}, ${outletId}, ${appointmentTypeId}, ${customerId}, ${employeeId}, ${Number(planning[0].id)},
           ${code}, ${title}, ${cleanText(req.body.notes)}, 'booked', ${startAt}, ${endAt}, ${durationMinutes},
           ${bufferBeforeMinutes}, ${bufferAfterMinutes}, ${userId}, ${userId})
        RETURNING *
      `);
      await insertEvent(tx, tenantId, Number(rows[0].id), 'booked', userId, null, cleanText(req.body.notes), {
        planningAllocationId: Number(planning[0].id), scheduledStart: startAt.toISOString(), scheduledEnd: endAt.toISOString(),
        employeeId, customerId, appointmentTypeId,
      });
      return rows[0];
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) { next(error); }
};

export const confirmAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const appointmentId = positiveInt(req.params.id, 'INVALID_APPOINTMENT_ID');
    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.service_appointments WHERE id = ${appointmentId} AND tenant_id = ${tenantId} FOR UPDATE`);
      const current = rows[0];
      if (!current) throw Object.assign(new Error('Appointment tidak ditemukan'), { status: 404, code: 'APPOINTMENT_NOT_FOUND' });
      if (current.status !== 'booked') throw Object.assign(new Error('Hanya appointment booked yang dapat dikonfirmasi'), { status: 409, code: 'INVALID_APPOINTMENT_TRANSITION' });
      const changedPlanning = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.service_planning_allocations SET status = 'confirmed', updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${Number(current.planning_allocation_id)} AND tenant_id = ${tenantId} AND status = 'planned'
        RETURNING id
      `);
      if (!changedPlanning[0]) throw Object.assign(new Error('Planning appointment berubah saat confirm'), { status: 409, code: 'APPOINTMENT_PLANNING_CONCURRENT_UPDATE' });
      const changed = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.service_appointments SET status = 'confirmed', confirmed_at = NOW(), updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${appointmentId} AND tenant_id = ${tenantId} AND status = 'booked'
        RETURNING *
      `);
      if (!changed[0]) throw Object.assign(new Error('Appointment berubah saat confirm'), { status: 409, code: 'APPOINTMENT_CONCURRENT_UPDATE' });
      await insertEvent(tx, tenantId, appointmentId, 'confirmed', userId, null, cleanText(req.body.notes), {});
      return changed[0];
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const rescheduleAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const appointmentId = positiveInt(req.params.id, 'INVALID_APPOINTMENT_ID');
    const startAt = timestamp(req.body.startAt, 'INVALID_APPOINTMENT_START');
    const requestedEmployeeId = optionalPositiveInt(req.body.employeeId, 'INVALID_EMPLOYEE_ID');
    if (requestedEmployeeId) await assertEmployee(tenantId, requestedEmployeeId);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, 74001)`);
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.service_appointments WHERE id = ${appointmentId} AND tenant_id = ${tenantId} FOR UPDATE`);
      const current = rows[0];
      if (!current) throw Object.assign(new Error('Appointment tidak ditemukan'), { status: 404, code: 'APPOINTMENT_NOT_FOUND' });
      if (!['booked', 'confirmed'].includes(current.status)) throw Object.assign(new Error('Appointment pada status ini tidak dapat dijadwal ulang'), { status: 409, code: 'INVALID_APPOINTMENT_TRANSITION' });
      const planningRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.service_planning_allocations WHERE id = ${Number(current.planning_allocation_id)} AND tenant_id = ${tenantId} FOR UPDATE
      `);
      const planning = planningRows[0];
      if (!planning || !['planned', 'confirmed'].includes(planning.status)) throw Object.assign(new Error('Planning appointment tidak aktif'), { status: 409, code: 'APPOINTMENT_PLANNING_INVALID' });
      const employeeId = requestedEmployeeId || Number(current.assigned_employee_id);
      const endAt = shiftMinutes(startAt, Number(current.duration_minutes));
      const blockedStart = shiftMinutes(startAt, -Number(current.buffer_before_minutes || 0));
      const blockedEnd = shiftMinutes(endAt, Number(current.buffer_after_minutes || 0));
      await assertNoPlanningOverlap(tx, tenantId, employeeId, blockedStart, blockedEnd, Number(current.planning_allocation_id));

      await tx.$executeRaw(Prisma.sql`
        UPDATE public.service_planning_allocations
        SET employee_id = ${employeeId}, start_at = ${blockedStart}, end_at = ${blockedEnd}, updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${Number(current.planning_allocation_id)} AND tenant_id = ${tenantId}
      `);
      const changed = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.service_appointments
        SET assigned_employee_id = ${employeeId}, scheduled_start = ${startAt}, scheduled_end = ${endAt}, updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${appointmentId} AND tenant_id = ${tenantId} AND status = ${String(current.status)}
        RETURNING *
      `);
      if (!changed[0]) throw Object.assign(new Error('Appointment berubah saat reschedule'), { status: 409, code: 'APPOINTMENT_CONCURRENT_UPDATE' });
      await insertEvent(tx, tenantId, appointmentId, 'rescheduled', userId, null, cleanText(req.body.notes), {
        previousStart: new Date(current.scheduled_start).toISOString(), previousEnd: new Date(current.scheduled_end).toISOString(),
        previousEmployeeId: Number(current.assigned_employee_id), scheduledStart: startAt.toISOString(), scheduledEnd: endAt.toISOString(), employeeId,
      });
      return changed[0];
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

const managerTerminalTransition = async (
  req: Request,
  target: 'cancelled' | 'no_show',
  expected: string[],
  eventType: string,
) => {
  const tenantId = requireTenant(req);
  const userId = requireUser(req);
  const appointmentId = positiveInt(req.params.id, 'INVALID_APPOINTMENT_ID');
  const reason = cleanText(req.body.reason, 2000);
  if (target === 'cancelled' && !reason) throw Object.assign(new Error('Alasan cancellation wajib diisi'), { status: 400, code: 'APPOINTMENT_CANCELLATION_REASON_REQUIRED' });
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.service_appointments WHERE id = ${appointmentId} AND tenant_id = ${tenantId} FOR UPDATE`);
    const current = rows[0];
    if (!current) throw Object.assign(new Error('Appointment tidak ditemukan'), { status: 404, code: 'APPOINTMENT_NOT_FOUND' });
    if (!expected.includes(current.status)) throw Object.assign(new Error(`Appointment ${current.status} tidak dapat menjadi ${target}`), { status: 409, code: 'INVALID_APPOINTMENT_TRANSITION' });
    await tx.$executeRaw(Prisma.sql`
      UPDATE public.service_planning_allocations SET status = 'cancelled', updated_by = ${userId}, updated_at = NOW()
      WHERE id = ${Number(current.planning_allocation_id)} AND tenant_id = ${tenantId} AND status IN ('planned','confirmed')
    `);
    const changed = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.service_appointments
      SET status = ${target},
          cancelled_at = CASE WHEN ${target} = 'cancelled' THEN NOW() ELSE cancelled_at END,
          no_show_at = CASE WHEN ${target} = 'no_show' THEN NOW() ELSE no_show_at END,
          cancellation_reason = CASE WHEN ${target} = 'cancelled' THEN ${reason} ELSE cancellation_reason END,
          updated_by = ${userId}, updated_at = NOW()
      WHERE id = ${appointmentId} AND tenant_id = ${tenantId} AND status = ${String(current.status)}
      RETURNING *
    `);
    if (!changed[0]) throw Object.assign(new Error('Appointment berubah saat terminal transition'), { status: 409, code: 'APPOINTMENT_CONCURRENT_UPDATE' });
    await insertEvent(tx, tenantId, appointmentId, eventType, userId, null, reason, {});
    return changed[0];
  });
};

export const cancelAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await managerTerminalTransition(req, 'cancelled', ['booked', 'confirmed'], 'cancelled') }); }
  catch (error) { next(error); }
};

export const markAppointmentNoShow = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await managerTerminalTransition(req, 'no_show', ['confirmed'], 'no_show') }); }
  catch (error) { next(error); }
};

const operationalTransition = async (req: Request, target: 'checked_in' | 'completed', selfBound: boolean) => {
  const tenantId = requireTenant(req);
  const userId = requireUser(req);
  const appointmentId = positiveInt(req.params.id, 'INVALID_APPOINTMENT_ID');
  const employee = selfBound ? await getSelfEmployee(tenantId, userId) : null;
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.service_appointments WHERE id = ${appointmentId} AND tenant_id = ${tenantId} FOR UPDATE`);
    const current = rows[0];
    if (!current) throw Object.assign(new Error('Appointment tidak ditemukan'), { status: 404, code: 'APPOINTMENT_NOT_FOUND' });
    if (employee && Number(current.assigned_employee_id) !== employee.id) throw Object.assign(new Error('Appointment bukan assignment employee login ini'), { status: 403, code: 'APPOINTMENT_ASSIGNMENT_MISMATCH' });
    const expected = target === 'checked_in' ? 'confirmed' : 'checked_in';
    if (current.status !== expected) throw Object.assign(new Error(`Appointment ${current.status} tidak dapat menjadi ${target}`), { status: 409, code: 'INVALID_APPOINTMENT_TRANSITION' });
    if (target === 'completed') {
      const planning = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.service_planning_allocations SET status = 'done', updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${Number(current.planning_allocation_id)} AND tenant_id = ${tenantId} AND status = 'confirmed'
        RETURNING id
      `);
      if (!planning[0]) throw Object.assign(new Error('Planning appointment tidak dapat diselesaikan'), { status: 409, code: 'APPOINTMENT_PLANNING_CONCURRENT_UPDATE' });
    }
    const completionNote = target === 'completed' ? cleanText(req.body.completionNote, 5000) : null;
    const changed = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.service_appointments
      SET status = ${target},
          checked_in_at = CASE WHEN ${target} = 'checked_in' THEN NOW() ELSE checked_in_at END,
          completed_at = CASE WHEN ${target} = 'completed' THEN NOW() ELSE completed_at END,
          completion_note = CASE WHEN ${target} = 'completed' THEN ${completionNote} ELSE completion_note END,
          updated_by = ${userId}, updated_at = NOW()
      WHERE id = ${appointmentId} AND tenant_id = ${tenantId} AND status = ${String(current.status)}
      RETURNING *
    `);
    if (!changed[0]) throw Object.assign(new Error('Appointment berubah saat operational transition'), { status: 409, code: 'APPOINTMENT_CONCURRENT_UPDATE' });
    await insertEvent(tx, tenantId, appointmentId, target, userId, employee?.id || null, completionNote || cleanText(req.body.notes), {});
    return changed[0];
  });
};

export const checkInAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await operationalTransition(req, 'checked_in', false) }); }
  catch (error) { next(error); }
};

export const completeAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await operationalTransition(req, 'completed', false) }); }
  catch (error) { next(error); }
};

export const checkInMyAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await operationalTransition(req, 'checked_in', true) }); }
  catch (error) { next(error); }
};

export const completeMyAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await operationalTransition(req, 'completed', true) }); }
  catch (error) { next(error); }
};
