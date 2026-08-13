import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';
import { postJournalToLedgerTx } from '../../../services/ledger.service';
import { rentalError, rentalPositiveInt } from './rental-availability.p3.service';

const paymentAccountCode = (methodValue: unknown) => {
  const method = String(methodValue || '').trim().toLowerCase();
  if (method === 'cash') return { method, code: '1101' };
  if (['transfer', 'bank_transfer', 'qris', 'card', 'credit_card', 'debit_card'].includes(method)) {
    return { method, code: '1102' };
  }
  throw rentalError('Unsupported rental deposit payment method', 'INVALID_RENTAL_DEPOSIT_PAYMENT_METHOD');
};

const ensureDepositLiabilityAccount = async (tx: Prisma.TransactionClient, tenantId: number) => {
  const existing = await tx.chart_of_accounts.findFirst({
    where: { tenant_id: tenantId, account_code: '2104', is_active: true },
  });
  if (existing) return existing;

  const parent = await tx.chart_of_accounts.findFirst({
    where: { tenant_id: tenantId, account_code: '2100', is_active: true },
  });
  if (!parent) throw rentalError('Current-liability parent account 2100 is required', 'RENTAL_DEPOSIT_COA_REQUIRED', 409);

  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    INSERT INTO accounting.chart_of_accounts
      (tenant_id,account_code,account_name,account_type,category,parent_id,normal_balance,description,is_system,is_active)
    VALUES
      (${tenantId},'2104','Deposit Pelanggan','LIABILITY','ACCOUNT',${parent.id},'CREDIT','Refundable customer deposits, including Rental holds',TRUE,TRUE)
    ON CONFLICT (tenant_id,account_code) DO UPDATE SET
      account_name=EXCLUDED.account_name,
      account_type=EXCLUDED.account_type,
      category=EXCLUDED.category,
      parent_id=EXCLUDED.parent_id,
      normal_balance=EXCLUDED.normal_balance,
      description=EXCLUDED.description,
      is_active=TRUE,
      updated_at=NOW()
    RETURNING *
  `);
  return rows[0];
};

const requireAssetAccount = async (tx: Prisma.TransactionClient, tenantId: number, code: string) => {
  const account = await tx.chart_of_accounts.findFirst({
    where: { tenant_id: tenantId, account_code: code, is_active: true },
  });
  if (!account) throw rentalError(`Payment account ${code} is required`, 'RENTAL_DEPOSIT_PAYMENT_ACCOUNT_REQUIRED', 409);
  return account;
};

const appendDepositEvent = async (
  tx: Prisma.TransactionClient,
  input: { tenantId: number; bookingId: number; eventType: string; userId: number; payload: Record<string, unknown> },
) => {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.rental_events (tenant_id,booking_id,event_type,actor_user_id,payload)
    VALUES (${input.tenantId},${input.bookingId},${input.eventType},${input.userId},CAST(${JSON.stringify(input.payload)} AS jsonb))
  `);
};

export const holdRentalDeposit = async (
  tenantId: number,
  userId: number,
  bookingIdValue: unknown,
  input: { paymentMethod: string; referenceNumber?: string | null },
) => prisma.$transaction(async (tx) => {
  const bookingId = rentalPositiveInt(bookingIdValue, 'INVALID_RENTAL_BOOKING_ID');
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT * FROM public.rental_bookings
    WHERE id=${bookingId} AND tenant_id=${tenantId}
    FOR UPDATE
  `);
  const booking = rows[0];
  if (!booking) throw rentalError('Rental booking not found', 'RENTAL_BOOKING_NOT_FOUND', 404);

  const amount = Number(booking.deposit_amount || 0);
  if (amount <= 0) {
    if (String(booking.deposit_status) !== 'not_required') {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.rental_bookings SET deposit_status='not_required',updated_at=NOW()
        WHERE id=${bookingId} AND tenant_id=${tenantId}
      `);
    }
    return { bookingId, depositStatus: 'not_required', amount: 0, reused: true };
  }
  if (String(booking.deposit_status) === 'held') {
    const existing = await tx.journal_entries.findFirst({
      where: { tenant_id: tenantId, journal_number: `RD-${bookingId}-HOLD` },
    });
    return { bookingId, depositStatus: 'held', amount, journalId: existing?.id ?? null, reused: true };
  }
  if (String(booking.deposit_status) !== 'pending') {
    throw rentalError('Rental deposit is not pending', 'INVALID_RENTAL_DEPOSIT_STATE', 409);
  }
  if (!['reserved', 'confirmed'].includes(String(booking.status))) {
    throw rentalError('Deposit can only be held before pickup', 'INVALID_RENTAL_DEPOSIT_BOOKING_STATE', 409);
  }

  const payment = paymentAccountCode(input.paymentMethod);
  const asset = await requireAssetAccount(tx, tenantId, payment.code);
  const liability = await ensureDepositLiabilityAccount(tx, tenantId);
  const journalNumber = `RD-${bookingId}-HOLD`;
  const existingJournal = await tx.journal_entries.findFirst({
    where: { tenant_id: tenantId, journal_number: journalNumber },
  });
  if (existingJournal) {
    if (existingJournal.status === 'draft') await postJournalToLedgerTx(tx, existingJournal.id, tenantId, userId);
    await tx.$executeRaw(Prisma.sql`
      UPDATE public.rental_bookings SET deposit_status='held',updated_by=${userId},updated_at=NOW()
      WHERE id=${bookingId} AND tenant_id=${tenantId}
    `);
    return { bookingId, depositStatus: 'held', amount, journalId: existingJournal.id, reused: true };
  }

  const journal = await tx.journal_entries.create({
    data: {
      tenant_id: tenantId,
      outlet_id: Number(booking.outlet_id),
      journal_number: journalNumber,
      journal_type: 'receipt',
      transaction_date: new Date(),
      description: `Rental deposit hold ${booking.booking_number}`,
      reference_type: 'rental_deposit_hold',
      reference_id: bookingId,
      total_debit: amount,
      total_credit: amount,
      status: 'draft',
      created_by: userId,
      journal_entry_lines: {
        create: [
          { account_id: asset.id, description: `Rental deposit received via ${payment.method}`, debit_amount: amount, credit_amount: 0 },
          { account_id: liability.id, description: `Customer deposit liability ${booking.booking_number}`, debit_amount: 0, credit_amount: amount },
        ],
      },
    },
  });
  await postJournalToLedgerTx(tx, journal.id, tenantId, userId);
  await tx.$executeRaw(Prisma.sql`
    UPDATE public.rental_bookings SET deposit_status='held',updated_by=${userId},updated_at=NOW()
    WHERE id=${bookingId} AND tenant_id=${tenantId}
  `);
  await appendDepositEvent(tx, {
    tenantId,
    bookingId,
    eventType: 'deposit_held',
    userId,
    payload: { amount, paymentMethod: payment.method, referenceNumber: input.referenceNumber || null, journalId: journal.id },
  });
  return { bookingId, depositStatus: 'held', amount, journalId: journal.id, reused: false };
});

export const releaseRentalDeposit = async (
  tenantId: number,
  userId: number,
  bookingIdValue: unknown,
) => prisma.$transaction(async (tx) => {
  const bookingId = rentalPositiveInt(bookingIdValue, 'INVALID_RENTAL_BOOKING_ID');
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT * FROM public.rental_bookings
    WHERE id=${bookingId} AND tenant_id=${tenantId}
    FOR UPDATE
  `);
  const booking = rows[0];
  if (!booking) throw rentalError('Rental booking not found', 'RENTAL_BOOKING_NOT_FOUND', 404);
  const amount = Number(booking.deposit_amount || 0);
  if (amount <= 0 || String(booking.deposit_status) === 'not_required') {
    return { bookingId, depositStatus: 'not_required', amount: 0, reused: true };
  }
  if (String(booking.deposit_status) === 'released') {
    const existing = await tx.journal_entries.findFirst({ where: { tenant_id: tenantId, journal_number: `RD-${bookingId}-REL` } });
    return { bookingId, depositStatus: 'released', amount, journalId: existing?.id ?? null, reused: true };
  }
  if (String(booking.deposit_status) !== 'held') throw rentalError('Rental deposit is not held', 'INVALID_RENTAL_DEPOSIT_STATE', 409);
  if (!['returned', 'cancelled'].includes(String(booking.status))) {
    throw rentalError('Deposit can only be released after return or cancellation', 'INVALID_RENTAL_DEPOSIT_BOOKING_STATE', 409);
  }

  const holdJournal = await tx.journal_entries.findFirst({
    where: { tenant_id: tenantId, journal_number: `RD-${bookingId}-HOLD`, status: 'posted' },
    include: { journal_entry_lines: { include: { chart_of_accounts: true } } },
  });
  if (!holdJournal) throw rentalError('Posted rental deposit hold journal is required', 'RENTAL_DEPOSIT_HOLD_JOURNAL_REQUIRED', 409);
  const assetLine = holdJournal.journal_entry_lines.find((line) => Number(line.debit_amount || 0) > 0 && line.chart_of_accounts.normal_balance === 'DEBIT');
  if (!assetLine) throw rentalError('Rental deposit payment account could not be resolved', 'RENTAL_DEPOSIT_PAYMENT_ACCOUNT_REQUIRED', 409);
  const liability = await ensureDepositLiabilityAccount(tx, tenantId);

  const journalNumber = `RD-${bookingId}-REL`;
  const existingJournal = await tx.journal_entries.findFirst({ where: { tenant_id: tenantId, journal_number: journalNumber } });
  if (existingJournal) {
    if (existingJournal.status === 'draft') await postJournalToLedgerTx(tx, existingJournal.id, tenantId, userId);
    await tx.$executeRaw(Prisma.sql`
      UPDATE public.rental_bookings SET deposit_status='released',updated_by=${userId},updated_at=NOW()
      WHERE id=${bookingId} AND tenant_id=${tenantId}
    `);
    return { bookingId, depositStatus: 'released', amount, journalId: existingJournal.id, reused: true };
  }

  const journal = await tx.journal_entries.create({
    data: {
      tenant_id: tenantId,
      outlet_id: Number(booking.outlet_id),
      journal_number: journalNumber,
      journal_type: 'payment',
      transaction_date: new Date(),
      description: `Rental deposit release ${booking.booking_number}`,
      reference_type: 'rental_deposit_release',
      reference_id: bookingId,
      total_debit: amount,
      total_credit: amount,
      status: 'draft',
      created_by: userId,
      journal_entry_lines: {
        create: [
          { account_id: liability.id, description: `Release customer deposit liability ${booking.booking_number}`, debit_amount: amount, credit_amount: 0 },
          { account_id: assetLine.account_id, description: `Refund rental deposit ${booking.booking_number}`, debit_amount: 0, credit_amount: amount },
        ],
      },
    },
  });
  await postJournalToLedgerTx(tx, journal.id, tenantId, userId);
  await tx.$executeRaw(Prisma.sql`
    UPDATE public.rental_bookings SET deposit_status='released',updated_by=${userId},updated_at=NOW()
    WHERE id=${bookingId} AND tenant_id=${tenantId}
  `);
  await appendDepositEvent(tx, {
    tenantId,
    bookingId,
    eventType: 'deposit_released',
    userId,
    payload: { amount, journalId: journal.id, holdJournalId: holdJournal.id },
  });
  return { bookingId, depositStatus: 'released', amount, journalId: journal.id, reused: false };
});
