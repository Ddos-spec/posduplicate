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

const optionalCoordinate = (value: unknown, min: number, max: number, code: string) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw Object.assign(new Error(`${code} tidak valid`), { status: 400, code });
  return parsed;
};

const coordinates = (body: any) => {
  const latitude = optionalCoordinate(body?.latitude, -90, 90, 'INVALID_FIELD_LATITUDE');
  const longitude = optionalCoordinate(body?.longitude, -180, 180, 'INVALID_FIELD_LONGITUDE');
  if ((latitude === null) !== (longitude === null)) throw Object.assign(new Error('Latitude dan longitude harus dikirim berpasangan'), { status: 400, code: 'FIELD_COORDINATE_PAIR_REQUIRED' });
  return { latitude, longitude };
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
  const employee = await prisma.employees.findFirst({ where: { id: employeeId, tenant_id: tenantId, status: 'active' }, select: { id: true } });
  if (!employee) throw Object.assign(new Error('Employee aktif tidak ditemukan pada tenant ini'), { status: 404, code: 'FIELD_EMPLOYEE_NOT_FOUND' });
};

const getTenantCustomer = async (tenantId: number, customerId: number) => {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT c.id, c.name, c.phone, c.address, c.outlet_id
    FROM public.customers c
    JOIN public.outlets o ON o.id = c.outlet_id
    WHERE c.id = ${customerId} AND o.tenant_id = ${tenantId}
    LIMIT 1
  `);
  if (!rows[0]) throw Object.assign(new Error('Customer tidak ditemukan pada tenant ini'), { status: 404, code: 'FIELD_CUSTOMER_NOT_FOUND' });
  return rows[0];
};

const assertTenantOutlet = async (tenantId: number, outletId: number) => {
  const outlet = await prisma.outlets.findFirst({ where: { id: outletId, tenant_id: tenantId }, select: { id: true } });
  if (!outlet) throw Object.assign(new Error('Outlet bukan milik tenant ini'), { status: 403, code: 'OUTLET_ACCESS_DENIED' });
};

const assertProjectTask = async (client: any, tenantId: number, projectId: number | null, taskId: number | null) => {
  if (taskId && !projectId) throw Object.assign(new Error('Task Field Service membutuhkan projectId'), { status: 400, code: 'FIELD_PROJECT_REQUIRED' });
  if (projectId) {
    const projects = (await client.$queryRaw(Prisma.sql`
      SELECT id, status FROM public.service_projects
      WHERE id = ${projectId} AND tenant_id = ${tenantId}
      LIMIT 1
    `)) as any[];
    if (!projects[0]) throw Object.assign(new Error('Project tidak ditemukan'), { status: 404, code: 'SERVICE_PROJECT_NOT_FOUND' });
    if (['completed', 'cancelled'].includes(projects[0].status)) throw Object.assign(new Error('Field Service tidak dapat memakai project terminal'), { status: 409, code: 'PROJECT_TERMINAL' });
  }
  if (taskId) {
    const tasks = (await client.$queryRaw(Prisma.sql`
      SELECT id, status FROM public.service_project_tasks
      WHERE id = ${taskId} AND tenant_id = ${tenantId} AND project_id = ${projectId}
      LIMIT 1
    `)) as any[];
    if (!tasks[0]) throw Object.assign(new Error('Task tidak ditemukan pada project ini'), { status: 404, code: 'SERVICE_TASK_NOT_FOUND' });
    if (['done', 'cancelled'].includes(tasks[0].status)) throw Object.assign(new Error('Field Service tidak dapat memakai task terminal'), { status: 409, code: 'TASK_TERMINAL' });
  }
};

const insertFieldEvent = async (client: any, tenantId: number, fieldOrderId: number, eventType: string, actorUserId: number, employeeId: number | null, notes: string | null, latitude: number | null = null, longitude: number | null = null) => {
  await client.$executeRaw(Prisma.sql`
    INSERT INTO public.service_field_events
      (tenant_id, field_order_id, event_type, actor_user_id, employee_id, notes, latitude, longitude)
    VALUES (${tenantId}, ${fieldOrderId}, ${eventType}, ${actorUserId}, ${employeeId}, ${notes}, ${latitude}, ${longitude})
  `);
};

export const getFieldServiceOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const status = req.query.status ? String(req.query.status) : null;
    const employeeId = req.query.employeeId ? positiveInt(req.query.employeeId, 'INVALID_EMPLOYEE_ID') : null;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT f.*, c.name AS customer_name, c.phone AS customer_phone, o.name AS outlet_name,
             e.employee_id AS employee_code, e.name AS employee_name,
             p.code AS project_code, p.name AS project_name, t.title AS task_title
      FROM public.service_field_orders f
      JOIN public.customers c ON c.id = f.customer_id
      LEFT JOIN public.outlets o ON o.id = f.outlet_id AND o.tenant_id = f.tenant_id
      LEFT JOIN accounting.employees e ON e.id = f.assigned_employee_id AND e.tenant_id = f.tenant_id
      LEFT JOIN public.service_projects p ON p.id = f.project_id AND p.tenant_id = f.tenant_id
      LEFT JOIN public.service_project_tasks t ON t.id = f.task_id AND t.tenant_id = f.tenant_id
      WHERE f.tenant_id = ${tenantId}
        ${status ? Prisma.sql`AND f.status = ${status}` : Prisma.empty}
        ${employeeId ? Prisma.sql`AND f.assigned_employee_id = ${employeeId}` : Prisma.empty}
      ORDER BY COALESCE(f.scheduled_start, f.created_at) ASC, f.id ASC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const getMyFieldServiceOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employee = await getSelfEmployee(tenantId, userId);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT f.*, c.name AS customer_name, c.phone AS customer_phone,
             p.code AS project_code, p.name AS project_name, t.title AS task_title
      FROM public.service_field_orders f
      JOIN public.customers c ON c.id = f.customer_id
      LEFT JOIN public.service_projects p ON p.id = f.project_id AND p.tenant_id = f.tenant_id
      LEFT JOIN public.service_project_tasks t ON t.id = f.task_id AND t.tenant_id = f.tenant_id
      WHERE f.tenant_id = ${tenantId} AND f.assigned_employee_id = ${employee.id}
      ORDER BY CASE WHEN f.status IN ('scheduled','en_route','on_site') THEN 0 ELSE 1 END,
               COALESCE(f.scheduled_start, f.created_at) ASC, f.id ASC
    `);
    res.json({ success: true, data: { employee, orders: rows } });
  } catch (error) { next(error); }
};

export const getFieldServiceEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const id = positiveInt(req.params.id, 'INVALID_FIELD_ORDER_ID');
    const orders = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT id FROM public.service_field_orders WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`);
    if (!orders[0]) return res.status(404).json({ success: false, error: { code: 'FIELD_ORDER_NOT_FOUND', message: 'Field Service order tidak ditemukan' } });
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT ev.*, u.name AS actor_name, e.name AS employee_name
      FROM public.service_field_events ev
      LEFT JOIN public.users u ON u.id = ev.actor_user_id AND u.tenant_id = ev.tenant_id
      LEFT JOIN accounting.employees e ON e.id = ev.employee_id AND e.tenant_id = ev.tenant_id
      WHERE ev.tenant_id = ${tenantId} AND ev.field_order_id = ${id}
      ORDER BY ev.occurred_at ASC, ev.id ASC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const createFieldServiceOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const code = cleanText(req.body.code, 60)?.toUpperCase();
    const title = cleanText(req.body.title, 220);
    const customerId = positiveInt(req.body.customerId, 'INVALID_CUSTOMER_ID');
    if (!code || !title) return res.status(400).json({ success: false, error: { code: 'FIELD_ORDER_FIELDS_REQUIRED', message: 'Code dan title Field Service wajib diisi' } });

    const customer = await getTenantCustomer(tenantId, customerId);
    const outletId = optionalPositiveInt(req.body.outletId, 'INVALID_OUTLET_ID') ?? (customer.outlet_id ? Number(customer.outlet_id) : null);
    if (outletId) await assertTenantOutlet(tenantId, outletId);
    const projectId = optionalPositiveInt(req.body.projectId, 'INVALID_PROJECT_ID');
    const taskId = optionalPositiveInt(req.body.taskId, 'INVALID_TASK_ID');
    await assertProjectTask(prisma, tenantId, projectId, taskId);
    const serviceAddress = cleanText(req.body.serviceAddress, 2000) || cleanText(customer.address, 2000);
    if (!serviceAddress) return res.status(400).json({ success: false, error: { code: 'FIELD_SERVICE_ADDRESS_REQUIRED', message: 'Alamat layanan wajib tersedia pada request atau customer' } });
    const priority = String(req.body.priority || 'normal').trim();
    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) return res.status(400).json({ success: false, error: { code: 'INVALID_FIELD_PRIORITY', message: 'Priority Field Service tidak valid' } });

    try {
      const created = await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<any[]>(Prisma.sql`
          INSERT INTO public.service_field_orders
            (tenant_id, outlet_id, customer_id, project_id, task_id, code, title, description, service_address, contact_name, contact_phone, priority, status, created_by, updated_by)
          VALUES
            (${tenantId}, ${outletId}, ${customerId}, ${projectId}, ${taskId}, ${code}, ${title}, ${cleanText(req.body.description)}, ${serviceAddress},
             ${cleanText(req.body.contactName, 160) || cleanText(customer.name, 160)}, ${cleanText(req.body.contactPhone, 60) || cleanText(customer.phone, 60)},
             ${priority}, 'draft', ${userId}, ${userId})
          RETURNING *
        `);
        const order = rows[0];
        await insertFieldEvent(tx, tenantId, Number(order.id), 'created', userId, null, cleanText(req.body.notes));
        return order;
      });
      res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ success: false, error: { code: 'FIELD_ORDER_CODE_EXISTS', message: 'Code Field Service sudah digunakan tenant ini' } });
      throw error;
    }
  } catch (error) { next(error); }
};

export const scheduleFieldServiceOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const id = positiveInt(req.params.id, 'INVALID_FIELD_ORDER_ID');
    const employeeId = positiveInt(req.body.employeeId, 'INVALID_EMPLOYEE_ID');
    const startAt = timestamp(req.body.startAt, 'INVALID_FIELD_SCHEDULE_START');
    const endAt = timestamp(req.body.endAt, 'INVALID_FIELD_SCHEDULE_END');
    if (endAt <= startAt) return res.status(400).json({ success: false, error: { code: 'INVALID_FIELD_SCHEDULE_PERIOD', message: 'Schedule end harus setelah start' } });
    await assertEmployee(tenantId, employeeId);

    const scheduled = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, 74001)`);
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.service_field_orders WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE`);
      const current = rows[0];
      if (!current) throw Object.assign(new Error('Field Service order tidak ditemukan'), { status: 404, code: 'FIELD_ORDER_NOT_FOUND' });
      if (current.status !== 'draft') throw Object.assign(new Error('Hanya Field Service draft yang dapat dijadwalkan'), { status: 409, code: 'FIELD_ORDER_NOT_DRAFT' });
      await assertProjectTask(tx, tenantId, current.project_id ? Number(current.project_id) : null, current.task_id ? Number(current.task_id) : null);
      const overlap = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT id FROM public.service_planning_allocations
        WHERE tenant_id = ${tenantId} AND employee_id = ${employeeId}
          AND status IN ('planned','confirmed')
          AND start_at < ${endAt} AND end_at > ${startAt}
        LIMIT 1
      `);
      if (overlap[0]) throw Object.assign(new Error('Employee sudah memiliki planning yang overlap'), { status: 409, code: 'PLANNING_OVERLAP' });
      const allocations = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.service_planning_allocations
          (tenant_id, project_id, task_id, employee_id, start_at, end_at, status, notes, created_by, updated_by)
        VALUES
          (${tenantId}, ${current.project_id ? Number(current.project_id) : null}, ${current.task_id ? Number(current.task_id) : null}, ${employeeId},
           ${startAt}, ${endAt}, 'confirmed', ${`Field Service ${current.code}: ${current.title}`}, ${userId}, ${userId})
        RETURNING *
      `);
      const allocation = allocations[0];
      const changed = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.service_field_orders
        SET assigned_employee_id = ${employeeId}, planning_allocation_id = ${Number(allocation.id)}, scheduled_start = ${startAt}, scheduled_end = ${endAt},
            status = 'scheduled', updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'draft'
        RETURNING *
      `);
      if (!changed[0]) throw Object.assign(new Error('Field Service order berubah saat scheduling'), { status: 409, code: 'FIELD_ORDER_CONCURRENT_UPDATE' });
      await insertFieldEvent(tx, tenantId, id, 'scheduled', userId, employeeId, cleanText(req.body.notes));
      return { order: changed[0], planning: allocation };
    });
    res.json({ success: true, data: scheduled });
  } catch (error) { next(error); }
};

export const cancelFieldServiceOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const id = positiveInt(req.params.id, 'INVALID_FIELD_ORDER_ID');
    const reason = cleanText(req.body.reason);
    if (!reason) return res.status(400).json({ success: false, error: { code: 'FIELD_CANCELLATION_REASON_REQUIRED', message: 'Alasan cancellation wajib diisi' } });
    const cancelled = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, 74001)`);
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.service_field_orders WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE`);
      const current = rows[0];
      if (!current) throw Object.assign(new Error('Field Service order tidak ditemukan'), { status: 404, code: 'FIELD_ORDER_NOT_FOUND' });
      if (['completed', 'cancelled'].includes(current.status)) throw Object.assign(new Error('Field Service order sudah terminal'), { status: 409, code: 'FIELD_ORDER_TERMINAL' });
      const changed = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.service_field_orders SET status = 'cancelled', cancelled_at = NOW(), updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = ${String(current.status)} RETURNING *
      `);
      if (!changed[0]) throw Object.assign(new Error('Field Service order berubah saat cancellation'), { status: 409, code: 'FIELD_ORDER_CONCURRENT_UPDATE' });
      if (current.planning_allocation_id) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.service_planning_allocations SET status = 'cancelled', updated_by = ${userId}, updated_at = NOW()
          WHERE id = ${Number(current.planning_allocation_id)} AND tenant_id = ${tenantId} AND status IN ('planned','confirmed')
        `);
      }
      await insertFieldEvent(tx, tenantId, id, 'cancelled', userId, current.assigned_employee_id ? Number(current.assigned_employee_id) : null, reason);
      return changed[0];
    });
    res.json({ success: true, data: cancelled });
  } catch (error) { next(error); }
};

const technicianTransition = async (req: Request, targetStatus: 'en_route' | 'on_site' | 'completed', eventType: 'departed' | 'arrived' | 'completed') => {
  const tenantId = requireTenant(req);
  const userId = requireUser(req);
  const id = positiveInt(req.params.id, 'INVALID_FIELD_ORDER_ID');
  const employee = await getSelfEmployee(tenantId, userId);
  const { latitude, longitude } = coordinates(req.body);
  const resolution = targetStatus === 'completed' ? cleanText(req.body.resolution) : null;
  if (targetStatus === 'completed' && !resolution) throw Object.assign(new Error('Resolution note wajib diisi saat completion'), { status: 400, code: 'FIELD_RESOLUTION_REQUIRED' });

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, 74001)`);
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.service_field_orders WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE`);
    const current = rows[0];
    if (!current) throw Object.assign(new Error('Field Service order tidak ditemukan'), { status: 404, code: 'FIELD_ORDER_NOT_FOUND' });
    if (Number(current.assigned_employee_id || 0) !== employee.id) throw Object.assign(new Error('Field Service order bukan assignment employee ini'), { status: 403, code: 'FIELD_ASSIGNMENT_MISMATCH' });
    const allowed = targetStatus === 'en_route' ? current.status === 'scheduled' : targetStatus === 'on_site' ? ['scheduled', 'en_route'].includes(current.status) : current.status === 'on_site';
    if (!allowed) throw Object.assign(new Error(`Transition Field Service ${current.status} -> ${targetStatus} tidak diizinkan`), { status: 409, code: 'INVALID_FIELD_ORDER_TRANSITION' });
    const changed = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.service_field_orders
      SET status = ${targetStatus},
          dispatched_at = CASE WHEN ${targetStatus} = 'en_route' THEN COALESCE(dispatched_at, NOW()) ELSE dispatched_at END,
          arrived_at = CASE WHEN ${targetStatus} = 'on_site' THEN COALESCE(arrived_at, NOW()) ELSE arrived_at END,
          completed_at = CASE WHEN ${targetStatus} = 'completed' THEN NOW() ELSE completed_at END,
          resolution_note = CASE WHEN ${targetStatus} = 'completed' THEN ${resolution} ELSE resolution_note END,
          updated_by = ${userId}, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId} AND status = ${String(current.status)}
      RETURNING *
    `);
    if (!changed[0]) throw Object.assign(new Error('Field Service order berubah saat transition'), { status: 409, code: 'FIELD_ORDER_CONCURRENT_UPDATE' });
    if (targetStatus === 'completed' && current.planning_allocation_id) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.service_planning_allocations SET status = 'done', updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${Number(current.planning_allocation_id)} AND tenant_id = ${tenantId} AND status IN ('planned','confirmed')
      `);
    }
    await insertFieldEvent(tx, tenantId, id, eventType, userId, employee.id, cleanText(req.body.notes) || resolution, latitude, longitude);
    return changed[0];
  });
};

export const departMyFieldServiceOrder = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await technicianTransition(req, 'en_route', 'departed') }); } catch (error) { next(error); }
};

export const arriveMyFieldServiceOrder = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await technicianTransition(req, 'on_site', 'arrived') }); } catch (error) { next(error); }
};

export const completeMyFieldServiceOrder = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await technicianTransition(req, 'completed', 'completed') }); } catch (error) { next(error); }
};
