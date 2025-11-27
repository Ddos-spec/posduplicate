import { Router } from 'express';
import {
  getDashboardSummary,
  getSalesTrend,
  getTopProducts,
  getSalesByCategory,
  getRecentTransactions
} from '../controllers/dashboard.controller';
import { getCashierPerformance } from '../controllers/cashier.analytics.controller';
import {
  getTransactionAnalytics,
  getTransactionAnalyticsSummary,
  getTransactionAnalyticsTrend
} from '../controllers/transaction-analytics.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/dashboard/summary
 * Get dashboard summary (total sales, transactions, products, customers)
 * Query params: outletId, startDate, endDate
 */
router.get('/summary', getDashboardSummary);

/**
 * GET /api/dashboard/sales-trend
 * Get sales trend data for charts
 * Query params: days (default: 7), outletId
 */
router.get('/sales-trend', getSalesTrend);

/**
 * GET /api/dashboard/top-products
 * Get top selling products
 * Query params: limit (default: 5)
 */
router.get('/top-products', getTopProducts);

/**
 * GET /api/dashboard/sales-by-category
 * Get sales breakdown by category
 */
router.get('/sales-by-category', getSalesByCategory);

/**
 * GET /api/dashboard/recent-transactions
 * Get recent transactions
 * Query params: limit (default: 10)
 */
router.get('/recent-transactions', getRecentTransactions);

/**
 * GET /api/dashboard/cashier-performance
 * Get cashier performance metrics
 * Query params: days (default: 30)
 */
router.get('/cashier-performance', getCashierPerformance);

/**
 * GET /api/dashboard/transaction-analytics
 * Get detailed transaction analytics (for reports page)
 * Query params: outlet_id, date_from, date_to, category, limit
 */
router.get('/transaction-analytics', getTransactionAnalytics);

/**
 * GET /api/dashboard/transaction-analytics/summary
 * Get transaction analytics summary
 * Query params: outlet_id, date_from, date_to
 */
router.get('/transaction-analytics/summary', getTransactionAnalyticsSummary);

/**
 * GET /api/dashboard/transaction-analytics/trend
 * Get transaction analytics trend data
 * Query params: outlet_id, date_from, date_to
 */
router.get('/transaction-analytics/trend', getTransactionAnalyticsTrend);

export default router;
