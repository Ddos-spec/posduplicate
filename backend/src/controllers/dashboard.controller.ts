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
 * Get Top Products
 */
export const getTopProducts = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { tenantId } = req;
    const { limit = 5 } = req.query;

    // This is simplified - ideally would aggregate from transaction_items
    const products = await prisma.items.findMany({
      where: tenantId ? { outletId: { in: await getOutletIdsByTenant(tenantId) } } : {},
      take: Number(limit),
      orderBy: { stock: 'desc' },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true
      }
    });

    res.json({
      success: true,
      data: products
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

    const categories = await prisma.categories.findMany({
      where: tenantId ? { outletId: { in: await getOutletIdsByTenant(tenantId) } } : {},
      include: {
        _count: {
          select: { items: true }
        }
      }
    });

    const data = categories.map(cat => ({
      name: cat.name,
      count: cat._count.items,
      value: cat._count.items * 1000000 // Mock sales value
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
