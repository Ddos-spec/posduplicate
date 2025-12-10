import express from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  getFinancialReport,
  getOperationalReport,
  getInventoryValuation,
  getCustomerAnalytics,
  getFraudStats
} from '../controllers/report.controller';

const router = express.Router();

router.use(authenticate);

// Financials
router.get('/financials', getFinancialReport);

// Operations (Peak Hours)
router.get('/operations', getOperationalReport);

// Inventory Value
router.get('/inventory-value', getInventoryValuation);

// Customers
router.get('/customers', getCustomerAnalytics);

// Fraud/Audit
router.get('/fraud-stats', getFraudStats);

export default router;
