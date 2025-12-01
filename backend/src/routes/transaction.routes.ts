import { Router } from 'express';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  holdOrder,
  getHeldOrders,
  updateTransactionStatus,
  deleteTransaction,
  getTodayReport
} from '../controllers/transaction.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import { validateCreateTransaction, validateIdParam } from '../middlewares/validation.middleware';

const router = Router();

// All routes require auth + tenant isolation
router.use(authMiddleware, tenantMiddleware);

router.get('/', getTransactions);
router.get('/today-report', getTodayReport);
router.get('/held', getHeldOrders);
router.get('/:id', validateIdParam, getTransactionById);
router.post('/', validateCreateTransaction, createTransaction);
router.post('/hold', holdOrder);
router.put('/:id/status', validateIdParam, updateTransactionStatus);
router.delete('/:id', validateIdParam, deleteTransaction);

export default router;
