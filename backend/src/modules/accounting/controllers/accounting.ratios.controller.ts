import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * FINANCIAL RATIOS & KPIs
 * Complete financial analysis dashboard
 */

interface FinancialRatios {
  liquidity: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
    workingCapital: number;
  };
  profitability: {
    grossProfitMargin: number;
    netProfitMargin: number;
    returnOnAssets: number;
    returnOnEquity: number;
    operatingMargin: number;
  };
  efficiency: {
    assetTurnover: number;
    inventoryTurnover: number;
    receivablesTurnover: number;
    payablesTurnover: number;
    daysSalesOutstanding: number;
    daysPayableOutstanding: number;
    daysInventoryOutstanding: number;
    cashConversionCycle: number;
  };
  leverage: {
    debtToEquity: number;
    debtToAssets: number;
    equityMultiplier: number;
    interestCoverage: number;
  };
}

/**
 * Get Comprehensive Financial Ratios
 */
export const getFinancialRatios = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { asOfDate, outletId } = req.query;

    const endDate = asOfDate ? new Date(asOfDate as string) : new Date();
    const startOfYear = new Date(endDate.getFullYear(), 0, 1);
    const whereOutlet = outletId ? `AND gl.outlet_id = ${outletId}` : '';

    // Get all account balances
    const balances: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        coa.account_type,
        coa.category,
        SUM(CASE WHEN coa.normal_balance = 'DEBIT' THEN gl.debit_amount - gl.credit_amount
                 ELSE gl.credit_amount - gl.debit_amount END) as balance
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND gl.transaction_date <= '${endDate.toISOString()}'
      GROUP BY coa.account_type, coa.category
    `);

    // Get YTD Income Statement
    const incomeData: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        coa.account_type,
        SUM(CASE WHEN coa.normal_balance = 'CREDIT' THEN gl.credit_amount - gl.debit_amount
                 ELSE gl.debit_amount - gl.credit_amount END) as amount
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND gl.transaction_date >= '${startOfYear.toISOString()}'
      AND gl.transaction_date <= '${endDate.toISOString()}'
      AND coa.account_type IN ('REVENUE', 'EXPENSE', 'COGS')
      GROUP BY coa.account_type
    `);

    // Parse balances
    let currentAssets = 0, currentLiabilities = 0, totalAssets = 0, totalLiabilities = 0;
    let totalEquity = 0, inventory = 0, receivables = 0, payables = 0, cash = 0, fixedAssets = 0;

    balances.forEach(row => {
      const bal = Number(row.balance || 0);
      switch (row.account_type) {
        case 'CASH_BANK':
          cash += bal;
          currentAssets += bal;
          totalAssets += bal;
          break;
        case 'ACCOUNT_RECEIVABLE':
          receivables += bal;
          currentAssets += bal;
          totalAssets += bal;
          break;
        case 'INVENTORY':
          inventory += bal;
          currentAssets += bal;
          totalAssets += bal;
          break;
        case 'FIXED_ASSET':
          fixedAssets += bal;
          totalAssets += bal;
          break;
        case 'ASSET':
          totalAssets += bal;
          if (!row.category?.toLowerCase().includes('fixed')) {
            currentAssets += bal;
          }
          break;
        case 'ACCOUNT_PAYABLE':
          payables += bal;
          currentLiabilities += bal;
          totalLiabilities += bal;
          break;
        case 'TAX_PAYABLE':
          currentLiabilities += bal;
          totalLiabilities += bal;
          break;
        case 'LIABILITY':
          totalLiabilities += bal;
          if (row.category?.toLowerCase().includes('current') || row.category?.toLowerCase().includes('payable')) {
            currentLiabilities += bal;
          }
          break;
        case 'EQUITY':
        case 'RETAINED_EARNINGS':
          totalEquity += bal;
          break;
      }
    });

    // Parse income
    let revenue = 0, cogs = 0, expenses = 0;
    incomeData.forEach(row => {
      const amt = Number(row.amount || 0);
      switch (row.account_type) {
        case 'REVENUE': revenue = amt; break;
        case 'COGS': cogs = amt; break;
        case 'EXPENSE': expenses = amt; break;
      }
    });

    const grossProfit = revenue - cogs;
    const netIncome = revenue - cogs - expenses;

    // Calculate Ratios
    const ratios: FinancialRatios = {
      liquidity: {
        currentRatio: currentLiabilities > 0 ? round(currentAssets / currentLiabilities, 2) : 0,
        quickRatio: currentLiabilities > 0 ? round((currentAssets - inventory) / currentLiabilities, 2) : 0,
        cashRatio: currentLiabilities > 0 ? round(cash / currentLiabilities, 2) : 0,
        workingCapital: round(currentAssets - currentLiabilities, 0)
      },
      profitability: {
        grossProfitMargin: revenue > 0 ? round((grossProfit / revenue) * 100, 2) : 0,
        netProfitMargin: revenue > 0 ? round((netIncome / revenue) * 100, 2) : 0,
        returnOnAssets: totalAssets > 0 ? round((netIncome / totalAssets) * 100, 2) : 0,
        returnOnEquity: totalEquity > 0 ? round((netIncome / totalEquity) * 100, 2) : 0,
        operatingMargin: revenue > 0 ? round(((revenue - cogs - expenses) / revenue) * 100, 2) : 0
      },
      efficiency: {
        assetTurnover: totalAssets > 0 ? round(revenue / totalAssets, 2) : 0,
        inventoryTurnover: inventory > 0 ? round(cogs / inventory, 2) : 0,
        receivablesTurnover: receivables > 0 ? round(revenue / receivables, 2) : 0,
        payablesTurnover: payables > 0 ? round(cogs / payables, 2) : 0,
        daysSalesOutstanding: receivables > 0 && revenue > 0 ? round((receivables / revenue) * 365, 0) : 0,
        daysPayableOutstanding: payables > 0 && cogs > 0 ? round((payables / cogs) * 365, 0) : 0,
        daysInventoryOutstanding: inventory > 0 && cogs > 0 ? round((inventory / cogs) * 365, 0) : 0,
        cashConversionCycle: 0 // Calculated below
      },
      leverage: {
        debtToEquity: totalEquity > 0 ? round(totalLiabilities / totalEquity, 2) : 0,
        debtToAssets: totalAssets > 0 ? round(totalLiabilities / totalAssets, 2) : 0,
        equityMultiplier: totalEquity > 0 ? round(totalAssets / totalEquity, 2) : 0,
        interestCoverage: 0 // Would need interest expense data
      }
    };

    // Cash Conversion Cycle = DIO + DSO - DPO
    ratios.efficiency.cashConversionCycle =
      ratios.efficiency.daysInventoryOutstanding +
      ratios.efficiency.daysSalesOutstanding -
      ratios.efficiency.daysPayableOutstanding;

    // Health Score (0-100)
    const healthScore = calculateHealthScore(ratios);

    // Benchmarks (industry average)
    const benchmarks = {
      currentRatio: { min: 1.5, ideal: 2.0, max: 3.0 },
      quickRatio: { min: 1.0, ideal: 1.5, max: 2.0 },
      grossProfitMargin: { min: 20, ideal: 35, max: 50 },
      netProfitMargin: { min: 5, ideal: 15, max: 25 },
      debtToEquity: { min: 0, ideal: 0.5, max: 1.5 }
    };

    res.json({
      success: true,
      data: {
        ratios,
        healthScore,
        benchmarks,
        rawData: {
          currentAssets,
          currentLiabilities,
          totalAssets,
          totalLiabilities,
          totalEquity,
          revenue,
          cogs,
          expenses,
          grossProfit,
          netIncome
        },
        asOfDate: endDate.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get KPI Dashboard
 */
export const getKPIDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { period = 'monthly', outletId } = req.query;
    const whereOutlet = outletId ? `AND outlet_id = ${outletId}` : '';
    const whereOutletGL = outletId ? `AND gl.outlet_id = ${outletId}` : '';

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current Month Revenue
    const currentRevenue: any[] = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(gl.credit_amount - gl.debit_amount), 0) as total
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutletGL}
      AND coa.account_type = 'REVENUE'
      AND gl.transaction_date >= '${startOfMonth.toISOString()}'
    `);

    // Last Month Revenue (for comparison)
    const lastRevenue: any[] = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(gl.credit_amount - gl.debit_amount), 0) as total
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutletGL}
      AND coa.account_type = 'REVENUE'
      AND gl.transaction_date >= '${startOfLastMonth.toISOString()}'
      AND gl.transaction_date <= '${endOfLastMonth.toISOString()}'
    `);

    // Transaction Count
    const txCount: any[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM "transactions"
      WHERE outlet_id IN (SELECT id FROM outlets WHERE tenant_id = ${tenantId})
      ${whereOutlet.replace('outlet_id', 'outlet_id')}
      AND status = 'completed'
      AND created_at >= '${startOfMonth.toISOString()}'
    `);

    // Average Transaction Value
    const avgTx: any[] = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(AVG(total), 0) as avg
      FROM "transactions"
      WHERE outlet_id IN (SELECT id FROM outlets WHERE tenant_id = ${tenantId})
      ${whereOutlet.replace('outlet_id', 'outlet_id')}
      AND status = 'completed'
      AND created_at >= '${startOfMonth.toISOString()}'
    `);

    // Outstanding Receivables
    const arOutstanding: any[] = await prisma.$queryRaw`
      SELECT COALESCE(SUM(balance), 0) as total
      FROM "accounting"."accounts_receivable"
      WHERE tenant_id = ${tenantId} AND status NOT IN ('paid', 'bad_debt')
    `;

    // Outstanding Payables
    const apOutstanding: any[] = await prisma.$queryRaw`
      SELECT COALESCE(SUM(balance), 0) as total
      FROM "accounting"."accounts_payable"
      WHERE tenant_id = ${tenantId} AND status NOT IN ('paid', 'cancelled')
    `;

    // Cash Balance
    const cashBalance: any[] = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) as total
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutletGL}
      AND coa.account_type = 'CASH_BANK'
    `);

    const currentRev = Number(currentRevenue[0]?.total || 0);
    const lastRev = Number(lastRevenue[0]?.total || 0);
    const revenueGrowth = lastRev > 0 ? ((currentRev - lastRev) / lastRev) * 100 : 0;

    res.json({
      success: true,
      data: {
        kpis: [
          {
            name: 'Pendapatan Bulan Ini',
            value: currentRev,
            previousValue: lastRev,
            change: round(revenueGrowth, 1),
            trend: revenueGrowth >= 0 ? 'up' : 'down',
            format: 'currency'
          },
          {
            name: 'Jumlah Transaksi',
            value: Number(txCount[0]?.count || 0),
            format: 'number'
          },
          {
            name: 'Rata-rata Transaksi',
            value: round(Number(avgTx[0]?.avg || 0), 0),
            format: 'currency'
          },
          {
            name: 'Piutang Outstanding',
            value: Number(arOutstanding[0]?.total || 0),
            format: 'currency'
          },
          {
            name: 'Hutang Outstanding',
            value: Number(apOutstanding[0]?.total || 0),
            format: 'currency'
          },
          {
            name: 'Saldo Kas',
            value: Number(cashBalance[0]?.total || 0),
            format: 'currency'
          }
        ],
        period: {
          current: { start: startOfMonth.toISOString(), end: now.toISOString() },
          previous: { start: startOfLastMonth.toISOString(), end: endOfLastMonth.toISOString() }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Trend Analysis
 */
export const getTrendAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { months = 12, outletId, metrics = 'revenue,expense,profit' } = req.query;
    const whereOutlet = outletId ? `AND gl.outlet_id = ${outletId}` : '';
    const monthsCount = parseInt(months as string);
    const requestedMetrics = (metrics as string).split(',');

    const trends: any[] = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const monthData: any[] = await prisma.$queryRawUnsafe(`
        SELECT
          coa.account_type,
          SUM(CASE WHEN coa.normal_balance = 'CREDIT' THEN gl.credit_amount - gl.debit_amount
                   ELSE gl.debit_amount - gl.credit_amount END) as amount
        FROM "accounting"."general_ledger" gl
        JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
        WHERE gl.tenant_id = ${tenantId}
        ${whereOutlet}
        AND gl.transaction_date >= '${startOfMonth.toISOString()}'
        AND gl.transaction_date <= '${endOfMonth.toISOString()}'
        AND coa.account_type IN ('REVENUE', 'EXPENSE', 'COGS')
        GROUP BY coa.account_type
      `);

      let revenue = 0, expenses = 0, cogs = 0;
      monthData.forEach(row => {
        const amt = Number(row.amount || 0);
        switch (row.account_type) {
          case 'REVENUE': revenue = amt; break;
          case 'COGS': cogs = amt; break;
          case 'EXPENSE': expenses = amt; break;
        }
      });

      const entry: any = {
        month: startOfMonth.toISOString().substring(0, 7),
        label: startOfMonth.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
      };

      if (requestedMetrics.includes('revenue')) entry.revenue = revenue;
      if (requestedMetrics.includes('expense')) entry.expense = expenses + cogs;
      if (requestedMetrics.includes('profit')) entry.profit = revenue - expenses - cogs;
      if (requestedMetrics.includes('cogs')) entry.cogs = cogs;
      if (requestedMetrics.includes('grossProfit')) entry.grossProfit = revenue - cogs;

      trends.push(entry);
    }

    // Calculate growth rates
    const growthRates: any = {};
    if (trends.length >= 2) {
      const latest = trends[trends.length - 1];
      const previous = trends[trends.length - 2];

      Object.keys(latest).forEach(key => {
        if (key !== 'month' && key !== 'label' && typeof latest[key] === 'number') {
          const prev = previous[key] || 0;
          growthRates[key] = prev > 0 ? round(((latest[key] - prev) / prev) * 100, 1) : 0;
        }
      });
    }

    res.json({
      success: true,
      data: {
        trends,
        growthRates,
        summary: {
          avgRevenue: trends.length > 0 ? round(trends.reduce((s, t) => s + (t.revenue || 0), 0) / trends.length, 0) : 0,
          avgProfit: trends.length > 0 ? round(trends.reduce((s, t) => s + (t.profit || 0), 0) / trends.length, 0) : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
function round(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function calculateHealthScore(ratios: FinancialRatios): number {
  let score = 0;
  let maxScore = 0;

  // Liquidity (25 points)
  maxScore += 25;
  if (ratios.liquidity.currentRatio >= 1.5 && ratios.liquidity.currentRatio <= 3) score += 15;
  else if (ratios.liquidity.currentRatio >= 1) score += 10;
  else if (ratios.liquidity.currentRatio >= 0.5) score += 5;

  if (ratios.liquidity.quickRatio >= 1) score += 10;
  else if (ratios.liquidity.quickRatio >= 0.5) score += 5;

  // Profitability (35 points)
  maxScore += 35;
  if (ratios.profitability.netProfitMargin >= 15) score += 15;
  else if (ratios.profitability.netProfitMargin >= 10) score += 12;
  else if (ratios.profitability.netProfitMargin >= 5) score += 8;
  else if (ratios.profitability.netProfitMargin > 0) score += 4;

  if (ratios.profitability.returnOnEquity >= 15) score += 10;
  else if (ratios.profitability.returnOnEquity >= 10) score += 7;
  else if (ratios.profitability.returnOnEquity > 0) score += 4;

  if (ratios.profitability.grossProfitMargin >= 30) score += 10;
  else if (ratios.profitability.grossProfitMargin >= 20) score += 7;
  else if (ratios.profitability.grossProfitMargin >= 10) score += 4;

  // Efficiency (20 points)
  maxScore += 20;
  if (ratios.efficiency.cashConversionCycle < 30) score += 10;
  else if (ratios.efficiency.cashConversionCycle < 60) score += 7;
  else if (ratios.efficiency.cashConversionCycle < 90) score += 4;

  if (ratios.efficiency.assetTurnover >= 2) score += 10;
  else if (ratios.efficiency.assetTurnover >= 1) score += 7;
  else if (ratios.efficiency.assetTurnover >= 0.5) score += 4;

  // Leverage (20 points)
  maxScore += 20;
  if (ratios.leverage.debtToEquity <= 0.5) score += 10;
  else if (ratios.leverage.debtToEquity <= 1) score += 7;
  else if (ratios.leverage.debtToEquity <= 2) score += 4;

  if (ratios.leverage.debtToAssets <= 0.3) score += 10;
  else if (ratios.leverage.debtToAssets <= 0.5) score += 7;
  else if (ratios.leverage.debtToAssets <= 0.7) score += 4;

  return Math.round((score / maxScore) * 100);
}
