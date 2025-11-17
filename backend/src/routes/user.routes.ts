import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword
} from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../middlewares/tenant.middleware';

const router = Router();

// All routes require auth + tenant isolation + owner only
router.use(authMiddleware, tenantMiddleware, ownerOnly);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/reset-password', resetUserPassword);

export default router;
