import { Router } from 'express';
import {
  getDashboardSummary,
  getSalesTrend,
  getTopProducts,
  getSalesByCategory,
  getRecentTransactions
} from '../controllers/dashboard.controller';
import { getCashierPerformance } from '../controllers/cashier.analytics.controller';
import {
  getTransactionAnalytics,
  getTransactionAnalyticsSummary,
  getTransactionAnalyticsTrend
} from '../controllers/transaction-analytics.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware, tenantMiddleware);

/**
 * GET /api/dashboard/summary
 * Get dashboard summary (total sales, transactions, products, customers)
 * Query params: outletId, startDate, endDate
 */
/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get dashboard summary
 *     description: Total sales, transactions, products, and customers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: outletId
 *         schema:
 *           type: integer
 *         description: Filter by outlet ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Dashboard summary
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
router.get('/summary', getDashboardSummary);

/**
 * GET /api/dashboard/sales-trend
 * Get sales trend data for charts
 * Query params: days (default: 7), outletId
 */
/**
 * @swagger
 * /api/dashboard/sales-trend:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get sales trend
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Number of days (default 7)
 *       - in: query
 *         name: outletId
 *         schema:
 *           type: integer
 *         description: Filter by outlet ID
 *     responses:
 *       200:
 *         description: Sales trend data
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
router.get('/sales-trend', getSalesTrend);

/**
 * GET /api/dashboard/top-products
 * Get top selling products
 * Query params: limit (default: 5)
 */
/**
 * @swagger
 * /api/dashboard/top-products:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get top selling products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit results
 *     responses:
 *       200:
 *         description: Top selling products
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
router.get('/top-products', getTopProducts);

/**
 * GET /api/dashboard/sales-by-category
 * Get sales breakdown by category
 */
/**
 * @swagger
 * /api/dashboard/sales-by-category:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get sales breakdown by category
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales by category
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
router.get('/sales-by-category', getSalesByCategory);

/**
 * GET /api/dashboard/recent-transactions
 * Get recent transactions
 * Query params: limit (default: 10)
 */
/**
 * @swagger
 * /api/dashboard/recent-transactions:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get recent transactions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit results
 *     responses:
 *       200:
 *         description: Recent transactions
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
router.get('/recent-transactions', getRecentTransactions);

/**
 * GET /api/dashboard/cashier-performance
 * Get cashier performance metrics
 * Query params: days (default: 30)
 */
/**
 * @swagger
 * /api/dashboard/cashier-performance:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get cashier performance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Number of days (default 30)
 *     responses:
 *       200:
 *         description: Cashier performance metrics
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
router.get('/cashier-performance', getCashierPerformance);

/**
 * GET /api/dashboard/transaction-analytics
 * Get detailed transaction analytics (for reports page)
 * Query params: outlet_id, date_from, date_to, category, limit
 */
/**
 * @swagger
 * /api/dashboard/transaction-analytics:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get transaction analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transaction analytics
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
router.get('/transaction-analytics', getTransactionAnalytics);

/**
 * GET /api/dashboard/transaction-analytics/summary
 * Get transaction analytics summary
 * Query params: outlet_id, date_from, date_to
 */
/**
 * @swagger
 * /api/dashboard/transaction-analytics/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get transaction analytics summary
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Transaction analytics summary
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
router.get('/transaction-analytics/summary', getTransactionAnalyticsSummary);

/**
 * GET /api/dashboard/transaction-analytics/trend
 * Get transaction analytics trend data
 * Query params: outlet_id, date_from, date_to
 */
/**
 * @swagger
 * /api/dashboard/transaction-analytics/trend:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get transaction analytics trend
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Transaction analytics trend
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
router.get('/transaction-analytics/trend', getTransactionAnalyticsTrend);

export default router;
