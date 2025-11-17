import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { date_from, date_to } = req.query;

    // Date range filter
    const dateFilter: any = {};
    if (date_from) {
      dateFilter.gte = new Date(date_from as string);
    }
    if (date_to) {
      dateFilter.lte = new Date(date_to as string);
    }

    // Get all completed transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'completed',
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      },
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
    const todayTransactions = transactions.filter(t => t.createdAt && new Date(t.createdAt) >= today);
    const todayRevenue = todayTransactions.reduce((sum, t) => sum + parseFloat((t.total ?? 0).toString()), 0);

    // Get yesterday's revenue for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTransactions = await prisma.transaction.findMany({
      where: {
        status: 'completed',
        createdAt: {
          gte: yesterday,
          lt: today
        }
      }
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
      error: { message: 'Failed to get dashboard stats', details: error.message }
    });
  }
};

export const getSalesChart = async (req: Request, res: Response) => {
  try {
    const { period = 'week' } = req.query; // week, month, year

    let startDate = new Date();
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

    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'completed',
        createdAt: {
          gte: startDate
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group by date
    const salesByDate: any = {};
    transactions.forEach(t => {
      const date = new Date(t.createdAt!);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
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
      error: { message: 'Failed to get sales chart', details: error.message }
    });
  }
};

export const getTopProducts = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const transactionItems = await prisma.transactionItem.findMany({
      where: {
        transactions: {
          status: 'completed'
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
      .slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: topProducts
    });
  } catch (error: any) {
    console.error('Get top products error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get top products', details: error.message }
    });
  }
};

export const getSalesByCategory = async (_req: Request, res: Response) => {
  try {
    // Get all items with their categories
    const items = await prisma.items.findMany({
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
    const transactionItems = await prisma.transactionItem.findMany({
      where: {
        transactions: {
          status: 'completed'
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
      error: { message: 'Failed to get sales by category', details: error.message }
    });
  }
};

export const getRecentTransactions = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const transactions = await prisma.transaction.findMany({
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
        createdAt: 'desc'
      },
      take: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error: any) {
    console.error('Get recent transactions error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get recent transactions', details: error.message }
    });
  }
};
