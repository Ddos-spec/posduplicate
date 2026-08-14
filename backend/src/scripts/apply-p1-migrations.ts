import fs from 'fs';
import path from 'path';
import { resolvePathWithin } from '../utils/pathSecurity';
import crypto from 'crypto';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const MIGRATIONS = [
  '20260121145000_create_trial_balance_view',
  '20260728135000_add_webhook_events',
  '20260812103000_p1_revenue_core',
  '20260812112000_p1_supply_chain_core',
  '20260812130000_p1_procurement_rfq',
  '20260812140000_p1_append_only_guards',
  '20260813023000_p2_workforce_attendance',
  '20260813030000_p2_payroll_rate_profiles',
  '20260813033000_p2_workforce_leave',
  '20260813040000_p2_recruitment_core',
  '20260813043000_p2_appraisals_core',
  '20260813050000_p2_services_project_core',
  '20260813054000_p2_field_service_core',
  '20260813060000_p2_helpdesk_core',
  '20260813063000_p2_appointments_core',
  '20260813070000_p2_payroll_current_profile',
  '20260813073000_p2_payroll_calculation_runs',
  '20260813080000_p2_payroll_final_reconciliation',
  '20260813083000_p2_payroll_official_posting',
  '20260815090000_harden_webhook_events',
] as const;

const ADVISORY_LOCK_KEY = 2026081201;
const WEBHOOK_BASELINE_MIGRATION = '20260728135000_add_webhook_events';
const WEBHOOK_BASELINE_COLUMNS: Record<string, {
  udtName: string;
  nullable: boolean;
  maximumLength?: number;
}> = {
  id: { udtName: 'int4', nullable: false },
  idempotency_key: { udtName: 'varchar', nullable: false, maximumLength: 255 },
  integration_type: { udtName: 'varchar', nullable: false, maximumLength: 50 },
  tenant_id: { udtName: 'int4', nullable: true },
  external_id: { udtName: 'varchar', nullable: false, maximumLength: 255 },
  event_status: { udtName: 'varchar', nullable: false, maximumLength: 20 },
  response_payload: { udtName: 'jsonb', nullable: true },
  created_at: { udtName: 'timestamptz', nullable: false },
  completed_at: { udtName: 'timestamptz', nullable: true },
  expires_at: { udtName: 'timestamptz', nullable: false },
};
const WEBHOOK_BASELINE_INDEXES: Record<string, {
  unique: boolean;
  columns: string[];
}> = {
  webhook_events_pkey: { unique: true, columns: ['id'] },
  webhook_events_idempotency_key_key: { unique: true, columns: ['idempotency_key'] },
  idx_webhook_events_tenant_type: { unique: false, columns: ['tenant_id', 'integration_type'] },
  idx_webhook_events_expires: { unique: false, columns: ['expires_at'] },
};

const sha256 = (content: string) => crypto.createHash('sha256').update(content).digest('hex');

const resolveMigrationFile = (migrationName: string) => {
  const candidates = [
    resolvePathWithin(path.resolve(process.cwd(), 'prisma', 'migrations'), migrationName, 'migration.sql'),
    resolvePathWithin(path.resolve(__dirname, '..', '..', 'prisma', 'migrations'), migrationName, 'migration.sql'),
    resolvePathWithin(path.resolve(__dirname, '..', '..', '..', 'prisma', 'migrations'), migrationName, 'migration.sql'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`Migration SQL not found for ${migrationName}. Checked: ${candidates.join(', ')}`);
  return found;
};

const ensureMigrationLedger = async (client: Client) => {
  await client.query(`CREATE TABLE IF NOT EXISTS public.suite_schema_migrations (migration_name VARCHAR(160) PRIMARY KEY, checksum_sha256 CHAR(64) NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), applied_by VARCHAR(120) NOT NULL DEFAULT 'suite-runner')`);
};

const adoptExistingWebhookBaseline = async (client: Client, migrationName: string, checksum: string) => {
  if (migrationName !== WEBHOOK_BASELINE_MIGRATION) return false;

  const table = await client.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'webhook_events'
  `);
  if (!table.rows[0]) return false;

  const columns = await client.query<{
    column_name: string;
    udt_name: string;
    is_nullable: 'YES' | 'NO';
    character_maximum_length: number | null;
  }>(`
    SELECT column_name, udt_name, is_nullable, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'webhook_events'
  `);
  const columnsByName = new Map(columns.rows.map((row) => [row.column_name, row]));
  const incompatibleColumns = Object.entries(WEBHOOK_BASELINE_COLUMNS).flatMap(([columnName, expected]) => {
    const actual = columnsByName.get(columnName);
    if (!actual) return [`${columnName}:missing`];
    const actualNullable = actual.is_nullable === 'YES';
    if (
      actual.udt_name !== expected.udtName
      || actualNullable !== expected.nullable
      || (expected.maximumLength !== undefined && actual.character_maximum_length !== expected.maximumLength)
    ) {
      return [`${columnName}:incompatible`];
    }
    return [];
  });

  const indexes = await client.query<{
    index_name: string;
    is_unique: boolean;
    indexed_columns: string[];
  }>(`
    SELECT
      index_class.relname AS index_name,
      index_meta.indisunique AS is_unique,
      ARRAY(
        SELECT attribute.attname
        FROM unnest(index_meta.indkey) WITH ORDINALITY AS indexed_key(attnum, ordinal_position)
        JOIN pg_catalog.pg_attribute AS attribute
          ON attribute.attrelid = table_class.oid AND attribute.attnum = indexed_key.attnum
        ORDER BY indexed_key.ordinal_position
      )::text[] AS indexed_columns
    FROM pg_catalog.pg_class AS table_class
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = table_class.relnamespace
    JOIN pg_catalog.pg_index AS index_meta ON index_meta.indrelid = table_class.oid
    JOIN pg_catalog.pg_class AS index_class ON index_class.oid = index_meta.indexrelid
    WHERE namespace.nspname = 'public' AND table_class.relname = 'webhook_events'
  `);
  const indexesByName = new Map(indexes.rows.map((row) => [row.index_name, row]));
  const incompatibleIndexes = Object.entries(WEBHOOK_BASELINE_INDEXES).flatMap(([indexName, expected]) => {
    const actual = indexesByName.get(indexName);
    if (!actual) return [`${indexName}:missing`];
    if (actual.is_unique !== expected.unique || actual.indexed_columns.join(',') !== expected.columns.join(',')) {
      return [`${indexName}:incompatible`];
    }
    return [];
  });

  if (incompatibleColumns.length > 0 || incompatibleIndexes.length > 0) {
    throw new Error(
      `Existing public.webhook_events is incompatible with ${migrationName}. `
      + `Column issues: ${incompatibleColumns.join(', ') || 'none'}; `
      + `index issues: ${incompatibleIndexes.join(', ') || 'none'}.`,
    );
  }

  await client.query(
    'INSERT INTO public.suite_schema_migrations (migration_name, checksum_sha256, applied_by) VALUES ($1, $2, $3)',
    [migrationName, checksum, 'suite-runner:verified-baseline'],
  );
  console.log(`[Suite migration] ${migrationName}: adopted verified existing baseline`);
  return true;
};

const applyMigration = async (client: Client, migrationName: string) => {
  const sql = fs.readFileSync(resolveMigrationFile(migrationName), 'utf8');
  const checksum = sha256(sql);
  const existing = await client.query<{ checksum_sha256: string }>('SELECT checksum_sha256 FROM public.suite_schema_migrations WHERE migration_name = $1 LIMIT 1', [migrationName]);
  if (existing.rows[0]) {
    if (existing.rows[0].checksum_sha256 !== checksum) throw new Error(`Applied migration ${migrationName} has checksum drift. Database=${existing.rows[0].checksum_sha256}, file=${checksum}. Never edit an applied suite migration; create a new forward migration instead.`);
    console.log(`[Suite migration] ${migrationName}: already applied`);
    return;
  }
  await client.query('BEGIN');
  try {
    if (await adoptExistingWebhookBaseline(client, migrationName, checksum)) {
      await client.query('COMMIT');
      return;
    }
    await client.query(sql);
    await client.query('INSERT INTO public.suite_schema_migrations (migration_name, checksum_sha256) VALUES ($1, $2)', [migrationName, checksum]);
    await client.query('COMMIT');
    console.log(`[Suite migration] ${migrationName}: applied`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

const run = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required to apply suite migrations');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  let lockAcquired = false;
  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    lockAcquired = true;
    await ensureMigrationLedger(client);
    for (const migrationName of MIGRATIONS) await applyMigration(client, migrationName);
    const applied = await client.query<{ migration_name: string; applied_at: Date }>('SELECT migration_name, applied_at FROM public.suite_schema_migrations WHERE migration_name = ANY($1::text[]) ORDER BY migration_name', [MIGRATIONS]);
    if (applied.rows.length !== MIGRATIONS.length) throw new Error(`Suite migration ledger incomplete: expected ${MIGRATIONS.length}, found ${applied.rows.length}`);
    console.log(`[Suite migration] complete: ${applied.rows.map((row) => row.migration_name).join(', ')}`);
  } finally {
    if (lockAcquired) await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => undefined);
    await client.end();
  }
};

run().catch((error) => { console.error('[Suite migration] failed', error); process.exit(1); });
