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
    const tenants = await prisma.tenant.findMany({
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
    let cumulativeCount = await prisma.tenant.count({
      where: { createdAt: { lt: startDate } }
    });

    tenants.forEach((tenant: any) => {
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
    const transactions = await prisma.transaction.findMany({
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
    transactions.forEach((t: any) => {
      const monthKey = t.createdAt.toISOString().substring(0, 7);
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + Number(t.total ?? 0);
    });

    const result = Object.keys(monthlyRevenue).sort().map((month: string) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      revenue: monthlyRevenue[month] ?? 0
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get tenant status distribution
 */
export const getTenantStatusDistribution = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const statusCounts = await prisma.tenant.groupBy({
      by: ['subscriptionStatus'],
      where: { deletedAt: null },
      _count: { id: true }
    });

    const result = statusCounts.map(item => ({
      name: item.subscriptionStatus || 'Unknown',
      value: item._count.id
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
    const parsedLimit = parseInt(limit as string);

    // Get transaction counts and totals per outlet
    const outletStats = await prisma.transaction.groupBy({
      by: ['outletId'],
      where: { status: 'completed', outletId: { not: null } }, // Ensure outletId is not null
      _count: { id: true },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: parsedLimit
    });

    // Extract unique outlet IDs
    const outletIds = outletStats.map(stat => stat.outletId as number);

    // Fetch all necessary outlet and tenant data in a single query
    const outletsWithTenants = await prisma.outlet.findMany({
      where: { id: { in: outletIds } },
      select: {
        id: true,
        tenants: {
          select: { businessName: true }
        }
      }
    });

    // Create a map for quick lookup
    const outletTenantMap = new Map(
      outletsWithTenants.map(outlet => [outlet.id, outlet.tenants?.businessName || 'Unknown'])
    );

    // Combine stats with tenant names
    const result = outletStats.map((stat, index) => ({
      rank: index + 1,
      name: outletTenantMap.get(stat.outletId as number) || 'Unknown',
      transactions: stat._count.id,
      revenue: Number((stat._sum.total ?? 0) || 0)
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system summary stats
 */
export const getSystemSummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalTenants,
      activeTenants,
      totalTransactions,
      totalRevenue
    ] = await Promise.all([
      prisma.tenant.count({ where: { deletedAt: null } }),
      prisma.tenant.count({ where: { deletedAt: null, isActive: true, subscriptionStatus: 'active' } }),
      prisma.transaction.count({ where: { status: 'completed' } }),
      prisma.transaction.aggregate({
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
        totalRevenue: Number((totalRevenue._sum.total ?? 0) || 0)
      }
    });
  } catch (error) {
    next(error);
  }
};
