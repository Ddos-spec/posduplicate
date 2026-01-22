import { Router } from 'express';
import {
  getSalesReport,
  getStockReport,
} from '../controllers/ownerApi.controller';
import { apiKeyAuth } from '../../../middlewares/apiKey.middleware';
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
/**
 * @swagger
 * /api/owner/reports/sales:
 *   get:
 *     tags: [Owner API]
 *     summary: Get sales report (API key)
 *     description: Requires valid API key
 *     responses:
 *       200:
 *         description: Sales report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/reports/sales', getSalesReport);

// 2. Laporan Transaksi (Transaction Report)
// Endpoint: GET /api/owner/reports/transactions
/**
 * @swagger
 * /api/owner/reports/transactions:
 *   get:
 *     tags: [Owner API]
 *     summary: Get transactions report (API key)
 *     description: Requires valid API key
 *     responses:
 *       200:
 *         description: Transactions report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/reports/transactions', getSalesReport);

// 3. Laporan Stok (Stock Report)
// Endpoint: GET /api/owner/reports/stock
/**
 * @swagger
 * /api/owner/reports/stock:
 *   get:
 *     tags: [Owner API]
 *     summary: Get stock report (API key)
 *     description: Requires valid API key
 *     responses:
 *       200:
 *         description: Stock report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/reports/stock', getStockReport);

export default router;
