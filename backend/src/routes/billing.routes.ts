import { Router } from 'express';
import {
  getBillingHistory,
  getSubscriptionPlans,
  recordPayment,
  getBillingStats
} from '../controllers/billing.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { superAdminOnly } from '../middlewares/tenant.middleware';

const router = Router();

// All routes require Super Admin access
router.use(authMiddleware, superAdminOnly);

router.get('/history', getBillingHistory);
router.get('/plans', getSubscriptionPlans);
router.post('/payment', recordPayment);
router.get('/stats', getBillingStats);

export default router;
