import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createActivityLog } from './activity-log.controller';
import { normalizeEmailIdentity } from '../../../utils/email';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

/**
 * Login
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body;
    const email = normalizeEmailIdentity(req.body.email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' }
      });
    }

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
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    // Remove password hash from response
    const { password_hash: _passwordHash, ...userWithoutPassword } = user;

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
 * Register a new tenant and its Owner user.
 *
 * Security invariant: role, tenant and outlet identifiers are never accepted
 * from the public request. They are derived and created by the server.
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password, name, businessName, phone, address } = req.body;
    const email = normalizeEmailIdentity(req.body.email);

    if (!email || !password || !name || !businessName) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email, password, name, and business name are required' }
      });
    }

    const user = await prisma.$transaction(async (tx) => {
      const [existingUser, existingTenant, ownerRole] = await Promise.all([
        tx.users.findUnique({ where: { email } }),
        tx.tenants.findUnique({ where: { email } }),
        tx.roles.findUnique({ where: { name: 'Owner' } })
      ]);

      if (existingUser || existingTenant) {
        throw new Error('EMAIL_EXISTS');
      }
      if (!ownerRole) {
        throw new Error('OWNER_ROLE_NOT_FOUND');
      }

      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + 14);

      const tenant = await tx.tenants.create({
        data: {
          business_name: String(businessName).trim(),
          owner_name: String(name).trim(),
          email,
          phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
          address: typeof address === 'string' && address.trim() ? address.trim() : null,
          subscription_plan: 'basic',
          subscription_status: 'trial',
          subscription_starts_at: new Date(),
          subscription_expires_at: trialExpiresAt,
          is_active: true,
          onboarding_completed: false,
          onboarding_step: 1
        }
      });

      const passwordHash = await bcrypt.hash(password, 10);
      return tx.users.create({
        data: {
          email,
          password_hash: passwordHash,
          name: String(name).trim(),
          role_id: ownerRole.id,
          tenant_id: tenant.id,
          outlet_id: null
        },
        include: {
          roles: true,
          tenants_users_tenant_idTotenants: true,
          outlets: true
        }
      });
    });

    const { password_hash: _passwordHash, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      data: userWithoutPassword,
      message: 'Tenant and owner registered successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Email already registered' }
      });
    }
    if (error instanceof Error && error.message === 'OWNER_ROLE_NOT_FOUND') {
      return res.status(500).json({
        success: false,
        error: { code: 'CONFIGURATION_ERROR', message: 'Owner role is not configured' }
      });
    }
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
 * Update current user profile
 */
export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;

    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name is required' }
      });
    }

    const existingUser = await prisma.users.findUnique({
      where: { id: req.userId },
      include: {
        roles: true,
        tenants_users_tenant_idTotenants: true,
        outlets: true
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    const updatedUser = await prisma.users.update({
      where: { id: existingUser.id },
      data: { name: name.trim() },
      include: {
        roles: true,
        tenants_users_tenant_idTotenants: true,
        outlets: true
      }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'user_update',
        'user',
        updatedUser.id,
        {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role_id: existingUser.role_id,
          role_name: existingUser.roles?.name ?? null,
          outlet_id: existingUser.outlet_id ?? null,
          outlet_name: existingUser.outlets?.name ?? null,
          is_active: existingUser.is_active
        },
        {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role_id: updatedUser.role_id,
          role_name: updatedUser.roles?.name ?? null,
          outlet_id: updatedUser.outlet_id ?? null,
          outlet_name: updatedUser.outlets?.name ?? null,
          is_active: updatedUser.is_active
        },
        'Updated own profile name',
        updatedUser.outlet_id ?? null
      );
    } catch (logError) {
      console.error('Failed to create self profile update log:', logError);
    }

    const { password_hash, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      data: userWithoutPassword,
      message: 'Profile updated successfully'
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
    if (typeof newPassword !== 'string' || newPassword.length < 10) {
      return res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: 'New password must be at least 10 characters' }
      });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'PASSWORD_REUSE', message: 'New password must be different from current password' }
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
