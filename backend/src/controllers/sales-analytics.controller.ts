import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

// Get all sales transactions
export const getAllSalesTransactions = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const {
      outlet_id,
      outlet,
      date_from,
      date_to,
      category,
      sales_type,
      payment_method,
      limit = '100',
      offset = '0'
    } = req.query;

    const where: any = {};

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    if (outlet) {
      where.outlet = outlet;
    }

    if (category) {
      where.category = category;
    }

    if (sales_type) {
      where.salesType = sales_type;
    }

    if (payment_method) {
      where.paymentMethod = payment_method;
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from as string);
      if (date_to) where.date.lte = new Date(date_to as string);
    }

    const transactions = await prisma.salesTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.salesTransaction.count({ where });

    res.json({
      success: true,
      data: transactions,
      count: transactions.length,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    return _next(error);
  }
};

// Get single sales transaction
export const getSalesTransactionById = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.salesTransaction.findUnique({
      where: { id: parseInt(id) }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan' }
      });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    return _next(error);
  }
};

// Create sales transaction
export const createSalesTransaction = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const {
      outlet,
      receiptNumber,
      date,
      time,
      category,
      brand = 'Unbranded',
      itemName,
      variant,
      sku,
      quantity,
      grossSales,
      discounts = 0,
      refunds = 0,
      netSales,
      tax = 0,
      gratuity = 0,
      salesType,
      paymentMethod,
      servedBy,
      collectedBy,
      outletId
    } = req.body;

    // Validation
    if (!outlet || !receiptNumber || !date || !time || !category || !itemName || !quantity || !grossSales || !salesType || !paymentMethod || !servedBy || !collectedBy) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Field wajib tidak lengkap' }
      });
    }

    const newTransaction = await prisma.salesTransaction.create({
      data: {
        outlet,
        receiptNumber,
        date: new Date(date),
        time,
        category,
        brand,
        itemName,
        variant,
        sku,
        quantity: parseInt(quantity),
        grossSales: parseFloat(grossSales),
        discounts: parseFloat(discounts),
        refunds: parseFloat(refunds),
        netSales: parseFloat(netSales),
        tax: parseFloat(tax),
        gratuity: parseFloat(gratuity),
        salesType,
        paymentMethod,
        servedBy,
        collectedBy,
        outletId: outletId ? parseInt(outletId) : null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Transaksi berhasil ditambahkan',
      data: newTransaction
    });
  } catch (error) {
    return _next(error);
  }
};

// Bulk create sales transactions
export const bulkCreateSalesTransactions = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Transactions array is required' }
      });
    }

    const created = await prisma.salesTransaction.createMany({
      data: transactions.map((t: any) => ({
        outlet: t.outlet,
        receiptNumber: t.receiptNumber,
        date: new Date(t.date),
        time: t.time,
        category: t.category,
        brand: t.brand || 'Unbranded',
        itemName: t.itemName,
        variant: t.variant,
        sku: t.sku,
        quantity: parseInt(t.quantity),
        grossSales: parseFloat(t.grossSales),
        discounts: parseFloat(t.discounts || 0),
        refunds: parseFloat(t.refunds || 0),
        netSales: parseFloat(t.netSales),
        tax: parseFloat(t.tax || 0),
        gratuity: parseFloat(t.gratuity || 0),
        salesType: t.salesType,
        paymentMethod: t.paymentMethod,
        servedBy: t.servedBy,
        collectedBy: t.collectedBy,
        outletId: t.outletId ? parseInt(t.outletId) : null
      })),
      skipDuplicates: true
    });

    res.status(201).json({
      success: true,
      message: `${created.count} transaksi berhasil ditambahkan`,
      count: created.count
    });
  } catch (error) {
    return _next(error);
  }
};

// Get analytics summary
export const getAnalyticsSummary = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, date_from, date_to } = req.query;

    const where: any = {};

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from as string);
      if (date_to) where.date.lte = new Date(date_to as string);
    }

    const summary = await prisma.salesTransaction.aggregate({
      where,
      _sum: {
        grossSales: true,
        discounts: true,
        refunds: true,
        netSales: true,
        tax: true,
        gratuity: true,
        quantity: true
      },
      _count: {
        id: true
      }
    });

    res.json({
      success: true,
      data: {
        totalTransactions: summary._count.id,
        totalQuantity: summary._sum.quantity || 0,
        totalGrossSales: summary._sum.grossSales || 0,
        totalDiscounts: summary._sum.discounts || 0,
        totalRefunds: summary._sum.refunds || 0,
        totalNetSales: summary._sum.netSales || 0,
        totalTax: summary._sum.tax || 0,
        totalGratuity: summary._sum.gratuity || 0
      }
    });
  } catch (error) {
    return _next(error);
  }
};

// Get net sales trend (for chart)
export const getNetSalesTrend = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, date_from, date_to, group_by = 'day' } = req.query;

    const where: any = {};

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from as string);
      if (date_to) where.date.lte = new Date(date_to as string);
    }

    // Get all transactions
    const transactions = await prisma.salesTransaction.findMany({
      where,
      select: {
        date: true,
        netSales: true
      },
      orderBy: { date: 'asc' }
    });

    // Group by date
    const groupedData: { [key: string]: number } = {};

    transactions.forEach(t => {
      const dateKey = t.date.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = 0;
      }
      groupedData[dateKey] += parseFloat(t.netSales.toString());
    });

    // Convert to array format for chart
    const trendData = Object.keys(groupedData)
      .sort()
      .map(date => ({
        date,
        netSales: groupedData[date],
        netSalesFormatted: new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR'
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

// Get top selling items
export const getTopSellingItems = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, date_from, date_to, limit = '10' } = req.query;

    const where: any = {};

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from as string);
      if (date_to) where.date.lte = new Date(date_to as string);
    }

    const topItems = await prisma.salesTransaction.groupBy({
      by: ['itemName', 'category'],
      where,
      _sum: {
        quantity: true,
        netSales: true
      },
      orderBy: {
        _sum: {
          netSales: 'desc'
        }
      },
      take: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: topItems.map(item => ({
        itemName: item.itemName,
        category: item.category,
        totalQuantity: item._sum.quantity || 0,
        totalNetSales: item._sum.netSales || 0
      }))
    });
  } catch (error) {
    return _next(error);
  }
};

// Get sales by category
export const getSalesByCategory = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, date_from, date_to } = req.query;

    const where: any = {};

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from as string);
      if (date_to) where.date.lte = new Date(date_to as string);
    }

    const salesByCategory = await prisma.salesTransaction.groupBy({
      by: ['category'],
      where,
      _sum: {
        quantity: true,
        netSales: true
      },
      orderBy: {
        _sum: {
          netSales: 'desc'
        }
      }
    });

    res.json({
      success: true,
      data: salesByCategory.map(cat => ({
        category: cat.category,
        totalQuantity: cat._sum.quantity || 0,
        totalNetSales: cat._sum.netSales || 0
      }))
    });
  } catch (error) {
    return _next(error);
  }
};

// Get sales by payment method
export const getSalesByPaymentMethod = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, date_from, date_to } = req.query;

    const where: any = {};

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from as string);
      if (date_to) where.date.lte = new Date(date_to as string);
    }

    const salesByPayment = await prisma.salesTransaction.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: {
        netSales: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          netSales: 'desc'
        }
      }
    });

    res.json({
      success: true,
      data: salesByPayment.map(payment => ({
        paymentMethod: payment.paymentMethod,
        transactionCount: payment._count.id,
        totalNetSales: payment._sum.netSales || 0
      }))
    });
  } catch (error) {
    return _next(error);
  }
};
