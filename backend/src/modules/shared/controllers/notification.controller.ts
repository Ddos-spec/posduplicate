import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

export const getAdminNotifications = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const expiringSoonTenants = await prisma.tenants.findMany({
      where: {
        is_active: true,
        subscription_status: 'active',
        subscription_expires_at: {
          lte: thirtyDaysFromNow,
          gte: now,
        },
      },
      select: {
        id: true,
        business_name: true,
        subscription_expires_at: true,
      },
    });

    const overdueTenants = await prisma.tenants.findMany({
      where: {
        is_active: true,
        subscription_status: { not: 'active' },
        subscription_expires_at: {
          lt: now,
        },
      },
      select: {
        id: true,
        business_name: true,
        subscription_expires_at: true,
      },
    });

    const notifications = [
      ...expiringSoonTenants.map(tenant => ({
        id: `expiring-${tenant.id}`,
        type: 'expiring',
        message: `Tenant "${tenant.business_name}" subscription is expiring soon.`,
        details: `Expires on ${new Date(tenant.subscription_expires_at!).toLocaleDateString('id-ID')}`,
        tenantId: tenant.id,
        createdAt: tenant.subscription_expires_at?.toISOString(),
      })),
      ...overdueTenants.map(tenant => ({
        id: `overdue-${tenant.id}`,
        type: 'overdue',
        message: `Tenant "${tenant.business_name}" subscription is overdue.`,
        details: `Expired on ${new Date(tenant.subscription_expires_at!).toLocaleDateString('id-ID')}`,
        tenantId: tenant.id,
        createdAt: tenant.subscription_expires_at?.toISOString(),
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
      res.status(400).json({
        success: false,
        error: {
          code: 'TENANT_ID_REQUIRED',
          message: 'Tenant ID is required'
        }
      });
      return;
    }

    const now = new Date();

    // Get subscription-related notifications for this tenant
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        business_name: true,
        subscription_expires_at: true,
        subscription_status: true,
        next_billing_date: true,
      },
    });

    // If tenant not found, return empty notifications instead of error
    // This could happen if tenant was deleted but user still has old token
    if (!tenant) {
      res.json({
        success: true,
        data: [],
        count: 0,
      });
      return;
    }

    const notifications = [];

    // Check subscription expiration
    if (tenant.subscription_expires_at) {
      const daysUntilExpiry = Math.ceil(
        (new Date(tenant.subscription_expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (tenant.subscription_status === 'active' && daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
        notifications.push({
          id: `subscription-expiring-${tenant.id}`,
          type: 'expiring',
          message: `Your subscription is expiring in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}.`,
          details: `Current subscription expires on ${new Date(tenant.subscription_expires_at).toLocaleDateString('id-ID')}`,
          tenantId: tenant.id,
          createdAt: tenant.subscription_expires_at?.toISOString(),
        });
      } else if (tenant.subscription_status !== 'active' && new Date(tenant.subscription_expires_at) < now) {
        notifications.push({
          id: `subscription-overdue-${tenant.id}`,
          type: 'overdue',
          message: `Your subscription has expired.`,
          details: `Expired on ${new Date(tenant.subscription_expires_at).toLocaleDateString('id-ID')}`,
          tenantId: tenant.id,
          createdAt: tenant.subscription_expires_at?.toISOString(),
        });
      }
    }

    // Check for next billing date (if within 7 days)
    if (tenant.next_billing_date) {
      const daysUntilBilling = Math.ceil(
        (new Date(tenant.next_billing_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilBilling <= 7 && daysUntilBilling >= 0) {
        notifications.push({
          id: `billing-reminder-${tenant.id}`,
          type: 'billing',
          message: `Next billing is due in ${daysUntilBilling} day${daysUntilBilling !== 1 ? 's' : ''}.`,
          details: `Billing date: ${new Date(tenant.next_billing_date).toLocaleDateString('id-ID')}`,
          tenantId: tenant.id,
          createdAt: tenant.next_billing_date?.toISOString(),
        });
      }
    }

    // Get transaction status changes from activity logs (Last 24 hours)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Find users belonging to this tenant to filter logs
    const tenantUsers = await prisma.users.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, name: true }
    });
    const tenantUserIds = tenantUsers.map(u => u.id);

    if (tenantUserIds.length > 0) {
      const recentActivityLogs = await prisma.activity_logs.findMany({
        where: {
          user_id: { in: tenantUserIds },
          action_type: 'UPDATE_TRANSACTION_STATUS',
          created_at: { gte: twentyFourHoursAgo }
        },
        include: {
          users: { select: { name: true } } // Get actor name
        },
        orderBy: { created_at: 'desc' }
      });

      for (const log of recentActivityLogs) {
        // Safe casting for JSON fields
        const newValue = log.new_value as { status?: string } | null;
        const status = newValue?.status || 'unknown';
        const reason = log.reason || 'No reason provided';
        const actorName = log.users?.name || 'Unknown User';

        // Only notify for sensitive statuses
        if (['cancelled', 'void', 'failed', 'refund'].includes(status)) {
           notifications.push({
            id: `activity-log-${log.id}`,
            type: 'transaction_alert', // New type
            message: `Transaction status changed to ${status.toUpperCase()} by ${actorName}`,
            details: `Reason: ${reason}`,
            tenantId: tenant.id,
            createdAt: log.created_at?.toISOString(),
          });
        }
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
