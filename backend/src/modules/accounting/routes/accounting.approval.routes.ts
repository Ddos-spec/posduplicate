import express from 'express';
import { authMiddleware, roleMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import * as approvalController from '../controllers/accounting.approval.controller';

const router = express.Router();

// Middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

// ===== Configuration =====
/**
 * @swagger
 * /api/accounting/approval/config:
 *   get:
 *     tags: [Accounting]
 *     summary: Get approval configuration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Approval configuration
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
router.get('/config', approvalController.getApprovalConfig);
/**
 * @swagger
 * /api/accounting/approval/config:
 *   put:
 *     tags: [Accounting]
 *     summary: Update approval configuration
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
 *       200:
 *         description: Approval configuration updated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/config', roleMiddleware(['Owner', 'Super Admin']), approvalController.updateApprovalConfig);

// ===== Approval Requests =====
/**
 * @swagger
 * /api/accounting/approval/request:
 *   post:
 *     tags: [Accounting]
 *     summary: Create approval request
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
 *         description: Approval request created
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/request', approvalController.createApprovalRequest);
/**
 * @swagger
 * /api/accounting/approval/pending:
 *   get:
 *     tags: [Accounting]
 *     summary: Get pending approvals
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending approvals list
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
router.get('/pending', approvalController.getPendingApprovals);
/**
 * @swagger
 * /api/accounting/approval/stats:
 *   get:
 *     tags: [Accounting]
 *     summary: Get approval statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Approval statistics
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
router.get('/stats', approvalController.getApprovalStats);

// ===== Approval Actions =====
/**
 * @swagger
 * /api/accounting/approval/{requestId}/approve:
 *   post:
 *     tags: [Accounting]
 *     summary: Approve request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Approval granted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:requestId/approve', approvalController.approveRequest);
/**
 * @swagger
 * /api/accounting/approval/{requestId}/reject:
 *   post:
 *     tags: [Accounting]
 *     summary: Reject request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Approval rejected
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:requestId/reject', approvalController.rejectRequest);
/**
 * @swagger
 * /api/accounting/approval/{requestId}/delegate:
 *   post:
 *     tags: [Accounting]
 *     summary: Delegate approval
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Approval delegated
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:requestId/delegate', approvalController.delegateApproval);

// ===== History =====
/**
 * @swagger
 * /api/accounting/approval/history/{entityType}/{entityId}:
 *   get:
 *     tags: [Accounting]
 *     summary: Get approval history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Approval history
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
router.get('/history/:entityType/:entityId', approvalController.getApprovalHistory);

export default router;
