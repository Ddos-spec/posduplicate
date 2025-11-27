import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * Get Owner Dashboard Summary
 */
export const getDashboardSummary = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { tenantId } = req;
    const { outletId, startDate, endDate } = req.query;

    // Build where clause
    const where: any = {};
    if (tenantId) where.outletId = { in: await getOutletIdsByTenant(tenantId) };
    if (outletId) where.outletId = Number(outletId);
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    // Get total sales
    const totalSales = await prisma.transaction.aggregate({
      where: { ...where, status: 'completed' },
      _sum: { total: true },
      _count: { id: true }
    });

    // Get total products
    const totalProducts = await prisma.items.count({
      where: tenantId ? { outletId: { in: await getOutletIdsByTenant(tenantId) } } : {}
    });

    // Get total customers (from transactions)
    const totalCustomers = await prisma.customers.count({
      where: tenantId ? { outlet_id: { in: await getOutletIdsByTenant(tenantId) } } : {}
    });

    res.json({
      success: true,
      data: {
        totalSales: totalSales._sum.total || 0,
        totalTransactions: totalSales._count.id || 0,
        totalProducts,
        totalCustomers,
        averageTransaction: totalSales._count.id > 0 ? Number(totalSales._sum.total || 0) / totalSales._count.id : 0
      }
    });
  } catch (error) {
    _next(error);
  }
};

/**
 * Get Sales Trend
 */
export const getSalesTrend = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { tenantId } = req;
    const { days = 7, outletId } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const where: any = {
      status: 'completed',
      createdAt: { gte: startDate }
    };

    if (tenantId) where.outletId = { in: await getOutletIdsByTenant(tenantId) };
    if (outletId) where.outletId = Number(outletId);

    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        createdAt: true,
        total: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by date
    const grouped: { [key: string]: number } = {};
    transactions.forEach((t: any) => {
      const date = t.createdAt.toISOString().split('T')[0];
      grouped[date] = (grouped[date] || 0) + Number(t.total);
    });

    const data = Object.entries(grouped).map(([date, sales]) => ({
      date,
      sales
    }));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    _next(error);
  }
};

/**
 * Get Top Products (by sales)
 */
export const getTopProducts = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { tenantId } = req;
    const { limit = 5 } = req.query;

    // Get transaction items grouped by product
    const transactionItems = await prisma.transactionItem.findMany({
      where: {
        transactions: {
          status: 'completed',
          ...(tenantId ? { outletId: { in: await getOutletIdsByTenant(tenantId) } } : {})
        }
      },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true
          }
        }
      }
    });

    // Aggregate sales by product
    const productSales: { [key: number]: { id: number; name: string; price: number; stock: number; totalSales: number; totalQuantity: number } } = {};

    transactionItems.forEach(item => {
      const productId = item.item_id;
      if (!productSales[productId]) {
        productSales[productId] = {
          id: item.items.id,
          name: item.items.name,
          price: Number(item.items.price),
          stock: Number(item.items.stock),
          totalSales: 0,
          totalQuantity: 0
        };
      }
      productSales[productId].totalSales += Number(item.subtotal);
      productSales[productId].totalQuantity += Number(item.quantity);
    });

    // Sort by total sales and get top N
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, Number(limit))
      .map(p => ({
        id: p.id,
        name: p.name,
        price: p.totalSales, // Use totalSales for the chart
        stock: p.stock
      }));

    res.json({
      success: true,
      data: topProducts
    });
  } catch (error) {
    _next(error);
  }
};

/**
 * Get Sales by Category
 */
export const getSalesByCategory = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { tenantId } = req;

    // Get all transaction items for completed transactions
    const transactionItems = await prisma.transactionItem.findMany({
      where: {
        transactions: {
          status: 'completed',
          ...(tenantId ? { outletId: { in: await getOutletIdsByTenant(tenantId) } } : {})
        }
      },
      include: {
        items: {
          select: {
            categoryId: true,
            categories: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Aggregate sales by category
    const categorySales: { [key: number]: { id: number; name: string; count: number; value: number } } = {};

    transactionItems.forEach(item => {
      if (!item.items || !item.items.categories) return; // Skip items without category

      const categoryId = item.items.categoryId;
      if (!categoryId) return;

      if (!categorySales[categoryId]) {
        categorySales[categoryId] = {
          id: item.items.categories.id,
          name: item.items.categories.name,
          count: 0,
          value: 0
        };
      }
      categorySales[categoryId].count += Number(item.quantity);
      categorySales[categoryId].value += Number(item.subtotal);
    });

    // Convert to array and sort by value
    const data = Object.values(categorySales)
      .sort((a, b) => b.value - a.value)
      .map(cat => ({
        name: cat.name,
        count: cat.count,
        value: cat.value,
        totalSales: cat.value  // Add for compatibility
      }));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    _next(error);
  }
};

/**
 * Get Recent Transactions
 */
export const getRecentTransactions = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { tenantId } = req;
    const { limit = 10 } = req.query;

    const where: any = {};
    if (tenantId) where.outletId = { in: await getOutletIdsByTenant(tenantId) };

    const transactions = await prisma.transaction.findMany({
      where,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        transaction_number: true,
        total: true,
        status: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    _next(error);
  }
};

// Helper function
async function getOutletIdsByTenant(tenantId: number): Promise<number[]> {
  const outlets = await prisma.outlet.findMany({
    where: { tenantId },
    select: { id: true }
  });
  return outlets.map((o: any) => o.id);
}
