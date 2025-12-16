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
        created_at: { gte: startDate }
      },
      select: {
        created_at: true
      },
      orderBy: { created_at: 'asc' }
    });

    // Group by month
    const monthlyData: { [key: string]: number } = {};
    let cumulativeCount = await prisma.tenants.count({
      where: { created_at: { lt: startDate } }
    });

    tenants.forEach((tenant: any) => {
      const monthKey = tenant.created_at.toISOString().substring(0, 7); // YYYY-MM
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

    // Get transaction items from all tenants
    const transactionItems = await prisma.transaction_items.findMany({
      where: {
        transactions: {
          status: 'completed',
          created_at: { gte: startDate }
        }
      },
      select: {
        subtotal: true,
        transactions: {
          select: {
            created_at: true
          }
        }
      }
    });

    // Group by month
    const monthlyRevenue: { [key: string]: number } = {};
    transactionItems.forEach((item: any) => {
      const monthKey = item.transactions.created_at.toISOString().substring(0, 7);
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + Number(item.subtotal ?? 0);
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
    const statusCounts = await prisma.tenants.groupBy({
      by: ['subscription_status'],
      where: { deleted_at: null },
      _count: { id: true }
    });

    const result = statusCounts.map(item => ({
      name: item.subscription_status || 'Unknown',
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

    // Step 1: Get all items from completed transactions, including relational data.
    const items = await prisma.transaction_items.findMany({
      where: { transactions: { status: 'completed' } },
      select: {
        subtotal: true,
        transaction_id: true,
        transactions: {
          select: {
            outlets: {
              select: {
                tenant_id: true,
                tenants: { select: { business_name: true } }
              }
            }
          }
        }
      }
    });

    // Step 2: Aggregate the data in JavaScript.
    const tenantStats: { [key: number]: { name: string; revenue: number; transactionIds: Set<number> } } = {};

    items.forEach(item => {
      const outlet = item.transactions?.outlets;
      if (outlet && outlet.tenant_id && outlet.tenants) {
        const tenantId = outlet.tenant_id;
        if (!tenantStats[tenantId]) {
          tenantStats[tenantId] = {
            name: outlet.tenants.business_name || 'Unknown Tenant',
            revenue: 0,
            transactionIds: new Set()
          };
        }
        tenantStats[tenantId].revenue += Number(item.subtotal);
        if (item.transaction_id) {
          tenantStats[tenantId].transactionIds.add(item.transaction_id);
        }
      }
    });

    // Step 3: Convert the aggregated object into an array and calculate transaction counts.
    const aggregated = Object.values(tenantStats).map(stat => ({
      name: stat.name,
      revenue: stat.revenue,
      transactions: stat.transactionIds.size
    }));

    // Step 4: Sort by revenue and slice to get the top tenants.
    const sorted = aggregated.sort((a, b) => b.revenue - a.revenue).slice(0, parsedLimit);

    // Step 5: Add rank to the final result.
    const result = sorted.map((tenant, index) => ({
      ...tenant,
      rank: index + 1,
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
      prisma.tenants.count({ where: { deleted_at: null } }),
      prisma.tenants.count({ where: { deleted_at: null, is_active: true, subscription_status: 'active' } }),
      prisma.transactions.count({ where: { status: 'completed' } }),
      prisma.transaction_items.aggregate({
        where: { transactions: { status: 'completed' } },
        _sum: { subtotal: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalTenants,
        activeTenants,
        totalTransactions,
        totalRevenue: Number((totalRevenue._sum.subtotal ?? 0) || 0)
      }
    });
  } catch (error) {
    next(error);
  }
};
