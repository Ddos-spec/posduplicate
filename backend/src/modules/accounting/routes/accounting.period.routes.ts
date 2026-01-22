import express from 'express';
import { authMiddleware, roleMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import * as periodController from '../controllers/accounting.period.controller';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @swagger
 * /api/accounting/periods:
 *   get:
 *     tags: [Accounting]
 *     summary: Get accounting periods
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accounting period list
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
router.get('/', periodController.getPeriods);
/**
 * @swagger
 * /api/accounting/periods:
 *   post:
 *     tags: [Accounting]
 *     summary: Create accounting period
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
 *         description: Accounting period created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', roleMiddleware(['Owner', 'Super Admin']), periodController.createPeriod);
/**
 * @swagger
 * /api/accounting/periods/{id}/close:
 *   post:
 *     tags: [Accounting]
 *     summary: Close accounting period
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
 *         description: Accounting period closed
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/close', roleMiddleware(['Owner', 'Super Admin']), periodController.closePeriod);

export default router;
