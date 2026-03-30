import { Request, Response, NextFunction } from 'express';
import {
  approveOperationalChangeRequest,
  getPendingOperationalChangeNotifications,
  listOperationalChangeRequests,
  rejectOperationalChangeRequest
} from '../services/changeApproval.service';

export const getOperationalChangeRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_ID_REQUIRED', message: 'Tenant ID is required' }
      });
    }

    const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
    const requests = await listOperationalChangeRequests(req.tenantId, status as any, Number(req.query.limit || 50));

    return res.json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    return next(error);
  }
};

export const getOperationalChangeNotificationFeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_ID_REQUIRED', message: 'Tenant ID is required' }
      });
    }

    const requests = await getPendingOperationalChangeNotifications(req.tenantId, Number(req.query.limit || 12));
    return res.json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    return next(error);
  }
};

export const approveOperationalChange = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId || !req.userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_CONTEXT_REQUIRED', message: 'Tenant context is required' }
      });
    }

    const approverName = req.body?.approverName || req.userRole || 'Owner';
    const requestId = Number(req.params.id);
    const result = await approveOperationalChangeRequest(req.tenantId, requestId, req.userId, String(approverName));

    return res.json({
      success: true,
      data: result,
      message: 'Perubahan berhasil di-approve dan diterapkan.'
    });
  } catch (error) {
    return next(error);
  }
};

export const rejectOperationalChange = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId || !req.userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_CONTEXT_REQUIRED', message: 'Tenant context is required' }
      });
    }

    const rejectionReason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: { code: 'REJECTION_REASON_REQUIRED', message: 'Alasan penolakan wajib diisi.' }
      });
    }

    const approverName = req.body?.approverName || req.userRole || 'Owner';
    const requestId = Number(req.params.id);
    const result = await rejectOperationalChangeRequest(req.tenantId, requestId, req.userId, String(approverName), rejectionReason);

    return res.json({
      success: true,
      data: result,
      message: 'Permintaan perubahan berhasil ditolak.'
    });
  } catch (error) {
    return next(error);
  }
};
