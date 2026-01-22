import express from 'express';
import { authMiddleware, roleMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import * as dashboardController from '../controllers/accounting.dashboard.controller';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @swagger
 * /api/accounting/dashboard/stats:
 *   get:
 *     tags: [Accounting]
 *     summary: Get accounting dashboard stats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
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
router.get('/stats', dashboardController.getStats);
/**
 * @swagger
 * /api/accounting/dashboard/chart:
 *   get:
 *     tags: [Accounting]
 *     summary: Get accounting dashboard chart data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chart data
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
router.get('/chart', dashboardController.getChartData);

/**
 * @swagger
 * /api/accounting/dashboard/distributor:
 *   get:
 *     tags: [Accounting]
 *     summary: Get distributor dashboard
 *     description: Distributor/Owner/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Distributor dashboard data
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
router.get('/distributor', roleMiddleware(['Distributor', 'Owner', 'Super Admin']), dashboardController.getDistributorDashboard);
/**
 * @swagger
 * /api/accounting/dashboard/produsen:
 *   get:
 *     tags: [Accounting]
 *     summary: Get produsen dashboard
 *     description: Produsen/Owner/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Produsen dashboard data
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
router.get('/produsen', roleMiddleware(['Produsen', 'Owner', 'Super Admin']), dashboardController.getProdusenDashboard);
/**
 * @swagger
 * /api/accounting/dashboard/retail:
 *   get:
 *     tags: [Accounting]
 *     summary: Get retail dashboard
 *     description: Retail/Owner/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Retail dashboard data
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
router.get('/retail', roleMiddleware(['Retail', 'Owner', 'Super Admin']), dashboardController.getRetailDashboard);

export default router;
