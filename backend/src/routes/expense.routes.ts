import { Router } from 'express';
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getExpenseCategories
} from '../controllers/expense.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware, ownerOnly } from '../middlewares/tenant.middleware';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', getExpenses);
router.get('/summary', getExpenseSummary);
router.get('/categories', getExpenseCategories);
router.get('/:id', getExpense);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', ownerOnly, deleteExpense); // Only Owner/Manager can delete (requires reason)

export default router;
