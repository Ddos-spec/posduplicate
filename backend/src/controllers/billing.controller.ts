import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * Get billing history for all tenants (Super Admin)
 */
export const getBillingHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, limit = '50' } = req.query;

    // For now, we'll get tenants with their subscription info
    // In production, you'd have a separate billing/payment table
    const where: any = {};
    if (status) {
      where.subscriptionStatus = status;
    }

    const billingRecords = await prisma.tenant.findMany({
      where,
      select: {
        id: true,
        businessName: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStartsAt: true,
        subscriptionExpiresAt: true,
        nextBillingDate: true,
        lastPaymentAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string)
    });

    // Transform to billing format
    const result = billingRecords.map(tenant => ({
      id: tenant.id,
      tenant: tenant.businessName,
      plan: tenant.subscriptionPlan || 'basic',
      status: tenant.subscriptionStatus || 'trial',
      startDate: tenant.subscriptionStartsAt,
      expiresAt: tenant.subscriptionExpiresAt,
      nextBilling: tenant.nextBillingDate,
      lastPayment: tenant.lastPaymentAt
    }));

    res.json({ success: true, data: result, count: result.length });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get subscription plans
 */
export const getSubscriptionPlans = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Return a single default plan as tiered plans are removed
    const defaultPlan = [
      {
        id: 1,
        name: 'Standard',
        price: 0, // Price is handled manually
        features: [
          'All Features Included'
        ]
      }
    ];
    res.json({ success: true, data: defaultPlan });
  } catch (error) {
    return next(error);
  }
};

/**
 * Record payment (simplified)
 */
export const recordPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, amount, method, referenceNumber } = req.body;

    if (!tenantId || !amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Tenant ID and amount are required' }
      });
    }

    // Update tenant's payment info
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        lastPaymentAt: new Date(),
        subscriptionStatus: 'active',
        // Extend subscription by 30 days
        subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        tenantId: tenant.id,
        amount,
        method,
        referenceNumber,
        paidAt: new Date(),
        nextBilling: tenant.nextBillingDate
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get billing stats
 */
export const getBillingStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const [
      activeSubscriptions,
      totalTenants,
      expiringSoon,
      overduePayments
    ] = await Promise.all([
      prisma.tenant.count({ where: { subscriptionStatus: 'active', isActive: true } }),
      prisma.tenant.count(),
      prisma.tenant.count({
        where: {
          subscriptionStatus: 'active',
          isActive: true,
          subscriptionExpiresAt: {
            lte: thirtyDaysFromNow,
            gte: now
          }
        }
      }),
      prisma.tenant.count({
        where: {
          subscriptionStatus: { not: 'active' },
          isActive: true, // Only consider active tenants that are overdue
          subscriptionExpiresAt: {
            lt: now
          }
        }
      })
    ]);

    // Rough estimate - in production calculate from actual payments
    const estimatedMonthlyRevenue = (activeSubscriptions * 150000); // Average plan price

    res.json({
      success: true,
      data: {
        totalRevenue: estimatedMonthlyRevenue,
        activeSubscriptions,
        expiringSoon,
        overduePayments,
        totalTenants
      }
    });
  } catch (error) {
    return next(error);
  }
};
