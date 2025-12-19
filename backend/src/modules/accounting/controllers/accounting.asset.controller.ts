import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { generateJournalNumber } from '../../../utils/journal.utils';
import { postJournalToLedger } from '../../../services/ledger.service';

/**
 * Get all fixed assets
 */
export const getAssets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { status, category, outlet_id, page = '1', limit = '50' } = req.query;

    const where: any = { tenant_id: tenantId };
    if (status) where.status = status;
    if (category) where.category = category;
    if (outlet_id) where.outlet_id = parseInt(outlet_id as string);

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [assets, total] = await Promise.all([
      prisma.fixed_assets.findMany({
        where,
        include: {
          outlets: { select: { id: true, name: true } },
          users: { select: { id: true, name: true } },
          chart_of_accounts_fixed_assets_account_id_assetTochart_of_accounts: { select: { account_code: true, account_name: true } },
          _count: { select: { depreciation_logs: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.fixed_assets.count({ where })
    ]);

    res.json({
      success: true,
      data: assets,
      pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, totalPages: Math.ceil(total / parseInt(limit as string)) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get asset by ID
 */
export const getAssetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const asset = await prisma.fixed_assets.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId },
      include: {
        outlets: true,
        users: { select: { id: true, name: true } },
        chart_of_accounts_fixed_assets_account_id_assetTochart_of_accounts: true,
        chart_of_accounts_fixed_assets_account_id_depreciationTochart_of_accounts: true,
        chart_of_accounts_fixed_assets_account_id_expenseTochart_of_accounts: true,
        depreciation_logs: { orderBy: { depreciation_date: 'desc' }, take: 12 }
      }
    });

    if (!asset) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
    }

    res.json({ success: true, data: asset });
  } catch (error) {
    next(error);
  }
};

/**
 * Create fixed asset
 */
export const createAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const {
      assetCode, assetName, category, purchaseDate, purchasePrice,
      salvageValue = 0, usefulLifeMonths, depreciationMethod = 'STRAIGHT_LINE',
      accountIdAsset, accountIdDepreciation, accountIdExpense,
      outletId, location, notes
    } = req.body;

    if (!assetCode || !assetName || !category || !purchaseDate || !purchasePrice || !usefulLifeMonths || !accountIdAsset || !accountIdDepreciation || !accountIdExpense) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
      });
    }

    // Check duplicate asset code
    const existing = await prisma.fixed_assets.findFirst({
      where: { tenant_id: tenantId, asset_code: assetCode }
    });

    if (existing) {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Asset code already exists' } });
    }

    const asset = await prisma.fixed_assets.create({
      data: {
        tenant_id: tenantId,
        asset_code: assetCode,
        asset_name: assetName,
        category,
        purchase_date: new Date(purchaseDate),
        purchase_price: new Decimal(purchasePrice),
        salvage_value: new Decimal(salvageValue),
        useful_life_months: parseInt(usefulLifeMonths),
        depreciation_method: depreciationMethod,
        accumulated_depreciation: new Decimal(0),
        book_value: new Decimal(purchasePrice),
        account_id_asset: parseInt(accountIdAsset),
        account_id_depreciation: parseInt(accountIdDepreciation),
        account_id_expense: parseInt(accountIdExpense),
        outlet_id: outletId ? parseInt(outletId) : null,
        location,
        status: 'active',
        notes,
        created_by: userId
      },
      include: {
        chart_of_accounts_fixed_assets_account_id_assetTochart_of_accounts: { select: { account_code: true, account_name: true } }
      }
    });

    res.status(201).json({ success: true, data: asset, message: 'Asset created successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Update asset
 */
export const updateAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { assetName, category, location, notes, status } = req.body;

    const existing = await prisma.fixed_assets.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
    }

    const asset = await prisma.fixed_assets.update({
      where: { id: parseInt(id) },
      data: {
        ...(assetName && { asset_name: assetName }),
        ...(category && { category }),
        ...(location !== undefined && { location }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
        updated_at: new Date()
      }
    });

    res.json({ success: true, data: asset, message: 'Asset updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Run depreciation for a single asset
 */
export const runDepreciation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { id } = req.params;
    const { depreciationDate, periodId } = req.body;

    const asset = await prisma.fixed_assets.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId, status: 'active' }
    });

    if (!asset) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Active asset not found' } });
    }

    // Calculate monthly depreciation
    const purchasePrice = Number(asset.purchase_price);
    const salvageValue = Number(asset.salvage_value);
    const usefulLifeMonths = asset.useful_life_months;

    let depreciationAmount = 0;
    if (asset.depreciation_method === 'STRAIGHT_LINE') {
      depreciationAmount = (purchasePrice - salvageValue) / usefulLifeMonths;
    }
    // Add more methods here if needed (DECLINING_BALANCE, etc.)

    const currentAccumulated = Number(asset.accumulated_depreciation);
    const newAccumulated = currentAccumulated + depreciationAmount;
    const newBookValue = purchasePrice - newAccumulated;

    // Don't depreciate below salvage value
    if (newBookValue < salvageValue) {
      return res.status(400).json({
        success: false,
        error: { code: 'FULLY_DEPRECIATED', message: 'Asset is fully depreciated' }
      });
    }

    // Create depreciation journal
    const journalNumber = await generateJournalNumber(tenantId, 'depreciation');

    const result = await prisma.$transaction(async (tx) => {
      // Create journal entry
      const journal = await tx.journal_entries.create({
        data: {
          tenant_id: tenantId,
          outlet_id: asset.outlet_id,
          journal_number: journalNumber,
          journal_type: 'depreciation',
          transaction_date: new Date(depreciationDate || new Date()),
          description: `Depreciation: ${asset.asset_name}`,
          reference_type: 'fixed_asset',
          reference_id: asset.id,
          total_debit: new Decimal(depreciationAmount),
          total_credit: new Decimal(depreciationAmount),
          status: 'draft',
          created_by: userId,
          journal_entry_lines: {
            create: [
              { account_id: asset.account_id_expense, description: 'Beban Penyusutan', debit_amount: new Decimal(depreciationAmount), credit_amount: new Decimal(0) },
              { account_id: asset.account_id_depreciation, description: 'Akumulasi Penyusutan', debit_amount: new Decimal(0), credit_amount: new Decimal(depreciationAmount) }
            ]
          }
        }
      });

      // Create depreciation log
      const log = await tx.depreciation_logs.create({
        data: {
          tenant_id: tenantId,
          asset_id: asset.id,
          period_id: periodId ? parseInt(periodId) : null,
          depreciation_date: new Date(depreciationDate || new Date()),
          depreciation_amount: new Decimal(depreciationAmount),
          accumulated_depreciation: new Decimal(newAccumulated),
          book_value: new Decimal(newBookValue),
          journal_entry_id: journal.id
        }
      });

      // Update asset
      const updatedAsset = await tx.fixed_assets.update({
        where: { id: asset.id },
        data: {
          accumulated_depreciation: new Decimal(newAccumulated),
          book_value: new Decimal(newBookValue),
          updated_at: new Date()
        }
      });

      return { journal, log, asset: updatedAsset };
    });

    // Post journal to ledger
    await postJournalToLedger(result.journal.id, tenantId, userId);

    res.json({ success: true, data: result, message: 'Depreciation recorded successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Run monthly depreciation for all active assets
 */
export const runMonthlyDepreciation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { depreciationDate, periodId } = req.body;

    const assets = await prisma.fixed_assets.findMany({
      where: { tenant_id: tenantId, status: 'active' }
    });

    const results = [];
    const errors = [];

    for (const asset of assets) {
      try {
        const purchasePrice = Number(asset.purchase_price);
        const salvageValue = Number(asset.salvage_value);
        const usefulLifeMonths = asset.useful_life_months;

        let depreciationAmount = 0;
        if (asset.depreciation_method === 'STRAIGHT_LINE') {
          depreciationAmount = (purchasePrice - salvageValue) / usefulLifeMonths;
        }

        const currentAccumulated = Number(asset.accumulated_depreciation);
        const newAccumulated = currentAccumulated + depreciationAmount;
        const newBookValue = purchasePrice - newAccumulated;

        if (newBookValue < salvageValue) {
          errors.push({ assetId: asset.id, assetCode: asset.asset_code, error: 'Fully depreciated' });
          continue;
        }

        const journalNumber = await generateJournalNumber(tenantId, 'depreciation');

        const journal = await prisma.journal_entries.create({
          data: {
            tenant_id: tenantId,
            outlet_id: asset.outlet_id,
            journal_number: journalNumber,
            journal_type: 'depreciation',
            transaction_date: new Date(depreciationDate || new Date()),
            description: `Depreciation: ${asset.asset_name}`,
            reference_type: 'fixed_asset',
            reference_id: asset.id,
            total_debit: new Decimal(depreciationAmount),
            total_credit: new Decimal(depreciationAmount),
            status: 'draft',
            created_by: userId,
            journal_entry_lines: {
              create: [
                { account_id: asset.account_id_expense, description: 'Beban Penyusutan', debit_amount: new Decimal(depreciationAmount), credit_amount: new Decimal(0) },
                { account_id: asset.account_id_depreciation, description: 'Akumulasi Penyusutan', debit_amount: new Decimal(0), credit_amount: new Decimal(depreciationAmount) }
              ]
            }
          }
        });

        await prisma.depreciation_logs.create({
          data: {
            tenant_id: tenantId,
            asset_id: asset.id,
            period_id: periodId ? parseInt(periodId) : null,
            depreciation_date: new Date(depreciationDate || new Date()),
            depreciation_amount: new Decimal(depreciationAmount),
            accumulated_depreciation: new Decimal(newAccumulated),
            book_value: new Decimal(newBookValue),
            journal_entry_id: journal.id
          }
        });

        await prisma.fixed_assets.update({
          where: { id: asset.id },
          data: { accumulated_depreciation: new Decimal(newAccumulated), book_value: new Decimal(newBookValue), updated_at: new Date() }
        });

        await postJournalToLedger(journal.id, tenantId, userId);

        results.push({ assetId: asset.id, assetCode: asset.asset_code, depreciationAmount, newBookValue });
      } catch (err: any) {
        errors.push({ assetId: asset.id, assetCode: asset.asset_code, error: err.message });
      }
    }

    res.json({ success: true, data: { processed: results.length, failed: errors.length, results, errors }, message: 'Monthly depreciation completed' });
  } catch (error) {
    next(error);
  }
};

/**
 * Dispose asset
 */
export const disposeAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { disposalDate, disposalValue, notes } = req.body;

    const asset = await prisma.fixed_assets.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId, status: 'active' }
    });

    if (!asset) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Active asset not found' } });
    }

    const updated = await prisma.fixed_assets.update({
      where: { id: parseInt(id) },
      data: {
        status: 'disposed',
        disposal_date: new Date(disposalDate || new Date()),
        disposal_value: disposalValue ? new Decimal(disposalValue) : null,
        notes: notes || asset.notes,
        updated_at: new Date()
      }
    });

    res.json({ success: true, data: updated, message: 'Asset disposed successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get depreciation history
 */
export const getDepreciationHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { asset_id, period_id, page = '1', limit = '50' } = req.query;

    const where: any = { tenant_id: tenantId };
    if (asset_id) where.asset_id = parseInt(asset_id as string);
    if (period_id) where.period_id = parseInt(period_id as string);

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [logs, total] = await Promise.all([
      prisma.depreciation_logs.findMany({
        where,
        include: {
          fixed_assets: { select: { asset_code: true, asset_name: true } },
          accounting_periods: { select: { period_name: true } },
          journal_entries: { select: { journal_number: true } }
        },
        orderBy: { depreciation_date: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.depreciation_logs.count({ where })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, totalPages: Math.ceil(total / parseInt(limit as string)) }
    });
  } catch (error) {
    next(error);
  }
};
