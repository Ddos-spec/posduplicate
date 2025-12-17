import express from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import * as reportController from '../controllers/accounting.report.controller';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/trial-balance', reportController.getTrialBalance);
router.get('/income-statement', reportController.getIncomeStatement);
router.get('/balance-sheet', reportController.getBalanceSheet);

export default router;
