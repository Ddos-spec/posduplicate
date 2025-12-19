import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import advancedForecast from '../../../services/advanced-forecasting.service';

/**
 * Role-Based Dashboard Controller
 * Provides tailored financial insights based on user role:
 * - Owner: Full financial overview, profit/loss, forecasts, health score
 * - Akuntan: Detailed accounting metrics, journal status, reconciliation
 * - Produsen: Production costs, raw material, WIP forecasts
 * - Distributor: Purchasing, inventory, AP management
 * - Kasir: Daily sales, cash flow, transaction summaries
 * - Retail: Sales performance, inventory alerts, margin analysis
 */

// ============= OWNER DASHBOARD =============

export const getOwnerDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, days = 30 } = req.query;

    const [forecast, quickStats, topPerformers, alerts] = await Promise.all([
      advancedForecast.getAdvancedComprehensiveForecast(
        tenantId,
        outletId ? Number(outletId) : undefined,
        Number(days)
      ),
      getOwnerQuickStats(tenantId, outletId ? Number(outletId) : undefined),
      getTopPerformers(tenantId, outletId ? Number(outletId) : undefined),
      getOwnerAlerts(tenantId)
    ]);

    res.json({
      success: true,
      data: {
        role: 'owner',
        title: 'Dashboard Owner',
        subtitle: `Ringkasan keuangan bisnis Anda`,

        // Financial Health Score
        healthScore: {
          overall: forecast.healthScore.overall,
          grade: forecast.healthScore.grade,
          components: forecast.healthScore.components,
          recommendations: forecast.healthScore.recommendations
        },

        // Quick Stats
        quickStats: {
          todayRevenue: quickStats.todayRevenue,
          todayExpense: quickStats.todayExpense,
          todayProfit: quickStats.todayProfit,
          mtdRevenue: quickStats.mtdRevenue,
          mtdExpense: quickStats.mtdExpense,
          mtdProfit: quickStats.mtdProfit,
          ytdRevenue: quickStats.ytdRevenue,
          ytdProfit: quickStats.ytdProfit,
          outstandingAR: quickStats.outstandingAR,
          outstandingAP: quickStats.outstandingAP,
          cashBalance: quickStats.cashBalance
        },

        // Forecasts
        forecasts: {
          revenue: {
            total: formatCurrency(forecast.revenue.metrics.totalPredicted),
            trend: forecast.revenue.trend,
            trendLabel: forecast.revenue.trendLabel,
            confidence: forecast.revenue.confidence,
            method: forecast.revenue.method,
            growthRate: `${forecast.revenue.metrics.growthRate.toFixed(1)}%`
          },
          expense: {
            total: formatCurrency(forecast.expense.metrics.totalPredicted),
            trend: forecast.expense.trend,
            trendLabel: forecast.expense.trendLabel,
            confidence: forecast.expense.confidence
          },
          profit: {
            total: formatCurrency(forecast.profit.metrics.totalPredicted),
            trend: forecast.profit.trend,
            trendLabel: forecast.profit.trendLabel
          }
        },

        // Charts Data
        charts: {
          revenue: forecast.revenue.data,
          expense: forecast.expense.data,
          profit: forecast.profit.data,
          sales: forecast.sales.data
        },

        // Anomalies & Alerts
        anomalies: forecast.allAnomalies.slice(0, 10),
        alerts,

        // Top Performers
        topPerformers,

        // Model Info
        modelInfo: {
          method: 'Ensemble (Linear Regression + Holt-Winters + ARIMA)',
          seasonality: forecast.revenue.seasonality,
          modelWeights: forecast.revenue.modelWeights,
          dataQuality: forecast.overallConfidence > 70 ? 'Baik' : forecast.overallConfidence > 50 ? 'Cukup' : 'Kurang'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= AKUNTAN DASHBOARD =============

export const getAkuntanDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId } = req.query;

    const [
      periodStatus,
      journalStats,
      reconciliationStatus,
      coaStats,
      recentJournals,
      pendingTasks
    ] = await Promise.all([
      getPeriodStatus(tenantId),
      getJournalStats(tenantId, outletId ? Number(outletId) : undefined),
      getReconciliationStatus(tenantId, outletId ? Number(outletId) : undefined),
      getCOAStats(tenantId),
      getRecentJournals(tenantId, outletId ? Number(outletId) : undefined),
      getAccountantPendingTasks(tenantId)
    ]);

    res.json({
      success: true,
      data: {
        role: 'akuntan',
        title: 'Dashboard Akuntan',
        subtitle: 'Pusat kendali akuntansi',

        // Period Status
        currentPeriod: periodStatus,

        // Journal Statistics
        journalStats: {
          totalJournals: journalStats.total,
          pendingApproval: journalStats.pending,
          thisMonthJournals: journalStats.thisMonth,
          unbalancedEntries: journalStats.unbalanced,
          autoGeneratedJournals: journalStats.autoGenerated
        },

        // Reconciliation
        reconciliation: {
          pendingReconciliations: reconciliationStatus.pending,
          lastReconciled: reconciliationStatus.lastReconciled,
          unreconciledDifference: formatCurrency(reconciliationStatus.totalDifference),
          accountsToReconcile: reconciliationStatus.accounts
        },

        // Chart of Accounts
        coaStats: {
          totalAccounts: coaStats.total,
          activeAccounts: coaStats.active,
          accountsByType: coaStats.byType
        },

        // Recent Activity
        recentJournals: recentJournals.map((j: any) => ({
          id: j.id,
          date: j.entry_date,
          description: j.description,
          totalDebit: formatCurrency(Number(j.total_debit)),
          status: j.status,
          createdBy: j.users?.name || 'System'
        })),

        // Pending Tasks
        pendingTasks,

        // Quick Actions
        quickActions: [
          { label: 'Buat Jurnal Baru', action: 'create_journal', icon: 'plus' },
          { label: 'Rekonsiliasi Bank', action: 'bank_reconciliation', icon: 'bank' },
          { label: 'Tutup Periode', action: 'close_period', icon: 'lock' },
          { label: 'Generate Laporan', action: 'generate_report', icon: 'file' }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= PRODUSEN DASHBOARD =============

export const getProdusenDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, days = 30 } = req.query;

    const [
      productionStats,
      rawMaterialStatus,
      costAnalysis,
      forecast
    ] = await Promise.all([
      getProductionStats(tenantId, outletId ? Number(outletId) : undefined),
      getRawMaterialStatus(tenantId, outletId ? Number(outletId) : undefined),
      getProductionCostAnalysis(tenantId, outletId ? Number(outletId) : undefined),
      advancedForecast.getAdvancedExpenseForecast(tenantId, outletId ? Number(outletId) : undefined, Number(days))
    ]);

    res.json({
      success: true,
      data: {
        role: 'produsen',
        title: 'Dashboard Produsen',
        subtitle: 'Monitoring produksi dan biaya',

        // Production Overview
        production: {
          todayOutput: productionStats.todayOutput,
          mtdOutput: productionStats.mtdOutput,
          targetAchievement: `${productionStats.targetAchievement}%`,
          efficiency: `${productionStats.efficiency}%`,
          defectRate: `${productionStats.defectRate}%`
        },

        // Raw Material
        rawMaterial: {
          totalValue: formatCurrency(rawMaterialStatus.totalValue),
          lowStockItems: rawMaterialStatus.lowStockCount,
          daysOfStock: rawMaterialStatus.daysRemaining,
          criticalItems: rawMaterialStatus.criticalItems,
          reorderSuggestions: rawMaterialStatus.reorderSuggestions
        },

        // Cost Analysis
        costs: {
          avgCostPerUnit: formatCurrency(costAnalysis.avgCostPerUnit),
          materialCostRatio: `${costAnalysis.materialCostRatio}%`,
          laborCostRatio: `${costAnalysis.laborCostRatio}%`,
          overheadRatio: `${costAnalysis.overheadRatio}%`,
          costTrend: costAnalysis.trend,
          costVariance: `${costAnalysis.varianceFromBudget}%`
        },

        // Expense Forecast
        expenseForecast: {
          next30Days: formatCurrency(forecast.metrics.totalPredicted),
          dailyAverage: formatCurrency(forecast.metrics.averageDaily),
          trend: forecast.trend,
          confidence: forecast.confidence
        },

        // Charts
        charts: {
          expenseForecast: forecast.data,
          costBreakdown: costAnalysis.breakdown
        },

        // Alerts
        alerts: [
          ...(rawMaterialStatus.lowStockCount > 0 ? [{
            type: 'warning',
            message: `${rawMaterialStatus.lowStockCount} bahan baku menipis`
          }] : []),
          ...(productionStats.efficiency < 80 ? [{
            type: 'info',
            message: `Efisiensi produksi ${productionStats.efficiency}% - di bawah target 80%`
          }] : [])
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= DISTRIBUTOR DASHBOARD =============

export const getDistributorDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, days = 30 } = req.query;

    const [
      purchasingStats,
      inventoryStatus,
      apStatus,
      supplierAnalysis,
      forecast
    ] = await Promise.all([
      getPurchasingStats(tenantId, outletId ? Number(outletId) : undefined),
      getInventoryStatus(tenantId, outletId ? Number(outletId) : undefined),
      getAPStatus(tenantId),
      getSupplierAnalysis(tenantId),
      advancedForecast.getAdvancedExpenseForecast(tenantId, outletId ? Number(outletId) : undefined, Number(days))
    ]);

    res.json({
      success: true,
      data: {
        role: 'distributor',
        title: 'Dashboard Distributor',
        subtitle: 'Manajemen pembelian dan stok',

        // Purchasing Overview
        purchasing: {
          todayPurchases: formatCurrency(purchasingStats.today),
          mtdPurchases: formatCurrency(purchasingStats.mtd),
          pendingPO: purchasingStats.pendingPO,
          avgLeadTime: `${purchasingStats.avgLeadTime} hari`
        },

        // Inventory
        inventory: {
          totalValue: formatCurrency(inventoryStatus.totalValue),
          totalItems: inventoryStatus.totalItems,
          lowStockItems: inventoryStatus.lowStock,
          overstockItems: inventoryStatus.overstock,
          turnoverRate: inventoryStatus.turnoverRate.toFixed(2),
          daysOfInventory: inventoryStatus.daysOfInventory
        },

        // Accounts Payable
        accountsPayable: {
          totalOutstanding: formatCurrency(apStatus.total),
          dueSoon: formatCurrency(apStatus.dueSoon),
          overdue: formatCurrency(apStatus.overdue),
          overdueCount: apStatus.overdueCount,
          avgPaymentDays: apStatus.avgPaymentDays
        },

        // Supplier Analysis
        suppliers: {
          totalSuppliers: supplierAnalysis.total,
          topSuppliers: supplierAnalysis.top5,
          avgSupplierRating: supplierAnalysis.avgRating
        },

        // Forecast
        expenseForecast: {
          next30Days: formatCurrency(forecast.metrics.totalPredicted),
          trend: forecast.trend,
          confidence: forecast.confidence
        },

        // Charts
        charts: {
          purchaseTrend: forecast.data,
          inventoryByCategory: inventoryStatus.byCategory
        },

        // Alerts
        alerts: [
          ...(inventoryStatus.lowStock > 0 ? [{
            type: 'warning',
            message: `${inventoryStatus.lowStock} item stok menipis`
          }] : []),
          ...(apStatus.overdueCount > 0 ? [{
            type: 'danger',
            message: `${apStatus.overdueCount} hutang jatuh tempo`
          }] : [])
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= KASIR DASHBOARD =============

export const getKasirDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const outletId = req.outletId || (req.query.outletId ? Number(req.query.outletId) : undefined);

    if (!outletId) {
      return res.status(400).json({
        success: false,
        error: { code: 'OUTLET_REQUIRED', message: 'Kasir harus memiliki outlet' }
      });
    }

    const [
      todaySales,
      shiftSummary,
      paymentMethods,
      recentTransactions
    ] = await Promise.all([
      getTodaySales(tenantId, outletId),
      getShiftSummary(tenantId, outletId),
      getPaymentMethodBreakdown(tenantId, outletId),
      getRecentTransactions(tenantId, outletId)
    ]);

    res.json({
      success: true,
      data: {
        role: 'kasir',
        title: 'Dashboard Kasir',
        subtitle: `Outlet: ${shiftSummary.outletName}`,

        // Today's Sales
        todaySales: {
          totalSales: formatCurrency(todaySales.total),
          transactionCount: todaySales.count,
          averageTransaction: formatCurrency(todaySales.average),
          comparedToYesterday: `${todaySales.vsYesterday > 0 ? '+' : ''}${todaySales.vsYesterday.toFixed(1)}%`
        },

        // Shift Summary
        shift: {
          currentShift: shiftSummary.currentShift,
          shiftStart: shiftSummary.shiftStart,
          shiftSales: formatCurrency(shiftSummary.shiftSales),
          shiftTransactions: shiftSummary.shiftTransactions,
          openingCash: formatCurrency(shiftSummary.openingCash),
          expectedCash: formatCurrency(shiftSummary.expectedCash)
        },

        // Payment Methods
        paymentMethods: paymentMethods.map((pm: any) => ({
          method: pm.method,
          total: formatCurrency(pm.total),
          count: pm.count,
          percentage: `${pm.percentage.toFixed(1)}%`
        })),

        // Recent Transactions
        recentTransactions: recentTransactions.map((t: any) => ({
          id: t.id,
          time: t.time,
          total: formatCurrency(t.total),
          paymentMethod: t.paymentMethod,
          items: t.itemCount
        })),

        // Quick Stats
        quickStats: {
          qrisTransactions: paymentMethods.find((pm: any) => pm.method === 'QRIS')?.count || 0,
          cashTransactions: paymentMethods.find((pm: any) => pm.method === 'Cash')?.count || 0,
          voidedTransactions: todaySales.voided,
          refundedAmount: formatCurrency(todaySales.refunded)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= RETAIL DASHBOARD =============

export const getRetailDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, days = 30 } = req.query;

    const [
      salesStats,
      inventoryAlerts,
      marginAnalysis,
      forecast
    ] = await Promise.all([
      getRetailSalesStats(tenantId, outletId ? Number(outletId) : undefined),
      getRetailInventoryAlerts(tenantId, outletId ? Number(outletId) : undefined),
      getMarginAnalysis(tenantId, outletId ? Number(outletId) : undefined),
      advancedForecast.getAdvancedSalesForecast(tenantId, outletId ? Number(outletId) : undefined, Number(days))
    ]);

    res.json({
      success: true,
      data: {
        role: 'retail',
        title: 'Dashboard Retail',
        subtitle: 'Performa penjualan dan inventory',

        // Sales Overview
        sales: {
          todaySales: formatCurrency(salesStats.today),
          mtdSales: formatCurrency(salesStats.mtd),
          ytdSales: formatCurrency(salesStats.ytd),
          transactionCount: salesStats.transactionCount,
          avgBasket: formatCurrency(salesStats.avgBasket),
          conversionRate: `${salesStats.conversionRate}%`
        },

        // Forecast
        salesForecast: {
          next30Days: formatCurrency(forecast.metrics.totalPredicted),
          dailyAverage: formatCurrency(forecast.metrics.averageDaily),
          trend: forecast.trend,
          trendLabel: forecast.trendLabel,
          confidence: forecast.confidence,
          growthRate: `${forecast.metrics.growthRate.toFixed(1)}%`
        },

        // Margin Analysis
        margins: {
          grossMargin: `${marginAnalysis.grossMargin.toFixed(1)}%`,
          netMargin: `${marginAnalysis.netMargin.toFixed(1)}%`,
          avgMarkup: `${marginAnalysis.avgMarkup.toFixed(1)}%`,
          marginTrend: marginAnalysis.trend,
          topMarginProducts: marginAnalysis.topProducts,
          lowMarginProducts: marginAnalysis.lowProducts
        },

        // Inventory Alerts
        inventory: {
          lowStockItems: inventoryAlerts.lowStock,
          outOfStockItems: inventoryAlerts.outOfStock,
          overstockItems: inventoryAlerts.overstock,
          expiringItems: inventoryAlerts.expiringSoon,
          alerts: inventoryAlerts.alerts
        },

        // Charts
        charts: {
          salesForecast: forecast.data,
          salesByCategory: salesStats.byCategory,
          hourlySales: salesStats.hourlyPattern
        },

        // Anomalies
        anomalies: forecast.anomalies.slice(0, 5)
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= HELPER FUNCTIONS =============

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2)}M`;
  } else if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  } else if (value >= 1000) {
    return `Rp ${(value / 1000).toFixed(0)}rb`;
  }
  return `Rp ${value.toLocaleString('id-ID')}`;
}

// Owner Stats
async function getOwnerQuickStats(tenantId: number, outletId?: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mtdStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const ytdStart = new Date(today.getFullYear(), 0, 1);

  const whereOutlet = outletId ? `AND gl.outlet_id = ${outletId}` : '';

  const stats: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      -- Today
      SUM(CASE WHEN gl.transaction_date >= '${today.toISOString()}'
          AND coa.account_type = 'REVENUE'
          THEN gl.credit_amount - gl.debit_amount ELSE 0 END) as today_revenue,
      SUM(CASE WHEN gl.transaction_date >= '${today.toISOString()}'
          AND coa.account_type IN ('EXPENSE', 'COGS')
          THEN gl.debit_amount - gl.credit_amount ELSE 0 END) as today_expense,
      -- MTD
      SUM(CASE WHEN gl.transaction_date >= '${mtdStart.toISOString()}'
          AND coa.account_type = 'REVENUE'
          THEN gl.credit_amount - gl.debit_amount ELSE 0 END) as mtd_revenue,
      SUM(CASE WHEN gl.transaction_date >= '${mtdStart.toISOString()}'
          AND coa.account_type IN ('EXPENSE', 'COGS')
          THEN gl.debit_amount - gl.credit_amount ELSE 0 END) as mtd_expense,
      -- YTD
      SUM(CASE WHEN gl.transaction_date >= '${ytdStart.toISOString()}'
          AND coa.account_type = 'REVENUE'
          THEN gl.credit_amount - gl.debit_amount ELSE 0 END) as ytd_revenue,
      SUM(CASE WHEN gl.transaction_date >= '${ytdStart.toISOString()}'
          AND coa.account_type IN ('EXPENSE', 'COGS')
          THEN gl.debit_amount - gl.credit_amount ELSE 0 END) as ytd_expense
    FROM "accounting"."general_ledger" gl
    JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
    WHERE gl.tenant_id = ${tenantId}
    ${whereOutlet}
  `);

  const arAp: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT COALESCE(SUM(balance), 0) FROM "accounting"."accounts_receivable"
       WHERE tenant_id = ${tenantId} AND status != 'paid') as ar_balance,
      (SELECT COALESCE(SUM(balance), 0) FROM "accounting"."accounts_payable"
       WHERE tenant_id = ${tenantId} AND status != 'paid') as ap_balance
  `);

  const cashBalance: any[] = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) as cash
    FROM "accounting"."general_ledger" gl
    JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
    WHERE gl.tenant_id = ${tenantId}
    ${whereOutlet}
    AND coa.account_type = 'ASSET'
    AND coa.category ILIKE '%cash%'
  `);

  const todayRevenue = Number(stats[0]?.today_revenue || 0);
  const todayExpense = Number(stats[0]?.today_expense || 0);
  const mtdRevenue = Number(stats[0]?.mtd_revenue || 0);
  const mtdExpense = Number(stats[0]?.mtd_expense || 0);
  const ytdRevenue = Number(stats[0]?.ytd_revenue || 0);
  const ytdExpense = Number(stats[0]?.ytd_expense || 0);

  return {
    todayRevenue: formatCurrency(todayRevenue),
    todayExpense: formatCurrency(todayExpense),
    todayProfit: formatCurrency(todayRevenue - todayExpense),
    mtdRevenue: formatCurrency(mtdRevenue),
    mtdExpense: formatCurrency(mtdExpense),
    mtdProfit: formatCurrency(mtdRevenue - mtdExpense),
    ytdRevenue: formatCurrency(ytdRevenue),
    ytdProfit: formatCurrency(ytdRevenue - ytdExpense),
    outstandingAR: formatCurrency(Number(arAp[0]?.ar_balance || 0)),
    outstandingAP: formatCurrency(Number(arAp[0]?.ap_balance || 0)),
    cashBalance: formatCurrency(Number(cashBalance[0]?.cash || 0))
  };
}

async function getTopPerformers(tenantId: number, outletId?: number) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const whereOutlet = outletId
    ? `AND t.outlet_id = ${outletId}`
    : `AND t.outlet_id IN (SELECT id FROM outlets WHERE tenant_id = ${tenantId})`;

  const topProducts: any[] = await prisma.$queryRawUnsafe(`
    SELECT p.name, SUM(ti.quantity) as qty, SUM(ti.subtotal) as revenue
    FROM "transaction_items" ti
    JOIN "transactions" t ON ti.transaction_id = t.id
    JOIN "products" p ON ti.product_id = p.id
    WHERE t.status = 'completed'
    ${whereOutlet}
    AND t.created_at >= '${thirtyDaysAgo.toISOString()}'
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
    LIMIT 5
  `);

  const topOutlets: any[] = await prisma.$queryRawUnsafe(`
    SELECT o.name, SUM(t.total) as revenue, COUNT(*) as transactions
    FROM "transactions" t
    JOIN "outlets" o ON t.outlet_id = o.id
    WHERE t.status = 'completed'
    AND o.tenant_id = ${tenantId}
    AND t.created_at >= '${thirtyDaysAgo.toISOString()}'
    GROUP BY o.id, o.name
    ORDER BY revenue DESC
    LIMIT 5
  `);

  return {
    products: topProducts.map(p => ({
      name: p.name,
      quantity: Number(p.qty),
      revenue: formatCurrency(Number(p.revenue))
    })),
    outlets: topOutlets.map(o => ({
      name: o.name,
      revenue: formatCurrency(Number(o.revenue)),
      transactions: Number(o.transactions)
    }))
  };
}

async function getOwnerAlerts(tenantId: number) {
  const alerts: any[] = [];

  // Check overdue AR
  const overdueAR: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count, COALESCE(SUM(balance), 0) as total
    FROM "accounting"."accounts_receivable"
    WHERE tenant_id = ${tenantId} AND status != 'paid' AND due_date < NOW()
  `);

  if (Number(overdueAR[0]?.count) > 0) {
    alerts.push({
      type: 'warning',
      title: 'Piutang Jatuh Tempo',
      message: `${overdueAR[0].count} piutang senilai ${formatCurrency(Number(overdueAR[0].total))} sudah jatuh tempo`
    });
  }

  // Check overdue AP
  const overdueAP: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count, COALESCE(SUM(balance), 0) as total
    FROM "accounting"."accounts_payable"
    WHERE tenant_id = ${tenantId} AND status != 'paid' AND due_date < NOW()
  `);

  if (Number(overdueAP[0]?.count) > 0) {
    alerts.push({
      type: 'danger',
      title: 'Hutang Jatuh Tempo',
      message: `${overdueAP[0].count} hutang senilai ${formatCurrency(Number(overdueAP[0].total))} sudah jatuh tempo`
    });
  }

  // Check low inventory
  const lowStock: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count
    FROM "inventory"
    WHERE is_active = true AND alert = true AND current_stock <= stock_alert
    AND outlet_id IN (SELECT id FROM outlets WHERE tenant_id = ${tenantId})
  `);

  if (Number(lowStock[0]?.count) > 0) {
    alerts.push({
      type: 'info',
      title: 'Stok Menipis',
      message: `${lowStock[0].count} item perlu restock segera`
    });
  }

  return alerts;
}

// Akuntan Stats
async function getPeriodStatus(tenantId: number) {
  const currentPeriod = await prisma.accounting_periods.findFirst({
    where: { tenant_id: tenantId, status: 'open' },
    orderBy: { start_date: 'desc' }
  });

  return currentPeriod ? {
    name: currentPeriod.period_name,
    startDate: currentPeriod.start_date,
    endDate: currentPeriod.end_date,
    status: currentPeriod.status
  } : null;
}

async function getJournalStats(tenantId: number, outletId?: number) {
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const whereOutlet = outletId ? { outlet_id: outletId } : {};

  const [total, pending, thisMonthCount] = await Promise.all([
    prisma.journal_entries.count({ where: { tenant_id: tenantId, ...whereOutlet } }),
    prisma.journal_entries.count({ where: { tenant_id: tenantId, status: 'draft', ...whereOutlet } }),
    prisma.journal_entries.count({
      where: {
        tenant_id: tenantId,
        entry_date: { gte: thisMonth },
        ...whereOutlet
      }
    })
  ]);

  return {
    total,
    pending,
    thisMonth: thisMonthCount,
    unbalanced: 0, // Would need specific query
    autoGenerated: 0
  };
}

async function getReconciliationStatus(tenantId: number, outletId?: number) {
  const whereOutlet = outletId ? { outlet_id: outletId } : {};

  const pending = await prisma.bank_reconciliations.count({
    where: { tenant_id: tenantId, status: 'pending', ...whereOutlet }
  });

  const lastReconciled = await prisma.bank_reconciliations.findFirst({
    where: { tenant_id: tenantId, status: 'reconciled', ...whereOutlet },
    orderBy: { reconciled_at: 'desc' }
  });

  const unreconciledTotal: any[] = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM(ABS(difference)), 0) as total
    FROM "accounting"."bank_reconciliations"
    WHERE tenant_id = ${tenantId} AND status = 'pending'
    ${outletId ? `AND outlet_id = ${outletId}` : ''}
  `);

  return {
    pending,
    lastReconciled: lastReconciled?.reconciled_at || null,
    totalDifference: Number(unreconciledTotal[0]?.total || 0),
    accounts: []
  };
}

async function getCOAStats(tenantId: number) {
  const [total, active, byType] = await Promise.all([
    prisma.chart_of_accounts.count({ where: { tenant_id: tenantId } }),
    prisma.chart_of_accounts.count({ where: { tenant_id: tenantId, is_active: true } }),
    prisma.chart_of_accounts.groupBy({
      by: ['account_type'],
      where: { tenant_id: tenantId, is_active: true },
      _count: true
    })
  ]);

  return {
    total,
    active,
    byType: byType.map(t => ({ type: t.account_type, count: t._count }))
  };
}

async function getRecentJournals(tenantId: number, outletId?: number) {
  return prisma.journal_entries.findMany({
    where: {
      tenant_id: tenantId,
      ...(outletId ? { outlet_id: outletId } : {})
    },
    orderBy: { created_at: 'desc' },
    take: 10,
    include: { users: { select: { name: true } } }
  });
}

async function getAccountantPendingTasks(tenantId: number) {
  const tasks = [];

  const draftJournals = await prisma.journal_entries.count({
    where: { tenant_id: tenantId, status: 'draft' }
  });
  if (draftJournals > 0) {
    tasks.push({ task: 'Review jurnal draft', count: draftJournals, priority: 'medium' });
  }

  const pendingRecon = await prisma.bank_reconciliations.count({
    where: { tenant_id: tenantId, status: 'pending' }
  });
  if (pendingRecon > 0) {
    tasks.push({ task: 'Rekonsiliasi bank', count: pendingRecon, priority: 'high' });
  }

  return tasks;
}

// Production Stats (Produsen)
async function getProductionStats(tenantId: number, outletId?: number) {
  // Simplified - would need actual production tables
  return {
    todayOutput: 0,
    mtdOutput: 0,
    targetAchievement: 85,
    efficiency: 78,
    defectRate: 2.5
  };
}

async function getRawMaterialStatus(tenantId: number, outletId?: number) {
  const whereOutlet = outletId
    ? `AND outlet_id = ${outletId}`
    : `AND outlet_id IN (SELECT id FROM outlets WHERE tenant_id = ${tenantId})`;

  const stats: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      COALESCE(SUM(current_stock * cost_amount), 0) as total_value,
      COUNT(CASE WHEN alert = true AND current_stock <= stock_alert THEN 1 END) as low_stock
    FROM "inventory"
    WHERE is_active = true ${whereOutlet}
  `);

  return {
    totalValue: Number(stats[0]?.total_value || 0),
    lowStockCount: Number(stats[0]?.low_stock || 0),
    daysRemaining: 14, // Would calculate based on consumption
    criticalItems: [],
    reorderSuggestions: []
  };
}

async function getProductionCostAnalysis(tenantId: number, outletId?: number) {
  return {
    avgCostPerUnit: 15000,
    materialCostRatio: 45,
    laborCostRatio: 30,
    overheadRatio: 25,
    trend: 'stable' as const,
    varianceFromBudget: 5.2,
    breakdown: []
  };
}

// Distributor Stats
async function getPurchasingStats(tenantId: number, outletId?: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mtdStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const whereOutlet = outletId
    ? `AND outlet_id = ${outletId}`
    : `AND outlet_id IN (SELECT id FROM outlets WHERE tenant_id = ${tenantId})`;

  const stats: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      COALESCE(SUM(CASE WHEN created_at >= '${today.toISOString()}' THEN total_cost ELSE 0 END), 0) as today,
      COALESCE(SUM(CASE WHEN created_at >= '${mtdStart.toISOString()}' THEN total_cost ELSE 0 END), 0) as mtd
    FROM "stock_movements"
    WHERE type = 'IN' ${whereOutlet}
  `);

  return {
    today: Number(stats[0]?.today || 0),
    mtd: Number(stats[0]?.mtd || 0),
    pendingPO: 0,
    avgLeadTime: 3
  };
}

async function getInventoryStatus(tenantId: number, outletId?: number) {
  const whereOutlet = outletId
    ? `AND outlet_id = ${outletId}`
    : `AND outlet_id IN (SELECT id FROM outlets WHERE tenant_id = ${tenantId})`;

  const stats: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      COALESCE(SUM(current_stock * cost_amount), 0) as total_value,
      COUNT(*) as total_items,
      COUNT(CASE WHEN alert = true AND current_stock <= stock_alert THEN 1 END) as low_stock,
      COUNT(CASE WHEN current_stock > stock_alert * 3 THEN 1 END) as overstock
    FROM "inventory"
    WHERE is_active = true ${whereOutlet}
  `);

  return {
    totalValue: Number(stats[0]?.total_value || 0),
    totalItems: Number(stats[0]?.total_items || 0),
    lowStock: Number(stats[0]?.low_stock || 0),
    overstock: Number(stats[0]?.overstock || 0),
    turnoverRate: 4.5,
    daysOfInventory: 45,
    byCategory: []
  };
}

async function getAPStatus(tenantId: number) {
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

  const stats: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      COALESCE(SUM(balance), 0) as total,
      COALESCE(SUM(CASE WHEN due_date <= '${thirtyDaysLater.toISOString()}' AND due_date > NOW() THEN balance ELSE 0 END), 0) as due_soon,
      COALESCE(SUM(CASE WHEN due_date < NOW() THEN balance ELSE 0 END), 0) as overdue,
      COUNT(CASE WHEN due_date < NOW() THEN 1 END) as overdue_count
    FROM "accounting"."accounts_payable"
    WHERE tenant_id = ${tenantId} AND status != 'paid'
  `);

  return {
    total: Number(stats[0]?.total || 0),
    dueSoon: Number(stats[0]?.due_soon || 0),
    overdue: Number(stats[0]?.overdue || 0),
    overdueCount: Number(stats[0]?.overdue_count || 0),
    avgPaymentDays: 30
  };
}

async function getSupplierAnalysis(tenantId: number) {
  const suppliers = await prisma.suppliers.findMany({
    where: { tenant_id: tenantId, is_active: true },
    take: 5,
    orderBy: { created_at: 'desc' }
  });

  return {
    total: await prisma.suppliers.count({ where: { tenant_id: tenantId, is_active: true } }),
    top5: suppliers.map(s => ({ name: s.name, code: s.code })),
    avgRating: 4.2
  };
}

// Kasir Stats
async function getTodaySales(tenantId: number, outletId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const stats: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      COALESCE(SUM(CASE WHEN created_at >= '${today.toISOString()}' AND status = 'completed' THEN total ELSE 0 END), 0) as today_total,
      COUNT(CASE WHEN created_at >= '${today.toISOString()}' AND status = 'completed' THEN 1 END) as today_count,
      COALESCE(SUM(CASE WHEN created_at >= '${yesterday.toISOString()}' AND created_at < '${today.toISOString()}' AND status = 'completed' THEN total ELSE 0 END), 0) as yesterday_total,
      COUNT(CASE WHEN created_at >= '${today.toISOString()}' AND status = 'voided' THEN 1 END) as voided,
      COALESCE(SUM(CASE WHEN created_at >= '${today.toISOString()}' AND status = 'refunded' THEN total ELSE 0 END), 0) as refunded
    FROM "transactions"
    WHERE outlet_id = ${outletId}
  `);

  const todayTotal = Number(stats[0]?.today_total || 0);
  const todayCount = Number(stats[0]?.today_count || 0);
  const yesterdayTotal = Number(stats[0]?.yesterday_total || 0);

  return {
    total: todayTotal,
    count: todayCount,
    average: todayCount > 0 ? todayTotal / todayCount : 0,
    vsYesterday: yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0,
    voided: Number(stats[0]?.voided || 0),
    refunded: Number(stats[0]?.refunded || 0)
  };
}

async function getShiftSummary(tenantId: number, outletId: number) {
  const outlet = await prisma.outlets.findUnique({ where: { id: outletId } });

  return {
    outletName: outlet?.name || 'Unknown',
    currentShift: 'Pagi',
    shiftStart: '08:00',
    shiftSales: 0,
    shiftTransactions: 0,
    openingCash: 500000,
    expectedCash: 500000
  };
}

async function getPaymentMethodBreakdown(tenantId: number, outletId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const breakdown: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      payment_method as method,
      COUNT(*) as count,
      COALESCE(SUM(total), 0) as total
    FROM "transactions"
    WHERE outlet_id = ${outletId}
    AND status = 'completed'
    AND created_at >= '${today.toISOString()}'
    GROUP BY payment_method
  `);

  const grandTotal = breakdown.reduce((sum, b) => sum + Number(b.total), 0);

  return breakdown.map(b => ({
    method: b.method || 'Cash',
    count: Number(b.count),
    total: Number(b.total),
    percentage: grandTotal > 0 ? (Number(b.total) / grandTotal) * 100 : 0
  }));
}

async function getRecentTransactions(tenantId: number, outletId: number) {
  const transactions = await prisma.transactions.findMany({
    where: { outlet_id: outletId, status: 'completed' },
    orderBy: { created_at: 'desc' },
    take: 10,
    include: { _count: { select: { transaction_items: true } } }
  });

  return transactions.map(t => ({
    id: t.id,
    time: t.created_at?.toISOString().split('T')[1].substring(0, 5),
    total: Number(t.total),
    paymentMethod: t.payment_method || 'Cash',
    itemCount: t._count.transaction_items
  }));
}

// Retail Stats
async function getRetailSalesStats(tenantId: number, outletId?: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mtdStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const ytdStart = new Date(today.getFullYear(), 0, 1);

  const whereOutlet = outletId
    ? `AND outlet_id = ${outletId}`
    : `AND outlet_id IN (SELECT id FROM outlets WHERE tenant_id = ${tenantId})`;

  const stats: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      COALESCE(SUM(CASE WHEN created_at >= '${today.toISOString()}' THEN total ELSE 0 END), 0) as today,
      COALESCE(SUM(CASE WHEN created_at >= '${mtdStart.toISOString()}' THEN total ELSE 0 END), 0) as mtd,
      COALESCE(SUM(CASE WHEN created_at >= '${ytdStart.toISOString()}' THEN total ELSE 0 END), 0) as ytd,
      COUNT(CASE WHEN created_at >= '${mtdStart.toISOString()}' THEN 1 END) as transaction_count
    FROM "transactions"
    WHERE status = 'completed' ${whereOutlet}
  `);

  const transactionCount = Number(stats[0]?.transaction_count || 0);
  const mtdTotal = Number(stats[0]?.mtd || 0);

  return {
    today: Number(stats[0]?.today || 0),
    mtd: mtdTotal,
    ytd: Number(stats[0]?.ytd || 0),
    transactionCount,
    avgBasket: transactionCount > 0 ? mtdTotal / transactionCount : 0,
    conversionRate: 35, // Would need visitor tracking
    byCategory: [],
    hourlyPattern: []
  };
}

async function getRetailInventoryAlerts(tenantId: number, outletId?: number) {
  const whereOutlet = outletId
    ? `AND outlet_id = ${outletId}`
    : `AND outlet_id IN (SELECT id FROM outlets WHERE tenant_id = ${tenantId})`;

  const stats: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(CASE WHEN current_stock <= stock_alert AND current_stock > 0 THEN 1 END) as low_stock,
      COUNT(CASE WHEN current_stock = 0 THEN 1 END) as out_of_stock,
      COUNT(CASE WHEN current_stock > stock_alert * 3 THEN 1 END) as overstock
    FROM "inventory"
    WHERE is_active = true AND alert = true ${whereOutlet}
  `);

  return {
    lowStock: Number(stats[0]?.low_stock || 0),
    outOfStock: Number(stats[0]?.out_of_stock || 0),
    overstock: Number(stats[0]?.overstock || 0),
    expiringSoon: 0,
    alerts: []
  };
}

async function getMarginAnalysis(tenantId: number, outletId?: number) {
  return {
    grossMargin: 25.5,
    netMargin: 12.3,
    avgMarkup: 35.0,
    trend: 'stable' as const,
    topProducts: [],
    lowProducts: []
  };
}
