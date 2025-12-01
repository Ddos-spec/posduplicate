import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';

/**
 * Get sales report for the authenticated tenant
 */
export const getSalesReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.apiKeyTenantId!;
    const { startDate, endDate, outletId, date } = req.query;

    // Build date filter
    const dateFilter: any = {};

    // SIMPLIFICATION: Support single 'date' parameter for full-day reports
    if (date) {
      // Start of the day (00:00:00)
      const start = new Date(date as string);
      start.setHours(0, 0, 0, 0);
      dateFilter.gte = start;

      // End of the day (23:59:59)
      const end = new Date(date as string);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    } 
    // Fallback to manual startDate/endDate range
    else {
      if (startDate) {
        dateFilter.gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
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
      totalRevenue: transactions.reduce((sum, t) => sum + (Number(t.total) || 0), 0),
      totalDiscount: transactions.reduce((sum, t) => sum + (Number(t.discountAmount) || 0), 0),
      totalTax: transactions.reduce((sum, t) => sum + (Number(t.taxAmount) || 0), 0),
      totalItems: transactions.reduce(
        (sum, t) => sum + t.transaction_items.reduce((itemSum, item) => itemSum + Number(item.quantity), 0),
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
          subtotal: Number(t.subtotal),
          discountAmount: Number(t.discountAmount),
          taxAmount: Number(t.taxAmount),
          total: Number(t.total),
          cashier: t.users?.name,
          outlet: t.outlets?.name,
          createdAt: t.createdAt,
          items: t.transaction_items.map((item) => ({
            itemName: item.item_name,
            variant: item.variants?.name,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
            subtotal: Number(item.subtotal),
          })),
          payments: t.payments.map((p) => ({
            method: p.method,
            amount: Number(p.amount),
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
      lowStockItems: items.filter((item) => Number(item.stock) <= Number(item.minStock)).length,
      totalStockValue: items.reduce((sum, item) => sum + Number(item.price) * Number(item.stock || 0), 0),
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
          stock: Number(item.stock || 0),
          minStock: Number(item.minStock || 0),
          price: Number(item.price),
          outlet: item.outlets?.name,
          isLowStock: Number(item.stock || 0) <= Number(item.minStock || 0),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching stock report:', error);
    return next(error);
  }
};