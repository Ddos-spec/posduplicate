import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const requireTenant = (req: Request) => {
  if (!req.tenantId) throw Object.assign(new Error('Tenant context is required'), { status: 400, code: 'TENANT_REQUIRED' });
  return req.tenantId;
};

const activeEmployees = (tenantId: number) => prisma.employees.findMany({
  where: { tenant_id: tenantId, status: 'active' },
  select: { id: true, employee_id: true, name: true, department: true, position: true, user_id: true },
  orderBy: [{ name: 'asc' }],
});

const tenantCustomers = (tenantId: number) => prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT c.id, c.name, c.phone, c.email, c.address, c.outlet_id, o.name AS outlet_name
  FROM public.customers c
  JOIN public.outlets o ON o.id = c.outlet_id AND o.tenant_id = ${tenantId}
  ORDER BY c.name ASC, c.id ASC
`);

const tenantOutlets = (tenantId: number) => prisma.outlets.findMany({
  where: { tenant_id: tenantId },
  select: { id: true, name: true },
  orderBy: { name: 'asc' },
});

const activeProjects = (tenantId: number) => prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT id, code, name, status
  FROM public.service_projects
  WHERE tenant_id = ${tenantId} AND status NOT IN ('completed','cancelled')
  ORDER BY code ASC
`);

const activeTasks = (tenantId: number) => prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT t.id, t.project_id, t.title, t.status, p.code AS project_code, p.name AS project_name
  FROM public.service_project_tasks t
  JOIN public.service_projects p ON p.id = t.project_id AND p.tenant_id = t.tenant_id
  WHERE t.tenant_id = ${tenantId}
    AND p.status NOT IN ('completed','cancelled')
    AND t.status NOT IN ('done','cancelled')
  ORDER BY p.code ASC, t.created_at DESC
`);

export const getFieldServiceContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const [employees, customers, outlets, projects, tasks] = await Promise.all([
      activeEmployees(tenantId), tenantCustomers(tenantId), tenantOutlets(tenantId), activeProjects(tenantId), activeTasks(tenantId),
    ]);
    res.json({ success: true, data: { employees, customers, outlets, projects, tasks } });
  } catch (error) { next(error); }
};

export const getHelpdeskContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const [employees, customers, outlets, projects, fieldOrders] = await Promise.all([
      activeEmployees(tenantId), tenantCustomers(tenantId), tenantOutlets(tenantId), activeProjects(tenantId),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id, code, title, customer_id, project_id, status
        FROM public.service_field_orders
        WHERE tenant_id = ${tenantId} AND status NOT IN ('completed','cancelled')
        ORDER BY created_at DESC
      `),
    ]);
    res.json({ success: true, data: { employees, customers, outlets, projects, fieldOrders } });
  } catch (error) { next(error); }
};

export const getAppointmentContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const [employees, customers, outlets] = await Promise.all([
      activeEmployees(tenantId), tenantCustomers(tenantId), tenantOutlets(tenantId),
    ]);
    res.json({ success: true, data: { employees, customers, outlets } });
  } catch (error) { next(error); }
};
