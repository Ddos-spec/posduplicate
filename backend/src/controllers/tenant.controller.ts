import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * Get all tenants (Super Admin only)
 */
export const getAllTenants = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, plan, search } = req.query;

    const where: any = {};

    if (status) {
      where.subscriptionStatus = status;
    }

    if (plan) {
      where.subscriptionPlan = plan;
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search as string, mode: 'insensitive' } },
        { ownerName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        outlets: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            outlets: true,
            users: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: tenants,
      count: tenants.length
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get tenant by ID
 */
export const getTenantById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id: parseInt(id) },
      include: {
        outlets: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            roles: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'Tenant not found'
        }
      });
    }

    res.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Create new tenant
 */
export const createTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      businessName,
      ownerName,
      email,
      phone,
      address
    } = req.body;

    // Validation
    if (!businessName || !ownerName || !email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Business name, owner name, and email are required'
        }
      });
    }

    // Check if email already exists
    const existing = await prisma.tenant.findUnique({
      where: { email }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already registered'
        }
      });
    }

    // Set subscription dates (now 500k/month for all)
    const now = new Date();
    const firstBillingDate = new Date();
    firstBillingDate.setMonth(firstBillingDate.getMonth() + 1); // First billing in 1 month

    const tenant = await prisma.tenant.create({
      data: {
        businessName,
        ownerName,
        email,
        phone,
        address,
        subscriptionPlan: 'pro', // All tenants get Pro plan at 500k
        subscriptionStatus: 'active',
        subscriptionStartsAt: now,
        subscriptionExpiresAt: firstBillingDate,
        nextBillingDate: firstBillingDate,
        maxOutlets: 5,
        maxUsers: 20,
        features: {
          pos: true,
          inventory: true,
          reports: true,
          multiOutlet: true,
          analytics: true
        }
      }
    });

    res.status(201).json({
      success: true,
      data: tenant,
      message: 'Tenant created successfully'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update tenant
 */
export const updateTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow email update through this endpoint
    delete updateData.email;

    const tenant = await prisma.tenant.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      data: tenant,
      message: 'Tenant updated successfully'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Activate/Deactivate tenant
 */
export const toggleTenantStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id: parseInt(id) },
      data: { isActive }
    });

    res.json({
      success: true,
      data: tenant,
      message: `Tenant ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update subscription
 */
export const updateSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { plan, status, expiresAt } = req.body;

    const updateData: any = {};

    if (plan) {
      updateData.subscriptionPlan = plan;
      // Update limits based on plan
      switch (plan) {
        case 'basic':
          updateData.maxOutlets = 1;
          updateData.maxUsers = 5;
          break;
        case 'pro':
          updateData.maxOutlets = 5;
          updateData.maxUsers = 20;
          break;
        case 'enterprise':
          updateData.maxOutlets = 999;
          updateData.maxUsers = 999;
          break;
      }
    }

    if (status) {
      updateData.subscriptionStatus = status;
    }

    if (expiresAt) {
      updateData.subscriptionExpiresAt = new Date(expiresAt);
    }

    const tenant = await prisma.tenant.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      data: tenant,
      message: 'Subscription updated successfully'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get current tenant info (for logged-in tenant admin)
 */
export const getMyTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_TENANT',
          message: 'No tenant associated with this user'
        }
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      include: {
        outlets: true,
        _count: {
          select: {
            outlets: true,
            users: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete tenant (soft delete)
 */
export const deleteTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.update({
      where: { id: parseInt(id) },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });

    res.json({
      success: true,
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};
