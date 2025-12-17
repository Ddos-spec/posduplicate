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
  verifyShopeeFoodSignature
} from '../../../middlewares/webhook.middleware';

const router = Router();

/**
 * QRIS Payment Webhook
 * POST /api/webhooks/qris
 */
router.post('/qris', verifyQRISSignature, qrisWebhook);

/**
 * GoFood Order Webhook
 * POST /api/webhooks/gofood
 */
router.post('/gofood', verifyGoFoodSignature, gofoodWebhook);

/**
 * GrabFood Order Webhook
 * POST /api/webhooks/grabfood
 */
router.post('/grabfood', verifyGrabFoodSignature, grabfoodWebhook);

/**
 * ShopeeFood Order Webhook
 * POST /api/webhooks/shopeefood
 */
router.post('/shopeefood', verifyShopeeFoodSignature, shopeefoodWebhook);

export default router;
