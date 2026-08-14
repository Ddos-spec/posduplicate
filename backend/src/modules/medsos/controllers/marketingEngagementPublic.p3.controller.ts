import { NextFunction, Request, Response } from 'express';
import {
  getPublicMarketingEvent,
  getPublicMarketingSurvey,
  registerPublicMarketingEvent,
  submitPublicMarketingSurvey,
} from '../services/marketingEngagementPublic.p3.service';

const submissionToken = (req: Request) => req.header('x-engagement-token');

export const getPublicEvent = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await getPublicMarketingEvent(req.params.publicSlug, req.params.eventSlug); return res.json({ success: true, data }); } catch (error) { return next(error); }
};

export const postPublicEventRegistration = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await registerPublicMarketingEvent(req.params.publicSlug, req.params.eventSlug, submissionToken(req), req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};

export const getPublicSurvey = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await getPublicMarketingSurvey(req.params.publicSlug, req.params.surveySlug); return res.json({ success: true, data }); } catch (error) { return next(error); }
};

export const postPublicSurveyResponse = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await submitPublicMarketingSurvey(req.params.publicSlug, req.params.surveySlug, submissionToken(req), req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
