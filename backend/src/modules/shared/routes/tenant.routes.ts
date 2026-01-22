import { Router } from 'express';
import {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  toggleTenantStatus,
  updateSubscription,
  getMyTenant,
  deleteTenant,
} from '../controllers/tenant.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { superAdminOnly, tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// Tenant user routes
/**
 * @swagger
 * /api/tenants/me:
 *   get:
 *     tags: [Tenants]
 *     summary: Get current tenant
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tenant details
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
router.get('/me', authMiddleware, tenantMiddleware, getMyTenant);

// Super Admin only routes
/**
 * @swagger
 * /api/tenants:
 *   get:
 *     tags: [Tenants]
 *     summary: Get all tenants
 *     description: Super Admin only
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tenant list
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
router.get('/', authMiddleware, superAdminOnly, getAllTenants);
/**
 * @swagger
 * /api/tenants/{id}:
 *   get:
 *     tags: [Tenants]
 *     summary: Get tenant by ID
 *     description: Super Admin only
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
 *         description: Tenant detail
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
router.get('/:id', authMiddleware, superAdminOnly, getTenantById);
/**
 * @swagger
 * /api/tenants:
 *   post:
 *     tags: [Tenants]
 *     summary: Create tenant
 *     description: Super Admin only
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
 *         description: Tenant created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authMiddleware, superAdminOnly, createTenant); // Protected - admin creation only
/**
 * @swagger
 * /api/tenants/{id}:
 *   put:
 *     tags: [Tenants]
 *     summary: Update tenant
 *     description: Super Admin only
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
 *         description: Tenant updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', authMiddleware, superAdminOnly, updateTenant);
/**
 * @swagger
 * /api/tenants/{id}/status:
 *   patch:
 *     tags: [Tenants]
 *     summary: Toggle tenant status
 *     description: Super Admin only
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
 *         description: Tenant status updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/status', authMiddleware, superAdminOnly, toggleTenantStatus);
/**
 * @swagger
 * /api/tenants/{id}/subscription:
 *   patch:
 *     tags: [Tenants]
 *     summary: Update tenant subscription
 *     description: Super Admin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Tenant subscription updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/subscription', authMiddleware, superAdminOnly, updateSubscription);
/**
 * @swagger
 * /api/tenants/{id}:
 *   delete:
 *     tags: [Tenants]
 *     summary: Delete tenant
 *     description: Super Admin only
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
 *         description: Tenant deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', authMiddleware, superAdminOnly, deleteTenant);

export default router;
