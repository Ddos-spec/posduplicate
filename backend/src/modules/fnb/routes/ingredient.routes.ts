import { Router } from 'express';
import { getIngredients, createIngredient, updateIngredient, deleteIngredient, adjustIngredientStock } from '../controllers/ingredient.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../../../middlewares/tenant.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

/**
 * @swagger
 * /api/ingredients:
 *   get:
 *     tags: [Ingredients]
 *     summary: Get ingredients
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ingredient list
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
router.get('/', getIngredients);
/**
 * @swagger
 * /api/ingredients:
 *   post:
 *     tags: [Ingredients]
 *     summary: Create ingredient
 *     description: Owner/Manager only
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
 *               unit:
 *                 type: string
 *               cost:
 *                 type: number
 *               stock:
 *                 type: number
 *     responses:
 *       201:
 *         description: Ingredient created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', ownerOnly, createIngredient); // Only Owner/Manager can create new ingredients
/**
 * @swagger
 * /api/ingredients/adjust-stock:
 *   post:
 *     tags: [Ingredients]
 *     summary: Adjust ingredient stock
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ingredientId
 *               - quantity
 *               - type
 *             properties:
 *               ingredientId:
 *                 type: integer
 *               quantity:
 *                 type: number
 *               type:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock adjusted
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
router.post('/adjust-stock', adjustIngredientStock); // All roles can adjust stock (with reason)
/**
 * @swagger
 * /api/ingredients/{id}:
 *   put:
 *     tags: [Ingredients]
 *     summary: Update ingredient
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
 *         description: Ingredient updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', updateIngredient); // All roles can update stock
/**
 * @swagger
 * /api/ingredients/{id}:
 *   delete:
 *     tags: [Ingredients]
 *     summary: Delete ingredient
 *     description: Owner/Manager only
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
 *         description: Ingredient deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', ownerOnly, deleteIngredient); // Only Owner/Manager can delete

export default router;
