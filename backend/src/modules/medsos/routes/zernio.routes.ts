import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import {
  getAdsConnectUrl,
  getZernioAdAnalytics,
  getConnectUrl,
  listZernioAdsForCampaign,
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

// GET /api/medsos/zernio/ads/by-campaign?campaignId=...&accountId=...&adAccountId=...
router.get('/ads/by-campaign', async (req, res, next) => {
  try {
    const campaignId = typeof req.query.campaignId === 'string' ? req.query.campaignId : '';
    const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
    const adAccountId = typeof req.query.adAccountId === 'string' ? req.query.adAccountId : undefined;

    if (!campaignId) {
      return res.status(400).json({ success: false, message: 'campaignId is required' });
    }

    const ads = await listZernioAdsForCampaign(req.tenantId!, campaignId, accountId, adAccountId);
    return res.json({ success: true, data: { ads } });
  } catch (err) {
    next(err);
  }
});

// GET /api/medsos/zernio/ads/:adId/analytics
router.get('/ads/:adId/analytics', async (req, res, next) => {
  try {
    const breakdowns = typeof req.query.breakdowns === 'string'
      ? req.query.breakdowns.split(',').map((item) => item.trim()).filter(Boolean)
      : undefined;
    const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : undefined;

    const analytics = await getZernioAdAnalytics(req.tenantId!, req.params.adId, {
      breakdowns,
      fromDate,
      toDate,
    });

    return res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

export default router;
