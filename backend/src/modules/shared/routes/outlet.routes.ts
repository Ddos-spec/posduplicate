import { Router } from 'express';
import {
  getOutlets,
  getOutletById,
  createOutlet,
  updateOutlet,
  deleteOutlet,
  getOutletSettings,
  updateOutletSettings
} from '../controllers/outlet.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// All routes require authentication and tenant isolation
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * GET /api/outlets
 * Get all outlets (filtered by tenant)
 * Query params: is_active
 */
/**
 * @swagger
 * /api/outlets:
 *   get:
 *     tags: [Outlets]
 *     summary: Get outlets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Outlet list
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
router.get('/', getOutlets);

/**
 * GET /api/outlets/:id
 * Get outlet by ID
 */
/**
 * @swagger
 * /api/outlets/{id}:
 *   get:
 *     tags: [Outlets]
 *     summary: Get outlet by ID
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
 *         description: Outlet detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Outlet not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getOutletById);

/**
 * POST /api/outlets
 * Create new outlet
 */
/**
 * @swagger
 * /api/outlets:
 *   post:
 *     tags: [Outlets]
 *     summary: Create outlet
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Outlet created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createOutlet);

/**
 * PUT /api/outlets/:id
 * Update outlet
 */
/**
 * @swagger
 * /api/outlets/{id}:
 *   put:
 *     tags: [Outlets]
 *     summary: Update outlet
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
 *         description: Outlet updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updateOutlet);

/**
 * DELETE /api/outlets/:id
 * Deactivate outlet (soft delete)
 */
/**
 * @swagger
 * /api/outlets/{id}:
 *   delete:
 *     tags: [Outlets]
 *     summary: Delete outlet
 *     description: Soft delete outlet
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
 *         description: Outlet deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', deleteOutlet);

/**
 * GET /api/outlets/:id/settings
 * Get outlet settings
 */
/**
 * @swagger
 * /api/outlets/{id}/settings:
 *   get:
 *     tags: [Outlets]
 *     summary: Get outlet settings
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
 *         description: Outlet settings
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
router.get('/:id/settings', getOutletSettings);

/**
 * PUT /api/outlets/:id/settings
 * Update outlet settings
 */
/**
 * @swagger
 * /api/outlets/{id}/settings:
 *   put:
 *     tags: [Outlets]
 *     summary: Update outlet settings
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
 *         description: Outlet settings updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id/settings', updateOutletSettings);

export default router;
