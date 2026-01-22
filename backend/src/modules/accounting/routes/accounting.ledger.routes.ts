import express from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import * as ledgerController from '../controllers/accounting.ledger.controller';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @swagger
 * /api/accounting/ledger:
 *   get:
 *     tags: [Accounting]
 *     summary: Get general ledger entries
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: General ledger entries
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
router.get('/', ledgerController.getLedgerEntries);

export default router;
