import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export const getAdminNotifications = async (_req: Request, res: Response, next: NextFunction) => {
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
        createdAt: tenant.subscriptionExpiresAt,
      })),
      ...overdueTenants.map(tenant => ({
        id: `overdue-${tenant.id}`,
        type: 'overdue',
        message: `Tenant "${tenant.businessName}" subscription is overdue.`,
        details: `Expired on ${new Date(tenant.subscriptionExpiresAt!).toLocaleDateString('id-ID')}`,
        tenantId: tenant.id,
        createdAt: tenant.subscriptionExpiresAt,
      })),
    ];

    // Sort notifications by date
    notifications.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());

    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
    });
  } catch (error) {
    next(error);
  }
};
