import { Router } from 'express';
import {
  getInventory,
  adjustStock,
  getLowStock
} from '../controllers/inventory.controller';
import { getStockMovements } from '../controllers/stockMovement.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();

// All routes require auth + tenant isolation
router.use(authMiddleware, tenantMiddleware);

router.get('/', getInventory);
router.get('/low-stock', getLowStock);
// Consolidated: use stockMovement controller as single source of truth
router.get('/movements', getStockMovements);
router.post('/adjust', adjustStock);

export default router;
