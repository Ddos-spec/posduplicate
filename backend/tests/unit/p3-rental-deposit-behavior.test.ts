jest.mock('../../src/utils/prisma', () => ({ __esModule: true, default: { $transaction: jest.fn() } }));
jest.mock('../../src/services/ledger.service', () => ({ postJournalToLedgerTx: jest.fn() }));

import prisma from '../../src/utils/prisma';
import { postJournalToLedgerTx } from '../../src/services/ledger.service';
import { holdRentalDeposit } from '../../src/modules/fnb/services/rental-deposit.p3.service';

const transaction = prisma.$transaction as unknown as jest.Mock;
const postLedger = postJournalToLedgerTx as jest.Mock;
const queryRaw = jest.fn();
const executeRaw = jest.fn();
const accountFindFirst = jest.fn();
const journalFindFirst = jest.fn();
const journalCreate = jest.fn();
const tx = {
  $queryRaw: queryRaw,
  $executeRaw: executeRaw,
  chart_of_accounts: { findFirst: accountFindFirst },
  journal_entries: { findFirst: journalFindFirst, create: journalCreate },
} as any;

describe('P3.4 rental deposit hold behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transaction.mockImplementation(async (fn: (client: any) => unknown) => fn(tx));
  });

  test('posts refundable cash deposit as asset debit and customer-liability credit', async () => {
    queryRaw.mockResolvedValueOnce([{
      id: 41,
      tenant_id: 7,
      outlet_id: 3,
      booking_number: 'RNT-2026-000041',
      status: 'confirmed',
      deposit_amount: '250000.00',
      deposit_status: 'pending',
    }]);
    accountFindFirst
      .mockResolvedValueOnce({ id: 1101, account_code: '1101', normal_balance: 'DEBIT' })
      .mockResolvedValueOnce({ id: 2104, account_code: '2104', normal_balance: 'CREDIT' });
    journalFindFirst.mockResolvedValueOnce(null);
    journalCreate.mockResolvedValueOnce({ id: 501 });
    postLedger.mockResolvedValueOnce({ success: true });
    executeRaw.mockResolvedValue(1);

    const result = await holdRentalDeposit(7, 9, 41, { paymentMethod: 'cash', referenceNumber: 'DEP-41' });

    expect(result).toEqual({ bookingId: 41, depositStatus: 'held', amount: 250000, journalId: 501, reused: false });
    expect(journalCreate).toHaveBeenCalledTimes(1);
    const createInput = journalCreate.mock.calls[0][0].data;
    expect(createInput.journal_number).toBe('RD-41-HOLD');
    expect(createInput.reference_type).toBe('rental_deposit_hold');
    expect(createInput.total_debit).toBe(250000);
    expect(createInput.total_credit).toBe(250000);
    expect(createInput.journal_entry_lines.create).toEqual([
      expect.objectContaining({ account_id: 1101, debit_amount: 250000, credit_amount: 0 }),
      expect.objectContaining({ account_id: 2104, debit_amount: 0, credit_amount: 250000 }),
    ]);
    expect(postLedger).toHaveBeenCalledWith(tx, 501, 7, 9);
    expect(executeRaw).toHaveBeenCalledTimes(2);
  });

  test('retry of an already-held deposit is idempotent and does not post again', async () => {
    queryRaw.mockResolvedValueOnce([{
      id: 41,
      tenant_id: 7,
      outlet_id: 3,
      booking_number: 'RNT-2026-000041',
      status: 'confirmed',
      deposit_amount: '250000.00',
      deposit_status: 'held',
    }]);
    journalFindFirst.mockResolvedValueOnce({ id: 501, status: 'posted' });

    const result = await holdRentalDeposit(7, 9, 41, { paymentMethod: 'cash' });

    expect(result).toEqual({ bookingId: 41, depositStatus: 'held', amount: 250000, journalId: 501, reused: true });
    expect(accountFindFirst).not.toHaveBeenCalled();
    expect(journalCreate).not.toHaveBeenCalled();
    expect(postLedger).not.toHaveBeenCalled();
    expect(executeRaw).not.toHaveBeenCalled();
  });
});
