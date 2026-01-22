import { Router } from 'express';
import { getVariants, createVariant, updateVariant, deleteVariant } from '../controllers/variant.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

/**
 * @swagger
 * /api/variants:
 *   get:
 *     tags: [Variants]
 *     summary: Get variants
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Variant list
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
router.get('/', getVariants);
/**
 * @swagger
 * /api/variants:
 *   post:
 *     tags: [Variants]
 *     summary: Create variant
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
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Variant created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createVariant);
/**
 * @swagger
 * /api/variants/{id}:
 *   put:
 *     tags: [Variants]
 *     summary: Update variant
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
 *         description: Variant updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updateVariant);
/**
 * @swagger
 * /api/variants/{id}:
 *   delete:
 *     tags: [Variants]
 *     summary: Delete variant
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
 *         description: Variant deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', deleteVariant);

export default router;
