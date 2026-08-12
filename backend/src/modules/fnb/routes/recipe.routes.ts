import { Router } from 'express';
import { getRecipes, getRecipeByItemId, updateProductRecipe, addRecipeItem, deleteRecipeItem } from '../controllers/recipe.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', requireCapability('supply.manufacturing.read'), getRecipes);
router.get('/product/:itemId', requireCapability('supply.manufacturing.read'), getRecipeByItemId);
router.post('/product/:itemId', requireCapability('supply.manufacturing.manage'), updateProductRecipe);
router.post('/', requireCapability('supply.manufacturing.manage'), addRecipeItem);
router.delete('/:id', requireCapability('supply.manufacturing.manage'), deleteRecipeItem);

export default router;
