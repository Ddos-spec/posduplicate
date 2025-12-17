import { Router } from 'express';
import {
  getTenantGrowth,
  getSystemRevenue,
  getTenantStatusDistribution,
  getTopTenants,
  getSystemSummary
} from '../controllers/admin.analytics.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { superAdminOnly } from '../../../middlewares/tenant.middleware';

const router = Router();

// All routes require Super Admin access
router.use(authMiddleware, superAdminOnly);

router.get('/tenant-growth', getTenantGrowth);
router.get('/revenue', getSystemRevenue);
router.get('/tenant-status', getTenantStatusDistribution);
router.get('/top-tenants', getTopTenants);
router.get('/summary', getSystemSummary);

export default router;
