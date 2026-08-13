import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import prisma from '../../../utils/prisma';

export const getEcommerceOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = Number(req.tenantId);
    if (!tenantId) return res.status(400).json({ success: false, error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' } });
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT o.*,s.name AS site_name,ou.name AS outlet_name
      FROM public.ecommerce_orders o
      JOIN public.website_sites s ON s.id=o.site_id AND s.tenant_id=o.tenant_id
      JOIN public.outlets ou ON ou.id=o.outlet_id AND ou.tenant_id=o.tenant_id
      WHERE o.tenant_id=${tenantId}
      ORDER BY o.created_at DESC LIMIT 200
    `);
    return res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { return next(error); }
};
