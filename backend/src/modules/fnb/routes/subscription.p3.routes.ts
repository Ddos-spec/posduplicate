import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import {
  getCustomerSubscriptions,
  getSubscriptionPlans,
  patchCustomerSubscriptionStatus,
  patchSubscriptionPlanStatus,
  postCustomerSubscription,
  postSubscriptionPlan,
  postSubscriptionRenewal,
} from '../controllers/subscription.p3.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/plans', requireCapability('revenue.subscription.read'), getSubscriptionPlans);
router.post('/plans', requireCapability('revenue.subscription.manage'), postSubscriptionPlan);
router.patch('/plans/:id/status', requireCapability('revenue.subscription.manage'), patchSubscriptionPlanStatus);
router.get('/', requireCapability('revenue.subscription.read'), getCustomerSubscriptions);
router.post('/', requireCapability('revenue.subscription.manage'), postCustomerSubscription);
router.patch('/:id/status', requireCapability('revenue.subscription.manage'), patchCustomerSubscriptionStatus);
router.post('/:id/renew', requireCapability('revenue.subscription.manage'), postSubscriptionRenewal);

export default router;
