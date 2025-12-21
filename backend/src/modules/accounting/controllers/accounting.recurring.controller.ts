import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { generateJournalNumber } from '../../../utils/journal.utils';
import { postJournalToLedger } from '../../../services/ledger.service';

/**
 * RECURRING JOURNALS
 * Automated periodic journal entries
 */

interface RecurringJournalTemplate {
  id: number;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfMonth?: number;
  dayOfWeek?: number;
  nextRunDate: Date;
  lastRunDate?: Date;
  isActive: boolean;
  autoPost: boolean;
  lines: {
    accountId: number;
    description: string;
    debitAmount: number;
    creditAmount: number;
  }[];
}

// In-memory storage for recurring templates (would be DB table in production)
const recurringTemplates: Map<number, RecurringJournalTemplate> = new Map();
let templateIdCounter = 1;

/**
 * Get all recurring journal templates
 */
export const getRecurringTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;

    // Get from in-memory store (filter by tenant in production)
    const templates = Array.from(recurringTemplates.values());

    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recurring template by ID
 */
export const getRecurringTemplateById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const template = recurringTemplates.get(parseInt(id));

    if (!template) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Template not found' }
      });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

/**
 * Create recurring journal template
 */
export const createRecurringTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const {
      name,
      description,
      frequency,
      dayOfMonth,
      dayOfWeek,
      startDate,
      autoPost = false,
      lines
    } = req.body;

    if (!name || !frequency || !lines || lines.length < 2) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, frequency, and at least 2 lines required' }
      });
    }

    // Validate balance
    const totalDebit = lines.reduce((sum: number, l: any) => sum + (l.debitAmount || 0), 0);
    const totalCredit = lines.reduce((sum: number, l: any) => sum + (l.creditAmount || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        success: false,
        error: { code: 'UNBALANCED', message: 'Journal lines must be balanced' }
      });
    }

    // Calculate next run date
    const nextRunDate = calculateNextRunDate(frequency, dayOfMonth, dayOfWeek, startDate ? new Date(startDate) : new Date());

    const template: RecurringJournalTemplate = {
      id: templateIdCounter++,
      name,
      description,
      frequency,
      dayOfMonth,
      dayOfWeek,
      nextRunDate,
      isActive: true,
      autoPost,
      lines
    };

    recurringTemplates.set(template.id, template);

    res.status(201).json({
      success: true,
      data: template,
      message: 'Recurring template created'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update recurring template
 */
export const updateRecurringTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const template = recurringTemplates.get(parseInt(id));
    if (!template) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Template not found' }
      });
    }

    // Update fields
    if (updates.name) template.name = updates.name;
    if (updates.description !== undefined) template.description = updates.description;
    if (updates.isActive !== undefined) template.isActive = updates.isActive;
    if (updates.autoPost !== undefined) template.autoPost = updates.autoPost;
    if (updates.lines) template.lines = updates.lines;

    if (updates.frequency || updates.dayOfMonth || updates.dayOfWeek) {
      template.frequency = updates.frequency || template.frequency;
      template.dayOfMonth = updates.dayOfMonth;
      template.dayOfWeek = updates.dayOfWeek;
      template.nextRunDate = calculateNextRunDate(
        template.frequency,
        template.dayOfMonth,
        template.dayOfWeek
      );
    }

    recurringTemplates.set(template.id, template);

    res.json({ success: true, data: template, message: 'Template updated' });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete recurring template
 */
export const deleteRecurringTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!recurringTemplates.has(parseInt(id))) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Template not found' }
      });
    }

    recurringTemplates.delete(parseInt(id));

    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * Execute recurring template manually
 */
export const executeRecurringTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { id } = req.params;
    const { transactionDate } = req.body;

    const template = recurringTemplates.get(parseInt(id));
    if (!template) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Template not found' }
      });
    }

    // Create journal from template
    const journalNumber = await generateJournalNumber(tenantId, 'recurring');
    const txDate = transactionDate ? new Date(transactionDate) : new Date();

    const totalDebit = template.lines.reduce((sum, l) => sum + (l.debitAmount || 0), 0);
    const totalCredit = template.lines.reduce((sum, l) => sum + (l.creditAmount || 0), 0);

    const journal = await prisma.journal_entries.create({
      data: {
        tenant_id: tenantId,
        journal_number: journalNumber,
        journal_type: 'recurring',
        transaction_date: txDate,
        description: `[Recurring] ${template.name}: ${template.description || ''}`,
        reference_type: 'recurring_template',
        reference_id: template.id,
        total_debit: new Decimal(totalDebit),
        total_credit: new Decimal(totalCredit),
        status: template.autoPost ? 'draft' : 'draft',
        created_by: userId,
        journal_entry_lines: {
          create: template.lines.map(line => ({
            account_id: line.accountId,
            description: line.description,
            debit_amount: new Decimal(line.debitAmount || 0),
            credit_amount: new Decimal(line.creditAmount || 0)
          }))
        }
      },
      include: { journal_entry_lines: true }
    });

    // Auto-post if configured
    if (template.autoPost) {
      await postJournalToLedger(journal.id, tenantId, userId);
    }

    // Update template
    template.lastRunDate = new Date();
    template.nextRunDate = calculateNextRunDate(
      template.frequency,
      template.dayOfMonth,
      template.dayOfWeek,
      new Date()
    );
    recurringTemplates.set(template.id, template);

    res.json({
      success: true,
      data: {
        journal,
        template: {
          lastRunDate: template.lastRunDate,
          nextRunDate: template.nextRunDate
        }
      },
      message: template.autoPost ? 'Journal created and posted' : 'Journal created as draft'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process all due recurring journals
 */
export const processDueRecurringJournals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    const now = new Date();
    const results: any[] = [];
    const errors: any[] = [];

    for (const [id, template] of recurringTemplates) {
      if (!template.isActive) continue;
      if (template.nextRunDate > now) continue;

      try {
        const journalNumber = await generateJournalNumber(tenantId, 'recurring');
        const totalDebit = template.lines.reduce((sum, l) => sum + (l.debitAmount || 0), 0);

        const journal = await prisma.journal_entries.create({
          data: {
            tenant_id: tenantId,
            journal_number: journalNumber,
            journal_type: 'recurring',
            transaction_date: now,
            description: `[Auto-Recurring] ${template.name}`,
            reference_type: 'recurring_template',
            reference_id: template.id,
            total_debit: new Decimal(totalDebit),
            total_credit: new Decimal(totalDebit),
            status: 'draft',
            created_by: userId,
            journal_entry_lines: {
              create: template.lines.map(line => ({
                account_id: line.accountId,
                description: line.description,
                debit_amount: new Decimal(line.debitAmount || 0),
                credit_amount: new Decimal(line.creditAmount || 0)
              }))
            }
          }
        });

        if (template.autoPost) {
          await postJournalToLedger(journal.id, tenantId, userId);
        }

        template.lastRunDate = now;
        template.nextRunDate = calculateNextRunDate(template.frequency, template.dayOfMonth, template.dayOfWeek, now);
        recurringTemplates.set(id, template);

        results.push({ templateId: id, templateName: template.name, journalId: journal.id, status: 'success' });
      } catch (err: any) {
        errors.push({ templateId: id, templateName: template.name, error: err.message });
      }
    }

    res.json({
      success: true,
      data: {
        processed: results.length,
        failed: errors.length,
        results,
        errors
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get upcoming recurring journals
 */
export const getUpcomingRecurringJournals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = 30 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + parseInt(days as string));

    const upcoming = Array.from(recurringTemplates.values())
      .filter(t => t.isActive && t.nextRunDate <= cutoffDate)
      .sort((a, b) => a.nextRunDate.getTime() - b.nextRunDate.getTime())
      .map(t => ({
        id: t.id,
        name: t.name,
        frequency: t.frequency,
        nextRunDate: t.nextRunDate,
        autoPost: t.autoPost,
        totalAmount: t.lines.reduce((sum, l) => sum + (l.debitAmount || 0), 0)
      }));

    res.json({ success: true, data: upcoming });
  } catch (error) {
    next(error);
  }
};

// Helper: Calculate next run date
function calculateNextRunDate(
  frequency: string,
  dayOfMonth?: number,
  dayOfWeek?: number,
  fromDate: Date = new Date()
): Date {
  const next = new Date(fromDate);
  next.setHours(0, 0, 0, 0);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      if (dayOfWeek !== undefined) {
        const currentDay = next.getDay();
        const daysToAdd = (dayOfWeek - currentDay + 7) % 7 || 7;
        next.setDate(next.getDate() + daysToAdd);
      }
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      if (dayOfMonth) {
        next.setDate(Math.min(dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      }
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      if (dayOfMonth) {
        next.setDate(Math.min(dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      }
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}
