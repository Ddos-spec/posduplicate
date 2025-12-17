import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';

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

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        business_name: true,
        owner_name: true,
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

    // Merge tenant data with settings JSON
    const settingsData = typeof tenant.settings === 'object' ? tenant.settings : {};

    res.json({
      success: true,
      data: {
        id: tenant.id,
        businessName: tenant.business_name,
        ownerName: tenant.owner_name,
        email: tenant.email,
        phone: tenant.phone,
        address: tenant.address,
        ...settingsData
      }
    });
  } catch (error) {
    return next(error);
  }
};

// Update tenant settings
export const updateSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const updateData = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_ID_REQUIRED',
          message: 'Tenant ID is required'
        }
      });
    }

    // Get current tenant data
    const currentTenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { settings: true }
    });

    // Fields that go directly to tenant table
    const tenantFieldMap: Record<string, string> = {
      businessName: 'business_name',
      ownerName: 'owner_name',
      email: 'email',
      phone: 'phone',
      address: 'address'
    };
    const tenantData: any = {};
    const settingsData: any = typeof currentTenant?.settings === 'object' ? { ...currentTenant.settings } : {};

    // Separate tenant fields from settings fields
    Object.keys(updateData).forEach(key => {
      const mappedKey = tenantFieldMap[key];
      if (mappedKey) {
        tenantData[mappedKey] = updateData[key];
      } else {
        settingsData[key] = updateData[key];
      }
    });

    // Update tenant with both direct fields and merged settings
    const updatedTenant = await prisma.tenants.update({
      where: { id: tenantId },
      data: {
        ...tenantData,
        settings: settingsData,
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        id: updatedTenant.id,
        businessName: updatedTenant.business_name,
        ownerName: updatedTenant.owner_name,
        email: updatedTenant.email,
        phone: updatedTenant.phone,
        address: updatedTenant.address,
        ...settingsData
      }
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

    // Get user with password
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, password_hash: true }
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
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

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
    await prisma.users.update({
      where: { id: userId },
      data: { password_hash: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    return next(error);
  }
};
