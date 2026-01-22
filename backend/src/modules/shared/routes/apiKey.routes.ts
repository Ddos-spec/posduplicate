import { Router } from 'express';
import {
  getTenantApiKeys,
  getAllApiKeys, // Added this
  getMyApiKeys,
  createApiKey,
  toggleApiKeyStatus,
  deleteApiKey,
  getApiDocumentation,
} from '../controllers/apiKey.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { superAdminOnly, ownerOnly, tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// API Documentation (Admin only)
/**
 * @swagger
 * /api/api-keys/documentation:
 *   get:
 *     tags: [API Keys]
 *     summary: Get API key documentation
 *     description: Super Admin only
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API key documentation
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
router.get('/documentation', authMiddleware, superAdminOnly, getApiDocumentation);

// Admin routes - manage API keys for any tenant
/**
 * @swagger
 * /api/api-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: Get all API keys
 *     description: Super Admin only
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API key list
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
router.get('/', authMiddleware, superAdminOnly, getAllApiKeys); // Added this route
/**
 * @swagger
 * /api/api-keys/tenant/{tenantId}:
 *   get:
 *     tags: [API Keys]
 *     summary: Get API keys by tenant
 *     description: Super Admin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tenant API keys
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
router.get('/tenant/:tenantId', authMiddleware, superAdminOnly, getTenantApiKeys);
/**
 * @swagger
 * /api/api-keys/tenant/{tenantId}:
 *   post:
 *     tags: [API Keys]
 *     summary: Create API key for tenant
 *     description: Super Admin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
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
 *       201:
 *         description: API key created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/tenant/:tenantId', authMiddleware, superAdminOnly, createApiKey);
/**
 * @swagger
 * /api/api-keys/{keyId}/toggle:
 *   patch:
 *     tags: [API Keys]
 *     summary: Toggle API key status
 *     description: Super Admin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: API key status updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:keyId/toggle', authMiddleware, superAdminOnly, toggleApiKeyStatus);
/**
 * @swagger
 * /api/api-keys/{keyId}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Delete API key
 *     description: Super Admin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: API key deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:keyId', authMiddleware, superAdminOnly, deleteApiKey);

// Owner routes - view their own API keys (read-only)
/**
 * @swagger
 * /api/api-keys/my-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: Get my API keys
 *     description: Owner only
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: My API keys
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
router.get('/my-keys', authMiddleware, tenantMiddleware, ownerOnly, getMyApiKeys);

export default router;
