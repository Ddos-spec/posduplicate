import { Router } from 'express';
import {
  getInventory,
  adjustStock,
  getMovements,
  getLowStock
} from '../controllers/inventory.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// All routes require auth + tenant isolation
router.use(authMiddleware, tenantMiddleware);

router.get('/', getInventory);
router.get('/low-stock', getLowStock);
router.get('/movements', getMovements);
router.post('/adjust', adjustStock);

export default router;
