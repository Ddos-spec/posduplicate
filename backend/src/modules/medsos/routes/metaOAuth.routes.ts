import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import {
  buildMetaOAuthStartUrl,
  getMetaAdsSummary,
  handleMetaCallback,
} from '../services/metaOAuth.service';

const router = Router();

// Public — Meta redirects here after user approves
router.get('/callback', async (req, res, next) => {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code.trim() : '';
    const state = typeof req.query.state === 'string' ? req.query.state.trim() : '';
    const error = typeof req.query.error === 'string' ? req.query.error : '';

    if (error) {
      const frontendUrl = process.env.FRONTEND_APP_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/medsos/connections?provider=meta-ads-hub&status=error&reason=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.status(400).send('Parameter callback tidak lengkap');
    }

    const { redirectUrl } = await handleMetaCallback(code, state);
    return res.redirect(redirectUrl);
  } catch (error) {
    next(error);
  }
});

// Protected — start OAuth flow (browser redirect)
router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/start', (req, res, next) => {
  try {
    if (!req.tenantId || !req.userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    }

    const returnPath = typeof req.query.returnPath === 'string' ? req.query.returnPath : '/medsos/connections';
    const oauthUrl = buildMetaOAuthStartUrl(req.tenantId, req.userId, returnPath);
    return res.redirect(oauthUrl);
  } catch (error) {
    next(error);
  }
});

// Protected — get OAuth start URL (untuk frontend yang perlu URL dulu sebelum redirect)
router.get('/start-url', (req, res, next) => {
  try {
    if (!req.tenantId || !req.userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
    }

    const returnPath = typeof req.query.returnPath === 'string' ? req.query.returnPath : '/medsos/connections';
    const oauthUrl = buildMetaOAuthStartUrl(req.tenantId, req.userId, returnPath);
    return res.json({ success: true, data: { oauthUrl } });
  } catch (error) {
    next(error);
  }
});

// Protected — proxy campaign summary dari Meta Graph API
router.get('/summary', async (req, res, next) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false, error: { code: 'NO_TENANT', message: 'Tenant required' } });
    }

    const data = await getMetaAdsSummary(req.tenantId);
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
