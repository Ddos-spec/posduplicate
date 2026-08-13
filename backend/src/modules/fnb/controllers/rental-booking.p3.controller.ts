import { NextFunction, Request, Response } from 'express';
import { createRentalBooking, listRentalBookings, updateRentalBookingStatus } from '../services/rental-booking.p3.service';
import { holdRentalDeposit, releaseRentalDeposit } from '../services/rental-deposit.p3.service';

const tenantContext = (req: Request) => {
  const tenantId = Number(req.tenantId);
  const userId = Number(req.userId);
  if (!Number.isInteger(tenantId) || tenantId <= 0) throw Object.assign(new Error('Tenant context required'), { status: 401, code: 'TENANT_REQUIRED' });
  if (!Number.isInteger(userId) || userId <= 0) throw Object.assign(new Error('User context required'), { status: 401, code: 'USER_REQUIRED' });
  return { tenantId, userId };
};

export const getRentalBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = tenantContext(req);
    const data = await listRentalBookings(tenantId);
    return res.json({ success: true, data, count: data.length });
  } catch (error) { return next(error); }
};

export const postRentalBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = tenantContext(req);
    const data = await createRentalBooking(tenantId, userId, req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) { return next(error); }
};

export const patchRentalBookingStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = tenantContext(req);
    const data = await updateRentalBookingStatus(tenantId, userId, req.params.id, req.body.status);
    return res.json({ success: true, data });
  } catch (error) { return next(error); }
};

export const postRentalDepositHold = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = tenantContext(req);
    const data = await holdRentalDeposit(tenantId, userId, req.params.id, {
      paymentMethod: req.body.paymentMethod,
      referenceNumber: req.body.referenceNumber ?? null,
    });
    return res.status(data.reused ? 200 : 201).json({ success: true, data });
  } catch (error) { return next(error); }
};

export const postRentalDepositRelease = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = tenantContext(req);
    const data = await releaseRentalDeposit(tenantId, userId, req.params.id);
    return res.status(data.reused ? 200 : 201).json({ success: true, data });
  } catch (error) { return next(error); }
};
