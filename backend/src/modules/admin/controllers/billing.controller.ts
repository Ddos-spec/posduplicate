import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

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
      where.subscription_status = status;
    }

    const billingRecords = await prisma.tenants.findMany({
      where,
      select: {
        id: true,
        business_name: true,
        subscription_plan: true,
        subscription_status: true,
        subscription_starts_at: true,
        subscription_expires_at: true,
        next_billing_date: true,
        last_payment_at: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' },
      take: parseInt(limit as string)
    });

    // Transform to billing format to match frontend's BillingRecord interface
    const result = billingRecords.map(tenant => ({
      id: tenant.id,
      businessName: tenant.business_name,
      subscriptionPlan: tenant.subscription_plan || 'basic',
      subscriptionStatus: tenant.subscription_status || 'trial',
      subscriptionStartsAt: tenant.subscription_starts_at,
      subscriptionExpiresAt: tenant.subscription_expires_at,
      nextBillingDate: tenant.next_billing_date,
      lastPaymentAt: tenant.last_payment_at,
      createdAt: tenant.created_at
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
    const tenant = await prisma.tenants.update({
      where: { id: tenantId },
      data: {
        last_payment_at: new Date(),
        subscription_status: 'active',
        // Extend subscription by 30 days
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
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
        nextBilling: tenant.next_billing_date
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
      prisma.tenants.count({ where: { subscription_status: 'active', is_active: true } }),
      prisma.tenants.count(),
      prisma.tenants.count({
        where: {
          subscription_status: 'active',
          is_active: true,
          subscription_expires_at: {
            lte: thirtyDaysFromNow,
            gte: now
          }
        }
      }),
      prisma.tenants.count({
        where: {
          subscription_status: { not: 'active' },
          is_active: true, // Only consider active tenants that are overdue
          subscription_expires_at: {
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
