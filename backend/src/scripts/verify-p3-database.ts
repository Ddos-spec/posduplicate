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
    const requiredMigrations = [
      '20260813090000_p3_website_commerce_core',
      '20260813100000_p3_ecommerce_order_core',
      '20260813101000_p3_ecommerce_reservation_snapshot',
    ];
    assert(ledger.rows.length >= 3, `Expected at least 3 P3 migration ledger entries, found ${ledger.rows.length}`);
    for (const required of requiredMigrations) {
      const found = ledger.rows.find((r) => r.migration_name === required);
      assert(found, `P3 migration ${required} missing`);
      assert(found.checksum_sha256?.length === 64, `P3 migration ${required} checksum invalid`);
    }

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

    const ecommerceTables = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('ecommerce_orders','ecommerce_order_items','ecommerce_order_events')
    `);
    assert(ecommerceTables.rows.length === 3, 'P3.2 eCommerce tables are incomplete');

    const orderColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ecommerce_orders'
        AND column_name IN ('tenant_id','id','status','cancelled_at')
    `);
    assert(orderColumns.rows.length === 4, 'eCommerce order lifecycle columns are incomplete');

    const itemColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ecommerce_order_items'
        AND column_name IN ('tenant_id','order_id','reserved_stock_quantity','quantity')
    `);
    assert(itemColumns.rows.length === 4, 'eCommerce order item reservation columns are incomplete');

    const eventColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ecommerce_order_events'
        AND column_name IN ('tenant_id','order_id','event_type','actor_user_id')
    `);
    assert(eventColumns.rows.length === 4, 'eCommerce order event lifecycle columns are incomplete');

    console.log('[P3 database verifier] website/CMS + storefront catalog + eCommerce order invariants verified');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('[P3 database verifier] failed', error);
  process.exit(1);
});
