import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_TABLES = [
  'crm_opportunities',
  'sales_quotations',
  'sales_orders',
  'loyalty_ledger',
  'warehouse_locations',
  'warehouse_stock_ledger',
  'stock_transfers',
  'stock_counts',
  'barcode_aliases',
  'manufacturing_orders',
  'quality_checks',
  'maintenance_requests',
  'purchase_rfqs',
  'purchase_rfq_items',
  'purchase_rfq_suppliers',
  'purchase_rfq_supplier_items',
  'procurement_event_ledger',
] as const;

const REQUIRED_TRIGGERS = [
  'trg_loyalty_ledger_append_only',
  'trg_warehouse_stock_ledger_append_only',
  'trg_procurement_event_ledger_append_only',
] as const;

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

const expectMutationBlocked = async (client: Client, sql: string, label: string) => {
  try {
    await client.query(sql);
    throw new Error(`${label}: mutation unexpectedly succeeded`);
  } catch (error: any) {
    if (String(error?.message || '').includes('unexpectedly succeeded')) throw error;
    assert(error?.code === '55000', `${label}: expected SQLSTATE 55000, got ${error?.code || 'unknown'} (${error?.message || error})`);
  }
};

const run = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  assert(databaseUrl, 'DATABASE_URL is required');

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const tables = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
      [REQUIRED_TABLES]
    );
    const existingTables = new Set(tables.rows.map((row) => row.tablename));
    const missingTables = REQUIRED_TABLES.filter((table) => !existingTables.has(table));
    assert(missingTables.length === 0, `Missing P1 tables: ${missingTables.join(', ')}`);

    const migrationLedger = await client.query<{ migration_name: string; checksum_sha256: string }>(
      `SELECT migration_name, checksum_sha256 FROM public.suite_schema_migrations ORDER BY migration_name`
    );
    assert(migrationLedger.rows.length === 4, `Expected 4 P1 migration ledger entries, found ${migrationLedger.rows.length}`);
    assert(migrationLedger.rows.every((row) => row.checksum_sha256?.length === 64), 'Migration ledger contains invalid checksum');

    const triggers = await client.query<{ tgname: string }>(
      `SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY($1::text[])`,
      [REQUIRED_TRIGGERS]
    );
    const existingTriggers = new Set(triggers.rows.map((row) => row.tgname));
    const missingTriggers = REQUIRED_TRIGGERS.filter((trigger) => !existingTriggers.has(trigger));
    assert(missingTriggers.length === 0, `Missing append-only triggers: ${missingTriggers.join(', ')}`);

    await client.query('BEGIN');
    try {
      const wallet = await client.query<{ id: number }>(`
        INSERT INTO public.loyalty_wallets (tenant_id, customer_id, points_balance)
        VALUES (999001, 999001, 10)
        RETURNING id
      `);
      const loyalty = await client.query<{ id: number }>(`
        INSERT INTO public.loyalty_ledger
          (tenant_id, customer_id, wallet_id, entry_type, points_delta, reason)
        VALUES (999001, 999001, $1, 'adjustment', 10, 'P1 immutable trigger verification')
        RETURNING id
      `, [wallet.rows[0].id]);

      const location = await client.query<{ id: number }>(`
        INSERT INTO public.warehouse_locations (tenant_id, outlet_id, code, name, location_type)
        VALUES (999001, 999001, 'VERIFY', 'P1 Verify Location', 'stock')
        ON CONFLICT (tenant_id, outlet_id, code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `);
      const warehouseLedger = await client.query<{ id: number }>(`
        INSERT INTO public.warehouse_stock_ledger
          (tenant_id, outlet_id, location_id, inventory_id, entry_type, quantity_delta, balance_before, balance_after, reference_type, reference_id, notes)
        VALUES (999001, 999001, $1, 999001, 'manual_adjustment', 1, 0, 1, 'verification', 'verify', 'P1 immutable trigger verification')
        RETURNING id
      `, [location.rows[0].id]);

      const procurement = await client.query<{ id: number }>(`
        INSERT INTO public.procurement_event_ledger
          (tenant_id, outlet_id, event_type, reference_type, reference_id, payload)
        VALUES (999001, 999001, 'verification', 'verification', 'verify', '{}'::jsonb)
        RETURNING id
      `);

      await expectMutationBlocked(client, `UPDATE public.loyalty_ledger SET reason = 'tamper' WHERE id = ${Number(loyalty.rows[0].id)}`, 'loyalty UPDATE');
      await expectMutationBlocked(client, `DELETE FROM public.loyalty_ledger WHERE id = ${Number(loyalty.rows[0].id)}`, 'loyalty DELETE');
      await expectMutationBlocked(client, `UPDATE public.warehouse_stock_ledger SET notes = 'tamper' WHERE id = ${Number(warehouseLedger.rows[0].id)}`, 'warehouse UPDATE');
      await expectMutationBlocked(client, `DELETE FROM public.warehouse_stock_ledger WHERE id = ${Number(warehouseLedger.rows[0].id)}`, 'warehouse DELETE');
      await expectMutationBlocked(client, `UPDATE public.procurement_event_ledger SET event_type = 'tamper' WHERE id = ${Number(procurement.rows[0].id)}`, 'procurement UPDATE');
      await expectMutationBlocked(client, `DELETE FROM public.procurement_event_ledger WHERE id = ${Number(procurement.rows[0].id)}`, 'procurement DELETE');

      await client.query('ROLLBACK');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    console.log(`P1 database verification passed: ${REQUIRED_TABLES.length} tables, ${migrationLedger.rows.length} migrations, ${REQUIRED_TRIGGERS.length} immutable triggers.`);
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error('[P1 database verification] failed', error);
  process.exit(1);
});
