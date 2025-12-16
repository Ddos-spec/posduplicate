import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { generateJournalNumber } from '../utils/journal.utils';
import { postJournalToLedger } from '../services/ledger.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Get Journals
 */
export const getJournals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate, search } = req.query;
    const tenantId = req.tenantId!;

    const where: any = { tenant_id: tenantId };

    if (status && status !== 'all') {
      where.status = String(status);
    }

    if (startDate && endDate) {
      where.transaction_date = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
    }

    if (search) {
      where.OR = [
        { journal_number: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [journals, total] = await Promise.all([
      prisma.journal_entries.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { transaction_date: 'desc' },
        include: {
           // Optimization: Don't fetch lines for list view? Or maybe just count?
           // Frontend usually needs total amount.
           // `total_debit` is stored in header, good.
        }
      }),
      prisma.journal_entries.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        journals,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Journal Detail
 */
export const getJournalById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const journal = await prisma.journal_entries.findUnique({
      where: { id: Number(id) },
      include: {
        journal_entry_lines: {
          include: {
            account: {
              select: { id: true, account_code: true, account_name: true }
            }
          }
        },
        // created_by relation? User table might not be in Prisma client if excluded?
        // We added User model to schema, so it should work.
        // But let's check if 'users' relation exists in JournalEntry model in schema...
        // Ah, in schema we didn't add relation for created_by to User. 
        // We only added `created_by Int`. That's fine for now.
      }
    });

    if (!journal || journal.tenant_id !== tenantId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Journal not found' } });
    }

    res.json({
      success: true,
      data: journal
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Journal (Draft)
 */
export const createJournal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      journal_type, transaction_date, description, 
      reference_type, reference_id, lines, status 
    } = req.body;
    
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const outletId = req.outletId; // Optional, can be null

    // Validation: At least 2 lines
    if (!lines || !Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_LINES', message: 'Journal must have at least 2 lines' }
      });
    }

    // Validation: Balanced? (Even for draft, we might want to warn, but usually strict for posted)
    // Let's enforce balance for creation to avoid messy drafts.
    const totalDebit = lines.reduce((sum: number, line: any) => sum + Number(line.debit_amount || 0), 0);
    const totalCredit = lines.reduce((sum: number, line: any) => sum + Number(line.credit_amount || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
       return res.status(400).json({
         success: false,
         error: { 
           code: 'NOT_BALANCED', 
           message: 'Total Debit and Credit must be equal',
           details: { totalDebit, totalCredit, difference: totalDebit - totalCredit }
         }
       });
    }

    const journalNumber = await generateJournalNumber(tenantId, journal_type || 'general');

    const journal = await prisma.journal_entries.create({
      data: {
        tenant_id: tenantId,
        outlet_id: outletId,
        journal_number: journalNumber,
        journal_type: journal_type || 'general',
        transaction_date: new Date(transaction_date || new Date()),
        description,
        reference_type,
        reference_id,
        total_debit: totalDebit,
        total_credit: totalCredit,
        status: 'draft', // Always create as draft first
        created_by: userId,
        journal_entry_lines: {
          create: lines.map((line: any) => ({
            account_id: line.account_id,
            description: line.description || description, // Fallback to header desc
            debit_amount: line.debit_amount || 0,
            credit_amount: line.credit_amount || 0
          }))
        }
      }
    });

    // If status requested was 'posted', post immediately
    if (status === 'posted') {
      await postJournalToLedger(journal.id, tenantId, userId);
      // Fetch updated
      const postedJournal = await prisma.journal_entries.findUnique({ where: { id: journal.id } });
      return res.status(201).json({ success: true, data: postedJournal });
    }

    res.status(201).json({
      success: true,
      data: journal
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Post Journal
 */
export const postJournal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    await postJournalToLedger(Number(id), tenantId, userId);

    res.json({
      success: true,
      message: 'Journal posted successfully'
    });
  } catch (error) {
    // Check for specific service errors
    if (error instanceof Error && error.message.includes('not balanced')) {
        return res.status(400).json({ success: false, error: { code: 'NOT_BALANCED', message: error.message } });
    }
    next(error);
  }
};

/**
 * Void Journal
 */
export const voidJournal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    const journal = await prisma.journal_entries.findUnique({
      where: { id: Number(id) }
    });

    if (!journal || journal.tenant_id !== tenantId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Journal not found' } });
    }

    if (journal.status !== 'posted') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Only posted journals can be voided' } });
    }

    // Logic: Create Reversal Journal
    // 1. Fetch lines
    const lines = await prisma.journal_entry_lines.findMany({ where: { journal_entry_id: journal.id } });

    // 2. Create Reversal
    const reversalNumber = await generateJournalNumber(tenantId, 'general');
    const reversalJournal = await prisma.journal_entries.create({
      data: {
        tenant_id: tenantId,
        outlet_id: journal.outlet_id,
        journal_number: reversalNumber,
        journal_type: 'reversal',
        transaction_date: new Date(), // Reversal date is now
        description: `Reversal of ${journal.journal_number}: ${reason}`,
        reference_type: 'journal',
        reference_id: journal.id,
        total_debit: journal.total_debit,
        total_credit: journal.total_credit,
        status: 'draft',
        created_by: userId,
        journal_entry_lines: {
          create: lines.map(line => ({
            account_id: line.account_id,
            description: `Reversal: ${line.description}`,
            debit_amount: line.credit_amount, // Swap
            credit_amount: line.debit_amount  // Swap
          }))
        }
      }
    });

    // 3. Post Reversal
    await postJournalToLedger(reversalJournal.id, tenantId, userId);

    // 4. Mark Original as Voided
    await prisma.journal_entries.update({
      where: { id: journal.id },
      data: {
        status: 'voided',
        voided_at: new Date(),
        voided_by: userId,
        void_reason: reason
      }
    });

    res.json({
      success: true,
      message: 'Journal voided successfully',
      data: { reversalJournalId: reversalJournal.id }
    });

  } catch (error) {
    next(error);
  }
};
