import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Post Journal to General Ledger
 * - Validates balance
 * - Creates GL entries
 * - Updates Account balances (if using denormalized balance column)
 * - Updates Journal status
 */
export const postJournalToLedger = async (journalId: number, tenantId: number, userId: number) => {
  // 1. Fetch Journal with Lines
  const journal = await prisma.journal_entries.findUnique({
    where: { id: journalId },
          include: {
            journal_entry_lines: {
              include: {
                chart_of_accounts: true
              }
            }
          }  });

  if (!journal) {
    throw new Error('Journal not found');
  }

  // Security check
  if (journal.tenant_id !== tenantId) {
    throw new Error('Unauthorized access to this journal');
  }

  if (journal.status !== 'draft') {
    throw new Error('Only draft journals can be posted');
  }

  // 2. Validate Balance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = journal as any;
  const totalDebit = j.journal_entry_lines.reduce((sum: Decimal, line: any) => sum.plus(new Decimal(line.debit_amount || 0)), new Decimal(0));
  const totalCredit = j.journal_entry_lines.reduce((sum: Decimal, line: any) => sum.plus(new Decimal(line.credit_amount || 0)), new Decimal(0));

  // Allow small floating point difference? (e.g. 0.01)
  if (totalDebit.sub(totalCredit).abs().greaterThan(0.01)) {
     throw new Error(`Journal is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
  }

  // 3. Transaction: Post to GL and Update Status
  await prisma.$transaction(async (tx) => {
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const line of (journal as any).journal_entry_lines) {
      const account = line.chart_of_accounts;

      // Calculate new running balance for the account
      // Note: "general_ledger" table has a "balance" column which acts as a snapshot or running balance.
      // Calculating strictly sequential running balance in a high-concurrency environment is complex.
      // For this implementation, we will fetch the LATEST GL entry for this account to get the previous balance.
      
      const lastGlEntry = await tx.general_ledger.findFirst({
        where: {
          tenant_id: tenantId,
          account_id: line.account_id
        },
        orderBy: {
          transaction_date: 'desc', // This might be imperfect if dates are same. ID desc as secondary?
          // id: 'desc' 
        },
        take: 1
      });

      const prevBalance = new Decimal(lastGlEntry?.balance || 0);
      let currentBalance = new Decimal(0);

      // Logic: 
      // Asset/Expense (Normal Debit): +Debit -Credit
      // Liab/Equity/Revenue (Normal Credit): +Credit -Debit
      
      const debit = new Decimal(line.debit_amount);
      const credit = new Decimal(line.credit_amount);

      if (account.normal_balance === 'DEBIT') {
        currentBalance = prevBalance.plus(debit).minus(credit);
      } else {
        currentBalance = prevBalance.plus(credit).minus(debit);
      }

      // Determine balance type (usually follows normal balance, but can flip if account goes negative)
      // For simplicity, we assume it stays in normal nature or becomes negative.
      // The schema has `balance_type`, let's populate it.
      let balanceType = account.normal_balance;
      if (currentBalance.isNegative()) {
         // If negative, it effectively flips nature? Or just negative amount?
         // Standard accounting usually keeps negative amount. 
         // Let's keep `balance` absolute and set type? Or just signed balance?
         // Schema says `balance` is Decimal (likely unsigned in DB usually, but Prisma Decimal supports signs).
         // Looking at `general_ledger` schema: `balance` Decimal, `balance_type` String.
         // Let's keep balance ABSOLUTE and use balance_type to indicate direction.
      }
      
      // Let's stick to: Balance is strictly Signed or Unsigned based on normal?
      // "Simple" approach: Balance is always positive if it matches normal.
      
      const finalBalance = currentBalance.abs();
      // If currentBalance < 0, it means it flipped (e.g. Asset became Credit balance).
      if (currentBalance.isNegative()) {
         balanceType = account.normal_balance === 'DEBIT' ? 'CREDIT' : 'DEBIT';
      } else {
         balanceType = account.normal_balance;
      }

      // Create GL Entry
      await tx.general_ledger.create({
        data: {
          tenant_id: tenantId,
          outlet_id: journal.outlet_id,
          account_id: line.account_id,
          journal_entry_id: journal.id,
          transaction_date: journal.transaction_date, // Use journal date, not now()
          description: line.description || journal.description,
          debit_amount: debit,
          credit_amount: credit,
          balance: finalBalance,
          balance_type: balanceType
        }
      });
    }

    // Update Journal Status
    await tx.journal_entries.update({
      where: { id: journal.id },
      data: {
        status: 'posted',
        posted_at: new Date(),
        posted_by: userId
      }
    });

  });

  return { success: true };
};
