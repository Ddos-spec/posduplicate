import { Router } from 'express';
import { getIntegrations, updateIntegration } from '../controllers/integration.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../../../middlewares/tenant.middleware';

const router = Router();

// All routes require Auth + Tenant + Owner Permission
router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(ownerOnly);

// Get all integrations status
/**
 * @swagger
 * /api/integrations:
 *   get:
 *     tags: [Integrations]
 *     summary: Get integrations status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integrations status
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
router.get('/', getIntegrations);

// Update specific integration (e.g., PUT /api/integrations/gofood)
/**
 * @swagger
 * /api/integrations/{integrationType}:
 *   put:
 *     tags: [Integrations]
 *     summary: Update integration settings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: integrationType
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Integration updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:integrationType', updateIntegration);

export default router;
