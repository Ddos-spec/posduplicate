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
      where.created_at = {};
      if (date_from) where.created_at.gte = new Date(date_from as string);
      if (date_to) {
        const endDate = new Date(date_to as string);
        endDate.setHours(23, 59, 59, 999);
        where.created_at.lte = endDate;
      }
    }

    // Get transactions with items
    const transactions = await prisma.transactions.findMany({
      where,
      take: parseInt(limit as string),
      orderBy: { created_at: 'desc' },
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

    // Transform to analytics format (Grouped by Transaction)
    const analyticsData: any[] = [];

    for (const tx of transactions) {
      // Summary of items in this transaction
      const itemsList = tx.transaction_items.map(item => {
         const variantInfo = item.variants?.name ? ` (${item.variants.name})` : '';
         return `${item.item_name}${variantInfo} x${Number(item.quantity)}`;
      }).join(', ');

      // Total Quantity
      const totalQty = tx.transaction_items.reduce((sum, item) => sum + Number(item.quantity), 0);

      // Convert to WIB (UTC+7)
      const dateObj = tx.created_at ? new Date(tx.created_at.getTime() + (7 * 60 * 60 * 1000)) : new Date();

      analyticsData.push({
        id: tx.id,
        outlet: tx.outlets?.name || 'Unknown',
        receiptNumber: tx.transaction_number,
        date: dateObj.toISOString().split('T')[0], // WIB Date
        time: dateObj.toISOString().split('T')[1].substring(0, 5), // WIB Time (HH:mm)
        itemsSummary: itemsList, // New field for item summary
        quantity: totalQty,
        amount: Number(tx.total || 0), // Total Transaction Amount
        salesType: tx.order_type,
        paymentMethod: tx.payments?.[0]?.method || 'Unknown',
        servedBy: tx.users?.name || 'Unknown',
        collectedBy: tx.users?.name || 'Unknown'
      });
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
      where.created_at = {};
      if (date_from) where.created_at.gte = new Date(date_from as string);
      if (date_to) {
        const endDate = new Date(date_to as string);
        endDate.setHours(23, 59, 59, 999);
        where.created_at.lte = endDate;
      }
    }

    // Get aggregated data
    const [transactions, items] = await Promise.all([
      prisma.transactions.aggregate({
        where,
        _sum: {
          total: true,
          subtotal: true,
          discount_amount: true,
          tax_amount: true,
          service_charge: true
        },
        _count: {
          id: true
        }
      }),
      prisma.transaction_items.aggregate({
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
        totalTax: Number(transactions._sum.tax_amount || 0),
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
      where.created_at = {};
      if (date_from) where.created_at.gte = new Date(date_from as string);
      if (date_to) {
        const endDate = new Date(date_to as string);
        endDate.setHours(23, 59, 59, 999);
        where.created_at.lte = endDate;
      }
    }

    // Get transactions
    const transactions = await prisma.transactions.findMany({
      where,
      select: {
        created_at: true,
        total: true
      },
      orderBy: { created_at: 'asc' }
    });

    // Determine if "Today" or Single Day View
    let isDailyView = false;
    if (where.created_at?.gte && where.created_at?.lte) {
       const start = where.created_at.gte.getTime();
       const end = where.created_at.lte.getTime();
       const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
       isDailyView = diffDays <= 1;
    } else if (!date_from && !date_to) {
       // Default logic usually implies large range, but check your frontend default.
       // Assuming explicit filters are passed for 'Today'.
       // If no filters, we default to false (Daily Grouping).
    }

    // Group by date OR hour
    const groupedData: { [key: string]: number } = {};

    transactions.forEach(t => {
      if (!t.created_at) return;

      // Convert to WIB (UTC+7)
      const dateObj = new Date(t.created_at.getTime() + (7 * 60 * 60 * 1000));

      let key: string;
      if (isDailyView) {
          // Group by Hour: "HH:00"
          const hour = dateObj.getUTCHours().toString().padStart(2, '0');
          key = `${hour}:00`;
      } else {
          // Group by Date: "YYYY-MM-DD"
          key = dateObj.toISOString().split('T')[0];
      }

      if (!groupedData[key]) {
        groupedData[key] = 0;
      }
      groupedData[key] += Number(t.total || 0);
    });

    // If Daily View, fill gaps for 00:00 - 23:00
    if (isDailyView) {
        for (let i = 0; i < 24; i++) {
            const hourKey = `${i.toString().padStart(2, '0')}:00`;
            if (!groupedData[hourKey]) {
                groupedData[hourKey] = 0;
            }
        }
    }

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
