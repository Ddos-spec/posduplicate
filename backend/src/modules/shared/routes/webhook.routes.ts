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
  webhookIdempotency('qris'),
  verifyQRISSignature,
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
  webhookIdempotency('gofood'),
  verifyGoFoodSignature,
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
  webhookIdempotency('grabfood'),
  verifyGrabFoodSignature,
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
  webhookIdempotency('shopeefood'),
  verifyShopeeFoodSignature,
  shopeefoodWebhook
);

export default router;
