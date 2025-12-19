import { Router } from 'express';
import { roleMiddleware } from '../../../middlewares/role.middleware';
import * as budgetController from '../controllers/accounting.budget.controller';

const router = Router();

// Budget CRUD
router.get('/', budgetController.getBudgets);
router.get('/vs-actual', budgetController.getBudgetVsActual);
router.get('/:id', budgetController.getBudgetById);
router.post('/', roleMiddleware(['Owner', 'Super Admin', 'Manager']), budgetController.createBudget);
router.patch('/:id', roleMiddleware(['Owner', 'Super Admin', 'Manager']), budgetController.updateBudget);
router.delete('/:id', roleMiddleware(['Owner', 'Super Admin']), budgetController.deleteBudget);

export default router;
