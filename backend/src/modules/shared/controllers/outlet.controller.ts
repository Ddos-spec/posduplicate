import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { createActivityLog } from './activity-log.controller';

const normalizeReason = (value: unknown, fallback: string) => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
};

const buildOutletLogSnapshot = (outlet: any) => ({
  id: outlet.id,
  tenant_id: outlet.tenant_id,
  name: outlet.name,
  address: outlet.address,
  phone: outlet.phone,
  email: outlet.email,
  npwp: outlet.npwp,
  settings: outlet.settings,
  is_active: outlet.is_active
});

/**
 * Get all outlets (filtered by tenant)
 */
export const getOutlets = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { is_active } = req.query;
    const where: any = {};

    // Tenant isolation
    if (req.tenantId) {
      where.tenant_id = req.tenantId;
    }

    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const outlets = await prisma.outlets.findMany({
      where,
      include: {
        tenants: {
          select: {
            id: true,
            business_name: true,
            email: true
          }
        },
        _count: {
          select: {
            users: true,
            items: true,
            transactions: true
          }
      }
    },
      orderBy: { created_at: 'desc' }
    });

    res.json({
      success: true,
      data: outlets.map((outlet) => {
        const { tenants, ...rest } = outlet;
        return {
          ...rest,
          tenants: tenants
            ? {
                ...tenants,
                businessName: tenants.business_name
              }
            : null
        };
      }),
      count: outlets.length
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Get outlet by ID
 */
export const getOutletById = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { id } = req.params;

    const outlet = await prisma.outlets.findUnique({
      where: { id: parseInt(id) },
      include: {
        tenants: {
          select: {
            id: true,
            business_name: true,
            owner_name: true,
            email: true
          }
        },
        _count: {
          select: {
            users: true,
            items: true,
            transactions: true
          }
        }
      }
    });

    if (!outlet) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'OUTLET_NOT_FOUND',
          message: 'Outlet not found'
        }
      });
    }

    // Tenant isolation check
    if (req.tenantId && outlet.tenant_id !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    res.json({
      success: true,
      data: outlet.tenants
        ? {
            ...outlet,
            tenants: {
              ...outlet.tenants,
              businessName: outlet.tenants.business_name,
              ownerName: outlet.tenants.owner_name
            }
          }
        : outlet
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Create new outlet
 */
export const createOutlet = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { name, address, phone, email, npwp, settings } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Outlet name is required'
        }
      });
    }

    // Check tenant limits
    if (req.tenantId) {
      const tenant = await prisma.tenants.findUnique({
        where: { id: req.tenantId },
        select: {
          max_outlets: true,
          _count: {
            select: { outlets: true }
          }
        }
      });

      if (tenant && tenant._count.outlets >= (tenant.max_outlets || 1)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'OUTLET_LIMIT_REACHED',
            message: `Maximum outlet limit (${tenant.max_outlets}) reached. Please upgrade your plan.`
          }
        });
      }
    }

    const outlet = await prisma.outlets.create({
      data: {
        tenant_id: req.tenantId,
        name,
        address,
        phone,
        email,
        npwp,
        settings: settings || {
          taxRate: 10,
          serviceCharge: 5,
          receiptFooter: 'Thank you for your visit!',
          currency: 'IDR',
          timezone: 'Asia/Jakarta'
        },
        is_active: true
      },
      include: {
        tenants: {
          select: {
            id: true,
            business_name: true
          }
        }
      }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'outlet_create',
        'outlet',
        outlet.id,
        null,
        buildOutletLogSnapshot(outlet),
        normalizeReason(req.body.reason, 'Created outlet'),
        outlet.id
      );
    } catch (logError) {
      console.error('Failed to create outlet activity log:', logError);
    }

    res.status(201).json({
      success: true,
      data: outlet.tenants
        ? {
            ...outlet,
            tenants: {
              ...outlet.tenants,
              businessName: outlet.tenants.business_name
            }
          }
        : outlet,
      message: 'Outlet created successfully'
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Update outlet
 */
export const updateOutlet = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, address, phone, email, npwp, settings, isActive } = req.body;

    // Check if outlet exists and belongs to tenant
    const existing = await prisma.outlets.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'OUTLET_NOT_FOUND',
          message: 'Outlet not found'
        }
      });
    }

    if (req.tenantId && existing.tenant_id !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (address !== undefined) data.address = address;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (npwp !== undefined) data.npwp = npwp;
    if (settings !== undefined) data.settings = settings;
    if (isActive !== undefined) data.is_active = isActive;

    const outlet = await prisma.outlets.update({
      where: { id: parseInt(id) },
      data,
      include: {
        tenants: {
          select: {
            id: true,
            business_name: true
          }
        }
      }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'outlet_update',
        'outlet',
        outlet.id,
        buildOutletLogSnapshot(existing),
        buildOutletLogSnapshot(outlet),
        normalizeReason(req.body.reason, 'Updated outlet'),
        outlet.id
      );
    } catch (logError) {
      console.error('Failed to create outlet update log:', logError);
    }

    res.json({
      success: true,
      data: outlet.tenants
        ? {
            ...outlet,
            tenants: {
              ...outlet.tenants,
              businessName: outlet.tenants.business_name
            }
          }
        : outlet,
      message: 'Outlet updated successfully'
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Delete outlet (soft delete)
 */
export const deleteOutlet = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if outlet exists and belongs to tenant
    const existing = await prisma.outlets.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'OUTLET_NOT_FOUND',
          message: 'Outlet not found'
        }
      });
    }

    if (req.tenantId && existing.tenant_id !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    await prisma.outlets.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'outlet_delete',
        'outlet',
        existing.id,
        buildOutletLogSnapshot(existing),
        null,
        normalizeReason(req.body?.reason, 'Deactivated outlet'),
        existing.id
      );
    } catch (logError) {
      console.error('Failed to create outlet delete log:', logError);
    }

    res.json({
      success: true,
      message: 'Outlet deactivated successfully'
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Get outlet settings
 */
export const getOutletSettings = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { id } = req.params;

    const outlet = await prisma.outlets.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        tenant_id: true,
        name: true,
        settings: true
      }
    });

    if (!outlet) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'OUTLET_NOT_FOUND',
          message: 'Outlet not found'
        }
      });
    }

    if (req.tenantId && outlet.tenant_id !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    res.json({
      success: true,
      data: {
        id: outlet.id,
        name: outlet.name,
        settings: outlet.settings
      }
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Update outlet settings
 */
export const updateOutletSettings = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason, ...settings } = req.body;

    const existing = await prisma.outlets.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'OUTLET_NOT_FOUND',
          message: 'Outlet not found'
        }
      });
    }

    if (req.tenantId && existing.tenant_id !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    const outlet = await prisma.outlets.update({
      where: { id: parseInt(id) },
      data: { settings }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'outlet_update',
        'outlet',
        outlet.id,
        buildOutletLogSnapshot(existing),
        buildOutletLogSnapshot(outlet),
        normalizeReason(reason, 'Updated outlet settings'),
        outlet.id
      );
    } catch (logError) {
      console.error('Failed to create outlet settings log:', logError);
    }

    res.json({
      success: true,
      data: outlet,
      message: 'Outlet settings updated successfully'
    });
  } catch (error) {
    return _next(error);
  }
};
