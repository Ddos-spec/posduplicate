import { Router } from 'express';
import { getVariants, createVariant, updateVariant, deleteVariant } from '../controllers/variant.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', getVariants);
router.post('/', createVariant);
router.put('/:id', updateVariant);
router.delete('/:id', deleteVariant);

export default router;
