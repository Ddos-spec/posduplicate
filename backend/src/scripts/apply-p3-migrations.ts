import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const MIGRATIONS = [
  '20260813090000_p3_website_commerce_core',
  '20260813100000_p3_ecommerce_order_core',
  '20260813101000_p3_ecommerce_reservation_snapshot',
  '20260813210000_p3_subscription_core',
  '20260813213000_p3_subscription_automation',
  '20260813220000_p3_rental_core',
  '20260813220500_p3_rental_inventory_guard',
  '20260813230000_p3_marketing_engagement_core',
  '20260813231000_p3_marketing_public_idempotency',
  '20260813240000_p3_productivity_docs_knowledge_sign_core',
  '20260813241000_p3_productivity_sign_version_guard',
  '20260813250000_p3_learning_community_core',
  '20260813251000_p3_learning_community_scope_guard',
  '20260813252000_p3_learning_community_public_access',
  '20260813253000_p3_learning_customer_scope_guard',
  '20260814123000_p3_studio_config',
  '20260814130000_p4_intelligence_actions',
  '20260814133000_zernio_webhook_receipts',
] as const;

const ADVISORY_LOCK_KEY = 2026081303;
const sha256 = (content: string) => crypto.createHash('sha256').update(content).digest('hex');
const checksumCandidates = (content: string) => {
  const lf = content.replace(/\r\n/g, '\n');
  const singleTerminalNewline = `${lf.replace(/\n*$/, '')}\n`;
  return new Set([
    sha256(content),
    sha256(lf),
    sha256(singleTerminalNewline),
    sha256(`${singleTerminalNewline}\n`),
  ]);
};

const resolveMigrationFile = (migrationName: string) => {
  const candidates = [
    path.resolve(process.cwd(), 'prisma', 'migrations', migrationName, 'migration.sql'),
    path.resolve(__dirname, '..', '..', 'prisma', 'migrations', migrationName, 'migration.sql'),
    path.resolve(__dirname, '..', '..', '..', 'prisma', 'migrations', migrationName, 'migration.sql'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`P3 migration SQL not found for ${migrationName}. Checked: ${candidates.join(', ')}`);
  return found;
};

const ensureLedger = async (client: Client) => {
  await client.query(`CREATE TABLE IF NOT EXISTS public.p3_schema_migrations (
    migration_name VARCHAR(160) PRIMARY KEY,
    checksum_sha256 CHAR(64) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_by VARCHAR(120) NOT NULL DEFAULT 'p3-runner'
  )`);
};

const applyMigration = async (client: Client, migrationName: string) => {
  const sql = fs.readFileSync(resolveMigrationFile(migrationName), 'utf8');
  const checksum = sha256(sql);
  const existing = await client.query<{ checksum_sha256: string }>(
    'SELECT checksum_sha256 FROM public.p3_schema_migrations WHERE migration_name = $1 LIMIT 1',
    [migrationName],
  );
  if (existing.rows[0]) {
    if (!checksumCandidates(sql).has(existing.rows[0].checksum_sha256)) {
      throw new Error(`Applied P3 migration ${migrationName} has checksum drift. Create a forward migration instead.`);
    }
    const suffix = existing.rows[0].checksum_sha256 === checksum ? '' : ' (formatting-equivalent checksum)';
    console.log(`[P3 migration] ${migrationName}: already applied${suffix}`);
    return;
  }

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO public.p3_schema_migrations (migration_name, checksum_sha256) VALUES ($1, $2)',
      [migrationName, checksum],
    );
    await client.query('COMMIT');
    console.log(`[P3 migration] ${migrationName}: applied`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

const run = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required to apply P3 migrations');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  let locked = false;
  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    locked = true;
    await ensureLedger(client);
    for (const migration of MIGRATIONS) await applyMigration(client, migration);
    const applied = await client.query<{ migration_name: string }>(
      'SELECT migration_name FROM public.p3_schema_migrations WHERE migration_name = ANY($1::text[]) ORDER BY migration_name',
      [MIGRATIONS],
    );
    if (applied.rows.length !== MIGRATIONS.length) {
      throw new Error(`P3 migration ledger incomplete: expected ${MIGRATIONS.length}, found ${applied.rows.length}`);
    }
    console.log(`[P3 migration] complete: ${applied.rows.map((row) => row.migration_name).join(', ')}`);
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => undefined);
    await client.end();
  }
};

run().catch((error) => {
  console.error('[P3 migration] failed', error);
  process.exit(1);
});
