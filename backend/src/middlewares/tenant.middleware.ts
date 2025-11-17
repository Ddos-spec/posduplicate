import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

// Extend Express Request to include tenant info
declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
      tenant?: any;
      userId?: number;
      userRole?: string;
    }
  }
}

/**
 * Tenant Middleware - Data Isolation
 * Automatically filter all queries by tenant_id
 * Prevents users from accessing other tenant's data
 */
export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user info from JWT (assume auth middleware runs first)
    const userId = req.userId; // Set by auth middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Get user with tenant info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        tenants: true,
        outlets: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive'
        }
      });
    }

    // Super Admin can access all tenants (no filtering)
    if (user.roles?.name === 'Super Admin') {
      req.userRole = 'Super Admin';
      req.userId = user.id;
      return next();
    }

    // Regular users must belong to a tenant
    if (!user.tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NO_TENANT',
          message: 'User is not associated with any tenant'
        }
      });
    }

    // Check tenant status
    if (user.tenants && !user.tenants.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_INACTIVE',
          message: 'Tenant account is inactive'
        }
      });
    }

    // Check subscription status
    if (user.tenants && user.tenants.subscriptionStatus !== 'active' && user.tenants.subscriptionStatus !== 'trial') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Tenant subscription has expired'
        }
      });
    }

    // Attach tenant info to request
    req.tenantId = user.tenantId;
    req.tenant = user.tenants;
    req.userId = user.id;
    req.userRole = user.roles?.name;

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

/**
 * Optional: Super Admin Only Middleware
 * Restrict endpoints to super admin only
 */
export const superAdminOnly = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.userRole !== 'Super Admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'This action requires super admin privileges'
      }
    });
  }
  return next();
};

/**
 * Optional: Owner/Admin Only Middleware
 * Restrict endpoints to tenant owners/admins
 */
export const ownerOnly = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const allowedRoles = ['Super Admin', 'Owner', 'Manager'];
  if (!allowedRoles.includes(req.userRole || '')) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'This action requires owner or manager privileges'
      }
    });
  }
  return next();
};
