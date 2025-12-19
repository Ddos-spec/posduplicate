import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Get all reconciliations
 */
export const getReconciliations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { account_id, status, page = '1', limit = '50' } = req.query;

    const where: any = { tenant_id: tenantId };
    if (account_id) where.account_id = parseInt(account_id as string);
    if (status) where.status = status;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [reconciliations, total] = await Promise.all([
      prisma.bank_reconciliations.findMany({
        where,
        include: {
          chart_of_accounts: { select: { id: true, account_code: true, account_name: true } },
          outlets: { select: { id: true, name: true } },
          users_bank_reconciliations_created_byTousers: { select: { id: true, name: true } },
          users_bank_reconciliations_reconciled_byTousers: { select: { id: true, name: true } },
          _count: { select: { bank_reconciliation_details: true } }
        },
        orderBy: { reconciliation_date: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.bank_reconciliations.count({ where })
    ]);

    res.json({
      success: true,
      data: reconciliations,
      pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, totalPages: Math.ceil(total / parseInt(limit as string)) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get reconciliation by ID with details
 */
export const getReconciliationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const reconciliation = await prisma.bank_reconciliations.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId },
      include: {
        chart_of_accounts: true,
        outlets: true,
        bank_reconciliation_details: {
          include: { journal_entries: { select: { id: true, journal_number: true, description: true } } }
        },
        users_bank_reconciliations_created_byTousers: { select: { id: true, name: true } },
        users_bank_reconciliations_reconciled_byTousers: { select: { id: true, name: true } }
      }
    });

    if (!reconciliation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reconciliation not found' } });
    }

    res.json({ success: true, data: reconciliation });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new reconciliation
 */
export const createReconciliation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { accountId, reconciliationDate, bankStatementBalance, outletId, notes } = req.body;

    if (!accountId || !reconciliationDate || bankStatementBalance === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Account ID, date, and bank statement balance are required' }
      });
    }

    // Calculate book balance from GL
    const bookBalanceResult: any[] = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(debit_amount - credit_amount), 0) as balance
      FROM "accounting"."general_ledger"
      WHERE tenant_id = ${tenantId}
      AND account_id = ${accountId}
      AND transaction_date <= '${new Date(reconciliationDate).toISOString()}'
    `);

    const bookBalance = new Decimal(bookBalanceResult[0]?.balance || 0);
    const bankBalance = new Decimal(bankStatementBalance);
    const difference = bankBalance.minus(bookBalance);

    const reconciliation = await prisma.bank_reconciliations.create({
      data: {
        tenant_id: tenantId,
        account_id: parseInt(accountId),
        outlet_id: outletId ? parseInt(outletId) : null,
        reconciliation_date: new Date(reconciliationDate),
        book_balance: bookBalance,
        bank_statement_balance: bankBalance,
        difference,
        status: difference.isZero() ? 'reconciled' : 'pending',
        notes,
        created_by: userId
      },
      include: { chart_of_accounts: { select: { account_code: true, account_name: true } } }
    });

    res.status(201).json({ success: true, data: reconciliation, message: 'Reconciliation created successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Add reconciliation detail item
 */
export const addReconciliationDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;
    const { transactionType, transactionAmount, transactionDate, description, referenceNumber, journalEntryId } = req.body;

    const reconciliation = await prisma.bank_reconciliations.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId }
    });

    if (!reconciliation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reconciliation not found' } });
    }

    if (reconciliation.status === 'reconciled') {
      return res.status(400).json({ success: false, error: { code: 'ALREADY_RECONCILED', message: 'Cannot modify reconciled record' } });
    }

    const detail = await prisma.bank_reconciliation_details.create({
      data: {
        reconciliation_id: parseInt(id),
        transaction_type: transactionType,
        transaction_amount: new Decimal(transactionAmount),
        transaction_date: new Date(transactionDate),
        description,
        reference_number: referenceNumber,
        matched_to_journal_id: journalEntryId ? parseInt(journalEntryId) : null,
        is_matched: !!journalEntryId
      }
    });

    res.status(201).json({ success: true, data: detail, message: 'Detail added successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Match detail to journal entry
 */
export const matchDetailToJournal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { id, detailId } = req.params;
    const { journalEntryId } = req.body;

    const reconciliation = await prisma.bank_reconciliations.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId }
    });

    if (!reconciliation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reconciliation not found' } });
    }

    const detail = await prisma.bank_reconciliation_details.update({
      where: { id: parseInt(detailId) },
      data: {
        matched_to_journal_id: journalEntryId ? parseInt(journalEntryId) : null,
        is_matched: !!journalEntryId
      },
      include: { journal_entries: { select: { journal_number: true, description: true } } }
    });

    res.json({ success: true, data: detail, message: 'Detail matched successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete reconciliation
 */
export const completeReconciliation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { id } = req.params;

    const reconciliation = await prisma.bank_reconciliations.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId },
      include: { bank_reconciliation_details: true }
    });

    if (!reconciliation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reconciliation not found' } });
    }

    // Check all details are matched
    const unmatchedCount = reconciliation.bank_reconciliation_details.filter(d => !d.is_matched).length;
    if (unmatchedCount > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'UNMATCHED_ITEMS', message: `${unmatchedCount} items are not matched yet` }
      });
    }

    const updated = await prisma.bank_reconciliations.update({
      where: { id: parseInt(id) },
      data: {
        status: 'reconciled',
        reconciled_by: userId,
        reconciled_at: new Date()
      }
    });

    res.json({ success: true, data: updated, message: 'Reconciliation completed successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete reconciliation
 */
export const deleteReconciliation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const reconciliation = await prisma.bank_reconciliations.findFirst({
      where: { id: parseInt(id), tenant_id: tenantId }
    });

    if (!reconciliation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reconciliation not found' } });
    }

    if (reconciliation.status === 'reconciled') {
      return res.status(400).json({ success: false, error: { code: 'CANNOT_DELETE', message: 'Cannot delete completed reconciliation' } });
    }

    await prisma.bank_reconciliations.delete({ where: { id: parseInt(id) } });

    res.json({ success: true, message: 'Reconciliation deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unmatched GL entries for matching
 */
export const getUnmatchedGLEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { account_id, start_date, end_date } = req.query;

    if (!account_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Account ID is required' } });
    }

    const entries: any[] = await prisma.$queryRawUnsafe(`
      SELECT gl.*, je.journal_number, je.description as journal_desc
      FROM "accounting"."general_ledger" gl
      JOIN "accounting"."journal_entries" je ON gl.journal_entry_id = je.id
      WHERE gl.tenant_id = ${tenantId}
      AND gl.account_id = ${account_id}
      ${start_date ? `AND gl.transaction_date >= '${new Date(start_date as string).toISOString()}'` : ''}
      ${end_date ? `AND gl.transaction_date <= '${new Date(end_date as string).toISOString()}'` : ''}
      AND gl.journal_entry_id NOT IN (
        SELECT COALESCE(matched_to_journal_id, 0) FROM "accounting"."bank_reconciliation_details"
      )
      ORDER BY gl.transaction_date DESC
      LIMIT 100
    `);

    res.json({ success: true, data: entries });
  } catch (error) {
    next(error);
  }
};
