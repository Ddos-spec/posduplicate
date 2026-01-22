import { Router } from 'express';
import { getRecipes, getRecipeByItemId, updateProductRecipe, addRecipeItem, deleteRecipeItem } from '../controllers/recipe.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

/**
 * @swagger
 * /api/recipes:
 *   get:
 *     tags: [Recipes]
 *     summary: Get recipes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recipe list
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
router.get('/', getRecipes);
/**
 * @swagger
 * /api/recipes/product/{itemId}:
 *   get:
 *     tags: [Recipes]
 *     summary: Get recipe by product ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recipe detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Recipe not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/product/:itemId', getRecipeByItemId);
/**
 * @swagger
 * /api/recipes/product/{itemId}:
 *   post:
 *     tags: [Recipes]
 *     summary: Replace recipe for product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
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
 *         description: Recipe updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/product/:itemId', updateProductRecipe); // This will replace the entire recipe for a product
/**
 * @swagger
 * /api/recipes:
 *   post:
 *     tags: [Recipes]
 *     summary: Add recipe item
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
 *         description: Recipe item added
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', addRecipeItem);
/**
 * @swagger
 * /api/recipes/{id}:
 *   delete:
 *     tags: [Recipes]
 *     summary: Delete recipe item
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
 *         description: Recipe item deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', deleteRecipeItem);

export default router;
