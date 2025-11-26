import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

/**
 * Get sales report for the authenticated tenant
 * Query parameters:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - outletId: number (optional)
 */
export const getSalesReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.apiKeyTenantId!;
    const { startDate, endDate, outletId } = req.query;

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // Build where clause
    const where: Prisma.TransactionWhereInput = {
      outlets: {
        tenantId: tenantId,
      },
    };

    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    if (outletId) {
      where.outletId = parseInt(outletId as string);
    }

    // Fetch transactions with details
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        transaction_items: {
          include: {
            items: true,
            variants: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
          },
        },
        payments: true,
        outlets: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate summary
    const summary = {
      totalTransactions: transactions.length,
      totalRevenue: transactions.reduce((sum, t) => sum + (t.total?.toNumber() || 0), 0),
      totalDiscount: transactions.reduce((sum, t) => sum + (t.discountAmount?.toNumber() || 0), 0),
      totalTax: transactions.reduce((sum, t) => sum + (t.taxAmount?.toNumber() || 0), 0),
      totalItems: transactions.reduce(
        (sum, t) => sum + t.transaction_items.reduce((itemSum, item) => itemSum + item.quantity.toNumber(), 0),
        0
      ),
    };

    res.json({
      success: true,
      data: {
        summary,
        transactions: transactions.map((t) => ({
          transactionNumber: t.transaction_number,
          orderType: t.order_type,
          subtotal: t.subtotal?.toNumber(),
          discountAmount: t.discountAmount?.toNumber(),
          taxAmount: t.taxAmount?.toNumber(),
          total: t.total?.toNumber(),
          cashier: t.users?.name,
          outlet: t.outlets?.name,
          createdAt: t.createdAt,
          items: t.transaction_items.map((item) => ({
            itemName: item.item_name,
            variant: item.variants?.name,
            quantity: item.quantity.toNumber(),
            unitPrice: item.unit_price.toNumber(),
            subtotal: item.subtotal.toNumber(),
          })),
          payments: t.payments.map((p) => ({
            method: p.method,
            amount: p.amount.toNumber(),
          })),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching sales report:', error);
    return next(error);
  }
};

/**
 * Get stock/inventory report for the authenticated tenant
 * Query parameters:
 * - outletId: number (optional)
 * - lowStock: boolean (optional) - filter items below min stock
 */
export const getStockReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.apiKeyTenantId!;
    const { outletId, lowStock } = req.query;

    const where: Prisma.itemsWhereInput = {
      outlets: {
        tenantId: tenantId,
      },
      isActive: true,
    };

    if (outletId) {
      where.outletId = parseInt(outletId as string);
    }

    if (lowStock === 'true') {
      where.stock = {
        lte: prisma.items.fields.minStock,
      };
    }

    const items = await prisma.items.findMany({
      where,
      include: {
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
        outlets: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const summary = {
      totalItems: items.length,
      lowStockItems: items.filter((item) => item.stock && item.minStock && item.stock.toNumber() <= item.minStock.toNumber())
        .length,
      totalStockValue: items.reduce((sum, item) => sum + item.price.toNumber() * (item.stock?.toNumber() || 0), 0),
    };

    res.json({
      success: true,
      data: {
        summary,
        items: items.map((item) => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          category: item.categories?.name,
          stock: item.stock?.toNumber() || 0,
          minStock: item.minStock?.toNumber() || 0,
          price: item.price.toNumber(),
          outlet: item.outlets?.name,
          isLowStock: item.stock && item.minStock ? item.stock.toNumber() <= item.minStock.toNumber() : false,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching stock report:', error);
    return next(error);
  }
};

/**
 * Get transaction summary by date range
 */
export const getTransactionSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.apiKeyTenantId!;
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const where: Prisma.TransactionWhereInput = {
      outlets: {
        tenantId: tenantId,
      },
    };

    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        payments: true,
        transaction_items: true,
      },
    });

    // Group by payment method
    const paymentMethods: Record<string, number> = {};
    transactions.forEach((t) => {
      t.payments.forEach((p) => {
        const method = p.method || 'Unknown';
        paymentMethods[method] = (paymentMethods[method] || 0) + p.amount.toNumber();
      });
    });

    // Group by order type
    const orderTypes: Record<string, number> = {};
    transactions.forEach((t) => {
      const type = t.order_type || 'Unknown';
      orderTypes[type] = (orderTypes[type] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalTransactions: transactions.length,
        totalRevenue: transactions.reduce((sum, t) => sum + (t.total?.toNumber() || 0), 0),
        averageOrderValue:
          transactions.length > 0
            ? transactions.reduce((sum, t) => sum + (t.total?.toNumber() || 0), 0) / transactions.length
            : 0,
        paymentMethods,
        orderTypes,
      },
    });
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    return next(error);
  }
};

/**
 * Get cash flow report (transactions + expenses)
 */
export const getCashFlowReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.apiKeyTenantId!;
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const where: any = {
      outlets: {
        tenantId: tenantId,
      },
    };

    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    // Fetch all transactions (revenue)
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        total: true,
        createdAt: true,
      },
    });

    const totalRevenue = transactions.reduce((sum, t) => sum + (t.total?.toNumber() || 0), 0);

    res.json({
      success: true,
      data: {
        revenue: totalRevenue,
        expenses: 0, // Placeholder - implement expenses tracking if needed
        netCashFlow: totalRevenue,
        transactionCount: transactions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching cash flow report:', error);
    return next(error);
  }
};

/**
 * Get top selling items
 */
export const getTopSellingItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.apiKeyTenantId!;
    const { startDate, endDate, limit = 10 } = req.query;

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const where: Prisma.TransactionWhereInput = {
      outlets: {
        tenantId: tenantId,
      },
    };

    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    // Fetch transaction items
    const transactionItems = await prisma.transactionItem.findMany({
      where: {
        transactions: where,
      },
      include: {
        items: true,
      },
    });

    // Group by item and calculate totals
    const itemStats: Record<
      number,
      {
        itemId: number;
        itemName: string;
        totalQuantity: number;
        totalRevenue: number;
        transactionCount: number;
      }
    > = {};

    transactionItems.forEach((ti) => {
      if (!ti.item_id) return;

      if (!itemStats[ti.item_id]) {
        itemStats[ti.item_id] = {
          itemId: ti.item_id,
          itemName: ti.item_name || ti.items?.name || 'Unknown',
          totalQuantity: 0,
          totalRevenue: 0,
          transactionCount: 0,
        };
      }

      itemStats[ti.item_id].totalQuantity += ti.quantity.toNumber();
      itemStats[ti.item_id].totalRevenue += ti.subtotal.toNumber();
      itemStats[ti.item_id].transactionCount += 1;
    });

    // Sort by quantity and limit
    const topItems = Object.values(itemStats)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: topItems,
    });
  } catch (error) {
    console.error('Error fetching top selling items:', error);
    return next(error);
  }
};
