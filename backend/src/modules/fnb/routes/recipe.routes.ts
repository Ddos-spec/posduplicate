import { Router } from 'express';
import { getRecipes, getRecipeByItemId, updateProductRecipe, addRecipeItem, deleteRecipeItem } from '../controllers/recipe.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../../../middlewares/tenant.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', getRecipes);
router.get('/product/:itemId', getRecipeByItemId);
router.post('/product/:itemId', ownerOnly, updateProductRecipe);
router.post('/', ownerOnly, addRecipeItem);
router.delete('/:id', ownerOnly, deleteRecipeItem);

export default router;
