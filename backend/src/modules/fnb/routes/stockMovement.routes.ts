import { Router } from 'express';
import {
  getStockMovements,
  getStockMovement,
  createStockMovement,
  deleteStockMovement,
  getStockMovementSummary
} from '../controllers/stockMovement.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../../../middlewares/tenant.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', getStockMovements);
router.get('/summary', getStockMovementSummary);
router.get('/:id', getStockMovement);
router.post('/', createStockMovement);
router.delete('/:id', ownerOnly, deleteStockMovement); // Only Owner/Manager can delete with rollback

export default router;
