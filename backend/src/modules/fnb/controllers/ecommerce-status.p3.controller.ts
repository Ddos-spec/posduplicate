import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import prisma from '../../../utils/prisma';
import { cleanOrderText, hashOrderToken } from '../services/ecommerce-order.p3.service';

export const getPublicStorefrontOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = cleanOrderText(req.header('x-order-token'), 200);
    if (!token) return res.status(401).json({ success: false, error: { code: 'ORDER_TOKEN_REQUIRED', message: 'Order token required' } });
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT o.order_number,o.status,o.total,o.created_at,o.confirmed_at,o.ready_at,o.completed_at,o.cancelled_at
      FROM public.ecommerce_orders o
      JOIN public.website_sites s ON s.id=o.site_id AND s.tenant_id=o.tenant_id
      WHERE lower(s.public_slug)=lower(${cleanOrderText(req.params.publicSlug,120)})
        AND o.order_number=${cleanOrderText(req.params.orderNumber,80)}
        AND o.public_token_hash=${hashOrderToken(token)}
      LIMIT 1
    `);
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return next(error);
  }
};
