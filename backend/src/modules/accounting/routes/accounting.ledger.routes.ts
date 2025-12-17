import express from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import * as ledgerController from '../controllers/accounting.ledger.controller';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/', ledgerController.getLedgerEntries);

export default router;
