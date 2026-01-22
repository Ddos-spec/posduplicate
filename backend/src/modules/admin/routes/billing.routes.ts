import { Router } from 'express';
import {
  getBillingHistory,
  getSubscriptionPlans,
  recordPayment,
  getBillingStats
} from '../controllers/billing.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { superAdminOnly } from '../../../middlewares/tenant.middleware';

const router = Router();

// All routes require Super Admin access
router.use(authMiddleware, superAdminOnly);

/**
 * @swagger
 * /api/admin/billing/history:
 *   get:
 *     tags: [Admin]
 *     summary: Get billing history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Billing history
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/history', getBillingHistory);
/**
 * @swagger
 * /api/admin/billing/plans:
 *   get:
 *     tags: [Admin]
 *     summary: Get subscription plans
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription plan list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/plans', getSubscriptionPlans);
/**
 * @swagger
 * /api/admin/billing/payment:
 *   post:
 *     tags: [Admin]
 *     summary: Record payment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Payment recorded
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/payment', recordPayment);
/**
 * @swagger
 * /api/admin/billing/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Get billing statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Billing statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', getBillingStats);

export default router;
