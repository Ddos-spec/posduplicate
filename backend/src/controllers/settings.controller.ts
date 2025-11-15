import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

interface AuthRequest extends Request {
  userId?: number;
  tenantId?: number;
  userRole?: string;
}

// Get tenant settings
export const getSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_ID_REQUIRED',
          message: 'Tenant ID is required'
        }
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        businessName: true,
        ownerName: true,
        email: true,
        phone: true,
        address: true,
        settings: true,
        features: true
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

// Update tenant settings
export const updateSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const {
      businessName,
      ownerName,
      email,
      phone,
      address,
      settings,
      features
    } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_ID_REQUIRED',
          message: 'Tenant ID is required'
        }
      });
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(businessName && { businessName }),
        ...(ownerName && { ownerName }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(address && { address }),
        ...(settings && { settings }),
        ...(features && { features }),
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedTenant
    });
  } catch (error) {
    return next(error);
  }
};

// Change password
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Current password and new password are required'
        }
      });
    }

    const bcrypt = require('bcrypt');

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true }
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

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect'
        }
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    return next(error);
  }
};
