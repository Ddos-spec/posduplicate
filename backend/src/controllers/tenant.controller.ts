import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';

/**
 * Get all tenants (Super Admin only)
...
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
      password, // Password for the owner
      phone,
      address
    } = req.body;

    // Validation
    if (!businessName || !ownerName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Business name, owner name, email, and password are required'
        }
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if email already exists for a tenant or a user
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new Error('EMAIL_EXISTS');
      }

      // 2. Get the 'Owner' role
      const ownerRole = await tx.role.findUnique({ where: { name: 'Owner' } });
      if (!ownerRole) {
        throw new Error('OWNER_ROLE_NOT_FOUND');
      }

      // 3. Set subscription dates and plan details
      const now = new Date();
      const firstBillingDate = new Date();
      firstBillingDate.setMonth(firstBillingDate.getMonth() + 1);

      // 4. Create the tenant
      const tenant = await tx.tenant.create({
        data: {
          businessName,
          ownerName,
          email,
          phone,
          address,
          subscriptionPlan: 'pro',
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

      // 5. Hash the password and create the owner user
      const hashedPassword = await bcrypt.hash(password, 10);
      await tx.user.create({
        data: {
          name: ownerName,
          email: email,
          passwordHash: hashedPassword,
          tenantId: tenant.id,
          roleId: ownerRole.id,
          isActive: true
        }
      });

      return tenant;
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Tenant and Owner account created successfully'
    });
  } catch (error: any) {
    if (error.message === 'EMAIL_EXISTS') {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Email already registered' }
      });
    }
    if (error.message === 'OWNER_ROLE_NOT_FOUND') {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_CONFIG_ERROR', message: 'Owner role is not configured in the database' }
      });
    }
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

    await prisma.tenant.update({
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
