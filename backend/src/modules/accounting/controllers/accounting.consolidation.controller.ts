import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

/**
 * CONSOLIDATION REPORTS
 * Multi-outlet/entity consolidation
 */

/**
 * Get Consolidated Income Statement
 */
export const getConsolidatedIncomeStatement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { startDate, endDate, outletIds } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Start and end date required' }
      });
    }

    // Get all outlets if not specified
    let outlets;
    if (outletIds) {
      const ids = (outletIds as string).split(',').map(id => parseInt(id));
      outlets = await prisma.outlets.findMany({
        where: { tenant_id: tenantId, id: { in: ids } }
      });
    } else {
      outlets = await prisma.outlets.findMany({
        where: { tenant_id: tenantId, is_active: true }
      });
    }

    const outletResults: any[] = [];
    let consolidatedRevenue = 0, consolidatedCOGS = 0, consolidatedExpenses = 0;

    for (const outlet of outlets) {
      const data: any[] = await prisma.$queryRawUnsafe(`
        SELECT
          coa.account_type,
          SUM(CASE WHEN coa.normal_balance = 'CREDIT' THEN gl.credit_amount - gl.debit_amount
                   ELSE gl.debit_amount - gl.credit_amount END) as amount
        FROM "accounting"."general_ledger" gl
        JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
        WHERE gl.tenant_id = ${tenantId}
        AND gl.outlet_id = ${outlet.id}
        AND gl.transaction_date >= '${new Date(startDate as string).toISOString()}'
        AND gl.transaction_date <= '${new Date(endDate as string).toISOString()}'
        AND coa.account_type IN ('REVENUE', 'EXPENSE', 'COGS')
        GROUP BY coa.account_type
      `);

      let revenue = 0, cogs = 0, expenses = 0;
      data.forEach(row => {
        const amount = Number(row.amount || 0);
        switch (row.account_type) {
          case 'REVENUE': revenue = amount; break;
          case 'COGS': cogs = amount; break;
          case 'EXPENSE': expenses = amount; break;
        }
      });

      outletResults.push({
        outletId: outlet.id,
        outletName: outlet.name,
        revenue,
        cogs,
        grossProfit: revenue - cogs,
        expenses,
        netIncome: revenue - cogs - expenses,
        contribution: 0 // Calculated below
      });

      consolidatedRevenue += revenue;
      consolidatedCOGS += cogs;
      consolidatedExpenses += expenses;
    }

    // Calculate contribution percentages
    const consolidatedNetIncome = consolidatedRevenue - consolidatedCOGS - consolidatedExpenses;
    outletResults.forEach(outlet => {
      outlet.contribution = consolidatedNetIncome !== 0
        ? (outlet.netIncome / consolidatedNetIncome * 100).toFixed(2)
        : 0;
    });

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        outlets: outletResults,
        consolidated: {
          revenue: consolidatedRevenue,
          cogs: consolidatedCOGS,
          grossProfit: consolidatedRevenue - consolidatedCOGS,
          expenses: consolidatedExpenses,
          netIncome: consolidatedNetIncome,
          grossProfitMargin: consolidatedRevenue > 0 ? ((consolidatedRevenue - consolidatedCOGS) / consolidatedRevenue * 100).toFixed(2) : 0,
          netProfitMargin: consolidatedRevenue > 0 ? (consolidatedNetIncome / consolidatedRevenue * 100).toFixed(2) : 0
        },
        outletCount: outlets.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Consolidated Balance Sheet
 */
export const getConsolidatedBalanceSheet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { asOfDate, outletIds } = req.query;

    const date = asOfDate ? new Date(asOfDate as string) : new Date();

    let outlets;
    if (outletIds) {
      const ids = (outletIds as string).split(',').map(id => parseInt(id));
      outlets = await prisma.outlets.findMany({
        where: { tenant_id: tenantId, id: { in: ids } }
      });
    } else {
      outlets = await prisma.outlets.findMany({
        where: { tenant_id: tenantId, is_active: true }
      });
    }

    const outletResults: any[] = [];
    let consolidatedAssets = 0, consolidatedLiabilities = 0, consolidatedEquity = 0;

    for (const outlet of outlets) {
      const data: any[] = await prisma.$queryRawUnsafe(`
        SELECT
          coa.account_type,
          SUM(CASE WHEN coa.normal_balance = 'DEBIT' THEN gl.debit_amount - gl.credit_amount
                   ELSE gl.credit_amount - gl.debit_amount END) as balance
        FROM "accounting"."general_ledger" gl
        JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
        WHERE gl.tenant_id = ${tenantId}
        AND gl.outlet_id = ${outlet.id}
        AND gl.transaction_date <= '${date.toISOString()}'
        AND coa.account_type NOT IN ('REVENUE', 'EXPENSE', 'COGS')
        GROUP BY coa.account_type
      `);

      let assets = 0, liabilities = 0, equity = 0;
      data.forEach(row => {
        const balance = Number(row.balance || 0);
        if (['ASSET', 'CASH_BANK', 'ACCOUNT_RECEIVABLE', 'INVENTORY', 'FIXED_ASSET'].includes(row.account_type)) {
          assets += balance;
        } else if (['LIABILITY', 'ACCOUNT_PAYABLE', 'TAX_PAYABLE'].includes(row.account_type)) {
          liabilities += balance;
        } else if (['EQUITY', 'RETAINED_EARNINGS'].includes(row.account_type)) {
          equity += balance;
        }
      });

      outletResults.push({
        outletId: outlet.id,
        outletName: outlet.name,
        totalAssets: assets,
        totalLiabilities: liabilities,
        totalEquity: equity
      });

      consolidatedAssets += assets;
      consolidatedLiabilities += liabilities;
      consolidatedEquity += equity;
    }

    res.json({
      success: true,
      data: {
        asOfDate: date.toISOString().split('T')[0],
        outlets: outletResults,
        consolidated: {
          totalAssets: consolidatedAssets,
          totalLiabilities: consolidatedLiabilities,
          totalEquity: consolidatedEquity,
          liabilitiesAndEquity: consolidatedLiabilities + consolidatedEquity,
          isBalanced: Math.abs(consolidatedAssets - (consolidatedLiabilities + consolidatedEquity)) < 1
        },
        outletCount: outlets.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Outlet Performance Comparison
 */
export const getOutletPerformanceComparison = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { startDate, endDate, metric = 'revenue' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Start and end date required' }
      });
    }

    const outlets = await prisma.outlets.findMany({
      where: { tenant_id: tenantId, is_active: true }
    });

    const results: any[] = [];

    for (const outlet of outlets) {
      // Revenue
      const revenueData: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(gl.credit_amount - gl.debit_amount), 0) as amount
        FROM "accounting"."general_ledger" gl
        JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
        WHERE gl.tenant_id = ${tenantId}
        AND gl.outlet_id = ${outlet.id}
        AND gl.transaction_date >= '${new Date(startDate as string).toISOString()}'
        AND gl.transaction_date <= '${new Date(endDate as string).toISOString()}'
        AND coa.account_type = 'REVENUE'
      `);

      // Expenses
      const expenseData: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) as amount
        FROM "accounting"."general_ledger" gl
        JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
        WHERE gl.tenant_id = ${tenantId}
        AND gl.outlet_id = ${outlet.id}
        AND gl.transaction_date >= '${new Date(startDate as string).toISOString()}'
        AND gl.transaction_date <= '${new Date(endDate as string).toISOString()}'
        AND coa.account_type IN ('EXPENSE', 'COGS')
      `);

      // Transaction Count
      const txCount: any[] = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
        FROM "transactions"
        WHERE outlet_id = ${outlet.id}
        AND status = 'completed'
        AND created_at >= '${new Date(startDate as string).toISOString()}'
        AND created_at <= '${new Date(endDate as string).toISOString()}'
      `);

      const revenue = Number(revenueData[0]?.amount || 0);
      const expenses = Number(expenseData[0]?.amount || 0);
      const transactions = Number(txCount[0]?.count || 0);
      const salesTotal = Number(txCount[0]?.total || 0);

      results.push({
        outletId: outlet.id,
        outletName: outlet.name,
        revenue,
        expenses,
        netIncome: revenue - expenses,
        profitMargin: revenue > 0 ? ((revenue - expenses) / revenue * 100).toFixed(2) : 0,
        transactionCount: transactions,
        averageTicket: transactions > 0 ? (salesTotal / transactions).toFixed(0) : 0
      });
    }

    // Sort by selected metric
    results.sort((a, b) => b[metric as string] - a[metric as string]);

    // Add rankings
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        metric,
        outlets: results,
        summary: {
          totalOutlets: results.length,
          topPerformer: results[0]?.outletName || 'N/A',
          totalRevenue: results.reduce((s, r) => s + r.revenue, 0),
          totalNetIncome: results.reduce((s, r) => s + r.netIncome, 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Intercompany Transactions (between outlets)
 */
export const getIntercompanyTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { startDate, endDate } = req.query;

    // This would track transactions between outlets
    // For now, return structure - would need intercompany account tagging
    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        transactions: [],
        eliminations: [],
        note: 'Intercompany tracking requires outlet-to-outlet transaction tagging'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Segment Analysis
 */
export const getSegmentAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { startDate, endDate, segmentBy = 'outlet' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Start and end date required' }
      });
    }

    let segments: any[] = [];

    if (segmentBy === 'outlet') {
      const outlets = await prisma.outlets.findMany({
        where: { tenant_id: tenantId, is_active: true }
      });

      for (const outlet of outlets) {
        const data: any[] = await prisma.$queryRawUnsafe(`
          SELECT
            'revenue' as type,
            COALESCE(SUM(gl.credit_amount - gl.debit_amount), 0) as amount
          FROM "accounting"."general_ledger" gl
          JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
          WHERE gl.tenant_id = ${tenantId}
          AND gl.outlet_id = ${outlet.id}
          AND gl.transaction_date >= '${new Date(startDate as string).toISOString()}'
          AND gl.transaction_date <= '${new Date(endDate as string).toISOString()}'
          AND coa.account_type = 'REVENUE'
        `);

        segments.push({
          segmentId: outlet.id,
          segmentName: outlet.name,
          segmentType: 'outlet',
          revenue: Number(data[0]?.amount || 0)
        });
      }
    } else if (segmentBy === 'category') {
      // Segment by product category
      const categoryData: any[] = await prisma.$queryRawUnsafe(`
        SELECT
          COALESCE(ti.items->>'category_id', 'Uncategorized') as category,
          SUM(ti.subtotal) as revenue
        FROM "transactions" t
        JOIN "transaction_items" ti ON t.id = ti.transaction_id
        WHERE t.outlet_id IN (SELECT id FROM outlets WHERE tenant_id = ${tenantId})
        AND t.status = 'completed'
        AND t.created_at >= '${new Date(startDate as string).toISOString()}'
        AND t.created_at <= '${new Date(endDate as string).toISOString()}'
        GROUP BY ti.items->>'category_id'
      `);

      segments = categoryData.map((c, idx) => ({
        segmentId: idx,
        segmentName: c.category,
        segmentType: 'category',
        revenue: Number(c.revenue || 0)
      }));
    }

    // Calculate percentages
    const totalRevenue = segments.reduce((s, seg) => s + seg.revenue, 0);
    segments.forEach(seg => {
      seg.percentage = totalRevenue > 0 ? (seg.revenue / totalRevenue * 100).toFixed(2) : 0;
    });

    // Sort by revenue
    segments.sort((a, b) => b.revenue - a.revenue);

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        segmentBy,
        segments,
        totalRevenue
      }
    });
  } catch (error) {
    next(error);
  }
};
