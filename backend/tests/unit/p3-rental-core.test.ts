import fs from 'fs';
import path from 'path';
import { rentalDurationUnits } from '../../src/modules/fnb/services/rental-availability.p3.service';

const read = (relative: string) => fs.readFileSync(path.resolve(__dirname, '..', '..', relative), 'utf8');

describe('P3.4 rental duration behavior', () => {
  test('rounds partial billing units upward', () => {
    const start = new Date('2026-08-14T00:00:00.000Z');
    expect(rentalDurationUnits(start, new Date('2026-08-14T00:01:00.000Z'), 'hour')).toBe(1);
    expect(rentalDurationUnits(start, new Date('2026-08-14T01:01:00.000Z'), 'hour')).toBe(2);
    expect(rentalDurationUnits(start, new Date('2026-08-15T00:01:00.000Z'), 'day')).toBe(2);
    expect(rentalDurationUnits(start, new Date('2026-08-21T00:01:00.000Z'), 'week')).toBe(2);
  });

  test('rejects zero and negative periods', () => {
    const start = new Date('2026-08-14T00:00:00.000Z');
    expect(() => rentalDurationUnits(start, start, 'day')).toThrow('Rental end must be after start');
    expect(() => rentalDurationUnits(start, new Date('2026-08-13T23:59:59.000Z'), 'day')).toThrow('Rental end must be after start');
  });
});

describe('P3.4 rental integrity contracts', () => {
  const availability = read('src/modules/fnb/services/rental-availability.p3.service.ts');
  const booking = read('src/modules/fnb/services/rental-booking.p3.service.ts');
  const deposit = read('src/modules/fnb/services/rental-deposit.p3.service.ts');
  const coreMigration = read('prisma/migrations/20260813220000_p3_rental_core/migration.sql');
  const inventoryGuardMigration = read('prisma/migrations/20260813220500_p3_rental_inventory_guard/migration.sql');
  const migrationRunner = read('src/scripts/apply-p3-migrations.ts');
  const verifier = read('src/scripts/verify-p3-database.ts');

  test('serializes booking capacity decisions and counts committed overlaps', () => {
    expect(availability).toContain('FOR UPDATE OF s');
    expect(booking).toContain('lockRentalSetting(tx, tenantId, outletId, requested.itemId)');
    expect(availability).toContain("b.status IN ('reserved','confirmed','picked_up')");
    expect(availability).toContain('bufferMinutes');
  });

  test('future booking never decrements physical stock directly', () => {
    expect(booking).not.toContain('UPDATE public.items SET stock');
    expect(booking).not.toContain('stock: { decrement');
    expect(coreMigration).toContain('Physical stock is not decremented merely because a future interval is reserved.');
  });

  test('protects committed capacity at the database item boundary', () => {
    expect(inventoryGuardMigration).toContain('trg_protect_rental_item_commitments');
    expect(inventoryGuardMigration).toContain('BEFORE UPDATE OF stock, outlet_id, track_stock, is_active ON public.items');
    expect(inventoryGuardMigration).toContain("b.status IN ('reserved','confirmed','picked_up')");
    expect(inventoryGuardMigration).toContain('MAX(load)');
    expect(migrationRunner).toContain("'20260813220500_p3_rental_inventory_guard'");
    expect(verifier).toContain('trg_protect_rental_item_commitments');
  });

  test('keeps lifecycle audit append-only', () => {
    expect(coreMigration).toContain('trg_rental_events_immutable');
    expect(coreMigration).toContain("RAISE EXCEPTION 'rental_events is append-only'");
    expect(booking).toContain('INSERT INTO public.rental_events');
  });

  test('treats refundable deposit as liability with deterministic journals', () => {
    expect(deposit).toContain("account_code: '2104'");
    expect(deposit).toContain("'Deposit Pelanggan'");
    expect(deposit).toContain('RD-${bookingId}-HOLD');
    expect(deposit).toContain('RD-${bookingId}-REL');
    expect(deposit).toContain('postJournalToLedgerTx');
    expect(deposit).toContain("deposit_status='held'");
    expect(deposit).toContain("deposit_status='released'");
  });

  test('requires held deposit before pickup when deposit is configured', () => {
    expect(booking).toContain("target === 'picked_up'");
    expect(booking).toContain("String(booking.deposit_status) !== 'held'");
    expect(booking).toContain('RENTAL_DEPOSIT_REQUIRED_BEFORE_PICKUP');
  });
});
