import { Request, Response } from 'express';
import prisma from '../../../utils/prisma';
import {
  canInitiateOperationalChange,
  createOperationalChangeRequest,
  isPrivilegedChangeRole,
  shouldQueueOperationalChange
} from '../../shared/services/changeApproval.service';

export const ensureOperationalChangeAccess = (req: Request, res: Response) => {
  if (canInitiateOperationalChange(req.userRole)) {
    return true;
  }

  res.status(403).json({
    success: false,
    error: {
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'Role ini tidak diizinkan melakukan perubahan operasional.'
    }
  });
  return false;
};

export const ensureOperationalReason = (req: Request, res: Response, reason: unknown) => {
  if (isPrivilegedChangeRole(req.userRole)) {
    return true;
  }

  if (typeof reason === 'string' && reason.trim().length > 0) {
    return true;
  }

  res.status(400).json({
    success: false,
    error: {
      code: 'REASON_REQUIRED',
      message: 'Alasan perubahan wajib diisi.'
    }
  });
  return false;
};

const getRequesterIdentity = async (req: Request) => {
  const fallbackName = req.userRole || 'User';

  if (!req.userId) {
    return {
      id: 0,
      name: fallbackName
    };
  }

  const user = await prisma.users.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true }
  });

  return {
    id: req.userId,
    name: user?.name || fallbackName
  };
};

interface QueueOperationalChangeOptions {
  req: Request;
  res: Response;
  entityType: string;
  actionType: string;
  entityId?: number | null;
  entityLabel?: string | null;
  reason: string;
  payload: Record<string, any>;
  summary?: Record<string, any> | null;
  message: string;
}

export const maybeQueueOperationalChange = async ({
  req,
  res,
  entityType,
  actionType,
  entityId = null,
  entityLabel = null,
  reason,
  payload,
  summary,
  message
}: QueueOperationalChangeOptions) => {
  const shouldQueue = await shouldQueueOperationalChange(req.tenantId, req.userRole);
  if (!shouldQueue) {
    return false;
  }

  const requester = await getRequesterIdentity(req);
  const resolvedOutletIdRaw = req.outletId ?? payload.outletId ?? payload.outlet_id ?? summary?.outletId ?? null;
  const resolvedOutletId = resolvedOutletIdRaw === null || resolvedOutletIdRaw === undefined || resolvedOutletIdRaw === ''
    ? null
    : Number(resolvedOutletIdRaw);

  const record = await createOperationalChangeRequest({
    tenantId: req.tenantId || 0,
    outletId: Number.isFinite(resolvedOutletId) ? resolvedOutletId : null,
    requesterId: requester.id,
    requesterName: requester.name,
    requesterRole: req.userRole || 'Staff',
    entityType,
    actionType,
    entityId,
    entityLabel,
    reason,
    payload,
    summary
  });

  res.status(202).json({
    success: true,
    approvalRequired: true,
    data: record,
    message
  });

  return true;
};
