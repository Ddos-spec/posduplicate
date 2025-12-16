import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Using inline for now as in original code

/**
 * Login
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' }
      });
    }

    // Find user
    // Explicitly select fields to ensure we only get what exists in the DB
    // and avoid any schema-DB mismatch (like missing printerSettings column)
// This is a bulk semantic replacement, I will try to target specific blocks to be safe or use multiple replace calls.
// Let's perform replacements block by block.

// Fix 1: Login Select
    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        name: true,
        role_id: true,
        tenant_id: true,
        outlet_id: true,
        is_active: true,
        last_login: true,
        created_at: true,
        updated_at: true,
        roles: true,
        tenants_users_tenant_idTotenants: true, // This relationship name seems auto-generated and ugly. "tenants" might be ambiguous or named differently.
        outlets: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account is inactive'
        }
      });
    }

    // Check tenant status (if not Super Admin)
    if (user.roles.name !== 'Super Admin') {
      if (!user.tenants_users_tenant_idTotenants || !user.tenants_users_tenant_idTotenants.is_active) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TENANT_INACTIVE',
            message: 'Tenant account is inactive'
          }
        });
      }

      // Check subscription
      if (user.tenants_users_tenant_idTotenants.subscription_status !== 'active' && user.tenants_users_tenant_idTotenants.subscription_status !== 'trial') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_EXPIRED',
            message: 'Subscription expired'
          }
        });
      }
    }

    // Update last login
    await prisma.users.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        roleId: user.role_id,
        roleName: user.roles.name,
        tenantId: user.tenant_id,
        outletId: user.outlet_id
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user as any;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      },
      message: 'Login successful'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Register (create new user)
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, roleId, tenantId, outletId } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email, password, and name are required' }
      });
    }

    // Check if email exists
    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Email already registered' }
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.users.create({
      data: {
        email,
        password_hash: passwordHash,
        name,
        role_id: roleId,
        tenant_id: tenantId,
        outlet_id: outletId
      },
      include: {
        roles: true,
        tenants_users_tenant_idTotenants: true,
        outlets: true
      }
    });

    const { password_hash: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      data: userWithoutPassword,
      message: 'User registered successfully'
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get current user info
 */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
        const user = await prisma.users.findUnique({
          where: { id: req.userId },
          include: {
            roles: true,
            tenants_users_tenant_idTotenants: true,
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
    
        const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Change password
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Current and new password are required' }
      });
    }

    const user = await prisma.users.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' }
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.users.update({
      where: { id: req.userId },
      data: { password_hash: passwordHash }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    return next(error);
  }
};
