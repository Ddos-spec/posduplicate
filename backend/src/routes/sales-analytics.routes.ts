import { Router } from 'express';
import {
  getAllSalesTransactions,
  getSalesTransactionById,
  createSalesTransaction,
  bulkCreateSalesTransactions,
  getAnalyticsSummary,
  getNetSalesTrend,
  getTopSellingItems,
  getSalesByCategory,
  getSalesByPaymentMethod
} from '../controllers/sales-analytics.controller';

const router = Router();

// Get all sales transactions
router.get('/transactions', getAllSalesTransactions);

// Get single sales transaction
router.get('/transactions/:id', getSalesTransactionById);

// Create sales transaction
router.post('/transactions', createSalesTransaction);

// Bulk create sales transactions
router.post('/transactions/bulk', bulkCreateSalesTransactions);

// Get analytics summary
router.get('/summary', getAnalyticsSummary);

// Get net sales trend (for chart)
router.get('/trend', getNetSalesTrend);

// Get top selling items
router.get('/top-items', getTopSellingItems);

// Get sales by category
router.get('/by-category', getSalesByCategory);

// Get sales by payment method
router.get('/by-payment', getSalesByPaymentMethod);

export default router;
