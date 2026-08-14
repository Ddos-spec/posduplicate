import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import {
  getMarketingEventRegistrations,
  getMarketingEvents,
  getMarketingJourneyById,
  getMarketingJourneys,
  getMarketingSurveyById,
  getMarketingSurveyResponses,
  getMarketingSurveys,
  patchMarketingEventRegistrationStatus,
  patchMarketingEventStatus,
  patchMarketingJourneyStatus,
  patchMarketingSurveyStatus,
  postMarketingEvent,
  postMarketingEventRegistration,
  postMarketingJourney,
  postMarketingSurvey,
  postMarketingSurveyResponse,
} from '../controllers/marketingEngagement.p3.controller';

const router = Router();
router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/journeys', requireCapability('digital.marketing.read'), getMarketingJourneys);
router.get('/journeys/:id', requireCapability('digital.marketing.read'), getMarketingJourneyById);
router.post('/journeys', requireCapability('digital.marketing.manage'), postMarketingJourney);
router.patch('/journeys/:id/status', requireCapability('digital.marketing.manage'), patchMarketingJourneyStatus);

router.get('/events', requireCapability('digital.marketing.read'), getMarketingEvents);
router.post('/events', requireCapability('digital.marketing.manage'), postMarketingEvent);
router.patch('/events/:id/status', requireCapability('digital.marketing.manage'), patchMarketingEventStatus);
router.get('/events/:id/registrations', requireCapability('digital.marketing.read'), getMarketingEventRegistrations);
router.post('/events/:id/registrations', requireCapability('digital.marketing.manage'), postMarketingEventRegistration);
router.patch('/registrations/:registrationId/status', requireCapability('digital.marketing.manage'), patchMarketingEventRegistrationStatus);

router.get('/surveys', requireCapability('digital.marketing.read'), getMarketingSurveys);
router.get('/surveys/:id', requireCapability('digital.marketing.read'), getMarketingSurveyById);
router.post('/surveys', requireCapability('digital.marketing.manage'), postMarketingSurvey);
router.patch('/surveys/:id/status', requireCapability('digital.marketing.manage'), patchMarketingSurveyStatus);
router.post('/surveys/:id/responses', requireCapability('digital.marketing.manage'), postMarketingSurveyResponse);
router.get('/surveys/:id/responses', requireCapability('digital.marketing.read'), getMarketingSurveyResponses);

export default router;
