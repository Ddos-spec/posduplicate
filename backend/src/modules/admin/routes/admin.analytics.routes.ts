import { Router } from 'express';
import {
  getTenantGrowth,
  getSystemRevenue,
  getTenantStatusDistribution,
  getTopTenants,
  getSystemSummary
} from '../controllers/admin.analytics.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { superAdminOnly } from '../../../middlewares/tenant.middleware';

const router = Router();

// All routes require Super Admin access
router.use(authMiddleware, superAdminOnly);

/**
 * @swagger
 * /api/admin/analytics/tenant-growth:
 *   get:
 *     tags: [Admin]
 *     summary: Get tenant growth analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tenant growth analytics
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
router.get('/tenant-growth', getTenantGrowth);
/**
 * @swagger
 * /api/admin/analytics/revenue:
 *   get:
 *     tags: [Admin]
 *     summary: Get system revenue analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System revenue analytics
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
router.get('/revenue', getSystemRevenue);
/**
 * @swagger
 * /api/admin/analytics/tenant-status:
 *   get:
 *     tags: [Admin]
 *     summary: Get tenant status distribution
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tenant status distribution
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
router.get('/tenant-status', getTenantStatusDistribution);
/**
 * @swagger
 * /api/admin/analytics/top-tenants:
 *   get:
 *     tags: [Admin]
 *     summary: Get top tenants
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top tenants data
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
router.get('/top-tenants', getTopTenants);
/**
 * @swagger
 * /api/admin/analytics/summary:
 *   get:
 *     tags: [Admin]
 *     summary: Get system summary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System summary
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
router.get('/summary', getSystemSummary);

export default router;
