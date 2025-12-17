import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Helper: Get Date Range for Period
 */
const getDateRange = (query: any) => {
  const { startDate, endDate } = query;
  
  if (startDate && endDate) {
    return {
      start: new Date(String(startDate)),
      end: new Date(String(endDate))
    };
  }
  
  // TODO: Fetch from accounting_periods if periodId is provided
  // For now default to current month if nothing provided
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return { start, end };
};

/**
 * Get Trial Balance
 * Uses existing view 'accounting.v_trial_balance' if available, 
 * or aggregates from general_ledger
 */
export const getTrialBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    // Note: View v_trial_balance aggregates EVERYTHING (lifetime). 
    // If we want TB for a specific period, we must query general_ledger directly.
    // The prompt says "Use view v_trial_balance (already created)". 
    // Let's assume the view is sufficient for "Current State" TB.
    
    // View definition: "FROM accounting.chart_of_accounts coa LEFT JOIN accounting.journal_entry_lines ..."
    // It groups by account. It seems to sum ALL lines. This is correct for Balance Sheet accounts.
    // For P&L accounts, TB usually shows balance for the period? Or YTD?
    // Standard TB is usually "At specific date" (Cumulative).
    
    const trialBalance: any[] = await prisma.$queryRaw`
      SELECT 
        account_code, 
        account_name, 
        account_type,
        normal_balance,
        total_debit, 
        total_credit, 
        balance 
      FROM "accounting"."v_trial_balance"
      WHERE tenant_id = ${tenantId}
      ORDER BY account_code ASC
    `;

    // Calculate totals
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    // v_trial_balance view might return string/number mix for numeric types
    const formatted = trialBalance.map(row => {
      const debit = new Decimal(row.total_debit || 0);
      const credit = new Decimal(row.total_credit || 0);
      totalDebit = totalDebit.plus(debit);
      totalCredit = totalCredit.plus(credit);

      return {
        ...row,
        total_debit: debit,
        total_credit: credit,
        balance: new Decimal(row.balance || 0)
      };
    });

    res.json({
      success: true,
      data: {
        accounts: formatted,
        totals: {
          totalDebit,
          totalCredit,
          balanced: totalDebit.equals(totalCredit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Income Statement
 * (Revenue - Expenses) for a specific period
 */
export const getIncomeStatement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { start, end } = getDateRange(req.query);

    // 1. Fetch relevant accounts (Revenue, Expense, COGS)
    // We aggregate from general_ledger table filtered by date
    const plData: any[] = await prisma.$queryRaw`
      SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_type,
        SUM(gl.debit_amount) as total_debit,
        SUM(gl.credit_amount) as total_credit
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      AND gl.transaction_date >= ${start}
      AND gl.transaction_date <= ${end}
      AND coa.account_type IN ('REVENUE', 'EXPENSE', 'COGS')
      GROUP BY coa.account_code, coa.account_name, coa.account_type
      ORDER BY coa.account_code
    `;

    // 2. Structure Data
    const revenue: any[] = [];
    const cogs: any[] = [];
    const expenses: any[] = [];

    let totalRevenue = new Decimal(0);
    let totalCOGS = new Decimal(0);
    let totalExpenses = new Decimal(0);

    for (const row of plData) {
      const debit = new Decimal(row.total_debit || 0);
      const credit = new Decimal(row.total_credit || 0);
      // P&L Net Amount: 
      // Revenue (Credit normal): Credit - Debit
      // Expense (Debit normal): Debit - Credit
      
      if (row.account_type === 'REVENUE') {
        const amount = credit.minus(debit);
        revenue.push({ ...row, amount });
        totalRevenue = totalRevenue.plus(amount);
      } else if (row.account_type === 'COGS') {
        const amount = debit.minus(credit);
        cogs.push({ ...row, amount });
        totalCOGS = totalCOGS.plus(amount);
      } else {
        const amount = debit.minus(credit);
        expenses.push({ ...row, amount });
        totalExpenses = totalExpenses.plus(amount);
      }
    }

    const grossProfit = totalRevenue.minus(totalCOGS);
    const netIncome = grossProfit.minus(totalExpenses);

    res.json({
      success: true,
      data: {
        period: { start, end },
        sections: {
          revenue: { accounts: revenue, total: totalRevenue },
          cogs: { accounts: cogs, total: totalCOGS },
          grossProfit,
          expenses: { accounts: expenses, total: totalExpenses },
          netIncome
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Balance Sheet
 * (Assets = Liabilities + Equity)
 * "As of" a specific date (Cumulative)
 */
export const getBalanceSheet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { end } = getDateRange(req.query); // BS is "As of end date"

    // 1. Fetch BS accounts (Asset, Liability, Equity)
    // Aggregate from GL up to end date
    const bsData: any[] = await prisma.$queryRaw`
      SELECT 
        coa.account_code,
        coa.account_name,
        coa.account_type,
        coa.normal_balance,
        SUM(gl.debit_amount) as total_debit,
        SUM(gl.credit_amount) as total_credit
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      AND gl.transaction_date <= ${end}
      AND coa.account_type IN ('ASSET', 'CASH_BANK', 'INVENTORY', 'FIXED_ASSET', 'ACCOUNT_RECEIVABLE', 'LIABILITY', 'ACCOUNT_PAYABLE', 'TAX_PAYABLE', 'EQUITY', 'RETAINED_EARNINGS')
      GROUP BY coa.account_code, coa.account_name, coa.account_type, coa.normal_balance
      ORDER BY coa.account_code
    `;

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];

    let totalAssets = new Decimal(0);
    let totalLiabilities = new Decimal(0);
    let totalEquity = new Decimal(0);

    for (const row of bsData) {
      const debit = new Decimal(row.total_debit || 0);
      const credit = new Decimal(row.total_credit || 0);
      
      let balance = new Decimal(0);
      if (row.normal_balance === 'DEBIT') {
        balance = debit.minus(credit);
      } else {
        balance = credit.minus(debit);
      }

      // Grouping
      // Note: account_type might be specific (CASH_BANK) or generic (ASSET).
      // We categorize broadly based on known types.
      const type = row.account_type;
      
      if (['ASSET', 'CASH_BANK', 'INVENTORY', 'FIXED_ASSET', 'ACCOUNT_RECEIVABLE'].includes(type)) {
        assets.push({ ...row, balance });
        totalAssets = totalAssets.plus(balance);
      } else if (['LIABILITY', 'ACCOUNT_PAYABLE', 'TAX_PAYABLE'].includes(type)) {
        liabilities.push({ ...row, balance });
        totalLiabilities = totalLiabilities.plus(balance);
      } else {
        equity.push({ ...row, balance });
        totalEquity = totalEquity.plus(balance);
      }
    }

    // CALCULATE RETAINED EARNINGS (Current Year Earnings)
    // BS must balance. The difference is usually Net Income from P&L which goes to Retained Earnings.
    // We need to calculate Net Income for ALL TIME up to `end` date (since we don't have closing entries yet).
    // Or if we assume `accounting_periods` closes entries to RE, we check that.
    // For now, let's calculate Net Income manually and add it to Equity.
    
    const plData: any[] = await prisma.$queryRaw`
      SELECT 
        coa.account_type,
        SUM(gl.debit_amount) as total_debit,
        SUM(gl.credit_amount) as total_credit
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      AND gl.transaction_date <= ${end}
      AND coa.account_type IN ('REVENUE', 'EXPENSE', 'COGS')
      GROUP BY coa.account_type
    `;
    
    let netIncome = new Decimal(0);
    for (const row of plData) {
        const debit = new Decimal(row.total_debit || 0);
        const credit = new Decimal(row.total_credit || 0);
        if (row.account_type === 'REVENUE') {
            netIncome = netIncome.plus(credit.minus(debit));
        } else {
            netIncome = netIncome.minus(debit.minus(credit));
        }
    }

    // Add Net Income to Equity (Virtual Retained Earnings)
    equity.push({
        account_code: '9999',
        account_name: 'Current Net Income (Calculated)',
        account_type: 'EQUITY',
        balance: netIncome
    });
    totalEquity = totalEquity.plus(netIncome);

    res.json({
      success: true,
      data: {
        date: end,
        sections: {
          assets: { accounts: assets, total: totalAssets },
          liabilities: { accounts: liabilities, total: totalLiabilities },
          equity: { accounts: equity, total: totalEquity }
        },
        balanced: totalAssets.equals(totalLiabilities.plus(totalEquity)),
        check: {
            assets: totalAssets,
            liabPlusEquity: totalLiabilities.plus(totalEquity),
            diff: totalAssets.minus(totalLiabilities.plus(totalEquity))
        }
      }
    });

  } catch (error) {
    next(error);
  }
};
