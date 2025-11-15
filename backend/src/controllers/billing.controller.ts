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
export const getSubscriptionPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Hardcoded plans - in production these would be in database
    const plans = [
      {
        id: 1,
        name: 'Basic',
        price: 99000,
        maxOutlets: 1,
        maxUsers: 5,
        features: [
          '1 Outlet',
          'Up to 5 Users',
          'Basic POS Features',
          'Transaction History',
          'Basic Reports',
          'Email Support'
        ],
        color: 'blue'
      },
      {
        id: 2,
        name: 'Pro',
        price: 299000,
        maxOutlets: 5,
        maxUsers: 20,
        features: [
          'Up to 5 Outlets',
          'Up to 20 Users',
          'Advanced POS Features',
          'Transaction History',
          'Advanced Reports & Analytics',
          'Inventory Management',
          'Priority Email Support',
          'WhatsApp Notifications'
        ],
        color: 'purple'
      },
      {
        id: 3,
        name: 'Enterprise',
        price: 999000,
        maxOutlets: 999,
        maxUsers: 999,
        features: [
          'Unlimited Outlets',
          'Unlimited Users',
          'All Premium Features',
          'Custom Integrations',
          'Advanced Analytics',
          'Dedicated Account Manager',
          '24/7 Phone Support',
          'Custom Development'
        ],
        color: 'orange'
      }
    ];

    res.json({ success: true, data: plans });
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
export const getBillingStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalRevenue,
      activeSubscriptions,
      pendingPayments,
      totalTenants
    ] = await Promise.all([
      // In production, sum from payments table
      prisma.tenant.count({ where: { subscriptionStatus: 'active' } }),
      prisma.tenant.count({ where: { subscriptionStatus: 'active' } }),
      prisma.tenant.count({ where: { subscriptionStatus: 'pending' } }),
      prisma.tenant.count()
    ]);

    // Rough estimate - in production calculate from actual payments
    const estimatedMonthlyRevenue = (activeSubscriptions * 150000); // Average plan price

    res.json({
      success: true,
      data: {
        totalRevenue: estimatedMonthlyRevenue,
        activeSubscriptions,
        pendingPayments,
        totalTenants
      }
    });
  } catch (error) {
    return next(error);
  }
};
