import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

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
      where.tenantId = req.tenantId;
    }

    if (is_active !== undefined) {
      where.isActive = is_active === 'true';
    }

    const outlets = await prisma.outlet.findMany({
      where,
      include: {
        tenant: {
          select: {
            id: true,
            businessName: true,
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
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: outlets,
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

    const outlet = await prisma.outlet.findUnique({
      where: { id: parseInt(id) },
      include: {
        tenant: {
          select: {
            id: true,
            businessName: true,
            ownerName: true,
            email: true
          }
        },
        _count: {
          select: {
            users: true,
            items: true,
            transactions: true,
            employees: true
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
    if (req.tenantId && outlet.tenantId !== req.tenantId) {
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
      data: outlet
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
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.tenantId },
        select: {
          maxOutlets: true,
          _count: {
            select: { outlets: true }
          }
        }
      });

      if (tenant && tenant._count.outlets >= (tenant.maxOutlets || 1)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'OUTLET_LIMIT_REACHED',
            message: `Maximum outlet limit (${tenant.maxOutlets}) reached. Please upgrade your plan.`
          }
        });
      }
    }

    const outlet = await prisma.outlet.create({
      data: {
        tenantId: req.tenantId,
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
        isActive: true
      },
      include: {
        tenant: {
          select: {
            id: true,
            businessName: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: outlet,
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
    const existing = await prisma.outlet.findUnique({
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

    if (req.tenantId && existing.tenantId !== req.tenantId) {
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
    if (isActive !== undefined) data.isActive = isActive;

    const outlet = await prisma.outlet.update({
      where: { id: parseInt(id) },
      data,
      include: {
        tenant: {
          select: {
            id: true,
            businessName: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: outlet,
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
    const existing = await prisma.outlet.findUnique({
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

    if (req.tenantId && existing.tenantId !== req.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }

    await prisma.outlet.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

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

    const outlet = await prisma.outlet.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
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

    res.json({
      success: true,
      data: outlet
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
    const settings = req.body;

    const outlet = await prisma.outlet.update({
      where: { id: parseInt(id) },
      data: { settings }
    });

    res.json({
      success: true,
      data: outlet,
      message: 'Outlet settings updated successfully'
    });
  } catch (error) {
    return _next(error);
  }
};
