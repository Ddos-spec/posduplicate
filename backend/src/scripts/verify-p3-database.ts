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
      '20260813213000_p3_subscription_automation',
      '20260813220000_p3_rental_core',
      '20260813220500_p3_rental_inventory_guard',
      '20260813230000_p3_marketing_engagement_core',
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

    const rentalTables = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
        AND tablename IN ('rental_item_settings','rental_bookings','rental_booking_items','rental_events')
    `);
    assert(rentalTables.rows.length === 4, 'P3.4 rental tables are incomplete');

    const rentalBookingColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='rental_bookings'
        AND column_name IN ('tenant_id','outlet_id','customer_id','status','starts_at','ends_at','deposit_status','picked_up_at','returned_at','cancelled_at')
    `);
    assert(rentalBookingColumns.rows.length === 10, 'Rental booking lifecycle/scope columns are incomplete');

    const rentalReferences = await client.query<{ source_table: string; target_table: string }>(`
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
    const rentalFkKeys = new Set(rentalReferences.rows.map((row) => `${row.source_table}:${row.target_table}`));
    for (const key of ['rental_item_settings:items','rental_bookings:customers','rental_bookings:outlets','rental_booking_items:items']) {
      assert(rentalFkKeys.has(key), `Rental source-of-truth FK missing: ${key}`);
    }

    const rentalUniques = await client.query<{ constraint_name: string }>(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_schema='public' AND constraint_type='UNIQUE'
        AND constraint_name IN ('ux_rental_item_setting','ux_rental_booking_number','ux_rental_booking_item')
    `);
    assert(rentalUniques.rows.length === 3, 'Rental uniqueness constraints are incomplete');

    const rentalImmutableTrigger = await client.query<{ tgname: string }>(`
      SELECT t.tgname FROM pg_trigger t
      JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='rental_events'
        AND t.tgname='trg_rental_events_immutable' AND NOT t.tgisinternal
    `);
    assert(rentalImmutableTrigger.rows.length === 1, 'Rental append-only event trigger missing');

    const rentalInventoryTrigger = await client.query<{ tgname: string }>(`
      SELECT t.tgname FROM pg_trigger t
      JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='items'
        AND t.tgname='trg_protect_rental_item_commitments' AND NOT t.tgisinternal
    `);
    assert(rentalInventoryTrigger.rows.length === 1, 'Rental inventory commitment trigger missing');

    const marketingTables = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
        AND tablename IN (
          'marketing_journeys','marketing_journey_steps','marketing_events',
          'marketing_event_registrations','marketing_surveys','marketing_survey_questions',
          'marketing_survey_responses','marketing_survey_answers','marketing_engagement_events'
        )
    `);
    assert(marketingTables.rows.length === 9, 'P3.5 marketing engagement tables are incomplete');

    const marketingEventColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='marketing_events'
        AND column_name IN ('tenant_id','slug','status','starts_at','ends_at','capacity','registration_open')
    `);
    assert(marketingEventColumns.rows.length === 7, 'Marketing event lifecycle/capacity columns are incomplete');

    const marketingSurveyColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='marketing_survey_responses'
        AND column_name IN ('tenant_id','survey_id','customer_id','status','started_at','submitted_at')
    `);
    assert(marketingSurveyColumns.rows.length === 6, 'Marketing survey response scope/lifecycle columns are incomplete');

    const marketingCustomerFks = await client.query<{ source_table: string; target_table: string }>(`
      SELECT tc.table_name AS source_table, ccu.table_name AS target_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name=tc.constraint_name AND ccu.constraint_schema=tc.constraint_schema
      WHERE tc.table_schema='public' AND tc.constraint_type='FOREIGN KEY'
        AND ccu.table_schema='public' AND ccu.table_name='customers'
        AND tc.table_name IN ('marketing_event_registrations','marketing_survey_responses','marketing_engagement_events')
    `);
    const marketingCustomerFkKeys = new Set(marketingCustomerFks.rows.map((row) => `${row.source_table}:${row.target_table}`));
    for (const key of [
      'marketing_event_registrations:customers',
      'marketing_survey_responses:customers',
      'marketing_engagement_events:customers',
    ]) assert(marketingCustomerFkKeys.has(key), `Marketing source-of-truth FK missing: ${key}`);

    const marketingImmutableTrigger = await client.query<{ tgname: string }>(`
      SELECT t.tgname FROM pg_trigger t
      JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='marketing_engagement_events'
        AND t.tgname='trg_marketing_engagement_events_immutable' AND NOT t.tgisinternal
    `);
    assert(marketingImmutableTrigger.rows.length === 1, 'Marketing engagement append-only event trigger missing');

    console.log('[P3 database verifier] website/CMS + eCommerce + subscription + rental + marketing engagement source-of-truth/inventory/audit invariants verified');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('[P3 database verifier] failed', error);
  process.exit(1);
});
