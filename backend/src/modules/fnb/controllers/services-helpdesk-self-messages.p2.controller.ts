import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const positiveInt = (value: unknown, code: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw Object.assign(new Error(`${code} harus berupa integer positif`), { status: 400, code });
  return parsed;
};

export const getMyHelpdeskMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId) throw Object.assign(new Error('Tenant context is required'), { status: 400, code: 'TENANT_REQUIRED' });
    if (!req.userId) throw Object.assign(new Error('Authenticated user is required'), { status: 401, code: 'USER_REQUIRED' });
    const tenantId = req.tenantId;
    const ticketId = positiveInt(req.params.id, 'INVALID_HELPDESK_TICKET_ID');
    const employee = await prisma.employees.findFirst({
      where: { tenant_id: tenantId, user_id: req.userId, status: 'active' },
      select: { id: true },
    });
    if (!employee) return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_PROFILE_REQUIRED', message: 'User belum terhubung ke employee aktif' } });

    const tickets = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id FROM public.service_helpdesk_tickets
      WHERE id = ${ticketId} AND tenant_id = ${tenantId} AND assigned_employee_id = ${employee.id}
      LIMIT 1
    `);
    if (!tickets[0]) return res.status(403).json({ success: false, error: { code: 'HELPDESK_ASSIGNMENT_MISMATCH', message: 'Ticket bukan assignment employee login' } });

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT m.*, u.name AS author_name, e.name AS employee_name
      FROM public.service_helpdesk_messages m
      LEFT JOIN public.users u ON u.id = m.author_user_id AND u.tenant_id = m.tenant_id
      LEFT JOIN accounting.employees e ON e.id = m.author_employee_id AND e.tenant_id = m.tenant_id
      WHERE m.tenant_id = ${tenantId} AND m.ticket_id = ${ticketId}
      ORDER BY m.created_at ASC, m.id ASC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};
