import { Router } from 'express';
import { getModifiers, createModifier, updateModifier, deleteModifier } from '../controllers/modifier.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', getModifiers);
router.post('/', createModifier);
router.put('/:id', updateModifier);
router.delete('/:id', deleteModifier);

export default router;
