import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';
import { generateApiKey, hashApiKey } from '../utils/apiKeyGenerator';

/**
 * Get all tenants (Super Admin only)
 */
export const getAllTenants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search } = req.query;
    const where: any = { deletedAt: null };

    if (status && status !== 'all') {
      where.subscriptionStatus = status as string;
    }
    if (search) {
      where.OR = [
        { businessName: { contains: search as string, mode: 'insensitive' } },
        { ownerName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const tenants = await prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: tenants });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get single tenant by ID
 */
export const getTenantById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const tenant = await prisma.tenant.findUnique({
            where: { id: parseInt(id) },
        });
        if (!tenant) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } });
        }
        res.json({ success: true, data: tenant });
    } catch (error) {
        return next(error);
    }
};

/**
 * Create new tenant
 */
export const createTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { businessName, ownerName, email, password, phone, address } = req.body;

    if (!businessName || !ownerName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Business name, owner name, email, and password are required' },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new Error('EMAIL_EXISTS');
      }

      const ownerRole = await tx.role.findUnique({ where: { name: 'Owner' } });
      if (!ownerRole) {
        throw new Error('OWNER_ROLE_NOT_FOUND');
      }

      const now = new Date();
      const firstBillingDate = new Date();
      firstBillingDate.setMonth(firstBillingDate.getMonth() + 1);

      const tenant = await tx.tenant.create({
        data: {
          businessName,
          ownerName,
          email,
          phone,
          address,
          subscriptionPlan: 'standard',
          subscriptionStatus: 'active',
          subscriptionStartsAt: now,
          subscriptionExpiresAt: firstBillingDate,
          nextBillingDate: firstBillingDate,
          maxOutlets: 999,
          maxUsers: 999,
          features: {
            pos: true,
            inventory: true,
            reports: true,
            multiOutlet: true,
            analytics: true,
          },
        },
      });

      const hashedPassword = await bcrypt.hash(password, 10);
      await tx.user.create({
        data: {
          name: ownerName,
          email: email,
          passwordHash: hashedPassword,
          tenantId: tenant.id,
          roleId: ownerRole.id,
          isActive: true,
        },
      });

      // Auto-generate API key for the new tenant
      const apiKey = generateApiKey();
      const hashedApiKey = hashApiKey(apiKey);

      await tx.apiKey.create({
        data: {
          tenant_id: tenant.id,
          key_name: 'Default API Key',
          api_key: hashedApiKey,
          is_active: true,
        },
      });

      return { tenant, apiKey };
    });

    res.status(201).json({
      success: true,
      data: result.tenant,
      apiKey: result.apiKey,
      message: 'Tenant and Owner account created successfully. IMPORTANT: Save your API key now, it will not be shown again.',
    });
  } catch (error: any) {
    if (error.message === 'EMAIL_EXISTS') {
      return res.status(400).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Email already registered' } });
    }
    if (error.message === 'OWNER_ROLE_NOT_FOUND') {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_CONFIG_ERROR', message: 'Owner role is not configured in the database' },
      });
    }
    return next(error);
  }
};

/**
 * Update tenant
 */
export const updateTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    delete updateData.email;

    const tenant = await prisma.tenant.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({
      success: true,
      data: tenant,
      message: 'Tenant updated successfully',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Activate/Deactivate tenant
 */
export const toggleTenantStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id: parseInt(id) },
      data: { isActive },
    });

    res.json({
      success: true,
      data: tenant,
      message: `Tenant ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update subscription
 */
export const updateSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, expiresAt } = req.body;
    const updateData: any = {};

    if (status) {
      updateData.subscriptionStatus = status;
    }
    if (expiresAt) {
      updateData.subscriptionExpiresAt = new Date(expiresAt);
    }

    const tenant = await prisma.tenant.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({
      success: true,
      data: tenant,
      message: 'Subscription updated successfully',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get current tenant info (for logged-in tenant admin)
 */
export const getMyTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ success: false, error: { code: 'NO_TENANT', message: 'No tenant associated with this user' } });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      include: {
        _count: {
          select: {
            outlets: true,
            users: true,
          },
        },
      },
    });

    res.json({ success: true, data: tenant });
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete tenant (soft delete)
 */
export const deleteTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = parseInt(id);

    // Perform the soft delete
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    res.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    return next(error);
  }
};
