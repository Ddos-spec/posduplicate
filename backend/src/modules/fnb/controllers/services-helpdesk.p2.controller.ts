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
  if (!employee) throw Object.assign(new Error('Employee aktif tidak ditemukan pada tenant ini'), { status: 404, code: 'HELPDESK_EMPLOYEE_NOT_FOUND' });
  return employee;
};

const getTenantCustomer = async (tenantId: number, customerId: number) => {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT c.id, c.name, c.email, c.phone, c.outlet_id
    FROM public.customers c
    JOIN public.outlets o ON o.id = c.outlet_id
    WHERE c.id = ${customerId} AND o.tenant_id = ${tenantId}
    LIMIT 1
  `);
  if (!rows[0]) throw Object.assign(new Error('Customer tidak ditemukan pada tenant ini'), { status: 404, code: 'HELPDESK_CUSTOMER_NOT_FOUND' });
  return rows[0];
};

const assertTenantOutlet = async (tenantId: number, outletId: number) => {
  const outlet = await prisma.outlets.findFirst({ where: { id: outletId, tenant_id: tenantId }, select: { id: true } });
  if (!outlet) throw Object.assign(new Error('Outlet bukan milik tenant ini'), { status: 403, code: 'OUTLET_ACCESS_DENIED' });
};

const assertProject = async (client: any, tenantId: number, projectId: number | null) => {
  if (!projectId) return;
  const rows = await client.$queryRaw(Prisma.sql`
    SELECT id, status FROM public.service_projects WHERE id = ${projectId} AND tenant_id = ${tenantId} LIMIT 1
  `) as any[];
  if (!rows[0]) throw Object.assign(new Error('Project tidak ditemukan'), { status: 404, code: 'SERVICE_PROJECT_NOT_FOUND' });
};

const assertFieldOrder = async (client: any, tenantId: number, fieldOrderId: number | null, customerId: number | null) => {
  if (!fieldOrderId) return;
  const rows = await client.$queryRaw(Prisma.sql`
    SELECT id, customer_id, project_id FROM public.service_field_orders
    WHERE id = ${fieldOrderId} AND tenant_id = ${tenantId}
    LIMIT 1
  `) as any[];
  const field = rows[0];
  if (!field) throw Object.assign(new Error('Field Service order tidak ditemukan'), { status: 404, code: 'FIELD_ORDER_NOT_FOUND' });
  if (customerId && Number(field.customer_id) !== customerId) {
    throw Object.assign(new Error('Field Service order tidak terkait customer ticket ini'), { status: 409, code: 'HELPDESK_FIELD_CUSTOMER_MISMATCH' });
  }
};

const getSlaPolicy = async (client: any, tenantId: number, slaPolicyId: number | null, priority: string) => {
  const rows = slaPolicyId
    ? await client.$queryRaw(Prisma.sql`
        SELECT * FROM public.service_helpdesk_sla_policies
        WHERE id = ${slaPolicyId} AND tenant_id = ${tenantId} AND is_active = TRUE
        LIMIT 1
      `) as any[]
    : await client.$queryRaw(Prisma.sql`
        SELECT * FROM public.service_helpdesk_sla_policies
        WHERE tenant_id = ${tenantId} AND is_active = TRUE
          AND (priority = ${priority} OR priority IS NULL)
        ORDER BY CASE WHEN priority = ${priority} THEN 0 ELSE 1 END, id ASC
        LIMIT 1
      `) as any[];
  if (slaPolicyId && !rows[0]) throw Object.assign(new Error('SLA policy aktif tidak ditemukan pada tenant ini'), { status: 404, code: 'HELPDESK_SLA_NOT_FOUND' });
  return rows[0] || null;
};

const insertHelpdeskEvent = async (
  client: any,
  tenantId: number,
  ticketId: number,
  eventType: string,
  actorUserId: number | null,
  employeeId: number | null,
  payload: Record<string, unknown> = {},
) => {
  await client.$executeRaw(Prisma.sql`
    INSERT INTO public.service_helpdesk_events
      (tenant_id, ticket_id, event_type, actor_user_id, employee_id, payload)
    VALUES
      (${tenantId}, ${ticketId}, ${eventType}, ${actorUserId}, ${employeeId}, CAST(${JSON.stringify(payload)} AS jsonb))
  `);
};

const TICKET_TRANSITIONS: Record<string, string[]> = {
  new: ['open', 'cancelled'],
  open: ['pending', 'customer_wait', 'resolved', 'cancelled'],
  pending: ['open', 'customer_wait', 'resolved', 'cancelled'],
  customer_wait: ['open', 'pending', 'resolved', 'cancelled'],
  resolved: ['open', 'closed'],
  closed: [],
  cancelled: [],
};

const AGENT_TRANSITIONS: Record<string, string[]> = {
  open: ['pending', 'customer_wait', 'resolved'],
  pending: ['open', 'customer_wait', 'resolved'],
  customer_wait: ['open', 'pending', 'resolved'],
};

const updateTicketStatusLocked = async (
  tx: any,
  tenantId: number,
  userId: number,
  ticket: any,
  target: string,
  resolutionNote: string | null,
  employeeId: number | null,
) => {
  if (!(TICKET_TRANSITIONS[String(ticket.status)] || []).includes(target)) {
    throw Object.assign(new Error(`Transition Helpdesk ${ticket.status} -> ${target} tidak diizinkan`), { status: 409, code: 'INVALID_HELPDESK_TRANSITION' });
  }
  if (target === 'resolved' && !resolutionNote) {
    throw Object.assign(new Error('Resolution note wajib saat menyelesaikan ticket'), { status: 400, code: 'HELPDESK_RESOLUTION_REQUIRED' });
  }
  if (target === 'cancelled' && !resolutionNote) {
    throw Object.assign(new Error('Alasan cancellation wajib diisi'), { status: 400, code: 'HELPDESK_CANCELLATION_REASON_REQUIRED' });
  }
  const rows = await tx.$queryRaw(Prisma.sql`
    UPDATE public.service_helpdesk_tickets
    SET status = ${target},
        resolution_note = CASE
          WHEN ${target} IN ('resolved','cancelled') THEN ${resolutionNote}
          WHEN ${String(ticket.status)} = 'resolved' AND ${target} = 'open' THEN NULL
          ELSE resolution_note END,
        resolved_at = CASE
          WHEN ${target} = 'resolved' THEN NOW()
          WHEN ${String(ticket.status)} = 'resolved' AND ${target} = 'open' THEN NULL
          ELSE resolved_at END,
        closed_at = CASE WHEN ${target} = 'closed' THEN NOW() ELSE closed_at END,
        cancelled_at = CASE WHEN ${target} = 'cancelled' THEN NOW() ELSE cancelled_at END,
        updated_by = ${userId}, updated_at = NOW()
    WHERE id = ${Number(ticket.id)} AND tenant_id = ${tenantId} AND status = ${String(ticket.status)}
    RETURNING *
  `) as any[];
  if (!rows[0]) throw Object.assign(new Error('Ticket berubah saat update status'), { status: 409, code: 'HELPDESK_CONCURRENT_UPDATE' });
  await insertHelpdeskEvent(tx, tenantId, Number(ticket.id), `status_${target}`, userId, employeeId, { from: ticket.status, to: target, note: resolutionNote });
  return rows[0];
};

export const getHelpdeskSlaPolicies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.service_helpdesk_sla_policies
      WHERE tenant_id = ${tenantId}
      ORDER BY is_active DESC, priority NULLS LAST, name ASC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const createHelpdeskSlaPolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const name = cleanText(req.body.name, 160);
    const priority = req.body.priority === undefined || req.body.priority === null || req.body.priority === '' ? null : String(req.body.priority).trim();
    const firstResponseMinutes = positiveInt(req.body.firstResponseMinutes, 'INVALID_HELPDESK_FIRST_RESPONSE_MINUTES');
    const resolutionMinutes = positiveInt(req.body.resolutionMinutes, 'INVALID_HELPDESK_RESOLUTION_MINUTES');
    if (!name) return res.status(400).json({ success: false, error: { code: 'HELPDESK_SLA_NAME_REQUIRED', message: 'Nama SLA wajib diisi' } });
    if (priority && !['low', 'normal', 'high', 'urgent'].includes(priority)) return res.status(400).json({ success: false, error: { code: 'INVALID_HELPDESK_PRIORITY', message: 'Priority SLA tidak valid' } });
    try {
      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.service_helpdesk_sla_policies
          (tenant_id, name, priority, first_response_minutes, resolution_minutes, is_active, created_by, updated_by)
        VALUES
          (${tenantId}, ${name}, ${priority}, ${firstResponseMinutes}, ${resolutionMinutes}, TRUE, ${userId}, ${userId})
        RETURNING *
      `);
      res.status(201).json({ success: true, data: rows[0] });
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ success: false, error: { code: 'HELPDESK_SLA_NAME_EXISTS', message: 'Nama SLA sudah digunakan tenant ini' } });
      throw error;
    }
  } catch (error) { next(error); }
};

export const getHelpdeskTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const status = req.query.status ? String(req.query.status) : null;
    const employeeId = req.query.employeeId ? positiveInt(req.query.employeeId, 'INVALID_EMPLOYEE_ID') : null;
    const customerId = req.query.customerId ? positiveInt(req.query.customerId, 'INVALID_CUSTOMER_ID') : null;
    const overdue = String(req.query.overdue || '') === 'true';
    const limit = parseLimit(req.query.limit);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT t.*, c.name AS customer_name, o.name AS outlet_name,
             e.employee_id AS employee_code, e.name AS employee_name,
             p.code AS project_code, p.name AS project_name,
             f.code AS field_order_code, s.name AS sla_name,
             (t.first_responded_at IS NULL AND t.first_response_due_at IS NOT NULL AND NOW() > t.first_response_due_at
                AND t.status NOT IN ('resolved','closed','cancelled')) AS first_response_breached,
             (t.resolved_at IS NULL AND t.resolution_due_at IS NOT NULL AND NOW() > t.resolution_due_at
                AND t.status NOT IN ('closed','cancelled')) AS resolution_breached,
             (SELECT COUNT(*)::int FROM public.service_helpdesk_messages m WHERE m.tenant_id = t.tenant_id AND m.ticket_id = t.id) AS message_count
      FROM public.service_helpdesk_tickets t
      LEFT JOIN public.customers c ON c.id = t.customer_id
      LEFT JOIN public.outlets o ON o.id = t.outlet_id AND o.tenant_id = t.tenant_id
      LEFT JOIN accounting.employees e ON e.id = t.assigned_employee_id AND e.tenant_id = t.tenant_id
      LEFT JOIN public.service_projects p ON p.id = t.project_id AND p.tenant_id = t.tenant_id
      LEFT JOIN public.service_field_orders f ON f.id = t.field_order_id AND f.tenant_id = t.tenant_id
      LEFT JOIN public.service_helpdesk_sla_policies s ON s.id = t.sla_policy_id AND s.tenant_id = t.tenant_id
      WHERE t.tenant_id = ${tenantId}
        ${status ? Prisma.sql`AND t.status = ${status}` : Prisma.empty}
        ${employeeId ? Prisma.sql`AND t.assigned_employee_id = ${employeeId}` : Prisma.empty}
        ${customerId ? Prisma.sql`AND t.customer_id = ${customerId}` : Prisma.empty}
        ${overdue ? Prisma.sql`AND ((t.first_responded_at IS NULL AND t.first_response_due_at IS NOT NULL AND NOW() > t.first_response_due_at) OR (t.resolved_at IS NULL AND t.resolution_due_at IS NOT NULL AND NOW() > t.resolution_due_at)) AND t.status NOT IN ('closed','cancelled')` : Prisma.empty}
      ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
               COALESCE(t.resolution_due_at, t.created_at) ASC, t.id ASC
      LIMIT ${limit}
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const getMyHelpdeskTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employee = await getSelfEmployee(tenantId, userId);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT t.*, c.name AS customer_name, c.phone AS customer_phone,
             (t.first_responded_at IS NULL AND t.first_response_due_at IS NOT NULL AND NOW() > t.first_response_due_at
                AND t.status NOT IN ('resolved','closed','cancelled')) AS first_response_breached,
             (t.resolved_at IS NULL AND t.resolution_due_at IS NOT NULL AND NOW() > t.resolution_due_at
                AND t.status NOT IN ('closed','cancelled')) AS resolution_breached
      FROM public.service_helpdesk_tickets t
      LEFT JOIN public.customers c ON c.id = t.customer_id
      WHERE t.tenant_id = ${tenantId} AND t.assigned_employee_id = ${employee.id}
      ORDER BY CASE WHEN t.status IN ('open','pending','customer_wait') THEN 0 ELSE 1 END,
               CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
               COALESCE(t.resolution_due_at, t.created_at) ASC
    `);
    res.json({ success: true, data: { employee, tickets: rows } });
  } catch (error) { next(error); }
};

export const createHelpdeskTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const code = cleanText(req.body.code, 60)?.toUpperCase();
    const subject = cleanText(req.body.subject, 220);
    const priority = String(req.body.priority || 'normal').trim();
    const channel = String(req.body.channel || 'internal').trim();
    if (!code || !subject) return res.status(400).json({ success: false, error: { code: 'HELPDESK_TICKET_FIELDS_REQUIRED', message: 'Code dan subject ticket wajib diisi' } });
    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) return res.status(400).json({ success: false, error: { code: 'INVALID_HELPDESK_PRIORITY', message: 'Priority ticket tidak valid' } });
    if (!['internal', 'web', 'email', 'whatsapp', 'phone', 'social'].includes(channel)) return res.status(400).json({ success: false, error: { code: 'INVALID_HELPDESK_CHANNEL', message: 'Channel ticket tidak valid' } });

    const customerId = optionalPositiveInt(req.body.customerId, 'INVALID_CUSTOMER_ID');
    const customer = customerId ? await getTenantCustomer(tenantId, customerId) : null;
    const outletId = optionalPositiveInt(req.body.outletId, 'INVALID_OUTLET_ID') ?? (customer?.outlet_id ? Number(customer.outlet_id) : null);
    if (outletId) await assertTenantOutlet(tenantId, outletId);
    const projectId = optionalPositiveInt(req.body.projectId, 'INVALID_PROJECT_ID');
    const fieldOrderId = optionalPositiveInt(req.body.fieldOrderId, 'INVALID_FIELD_ORDER_ID');
    const slaPolicyId = optionalPositiveInt(req.body.slaPolicyId, 'INVALID_HELPDESK_SLA_ID');
    await assertProject(prisma, tenantId, projectId);
    await assertFieldOrder(prisma, tenantId, fieldOrderId, customerId);

    const requesterName = cleanText(req.body.requesterName, 160) || cleanText(customer?.name, 160);
    const requesterEmail = cleanText(req.body.requesterEmail, 255) || cleanText(customer?.email, 255);
    const requesterPhone = cleanText(req.body.requesterPhone, 60) || cleanText(customer?.phone, 60);
    if (!customerId && (!requesterName || (!requesterEmail && !requesterPhone))) {
      return res.status(400).json({ success: false, error: { code: 'HELPDESK_REQUESTER_REQUIRED', message: 'Ticket tanpa customer membutuhkan nama requester dan email atau telepon' } });
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        const sla = await getSlaPolicy(tx, tenantId, slaPolicyId, priority);
        const rows = await tx.$queryRaw(Prisma.sql`
          INSERT INTO public.service_helpdesk_tickets
            (tenant_id, outlet_id, customer_id, project_id, field_order_id, sla_policy_id,
             code, subject, description, requester_name, requester_email, requester_phone,
             channel, priority, status, first_response_due_at, resolution_due_at, created_by, updated_by)
          VALUES
            (${tenantId}, ${outletId}, ${customerId}, ${projectId}, ${fieldOrderId}, ${sla ? Number(sla.id) : null},
             ${code}, ${subject}, ${cleanText(req.body.description)}, ${requesterName}, ${requesterEmail}, ${requesterPhone},
             ${channel}, ${priority}, 'new',
             ${sla ? new Date(Date.now() + Number(sla.first_response_minutes) * 60000) : null},
             ${sla ? new Date(Date.now() + Number(sla.resolution_minutes) * 60000) : null},
             ${userId}, ${userId})
          RETURNING *
        `) as any[];
        const ticket = rows[0];
        await insertHelpdeskEvent(tx, tenantId, Number(ticket.id), 'created', userId, null, { channel, priority, slaPolicyId: sla ? Number(sla.id) : null });
        const initialMessage = cleanText(req.body.initialMessage, 10000);
        if (initialMessage) {
          await tx.$executeRaw(Prisma.sql`
            INSERT INTO public.service_helpdesk_messages
              (tenant_id, ticket_id, author_user_id, direction, visibility, body)
            VALUES (${tenantId}, ${Number(ticket.id)}, ${userId}, 'inbound', 'public', ${initialMessage})
          `);
        }
        return ticket;
      });
      res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ success: false, error: { code: 'HELPDESK_TICKET_CODE_EXISTS', message: 'Code ticket sudah digunakan tenant ini' } });
      throw error;
    }
  } catch (error) { next(error); }
};

export const assignHelpdeskTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const id = positiveInt(req.params.id, 'INVALID_HELPDESK_TICKET_ID');
    const employeeId = positiveInt(req.body.employeeId, 'INVALID_EMPLOYEE_ID');
    await assertEmployee(tenantId, employeeId);

    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw(Prisma.sql`
        SELECT * FROM public.service_helpdesk_tickets WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE
      `) as any[];
      const current = rows[0];
      if (!current) throw Object.assign(new Error('Ticket tidak ditemukan'), { status: 404, code: 'HELPDESK_TICKET_NOT_FOUND' });
      if (['closed', 'cancelled'].includes(String(current.status))) throw Object.assign(new Error('Ticket terminal tidak dapat diassign'), { status: 409, code: 'HELPDESK_TICKET_TERMINAL' });
      const nextStatus = current.status === 'new' ? 'open' : String(current.status);
      const changed = await tx.$queryRaw(Prisma.sql`
        UPDATE public.service_helpdesk_tickets
        SET assigned_employee_id = ${employeeId}, status = ${nextStatus}, updated_by = ${userId}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId} AND status = ${String(current.status)}
        RETURNING *
      `) as any[];
      if (!changed[0]) throw Object.assign(new Error('Ticket berubah saat assignment'), { status: 409, code: 'HELPDESK_CONCURRENT_UPDATE' });
      await insertHelpdeskEvent(tx, tenantId, id, 'assigned', userId, employeeId, { previousEmployeeId: current.assigned_employee_id, status: nextStatus });
      return changed[0];
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const updateHelpdeskTicketStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const id = positiveInt(req.params.id, 'INVALID_HELPDESK_TICKET_ID');
    const target = String(req.body.status || '').trim();
    const note = cleanText(req.body.note, 5000);
    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw(Prisma.sql`
        SELECT * FROM public.service_helpdesk_tickets WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE
      `) as any[];
      const current = rows[0];
      if (!current) throw Object.assign(new Error('Ticket tidak ditemukan'), { status: 404, code: 'HELPDESK_TICKET_NOT_FOUND' });
      return updateTicketStatusLocked(tx, tenantId, userId, current, target, note, current.assigned_employee_id ? Number(current.assigned_employee_id) : null);
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const updateMyHelpdeskTicketStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employee = await getSelfEmployee(tenantId, userId);
    const id = positiveInt(req.params.id, 'INVALID_HELPDESK_TICKET_ID');
    const target = String(req.body.status || '').trim();
    const note = cleanText(req.body.note, 5000);
    const updated = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw(Prisma.sql`
        SELECT * FROM public.service_helpdesk_tickets WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE
      `) as any[];
      const current = rows[0];
      if (!current) throw Object.assign(new Error('Ticket tidak ditemukan'), { status: 404, code: 'HELPDESK_TICKET_NOT_FOUND' });
      if (Number(current.assigned_employee_id || 0) !== employee.id) throw Object.assign(new Error('Ticket bukan assignment employee login'), { status: 403, code: 'HELPDESK_ASSIGNMENT_MISMATCH' });
      if (!(AGENT_TRANSITIONS[String(current.status)] || []).includes(target)) throw Object.assign(new Error(`Agent tidak dapat transition ${current.status} -> ${target}`), { status: 409, code: 'INVALID_HELPDESK_AGENT_TRANSITION' });
      return updateTicketStatusLocked(tx, tenantId, userId, current, target, note, employee.id);
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

export const getHelpdeskMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const id = positiveInt(req.params.id, 'INVALID_HELPDESK_TICKET_ID');
    const ticket = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT id FROM public.service_helpdesk_tickets WHERE id = ${id} AND tenant_id = ${tenantId} LIMIT 1`);
    if (!ticket[0]) return res.status(404).json({ success: false, error: { code: 'HELPDESK_TICKET_NOT_FOUND', message: 'Ticket tidak ditemukan' } });
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT m.*, u.name AS author_name, e.name AS employee_name
      FROM public.service_helpdesk_messages m
      LEFT JOIN public.users u ON u.id = m.author_user_id AND u.tenant_id = m.tenant_id
      LEFT JOIN accounting.employees e ON e.id = m.author_employee_id AND e.tenant_id = m.tenant_id
      WHERE m.tenant_id = ${tenantId} AND m.ticket_id = ${id}
      ORDER BY m.created_at ASC, m.id ASC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const addHelpdeskMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const id = positiveInt(req.params.id, 'INVALID_HELPDESK_TICKET_ID');
    const body = cleanText(req.body.body, 10000);
    const direction = String(req.body.direction || 'internal').trim();
    const visibility = String(req.body.visibility || (direction === 'internal' ? 'internal' : 'public')).trim();
    if (!body) return res.status(400).json({ success: false, error: { code: 'HELPDESK_MESSAGE_REQUIRED', message: 'Isi message wajib diisi' } });
    if (!['inbound', 'outbound', 'internal'].includes(direction)) return res.status(400).json({ success: false, error: { code: 'INVALID_HELPDESK_MESSAGE_DIRECTION', message: 'Direction message tidak valid' } });
    if (!['public', 'internal'].includes(visibility)) return res.status(400).json({ success: false, error: { code: 'INVALID_HELPDESK_MESSAGE_VISIBILITY', message: 'Visibility message tidak valid' } });

    const created = await prisma.$transaction(async (tx) => {
      const tickets = await tx.$queryRaw(Prisma.sql`
        SELECT * FROM public.service_helpdesk_tickets WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE
      `) as any[];
      const ticket = tickets[0];
      if (!ticket) throw Object.assign(new Error('Ticket tidak ditemukan'), { status: 404, code: 'HELPDESK_TICKET_NOT_FOUND' });
      if (['closed', 'cancelled'].includes(String(ticket.status))) throw Object.assign(new Error('Ticket terminal tidak menerima message baru'), { status: 409, code: 'HELPDESK_TICKET_TERMINAL' });
      const rows = await tx.$queryRaw(Prisma.sql`
        INSERT INTO public.service_helpdesk_messages
          (tenant_id, ticket_id, author_user_id, direction, visibility, body)
        VALUES (${tenantId}, ${id}, ${userId}, ${direction}, ${visibility}, ${body})
        RETURNING *
      `) as any[];
      if (direction === 'outbound' && visibility === 'public' && !ticket.first_responded_at) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.service_helpdesk_tickets SET first_responded_at = NOW(), updated_by = ${userId}, updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId} AND first_responded_at IS NULL
        `);
      }
      await insertHelpdeskEvent(tx, tenantId, id, 'message_added', userId, null, { direction, visibility });
      return rows[0];
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) { next(error); }
};

export const replyMyHelpdeskTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employee = await getSelfEmployee(tenantId, userId);
    const id = positiveInt(req.params.id, 'INVALID_HELPDESK_TICKET_ID');
    const body = cleanText(req.body.body, 10000);
    const visibility = String(req.body.visibility || 'public').trim();
    if (!body) return res.status(400).json({ success: false, error: { code: 'HELPDESK_MESSAGE_REQUIRED', message: 'Isi reply wajib diisi' } });
    if (!['public', 'internal'].includes(visibility)) return res.status(400).json({ success: false, error: { code: 'INVALID_HELPDESK_MESSAGE_VISIBILITY', message: 'Visibility reply tidak valid' } });

    const created = await prisma.$transaction(async (tx) => {
      const tickets = await tx.$queryRaw(Prisma.sql`
        SELECT * FROM public.service_helpdesk_tickets WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE
      `) as any[];
      const ticket = tickets[0];
      if (!ticket) throw Object.assign(new Error('Ticket tidak ditemukan'), { status: 404, code: 'HELPDESK_TICKET_NOT_FOUND' });
      if (Number(ticket.assigned_employee_id || 0) !== employee.id) throw Object.assign(new Error('Ticket bukan assignment employee login'), { status: 403, code: 'HELPDESK_ASSIGNMENT_MISMATCH' });
      if (['resolved', 'closed', 'cancelled'].includes(String(ticket.status))) throw Object.assign(new Error('Ticket terminal/resolved tidak menerima agent reply'), { status: 409, code: 'HELPDESK_TICKET_TERMINAL' });
      const direction = visibility === 'internal' ? 'internal' : 'outbound';
      const rows = await tx.$queryRaw(Prisma.sql`
        INSERT INTO public.service_helpdesk_messages
          (tenant_id, ticket_id, author_user_id, author_employee_id, direction, visibility, body)
        VALUES (${tenantId}, ${id}, ${userId}, ${employee.id}, ${direction}, ${visibility}, ${body})
        RETURNING *
      `) as any[];
      if (visibility === 'public' && !ticket.first_responded_at) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.service_helpdesk_tickets SET first_responded_at = NOW(), updated_by = ${userId}, updated_at = NOW()
          WHERE id = ${id} AND tenant_id = ${tenantId} AND first_responded_at IS NULL
        `);
      }
      await insertHelpdeskEvent(tx, tenantId, id, visibility === 'public' ? 'agent_reply' : 'internal_note', userId, employee.id, { visibility });
      return rows[0];
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) { next(error); }
};

export const getHelpdeskEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const id = positiveInt(req.params.id, 'INVALID_HELPDESK_TICKET_ID');
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT ev.*, u.name AS actor_name, e.name AS employee_name
      FROM public.service_helpdesk_events ev
      LEFT JOIN public.users u ON u.id = ev.actor_user_id AND u.tenant_id = ev.tenant_id
      LEFT JOIN accounting.employees e ON e.id = ev.employee_id AND e.tenant_id = ev.tenant_id
      WHERE ev.tenant_id = ${tenantId} AND ev.ticket_id = ${id}
      ORDER BY ev.occurred_at ASC, ev.id ASC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};
