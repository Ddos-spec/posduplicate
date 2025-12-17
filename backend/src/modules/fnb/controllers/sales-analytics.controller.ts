import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

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
      where.outlet_id = parseInt(outlet_id as string);
    }

    if (outlet) {
      where.outlet = outlet;
    }

    if (category) {
      where.category = category;
    }

    if (sales_type) {
      where.sales_type = sales_type;
    }

    if (payment_method) {
      where.payment_method = payment_method;
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from as string);
      if (date_to) where.date.lte = new Date(date_to as string);
    }

    const transactions = await prisma.sales_transactions.findMany({
      where,
      orderBy: { date: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.sales_transactions.count({ where });

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

    const transaction = await prisma.sales_transactions.findUnique({
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

    const newTransaction = await prisma.sales_transactions.create({
      data: {
        outlet,
        receipt_number: receiptNumber,
        date: new Date(date),
        time,
        category,
        brand,
        item_name: itemName,
        variant,
        sku,
        quantity: parseInt(quantity),
        gross_sales: parseFloat(grossSales),
        discounts: parseFloat(discounts),
        refunds: parseFloat(refunds),
        net_sales: parseFloat(netSales),
        tax: parseFloat(tax),
        gratuity: parseFloat(gratuity),
        sales_type: salesType,
        payment_method: paymentMethod,
        served_by: servedBy,
        collected_by: collectedBy,
        outlet_id: outletId ? parseInt(outletId) : null
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

    const created = await prisma.sales_transactions.createMany({
      data: transactions.map((t: any) => ({
        outlet: t.outlet,
        receipt_number: t.receiptNumber,
        date: new Date(t.date),
        time: t.time,
        category: t.category,
        brand: t.brand || 'Unbranded',
        item_name: t.itemName,
        variant: t.variant,
        sku: t.sku,
        quantity: parseInt(t.quantity),
        gross_sales: parseFloat(t.grossSales),
        discounts: parseFloat(t.discounts || 0),
        refunds: parseFloat(t.refunds || 0),
        net_sales: parseFloat(t.netSales),
        tax: parseFloat(t.tax || 0),
        gratuity: parseFloat(t.gratuity || 0),
        sales_type: t.salesType,
        payment_method: t.paymentMethod,
        served_by: t.servedBy,
        collected_by: t.collectedBy,
        outlet_id: t.outletId ? parseInt(t.outletId) : null
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
      where.outlet_id = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from as string);
      if (date_to) where.date.lte = new Date(date_to as string);
    }

    const summary = await prisma.sales_transactions.aggregate({
      where,
      _sum: {
        gross_sales: true,
        discounts: true,
        refunds: true,
        net_sales: true,
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
        totalGrossSales: summary._sum.gross_sales || 0,
        totalDiscounts: summary._sum.discounts || 0,
        totalRefunds: summary._sum.refunds || 0,
        totalNetSales: summary._sum.net_sales || 0,
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
    const { outlet_id, date_from, date_to } = req.query;

    const where: any = {};

    if (outlet_id) {
      where.outlet_id = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from as string);
      if (date_to) where.date.lte = new Date(date_to as string);
    }

    // Get all transactions
    const transactions = await prisma.sales_transactions.findMany({
      where,
      select: {
        date: true,
        net_sales: true
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
      groupedData[dateKey] += parseFloat(t.net_sales.toString());
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
      where.outlet_id = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from as string);
      if (date_to) where.date.lte = new Date(date_to as string);
    }

    const topItems = await prisma.sales_transactions.groupBy({
      by: ['item_name', 'category'],
      where,
      _sum: {
        quantity: true,
        net_sales: true
      },
      orderBy: {
        _sum: {
          net_sales: 'desc'
        }
      },
      take: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: topItems.map(item => ({
        itemName: item.item_name,
        category: item.category,
        totalQuantity: item._sum.quantity || 0,
        totalNetSales: item._sum.net_sales || 0
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
      where.outlet_id = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from as string);
      if (date_to) where.date.lte = new Date(date_to as string);
    }

    const salesByCategory = await prisma.sales_transactions.groupBy({
      by: ['category'],
      where,
      _sum: {
        quantity: true,
        net_sales: true
      },
      orderBy: {
        _sum: {
          net_sales: 'desc'
        }
      }
    });

    res.json({
      success: true,
      data: salesByCategory.map(cat => ({
        category: cat.category,
        totalQuantity: cat._sum.quantity || 0,
        totalNetSales: cat._sum.net_sales || 0
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
      where.outlet_id = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from as string);
      if (date_to) where.date.lte = new Date(date_to as string);
    }

    const salesByPayment = await prisma.sales_transactions.groupBy({
      by: ['payment_method'],
      where,
      _sum: {
        net_sales: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          net_sales: 'desc'
        }
      }
    });

    res.json({
      success: true,
      data: salesByPayment.map(payment => ({
        paymentMethod: payment.payment_method,
        transactionCount: payment._count.id,
        totalNetSales: payment._sum.net_sales || 0
      }))
    });
  } catch (error) {
    return _next(error);
  }
};
