import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const MIGRATIONS = [
  '20260812103000_p1_revenue_core',
  '20260812112000_p1_supply_chain_core',
  '20260812130000_p1_procurement_rfq',
  '20260812140000_p1_append_only_guards',
  '20260813023000_p2_workforce_attendance',
  '20260813030000_p2_payroll_rate_profiles',
] as const;

const ADVISORY_LOCK_KEY = 2026081201;

const sha256 = (content: string) => crypto.createHash('sha256').update(content).digest('hex');

const resolveMigrationFile = (migrationName: string) => {
  const candidates = [
    path.resolve(process.cwd(), 'prisma', 'migrations', migrationName, 'migration.sql'),
    path.resolve(__dirname, '..', '..', 'prisma', 'migrations', migrationName, 'migration.sql'),
    path.resolve(__dirname, '..', '..', '..', 'prisma', 'migrations', migrationName, 'migration.sql'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`Migration SQL not found for ${migrationName}. Checked: ${candidates.join(', ')}`);
  return found;
};

const ensureMigrationLedger = async (client: Client) => {
  await client.query(`CREATE TABLE IF NOT EXISTS public.suite_schema_migrations (migration_name VARCHAR(160) PRIMARY KEY, checksum_sha256 CHAR(64) NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), applied_by VARCHAR(120) NOT NULL DEFAULT 'suite-runner')`);
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
