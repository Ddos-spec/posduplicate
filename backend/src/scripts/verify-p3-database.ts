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
      '20260813210000_p3_subscription_core',
    ];
    assert(ledger.rows.length >= requiredMigrations.length, `Expected at least ${requiredMigrations.length} P3 migration ledger entries, found ${ledger.rows.length}`);
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

    const subscriptionTables = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'subscription_plans','subscription_plan_items','customer_subscriptions',
          'customer_subscription_items','subscription_renewals','subscription_events'
        )
    `);
    assert(subscriptionTables.rows.length === 6, 'P3.3 subscription tables are incomplete');

    const subscriptionColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='customer_subscriptions'
        AND column_name IN ('tenant_id','outlet_id','customer_id','plan_id','status','next_renewal_at','current_period_start','current_period_end')
    `);
    assert(subscriptionColumns.rows.length === 8, 'Subscription lifecycle/scope columns are incomplete');

    const renewalColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='subscription_renewals'
        AND column_name IN ('tenant_id','subscription_id','period_start','period_end','sales_order_id','receivable_id','idempotency_key','status')
    `);
    assert(renewalColumns.rows.length === 8, 'Subscription renewal idempotency/materialization columns are incomplete');

    const reuseFks = await client.query<{ source_table: string; target_schema: string; target_table: string }>(`
      SELECT tc.table_name AS source_table, ccu.table_schema AS target_schema, ccu.table_name AS target_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name=tc.constraint_name AND ccu.constraint_schema=tc.constraint_schema
      WHERE tc.constraint_type='FOREIGN KEY'
        AND tc.table_schema='public'
        AND (
          (tc.table_name='subscription_plan_items' AND ccu.table_schema='public' AND ccu.table_name='items') OR
          (tc.table_name='customer_subscriptions' AND ccu.table_schema='public' AND ccu.table_name='customers') OR
          (tc.table_name='subscription_renewals' AND ccu.table_schema='public' AND ccu.table_name='sales_orders') OR
          (tc.table_name='subscription_renewals' AND ccu.table_schema='accounting' AND ccu.table_name='accounts_receivable')
        )
    `);
    const fkKeys = new Set(reuseFks.rows.map((row) => `${row.source_table}:${row.target_schema}.${row.target_table}`));
    for (const key of [
      'subscription_plan_items:public.items',
      'customer_subscriptions:public.customers',
      'subscription_renewals:public.sales_orders',
      'subscription_renewals:accounting.accounts_receivable',
    ]) assert(fkKeys.has(key), `Subscription source-of-truth FK missing: ${key}`);

    const renewalUnique = await client.query<{ constraint_name: string }>(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_schema='public' AND table_name='subscription_renewals'
        AND constraint_type='UNIQUE' AND constraint_name IN ('ux_subscription_renewal_period','ux_subscription_renewal_key')
    `);
    assert(renewalUnique.rows.length === 2, 'Subscription renewal idempotency constraints are incomplete');

    const immutableTrigger = await client.query<{ tgname: string }>(`
      SELECT tgname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='subscription_events'
        AND t.tgname='trg_subscription_events_immutable' AND NOT t.tgisinternal
    `);
    assert(immutableTrigger.rows.length === 1, 'Subscription event ledger immutability trigger missing');

    console.log('[P3 database verifier] website/CMS + eCommerce + subscription source-of-truth invariants verified');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('[P3 database verifier] failed', error);
  process.exit(1);
});
