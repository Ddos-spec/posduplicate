import { Router } from 'express';
import {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  getApplicablePromotions,
  applyPromotion
} from '../controllers/promotion.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../../../middlewares/tenant.middleware';

const router = Router();

// Public route for getting applicable promotions
router.post('/applicable', getApplicablePromotions);

// Protected routes
router.use(authMiddleware, tenantMiddleware);

router.get('/', getPromotions);
router.get('/:id', getPromotionById);
router.post('/', ownerOnly, createPromotion);
router.put('/:id', ownerOnly, updatePromotion);
router.delete('/:id', ownerOnly, deletePromotion);
router.post('/apply', applyPromotion);

export default router;
