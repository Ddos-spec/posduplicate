import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  assert(databaseUrl, 'DATABASE_URL is required');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const ledger = await client.query<{ migration_name: string; checksum_sha256: string }>(
      'SELECT migration_name, checksum_sha256 FROM public.p3_schema_migrations ORDER BY migration_name',
    );
    assert(ledger.rows.length >= 1, `Expected at least 1 P3 migration ledger entry, found ${ledger.rows.length}`);
    assert(ledger.rows[0]?.migration_name === '20260813090000_p3_website_commerce_core', 'P3 website migration missing');
    assert(ledger.rows[0]?.checksum_sha256?.length === 64, 'P3 migration checksum invalid');

    const tables = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('website_sites','website_pages','web_catalog_items')
    `);
    assert(tables.rows.length === 3, 'P3 website/catalog tables are incomplete');

    const indexes = await client.query<{ indexname: string }>(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN (
          'ux_website_site_public_slug','idx_website_site_scope','idx_website_page_scope',
          'idx_web_catalog_scope','idx_web_catalog_item'
        )
    `);
    assert(indexes.rows.length === 5, 'P3 website/catalog indexes are incomplete');

    const catalogItemFk = await client.query<{ constraint_name: string }>(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'web_catalog_items'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'public'
        AND ccu.table_name = 'items'
        AND ccu.column_name = 'id'
    `);
    assert(catalogItemFk.rows.length >= 1, 'Storefront catalog must reuse public.items');

    const pageColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'website_pages'
        AND column_name IN ('tenant_id','site_id','slug','status','content','published_at')
    `);
    assert(pageColumns.rows.length === 6, 'CMS page lifecycle/content columns are incomplete');

    console.log('[P3 database verifier] website/CMS + storefront catalog invariants verified');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('[P3 database verifier] failed', error);
  process.exit(1);
});
