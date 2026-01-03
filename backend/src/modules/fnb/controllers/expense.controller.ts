import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { createActivityLog } from '../../shared/controllers/activity-log.controller';
import { generateJournalFromExpense } from '../../../services/autoJournal.service';
import { safeParseInt, safeParseDate } from '../../../utils/validation';

/**
 * Get tenant outlet IDs for isolation
 */
const getTenantOutletIds = async (tenantId: number | undefined): Promise<number[]> => {
  if (!tenantId) return [];
  const outlets = await prisma.outlets.findMany({
    where: { tenant_id: tenantId },
    select: { id: true }
  });
  return outlets.map(o => o.id);
};

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

    // Tenant isolation
    if (req.tenantId) {
      const outletIds = await getTenantOutletIds(req.tenantId);
      if (outletIds.length === 0) {
        return res.json({ success: true, data: [], count: 0 });
      }
      where.outlet_id = { in: outletIds };
    }

    // Specific outlet filter with tenant validation
    if (outlet_id) {
      const parsedOutletId = safeParseInt(outlet_id);
      if (req.tenantId) {
        const outletIds = await getTenantOutletIds(req.tenantId);
        if (!outletIds.includes(parsedOutletId)) {
          return res.status(403).json({
            success: false,
            error: { code: 'ACCESS_DENIED', message: 'Access denied to this outlet' }
          });
        }
      }
      where.outlet_id = parsedOutletId;
    }

    if (expense_type) {
      where.expense_type = expense_type as string;
    }

    if (category) {
      where.category = category as string;
    }

    if (supplier_id) {
      where.supplier_id = safeParseInt(supplier_id);
    }

    // Date validation
    if (date_from || date_to) {
      where.created_at = {};
      const fromDate = safeParseDate(date_from);
      const toDate = safeParseDate(date_to);
      if (fromDate) where.created_at.gte = fromDate;
      if (toDate) where.created_at.lte = toDate;
    }

    const expenses = await prisma.expenses.findMany({
      where,
      include: {
        users: { select: { id: true, name: true } },
        suppliers: { select: { id: true, name: true } },
        stock_movements: {
          select: {
            id: true,
            type: true,
            quantity: true,
            ingredients: { select: { name: true } },
            inventory: { select: { name: true } }
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: safeParseInt(limit, 100)
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

    const expense = await prisma.expenses.findUnique({
      where: { id: safeParseInt(id) },
      include: {
        users: { select: { id: true, name: true } },
        suppliers: { select: { id: true, name: true, phone: true, email: true } },
        outlets: true,
        stock_movements: {
          include: {
            ingredients: { select: { name: true, unit: true } },
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

    // Tenant isolation check
    if (req.tenantId && expense.outlets) {
      if (expense.outlets.tenant_id !== req.tenantId) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Access denied' }
        });
      }
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

    const parsedOutletId = safeParseInt(outletId);

    // Tenant isolation - validate outlet belongs to tenant
    if (req.tenantId) {
      const outlet = await prisma.outlets.findFirst({
        where: { id: parsedOutletId, tenant_id: req.tenantId }
      });
      if (!outlet) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Access denied to this outlet' }
        });
      }
    }

    const validTypes = ['STOCK_PURCHASE', 'SALARY', 'UTILITIES', 'RENT', 'MARKETING', 'OTHER'];
    if (!validTypes.includes(expenseType)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Expense type must be one of: ${validTypes.join(', ')}` }
      });
    }

    const expense = await prisma.expenses.create({
      data: {
        outlet_id: parsedOutletId,
        expense_type: expenseType,
        category,
        amount: parseFloat(amount),
        description: description || null,
        payment_method: paymentMethod || null,
        receipt_image: receiptImage || null,
        reference_id: referenceId ? safeParseInt(referenceId) : null,
        supplier_id: supplierId ? safeParseInt(supplierId) : null,
        invoice_number: invoiceNumber || null,
        due_date: safeParseDate(dueDate),
        paid_at: safeParseDate(paidAt),
        user_id: req.userId || 0
      },
      include: {
        users: { select: { id: true, name: true } },
        suppliers: { select: { id: true, name: true } }
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

    // Auto-Journal Hook
    generateJournalFromExpense(expense.id).catch((err: unknown) => {
        console.error('Auto-journal expense hook failed:', err);
    });

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

    const existing = await prisma.expenses.findUnique({ where: { id: parseInt(id) } });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'EXPENSE_NOT_FOUND', message: 'Expense not found' }
      });
    }

    const expense = await prisma.expenses.update({
      where: { id: parseInt(id) },
      data: {
        ...(expenseType && { expense_type: expenseType }),
        ...(category && { category }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(description !== undefined && { description }),
        ...(paymentMethod !== undefined && { payment_method: paymentMethod }),
        ...(receiptImage !== undefined && { receipt_image: receiptImage }),
        ...(supplierId !== undefined && { supplier_id: supplierId ? parseInt(supplierId) : null }),
        ...(invoiceNumber !== undefined && { invoice_number: invoiceNumber }),
        ...(dueDate !== undefined && { due_date: dueDate ? new Date(dueDate) : null }),
        ...(paidAt !== undefined && { paid_at: paidAt ? new Date(paidAt) : null })
      },
      include: {
        users: { select: { id: true, name: true } },
        suppliers: { select: { id: true, name: true } }
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
        existing.outlet_id
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

    const existing = await prisma.expenses.findUnique({ where: { id: parseInt(id) } });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'EXPENSE_NOT_FOUND', message: 'Expense not found' }
      });
    }

    await prisma.expenses.delete({ where: { id: parseInt(id) } });

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
        existing.outlet_id
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
      where.outlet_id = parseInt(outlet_id as string);
    }

    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at.gte = new Date(date_from as string);
      if (date_to) where.created_at.lte = new Date(date_to as string);
    }

    // Get total by type
    const byType = await prisma.expenses.groupBy({
      by: ['expense_type'],
      where,
      _sum: { amount: true },
      _count: true
    });

    // Get total by category
    const byCategory = await prisma.expenses.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 10
    });

    // Get total overall
    const total = await prisma.expenses.aggregate({
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
        type: t.expense_type,
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
      where.outlet_id = parseInt(outlet_id as string);
    }

    const categories = await prisma.expenses.groupBy({
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
