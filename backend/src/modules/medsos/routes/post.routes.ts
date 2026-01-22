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
/**
 * @swagger
 * /api/medsos/posts:
 *   get:
 *     tags: [Social Media]
 *     summary: Get social media posts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Post list
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
router.get('/', getPosts);
/**
 * @swagger
 * /api/medsos/posts:
 *   post:
 *     tags: [Social Media]
 *     summary: Create social media post
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
 *         description: Post created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createPost);
/**
 * @swagger
 * /api/medsos/posts/{id}:
 *   put:
 *     tags: [Social Media]
 *     summary: Update social media post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Post updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updatePost);
/**
 * @swagger
 * /api/medsos/posts/{id}:
 *   delete:
 *     tags: [Social Media]
 *     summary: Delete social media post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Post deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', deletePost);

// Publish routes
/**
 * @swagger
 * /api/medsos/posts/{id}/publish:
 *   post:
 *     tags: [Social Media]
 *     summary: Publish social media post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Post published
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/publish', publishPost);

// Scheduler routes
/**
 * @swagger
 * /api/medsos/posts/scheduler/start:
 *   post:
 *     tags: [Social Media]
 *     summary: Start social media scheduler
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduler started
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/scheduler/start', startScheduler);
/**
 * @swagger
 * /api/medsos/posts/scheduler/stop:
 *   post:
 *     tags: [Social Media]
 *     summary: Stop social media scheduler
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduler stopped
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/scheduler/stop', stopScheduler);
/**
 * @swagger
 * /api/medsos/posts/scheduler/status:
 *   get:
 *     tags: [Social Media]
 *     summary: Get scheduler status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduler status
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
router.get('/scheduler/status', getSchedulerStatus);

// Analytics routes
/**
 * @swagger
 * /api/medsos/posts/{id}/analytics:
 *   get:
 *     tags: [Social Media]
 *     summary: Get post analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Post analytics
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
router.get('/:id/analytics', getPostAnalytics);
/**
 * @swagger
 * /api/medsos/posts/analytics/sync:
 *   post:
 *     tags: [Social Media]
 *     summary: Sync analytics for all posts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics sync started
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/analytics/sync', syncAllAnalytics);

export default router;
