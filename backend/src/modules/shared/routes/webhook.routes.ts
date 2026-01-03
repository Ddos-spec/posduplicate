import { Router } from 'express';
import {
  qrisWebhook,
  gofoodWebhook,
  grabfoodWebhook,
  shopeefoodWebhook
} from '../controllers/webhook.controller';
import {
  verifyQRISSignature,
  verifyGoFoodSignature,
  verifyGrabFoodSignature,
  verifyShopeeFoodSignature,
  webhookRateLimiter,
  webhookIdempotency
} from '../../../middlewares/webhook.middleware';

const router = Router();

/**
 * QRIS Payment Webhook
 * POST /api/webhooks/qris
 */
router.post(
  '/qris',
  webhookRateLimiter('qris'),
  webhookIdempotency('qris'),
  verifyQRISSignature,
  qrisWebhook
);

/**
 * GoFood Order Webhook
 * POST /api/webhooks/gofood
 */
router.post(
  '/gofood',
  webhookRateLimiter('gofood'),
  webhookIdempotency('gofood'),
  verifyGoFoodSignature,
  gofoodWebhook
);

/**
 * GrabFood Order Webhook
 * POST /api/webhooks/grabfood
 */
router.post(
  '/grabfood',
  webhookRateLimiter('grabfood'),
  webhookIdempotency('grabfood'),
  verifyGrabFoodSignature,
  grabfoodWebhook
);

/**
 * ShopeeFood Order Webhook
 * POST /api/webhooks/shopeefood
 */
router.post(
  '/shopeefood',
  webhookRateLimiter('shopeefood'),
  webhookIdempotency('shopeefood'),
  verifyShopeeFoodSignature,
  shopeefoodWebhook
);

export default router;
