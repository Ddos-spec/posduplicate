import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import {
  beginConnect,
  callback,
  completeConnect,
  disconnect,
  getIntegrationDetail,
  getIntegrationHub,
  proxyMarketplaceStatus,
  proxyStatus,
  proxyStats,
  syncNow,
  webhook,
} from '../controllers/integrationHub.controller';

const router = Router();

router.get('/callback/:slug', callback);
router.post('/webhook/:slug', webhook);

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/hub', getIntegrationHub);
router.get('/proxy/social-hub/status', proxyStatus);
router.get('/proxy/social-hub/stats', proxyStats);
router.get('/proxy/marketplace-hub/status', proxyMarketplaceStatus);
router.get('/:slug', getIntegrationDetail);
router.post('/:slug/connect', beginConnect);
router.post('/:slug/complete', completeConnect);
router.post('/:slug/sync', syncNow);
router.post('/:slug/disconnect', disconnect);

export default router;
