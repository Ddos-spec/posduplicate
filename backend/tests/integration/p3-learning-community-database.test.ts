import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('P3.7 learning/community database invariants', () => {
  let client: Client;
  let p3Applied = false;

  beforeAll(async () => {
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
    const ledger = await client.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='p3_schema_migrations'
      ) AS exists
    `);
    if (!ledger.rows[0]?.exists) return;
    const migration = await client.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count FROM public.p3_schema_migrations
      WHERE migration_name IN (
        '20260813250000_p3_learning_community_core',
        '20260813251000_p3_learning_community_scope_guard',
        '20260813252000_p3_learning_community_public_access',
        '20260813253000_p3_learning_customer_scope_guard'
      )
    `);
    p3Applied = Number(migration.rows[0]?.count || 0) === 4;
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  test('all core tables exist when P3.7 migrations are applied', async () => {
    if (!p3Applied) return;
    const rows = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN (
        'learning_courses','learning_lessons','learning_assessments','learning_assessment_questions',
        'learning_enrollments','learning_progress','learning_attempts','learning_attempt_answers',
        'learning_certificates','learning_events','community_forums','community_topics',
        'community_replies','community_votes','community_events'
      )
    `);
    expect(rows.rows).toHaveLength(15);
  });

  test('scope guard FKs prevent cross-course and cross-assessment relationships', async () => {
    if (!p3Applied) return;
    const rows = await client.query<{ constraint_name: string }>(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_schema='public' AND constraint_type='FOREIGN KEY'
        AND constraint_name IN (
          'fk_learning_progress_enrollment_scope','fk_learning_progress_lesson_scope',
          'fk_learning_attempt_enrollment_scope','fk_learning_attempt_assessment_scope',
          'fk_learning_attempt_answer_attempt_scope','fk_learning_attempt_answer_question_scope'
        )
    `);
    expect(rows.rows).toHaveLength(6);
  });

  test('customer, user and published-site sources of truth remain referenced', async () => {
    if (!p3Applied) return;
    const rows = await client.query<{ source_table: string; target_table: string }>(`
      SELECT tc.table_name AS source_table,ccu.table_name AS target_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name=tc.constraint_name AND ccu.constraint_schema=tc.constraint_schema
      WHERE tc.table_schema='public' AND tc.constraint_type='FOREIGN KEY'
        AND (
          (tc.table_name IN ('learning_courses','community_forums') AND ccu.table_name='website_sites') OR
          (tc.table_name='learning_enrollments' AND ccu.table_name='customers') OR
          (tc.table_name IN ('learning_courses','community_forums') AND ccu.table_name='users')
        )
    `);
    const keys = new Set(rows.rows.map((row) => `${row.source_table}:${row.target_table}`));
    for (const key of ['learning_courses:website_sites','community_forums:website_sites','learning_enrollments:customers','learning_courses:users','community_forums:users']) {
      expect(keys.has(key)).toBe(true);
    }
  });

  test('certificate/audit triggers and public idempotency indexes are present', async () => {
    if (!p3Applied) return;
    const triggers = await client.query<{ tgname: string }>(`
      SELECT t.tgname FROM pg_trigger t
      JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND NOT t.tgisinternal
        AND t.tgname IN ('trg_learning_certificates_immutable','trg_learning_events_immutable','trg_community_events_immutable')
    `);
    expect(triggers.rows).toHaveLength(3);

    const indexes = await client.query<{ indexname: string; indexdef: string }>(`
      SELECT indexname,indexdef FROM pg_indexes
      WHERE schemaname='public' AND indexname IN (
        'ux_learning_enrollment_access_token','ux_community_topic_submission_key','ux_community_reply_submission_key'
      )
    `);
    expect(indexes.rows).toHaveLength(3);
    for (const row of indexes.rows) {
      expect(row.indexdef).toContain('CREATE UNIQUE INDEX');
      expect(row.indexdef).toContain('WHERE');
    }
  });

  test('customer references are tenant-scoped through the canonical outlet', async () => {
    if (!p3Applied) return;
    const triggers = await client.query<{ tgname: string }>(`
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
    expect(triggers.rows).toHaveLength(6);

    await client.query('BEGIN');
    try {
      const suffix = `${Date.now()}-${Math.random()}`;
      const tenantA = await client.query<{ id: number }>(`
        INSERT INTO public.tenants (business_name,owner_name,email)
        VALUES ('Learning Scope A','Owner A',$1) RETURNING id
      `, [`learning-scope-a-${suffix}@local.test`]);
      const tenantB = await client.query<{ id: number }>(`
        INSERT INTO public.tenants (business_name,owner_name,email)
        VALUES ('Learning Scope B','Owner B',$1) RETURNING id
      `, [`learning-scope-b-${suffix}@local.test`]);
      const role = await client.query<{ id: number }>(`
        INSERT INTO public.roles (name) VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET updated_at=NOW() RETURNING id
      `, ['Learning Scope Test']);
      const outletA = await client.query<{ id: number }>(`
        INSERT INTO public.outlets (tenant_id,name) VALUES ($1,'Scope A Outlet') RETURNING id
      `, [tenantA.rows[0].id]);
      const userA = await client.query<{ id: number }>(`
        INSERT INTO public.users (tenant_id,email,password_hash,name,role_id,outlet_id)
        VALUES ($1,$2,'test-only-hash','Scope A User',$3,$4) RETURNING id
      `, [tenantA.rows[0].id, `learning-scope-user-${suffix}@local.test`, role.rows[0].id, outletA.rows[0].id]);
      const outletB = await client.query<{ id: number }>(`
        INSERT INTO public.outlets (tenant_id,name) VALUES ($1,'Scope B Outlet') RETURNING id
      `, [tenantB.rows[0].id]);
      const customerB = await client.query<{ id: number }>(`
        INSERT INTO public.customers (name,outlet_id) VALUES ('Scope B Customer',$1) RETURNING id
      `, [outletB.rows[0].id]);
      const courseA = await client.query<{ id: number }>(`
        INSERT INTO public.learning_courses (tenant_id,slug,title,status,visibility,created_by)
        VALUES ($1,$2,'Scope A Course','published','private',$3) RETURNING id
      `, [tenantA.rows[0].id, `scope-a-${suffix}`, userA.rows[0].id]);

      await expect(client.query(`
        INSERT INTO public.learning_enrollments (tenant_id,course_id,customer_id,status)
        VALUES ($1,$2,$3,'active')
      `, [tenantA.rows[0].id, courseA.rows[0].id, customerB.rows[0].id])).rejects.toMatchObject({
        code: '23514',
        constraint: 'learning_community_customer_tenant_scope',
      });
    } finally {
      await client.query('ROLLBACK');
    }
  });
});
