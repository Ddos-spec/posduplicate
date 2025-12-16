import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// SECURITY: Validate JWT_SECRET is set in production
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

interface JWTPayload {
  userId: number;
  email: string;
  roleId: number;
  roleName: string;
  tenantId?: number;
  outletId?: number;
}

/**
 * Auth Middleware - JWT Verification
 * Verifies JWT token and attaches user info to request
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No authentication token provided'
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

      // Attach user info to request
      req.userId = decoded.userId;
      req.tenantId = decoded.tenantId;
      req.userRole = decoded.roleName;

      return next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Authentication token has expired'
          }
        });
      }

      if (jwtError instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid authentication token'
          }
        });
      }

      throw jwtError;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
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
 * Optional Auth - Don't fail if no token
 * Useful for endpoints that work differently for authenticated users
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, continue without auth
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      req.userId = decoded.userId;
      req.tenantId = decoded.tenantId;
      req.userRole = decoded.roleName;
    } catch (jwtError) {
      // Token invalid, continue without auth
      console.warn('Optional auth: Invalid token, continuing without auth');
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};

/**
 * Role Authorization Middleware
 * Verifies if user has required role
 * Usage: roleMiddleware(['owner', 'manager'])
 */
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Super Admin bypass
    if (req.userRole === 'Super Admin' || req.userRole === 'super_admin') {
      return next();
    }

    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        }
      });
    }

    next();
  };
};
