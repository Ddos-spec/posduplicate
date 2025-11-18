import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const getAdminNotifications = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const expiringSoonTenants = await prisma.tenant.findMany({
      where: {
        isActive: true,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: {
          lte: thirtyDaysFromNow,
          gte: now,
        },
      },
      select: {
        id: true,
        businessName: true,
        subscriptionExpiresAt: true,
      },
    });

    const overdueTenants = await prisma.tenant.findMany({
      where: {
        isActive: true,
        subscriptionStatus: { not: 'active' },
        subscriptionExpiresAt: {
          lt: now,
        },
      },
      select: {
        id: true,
        businessName: true,
        subscriptionExpiresAt: true,
      },
    });

    const notifications = [
      ...expiringSoonTenants.map(tenant => ({
        id: `expiring-${tenant.id}`,
        type: 'expiring',
        message: `Tenant "${tenant.businessName}" subscription is expiring soon.`,
        details: `Expires on ${new Date(tenant.subscriptionExpiresAt!).toLocaleDateString('id-ID')}`,
        tenantId: tenant.id,
        createdAt: tenant.subscriptionExpiresAt?.toISOString(),
      })),
      ...overdueTenants.map(tenant => ({
        id: `overdue-${tenant.id}`,
        type: 'overdue',
        message: `Tenant "${tenant.businessName}" subscription is overdue.`,
        details: `Expired on ${new Date(tenant.subscriptionExpiresAt!).toLocaleDateString('id-ID')}`,
        tenantId: tenant.id,
        createdAt: tenant.subscriptionExpiresAt?.toISOString(),
      })),
    ];

    // Sort notifications by date
    notifications.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());

    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
    });
    return; // Explicitly return to avoid TypeScript error
  } catch (error) {
    next(error);
  }
};

export const getTenantNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_ID_REQUIRED',
          message: 'Tenant ID is required'
        }
      });
    }

    const now = new Date();

    // Get subscription-related notifications for this tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        businessName: true,
        subscriptionExpiresAt: true,
        subscriptionStatus: true,
        nextBillingDate: true,
      },
    });

    // If tenant not found, return empty notifications instead of error
    // This could happen if tenant was deleted but user still has old token
    if (!tenant) {
      return res.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    const notifications = [];

    // Check subscription expiration
    if (tenant.subscriptionExpiresAt) {
      const daysUntilExpiry = Math.ceil(
        (new Date(tenant.subscriptionExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (tenant.subscriptionStatus === 'active' && daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
        notifications.push({
          id: `subscription-expiring-${tenant.id}`,
          type: 'expiring',
          message: `Your subscription is expiring in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}.`,
          details: `Current subscription expires on ${new Date(tenant.subscriptionExpiresAt).toLocaleDateString('id-ID')}`,
          tenantId: tenant.id,
          createdAt: tenant.subscriptionExpiresAt?.toISOString(),
        });
      } else if (tenant.subscriptionStatus !== 'active' && new Date(tenant.subscriptionExpiresAt) < now) {
        notifications.push({
          id: `subscription-overdue-${tenant.id}`,
          type: 'overdue',
          message: `Your subscription has expired.`,
          details: `Expired on ${new Date(tenant.subscriptionExpiresAt).toLocaleDateString('id-ID')}`,
          tenantId: tenant.id,
          createdAt: tenant.subscriptionExpiresAt?.toISOString(),
        });
      }
    }

    // Check for next billing date (if within 7 days)
    if (tenant.nextBillingDate) {
      const daysUntilBilling = Math.ceil(
        (new Date(tenant.nextBillingDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilBilling <= 7 && daysUntilBilling >= 0) {
        notifications.push({
          id: `billing-reminder-${tenant.id}`,
          type: 'billing',
          message: `Next billing is due in ${daysUntilBilling} day${daysUntilBilling !== 1 ? 's' : ''}.`,
          details: `Billing date: ${new Date(tenant.nextBillingDate).toLocaleDateString('id-ID')}`,
          tenantId: tenant.id,
          createdAt: tenant.nextBillingDate?.toISOString(),
        });
      }
    }

    // Sort notifications by date
    notifications.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
    });
    return; // Explicitly return to avoid TypeScript error
  } catch (error) {
    next(error);
  }
};
