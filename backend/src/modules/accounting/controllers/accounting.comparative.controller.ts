import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * COMPARATIVE FINANCIAL REPORTS
 * Period-over-period comparison with variance analysis
 */

interface ComparisonPeriod {
  label: string;
  startDate: string;
  endDate: string;
}

/**
 * Comparative Income Statement
 */
export const getComparativeIncomeStatement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { periods, outletId } = req.body;

    if (!periods || periods.length < 2) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'At least 2 periods required for comparison' }
      });
    }

    const whereOutlet = outletId ? `AND gl.outlet_id = ${outletId}` : '';
    const results: any[] = [];

    for (const period of periods) {
      const data: any[] = await prisma.$queryRawUnsafe(`
        SELECT
          coa.account_type,
          coa.account_code,
          coa.account_name,
          SUM(CASE WHEN coa.normal_balance = 'CREDIT' THEN gl.credit_amount - gl.debit_amount
                   ELSE gl.debit_amount - gl.credit_amount END) as amount
        FROM "accounting"."general_ledger" gl
        JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
        WHERE gl.tenant_id = ${tenantId}
        ${whereOutlet}
        AND gl.transaction_date >= '${new Date(period.startDate).toISOString()}'
        AND gl.transaction_date <= '${new Date(period.endDate).toISOString()}'
        AND coa.account_type IN ('REVENUE', 'EXPENSE', 'COGS')
        GROUP BY coa.account_type, coa.account_code, coa.account_name
        ORDER BY coa.account_code
      `);

      let revenue = 0, cogs = 0, expenses = 0;
      const accounts: any[] = [];

      data.forEach(row => {
        const amount = Number(row.amount || 0);
        accounts.push({
          accountCode: row.account_code,
          accountName: row.account_name,
          accountType: row.account_type,
          amount
        });

        switch (row.account_type) {
          case 'REVENUE': revenue += amount; break;
          case 'COGS': cogs += amount; break;
          case 'EXPENSE': expenses += amount; break;
        }
      });

      results.push({
        period: period.label,
        startDate: period.startDate,
        endDate: period.endDate,
        revenue,
        cogs,
        grossProfit: revenue - cogs,
        expenses,
        netIncome: revenue - cogs - expenses,
        grossProfitMargin: revenue > 0 ? ((revenue - cogs) / revenue * 100).toFixed(2) : 0,
        netProfitMargin: revenue > 0 ? ((revenue - cogs - expenses) / revenue * 100).toFixed(2) : 0,
        accounts
      });
    }

    // Calculate variances between consecutive periods
    const variances = [];
    for (let i = 1; i < results.length; i++) {
      const current = results[i];
      const previous = results[i - 1];

      variances.push({
        comparison: `${current.period} vs ${previous.period}`,
        revenueChange: current.revenue - previous.revenue,
        revenueChangePercent: previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue * 100).toFixed(2) : 'N/A',
        grossProfitChange: current.grossProfit - previous.grossProfit,
        netIncomeChange: current.netIncome - previous.netIncome,
        netIncomeChangePercent: previous.netIncome !== 0 ? ((current.netIncome - previous.netIncome) / Math.abs(previous.netIncome) * 100).toFixed(2) : 'N/A'
      });
    }

    res.json({
      success: true,
      data: {
        periods: results,
        variances,
        summary: {
          totalPeriods: results.length,
          averageRevenue: results.reduce((s, r) => s + r.revenue, 0) / results.length,
          averageNetIncome: results.reduce((s, r) => s + r.netIncome, 0) / results.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Comparative Balance Sheet
 */
export const getComparativeBalanceSheet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { dates, outletId } = req.body; // Array of as-of dates

    if (!dates || dates.length < 2) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'At least 2 dates required for comparison' }
      });
    }

    const whereOutlet = outletId ? `AND gl.outlet_id = ${outletId}` : '';
    const results: any[] = [];

    for (const dateInfo of dates) {
      const asOfDate = new Date(dateInfo.date);

      const data: any[] = await prisma.$queryRawUnsafe(`
        SELECT
          coa.account_type,
          coa.account_code,
          coa.account_name,
          SUM(CASE WHEN coa.normal_balance = 'DEBIT' THEN gl.debit_amount - gl.credit_amount
                   ELSE gl.credit_amount - gl.debit_amount END) as balance
        FROM "accounting"."general_ledger" gl
        JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
        WHERE gl.tenant_id = ${tenantId}
        ${whereOutlet}
        AND gl.transaction_date <= '${asOfDate.toISOString()}'
        AND coa.account_type NOT IN ('REVENUE', 'EXPENSE', 'COGS')
        GROUP BY coa.account_type, coa.account_code, coa.account_name
        ORDER BY coa.account_code
      `);

      let totalAssets = 0, totalLiabilities = 0, totalEquity = 0;
      const accounts: any[] = [];

      data.forEach(row => {
        const balance = Number(row.balance || 0);
        accounts.push({
          accountCode: row.account_code,
          accountName: row.account_name,
          accountType: row.account_type,
          balance
        });

        if (['ASSET', 'CASH_BANK', 'ACCOUNT_RECEIVABLE', 'INVENTORY', 'FIXED_ASSET'].includes(row.account_type)) {
          totalAssets += balance;
        } else if (['LIABILITY', 'ACCOUNT_PAYABLE', 'TAX_PAYABLE'].includes(row.account_type)) {
          totalLiabilities += balance;
        } else if (['EQUITY', 'RETAINED_EARNINGS'].includes(row.account_type)) {
          totalEquity += balance;
        }
      });

      results.push({
        label: dateInfo.label,
        asOfDate: dateInfo.date,
        totalAssets,
        totalLiabilities,
        totalEquity,
        liabilitiesAndEquity: totalLiabilities + totalEquity,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
        accounts
      });
    }

    // Calculate changes
    const changes = [];
    for (let i = 1; i < results.length; i++) {
      const current = results[i];
      const previous = results[i - 1];

      changes.push({
        comparison: `${current.label} vs ${previous.label}`,
        assetsChange: current.totalAssets - previous.totalAssets,
        assetsChangePercent: previous.totalAssets > 0 ? ((current.totalAssets - previous.totalAssets) / previous.totalAssets * 100).toFixed(2) : 'N/A',
        liabilitiesChange: current.totalLiabilities - previous.totalLiabilities,
        equityChange: current.totalEquity - previous.totalEquity
      });
    }

    res.json({
      success: true,
      data: { balanceSheets: results, changes }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Year-over-Year Analysis
 */
export const getYearOverYearAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { years = 3, metric = 'revenue', outletId } = req.query;

    const yearsCount = parseInt(years as string);
    const currentYear = new Date().getFullYear();
    const whereOutlet = outletId ? `AND gl.outlet_id = ${outletId}` : '';

    const results: any[] = [];

    for (let i = 0; i < yearsCount; i++) {
      const year = currentYear - i;
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      let accountTypes = '';
      switch (metric) {
        case 'revenue':
          accountTypes = "'REVENUE'";
          break;
        case 'expense':
          accountTypes = "'EXPENSE', 'COGS'";
          break;
        case 'profit':
          accountTypes = "'REVENUE', 'EXPENSE', 'COGS'";
          break;
        default:
          accountTypes = "'REVENUE'";
      }

      const data: any[] = await prisma.$queryRawUnsafe(`
        SELECT
          coa.account_type,
          EXTRACT(MONTH FROM gl.transaction_date) as month,
          SUM(CASE WHEN coa.normal_balance = 'CREDIT' THEN gl.credit_amount - gl.debit_amount
                   ELSE gl.debit_amount - gl.credit_amount END) as amount
        FROM "accounting"."general_ledger" gl
        JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
        WHERE gl.tenant_id = ${tenantId}
        ${whereOutlet}
        AND gl.transaction_date >= '${startDate.toISOString()}'
        AND gl.transaction_date <= '${endDate.toISOString()}'
        AND coa.account_type IN (${accountTypes})
        GROUP BY coa.account_type, EXTRACT(MONTH FROM gl.transaction_date)
        ORDER BY month
      `);

      // Build monthly data
      const monthlyData = Array(12).fill(0);
      let yearTotal = 0;

      data.forEach(row => {
        const month = parseInt(row.month) - 1;
        let amount = Number(row.amount || 0);

        if (metric === 'profit') {
          if (row.account_type === 'REVENUE') {
            monthlyData[month] += amount;
            yearTotal += amount;
          } else {
            monthlyData[month] -= amount;
            yearTotal -= amount;
          }
        } else if (metric === 'expense') {
          monthlyData[month] += Math.abs(amount);
          yearTotal += Math.abs(amount);
        } else {
          monthlyData[month] += amount;
          yearTotal += amount;
        }
      });

      results.unshift({
        year,
        total: yearTotal,
        average: yearTotal / 12,
        monthlyData,
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      });
    }

    // Calculate YoY growth
    const yoyGrowth = [];
    for (let i = 1; i < results.length; i++) {
      const current = results[i];
      const previous = results[i - 1];

      yoyGrowth.push({
        year: current.year,
        previousYear: previous.year,
        growth: current.total - previous.total,
        growthPercent: previous.total !== 0 ? ((current.total - previous.total) / Math.abs(previous.total) * 100).toFixed(2) : 'N/A'
      });
    }

    res.json({
      success: true,
      data: {
        metric,
        years: results,
        yoyGrowth,
        cagr: results.length >= 2 ? calculateCAGR(results[0].total, results[results.length - 1].total, results.length - 1) : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Budget vs Actual Comparative
 */
export const getBudgetVsActualComparative = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { periodIds, outletId } = req.body;

    if (!periodIds || periodIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Period IDs required' }
      });
    }

    const results = [];

    for (const periodId of periodIds) {
      const period = await prisma.accounting_periods.findFirst({
        where: { id: periodId, tenant_id: tenantId }
      });

      if (!period) continue;

      const whereOutlet = outletId ? `AND outlet_id = ${outletId}` : '';
      const whereOutletGL = outletId ? `AND gl.outlet_id = ${outletId}` : '';

      // Get budgets
      const budgets = await prisma.budgets.findMany({
        where: {
          tenant_id: tenantId,
          period_id: periodId,
          ...(outletId && { outlet_id: parseInt(outletId) })
        },
        include: { chart_of_accounts: true }
      });

      // Get actuals
      const actuals: any[] = await prisma.$queryRawUnsafe(`
        SELECT
          gl.account_id,
          SUM(CASE WHEN coa.normal_balance = 'DEBIT' THEN gl.debit_amount - gl.credit_amount
                   ELSE gl.credit_amount - gl.debit_amount END) as amount
        FROM "accounting"."general_ledger" gl
        JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
        WHERE gl.tenant_id = ${tenantId}
        ${whereOutletGL}
        AND gl.transaction_date >= '${period.start_date.toISOString()}'
        AND gl.transaction_date <= '${period.end_date.toISOString()}'
        GROUP BY gl.account_id
      `);

      const actualMap = new Map(actuals.map(a => [a.account_id, Number(a.amount || 0)]));

      const comparison = budgets.map(budget => {
        const budgeted = Number(budget.budgeted_amount);
        const actual = actualMap.get(budget.account_id) || 0;
        const variance = budgeted - actual;
        const variancePercent = budgeted > 0 ? (variance / budgeted * 100) : 0;

        return {
          accountCode: budget.chart_of_accounts.account_code,
          accountName: budget.chart_of_accounts.account_name,
          budgeted,
          actual,
          variance,
          variancePercent: variancePercent.toFixed(2),
          status: variance >= 0 ? 'favorable' : 'unfavorable'
        };
      });

      results.push({
        period: period.period_name,
        startDate: period.start_date,
        endDate: period.end_date,
        comparison,
        totals: {
          totalBudgeted: comparison.reduce((s, c) => s + c.budgeted, 0),
          totalActual: comparison.reduce((s, c) => s + c.actual, 0),
          totalVariance: comparison.reduce((s, c) => s + c.variance, 0)
        }
      });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

// Helper: Calculate CAGR
function calculateCAGR(beginningValue: number, endingValue: number, years: number): string {
  if (beginningValue <= 0 || years <= 0) return '0.00';
  const cagr = (Math.pow(endingValue / beginningValue, 1 / years) - 1) * 100;
  return cagr.toFixed(2);
}
