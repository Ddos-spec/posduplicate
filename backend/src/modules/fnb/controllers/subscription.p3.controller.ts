import { NextFunction, Request, Response } from 'express';
import {
  createCustomerSubscription, createSubscriptionPlan, listCustomerSubscriptions, listSubscriptionPlans,
  materializeSubscriptionRenewal, updateCustomerSubscriptionStatus, updateSubscriptionPlanStatus,
} from '../services/subscription.p3.service';

const context = (req: Request) => {
  const tenantId = Number(req.tenantId);
  const userId = Number(req.userId);
  if (!Number.isInteger(tenantId) || tenantId <= 0) throw Object.assign(new Error('Tenant context required'), { status: 401, code: 'TENANT_REQUIRED' });
  if (!Number.isInteger(userId) || userId <= 0) throw Object.assign(new Error('User context required'), { status: 401, code: 'USER_REQUIRED' });
  return { tenantId, userId };
};

export const getSubscriptionPlans = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listSubscriptionPlans(tenantId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const postSubscriptionPlan = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await createSubscriptionPlan(tenantId, userId, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const patchSubscriptionPlanStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await updateSubscriptionPlanStatus(tenantId, userId, req.params.id, req.body.status); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const getCustomerSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listCustomerSubscriptions(tenantId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const postCustomerSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await createCustomerSubscription(tenantId, userId, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const patchCustomerSubscriptionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await updateCustomerSubscriptionStatus(tenantId, userId, req.params.id, req.body.status); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const postSubscriptionRenewal = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await materializeSubscriptionRenewal(tenantId, userId, req.params.id); return res.status(data.reused ? 200 : 201).json({ success: true, data }); } catch (error) { return next(error); }
};
