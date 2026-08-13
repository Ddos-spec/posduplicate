import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../utils/prisma';

const GENERAL_LEDGER_POSTING_LOCK = 77002;

export const postJournalToLedgerTx = async (
  tx: Prisma.TransactionClient,
  journalId: number,
  tenantId: number,
  userId: number,
) => {
  await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, ${GENERAL_LEDGER_POSTING_LOCK})`);

  const journal = await tx.journal_entries.findUnique({
    where: { id: journalId },
    include: {
      journal_entry_lines: {
        include: { chart_of_accounts: true },
      },
    },
  });

  if (!journal) throw new Error('Journal not found');
  if (journal.tenant_id !== tenantId) throw new Error('Unauthorized access to this journal');
  if (journal.status !== 'draft') throw new Error('Only draft journals can be posted');

  const totalDebit = journal.journal_entry_lines.reduce(
    (sum, line) => sum.plus(new Decimal(line.debit_amount || 0)),
    new Decimal(0),
  );
  const totalCredit = journal.journal_entry_lines.reduce(
    (sum, line) => sum.plus(new Decimal(line.credit_amount || 0)),
    new Decimal(0),
  );
  if (totalDebit.sub(totalCredit).abs().greaterThan(0.01)) {
    throw new Error(`Journal is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
  }

  for (const line of journal.journal_entry_lines) {
    const account = line.chart_of_accounts;
    if (account.tenant_id !== tenantId || account.is_active === false) {
      throw new Error(`Journal account ${account.id} is not active for this tenant`);
    }

    const lastGlEntry = await tx.general_ledger.findFirst({
      where: { tenant_id: tenantId, account_id: line.account_id },
      orderBy: [{ transaction_date: 'desc' }, { id: 'desc' }],
    });

    const previousBalance = new Decimal(lastGlEntry?.balance || 0);
    const debit = new Decimal(line.debit_amount || 0);
    const credit = new Decimal(line.credit_amount || 0);
    const signedBalance = account.normal_balance === 'DEBIT'
      ? previousBalance.plus(debit).minus(credit)
      : previousBalance.plus(credit).minus(debit);
    const balanceType = signedBalance.isNegative()
      ? (account.normal_balance === 'DEBIT' ? 'CREDIT' : 'DEBIT')
      : account.normal_balance;

    await tx.general_ledger.create({
      data: {
        tenant_id: tenantId,
        outlet_id: journal.outlet_id,
        account_id: line.account_id,
        journal_entry_id: journal.id,
        transaction_date: journal.transaction_date,
        description: line.description || journal.description,
        debit_amount: debit,
        credit_amount: credit,
        balance: signedBalance.abs(),
        balance_type: balanceType,
      },
    });
  }

  await tx.journal_entries.update({
    where: { id: journal.id },
    data: { status: 'posted', posted_at: new Date(), posted_by: userId },
  });

  return { success: true };
};

/**
 * Post Journal to General Ledger.
 * Tenant-scoped advisory serialization protects the running-balance read/write path
 * from concurrent journal posting races, including Payroll-C3 official finalization.
 */
export const postJournalToLedger = async (journalId: number, tenantId: number, userId: number) =>
  prisma.$transaction((tx) => postJournalToLedgerTx(tx, journalId, tenantId, userId));
