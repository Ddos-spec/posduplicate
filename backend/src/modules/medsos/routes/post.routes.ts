import { Router } from 'express';
import {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  publishPost,
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  getPostAnalytics,
  syncAllAnalytics
} from '../controllers/post.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// Apply Auth & Tenant middleware to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// CRUD routes
router.get('/', getPosts);
router.post('/', createPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);

// Publish routes
router.post('/:id/publish', publishPost);

// Scheduler routes
router.post('/scheduler/start', startScheduler);
router.post('/scheduler/stop', stopScheduler);
router.get('/scheduler/status', getSchedulerStatus);

// Analytics routes
router.get('/:id/analytics', getPostAnalytics);
router.post('/analytics/sync', syncAllAnalytics);

export default router;
