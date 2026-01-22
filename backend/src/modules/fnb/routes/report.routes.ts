import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import {
  getSalesReport,
  getOperationalReport,
  getInventoryValuation,
  getCustomerAnalytics,
  getFraudStats
} from '../controllers/report.controller';

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/reports/sales:
 *   get:
 *     tags: [Reports]
 *     summary: Get sales report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales report data
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
router.get('/sales', getSalesReport);

// Operations (Peak Hours)
/**
 * @swagger
 * /api/reports/operations:
 *   get:
 *     tags: [Reports]
 *     summary: Get operational report
 *     description: Peak hours and operational insights
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Operational report data
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
router.get('/operations', getOperationalReport);

// Inventory Value
/**
 * @swagger
 * /api/reports/inventory-value:
 *   get:
 *     tags: [Reports]
 *     summary: Get inventory valuation report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory valuation data
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
router.get('/inventory-value', getInventoryValuation);

// Customers
/**
 * @swagger
 * /api/reports/customers:
 *   get:
 *     tags: [Reports]
 *     summary: Get customer analytics report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer analytics data
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
router.get('/customers', getCustomerAnalytics);

// Fraud/Audit
/**
 * @swagger
 * /api/reports/fraud-stats:
 *   get:
 *     tags: [Reports]
 *     summary: Get fraud and audit statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fraud statistics
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
router.get('/fraud-stats', getFraudStats);

export default router;
