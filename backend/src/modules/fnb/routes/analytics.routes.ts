import { Router } from 'express';
import {
  getDashboardStats,
  getSalesChart,
  getTopProducts,
  getSalesByCategory,
  getRecentTransactions
} from '../controllers/analytics.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// All analytics routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// Dashboard stats
/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Get dashboard analytics stats
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *         description: Filter by outlet ID
 *     responses:
 *       200:
 *         description: Dashboard analytics stats
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
router.get('/dashboard', getDashboardStats);

// Sales chart data
/**
 * @swagger
 * /api/analytics/sales-chart:
 *   get:
 *     tags: [Analytics]
 *     summary: Get sales chart data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *         description: Period range
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *         description: Filter by outlet ID
 *     responses:
 *       200:
 *         description: Sales chart data
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
router.get('/sales-chart', getSalesChart);

// Top selling products
/**
 * @swagger
 * /api/analytics/top-products:
 *   get:
 *     tags: [Analytics]
 *     summary: Get top selling products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit results
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *         description: Filter by outlet ID
 *     responses:
 *       200:
 *         description: Top products list
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

// Sales by category
/**
 * @swagger
 * /api/analytics/sales-by-category:
 *   get:
 *     tags: [Analytics]
 *     summary: Get sales by category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *         description: Filter by outlet ID
 *     responses:
 *       200:
 *         description: Sales by category data
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

// Recent transactions
/**
 * @swagger
 * /api/analytics/recent-transactions:
 *   get:
 *     tags: [Analytics]
 *     summary: Get recent transactions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit results
 *       - in: query
 *         name: outlet_id
 *         schema:
 *           type: integer
 *         description: Filter by outlet ID
 *     responses:
 *       200:
 *         description: Recent transactions list
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

export default router;
