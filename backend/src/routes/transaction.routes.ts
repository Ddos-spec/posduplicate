import { Router } from 'express';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  holdOrder,
  getHeldOrders,
  updateTransactionStatus,
  getTodayReport
} from '../controllers/transaction.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const router = Router();

// All routes require auth + tenant isolation
router.use(authMiddleware, tenantMiddleware);

router.get('/', getTransactions);
router.get('/today-report', getTodayReport);
router.get('/held', getHeldOrders);
router.get('/:id', getTransactionById);
router.post('/', createTransaction);
router.post('/hold', holdOrder);
router.put('/:id/status', updateTransactionStatus);

export default router;
