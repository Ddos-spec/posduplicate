import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

/**
 * Get all transactions with details for analytics
 * Transforms actual POS transactions to analytics format
 */
export const getTransactionAnalytics = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { tenantId } = req;
    const {
      outlet_id,
      date_from,
      date_to,
      category,
      limit = '100'
    } = req.query;

    const where: any = {
      status: 'completed'
    };

    // Filter by tenant
    if (tenantId) {
      const outletIds = await getOutletIdsByTenant(tenantId);
      where.outletId = { in: outletIds };
    }

    // Filter by specific outlet
    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    // Filter by date range
    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt.gte = new Date(date_from as string);
      if (date_to) {
        const endDate = new Date(date_to as string);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Get transactions with items
    const transactions = await prisma.transaction.findMany({
      where,
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      include: {
        transaction_items: {
          include: {
            items: {
              include: {
                categories: true
              }
            },
            variants: true
          }
        },
        outlets: {
          select: {
            name: true
          }
        },
        users: {
          select: {
            name: true
          }
        },
        payments: true
      }
    });

    // Transform to analytics format
    const analyticsData: any[] = [];

    for (const tx of transactions) {
      for (const item of tx.transaction_items) {
        // Filter by category if specified
        if (category && item.items?.categories?.name !== category) {
          continue;
        }

        const netSales = Number(item.subtotal) - Number(item.discount_amount || 0);

        analyticsData.push({
          id: item.id,
          outlet: tx.outlets?.name || 'Unknown',
          receiptNumber: tx.transaction_number,
          date: tx.createdAt?.toISOString().split('T')[0] || '',
          time: tx.createdAt?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) || '',
          category: item.items?.categories?.name || 'Uncategorized',
          brand: 'Unbranded',
          itemName: item.item_name,
          variant: item.variants?.name || null,
          sku: item.items?.sku || null,
          quantity: Number(item.quantity),
          grossSales: Number(item.subtotal),
          discounts: Number(item.discount_amount || 0),
          refunds: 0,
          netSales: netSales,
          tax: Number(tx.taxAmount || 0),
          gratuity: Number(tx.service_charge || 0),
          salesType: tx.order_type,
          paymentMethod: tx.payments?.[0]?.method || 'cash',
          servedBy: tx.users?.name || 'Unknown',
          collectedBy: tx.users?.name || 'Unknown'
        });
      }
    }

    res.json({
      success: true,
      data: analyticsData,
      count: analyticsData.length,
      total: analyticsData.length
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Get analytics summary from actual transactions
 */
export const getTransactionAnalyticsSummary = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { tenantId } = req;
    const { outlet_id, date_from, date_to } = req.query;

    const where: any = {
      status: 'completed'
    };

    // Filter by tenant
    if (tenantId) {
      const outletIds = await getOutletIdsByTenant(tenantId);
      where.outletId = { in: outletIds };
    }

    // Filter by outlet
    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    // Filter by date range
    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt.gte = new Date(date_from as string);
      if (date_to) {
        const endDate = new Date(date_to as string);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Get aggregated data
    const [transactions, items] = await Promise.all([
      prisma.transaction.aggregate({
        where,
        _sum: {
          total: true,
          subtotal: true,
          discountAmount: true,
          taxAmount: true,
          service_charge: true
        },
        _count: {
          id: true
        }
      }),
      prisma.transactionItem.aggregate({
        where: {
          transactions: where
        },
        _sum: {
          quantity: true,
          subtotal: true,
          discount_amount: true
        }
      })
    ]);

    const totalGrossSales = Number(items._sum.subtotal || 0);
    const totalDiscounts = Number(items._sum.discount_amount || 0);
    const totalNetSales = Number(transactions._sum.total || 0);

    res.json({
      success: true,
      data: {
        totalTransactions: transactions._count.id,
        totalQuantity: Number(items._sum.quantity || 0),
        totalGrossSales,
        totalDiscounts,
        totalRefunds: 0,
        totalNetSales,
        totalTax: Number(transactions._sum.taxAmount || 0),
        totalGratuity: Number(transactions._sum.service_charge || 0)
      }
    });
  } catch (error) {
    return _next(error);
  }
};

/**
 * Get net sales trend from actual transactions
 */
export const getTransactionAnalyticsTrend = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { tenantId } = req;
    const { outlet_id, date_from, date_to } = req.query;

    const where: any = {
      status: 'completed'
    };

    // Filter by tenant
    if (tenantId) {
      const outletIds = await getOutletIdsByTenant(tenantId);
      where.outletId = { in: outletIds };
    }

    // Filter by outlet
    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    // Filter by date range
    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt.gte = new Date(date_from as string);
      if (date_to) {
        const endDate = new Date(date_to as string);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        createdAt: true,
        total: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by date
    const groupedData: { [key: string]: number } = {};

    transactions.forEach(t => {
      if (!t.createdAt) return;
      const dateKey = t.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = 0;
      }
      groupedData[dateKey] += Number(t.total || 0);
    });

    // Convert to array format for chart
    const trendData = Object.keys(groupedData)
      .sort()
      .map(date => ({
        date,
        netSales: groupedData[date],
        netSalesFormatted: new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0
        }).format(groupedData[date])
      }));

    res.json({
      success: true,
      data: trendData,
      count: trendData.length
    });
  } catch (error) {
    return _next(error);
  }
};

// Helper function
async function getOutletIdsByTenant(tenantId: number): Promise<number[]> {
  const outlets = await prisma.outlet.findMany({
    where: { tenantId },
    select: { id: true }
  });
  return outlets.map(o => o.id);
}
