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
    if (tenantId) where.outlet_id = { in: await getOutletIdsByTenant(tenantId) };
    if (outletId) where.outlet_id = Number(outletId);
    if (startDate && endDate) {
      // Add time to make it inclusive of the entire end date
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      where.created_at = {
        gte: start,
        lte: end
      };
    }

    // Get total sales
    const totalSales = await prisma.transactions.aggregate({
      where: { ...where, status: 'completed' },
      _sum: { total: true },
      _count: { id: true }
    });

    // Get total products
    const totalProducts = await prisma.items.count({
      where: tenantId ? { outlet_id: { in: await getOutletIdsByTenant(tenantId) } } : {}
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
    const { days = 7, outletId, startDate: startDateParam, endDate: endDateParam } = req.query;

    let startDate: Date;
    let endDate: Date;

    // Use custom date range if provided, otherwise use days parameter
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam as string);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(endDateParam as string);
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));
    }

    const where: any = {
      status: 'completed',
      created_at: { gte: startDate, lte: endDate }
    };

    if (tenantId) where.outlet_id = { in: await getOutletIdsByTenant(tenantId) };
    if (outletId) where.outlet_id = Number(outletId);

    const transactions = await prisma.transactions.findMany({
      where,
      select: {
        created_at: true,
        total: true
      },
      orderBy: { created_at: 'asc' }
    });

    // Determine if "Today" view (or range <= 1 day)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    const isDailyView = diffDays <= 1;

    // Group by date or hour
    const grouped: { [key: string]: number } = {};
    
    transactions.forEach((t: any) => {
      if (!t.created_at) return;

      // Convert to WIB (UTC+7) for grouping
      // We do this manually because the server is likely UTC
      const dateObj = new Date(t.created_at.getTime() + (7 * 60 * 60 * 1000));
      
      let key: string;
      if (isDailyView) {
        // Group by Hour for "Today" view: "HH:00"
        const hour = dateObj.getUTCHours().toString().padStart(2, '0');
        key = `${hour}:00`; 
      } else {
        // Group by Date: "YYYY-MM-DD"
        key = dateObj.toISOString().split('T')[0];
      }

      grouped[key] = (grouped[key] || 0) + Number(t.total);
    });

    // If Daily View, ensure all hours 00-23 are present for a nice chart
    if (isDailyView) {
      for (let i = 0; i < 24; i++) {
        const hourKey = `${i.toString().padStart(2, '0')}:00`;
        if (!grouped[hourKey]) {
          grouped[hourKey] = 0;
        }
      }
    }

    // Sort by key
    const data = Object.entries(grouped)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, sales]) => ({
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
    const transactionItems = await prisma.transaction_items.findMany({
      where: {
        transactions: {
          is: {
            status: 'completed',
            ...(tenantId ? { outlet_id: { in: await getOutletIdsByTenant(tenantId) } } : {})
          }
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
        qty: p.totalQuantity,  // Quantity sold (not inventory stock)
        revenue: p.totalSales  // Total revenue from sales
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
    const transactionItems = await prisma.transaction_items.findMany({
      where: {
        transactions: {
          is: {
            status: 'completed',
            ...(tenantId ? { outlet_id: { in: await getOutletIdsByTenant(tenantId) } } : {})
          }
        }
      },
      include: {
        items: {
          select: {
            category_id: true,
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

      const categoryId = item.items.category_id;
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

    const where: any = {
      status: 'completed' // Only show completed transactions to match Sales Trend and Summary
    };
    if (tenantId) where.outlet_id = { in: await getOutletIdsByTenant(tenantId) };

    const transactions = await prisma.transactions.findMany({
      where,
      take: Number(limit),
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        transaction_number: true,
        total: true,
        status: true,
        created_at: true
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
  const outlets = await prisma.outlets.findMany({
    where: { tenant_id: tenantId },
    select: { id: true }
  });
  return outlets.map((o: any) => o.id);
}
