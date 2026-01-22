import { Router } from 'express';
import { getModifiers, createModifier, updateModifier, deleteModifier } from '../controllers/modifier.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

/**
 * @swagger
 * /api/modifiers:
 *   get:
 *     tags: [Modifiers]
 *     summary: Get modifiers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Modifier list
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
router.get('/', getModifiers);
/**
 * @swagger
 * /api/modifiers:
 *   post:
 *     tags: [Modifiers]
 *     summary: Create modifier
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
 *         description: Modifier created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', createModifier);
/**
 * @swagger
 * /api/modifiers/{id}:
 *   put:
 *     tags: [Modifiers]
 *     summary: Update modifier
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
 *         description: Modifier updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updateModifier);
/**
 * @swagger
 * /api/modifiers/{id}:
 *   delete:
 *     tags: [Modifiers]
 *     summary: Delete modifier
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
 *         description: Modifier deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', deleteModifier);

export default router;
