import express from 'express';
import { authMiddleware, roleMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { auditLogger } from '../../../middlewares/audit.middleware';
import * as aparController from '../controllers/accounting.apar.controller';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);
router.use(auditLogger);

// AP Routes
/**
 * @swagger
 * /api/accounting/ap:
 *   get:
 *     tags: [Accounting]
 *     summary: Get accounts payable
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accounts payable list
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
router.get('/ap', aparController.getAP);
/**
 * @swagger
 * /api/accounting/ap/{id}/pay:
 *   post:
 *     tags: [Accounting]
 *     summary: Pay accounts payable
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Payment recorded
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/ap/:id/pay', roleMiddleware(['Owner', 'Super Admin', 'Manager']), aparController.payAP);

// AR Routes
/**
 * @swagger
 * /api/accounting/ar:
 *   get:
 *     tags: [Accounting]
 *     summary: Get accounts receivable
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accounts receivable list
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
router.get('/ar', aparController.getAR);
/**
 * @swagger
 * /api/accounting/ar/{id}/collect:
 *   post:
 *     tags: [Accounting]
 *     summary: Collect accounts receivable
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Collection recorded
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/ar/:id/collect', roleMiddleware(['Owner', 'Super Admin', 'Manager']), aparController.collectAR);

export default router;
