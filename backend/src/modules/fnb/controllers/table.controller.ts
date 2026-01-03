import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { safeParseInt } from '../../../utils/validation';

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

export const getTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, outlet_id } = req.query;
    const where: any = { is_active: true };

    // Tenant isolation - use correct field name tenant_id
    if (req.tenantId) {
      const outletIds = await getTenantOutletIds(req.tenantId);
      if (outletIds.length === 0) {
        return res.json({ success: true, data: [], count: 0 });
      }
      where.outlet_id = { in: outletIds };
    }

    if (status) where.status = status;

    // Specific outlet filter with tenant validation
    if (outlet_id) {
      const parsedOutletId = safeParseInt(outlet_id);
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

    const tables = await prisma.tables.findMany({
      where,
      include: { outlets: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: tables, count: tables.length });
  } catch (error) {
    return next(error);
  }
};

export const getAvailableTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { outlet_id } = req.query;
    const where: any = { is_active: true, status: 'available' };

    // Tenant isolation
    if (req.tenantId) {
      const outletIds = await getTenantOutletIds(req.tenantId);
      if (outletIds.length === 0) {
        return res.json({ success: true, data: [], count: 0 });
      }
      where.outlet_id = { in: outletIds };
    }

    // Specific outlet filter with tenant validation
    if (outlet_id) {
      const parsedOutletId = safeParseInt(outlet_id);
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

    const tables = await prisma.tables.findMany({ where, orderBy: { name: 'asc' } });
    res.json({ success: true, data: tables, count: tables.length });
  } catch (error) {
    return next(error);
  }
};

export const updateTableStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const tableId = safeParseInt(id);

    // Validate table exists and belongs to tenant
    const existing = await prisma.tables.findUnique({
      where: { id: tableId },
      include: { outlets: true }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Table not found' }
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

    // Validate status value
    const validStatuses = ['available', 'occupied', 'reserved', 'cleaning'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Status must be one of: ${validStatuses.join(', ')}` }
      });
    }

    const table = await prisma.tables.update({
      where: { id: tableId },
      data: { status }
    });

    res.json({ success: true, data: table, message: 'Table status updated' });
  } catch (error) {
    return next(error);
  }
};

export const createTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, capacity, outletId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Table name is required' }
      });
    }

    if (!outletId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Outlet ID is required' }
      });
    }

    const parsedOutletId = safeParseInt(outletId);

    // Validate outlet belongs to tenant
    if (req.tenantId) {
      const outlet = await prisma.outlets.findFirst({
        where: { id: parsedOutletId, tenant_id: req.tenantId }
      });
      if (!outlet) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Access denied to this outlet' }
        });
      }
    }

    const table = await prisma.tables.create({
      data: {
        name,
        capacity: safeParseInt(capacity, 4),
        outlet_id: parsedOutletId,
        status: 'available',
        is_active: true
      }
    });

    res.status(201).json({ success: true, data: table, message: 'Table created successfully' });
  } catch (error) {
    return next(error);
  }
};

export const deleteTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tableId = safeParseInt(id);

    // Validate table exists and belongs to tenant
    const existing = await prisma.tables.findUnique({
      where: { id: tableId },
      include: { outlets: true }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Table not found' }
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

    await prisma.tables.update({
      where: { id: tableId },
      data: { is_active: false }
    });

    res.json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    return next(error);
  }
};
