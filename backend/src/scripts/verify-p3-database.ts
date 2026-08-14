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
      '20260813231000_p3_marketing_public_idempotency',
      '20260813240000_p3_productivity_docs_knowledge_sign_core',
      '20260813241000_p3_productivity_sign_version_guard',
      '20260813250000_p3_learning_community_core',
      '20260813251000_p3_learning_community_scope_guard',
      '20260813252000_p3_learning_community_public_access',
      '20260813253000_p3_learning_customer_scope_guard',
      '20260814123000_p3_studio_config',
      '20260814130000_p4_intelligence_actions',
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

    const marketingRetryColumns = await client.query<{ table_name: string; column_name: string }>(`
      SELECT table_name,column_name FROM information_schema.columns
      WHERE table_schema='public' AND column_name='submission_key_hash'
        AND table_name IN ('marketing_event_registrations','marketing_survey_responses')
    `);
    const marketingRetryColumnKeys = new Set(marketingRetryColumns.rows.map((row) => `${row.table_name}:${row.column_name}`));
    for (const key of [
      'marketing_event_registrations:submission_key_hash',
      'marketing_survey_responses:submission_key_hash',
    ]) assert(marketingRetryColumnKeys.has(key), `Marketing public retry column missing: ${key}`);

    const marketingRetryIndexes = await client.query<{ indexname: string; indexdef: string }>(`
      SELECT indexname,indexdef FROM pg_indexes
      WHERE schemaname='public' AND indexname IN (
        'ux_marketing_event_registration_submission_key',
        'ux_marketing_survey_response_submission_key'
      )
    `);
    assert(marketingRetryIndexes.rows.length === 2, 'Marketing public retry unique indexes are incomplete');
    for (const row of marketingRetryIndexes.rows) {
      assert(row.indexdef.includes('CREATE UNIQUE INDEX'), `Marketing public retry index ${row.indexname} must be unique`);
      assert(row.indexdef.includes('submission_key_hash'), `Marketing public retry index ${row.indexname} must key submission hash`);
      assert(row.indexdef.includes('WHERE'), `Marketing public retry index ${row.indexname} must remain partial`);
    }

    const productivityTables = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
        AND tablename IN (
          'document_folders','business_documents','business_document_versions','business_document_acl',
          'knowledge_spaces','knowledge_articles','knowledge_article_versions',
          'signature_requests','signature_recipients','productivity_events'
        )
    `);
    assert(productivityTables.rows.length === 10, 'P3.6 productivity tables are incomplete');

    const documentVersionColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='business_document_versions'
        AND column_name IN ('tenant_id','document_id','version_no','storage_key','original_name','mime_type','size_bytes','sha256','created_by','created_at')
    `);
    assert(documentVersionColumns.rows.length === 10, 'Private document version metadata/hash columns are incomplete');

    const knowledgeVersionColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='knowledge_article_versions'
        AND column_name IN ('tenant_id','article_id','version_no','content','summary','created_by','created_at')
    `);
    assert(knowledgeVersionColumns.rows.length === 7, 'Knowledge immutable revision columns are incomplete');

    const signatureRequestColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='signature_requests'
        AND column_name IN ('tenant_id','document_id','document_version_id','status','expires_at','sent_at','completed_at','cancelled_at')
    `);
    assert(signatureRequestColumns.rows.length === 8, 'Signature request version/lifecycle columns are incomplete');

    const signatureRecipientColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='signature_recipients'
        AND column_name IN ('tenant_id','request_id','signing_order','status','access_token_hash','signature_type','signature_name','signature_evidence_hash','consent_text','signed_at','declined_at')
    `);
    assert(signatureRecipientColumns.rows.length === 11, 'Signature recipient token/evidence columns are incomplete');

    const productivityImmutableTriggers = await client.query<{ tgname: string }>(`
      SELECT t.tgname FROM pg_trigger t
      JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND NOT t.tgisinternal
        AND t.tgname IN (
          'trg_business_document_versions_immutable',
          'trg_knowledge_article_versions_immutable',
          'trg_productivity_events_immutable'
        )
    `);
    assert(productivityImmutableTriggers.rows.length === 3, 'Productivity immutable version/audit triggers are incomplete');

    const signVersionFk = await client.query<{
      conname: string;
      source_columns: string;
      target_schema: string;
      target_table: string;
      target_columns: string;
    }>(`
      SELECT c.conname,
             string_agg(sa.attname::text, ',' ORDER BY src.ord) AS source_columns,
             tn.nspname AS target_schema,
             tc.relname AS target_table,
             string_agg(ta.attname::text, ',' ORDER BY src.ord) AS target_columns
      FROM pg_constraint c
      JOIN pg_class sc ON sc.oid=c.conrelid
      JOIN pg_namespace sn ON sn.oid=sc.relnamespace
      JOIN pg_class tc ON tc.oid=c.confrelid
      JOIN pg_namespace tn ON tn.oid=tc.relnamespace
      CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS src(attnum,ord)
      JOIN LATERAL unnest(c.confkey) WITH ORDINALITY AS tgt(attnum,ord) ON tgt.ord=src.ord
      JOIN pg_attribute sa ON sa.attrelid=sc.oid AND sa.attnum=src.attnum
      JOIN pg_attribute ta ON ta.attrelid=tc.oid AND ta.attnum=tgt.attnum
      WHERE sn.nspname='public'
        AND sc.relname='signature_requests'
        AND c.contype='f'
        AND c.conname='fk_signature_request_exact_document_version'
      GROUP BY c.conname,tn.nspname,tc.relname
    `);
    assert(signVersionFk.rows.length === 1, 'Signature request exact-version FK missing');
    const signVersionConstraint = signVersionFk.rows[0];
    assert(
      signVersionConstraint.target_schema === 'public' &&
      signVersionConstraint.target_table === 'business_document_versions' &&
      signVersionConstraint.source_columns === 'tenant_id,document_version_id,document_id' &&
      signVersionConstraint.target_columns === 'tenant_id,id,document_id',
      'Signature request must be pinned by FK to exact tenant/document/version tuple',
    );

    const learningCommunityTables = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
        AND tablename IN (
          'learning_courses','learning_lessons','learning_assessments','learning_assessment_questions',
          'learning_enrollments','learning_progress','learning_attempts','learning_attempt_answers',
          'learning_certificates','learning_events','community_forums','community_topics',
          'community_replies','community_votes','community_events'
        )
    `);
    assert(learningCommunityTables.rows.length === 15, 'P3.7 learning/community tables are incomplete');

    const learningScopeColumns = await client.query<{ table_name: string; column_name: string }>(`
      SELECT table_name,column_name FROM information_schema.columns
      WHERE table_schema='public' AND (
        (table_name='learning_courses' AND column_name IN ('tenant_id','site_id','status','visibility','created_by')) OR
        (table_name='learning_progress' AND column_name IN ('tenant_id','course_id','enrollment_id','lesson_id')) OR
        (table_name='learning_attempts' AND column_name IN ('tenant_id','course_id','enrollment_id','assessment_id')) OR
        (table_name='learning_attempt_answers' AND column_name IN ('tenant_id','assessment_id','attempt_id','question_id')) OR
        (table_name='community_forums' AND column_name IN ('tenant_id','site_id','status','visibility','created_by'))
      )
    `);
    const learningScopeColumnKeys = new Set(
      learningScopeColumns.rows.map((row) => `${row.table_name}:${row.column_name}`),
    );
    for (const key of [
      'learning_courses:tenant_id','learning_courses:site_id','learning_courses:status',
      'learning_courses:visibility','learning_courses:created_by',
      'learning_progress:tenant_id','learning_progress:course_id',
      'learning_progress:enrollment_id','learning_progress:lesson_id',
      'learning_attempts:tenant_id','learning_attempts:course_id',
      'learning_attempts:enrollment_id','learning_attempts:assessment_id',
      'learning_attempt_answers:tenant_id','learning_attempt_answers:assessment_id',
      'learning_attempt_answers:attempt_id','learning_attempt_answers:question_id',
      'community_forums:tenant_id','community_forums:site_id','community_forums:status',
      'community_forums:visibility','community_forums:created_by',
    ]) assert(learningScopeColumnKeys.has(key), `Learning/community scope column missing: ${key}`);

    const learningSiteScopeFks = await client.query<{
      conname: string;
      source_table: string;
      source_columns: string;
      target_table: string;
      target_columns: string;
      delete_action: string;
    }>(`
      SELECT c.conname,
             sc.relname AS source_table,
             string_agg(sa.attname::text, ',' ORDER BY src.ord) AS source_columns,
             tc.relname AS target_table,
             string_agg(ta.attname::text, ',' ORDER BY src.ord) AS target_columns,
             c.confdeltype::text AS delete_action
      FROM pg_constraint c
      JOIN pg_class sc ON sc.oid=c.conrelid
      JOIN pg_namespace sn ON sn.oid=sc.relnamespace
      JOIN pg_class tc ON tc.oid=c.confrelid
      JOIN pg_namespace tn ON tn.oid=tc.relnamespace
      CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS src(attnum,ord)
      JOIN LATERAL unnest(c.confkey) WITH ORDINALITY AS tgt(attnum,ord) ON tgt.ord=src.ord
      JOIN pg_attribute sa ON sa.attrelid=sc.oid AND sa.attnum=src.attnum
      JOIN pg_attribute ta ON ta.attrelid=tc.oid AND ta.attnum=tgt.attnum
      WHERE sn.nspname='public' AND tn.nspname='public' AND c.contype='f'
        AND c.conname IN ('fk_learning_course_site_scope','fk_community_forum_site_scope')
      GROUP BY c.conname,sc.relname,tc.relname,c.confdeltype
    `);
    assert(learningSiteScopeFks.rows.length === 2, 'Learning/community published-site scope FKs are incomplete');
    for (const row of learningSiteScopeFks.rows) {
      assert(row.source_columns === 'tenant_id,site_id', `${row.conname} must include tenant and site`);
      assert(row.target_table === 'website_sites' && row.target_columns === 'tenant_id,id', `${row.conname} must reuse tenant-scoped website_sites`);
      assert(row.delete_action === 'r', `${row.conname} must restrict deletion of an assigned publishing site`);
    }

    const learningSourceFks = await client.query<{ source_table: string; source_column: string; target_table: string }>(`
      SELECT tc.table_name AS source_table,kcu.column_name AS source_column,ccu.table_name AS target_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name=tc.constraint_name AND kcu.constraint_schema=tc.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name=tc.constraint_name AND ccu.constraint_schema=tc.constraint_schema
      WHERE tc.table_schema='public' AND tc.constraint_type='FOREIGN KEY' AND (
        (tc.table_name='learning_enrollments' AND kcu.column_name='customer_id' AND ccu.table_name='customers') OR
        (tc.table_name='learning_courses' AND kcu.column_name='created_by' AND ccu.table_name='users') OR
        (tc.table_name='community_forums' AND kcu.column_name='created_by' AND ccu.table_name='users')
      )
    `);
    const learningSourceFkKeys = new Set(
      learningSourceFks.rows.map((row) => `${row.source_table}:${row.source_column}:${row.target_table}`),
    );
    for (const key of [
      'learning_enrollments:customer_id:customers',
      'learning_courses:created_by:users',
      'community_forums:created_by:users',
    ]) assert(learningSourceFkKeys.has(key), `Learning/community source-of-truth FK missing: ${key}`);

    const learningScopeFks = await client.query<{ constraint_name: string }>(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_schema='public' AND constraint_type='FOREIGN KEY'
        AND constraint_name IN (
          'fk_learning_assessment_lesson_scope',
          'fk_learning_progress_enrollment_scope','fk_learning_progress_lesson_scope',
          'fk_learning_attempt_enrollment_scope','fk_learning_attempt_assessment_scope',
          'fk_learning_attempt_answer_attempt_scope','fk_learning_attempt_answer_question_scope',
          'fk_community_reply_parent_scope','fk_community_vote_topic_scope','fk_community_vote_reply_scope'
        )
    `);
    assert(learningScopeFks.rows.length === 10, 'Learning/community cross-record scope FKs are incomplete');

    const learningCommunityIndexes = await client.query<{ indexname: string; indexdef: string }>(`
      SELECT indexname,indexdef FROM pg_indexes
      WHERE schemaname='public' AND indexname IN (
        'ux_learning_course_slug','ux_learning_lesson_position','ux_learning_lesson_slug',
        'ux_learning_enrollment_customer','ux_learning_progress_lesson','ux_learning_attempt_number',
        'ux_learning_attempt_answer_question','ux_learning_certificate_enrollment','ux_learning_certificate_number',
        'ux_community_forum_slug','ux_community_topic_slug','ux_community_vote_topic_customer',
        'ux_community_vote_reply_customer','ux_learning_enrollment_access_token',
        'ux_community_topic_submission_key','ux_community_reply_submission_key'
      )
    `);
    assert(learningCommunityIndexes.rows.length === 16, 'Learning/community uniqueness indexes are incomplete');
    for (const row of learningCommunityIndexes.rows) {
      assert(row.indexdef.includes('CREATE UNIQUE INDEX'), `Learning/community index ${row.indexname} must be unique`);
      if ([
        'ux_community_vote_topic_customer','ux_community_vote_reply_customer',
        'ux_learning_enrollment_access_token','ux_community_topic_submission_key',
        'ux_community_reply_submission_key',
      ].includes(row.indexname)) {
        assert(row.indexdef.includes('WHERE'), `Learning/community sparse identity index ${row.indexname} must remain partial`);
      }
    }

    const publicSecretColumns = await client.query<{
      table_name: string;
      column_name: string;
      character_maximum_length: number | null;
    }>(`
      SELECT table_name,column_name,character_maximum_length
      FROM information_schema.columns
      WHERE table_schema='public' AND (
        (table_name='learning_enrollments' AND column_name IN ('access_token_hash','access_token')) OR
        (table_name='community_topics' AND column_name IN ('submission_key_hash','submission_key')) OR
        (table_name='community_replies' AND column_name IN ('submission_key_hash','submission_key'))
      )
    `);
    const publicSecretColumnKeys = new Map(
      publicSecretColumns.rows.map((row) => [`${row.table_name}:${row.column_name}`, row.character_maximum_length]),
    );
    for (const key of [
      'learning_enrollments:access_token_hash',
      'community_topics:submission_key_hash',
      'community_replies:submission_key_hash',
    ]) assert(publicSecretColumnKeys.get(key) === 64, `Public learning/community secret hash must be CHAR(64): ${key}`);
    for (const key of [
      'learning_enrollments:access_token',
      'community_topics:submission_key',
      'community_replies:submission_key',
    ]) assert(!publicSecretColumnKeys.has(key), `Raw public learning/community secret column must not exist: ${key}`);

    const learningCommunityImmutableTriggers = await client.query<{ tgname: string }>(`
      SELECT t.tgname FROM pg_trigger t
      JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND NOT t.tgisinternal
        AND t.tgname IN (
          'trg_learning_certificates_immutable',
          'trg_learning_events_immutable',
          'trg_community_events_immutable'
        )
    `);
    assert(learningCommunityImmutableTriggers.rows.length === 3, 'Learning certificate and audit ledgers are not fully immutable');

    const learningCustomerScopeTriggers = await client.query<{ tgname: string }>(`
      SELECT t.tgname FROM pg_trigger t
      JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND NOT t.tgisinternal
        AND t.tgname IN (
          'trg_learning_enrollments_customer_scope','trg_learning_events_customer_scope',
          'trg_community_topics_customer_scope','trg_community_replies_customer_scope',
          'trg_community_votes_customer_scope','trg_community_events_customer_scope'
        )
    `);
    assert(learningCustomerScopeTriggers.rows.length === 6, 'Learning/community customer tenant guards are incomplete');

    const learningCommunityChecks = await client.query<{ constraint_name: string }>(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_schema='public' AND constraint_type='CHECK'
        AND constraint_name IN (
          'learning_course_status_valid','learning_course_visibility_valid',
          'learning_assessment_passing_score_valid','learning_assessment_max_attempts_valid',
          'learning_certificate_hash_valid','community_forum_status_valid',
          'community_forum_visibility_valid','community_topic_status_valid',
          'community_reply_status_valid','community_vote_target_valid','community_vote_value_valid'
        )
    `);
    assert(learningCommunityChecks.rows.length === 11, 'Learning/community lifecycle, evidence, and vote checks are incomplete');

    const studioTables = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
        AND tablename IN (
          'studio_fields','studio_record_values','studio_workflow_rules',
          'studio_rule_executions','studio_events'
        )
    `);
    assert(studioTables.rows.length === 5, 'P3.8 Studio tables are incomplete');

    const intelligenceTables = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
        AND tablename IN (
          'intelligence_runs','intelligence_findings',
          'agent_action_requests','agent_action_events'
        )
    `);
    assert(intelligenceTables.rows.length === 4, 'P4 intelligence/action tables are incomplete');

    const studioIntelligenceScopeFks = await client.query<{ constraint_name: string }>(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_schema='public' AND constraint_type='FOREIGN KEY'
        AND constraint_name IN (
          'fk_studio_record_value_field_scope','fk_studio_execution_rule_scope',
          'fk_intelligence_finding_run_scope','fk_agent_action_finding_scope',
          'fk_agent_action_event_scope'
        )
    `);
    assert(studioIntelligenceScopeFks.rows.length === 5, 'Studio/intelligence tenant-scope FKs are incomplete');

    const studioIntelligenceTriggers = await client.query<{ tgname: string }>(`
      SELECT t.tgname FROM pg_trigger t
      JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND NOT t.tgisinternal
        AND t.tgname IN (
          'trg_studio_rule_executions_immutable','trg_studio_events_immutable',
          'trg_intelligence_runs_immutable','trg_intelligence_findings_immutable',
          'trg_agent_action_events_immutable','trg_agent_action_requests_no_delete',
          'trg_agent_action_transition'
        )
    `);
    assert(studioIntelligenceTriggers.rows.length === 7, 'Studio/intelligence audit and action-transition triggers are incomplete');

    const actionIdempotency = await client.query<{ constraint_name: string }>(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_schema='public' AND table_name='agent_action_requests'
        AND constraint_type='UNIQUE' AND constraint_name='ux_agent_action_idempotency'
    `);
    assert(actionIdempotency.rows.length === 1, 'Agent action idempotency constraint missing');

    console.log('[P3 database verifier] digital suite + Studio + intelligence/action source-of-truth/scope/audit/idempotency/version invariants verified');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('[P3 database verifier] failed', error);
  process.exit(1);
});
