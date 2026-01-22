import { Router } from 'express';
import { roleMiddleware } from '../../../middlewares/role.middleware';
import * as reconController from '../controllers/accounting.reconciliation.controller';

const router = Router();

// Bank Reconciliation CRUD
/**
 * @swagger
 * /api/accounting/reconciliation:
 *   get:
 *     tags: [Accounting]
 *     summary: Get reconciliations
 *     responses:
 *       200:
 *         description: Reconciliation list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/', reconController.getReconciliations);
/**
 * @swagger
 * /api/accounting/reconciliation/unmatched-gl:
 *   get:
 *     tags: [Accounting]
 *     summary: Get unmatched GL entries
 *     responses:
 *       200:
 *         description: Unmatched GL entries
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/unmatched-gl', reconController.getUnmatchedGLEntries);
/**
 * @swagger
 * /api/accounting/reconciliation/{id}:
 *   get:
 *     tags: [Accounting]
 *     summary: Get reconciliation by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reconciliation detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.get('/:id', reconController.getReconciliationById);
/**
 * @swagger
 * /api/accounting/reconciliation:
 *   post:
 *     tags: [Accounting]
 *     summary: Create reconciliation
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
 *         description: Reconciliation created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', roleMiddleware(['Owner', 'Super Admin', 'Manager']), reconController.createReconciliation);
/**
 * @swagger
 * /api/accounting/reconciliation/{id}/detail:
 *   post:
 *     tags: [Accounting]
 *     summary: Add reconciliation detail
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
 *       201:
 *         description: Reconciliation detail added
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/detail', roleMiddleware(['Owner', 'Super Admin', 'Manager']), reconController.addReconciliationDetail);
/**
 * @swagger
 * /api/accounting/reconciliation/{id}/detail/{detailId}/match:
 *   patch:
 *     tags: [Accounting]
 *     summary: Match reconciliation detail to journal
 *     description: Owner/Manager/Super Admin only
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: detailId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detail matched
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/detail/:detailId/match', roleMiddleware(['Owner', 'Super Admin', 'Manager']), reconController.matchDetailToJournal);
/**
 * @swagger
 * /api/accounting/reconciliation/{id}/complete:
 *   post:
 *     tags: [Accounting]
 *     summary: Complete reconciliation
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
 *         description: Reconciliation completed
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/complete', roleMiddleware(['Owner', 'Super Admin']), reconController.completeReconciliation);
/**
 * @swagger
 * /api/accounting/reconciliation/{id}:
 *   delete:
 *     tags: [Accounting]
 *     summary: Delete reconciliation
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
 *         description: Reconciliation deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', roleMiddleware(['Owner', 'Super Admin']), reconController.deleteReconciliation);

export default router;
