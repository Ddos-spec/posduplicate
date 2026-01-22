import { Router } from 'express';
import { roleMiddleware } from '../../../middlewares/role.middleware';
import * as taxController from '../controllers/accounting.tax.controller';

const router = Router();

// Tax Configuration CRUD
/**
 * @swagger
 * /api/accounting/tax/config:
 *   get:
 *     tags: [Accounting]
 *     summary: Get tax configurations
 *     responses:
 *       200:
 *         description: Tax configuration list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/config', taxController.getTaxConfigs);
/**
 * @swagger
 * /api/accounting/tax/config/{id}:
 *   get:
 *     tags: [Accounting]
 *     summary: Get tax configuration by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tax configuration detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/config/:id', taxController.getTaxConfigById);
/**
 * @swagger
 * /api/accounting/tax/config:
 *   post:
 *     tags: [Accounting]
 *     summary: Create tax configuration
 *     description: Owner/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Tax configuration created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/config', roleMiddleware(['Owner', 'Super Admin']), taxController.createTaxConfig);
/**
 * @swagger
 * /api/accounting/tax/config/{id}:
 *   patch:
 *     tags: [Accounting]
 *     summary: Update tax configuration
 *     description: Owner/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Tax configuration updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/config/:id', roleMiddleware(['Owner', 'Super Admin']), taxController.updateTaxConfig);
/**
 * @swagger
 * /api/accounting/tax/config/{id}:
 *   delete:
 *     tags: [Accounting]
 *     summary: Delete tax configuration
 *     description: Owner/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tax configuration deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/config/:id', roleMiddleware(['Owner', 'Super Admin']), taxController.deleteTaxConfig);

// Tax Transactions CRUD
/**
 * @swagger
 * /api/accounting/tax/transactions:
 *   get:
 *     tags: [Accounting]
 *     summary: Get tax transactions
 *     responses:
 *       200:
 *         description: Tax transaction list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/transactions', taxController.getTaxTransactions);
/**
 * @swagger
 * /api/accounting/tax/transactions:
 *   post:
 *     tags: [Accounting]
 *     summary: Create tax transaction
 *     description: Owner/Manager/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Tax transaction created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/transactions', roleMiddleware(['Owner', 'Super Admin', 'Manager']), taxController.createTaxTransaction);
/**
 * @swagger
 * /api/accounting/tax/transactions/{id}:
 *   patch:
 *     tags: [Accounting]
 *     summary: Update tax transaction status
 *     description: Owner/Manager/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Tax transaction updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/transactions/:id', roleMiddleware(['Owner', 'Super Admin', 'Manager']), taxController.updateTaxTransactionStatus);
/**
 * @swagger
 * /api/accounting/tax/transactions/{id}:
 *   delete:
 *     tags: [Accounting]
 *     summary: Delete tax transaction
 *     description: Owner/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tax transaction deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/transactions/:id', roleMiddleware(['Owner', 'Super Admin']), taxController.deleteTaxTransaction);

// Tax Reports
/**
 * @swagger
 * /api/accounting/tax/reports/summary:
 *   get:
 *     tags: [Accounting]
 *     summary: Get tax summary report
 *     responses:
 *       200:
 *         description: Tax summary report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/reports/summary', taxController.getTaxSummary);
/**
 * @swagger
 * /api/accounting/tax/reports/spt:
 *   get:
 *     tags: [Accounting]
 *     summary: Generate SPT report
 *     responses:
 *       200:
 *         description: SPT report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/reports/spt', taxController.generateSPTReport);

export default router;
