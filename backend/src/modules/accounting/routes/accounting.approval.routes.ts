import express from 'express';
import { authMiddleware, roleMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import * as approvalController from '../controllers/accounting.approval.controller';

const router = express.Router();

// Middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

// ===== Configuration =====
router.get('/config', approvalController.getApprovalConfig);
router.put('/config', roleMiddleware(['Owner', 'Super Admin']), approvalController.updateApprovalConfig);

// ===== Approval Requests =====
router.post('/request', approvalController.createApprovalRequest);
router.get('/pending', approvalController.getPendingApprovals);
router.get('/stats', approvalController.getApprovalStats);

// ===== Approval Actions =====
router.post('/:requestId/approve', approvalController.approveRequest);
router.post('/:requestId/reject', approvalController.rejectRequest);
router.post('/:requestId/delegate', approvalController.delegateApproval);

// ===== History =====
router.get('/history/:entityType/:entityId', approvalController.getApprovalHistory);

export default router;
