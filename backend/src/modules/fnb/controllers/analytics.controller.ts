import { Request, Response } from 'express';
import prisma from '../../../utils/prisma';
import { safeParseInt, safeParseDate } from '../../../utils/validation';

/**
 * Get tenant outlet IDs for isolation
 */
const getTenantOutletIds = async (tenantId: number | undefined): Promise<number[]> => {
  if (!tenantId) return [];
  const outlets = await prisma.outlets.findMany({
    where: { tenant_id: tenantId },
    select: { id: true }
  });
  return outlets.map(o => o.id);
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { date_from, date_to, outlet_id } = req.query;

    // Build where clause with tenant isolation
    const where: any = { status: 'completed' };

    // Tenant isolation
    if (req.tenantId) {
      const outletIds = await getTenantOutletIds(req.tenantId);
      if (outletIds.length === 0) {
        return res.json({
          success: true,
          data: {
            totalRevenue: 0,
            totalTransactions: 0,
            averageTransaction: 0,
            totalItemsSold: 0,
            todayRevenue: 0,
            todayTransactions: 0,
            revenueChange: 0
          }
        });
      }
      where.outlet_id = { in: outletIds };
    }

    // Specific outlet filter with tenant validation
    if (outlet_id) {
      const parsedOutletId = safeParseInt(outlet_id);
      if (req.tenantId) {
        const outletIds = await getTenantOutletIds(req.tenantId);
        if (!outletIds.includes(parsedOutletId)) {
          return res.status(403).json({
            success: false,
            error: { code: 'ACCESS_DENIED', message: 'Access denied to this outlet' }
          });
        }
      }
      where.outlet_id = parsedOutletId;
    }

    // Date range filter with validation
    const fromDate = safeParseDate(date_from);
    const toDate = safeParseDate(date_to);
    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) where.created_at.gte = fromDate;
      if (toDate) where.created_at.lte = toDate;
    }

    // Get all completed transactions
    const transactions = await prisma.transactions.findMany({
      where,
      include: {
        transaction_items: true,
        payments: true
      }
    });

    // Calculate stats
    const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat((t.total ?? 0).toString()), 0);
    const totalTransactions = transactions.length;
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Calculate total items sold
    const totalItemsSold = transactions.reduce((sum, t) => {
      return sum + t.transaction_items.reduce((itemSum, item) => itemSum + parseFloat(item.quantity.toString()), 0);
    }, 0);

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTransactions = transactions.filter(t => t.created_at && new Date(t.created_at) >= today);
    const todayRevenue = todayTransactions.reduce((sum, t) => sum + parseFloat((t.total ?? 0).toString()), 0);

    // Get yesterday's revenue for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayWhere = { ...where, created_at: { gte: yesterday, lt: today } };
    const yesterdayTransactions = await prisma.transactions.findMany({
      where: yesterdayWhere
    });
    const yesterdayRevenue = yesterdayTransactions.reduce((sum, t) => sum + parseFloat((t.total ?? 0).toString()), 0);
    const revenueChange = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : 0;

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalTransactions,
        averageTransaction,
        totalItemsSold,
        todayRevenue,
        todayTransactions: todayTransactions.length,
        revenueChange: Math.round(revenueChange * 10) / 10
      }
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to get dashboard stats' }
    });
  }
};

export const getSalesChart = async (req: Request, res: Response) => {
  try {
    const { period = 'week', outlet_id } = req.query;

    // Build where clause with tenant isolation
    const where: any = { status: 'completed' };

    // Tenant isolation
    if (req.tenantId) {
      const outletIds = await getTenantOutletIds(req.tenantId);
      if (outletIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
      where.outlet_id = { in: outletIds };
    }

    // Specific outlet filter
    if (outlet_id) {
      const parsedOutletId = safeParseInt(outlet_id);
      if (req.tenantId) {
        const outletIds = await getTenantOutletIds(req.tenantId);
        if (!outletIds.includes(parsedOutletId)) {
          return res.status(403).json({
            success: false,
            error: { code: 'ACCESS_DENIED', message: 'Access denied to this outlet' }
          });
        }
      }
      where.outlet_id = parsedOutletId;
    }

    const startDate = new Date();
    let groupBy = 'day';

    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
      groupBy = 'day';
    } else if (period === 'month') {
      startDate.setDate(startDate.getDate() - 30);
      groupBy = 'day';
    } else if (period === 'year') {
      startDate.setMonth(startDate.getMonth() - 12);
      groupBy = 'month';
    }

    where.created_at = { gte: startDate };

    const transactions = await prisma.transactions.findMany({
      where,
      orderBy: { created_at: 'asc' }
    });

    // Group by date
    const salesByDate: any = {};
    transactions.forEach(t => {
      const date = new Date(t.created_at!);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!salesByDate[key]) {
        salesByDate[key] = {
          date: key,
          revenue: 0,
          transactions: 0
        };
      }

      salesByDate[key].revenue += parseFloat((t.total ?? 0).toString());
      salesByDate[key].transactions += 1;
    });

    const chartData = Object.values(salesByDate).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );

    res.json({
      success: true,
      data: chartData
    });
  } catch (error: any) {
    console.error('Get sales chart error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to get sales chart' }
    });
  }
};

export const getTopProducts = async (req: Request, res: Response) => {
  try {
    const { limit = 10, outlet_id } = req.query;

    // Build where clause with tenant isolation
    const transactionWhere: any = { status: 'completed' };

    // Tenant isolation
    if (req.tenantId) {
      const outletIds = await getTenantOutletIds(req.tenantId);
      if (outletIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
      transactionWhere.outlet_id = { in: outletIds };
    }

    // Specific outlet filter
    if (outlet_id) {
      const parsedOutletId = safeParseInt(outlet_id);
      if (req.tenantId) {
        const outletIds = await getTenantOutletIds(req.tenantId);
        if (!outletIds.includes(parsedOutletId)) {
          return res.status(403).json({
            success: false,
            error: { code: 'ACCESS_DENIED', message: 'Access denied to this outlet' }
          });
        }
      }
      transactionWhere.outlet_id = parsedOutletId;
    }

    const transactionItems = await prisma.transaction_items.findMany({
      where: {
        transactions: {
          is: transactionWhere
        }
      },
      select: {
        item_name: true,
        quantity: true,
        subtotal: true
      }
    });

    // Aggregate by product name
    const productStats: any = {};
    transactionItems.forEach(item => {
      if (!productStats[item.item_name]) {
        productStats[item.item_name] = {
          name: item.item_name,
          quantity: 0,
          revenue: 0
        };
      }
      productStats[item.item_name].quantity += parseFloat(item.quantity.toString());
      productStats[item.item_name].revenue += parseFloat(item.subtotal.toString());
    });

    // Sort by quantity and limit
    const topProducts = Object.values(productStats)
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, safeParseInt(limit, 10));

    res.json({
      success: true,
      data: topProducts
    });
  } catch (error: any) {
    console.error('Get top products error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to get top products' }
    });
  }
};

export const getSalesByCategory = async (req: Request, res: Response) => {
  try {
    const { outlet_id } = req.query;

    // Build where clause with tenant isolation
    const transactionWhere: any = { status: 'completed' };

    // Tenant isolation
    if (req.tenantId) {
      const outletIds = await getTenantOutletIds(req.tenantId);
      if (outletIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
      transactionWhere.outlet_id = { in: outletIds };
    }

    // Specific outlet filter
    if (outlet_id) {
      const parsedOutletId = safeParseInt(outlet_id);
      if (req.tenantId) {
        const outletIds = await getTenantOutletIds(req.tenantId);
        if (!outletIds.includes(parsedOutletId)) {
          return res.status(403).json({
            success: false,
            error: { code: 'ACCESS_DENIED', message: 'Access denied to this outlet' }
          });
        }
      }
      transactionWhere.outlet_id = parsedOutletId;
    }

    // Get all items with their categories (filtered by tenant outlets)
    const itemsWhere: any = {};
    if (req.tenantId) {
      const outletIds = await getTenantOutletIds(req.tenantId);
      itemsWhere.outlet_id = { in: outletIds };
    }

    const items = await prisma.items.findMany({
      where: itemsWhere,
      include: {
        categories: true
      }
    });

    // Create a map of item name to category
    const itemCategoryMap: any = {};
    items.forEach((item: any) => {
      itemCategoryMap[item.name] = item.categories?.name || 'Uncategorized';
    });

    // Get transaction items
    const transactionItems = await prisma.transaction_items.findMany({
      where: {
        transactions: {
          is: transactionWhere
        }
      },
      select: {
        item_name: true,
        quantity: true,
        subtotal: true
      }
    });

    // Aggregate by category using the map
    const categoryStats: any = {};
    transactionItems.forEach(item => {
      const categoryName = itemCategoryMap[item.item_name] || 'Uncategorized';

      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = {
          name: categoryName,
          quantity: 0,
          revenue: 0
        };
      }
      categoryStats[categoryName].quantity += parseFloat(item.quantity.toString());
      categoryStats[categoryName].revenue += parseFloat(item.subtotal.toString());
    });

    const categoryData = Object.values(categoryStats).sort((a: any, b: any) => b.revenue - a.revenue);

    res.json({
      success: true,
      data: categoryData
    });
  } catch (error: any) {
    console.error('Get sales by category error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to get sales by category' }
    });
  }
};

export const getRecentTransactions = async (req: Request, res: Response) => {
  try {
    const { limit = 10, outlet_id } = req.query;

    // Build where clause with tenant isolation
    const where: any = {};

    // Tenant isolation
    if (req.tenantId) {
      const outletIds = await getTenantOutletIds(req.tenantId);
      if (outletIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
      where.outlet_id = { in: outletIds };
    }

    // Specific outlet filter
    if (outlet_id) {
      const parsedOutletId = safeParseInt(outlet_id);
      if (req.tenantId) {
        const outletIds = await getTenantOutletIds(req.tenantId);
        if (!outletIds.includes(parsedOutletId)) {
          return res.status(403).json({
            success: false,
            error: { code: 'ACCESS_DENIED', message: 'Access denied to this outlet' }
          });
        }
      }
      where.outlet_id = parsedOutletId;
    }

    const transactions = await prisma.transactions.findMany({
      where,
      include: {
        users: {
          select: {
            name: true,
            email: true
          }
        },
        transaction_items: {
          select: {
            item_name: true,
            quantity: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: safeParseInt(limit, 10)
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error: any) {
    console.error('Get recent transactions error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to get recent transactions' }
    });
  }
};
