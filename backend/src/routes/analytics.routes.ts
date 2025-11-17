import { Router } from 'express';
import {
  getDashboardStats,
  getSalesChart,
  getTopProducts,
  getSalesByCategory,
  getRecentTransactions
} from '../controllers/analytics.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const router = Router();

// All analytics routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// Dashboard stats
router.get('/dashboard', getDashboardStats);

// Sales chart data
router.get('/sales-chart', getSalesChart);

// Top selling products
router.get('/top-products', getTopProducts);

// Sales by category
router.get('/sales-by-category', getSalesByCategory);

// Recent transactions
router.get('/recent-transactions', getRecentTransactions);

export default router;
