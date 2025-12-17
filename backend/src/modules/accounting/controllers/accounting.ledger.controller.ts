import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

const parseNumber = (value: unknown) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

export const getLedgerEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { accountId, outletId, startDate, endDate, page = '1', limit = '50' } = req.query;

    const where: any = { tenant_id: tenantId };

    const accountIdNumber = parseNumber(accountId);
    if (accountIdNumber !== null) {
      where.account_id = accountIdNumber;
    }

    const outletIdNumber = parseNumber(outletId);
    if (outletIdNumber !== null) {
      where.outlet_id = outletIdNumber;
    }

    if (startDate || endDate) {
      where.transaction_date = {};
      if (startDate) {
        const start = new Date(String(startDate));
        if (!Number.isNaN(start.getTime())) {
          where.transaction_date.gte = start;
        }
      }
      if (endDate) {
        const end = new Date(String(endDate));
        if (!Number.isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          where.transaction_date.lte = end;
        }
      }
    }

    const pageNumber = Math.max(parseNumber(page) ?? 1, 1);
    const limitNumber = Math.min(Math.max(parseNumber(limit) ?? 50, 1), 200);
    const skip = (pageNumber - 1) * limitNumber;

    const [total, entries] = await prisma.$transaction([
      prisma.general_ledger.count({ where }),
      prisma.general_ledger.findMany({
        where,
        include: {
          chart_of_accounts: {
            select: {
              account_code: true,
              account_name: true,
              normal_balance: true
            }
          },
          journal_entries: {
            select: {
              journal_number: true,
              journal_type: true
            }
          },
          outlets: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          transaction_date: 'desc'
        },
        skip,
        take: limitNumber
      })
    ]);

    res.json({
      success: true,
      data: {
        entries: entries.map((entry) => ({
          id: entry.id,
          accountId: entry.account_id,
          accountCode: entry.chart_of_accounts?.account_code,
          accountName: entry.chart_of_accounts?.account_name,
          normalBalance: entry.chart_of_accounts?.normal_balance,
          journalNumber: entry.journal_entries?.journal_number,
          journalType: entry.journal_entries?.journal_type,
          transactionDate: entry.transaction_date,
          description: entry.description,
          debitAmount: Number(entry.debit_amount || 0),
          creditAmount: Number(entry.credit_amount || 0),
          balance: Number(entry.balance || 0),
          balanceType: entry.balance_type,
          outlet: entry.outlets
            ? {
                id: entry.outlets.id,
                name: entry.outlets.name
              }
            : null
        })),
        pagination: {
          page: pageNumber,
          pageSize: limitNumber,
          total,
          totalPages: Math.max(Math.ceil(total / limitNumber), 1)
        }
      }
    });
  } catch (error) {
    return next(error);
  }
};
