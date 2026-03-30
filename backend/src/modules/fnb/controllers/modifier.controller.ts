import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { safeParseInt } from '../../../utils/validation';
import { createActivityLog } from '../../shared/controllers/activity-log.controller';
import {
  ensureOperationalChangeAccess,
  ensureOperationalReason,
  maybeQueueOperationalChange
} from './changeControl.helpers';

const buildModifierLogSnapshot = (modifier: any) => ({
  id: modifier.id,
  name: modifier.name,
  price: modifier.price,
  outlet_id: modifier.outlet_id,
  is_active: modifier.is_active
});

const normalizeReason = (value: unknown, fallback: string) => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
};

/**
 * Get tenant outlet IDs for isolation
 */
const getTenantOutletIds = async (tenantId: number | undefined): Promise<number[]> => {
  if (!tenantId) return [];
  const outlets = await prisma.outlets.findMany({
    where: { tenant_id: tenantId },
    select: { id: true }
  });
  return outlets.map(o => o.id);
};

export const getModifiers = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    const outletId = req.query.outlet_id;
    const where: any = activeOnly ? { is_active: true } : {};

    // Tenant isolation
    if (req.tenantId) {
      const outletIds = await getTenantOutletIds(req.tenantId);
      if (outletIds.length === 0) {
        return res.json({ success: true, data: [], count: 0 });
      }
      where.outlet_id = { in: outletIds };
    }

    // Specific outlet filter
    if (outletId) {
      const parsedOutletId = safeParseInt(outletId);
      // Validate outlet belongs to tenant
      if (req.tenantId) {
        const outletIds = await getTenantOutletIds(req.tenantId);
        if (!outletIds.includes(parsedOutletId)) {
          return res.status(403).json({
            success: false,
            error: { code: 'ACCESS_DENIED', message: 'Access denied to this outlet' }
          });
        }
      }
      where.outlet_id = parsedOutletId;
    }

    const modifiers = await prisma.modifiers.findMany({
      where,
      include: {
        outlets: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: modifiers, count: modifiers.length });
  } catch (error) {
    return _next(error);
  }
};

export const createModifier = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { name, price, outletId } = req.body;

    if (!ensureOperationalChangeAccess(req, res)) {
      return;
    }
    if (!ensureOperationalReason(req, res, req.body.reason)) {
      return;
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Modifier name is required' }
      });
    }

    if (!outletId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Outlet ID is required' }
      });
    }

    // Validate outlet belongs to tenant
    if (req.tenantId) {
      const outlet = await prisma.outlets.findFirst({
        where: { id: safeParseInt(outletId), tenant_id: req.tenantId }
      });
      if (!outlet) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Access denied to this outlet' }
        });
      }
    }

    if (await maybeQueueOperationalChange({
      req,
      res,
      entityType: 'modifier',
      actionType: 'modifier_create',
      entityLabel: String(name),
      reason: req.body.reason,
      payload: req.body,
      summary: {
        name,
        price: price || 0,
        outletId: safeParseInt(outletId)
      },
      message: 'Permintaan modifier baru dikirim untuk approval owner.'
    })) {
      return;
    }

    const modifier = await prisma.modifiers.create({
      data: {
        name,
        price: price || 0,
        outlet_id: safeParseInt(outletId),
        is_active: true
      }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'modifier_create',
        'modifier',
        modifier.id,
        null,
        buildModifierLogSnapshot(modifier),
        normalizeReason(req.body.reason, 'Created modifier'),
        modifier.outlet_id || null
      );
    } catch (logError) {
      console.error('Failed to create modifier activity log:', logError);
    }

    res.status(201).json({ success: true, data: modifier, message: 'Modifier created successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const updateModifier = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, price, isActive } = req.body;
    const modifierId = safeParseInt(id);

    if (!ensureOperationalChangeAccess(req, res)) {
      return;
    }
    if (!ensureOperationalReason(req, res, req.body.reason)) {
      return;
    }

    // Check modifier exists and belongs to tenant
    const existing = await prisma.modifiers.findUnique({
      where: { id: modifierId },
      include: { outlets: true }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Modifier not found' }
      });
    }

    // Tenant isolation check
    if (req.tenantId && existing.outlets) {
      if (existing.outlets.tenant_id !== req.tenantId) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Access denied' }
        });
      }
    }

    if (await maybeQueueOperationalChange({
      req,
      res,
      entityType: 'modifier',
      actionType: 'modifier_update',
      entityId: existing.id,
      entityLabel: String(name || existing.name || `#${existing.id}`),
      reason: req.body.reason,
      payload: {
        ...req.body,
        id: existing.id
      },
      summary: {
        name: name || existing.name,
        price: price ?? existing.price,
        changes: ['name', 'price', 'isActive'].filter((key) => req.body[key] !== undefined),
        outletId: existing.outlet_id
      },
      message: 'Perubahan modifier dikirim untuk approval owner.'
    })) {
      return;
    }

    const modifier = await prisma.modifiers.update({
      where: { id: modifierId },
      data: {
        ...(name && { name }),
        ...(price !== undefined && { price }),
        ...(isActive !== undefined && { is_active: isActive })
      }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'modifier_update',
        'modifier',
        modifier.id,
        buildModifierLogSnapshot(existing),
        buildModifierLogSnapshot(modifier),
        normalizeReason(req.body.reason, 'Updated modifier'),
        modifier.outlet_id || existing.outlet_id || null
      );
    } catch (logError) {
      console.error('Failed to create modifier update log:', logError);
    }

    res.json({ success: true, data: modifier, message: 'Modifier updated successfully' });
  } catch (error) {
    return _next(error);
  }
};

export const deleteModifier = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const modifierId = safeParseInt(id);

    if (!ensureOperationalChangeAccess(req, res)) {
      return;
    }
    if (!ensureOperationalReason(req, res, req.body?.reason)) {
      return;
    }

    // Check modifier exists and belongs to tenant
    const existing = await prisma.modifiers.findUnique({
      where: { id: modifierId },
      include: { outlets: true }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Modifier not found' }
      });
    }

    // Tenant isolation check
    if (req.tenantId && existing.outlets) {
      if (existing.outlets.tenant_id !== req.tenantId) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Access denied' }
        });
      }
    }

    if (await maybeQueueOperationalChange({
      req,
      res,
      entityType: 'modifier',
      actionType: 'modifier_delete',
      entityId: existing.id,
      entityLabel: existing.name,
      reason: req.body.reason,
      payload: {
        id: existing.id,
        reason: req.body.reason
      },
      summary: {
        name: existing.name,
        price: existing.price,
        outletId: existing.outlet_id
      },
      message: 'Permintaan hapus modifier dikirim untuk approval owner.'
    })) {
      return;
    }

    await prisma.modifiers.update({
      where: { id: modifierId },
      data: { is_active: false }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'modifier_delete',
        'modifier',
        existing.id,
        buildModifierLogSnapshot(existing),
        null,
        normalizeReason(req.body?.reason, 'Soft deleted modifier'),
        existing.outlet_id || null
      );
    } catch (logError) {
      console.error('Failed to create modifier delete log:', logError);
    }

    res.json({ success: true, message: 'Modifier deleted successfully' });
  } catch (error) {
    return _next(error);
  }
};
