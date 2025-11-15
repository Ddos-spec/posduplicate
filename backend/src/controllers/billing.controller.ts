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

    // Transform to billing format
    const result = billingRecords.map(tenant => ({
      id: tenant.id,
      tenant: tenant.business_name,
      plan: tenant.subscription_plan || 'basic',
      status: tenant.subscription_status || 'trial',
      startDate: tenant.subscription_starts_at,
      expiresAt: tenant.subscription_expires_at,
      nextBilling: tenant.next_billing_date,
      lastPayment: tenant.last_payment_at
    }));

    res.json({ success: true, data: result, count: result.length });
  } catch (error) {
    next(error);
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
    next(error);
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
        nextBilling: tenant.nextBillingDate
      }
    });
  } catch (error) {
    next(error);
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
      prisma.tenant.count({ where: { subscription_status: 'active' } }),
      prisma.tenant.count({ where: { subscription_status: 'active' } }),
      prisma.tenant.count({ where: { subscription_status: 'pending' } }),
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
    next(error);
  }
};
