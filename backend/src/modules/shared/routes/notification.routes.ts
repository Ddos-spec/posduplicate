import { Router } from 'express';
import { getAdminNotifications, getTenantNotifications } from '../controllers/notification.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { superAdminOnly, tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// Admin notifications route - requires super admin access
/**
 * @swagger
 * /api/notifications/admin:
 *   get:
 *     tags: [Notifications]
 *     summary: Get admin notifications
 *     description: Super Admin only
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin notifications
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
router.get('/admin', authMiddleware, superAdminOnly, getAdminNotifications);

// Tenant notifications route - any authenticated user can access their own tenant notifications
/**
 * @swagger
 * /api/notifications/tenant:
 *   get:
 *     tags: [Notifications]
 *     summary: Get tenant notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tenant notifications
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
router.get('/tenant', authMiddleware, tenantMiddleware, getTenantNotifications);

export default router;
