import prisma from '../utils/prisma';
import { generateJournalNumber } from '../utils/journal.utils';
import { postJournalToLedger } from './ledger.service';
import { Decimal } from '@prisma/client/runtime/library';

// Helper to map payment method to account code
const getPaymentMethodAccountCode = (method: string): string => {
  const normalized = method.toLowerCase();
  if (normalized === 'cash') return '1101'; // Kas Kecil
  if (normalized === 'transfer' || normalized === 'bank_transfer') return '1102'; // Bank BCA
  if (normalized === 'card' || normalized === 'credit_card' || normalized === 'debit_card') return '1103'; // Piutang CC? Or Bank directly? Default to Bank for now or specific Clearing account.
  if (normalized === 'qris') return '1102'; // Bank BCA (Assume QRIS settles to bank)
  return '1101'; // Default to Cash
};

// Helper to get Account ID by Code
const getAccountIdByCode = async (tenantId: number, code: string): Promise<number | null> => {
  const account = await prisma.chart_of_accounts.findFirst({
    where: { tenant_id: tenantId, account_code: code }
  });
  return account ? account.id : null;
};

/**
 * Generate Journal from POS Transaction
 */
export const generateJournalFromPOSTransaction = async (transactionId: number) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        outlets: true,
        payments: true
      }
    });

    if (!transaction || !transaction.outlets) {
      console.error(`Transaction ${transactionId} not found or missing outlet`);
      return;
    }

    const tenantId = transaction.outlets.tenantId;
    if (!tenantId) {
        console.error(`Transaction ${transactionId} missing tenantId`);
        return;
    }

    // Check if journal already exists (idempotency)
    const existing = await prisma.journal_entries.findFirst({
      where: {
        tenant_id: tenantId,
        reference_type: 'pos_transaction',
        reference_id: transaction.id
      }
    });

    if (existing) {
      console.log(`Journal for transaction ${transactionId} already exists`);
      return;
    }

    const journalNumber = await generateJournalNumber(tenantId, 'sales');

    // Prepare Lines
    const lines = [];

    // 1. DEBIT: Payment Methods (Assets)
    // Group payments by method? Or just individual lines? 
    // Usually aggregated by method for cleaner journal, but individual is fine for traceability.
    // Let's aggregate by method code to avoid duplicate account lines if multiple payments of same type.
    const paymentGroups = new Map<string, Decimal>();
    
    for (const payment of transaction.payments) {
      const code = getPaymentMethodAccountCode(payment.method);
      const amount = new Decimal(payment.amount);
      const current = paymentGroups.get(code) || new Decimal(0);
      paymentGroups.set(code, current.plus(amount));
    }

    for (const [code, amount] of paymentGroups.entries()) {
      const accountId = await getAccountIdByCode(tenantId, code);
      if (accountId) {
        lines.push({
          account_id: accountId,
          description: `Penerimaan POS`, // Simplified desc
          debit_amount: amount,
          credit_amount: new Decimal(0)
        });
      } else {
        console.warn(`Account code ${code} not found for tenant ${tenantId}`);
        // Fallback? Or fail? Fail for now to alert setup issue.
        // Or maybe log error and skip auto-journal
      }
    }

    // 2. CREDIT: Revenue (Sales)
    // Account 4101: Pendapatan Penjualan
    // Should be Net Sales? Or Gross? 
    // Usually: Cash (Debit) = Revenue (Credit) + Tax (Credit)
    // If Discount exists: Cash (Debit) + Discount Exp (Debit) = Revenue (Credit) ??
    // OR Revenue is recorded Net?
    // Let's stick to standard: 
    // Debit Cash (Total Paid)
    // Credit Revenue (Subtotal - Discount?) -> Net Sales
    // Credit Tax (Tax Amount)
    // Wait, transaction.total = subtotal - discount + tax + service
    // payment amount = total (usually)
    
    // Revenue Account
    const revenueAccountId = await getAccountIdByCode(tenantId, '4101');
    if (revenueAccountId) {
       // Revenue = Subtotal - Discount (if discount is deducted from revenue directly)
       // OR Record Gross Revenue and Debit Discount Expense?
       // Let's use Net Sales from transaction model if available, or calc.
       // Model has `netSales`?
       // transaction.netSales exists in schema!
       // But wait, Prisma schema provided earlier showed `SalesTransaction` model separate from `Transaction`.
       // `Transaction` model has `subtotal`, `discountAmount`, `taxAmount`, `service_charge`, `total`.
       // Net Sales roughly = Subtotal - Discount.
       
       const revenueAmount = new Decimal(transaction.subtotal || 0).minus(new Decimal(transaction.discountAmount || 0));
       
       if (revenueAmount.greaterThan(0)) {
         lines.push({
           account_id: revenueAccountId,
           description: `Pendapatan Penjualan ${transaction.transaction_number}`,
           debit_amount: new Decimal(0),
           credit_amount: revenueAmount
         });
       }
    }

    // 3. CREDIT: Tax (Output VAT)
    // Account 2103: PPN Keluaran
    if (transaction.taxAmount && new Decimal(transaction.taxAmount).greaterThan(0)) {
      const taxAccountId = await getAccountIdByCode(tenantId, '2103');
      if (taxAccountId) {
        lines.push({
          account_id: taxAccountId,
          description: `PPN Keluaran`,
          debit_amount: new Decimal(0),
          credit_amount: new Decimal(transaction.taxAmount)
        });
      }
    }

    // 4. CREDIT: Service Charge (Revenue - Other?)
    // Account 4102: Pendapatan Jasa
    if (transaction.service_charge && new Decimal(transaction.service_charge).greaterThan(0)) {
        const serviceAccountId = await getAccountIdByCode(tenantId, '4102');
        if (serviceAccountId) {
            lines.push({
                account_id: serviceAccountId,
                description: `Service Charge`,
                debit_amount: new Decimal(0),
                credit_amount: new Decimal(transaction.service_charge)
            });
        }
    }

    // Balance Check & Fallback
    // If accounts missing, lines might be unbalanced or empty.
    if (lines.length < 2) {
        console.warn('Insufficient lines generated for auto-journal');
        return;
    }

    const totalDebit = lines.reduce((sum, line) => sum.plus(line.debit_amount), new Decimal(0));
    const totalCredit = lines.reduce((sum, line) => sum.plus(line.credit_amount), new Decimal(0));
    
    // Create Journal
    const journal = await prisma.journal_entries.create({
      data: {
        tenant_id: tenantId,
        outlet_id: transaction.outletId,
        journal_number: journalNumber,
        journal_type: 'sales',
        transaction_date: transaction.createdAt || new Date(),
        description: `Auto-Journal POS: ${transaction.transaction_number}`,
        reference_type: 'pos_transaction',
        reference_id: transaction.id,
        total_debit: totalDebit,
        total_credit: totalCredit,
        status: 'draft', // Create as draft first, then post
        created_by: transaction.cashier_id || 0, // System or cashier
        journal_entry_lines: {
          create: lines.map(line => ({
             account_id: line.account_id,
             description: line.description,
             debit_amount: line.debit_amount,
             credit_amount: line.credit_amount
          }))
        }
      }
    });

    // Attempt to post
    await postJournalToLedger(journal.id, tenantId, transaction.cashier_id || 0);
    console.log(`Auto-journal created and posted: ${journal.journal_number}`);

  } catch (error) {
    console.error('Failed to generate auto-journal for transaction:', error);
    // Don't throw to prevent blocking the main transaction flow?
  }
};

/**
 * Generate Journal from Expense
 */
export const generateJournalFromExpense = async (expenseId: number) => {
    try {
        const expense = await prisma.expense.findUnique({
            where: { id: expenseId },
            include: { outlet: true, supplier: true }
        });

        if (!expense || !expense.outlet) return;
        const tenantId = expense.outlet.tenantId;
        if (!tenantId) return;

        // Check duplicate
        const existing = await prisma.journal_entries.findFirst({
            where: { tenant_id: tenantId, reference_type: 'expense', reference_id: expense.id }
        });
        if (existing) return;

        const journalNumber = await generateJournalNumber(tenantId, 'expense');
        const lines = [];

        // 1. DEBIT: Expense Account
        // Map category to account?
        // Simple mapping based on prompt or default
        // '6000' is Beban Operasional Category
        // Let's try to find account by name = expense.category, or fallback to '6104' (Misc/Other) or '6000' children?
        // For now, let's look for an account with name matching category
        let expenseAccountId = await getAccountIdByCode(tenantId, '6104'); // Fallback: Beban Telepon (placeholder)
        
        // Better: Search by name
        const matchAccount = await prisma.chart_of_accounts.findFirst({
            where: { 
                tenant_id: tenantId, 
                account_name: { contains: expense.category, mode: 'insensitive' },
                account_type: 'EXPENSE'
            }
        });
        if (matchAccount) expenseAccountId = matchAccount.id;

        if (!expenseAccountId) {
            // Hard fallback if no CoA seeded?
            console.warn('No expense account found');
            return;
        }

        lines.push({
            account_id: expenseAccountId,
            description: expense.description || `Expense ${expense.category}`,
            debit_amount: new Decimal(expense.amount),
            credit_amount: new Decimal(0)
        });

        // 2. CREDIT: Cash or AP
        if (expense.paidAt) {
             // Paid: Credit Cash
             const cashCode = getPaymentMethodAccountCode(expense.paymentMethod || 'cash');
             const cashAccountId = await getAccountIdByCode(tenantId, cashCode);
             if (cashAccountId) {
                 lines.push({
                     account_id: cashAccountId,
                     description: `Payment: ${expense.paymentMethod}`,
                     debit_amount: new Decimal(0),
                     credit_amount: new Decimal(expense.amount)
                 });
             }
        } else {
             // Unpaid: Credit AP (Hutang Usaha 2101)
             const apAccountId = await getAccountIdByCode(tenantId, '2101');
             if (apAccountId) {
                 lines.push({
                     account_id: apAccountId,
                     description: `Hutang: ${expense.supplier?.name || 'Supplier'}`,
                     debit_amount: new Decimal(0),
                     credit_amount: new Decimal(expense.amount)
                 });

                 // Create Accounts Payable Record
                 try {
                     await prisma.accounts_payable.create({
                         data: {
                             tenant_id: tenantId,
                             outlet_id: expense.outletId,
                             supplier_id: expense.supplierId || 0, // Should have supplier
                             invoice_number: expense.invoiceNumber || `INV-${Date.now()}`,
                             invoice_date: expense.createdAt || new Date(),
                             due_date: expense.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
                             amount: expense.amount,
                             paid_amount: 0,
                             balance: expense.amount,
                             status: 'unpaid',
                             reference_type: 'expense',
                             reference_id: expense.id,
                             created_by: expense.userId
                         }
                     });
                     console.log('Created AP record for expense:', expense.id);
                 } catch (apError) {
                     console.error('Failed to create AP record:', apError);
                 }
             }
        }

        if (lines.length < 2) return;

        const total = new Decimal(expense.amount);

        const journal = await prisma.journal_entries.create({
            data: {
                tenant_id: tenantId,
                outlet_id: expense.outletId,
                journal_number: journalNumber,
                journal_type: 'expense',
                transaction_date: expense.createdAt || new Date(),
                description: `Expense: ${expense.description}`,
                reference_type: 'expense',
                reference_id: expense.id,
                total_debit: total,
                total_credit: total,
                status: 'draft',
                created_by: expense.userId,
                journal_entry_lines: {
                    create: lines.map(line => ({
                        account_id: line.account_id,
                        description: line.description,
                        debit_amount: line.debit_amount,
                        credit_amount: line.credit_amount
                    }))
                }
            }
        });

        await postJournalToLedger(journal.id, tenantId, expense.userId);
        console.log(`Auto-journal expense created: ${journal.journal_number}`);

    } catch (error) {
        console.error('Failed to generate auto-journal for expense:', error);
    }
}
