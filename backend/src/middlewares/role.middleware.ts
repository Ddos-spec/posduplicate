import { Request, Response, NextFunction } from 'express';

/**
 * Role-based access control middleware
 * Checks if user has required role to access the endpoint
 * @param allowedRoles - Array of role names that are allowed
 */
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.roleName;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Super Admin has access to everything
    if (userRole === 'super_admin' || userRole === 'Super Admin') {
      return next();
    }

    // Check if user's role is in allowed roles (case-insensitive)
    const normalizedUserRole = userRole.toLowerCase();
    const isAllowed = allowedRoles.some(role => role.toLowerCase() === normalizedUserRole);

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        }
      });
    }

    return next();
  };
};

/**
 * Role-based access control middleware (rest parameter version)
 * Checks if user has required role to access the endpoint
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.roleName;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Super Admin has access to everything
    if (userRole === 'super_admin') {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        }
      });
    }

    return next();
  };
};

/**
 * Require minimum role level
 * Role hierarchy: super_admin > owner > manager > cashier
 */
const roleHierarchy: Record<string, number> = {
  'super_admin': 100,
  'owner': 80,
  'manager': 60,
  'supervisor': 40,
  'cashier': 20,
  'staff': 10
};

export const requireMinRole = (minRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.roleName;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[minRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Minimum role required: ${minRole}`
        }
      });
    }

    return next();
  };
};

/**
 * Check if user is owner or above
 */
export const requireOwner = requireMinRole('owner');

/**
 * Check if user is manager or above
 */
export const requireManager = requireMinRole('manager');

/**
 * Check if user is supervisor or above
 */
export const requireSupervisor = requireMinRole('supervisor');
