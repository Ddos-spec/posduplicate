import { Router } from 'express';
import {
  getAccounts,
  connectAccount,
  disconnectAccount,
  initOAuth,
  oauthCallback,
  refreshToken
} from '../controllers/account.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// OAuth callback (public - called by platform OAuth)
/**
 * @swagger
 * /api/medsos/accounts/oauth/callback:
 *   get:
 *     tags: [Social Media]
 *     summary: OAuth callback
 *     description: Public callback endpoint for social media OAuth
 *     responses:
 *       200:
 *         description: OAuth callback handled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/oauth/callback', oauthCallback);

// Protected routes
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @swagger
 * /api/medsos/accounts:
 *   get:
 *     tags: [Social Media]
 *     summary: Get connected social media accounts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connected accounts
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
router.get('/', getAccounts);
/**
 * @swagger
 * /api/medsos/accounts/connect:
 *   post:
 *     tags: [Social Media]
 *     summary: Connect social media account
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
 *         description: Account connected
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/connect', connectAccount);
/**
 * @swagger
 * /api/medsos/accounts/oauth/init:
 *   post:
 *     tags: [Social Media]
 *     summary: Initialize OAuth flow
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: OAuth initialization data
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/oauth/init', initOAuth);
/**
 * @swagger
 * /api/medsos/accounts/{id}/refresh:
 *   post:
 *     tags: [Social Media]
 *     summary: Refresh account token
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
 *         description: Token refreshed
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/refresh', refreshToken);
/**
 * @swagger
 * /api/medsos/accounts/{id}:
 *   delete:
 *     tags: [Social Media]
 *     summary: Disconnect social media account
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
 *         description: Account disconnected
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', disconnectAccount);

export default router;
