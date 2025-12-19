import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Get all budgets with filters
 */
export const getBudgets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { period_id, account_id, outlet_id, page = '1', limit = '50' } = req.query;

    const where: any = { tenant_id: tenantId };
    if (period_id) where.period_id = parseInt(period_id as string);
    if (account_id) where.account_id = parseInt(account_id as string);
    if (outlet_id) where.outlet_id = parseInt(outlet_id as string);

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [budgets, total] = await Promise.all([
      prisma.budgets.findMany({
        where,
        include: {
          chart_of_accounts: { select: { id: true, account_code: true, account_name: true } },
          accounting_periods: { select: { id: true, period_name: true, start_date: true, end_date: true } },
          outlets: { select: { id: true, name: true } },
          users: { select: { id: true, name: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.budgets.count({ where })
    ]);

    res.json({
      success: true,
      data: budgets,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get budget by ID
 */
export const getBudgetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const budget = await prisma.budgets.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId },
      include: {
        chart_of_accounts: true,
        accounting_periods: true,
        outlets: true,
        users: { select: { id: true, name: true } }
      }
    });

    if (!budget) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Budget not found' } });
    }

    res.json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
};

/**
 * Create budget
 */
export const createBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { budgetName, periodId, accountId, budgetedAmount, outletId, notes } = req.body;

    if (!budgetName || !periodId || !accountId || budgetedAmount === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Budget name, period, account, and amount are required' }
      });
    }

    // Check if budget already exists for this account/period
    const existing = await prisma.budgets.findFirst({
      where: {
        tenant_id: tenantId,
        period_id: parseInt(periodId),
        account_id: parseInt(accountId),
        outlet_id: outletId ? parseInt(outletId) : null
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE', message: 'Budget already exists for this account and period' }
      });
    }

    const budget = await prisma.budgets.create({
      data: {
        tenant_id: tenantId,
        budget_name: budgetName,
        period_id: parseInt(periodId),
        account_id: parseInt(accountId),
        budgeted_amount: new Decimal(budgetedAmount),
        outlet_id: outletId ? parseInt(outletId) : null,
        notes,
        created_by: userId
      },
      include: {
        chart_of_accounts: { select: { account_code: true, account_name: true } },
        accounting_periods: { select: { period_name: true } }
      }
    });

    res.status(201).json({ success: true, data: budget, message: 'Budget created successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Update budget
 */
export const updateBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { budgetName, budgetedAmount, notes } = req.body;

    const existing = await prisma.budgets.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Budget not found' } });
    }

    const budget = await prisma.budgets.update({
      where: { id: parseInt(id) },
      data: {
        ...(budgetName && { budget_name: budgetName }),
        ...(budgetedAmount !== undefined && { budgeted_amount: new Decimal(budgetedAmount) }),
        ...(notes !== undefined && { notes }),
        updated_at: new Date()
      },
      include: {
        chart_of_accounts: { select: { account_code: true, account_name: true } },
        accounting_periods: { select: { period_name: true } }
      }
    });

    res.json({ success: true, data: budget, message: 'Budget updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete budget
 */
export const deleteBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const existing = await prisma.budgets.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Budget not found' } });
    }

    await prisma.budgets.delete({ where: { id: parseInt(id) } });

    res.json({ success: true, message: 'Budget deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get budget vs actual comparison
 */
export const getBudgetVsActual = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { period_id, outlet_id } = req.query;

    if (!period_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Period ID is required' } });
    }

    // Get period dates
    const period = await prisma.accounting_periods.findFirst({
      where: { id: parseInt(period_id as string), tenant_id: tenantId }
    });

    if (!period) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Period not found' } });
    }

    // Get budgets for this period
    const budgetWhere: any = { tenant_id: tenantId, period_id: parseInt(period_id as string) };
    if (outlet_id) budgetWhere.outlet_id = parseInt(outlet_id as string);

    const budgets = await prisma.budgets.findMany({
      where: budgetWhere,
      include: { chart_of_accounts: true }
    });

    // Get actual amounts from GL
    const whereOutlet = outlet_id ? `AND gl.outlet_id = ${outlet_id}` : '';

    const actuals: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        gl.account_id,
        SUM(gl.debit_amount) as total_debit,
        SUM(gl.credit_amount) as total_credit
      FROM "accounting"."general_ledger" gl
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND gl.transaction_date >= '${period.start_date.toISOString()}'
      AND gl.transaction_date <= '${period.end_date.toISOString()}'
      GROUP BY gl.account_id
    `);

    const actualMap = new Map(actuals.map(a => [a.account_id, a]));

    // Build comparison
    const comparison = budgets.map(budget => {
      const actual = actualMap.get(budget.account_id);
      const coa = budget.chart_of_accounts;

      let actualAmount = 0;
      if (actual) {
        // For expense accounts: Debit - Credit
        // For revenue accounts: Credit - Debit
        if (coa.normal_balance === 'DEBIT') {
          actualAmount = Number(actual.total_debit) - Number(actual.total_credit);
        } else {
          actualAmount = Number(actual.total_credit) - Number(actual.total_debit);
        }
      }

      const budgeted = Number(budget.budgeted_amount);
      const variance = budgeted - actualAmount;
      const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;

      return {
        budgetId: budget.id,
        budgetName: budget.budget_name,
        accountId: budget.account_id,
        accountCode: coa.account_code,
        accountName: coa.account_name,
        budgetedAmount: budgeted,
        actualAmount,
        variance,
        variancePercent: Math.round(variancePercent * 100) / 100,
        status: variance >= 0 ? 'under_budget' : 'over_budget'
      };
    });

    res.json({ success: true, data: comparison, period });
  } catch (error) {
    next(error);
  }
};
