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
  resolveWebhookIntegration,
  webhookRateLimiter,
  webhookIdempotency
} from '../../../middlewares/webhook.middleware';

const router = Router();

/**
 * QRIS Payment Webhook
 * POST /api/webhooks/qris
 */
/**
 * @swagger
 * /api/webhooks/qris:
 *   post:
 *     tags: [Webhooks]
 *     summary: QRIS payment webhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post(
  '/qris',
  webhookRateLimiter('qris'),
  resolveWebhookIntegration('qris'),
  verifyQRISSignature,
  webhookIdempotency('qris'),
  qrisWebhook
);

/**
 * GoFood Order Webhook
 * POST /api/webhooks/gofood
 */
/**
 * @swagger
 * /api/webhooks/gofood:
 *   post:
 *     tags: [Webhooks]
 *     summary: GoFood order webhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post(
  '/gofood',
  webhookRateLimiter('gofood'),
  resolveWebhookIntegration('gofood'),
  verifyGoFoodSignature,
  webhookIdempotency('gofood'),
  gofoodWebhook
);

/**
 * GrabFood Order Webhook
 * POST /api/webhooks/grabfood
 */
/**
 * @swagger
 * /api/webhooks/grabfood:
 *   post:
 *     tags: [Webhooks]
 *     summary: GrabFood order webhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post(
  '/grabfood',
  webhookRateLimiter('grabfood'),
  resolveWebhookIntegration('grabfood'),
  verifyGrabFoodSignature,
  webhookIdempotency('grabfood'),
  grabfoodWebhook
);

/**
 * ShopeeFood Order Webhook
 * POST /api/webhooks/shopeefood
 */
/**
 * @swagger
 * /api/webhooks/shopeefood:
 *   post:
 *     tags: [Webhooks]
 *     summary: ShopeeFood order webhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.post(
  '/shopeefood',
  webhookRateLimiter('shopeefood'),
  resolveWebhookIntegration('shopeefood'),
  verifyShopeeFoodSignature,
  webhookIdempotency('shopeefood'),
  shopeefoodWebhook
);

export default router;
