import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getSalesReport,
  getOperationalReport,
  getInventoryValuation,
  getCustomerAnalytics,
  getFraudStats
} from '../controllers/report.controller';

const router = Router();

router.use(authMiddleware);

router.get('/sales', getSalesReport);

// Operations (Peak Hours)
router.get('/operations', getOperationalReport);

// Inventory Value
router.get('/inventory-value', getInventoryValuation);

// Customers
router.get('/customers', getCustomerAnalytics);

// Fraud/Audit
router.get('/fraud-stats', getFraudStats);

export default router;
