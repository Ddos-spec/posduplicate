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

export const getMyServiceTimesheetContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const userId = requireUser(req);
    const employee = await prisma.employees.findFirst({
      where: { tenant_id: tenantId, user_id: userId, status: 'active' },
      select: { id: true, employee_id: true, name: true, department: true, position: true, user_id: true },
    });
    if (!employee) {
      return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_PROFILE_REQUIRED', message: 'User belum terhubung ke employee aktif' } });
    }

    const projects = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, code, name, status
      FROM public.service_projects
      WHERE tenant_id = ${tenantId}
        AND status IN ('open','on_hold')
      ORDER BY code ASC
    `);

    const tasks = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT t.id, t.project_id, t.title, t.status, p.code AS project_code, p.name AS project_name
      FROM public.service_project_tasks t
      JOIN public.service_projects p ON p.id = t.project_id AND p.tenant_id = t.tenant_id
      WHERE t.tenant_id = ${tenantId}
        AND p.status IN ('open','on_hold')
        AND t.status <> 'cancelled'
      ORDER BY p.code ASC, t.created_at DESC
    `);

    res.json({ success: true, data: { employee, projects, tasks } });
  } catch (error) {
    next(error);
  }
};
