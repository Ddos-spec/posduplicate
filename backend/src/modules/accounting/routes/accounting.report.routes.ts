import express from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import * as reportController from '../controllers/accounting.report.controller';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @swagger
 * /api/accounting/reports/trial-balance:
 *   get:
 *     tags: [Accounting]
 *     summary: Get trial balance report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trial balance report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/trial-balance', reportController.getTrialBalance);
/**
 * @swagger
 * /api/accounting/reports/income-statement:
 *   get:
 *     tags: [Accounting]
 *     summary: Get income statement report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Income statement report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/income-statement', reportController.getIncomeStatement);
/**
 * @swagger
 * /api/accounting/reports/balance-sheet:
 *   get:
 *     tags: [Accounting]
 *     summary: Get balance sheet report
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Balance sheet report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/balance-sheet', reportController.getBalanceSheet);

export default router;
