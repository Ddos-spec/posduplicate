import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// ==================== TAX CONFIGURATION ====================

/**
 * Get all tax configurations
 */
export const getTaxConfigs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { is_active, tax_type } = req.query;

    const where: any = { tenant_id: tenantId };
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (tax_type) where.tax_type = tax_type;

    const configs = await prisma.tax_configurations.findMany({
      where,
      include: {
        chart_of_accounts: { select: { id: true, account_code: true, account_name: true } }
      },
      orderBy: { tax_type: 'asc' }
    });

    res.json({ success: true, data: configs });
  } catch (error) {
    next(error);
  }
};

/**
 * Get tax config by ID
 */
export const getTaxConfigById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const config = await prisma.tax_configurations.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId },
      include: { chart_of_accounts: true, tax_transactions: { take: 10, orderBy: { created_at: 'desc' } } }
    });

    if (!config) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tax config not found' } });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};

/**
 * Create tax configuration
 */
export const createTaxConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { taxType, taxCode, taxRate, accountId, effectiveDate, expirationDate, notes } = req.body;

    if (!taxType || taxRate === undefined || !accountId || !effectiveDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Tax type, rate, account, and effective date are required' }
      });
    }

    const config = await prisma.tax_configurations.create({
      data: {
        tenant_id: tenantId,
        tax_type: taxType,
        tax_code: taxCode,
        tax_rate: new Decimal(taxRate),
        account_id: parseInt(accountId),
        effective_date: new Date(effectiveDate),
        expiration_date: expirationDate ? new Date(expirationDate) : null,
        is_active: true,
        notes
      },
      include: { chart_of_accounts: { select: { account_code: true, account_name: true } } }
    });

    res.status(201).json({ success: true, data: config, message: 'Tax configuration created' });
  } catch (error) {
    next(error);
  }
};

/**
 * Update tax configuration
 */
export const updateTaxConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { taxRate, accountId, expirationDate, isActive, notes } = req.body;

    const existing = await prisma.tax_configurations.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tax config not found' } });
    }

    const config = await prisma.tax_configurations.update({
      where: { id: parseInt(id) },
      data: {
        ...(taxRate !== undefined && { tax_rate: new Decimal(taxRate) }),
        ...(accountId && { account_id: parseInt(accountId) }),
        ...(expirationDate !== undefined && { expiration_date: expirationDate ? new Date(expirationDate) : null }),
        ...(isActive !== undefined && { is_active: isActive }),
        ...(notes !== undefined && { notes }),
        updated_at: new Date()
      }
    });

    res.json({ success: true, data: config, message: 'Tax configuration updated' });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete tax configuration
 */
export const deleteTaxConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const existing = await prisma.tax_configurations.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tax config not found' } });
    }

    // Check if used in transactions
    const usedCount = await prisma.tax_transactions.count({ where: { tax_config_id: parseInt(id) } });
    if (usedCount > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'IN_USE', message: `Cannot delete. Used in ${usedCount} transactions. Deactivate instead.` }
      });
    }

    await prisma.tax_configurations.delete({ where: { id: parseInt(id) } });

    res.json({ success: true, message: 'Tax configuration deleted' });
  } catch (error) {
    next(error);
  }
};

// ==================== TAX TRANSACTIONS ====================

/**
 * Get tax transactions
 */
export const getTaxTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { tax_config_id, transaction_type, status, start_date, end_date, page = '1', limit = '50' } = req.query;

    const where: any = { tenant_id: tenantId };
    if (tax_config_id) where.tax_config_id = parseInt(tax_config_id as string);
    if (transaction_type) where.transaction_type = transaction_type;
    if (status) where.status = status;
    if (start_date || end_date) {
      where.transaction_date = {};
      if (start_date) where.transaction_date.gte = new Date(start_date as string);
      if (end_date) where.transaction_date.lte = new Date(end_date as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [transactions, total] = await Promise.all([
      prisma.tax_transactions.findMany({
        where,
        include: {
          tax_configurations: { select: { tax_type: true, tax_code: true, tax_rate: true } },
          outlets: { select: { id: true, name: true } },
          journal_entries: { select: { journal_number: true } },
          users: { select: { id: true, name: true } }
        },
        orderBy: { transaction_date: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.tax_transactions.count({ where })
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, totalPages: Math.ceil(total / parseInt(limit as string)) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create tax transaction
 */
export const createTaxTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { taxConfigId, transactionType, transactionDate, amount, referenceType, referenceId, outletId, notes } = req.body;

    if (!taxConfigId || !transactionType || !transactionDate || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Tax config, type, date, and amount are required' }
      });
    }

    // Get tax config for rate
    const taxConfig = await prisma.tax_configurations.findFirst({
      where: { id: parseInt(taxConfigId), tenant_id: tenantId, is_active: true }
    });

    if (!taxConfig) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Active tax config not found' } });
    }

    const taxAmount = new Decimal(amount).mul(taxConfig.tax_rate).div(100);

    const transaction = await prisma.tax_transactions.create({
      data: {
        tenant_id: tenantId,
        outlet_id: outletId ? parseInt(outletId) : null,
        tax_config_id: parseInt(taxConfigId),
        transaction_type: transactionType,
        transaction_date: new Date(transactionDate),
        amount: new Decimal(amount),
        tax_amount: taxAmount,
        reference_type: referenceType,
        reference_id: referenceId ? parseInt(referenceId) : null,
        status: 'recorded',
        notes,
        created_by: userId
      },
      include: { tax_configurations: { select: { tax_type: true, tax_rate: true } } }
    });

    res.status(201).json({ success: true, data: transaction, message: 'Tax transaction recorded' });
  } catch (error) {
    next(error);
  }
};

/**
 * Update tax transaction status
 */
export const updateTaxTransactionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { status, journalEntryId, notes } = req.body;

    const existing = await prisma.tax_transactions.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tax transaction not found' } });
    }

    const transaction = await prisma.tax_transactions.update({
      where: { id: parseInt(id) },
      data: {
        ...(status && { status }),
        ...(journalEntryId && { journal_entry_id: parseInt(journalEntryId) }),
        ...(notes !== undefined && { notes })
      }
    });

    res.json({ success: true, data: transaction, message: 'Tax transaction updated' });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete tax transaction
 */
export const deleteTaxTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const existing = await prisma.tax_transactions.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tax transaction not found' } });
    }

    if (existing.status === 'reported') {
      return res.status(400).json({ success: false, error: { code: 'CANNOT_DELETE', message: 'Cannot delete reported transaction' } });
    }

    await prisma.tax_transactions.delete({ where: { id: parseInt(id) } });

    res.json({ success: true, message: 'Tax transaction deleted' });
  } catch (error) {
    next(error);
  }
};

// ==================== TAX REPORTS ====================

/**
 * Get tax summary report
 */
export const getTaxSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { start_date, end_date, outlet_id } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Start and end date are required' } });
    }

    const whereOutlet = outlet_id ? `AND tt.outlet_id = ${outlet_id}` : '';

    // Group by tax type
    const summary: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        tc.tax_type,
        tc.tax_code,
        tc.tax_rate,
        tt.transaction_type,
        COUNT(*) as transaction_count,
        SUM(tt.amount) as total_amount,
        SUM(tt.tax_amount) as total_tax
      FROM "accounting"."tax_transactions" tt
      JOIN "accounting"."tax_configurations" tc ON tt.tax_config_id = tc.id
      WHERE tt.tenant_id = ${tenantId}
      ${whereOutlet}
      AND tt.transaction_date >= '${new Date(start_date as string).toISOString()}'
      AND tt.transaction_date <= '${new Date(end_date as string).toISOString()}'
      GROUP BY tc.tax_type, tc.tax_code, tc.tax_rate, tt.transaction_type
      ORDER BY tc.tax_type, tt.transaction_type
    `);

    // Calculate totals
    const totals = {
      sales: { amount: 0, tax: 0 },
      purchase: { amount: 0, tax: 0 },
      net: 0
    };

    summary.forEach(row => {
      const amount = Number(row.total_amount);
      const tax = Number(row.total_tax);
      if (row.transaction_type === 'SALES' || row.transaction_type === 'OUTPUT') {
        totals.sales.amount += amount;
        totals.sales.tax += tax;
      } else {
        totals.purchase.amount += amount;
        totals.purchase.tax += tax;
      }
    });

    totals.net = totals.sales.tax - totals.purchase.tax;

    res.json({
      success: true,
      data: {
        period: { start: start_date, end: end_date },
        details: summary,
        totals
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate SPT-ready report (Indonesian tax report format)
 */
export const generateSPTReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { month, year, outlet_id } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Month and year are required' } });
    }

    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
    endDate.setHours(23, 59, 59, 999);

    const whereOutlet = outlet_id ? `AND tt.outlet_id = ${outlet_id}` : '';

    // PPN Keluaran (Output VAT)
    const outputVAT: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        SUM(tt.amount) as dpp,
        SUM(tt.tax_amount) as ppn
      FROM "accounting"."tax_transactions" tt
      JOIN "accounting"."tax_configurations" tc ON tt.tax_config_id = tc.id
      WHERE tt.tenant_id = ${tenantId}
      ${whereOutlet}
      AND tt.transaction_date >= '${startDate.toISOString()}'
      AND tt.transaction_date <= '${endDate.toISOString()}'
      AND tc.tax_type = 'PPN'
      AND tt.transaction_type IN ('SALES', 'OUTPUT')
    `);

    // PPN Masukan (Input VAT)
    const inputVAT: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        SUM(tt.amount) as dpp,
        SUM(tt.tax_amount) as ppn
      FROM "accounting"."tax_transactions" tt
      JOIN "accounting"."tax_configurations" tc ON tt.tax_config_id = tc.id
      WHERE tt.tenant_id = ${tenantId}
      ${whereOutlet}
      AND tt.transaction_date >= '${startDate.toISOString()}'
      AND tt.transaction_date <= '${endDate.toISOString()}'
      AND tc.tax_type = 'PPN'
      AND tt.transaction_type IN ('PURCHASE', 'INPUT')
    `);

    const sptData = {
      period: { month: parseInt(month as string), year: parseInt(year as string) },
      ppnKeluaran: {
        dpp: Number(outputVAT[0]?.dpp || 0),
        ppn: Number(outputVAT[0]?.ppn || 0)
      },
      ppnMasukan: {
        dpp: Number(inputVAT[0]?.dpp || 0),
        ppn: Number(inputVAT[0]?.ppn || 0)
      },
      kurangBayar: 0,
      lebihBayar: 0
    };

    const netPPN = sptData.ppnKeluaran.ppn - sptData.ppnMasukan.ppn;
    if (netPPN > 0) {
      sptData.kurangBayar = netPPN;
    } else {
      sptData.lebihBayar = Math.abs(netPPN);
    }

    res.json({ success: true, data: sptData });
  } catch (error) {
    next(error);
  }
};
