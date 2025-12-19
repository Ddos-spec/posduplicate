import { Router } from 'express';
import { roleMiddleware } from '../../../middlewares/role.middleware';
import * as taxController from '../controllers/accounting.tax.controller';

const router = Router();

// Tax Configuration CRUD
router.get('/config', taxController.getTaxConfigs);
router.get('/config/:id', taxController.getTaxConfigById);
router.post('/config', roleMiddleware(['Owner', 'Super Admin']), taxController.createTaxConfig);
router.patch('/config/:id', roleMiddleware(['Owner', 'Super Admin']), taxController.updateTaxConfig);
router.delete('/config/:id', roleMiddleware(['Owner', 'Super Admin']), taxController.deleteTaxConfig);

// Tax Transactions CRUD
router.get('/transactions', taxController.getTaxTransactions);
router.post('/transactions', roleMiddleware(['Owner', 'Super Admin', 'Manager']), taxController.createTaxTransaction);
router.patch('/transactions/:id', roleMiddleware(['Owner', 'Super Admin', 'Manager']), taxController.updateTaxTransactionStatus);
router.delete('/transactions/:id', roleMiddleware(['Owner', 'Super Admin']), taxController.deleteTaxTransaction);

// Tax Reports
router.get('/reports/summary', taxController.getTaxSummary);
router.get('/reports/spt', taxController.generateSPTReport);

export default router;
