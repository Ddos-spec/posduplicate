import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * CASH FLOW STATEMENT
 * Supports both Direct and Indirect methods
 * Compliant with PSAK 2 (Indonesian) and IAS 7 (International)
 */

interface CashFlowSection {
  items: { description: string; amount: number; accountCode?: string }[];
  total: number;
}

interface CashFlowStatement {
  period: { startDate: string; endDate: string };
  method: 'direct' | 'indirect';
  operatingActivities: CashFlowSection;
  investingActivities: CashFlowSection;
  financingActivities: CashFlowSection;
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
  reconciliation?: {
    netIncome: number;
    adjustments: { description: string; amount: number }[];
    totalAdjustments: number;
    cashFromOperations: number;
  };
}

/**
 * Generate Cash Flow Statement - Indirect Method
 * Starts with Net Income and adjusts for non-cash items
 */
export const getCashFlowIndirect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { startDate, endDate, outletId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Start date and end date are required' }
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const whereOutlet = outletId ? `AND gl.outlet_id = ${outletId}` : '';

    // 1. Calculate Net Income
    const incomeData: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        coa.account_type,
        SUM(CASE WHEN coa.normal_balance = 'CREDIT' THEN gl.credit_amount - gl.debit_amount
                 ELSE gl.debit_amount - gl.credit_amount END) as net_amount
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND gl.transaction_date >= '${start.toISOString()}'
      AND gl.transaction_date <= '${end.toISOString()}'
      AND coa.account_type IN ('REVENUE', 'EXPENSE', 'COGS')
      GROUP BY coa.account_type
    `);

    let revenue = 0, expenses = 0;
    incomeData.forEach(row => {
      if (row.account_type === 'REVENUE') revenue = Number(row.net_amount);
      else expenses += Number(row.net_amount);
    });
    const netIncome = revenue - expenses;

    // 2. Get Depreciation (non-cash expense - add back)
    const depreciation: any[] = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(gl.debit_amount), 0) as total
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND gl.transaction_date >= '${start.toISOString()}'
      AND gl.transaction_date <= '${end.toISOString()}'
      AND coa.category ILIKE '%depreciation%'
    `);
    const depreciationAmount = Number(depreciation[0]?.total || 0);

    // 3. Changes in Working Capital
    // A/R Change (decrease = cash inflow)
    const arChange: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(SUM(CASE WHEN gl.transaction_date < '${start.toISOString()}' THEN gl.debit_amount - gl.credit_amount ELSE 0 END), 0) as opening,
        COALESCE(SUM(CASE WHEN gl.transaction_date <= '${end.toISOString()}' THEN gl.debit_amount - gl.credit_amount ELSE 0 END), 0) as closing
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND coa.account_type = 'ACCOUNT_RECEIVABLE'
    `);
    const arChangeAmount = Number(arChange[0]?.opening || 0) - Number(arChange[0]?.closing || 0);

    // A/P Change (increase = cash inflow)
    const apChange: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(SUM(CASE WHEN gl.transaction_date < '${start.toISOString()}' THEN gl.credit_amount - gl.debit_amount ELSE 0 END), 0) as opening,
        COALESCE(SUM(CASE WHEN gl.transaction_date <= '${end.toISOString()}' THEN gl.credit_amount - gl.debit_amount ELSE 0 END), 0) as closing
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND coa.account_type = 'ACCOUNT_PAYABLE'
    `);
    const apChangeAmount = Number(apChange[0]?.closing || 0) - Number(apChange[0]?.opening || 0);

    // Inventory Change (decrease = cash inflow)
    const invChange: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(SUM(CASE WHEN gl.transaction_date < '${start.toISOString()}' THEN gl.debit_amount - gl.credit_amount ELSE 0 END), 0) as opening,
        COALESCE(SUM(CASE WHEN gl.transaction_date <= '${end.toISOString()}' THEN gl.debit_amount - gl.credit_amount ELSE 0 END), 0) as closing
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND coa.account_type = 'INVENTORY'
    `);
    const invChangeAmount = Number(invChange[0]?.opening || 0) - Number(invChange[0]?.closing || 0);

    // 4. Investing Activities (Fixed Assets purchases/sales)
    const investing: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(SUM(gl.debit_amount), 0) as purchases,
        COALESCE(SUM(gl.credit_amount), 0) as sales
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND gl.transaction_date >= '${start.toISOString()}'
      AND gl.transaction_date <= '${end.toISOString()}'
      AND coa.account_type = 'FIXED_ASSET'
    `);
    const assetPurchases = -Number(investing[0]?.purchases || 0);
    const assetSales = Number(investing[0]?.sales || 0);

    // 5. Financing Activities (Equity, Loans)
    const financing: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        coa.account_type,
        SUM(gl.credit_amount - gl.debit_amount) as net_amount
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND gl.transaction_date >= '${start.toISOString()}'
      AND gl.transaction_date <= '${end.toISOString()}'
      AND coa.account_type IN ('EQUITY', 'LIABILITY')
      AND coa.category NOT ILIKE '%payable%'
      GROUP BY coa.account_type
    `);
    let equityChanges = 0, loanChanges = 0;
    financing.forEach(row => {
      if (row.account_type === 'EQUITY') equityChanges = Number(row.net_amount);
      else loanChanges = Number(row.net_amount);
    });

    // 6. Beginning and Ending Cash
    const cashBalances: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(SUM(CASE WHEN gl.transaction_date < '${start.toISOString()}' THEN gl.debit_amount - gl.credit_amount ELSE 0 END), 0) as beginning,
        COALESCE(SUM(CASE WHEN gl.transaction_date <= '${end.toISOString()}' THEN gl.debit_amount - gl.credit_amount ELSE 0 END), 0) as ending
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND coa.account_type = 'CASH_BANK'
    `);
    const beginningCash = Number(cashBalances[0]?.beginning || 0);
    const endingCash = Number(cashBalances[0]?.ending || 0);

    // Build Statement
    const operatingTotal = netIncome + depreciationAmount + arChangeAmount + apChangeAmount + invChangeAmount;
    const investingTotal = assetPurchases + assetSales;
    const financingTotal = equityChanges + loanChanges;

    const statement: CashFlowStatement = {
      period: { startDate: startDate as string, endDate: endDate as string },
      method: 'indirect',
      operatingActivities: {
        items: [
          { description: 'Laba Bersih', amount: netIncome },
          { description: 'Penyusutan', amount: depreciationAmount },
          { description: 'Perubahan Piutang Usaha', amount: arChangeAmount },
          { description: 'Perubahan Hutang Usaha', amount: apChangeAmount },
          { description: 'Perubahan Persediaan', amount: invChangeAmount }
        ],
        total: operatingTotal
      },
      investingActivities: {
        items: [
          { description: 'Pembelian Aset Tetap', amount: assetPurchases },
          { description: 'Penjualan Aset Tetap', amount: assetSales }
        ],
        total: investingTotal
      },
      financingActivities: {
        items: [
          { description: 'Perubahan Modal', amount: equityChanges },
          { description: 'Perubahan Pinjaman', amount: loanChanges }
        ],
        total: financingTotal
      },
      netCashFlow: operatingTotal + investingTotal + financingTotal,
      beginningCash,
      endingCash,
      reconciliation: {
        netIncome,
        adjustments: [
          { description: 'Penyusutan', amount: depreciationAmount },
          { description: 'Perubahan Modal Kerja', amount: arChangeAmount + apChangeAmount + invChangeAmount }
        ],
        totalAdjustments: depreciationAmount + arChangeAmount + apChangeAmount + invChangeAmount,
        cashFromOperations: operatingTotal
      }
    };

    // Verify: Beginning + Net Change = Ending
    const calculatedEnding = beginningCash + statement.netCashFlow;
    const variance = Math.abs(calculatedEnding - endingCash);

    res.json({
      success: true,
      data: statement,
      verification: {
        calculatedEnding,
        actualEnding: endingCash,
        variance,
        isBalanced: variance < 1 // Allow small rounding difference
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate Cash Flow Statement - Direct Method
 * Shows actual cash receipts and payments
 */
export const getCashFlowDirect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { startDate, endDate, outletId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Start date and end date are required' }
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const whereOutlet = outletId ? `AND gl.outlet_id = ${outletId}` : '';

    // Direct method: Track actual cash movements
    // Cash Receipts from Customers (Debit to Cash from Revenue-related journals)
    const cashReceipts: any[] = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(gl.debit_amount), 0) as total
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      JOIN "accounting"."journal_entries" je ON gl.journal_entry_id = je.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND gl.transaction_date >= '${start.toISOString()}'
      AND gl.transaction_date <= '${end.toISOString()}'
      AND coa.account_type = 'CASH_BANK'
      AND je.journal_type IN ('sales', 'receipt', 'collection')
    `);

    // Cash Payments to Suppliers
    const cashPaymentsSuppliers: any[] = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(gl.credit_amount), 0) as total
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      JOIN "accounting"."journal_entries" je ON gl.journal_entry_id = je.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND gl.transaction_date >= '${start.toISOString()}'
      AND gl.transaction_date <= '${end.toISOString()}'
      AND coa.account_type = 'CASH_BANK'
      AND je.journal_type IN ('purchase', 'payment', 'expense')
    `);

    // Cash Payments for Operating Expenses
    const cashPaymentsExpenses: any[] = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(gl.credit_amount), 0) as total
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      JOIN "accounting"."journal_entries" je ON gl.journal_entry_id = je.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND gl.transaction_date >= '${start.toISOString()}'
      AND gl.transaction_date <= '${end.toISOString()}'
      AND coa.account_type = 'CASH_BANK'
      AND je.journal_type IN ('expense', 'general')
      AND je.description ILIKE '%expense%' OR je.description ILIKE '%beban%'
    `);

    // Cash from Investing (Asset transactions)
    const investingCash: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(SUM(gl.debit_amount), 0) as receipts,
        COALESCE(SUM(gl.credit_amount), 0) as payments
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      JOIN "accounting"."journal_entries" je ON gl.journal_entry_id = je.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND gl.transaction_date >= '${start.toISOString()}'
      AND gl.transaction_date <= '${end.toISOString()}'
      AND coa.account_type = 'CASH_BANK'
      AND (je.reference_type = 'fixed_asset' OR je.journal_type = 'depreciation')
    `);

    // Cash from Financing
    const financingCash: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(SUM(gl.debit_amount), 0) as receipts,
        COALESCE(SUM(gl.credit_amount), 0) as payments
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      JOIN "accounting"."journal_entries" je ON gl.journal_entry_id = je.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND gl.transaction_date >= '${start.toISOString()}'
      AND gl.transaction_date <= '${end.toISOString()}'
      AND coa.account_type = 'CASH_BANK'
      AND je.journal_type IN ('equity', 'loan', 'financing')
    `);

    // Cash Balances
    const cashBalances: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(SUM(CASE WHEN gl.transaction_date < '${start.toISOString()}' THEN gl.debit_amount - gl.credit_amount ELSE 0 END), 0) as beginning,
        COALESCE(SUM(CASE WHEN gl.transaction_date <= '${end.toISOString()}' THEN gl.debit_amount - gl.credit_amount ELSE 0 END), 0) as ending
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
      WHERE gl.tenant_id = ${tenantId}
      ${whereOutlet}
      AND coa.account_type = 'CASH_BANK'
    `);

    const receiptsFromCustomers = Number(cashReceipts[0]?.total || 0);
    const paymentsToSuppliers = -Number(cashPaymentsSuppliers[0]?.total || 0);
    const paymentsForExpenses = -Number(cashPaymentsExpenses[0]?.total || 0);
    const operatingTotal = receiptsFromCustomers + paymentsToSuppliers + paymentsForExpenses;

    const investingReceipts = Number(investingCash[0]?.receipts || 0);
    const investingPayments = -Number(investingCash[0]?.payments || 0);
    const investingTotal = investingReceipts + investingPayments;

    const financingReceipts = Number(financingCash[0]?.receipts || 0);
    const financingPayments = -Number(financingCash[0]?.payments || 0);
    const financingTotal = financingReceipts + financingPayments;

    const beginningCash = Number(cashBalances[0]?.beginning || 0);
    const endingCash = Number(cashBalances[0]?.ending || 0);

    const statement: CashFlowStatement = {
      period: { startDate: startDate as string, endDate: endDate as string },
      method: 'direct',
      operatingActivities: {
        items: [
          { description: 'Penerimaan dari Pelanggan', amount: receiptsFromCustomers },
          { description: 'Pembayaran ke Pemasok', amount: paymentsToSuppliers },
          { description: 'Pembayaran Beban Operasional', amount: paymentsForExpenses }
        ],
        total: operatingTotal
      },
      investingActivities: {
        items: [
          { description: 'Penerimaan dari Penjualan Aset', amount: investingReceipts },
          { description: 'Pembelian Aset Tetap', amount: investingPayments }
        ],
        total: investingTotal
      },
      financingActivities: {
        items: [
          { description: 'Penerimaan dari Pendanaan', amount: financingReceipts },
          { description: 'Pembayaran Pendanaan', amount: financingPayments }
        ],
        total: financingTotal
      },
      netCashFlow: operatingTotal + investingTotal + financingTotal,
      beginningCash,
      endingCash
    };

    res.json({
      success: true,
      data: statement,
      verification: {
        calculatedEnding: beginningCash + statement.netCashFlow,
        actualEnding: endingCash,
        isBalanced: Math.abs((beginningCash + statement.netCashFlow) - endingCash) < 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Cash Flow Summary (simplified)
 */
export const getCashFlowSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { months = 6, outletId } = req.query;

    const monthsCount = parseInt(months as string);
    const results = [];

    for (let i = 0; i < monthsCount; i++) {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() - i);
      endDate.setDate(0); // Last day of previous month

      const startDate = new Date(endDate);
      startDate.setDate(1); // First day of month

      const whereOutlet = outletId ? `AND gl.outlet_id = ${outletId}` : '';

      const cashFlow: any[] = await prisma.$queryRawUnsafe(`
        SELECT
          COALESCE(SUM(gl.debit_amount), 0) as inflows,
          COALESCE(SUM(gl.credit_amount), 0) as outflows
        FROM "accounting"."general_ledger" gl
        JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
        WHERE gl.tenant_id = ${tenantId}
        ${whereOutlet}
        AND gl.transaction_date >= '${startDate.toISOString()}'
        AND gl.transaction_date <= '${endDate.toISOString()}'
        AND coa.account_type = 'CASH_BANK'
      `);

      results.unshift({
        month: startDate.toISOString().substring(0, 7),
        inflows: Number(cashFlow[0]?.inflows || 0),
        outflows: Number(cashFlow[0]?.outflows || 0),
        netFlow: Number(cashFlow[0]?.inflows || 0) - Number(cashFlow[0]?.outflows || 0)
      });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};
