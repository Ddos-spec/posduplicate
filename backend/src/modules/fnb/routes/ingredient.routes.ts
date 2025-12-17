import { Router } from 'express';
import { getIngredients, createIngredient, updateIngredient, deleteIngredient, adjustIngredientStock } from '../controllers/ingredient.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../../../middlewares/tenant.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', getIngredients);
router.post('/', ownerOnly, createIngredient); // Only Owner/Manager can create new ingredients
router.post('/adjust-stock', adjustIngredientStock); // All roles can adjust stock (with reason)
router.put('/:id', updateIngredient); // All roles can update stock
router.delete('/:id', ownerOnly, deleteIngredient); // Only Owner/Manager can delete

export default router;
