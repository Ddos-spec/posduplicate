import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import {
  getCustomerSubscriptions,
  getSubscriptionAutomation,
  getSubscriptionMetrics,
  getSubscriptionPlans,
  patchCustomerSubscriptionStatus,
  patchSubscriptionPlanStatus,
  postCustomerSubscription,
  postSubscriptionAutomationRun,
  postSubscriptionPlan,
  postSubscriptionRenewal,
  putSubscriptionAutomation,
} from '../controllers/subscription.p3.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/summary', requireCapability('revenue.subscription.read'), getSubscriptionMetrics);
router.get('/automation', requireCapability('revenue.subscription.read'), getSubscriptionAutomation);
router.put('/automation', requireCapability('revenue.subscription.manage'), putSubscriptionAutomation);
router.post('/automation/run', requireCapability('revenue.subscription.manage'), postSubscriptionAutomationRun);
router.get('/plans', requireCapability('revenue.subscription.read'), getSubscriptionPlans);
router.post('/plans', requireCapability('revenue.subscription.manage'), postSubscriptionPlan);
router.patch('/plans/:id/status', requireCapability('revenue.subscription.manage'), patchSubscriptionPlanStatus);
router.get('/', requireCapability('revenue.subscription.read'), getCustomerSubscriptions);
router.post('/', requireCapability('revenue.subscription.manage'), postCustomerSubscription);
router.patch('/:id/status', requireCapability('revenue.subscription.manage'), patchCustomerSubscriptionStatus);
router.post('/:id/renew', requireCapability('revenue.subscription.manage'), postSubscriptionRenewal);

export default router;
