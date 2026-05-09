import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { superAdminOnly } from '../../../middlewares/tenant.middleware';
import {
  ensureMyCommerSocialZernioProfile,
  getMyCommerSocialTenantDetail,
  saveMyCommerSocialConnectorInternalConfig,
  listMyCommerSocialTenants,
  syncMyCommerSocialConnector,
  updateMyCommerSocialTenantConfig,
} from '../controllers/myCommerSocialAdmin.controller';

const router = Router();

router.use(authMiddleware, superAdminOnly);

router.get('/tenants', listMyCommerSocialTenants);
router.get('/tenants/:tenantId', getMyCommerSocialTenantDetail);
router.patch('/tenants/:tenantId/config', updateMyCommerSocialTenantConfig);
router.post('/tenants/:tenantId/ensure-profile', ensureMyCommerSocialZernioProfile);
router.post('/tenants/:tenantId/connectors/:slug/sync', syncMyCommerSocialConnector);
router.patch('/tenants/:tenantId/connectors/:slug/internal', saveMyCommerSocialConnectorInternalConfig);

export default router;
