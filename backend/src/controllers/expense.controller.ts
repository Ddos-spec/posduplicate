import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { createActivityLog } from './activity-log.controller';

// Get all expenses with filters
export const getExpenses = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const {
      outlet_id,
      expense_type,
      category,
      supplier_id,
      date_from,
      date_to,
      limit = '100'
    } = req.query;

    const where: any = {};

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    if (expense_type) {
      where.expenseType = expense_type as string;
    }

    if (category) {
      where.category = category as string;
    }

    if (supplier_id) {
      where.supplierId = parseInt(supplier_id as string);
    }

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt.gte = new Date(date_from as string);
      if (date_to) where.createdAt.lte = new Date(date_to as string);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        stockMovement: {
          select: {
            id: true,
            type: true,
            quantity: true,
            ingredient: { select: { name: true } },
            inventory: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string)
    });

    res.json({ success: true, data: expenses, count: expenses.length });
  } catch (error) {
    return _next(error);
  }
};

// Get single expense
export const getExpense = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true, phone: true, email: true } },
        stockMovement: {
          include: {
            ingredient: { select: { name: true, unit: true } },
            inventory: { select: { name: true, unit: true } }
          }
        }
      }
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { code: 'EXPENSE_NOT_FOUND', message: 'Expense not found' }
      });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    return _next(error);
  }
};

// Create new expense
export const createExpense = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const {
      outletId,
      expenseType,
      category,
      amount,
      description,
      paymentMethod,
      receiptImage,
      referenceId,
      supplierId,
      invoiceNumber,
      dueDate,
      paidAt
    } = req.body;

    // Validation
    if (!outletId || !expenseType || !category || !amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Outlet ID, expense type, category, and amount are required' }
      });
    }

    const validTypes = ['STOCK_PURCHASE', 'SALARY', 'UTILITIES', 'RENT', 'MARKETING', 'OTHER'];
    if (!validTypes.includes(expenseType)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Expense type must be one of: ${validTypes.join(', ')}` }
      });
    }

    const expense = await prisma.expense.create({
      data: {
        outletId: parseInt(outletId),
        expenseType,
        category,
        amount: parseFloat(amount),
        description: description || null,
        paymentMethod: paymentMethod || null,
        receiptImage: receiptImage || null,
        referenceId: referenceId ? parseInt(referenceId) : null,
        supplierId: supplierId ? parseInt(supplierId) : null,
        invoiceNumber: invoiceNumber || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        paidAt: paidAt ? new Date(paidAt) : null,
        userId: req.userId || 0
      },
      include: {
        user: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } }
      }
    });

    // Create activity log
    try {
      await createActivityLog(
        req.userId || 0,
        'expense_create',
        'expense',
        expense.id,
        null,
        expense,
        `Created ${expenseType} expense`,
        parseInt(outletId)
      );
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
    }

    res.json({
      success: true,
      message: 'Expense created successfully',
      data: expense
    });
  } catch (error) {
    return _next(error);
  }
};

// Update expense
export const updateExpense = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      expenseType,
      category,
      amount,
      description,
      paymentMethod,
      receiptImage,
      supplierId,
      invoiceNumber,
      dueDate,
      paidAt
    } = req.body;

    const existing = await prisma.expense.findUnique({ where: { id: parseInt(id) } });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'EXPENSE_NOT_FOUND', message: 'Expense not found' }
      });
    }

    const expense = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        ...(expenseType && { expenseType }),
        ...(category && { category }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(description !== undefined && { description }),
        ...(paymentMethod !== undefined && { paymentMethod }),
        ...(receiptImage !== undefined && { receiptImage }),
        ...(supplierId !== undefined && { supplierId: supplierId ? parseInt(supplierId) : null }),
        ...(invoiceNumber !== undefined && { invoiceNumber }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(paidAt !== undefined && { paidAt: paidAt ? new Date(paidAt) : null })
      },
      include: {
        user: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } }
      }
    });

    // Create activity log
    try {
      await createActivityLog(
        req.userId || 0,
        'expense_update',
        'expense',
        expense.id,
        existing,
        expense,
        'Updated expense',
        existing.outletId
      );
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
    }

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: expense
    });
  } catch (error) {
    return _next(error);
  }
};

// Delete expense
export const deleteExpense = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Reason for deletion is required' }
      });
    }

    const existing = await prisma.expense.findUnique({ where: { id: parseInt(id) } });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'EXPENSE_NOT_FOUND', message: 'Expense not found' }
      });
    }

    await prisma.expense.delete({ where: { id: parseInt(id) } });

    // Create activity log
    try {
      await createActivityLog(
        req.userId || 0,
        'expense_delete',
        'expense',
        parseInt(id),
        existing,
        null,
        reason,
        existing.outletId
      );
    } catch (logError) {
      console.error('Failed to create activity log:', logError);
    }

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    return _next(error);
  }
};

// Get expense summary/statistics
export const getExpenseSummary = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id, date_from, date_to } = req.query;
    const where: any = {};

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt.gte = new Date(date_from as string);
      if (date_to) where.createdAt.lte = new Date(date_to as string);
    }

    // Get total by type
    const byType = await prisma.expense.groupBy({
      by: ['expenseType'],
      where,
      _sum: { amount: true },
      _count: true
    });

    // Get total by category
    const byCategory = await prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 10
    });

    // Get total overall
    const total = await prisma.expense.aggregate({
      where,
      _sum: { amount: true },
      _count: true
    });

    const summary = {
      total: {
        amount: parseFloat((total._sum.amount || 0).toString()),
        count: total._count || 0
      },
      byType: byType.map((t: any) => ({
        type: t.expenseType,
        amount: parseFloat((t._sum.amount || 0).toString()),
        count: t._count
      })),
      byCategory: byCategory.map((c: any) => ({
        category: c.category,
        amount: parseFloat((c._sum.amount || 0).toString()),
        count: c._count
      }))
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    return _next(error);
  }
};

// Get expense categories
export const getExpenseCategories = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { outlet_id } = req.query;
    const where: any = {};

    if (outlet_id) {
      where.outletId = parseInt(outlet_id as string);
    }

    const categories = await prisma.expense.groupBy({
      by: ['category'],
      where,
      _count: true,
      orderBy: { _count: { category: 'desc' } }
    });

    const data = categories.map((c: any) => ({
      category: c.category,
      count: c._count
    }));

    res.json({ success: true, data });
  } catch (error) {
    return _next(error);
  }
};
