import { Router } from 'express';
import {
  getActivityLogs,
  getEntityActivityLogs,
  getRecentActivities,
  getUserActivitySummary,
} from '../controllers/activity-log.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const router = Router();

// All routes require authentication and tenant isolation
router.use(authMiddleware, tenantMiddleware);

// Get all activity logs (with filters)
router.get('/', getActivityLogs);

// Get recent activities summary
router.get('/recent', getRecentActivities);

// Get user activity summary
router.get('/user/:userId', getUserActivitySummary);

// Get activity logs for specific entity
router.get('/:entityType/:entityId', getEntityActivityLogs);

export default router;
