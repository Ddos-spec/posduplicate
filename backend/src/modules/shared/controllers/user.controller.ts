import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../../../utils/prisma';

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

    if (!user) {
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

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.users.create({
      data: {
        name,
        email,
        password_hash: passwordHash,
        tenant_id: req.tenantId,
        outlet_id: outletId || null,
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
        created_at: true
      }
    });

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

    if (name) data.name = name;
    if (email) data.email = email;
    if (password) {
      data.password_hash = await bcrypt.hash(password, 10);
    }
    if (roleId !== undefined) data.role_id = roleId;
    if (outletId !== undefined) data.outlet_id = outletId;
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
        created_at: true
      }
    });

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

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: { id: parseInt(id) },
      data: { password_hash: passwordHash }
    });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    return next(error);
  }
};

// Delete user (soft delete by setting inactive)
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.users.update({
      where: { id: parseInt(id) },
      data: { is_active: false }
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    return next(error);
  }
};
