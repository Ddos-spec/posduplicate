import { Router } from 'express';
import {
  getSalesReport,
  getStockReport,
} from '../controllers/ownerApi.controller';
import { apiKeyAuth } from '../middlewares/apiKey.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Apply rate limiting specifically for external API to prevent abuse
// Limit: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.'
    }
  }
});

// Apply security and rate limiting middleware
router.use(apiLimiter);
router.use(apiKeyAuth);

// === SIMPLE & EASY API ENDPOINTS ===

// 1. Laporan Penjualan (Sales Report)
// Endpoint: GET /api/owner/reports/sales
router.get('/reports/sales', getSalesReport);

// 2. Laporan Transaksi (Transaction Report)
// Endpoint: GET /api/owner/reports/transactions
router.get('/reports/transactions', getSalesReport);

// 3. Laporan Stok (Stock Report)
// Endpoint: GET /api/owner/reports/stock
router.get('/reports/stock', getStockReport);

export default router;