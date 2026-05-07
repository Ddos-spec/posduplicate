import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import {
  getAdsConnectUrl,
  getConnectUrl,
  listZernioAccounts,
  disconnectZernioAccount,
  getZernioAdsSummary,
} from '../services/zernio.service';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// GET /api/medsos/zernio/connect-url?platform=facebook
router.get('/connect-url', async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const platform = typeof req.query.platform === 'string' ? req.query.platform : 'facebook';
    const returnPath = typeof req.query.returnPath === 'string' ? req.query.returnPath : '/medsos/connections';
    const frontendBase = (process.env.FRONTEND_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')[0].trim().replace(/\/$/, '');
    const redirectUrl = `${frontendBase}${returnPath}?zernio_connected=${platform}`;

    const authUrl = await getConnectUrl(tenantId, platform, redirectUrl);
    return res.json({ success: true, data: { authUrl } });
  } catch (err) {
    next(err);
  }
});

// GET /api/medsos/zernio/ads/connect-url?platform=facebook
router.get('/ads/connect-url', async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const platform = typeof req.query.platform === 'string' ? req.query.platform : 'facebook';
    const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
    const returnPath = typeof req.query.returnPath === 'string' ? req.query.returnPath : '/medsos/ads';
    const frontendBase = (process.env.FRONTEND_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')[0].trim().replace(/\/$/, '');
    const redirectUrl = `${frontendBase}${returnPath}?zernio_ads_connected=${platform}`;

    const authUrl = await getAdsConnectUrl(tenantId, platform, redirectUrl, accountId);
    return res.json({ success: true, data: { authUrl } });
  } catch (err) {
    next(err);
  }
});

// GET /api/medsos/zernio/accounts
router.get('/accounts', async (req, res, next) => {
  try {
    const accounts = await listZernioAccounts(req.tenantId!);
    return res.json({ success: true, data: { accounts } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/medsos/zernio/accounts/:accountId
router.delete('/accounts/:accountId', async (req, res, next) => {
  try {
    await disconnectZernioAccount(req.params.accountId);
    return res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

// GET /api/medsos/zernio/ads/summary
router.get('/ads/summary', async (req, res, next) => {
  try {
    const summary = await getZernioAdsSummary(req.tenantId!);
    return res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

export default router;
