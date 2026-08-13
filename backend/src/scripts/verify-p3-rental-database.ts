import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const assert = (condition: unknown, message: string): asserts condition => { if (!condition) throw new Error(message); };

const run = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  assert(databaseUrl, 'DATABASE_URL is required');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const ledger = await client.query<{ checksum_sha256: string }>(
      `SELECT checksum_sha256 FROM public.p3_schema_migrations WHERE migration_name='20260813220000_p3_rental_core' LIMIT 1`,
    );
    assert(ledger.rows[0]?.checksum_sha256?.length === 64, 'Rental P3 migration ledger/checksum missing');

    const tables = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
        AND tablename IN ('rental_item_settings','rental_bookings','rental_booking_items','rental_events')
    `);
    assert(tables.rows.length === 4, 'Rental tables are incomplete');

    const bookingColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='rental_bookings'
        AND column_name IN ('tenant_id','outlet_id','customer_id','status','starts_at','ends_at','deposit_status','picked_up_at','returned_at','cancelled_at')
    `);
    assert(bookingColumns.rows.length === 10, 'Rental booking lifecycle/scope columns are incomplete');

    const references = await client.query<{ source_table: string; target_table: string }>(`
      SELECT tc.table_name AS source_table, ccu.table_name AS target_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name=tc.constraint_name AND ccu.constraint_schema=tc.constraint_schema
      WHERE tc.table_schema='public' AND tc.constraint_type='FOREIGN KEY'
        AND (
          (tc.table_name='rental_item_settings' AND ccu.table_name='items') OR
          (tc.table_name='rental_bookings' AND ccu.table_name='customers') OR
          (tc.table_name='rental_bookings' AND ccu.table_name='outlets') OR
          (tc.table_name='rental_booking_items' AND ccu.table_name='items')
        )
    `);
    const fkKeys = new Set(references.rows.map((row) => `${row.source_table}:${row.target_table}`));
    for (const key of ['rental_item_settings:items','rental_bookings:customers','rental_bookings:outlets','rental_booking_items:items']) {
      assert(fkKeys.has(key), `Rental source-of-truth FK missing: ${key}`);
    }

    const uniques = await client.query<{ constraint_name: string }>(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_schema='public' AND constraint_type='UNIQUE'
        AND constraint_name IN ('ux_rental_item_setting','ux_rental_booking_number','ux_rental_booking_item')
    `);
    assert(uniques.rows.length === 3, 'Rental uniqueness constraints are incomplete');

    const trigger = await client.query<{ tgname: string }>(`
      SELECT t.tgname FROM pg_trigger t
      JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='rental_events'
        AND t.tgname='trg_rental_events_immutable' AND NOT t.tgisinternal
    `);
    assert(trigger.rows.length === 1, 'Rental append-only event trigger missing');

    console.log('[P3 rental verifier] source-of-truth, lifecycle, uniqueness and append-only invariants verified');
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error('[P3 rental verifier] failed', error);
  process.exit(1);
});
