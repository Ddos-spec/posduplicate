import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { io } from '../../../server';
import {
  getAdsConnectUrl,
  getZernioAdAnalytics,
  getConnectUrl,
  listZernioAdsForCampaign,
  listZernioAccounts,
  disconnectZernioAccount,
  getZernioAdsSummary,
  getZernioPostAnalytics,
  getZernioConversations,
  getZernioConversationMessages,
  sendZernioDirectMessage,
  createZernioPost,
  generateZernioUploadLink,
  checkZernioUploadStatus,
  listZernioContacts,
  createZernioBroadcast,
  createZernioSequence,
  createZernioAutomation,
} from '../services/zernio.service';

const router = Router();

// POST /api/medsos/zernio/webhook
// This must be before authMiddleware because it's called by Zernio servers
router.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['x-zernio-signature'];
    // TODO: Verify signature using ZERNIO_WEBHOOK_SECRET
    const payload = req.body;
    console.log('[Webhook] Received:', payload.event, payload.id);
    
    // Process based on payload.event
    // e.g. post.published, message.received, etc.
    io.emit('zernio_event', payload);
    
    // We acknowledge the webhook quickly.
    return res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (err) {
    console.error('[Zernio Webhook] Error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

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
    await disconnectZernioAccount(req.params.accountId, req.tenantId);
    return res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

// GET /api/medsos/zernio/ads/summary
router.get('/ads/summary', async (req, res, next) => {
  try {
    const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : undefined;
    const refresh = String(req.query.refresh || '').toLowerCase() === 'true' || String(req.query.refresh || '') === '1';
    const summary = await getZernioAdsSummary(req.tenantId!, { fromDate, toDate, refresh });
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
    const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : undefined;
    const refresh = String(req.query.refresh || '').toLowerCase() === 'true' || String(req.query.refresh || '') === '1';

    if (!campaignId) {
      return res.status(400).json({ success: false, message: 'campaignId is required' });
    }

    const ads = await listZernioAdsForCampaign(req.tenantId!, campaignId, accountId, adAccountId, { fromDate, toDate, refresh });
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
    const refresh = String(req.query.refresh || '').toLowerCase() === 'true' || String(req.query.refresh || '') === '1';

    const analytics = await getZernioAdAnalytics(req.tenantId!, req.params.adId, {
      breakdowns,
      fromDate,
      toDate,
      refresh,
    });

    return res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

// POST /api/medsos/zernio/post
router.post('/post', async (req, res, next) => {
  try {
    const payload = req.body;
    const result = await createZernioPost(req.tenantId!, payload);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/medsos/zernio/media/upload-link
router.post('/media/upload-link', async (req, res, next) => {
  try {
    const result = await generateZernioUploadLink(req.tenantId!);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/medsos/zernio/media/status/:token
router.get('/media/status/:token', async (req, res, next) => {
  try {
    const result = await checkZernioUploadStatus(req.tenantId!, req.params.token);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/medsos/zernio/contacts
router.get('/contacts', async (req, res, next) => {
  try {
    const result = await listZernioContacts(req.tenantId!);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/medsos/zernio/broadcasts
router.post('/broadcasts', async (req, res, next) => {
  try {
    const result = await createZernioBroadcast(req.tenantId!, req.body);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/medsos/zernio/sequences
router.post('/sequences', async (req, res, next) => {
  try {
    const result = await createZernioSequence(req.tenantId!, req.body);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/medsos/zernio/automations
router.post('/automations', async (req, res, next) => {
  try {
    const result = await createZernioAutomation(req.tenantId!, req.body);
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/medsos/zernio/post-analytics
router.get('/post-analytics', async (req, res, next) => {
  try {
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : undefined;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
    const page = typeof req.query.page === 'string' ? Number(req.query.page) : 1;
    const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined;
    const order = typeof req.query.order === 'string' ? req.query.order : undefined;
    const refresh = String(req.query.refresh || '').toLowerCase() === 'true';

    const posts = await getZernioPostAnalytics(req.tenantId!, { platform, fromDate, toDate, limit, page, sortBy, order, refresh });
    return res.json({ success: true, data: { posts } });
  } catch (err) {
    next(err);
  }
});

// GET /api/medsos/zernio/conversations
router.get('/conversations', async (req, res, next) => {
  try {
    const platform = typeof req.query.platform === 'string' ? req.query.platform : undefined;
    const status = typeof req.query.status === 'string' ? (req.query.status as 'active' | 'archived') : undefined;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
    const refresh = String(req.query.refresh || '').toLowerCase() === 'true';

    const result = await getZernioConversations(req.tenantId!, { platform, status, limit, cursor, accountId, refresh });
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/medsos/zernio/conversations/:conversationId/messages
router.get('/conversations/:conversationId/messages', async (req, res, next) => {
  try {
    const accountId = typeof req.query.accountId === 'string' ? req.query.accountId : undefined;
    const messages = await getZernioConversationMessages(req.params.conversationId, accountId);
    return res.json({ success: true, data: { messages } });
  } catch (err) {
    next(err);
  }
});

// POST /api/medsos/zernio/conversations/:conversationId/send
router.post('/conversations/:conversationId/send', async (req, res, next) => {
  try {
    const { accountId, message } = req.body as { accountId?: string; message?: string };
    if (!accountId || !message?.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'accountId dan message wajib diisi.' } });
    }
    const result = await sendZernioDirectMessage(req.params.conversationId, accountId, message.trim());
    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
