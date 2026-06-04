import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import {
  buildTikTokAdsOAuthStartUrl,
  getTikTokAdsCallbackUrl,
  getTikTokAdsSummary,
  handleTikTokAdsCallback,
} from '../services/tiktokAdsOAuth.service';

const router = Router();

// Public — TikTok redirects here after advertiser authorization.
router.get('/callback', async (req, res, next) => {
  try {
    const authCode = typeof req.query.auth_code === 'string'
      ? req.query.auth_code.trim()
      : typeof req.query.code === 'string'
        ? req.query.code.trim()
        : '';
    const state = typeof req.query.state === 'string' ? req.query.state.trim() : '';
    const error = typeof req.query.error === 'string' ? req.query.error : '';

    if (error) {
      const frontendUrl = (process.env.FRONTEND_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173')
        .split(',')[0]
        .trim()
        .replace(/\/$/, '');
      return res.redirect(`${frontendUrl}/medsos/connections?provider=tiktok-ads-hub&status=error&reason=${encodeURIComponent(error)}`);
    }

    if (!authCode || !state) {
      return res.status(400).send('Parameter TikTok callback tidak lengkap. Mulai dari tombol Connect di dashboard.');
    }

    const { redirectUrl } = await handleTikTokAdsCallback(authCode, state);
    return res.redirect(redirectUrl);
  } catch (error) {
    next(error);
  }
});

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/start-url', (req, res, next) => {
  try {
    if (!req.tenantId || !req.userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    }

    const returnPath = typeof req.query.returnPath === 'string' ? req.query.returnPath : '/medsos/connections';
    const oauthUrl = buildTikTokAdsOAuthStartUrl(req.tenantId, req.userId, returnPath);
    return res.json({
      success: true,
      data: {
        oauthUrl,
        callbackUrl: getTikTokAdsCallbackUrl(),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/summary', async (req, res, next) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false, error: { code: 'NO_TENANT', message: 'Tenant required' } });
    }

    const data = await getTikTokAdsSummary(req.tenantId);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
