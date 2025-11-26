import { Router } from 'express';
import {
  getSalesReport,
  getStockReport,
  getTransactionSummary,
  getCashFlowReport,
  getTopSellingItems,
} from '../controllers/ownerApi.controller';
import { apiKeyAuth } from '../middlewares/apiKey.middleware';

const router = Router();

// All routes require API key authentication
router.use(apiKeyAuth);

// Reporting endpoints
router.get('/reports/sales', getSalesReport);
router.get('/reports/stock', getStockReport);
router.get('/reports/transactions', getTransactionSummary);
router.get('/reports/cash-flow', getCashFlowReport);
router.get('/reports/top-items', getTopSellingItems);

export default router;
