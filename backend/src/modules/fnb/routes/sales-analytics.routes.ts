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
/**
 * @swagger
 * /api/sales-analytics/transactions:
 *   get:
 *     tags: [Sales Analytics]
 *     summary: Get sales transactions
 *     responses:
 *       200:
 *         description: Sales transactions list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/transactions', getAllSalesTransactions);

// Get single sales transaction
/**
 * @swagger
 * /api/sales-analytics/transactions/{id}:
 *   get:
 *     tags: [Sales Analytics]
 *     summary: Get sales transaction by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sales transaction detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/transactions/:id', getSalesTransactionById);

// Create sales transaction
/**
 * @swagger
 * /api/sales-analytics/transactions:
 *   post:
 *     tags: [Sales Analytics]
 *     summary: Create sales transaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Sales transaction created
 */
router.post('/transactions', createSalesTransaction);

// Bulk create sales transactions
/**
 * @swagger
 * /api/sales-analytics/transactions/bulk:
 *   post:
 *     tags: [Sales Analytics]
 *     summary: Bulk create sales transactions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Sales transactions created
 */
router.post('/transactions/bulk', bulkCreateSalesTransactions);

// Get analytics summary
/**
 * @swagger
 * /api/sales-analytics/summary:
 *   get:
 *     tags: [Sales Analytics]
 *     summary: Get sales analytics summary
 *     responses:
 *       200:
 *         description: Sales analytics summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/summary', getAnalyticsSummary);

// Get net sales trend (for chart)
/**
 * @swagger
 * /api/sales-analytics/trend:
 *   get:
 *     tags: [Sales Analytics]
 *     summary: Get net sales trend
 *     responses:
 *       200:
 *         description: Net sales trend data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/trend', getNetSalesTrend);

// Get top selling items
/**
 * @swagger
 * /api/sales-analytics/top-items:
 *   get:
 *     tags: [Sales Analytics]
 *     summary: Get top selling items
 *     responses:
 *       200:
 *         description: Top selling items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/top-items', getTopSellingItems);

// Get sales by category
/**
 * @swagger
 * /api/sales-analytics/by-category:
 *   get:
 *     tags: [Sales Analytics]
 *     summary: Get sales by category
 *     responses:
 *       200:
 *         description: Sales by category
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/by-category', getSalesByCategory);

// Get sales by payment method
/**
 * @swagger
 * /api/sales-analytics/by-payment:
 *   get:
 *     tags: [Sales Analytics]
 *     summary: Get sales by payment method
 *     responses:
 *       200:
 *         description: Sales by payment method
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/by-payment', getSalesByPaymentMethod);

export default router;
