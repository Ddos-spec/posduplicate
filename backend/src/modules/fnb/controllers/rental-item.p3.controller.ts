import { NextFunction, Request, Response } from 'express';
import { getRentalAvailability, listRentalItems, upsertRentalItem } from '../services/rental-availability.p3.service';

const tenantContext = (req: Request) => {
  const tenantId = Number(req.tenantId);
  const userId = Number(req.userId);
  if (!Number.isInteger(tenantId) || tenantId <= 0) throw Object.assign(new Error('Tenant context required'), { status: 401, code: 'TENANT_REQUIRED' });
  if (!Number.isInteger(userId) || userId <= 0) throw Object.assign(new Error('User context required'), { status: 401, code: 'USER_REQUIRED' });
  return { tenantId, userId };
};

export const getRentalItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = tenantContext(req);
    const data = await listRentalItems(tenantId);
    return res.json({ success: true, data, count: data.length });
  } catch (error) { return next(error); }
};

export const putRentalItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = tenantContext(req);
    const data = await upsertRentalItem(tenantId, userId, req.body);
    return res.json({ success: true, data });
  } catch (error) { return next(error); }
};

export const getRentalItemAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = tenantContext(req);
    const data = await getRentalAvailability(tenantId, {
      itemId: Number(req.params.itemId),
      startsAt: String(req.query.startsAt || ''),
      endsAt: String(req.query.endsAt || ''),
    });
    return res.json({ success: true, data });
  } catch (error) { return next(error); }
};
