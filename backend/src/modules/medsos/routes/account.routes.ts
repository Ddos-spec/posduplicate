import { Router } from 'express';
import {
  getAccounts,
  connectAccount,
  disconnectAccount,
  initOAuth,
  oauthCallback,
  refreshToken
} from '../controllers/account.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// OAuth callback (public - called by platform OAuth)
router.get('/oauth/callback', oauthCallback);

// Protected routes
router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/', getAccounts);
router.post('/connect', connectAccount);
router.post('/oauth/init', initOAuth);
router.post('/:id/refresh', refreshToken);
router.delete('/:id', disconnectAccount);

export default router;
