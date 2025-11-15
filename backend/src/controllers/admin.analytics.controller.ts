import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * Get system-wide analytics (Tenant growth over time)
 */
export const getTenantGrowth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { months = 12 } = req.query;
    const monthsInt = parseInt(months as string);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsInt);

    // Get tenants grouped by month
    const tenants = await prisma.tenants.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      select: {
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by month
    const monthlyData: { [key: string]: number } = {};
    let cumulativeCount = await prisma.tenants.count({
      where: { createdAt: { lt: startDate } }
    });

    tenants.forEach(tenant => {
      const monthKey = tenant.createdAt.toISOString().substring(0, 7); // YYYY-MM
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    // Build cumulative data
    const result = Object.keys(monthlyData).sort().map(month => {
      cumulativeCount += monthlyData[month];
      return {
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        tenants: cumulativeCount
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get total revenue from all tenants
 */
export const getSystemRevenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { months = 12 } = req.query;
    const monthsInt = parseInt(months as string);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsInt);

    // Get transactions from all tenants
    const transactions = await prisma.transactions.findMany({
      where: {
        status: 'completed',
        createdAt: { gte: startDate }
      },
      select: {
        createdAt: true,
        total: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by month
    const monthlyRevenue: { [key: string]: number } = {};
    transactions.forEach(t => {
      const monthKey = t.createdAt.toISOString().substring(0, 7);
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + Number(t.total);
    });

    const result = Object.keys(monthlyRevenue).sort().map(month => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      revenue: monthlyRevenue[month]
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get tenant status distribution
 */
export const getTenantStatusDistribution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusCounts = await prisma.tenants.groupBy({
      by: ['subscriptionStatus'],
      _count: { id: true }
    });

    const result = statusCounts.map(item => ({
      name: item.subscriptionStatus || 'Unknown',
      value: item._count.id,
      color: item.subscriptionStatus === 'active' ? '#10b981' :
             item.subscriptionStatus === 'trial' ? '#f59e0b' : '#ef4444'
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get top performing tenants
 */
export const getTopTenants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = 10 } = req.query;

    // Get transaction counts and totals per tenant
    const tenantStats = await prisma.transactions.groupBy({
      by: ['outletId'],
      where: { status: 'completed' },
      _count: { id: true },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: parseInt(limit as string)
    });

    // Get tenant details
    const result = await Promise.all(
      tenantStats.map(async (stat, index) => {
        const outlet = await prisma.outlets.findUnique({
          where: { id: stat.outletId || 0 },
          include: {
            tenants: {
              select: { businessName: true }
            }
          }
        });

        return {
          rank: index + 1,
          name: outlet?.tenants?.businessName || 'Unknown',
          transactions: stat._count.id,
          revenue: Number(stat._sum.total || 0)
        };
      })
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system summary stats
 */
export const getSystemSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalTenants,
      activeTenants,
      totalTransactions,
      totalRevenue
    ] = await Promise.all([
      prisma.tenants.count(),
      prisma.tenants.count({ where: { isActive: true, subscriptionStatus: 'active' } }),
      prisma.transactions.count({ where: { status: 'completed' } }),
      prisma.transactions.aggregate({
        where: { status: 'completed' },
        _sum: { total: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalTenants,
        activeTenants,
        totalTransactions,
        totalRevenue: Number(totalRevenue._sum.total || 0)
      }
    });
  } catch (error) {
    next(error);
  }
};
