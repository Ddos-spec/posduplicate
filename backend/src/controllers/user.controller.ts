import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';

// Get all users (employees)
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        tenantId: req.tenantId
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        roles: {
          select: {
            name: true
          }
        },
        lastLogin: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
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
        },
        lastLogin: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// Create new user
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, roleId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, email and password are required' }
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Email already exists' }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        tenantId: req.tenantId,
        roleId: roleId || 2, // Default to Cashier role
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        roles: {
          select: {
            name: true
          }
        },
        createdAt: true
      }
    });

    res.status(201).json({ success: true, data: user, message: 'User created successfully' });
  } catch (error) {
    next(error);
  }
};

// Update user
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, email, password, roleId, isActive } = req.body;

    const data: any = {};

    if (name) data.name = name;
    if (email) data.email = email;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    if (roleId !== undefined) data.roleId = roleId;
    if (isActive !== undefined) data.isActive = isActive;

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        roles: {
          select: {
            name: true
          }
        },
        createdAt: true
      }
    });

    res.json({ success: true, data: user, message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};

// Delete user (soft delete by setting inactive)
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
