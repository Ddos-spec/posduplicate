import { Router } from 'express';
import {
  getActivityLogs,
  getEntityActivityLogs,
  getRecentActivities,
  getUserActivitySummary,
} from '../controllers/activity-log.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// All routes require authentication and tenant isolation
router.use(authMiddleware, tenantMiddleware);

// Get all activity logs (with filters)
/**
 * @swagger
 * /api/activity-logs:
 *   get:
 *     tags: [Activity Logs]
 *     summary: Get activity logs
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity log list
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
router.get('/', getActivityLogs);

// Get recent activities summary
/**
 * @swagger
 * /api/activity-logs/recent:
 *   get:
 *     tags: [Activity Logs]
 *     summary: Get recent activities
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recent activity summary
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
router.get('/recent', getRecentActivities);

// Get user activity summary
/**
 * @swagger
 * /api/activity-logs/user/{userId}:
 *   get:
 *     tags: [Activity Logs]
 *     summary: Get user activity summary
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User activity summary
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
router.get('/user/:userId', getUserActivitySummary);

// Get activity logs for specific entity
/**
 * @swagger
 * /api/activity-logs/{entityType}/{entityId}:
 *   get:
 *     tags: [Activity Logs]
 *     summary: Get activity logs by entity
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Entity activity logs
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
router.get('/:entityType/:entityId', getEntityActivityLogs);

export default router;
