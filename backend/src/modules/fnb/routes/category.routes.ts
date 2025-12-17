import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/category.controller';
import { authMiddleware, optionalAuth } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// Public routes (no auth required for GET)
router.get('/', optionalAuth, getCategories);
router.get('/:id', optionalAuth, getCategoryById);

// Protected routes (require auth)
router.post('/', authMiddleware, tenantMiddleware, createCategory);
router.put('/:id', authMiddleware, tenantMiddleware, updateCategory);
router.delete('/:id', authMiddleware, tenantMiddleware, deleteCategory);

export default router;
