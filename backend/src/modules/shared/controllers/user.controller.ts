import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../../../utils/prisma';
import { createActivityLog } from './activity-log.controller';

const normalizeReason = (value: unknown, fallback: string) => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
};

const buildUserLogSnapshot = (user: any) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role_id: user.role_id ?? user.roles?.id ?? null,
  role_name: user.roles?.name ?? null,
  outlet_id: user.outlet_id ?? null,
  outlet_name: user.outlets?.name ?? null,
  is_active: user.is_active
});

const ensureTenantOutletAccess = async (tenantId: number | undefined, outletId: number | null | undefined) => {
  if (!tenantId || !outletId) {
    return true;
  }

  const outlet = await prisma.outlets.findUnique({
    where: { id: outletId },
    select: { id: true, tenant_id: true }
  });

  return Boolean(outlet && outlet.tenant_id === tenantId);
};

// Get all users (employees)
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { outlet_id } = req.query;
    const where: any = {};

    if (req.tenantId) {
      where.tenant_id = req.tenantId;
    }

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    // Exclude Super Admin users (roleId = 1) from tenant/owner views
    where.role_id = {
      not: 1
    };

    const users = await prisma.users.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        outlet_id: true,
        tenant_id: true,
        roles: {
          select: {
            id: true,
            name: true
          }
        },
        last_login: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    });

    const data = users.map(({ is_active, outlet_id, tenant_id, last_login, created_at, ...rest }) => ({
      ...rest,
      isActive: is_active,
      outletId: outlet_id,
      tenantId: tenant_id,
      lastLogin: last_login,
      createdAt: created_at
    }));

    res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        outlet_id: true,
        tenant_id: true,
        roles: {
          select: {
            id: true,
            name: true
          }
        },
        last_login: true,
        created_at: true
      }
    });

    if (!user || (req.tenantId && user.tenant_id !== req.tenantId)) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    const data = user
      ? {
          ...user,
          isActive: user.is_active,
          outletId: user.outlet_id,
          tenantId: user.tenant_id,
          lastLogin: user.last_login,
          createdAt: user.created_at
        }
      : user;

    res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

// Create new user
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, roleId, outletId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, email and password are required' }
      });
    }

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Email already exists' }
      });
    }

    const normalizedOutletId = outletId ? Number(outletId) : null;
    const canAccessOutlet = await ensureTenantOutletAccess(req.tenantId, normalizedOutletId);
    if (!canAccessOutlet) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCESS_DENIED', message: 'Access to outlet denied' }
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.users.create({
      data: {
        name,
        email,
        password_hash: passwordHash,
        tenant_id: req.tenantId,
        outlet_id: normalizedOutletId,
        role_id: roleId || 3, // Default to Cashier role (assuming ID 3)
        is_active: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        outlet_id: true,
        roles: {
          select: {
            id: true,
            name: true
          }
        },
        outlets: {
          select: {
            id: true,
            name: true
          }
        },
        created_at: true
      }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'user_create',
        'user',
        user.id,
        null,
        buildUserLogSnapshot(user),
        normalizeReason(req.body.reason, 'Created user account'),
        user.outlet_id || null
      );
    } catch (logError) {
      console.error('Failed to create user activity log:', logError);
    }

    res.status(201).json({
      success: true,
      data: {
        ...user,
        isActive: user.is_active,
        outletId: user.outlet_id,
        createdAt: user.created_at
      },
      message: 'User created successfully'
    });
  } catch (error) {
    return next(error);
  }
};

// Update user
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, email, password, roleId, outletId, isActive } = req.body;

    const data: any = {};

    const existingUser = await prisma.users.findUnique({
      where: { id: parseInt(id) },
      include: {
        roles: {
          select: {
            id: true,
            name: true
          }
        },
        outlets: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!existingUser || (req.tenantId && existingUser.tenant_id !== req.tenantId)) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    if (existingUser.id === req.userId && isActive === false) {
      return res.status(400).json({
        success: false,
        error: { code: 'SELF_ACTION', message: 'Cannot deactivate your own account' }
      });
    }

    if (name) data.name = name;
    if (email) {
      const normalizedEmail = String(email).trim();
      const emailOwner = await prisma.users.findUnique({
        where: { email: normalizedEmail },
        select: { id: true }
      });

      if (emailOwner && emailOwner.id !== existingUser.id) {
        return res.status(400).json({
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'Email already exists' }
        });
      }

      data.email = normalizedEmail;
    }
    if (password) {
      data.password_hash = await bcrypt.hash(password, 10);
    }
    if (roleId !== undefined) data.role_id = roleId;
    if (outletId !== undefined) {
      const normalizedOutletId = outletId ? Number(outletId) : null;
      const canAccessOutlet = await ensureTenantOutletAccess(req.tenantId, normalizedOutletId);
      if (!canAccessOutlet) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Access to outlet denied' }
        });
      }
      data.outlet_id = normalizedOutletId;
    }
    if (isActive !== undefined) data.is_active = isActive;

    const user = await prisma.users.update({
      where: { id: parseInt(id) },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        outlet_id: true,
        roles: {
          select: {
            id: true,
            name: true
          }
        },
        outlets: {
          select: {
            id: true,
            name: true
          }
        },
        created_at: true
      }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'user_update',
        'user',
        user.id,
        buildUserLogSnapshot(existingUser),
        buildUserLogSnapshot(user),
        normalizeReason(req.body.reason, 'Updated user account'),
        user.outlet_id ?? existingUser.outlet_id ?? null
      );
    } catch (logError) {
      console.error('Failed to create user update log:', logError);
    }

    res.json({
      success: true,
      data: {
        ...user,
        isActive: user.is_active,
        outletId: user.outlet_id,
        createdAt: user.created_at
      },
      message: 'User updated successfully'
    });
  } catch (error) {
    return next(error);
  }
};

// Reset user password (by admin/owner)
export const resetUserPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'New password is required' }
      });
    }

    const existingUser = await prisma.users.findUnique({
      where: { id: parseInt(id) },
      include: {
        roles: {
          select: {
            id: true,
            name: true
          }
        },
        outlets: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!existingUser || (req.tenantId && existingUser.tenant_id !== req.tenantId)) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    if (existingUser.id === req.userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'SELF_ACTION', message: 'Use change password for your own account' }
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: { id: parseInt(id) },
      data: { password_hash: passwordHash }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'user_password_reset',
        'user',
        existingUser.id,
        buildUserLogSnapshot(existingUser),
        buildUserLogSnapshot(existingUser),
        normalizeReason(req.body.reason, 'Reset user password'),
        existingUser.outlet_id ?? null
      );
    } catch (logError) {
      console.error('Failed to create password reset log:', logError);
    }

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    return next(error);
  }
};

// Delete user (soft delete by setting inactive)
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.users.findUnique({
      where: { id: parseInt(id) },
      include: {
        roles: {
          select: {
            id: true,
            name: true
          }
        },
        outlets: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!existingUser || (req.tenantId && existingUser.tenant_id !== req.tenantId)) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    if (existingUser.id === req.userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'SELF_ACTION', message: 'Cannot delete your own account' }
      });
    }

    await prisma.users.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });

    try {
      await createActivityLog(
        req.userId || 0,
        'user_delete',
        'user',
        existingUser.id,
        buildUserLogSnapshot(existingUser),
        null,
        normalizeReason(req.body?.reason, 'Deactivated user account'),
        existingUser.outlet_id ?? null
      );
    } catch (logError) {
      console.error('Failed to create user delete log:', logError);
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    return next(error);
  }
};
