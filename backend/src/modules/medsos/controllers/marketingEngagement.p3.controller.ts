import { NextFunction, Request, Response } from 'express';
import {
  createMarketingEvent,
  listEventRegistrations,
  listMarketingEvents,
  registerMarketingEvent,
  transitionEventRegistration,
  transitionMarketingEvent,
} from '../services/marketingEvent.p3.service';
import {
  createMarketingSurvey,
  getMarketingSurvey,
  listMarketingSurveys,
  listSurveyResponses,
  submitMarketingSurvey,
  transitionMarketingSurvey,
} from '../services/marketingSurvey.p3.service';
import {
  createMarketingJourney,
  getMarketingJourney,
  listMarketingJourneys,
  transitionMarketingJourney,
} from '../services/marketingJourney.p3.service';

const context = (req: Request) => {
  const tenantId = Number(req.tenantId);
  const userId = Number(req.userId);
  if (!Number.isInteger(tenantId) || tenantId <= 0) throw Object.assign(new Error('Tenant context required'), { status: 401, code: 'TENANT_REQUIRED' });
  if (!Number.isInteger(userId) || userId <= 0) throw Object.assign(new Error('User context required'), { status: 401, code: 'USER_REQUIRED' });
  return { tenantId, userId };
};

export const getMarketingJourneys = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listMarketingJourneys(tenantId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const getMarketingJourneyById = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await getMarketingJourney(tenantId, req.params.id); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const postMarketingJourney = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await createMarketingJourney(tenantId, userId, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const patchMarketingJourneyStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await transitionMarketingJourney(tenantId, userId, req.params.id, req.body.status); return res.json({ success: true, data }); } catch (error) { return next(error); }
};

export const getMarketingEvents = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listMarketingEvents(tenantId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const postMarketingEvent = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await createMarketingEvent(tenantId, userId, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const patchMarketingEventStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await transitionMarketingEvent(tenantId, userId, req.params.id, req.body.status); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const getMarketingEventRegistrations = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listEventRegistrations(tenantId, req.params.id); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const postMarketingEventRegistration = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await registerMarketingEvent(tenantId, userId, req.params.id, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const patchMarketingEventRegistrationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await transitionEventRegistration(tenantId, userId, req.params.registrationId, req.body.status); return res.json({ success: true, data }); } catch (error) { return next(error); }
};

export const getMarketingSurveys = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listMarketingSurveys(tenantId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const getMarketingSurveyById = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await getMarketingSurvey(tenantId, req.params.id); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const postMarketingSurvey = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await createMarketingSurvey(tenantId, userId, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const patchMarketingSurveyStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await transitionMarketingSurvey(tenantId, userId, req.params.id, req.body.status); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const postMarketingSurveyResponse = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await submitMarketingSurvey(tenantId, userId, req.params.id, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const getMarketingSurveyResponses = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listSurveyResponses(tenantId, req.params.id); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
