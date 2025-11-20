import { Router } from 'express';
import { getRecipes, getRecipeByItemId, updateProductRecipe, addRecipeItem, deleteRecipeItem } from '../controllers/recipe.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', getRecipes);
router.get('/product/:itemId', getRecipeByItemId);
router.post('/product/:itemId', updateProductRecipe); // This will replace the entire recipe for a product
router.post('/', addRecipeItem);
router.delete('/:id', deleteRecipeItem);

export default router;
