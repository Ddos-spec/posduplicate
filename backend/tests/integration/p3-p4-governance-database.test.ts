import { Client, QueryResult } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('P3 Studio and P4 intelligence database governance', () => {
  let client: Client;
  let migrationsApplied = false;

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
        '20260814123000_p3_studio_config',
        '20260814130000_p4_intelligence_actions'
      )
    `);
    migrationsApplied = Number(migration.rows[0]?.count || 0) === 2;
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  test('governed tables, scope constraints, and immutable triggers are installed', async () => {
    if (!migrationsApplied) return;

    const tables = await client.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN (
        'studio_fields','studio_record_values','studio_workflow_rules','studio_rule_executions','studio_events',
        'intelligence_runs','intelligence_findings','agent_action_requests','agent_action_events'
      )
    `);
    expect(tables.rows).toHaveLength(9);

    const constraints = await client.query<{ constraint_name: string }>(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_schema='public' AND constraint_type='FOREIGN KEY'
        AND constraint_name IN (
          'fk_studio_record_value_field_scope','fk_studio_execution_rule_scope',
          'fk_intelligence_finding_run_scope','fk_agent_action_finding_scope',
          'fk_agent_action_event_scope'
        )
    `);
    expect(constraints.rows).toHaveLength(5);

    const triggers = await client.query<{ tgname: string }>(`
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
    expect(triggers.rows).toHaveLength(7);
  });

  test('tenant scope, idempotency, transitions, and evidence immutability hold at runtime', async () => {
    if (!migrationsApplied) return;

    let savepoint = 0;
    const expectDatabaseFailure = async (
      query: string,
      params: unknown[],
      expected: Record<string, string>,
    ): Promise<void> => {
      savepoint += 1;
      const name = `expected_failure_${savepoint}`;
      await client.query(`SAVEPOINT ${name}`);
      try {
        await expect(client.query(query, params)).rejects.toMatchObject(expected);
      } finally {
        await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
        await client.query(`RELEASE SAVEPOINT ${name}`);
      }
    };

    await client.query('BEGIN');
    try {
      const suffix = `${Date.now()}-${Math.random()}`;
      const tenantA = await client.query<{ id: number }>(`
        INSERT INTO public.tenants (business_name,owner_name,email)
        VALUES ('Governance Tenant A','Owner A',$1) RETURNING id
      `, [`governance-a-${suffix}@local.test`]);
      const tenantB = await client.query<{ id: number }>(`
        INSERT INTO public.tenants (business_name,owner_name,email)
        VALUES ('Governance Tenant B','Owner B',$1) RETURNING id
      `, [`governance-b-${suffix}@local.test`]);
      const role = await client.query<{ id: number }>(`
        INSERT INTO public.roles (name) VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET updated_at=NOW() RETURNING id
      `, ['P3 P4 Governance Test']);
      const outletA = await client.query<{ id: number }>(`
        INSERT INTO public.outlets (tenant_id,name) VALUES ($1,'Governance A') RETURNING id
      `, [tenantA.rows[0].id]);
      const outletB = await client.query<{ id: number }>(`
        INSERT INTO public.outlets (tenant_id,name) VALUES ($1,'Governance B') RETURNING id
      `, [tenantB.rows[0].id]);
      const userA = await client.query<{ id: number }>(`
        INSERT INTO public.users (tenant_id,email,password_hash,name,role_id,outlet_id)
        VALUES ($1,$2,'test-only-hash','Governance User A',$3,$4) RETURNING id
      `, [tenantA.rows[0].id, `governance-user-a-${suffix}@local.test`, role.rows[0].id, outletA.rows[0].id]);
      const userB = await client.query<{ id: number }>(`
        INSERT INTO public.users (tenant_id,email,password_hash,name,role_id,outlet_id)
        VALUES ($1,$2,'test-only-hash','Governance User B',$3,$4) RETURNING id
      `, [tenantB.rows[0].id, `governance-user-b-${suffix}@local.test`, role.rows[0].id, outletB.rows[0].id]);

      const fieldA = await client.query<{ id: string }>(`
        INSERT INTO public.studio_fields
          (tenant_id,entity_type,field_key,label,data_type,created_by)
        VALUES ($1,'inventory','risk_band','Risk band','text',$2) RETURNING id
      `, [tenantA.rows[0].id, userA.rows[0].id]);

      await expectDatabaseFailure(`
        INSERT INTO public.studio_record_values
          (tenant_id,field_id,record_key,value,updated_by)
        VALUES ($1,$2,'inventory-1','"high"'::jsonb,$3)
      `, [tenantB.rows[0].id, fieldA.rows[0].id, userB.rows[0].id], {
        code: '23503',
        constraint: 'fk_studio_record_value_field_scope',
      });

      const ruleA = await client.query<{ id: string }>(`
        INSERT INTO public.studio_workflow_rules
          (tenant_id,entity_type,name,trigger_event,condition,action,status,created_by)
        VALUES ($1,'inventory','Flag low stock','manual',$2::jsonb,$3::jsonb,'active',$4)
        RETURNING id
      `, [
        tenantA.rows[0].id,
        JSON.stringify({ field: 'current_stock', operator: 'lt', value: 5 }),
        JSON.stringify({ type: 'flag_for_review', message: 'Low stock' }),
        userA.rows[0].id,
      ]);
      const execution = await client.query<{ id: string }>(`
        INSERT INTO public.studio_rule_executions
          (tenant_id,rule_id,entity_type,record_key,execution_status,input_snapshot,output,actor_user_id)
        VALUES ($1,$2,'inventory','inventory-1','review_required','{}'::jsonb,'{}'::jsonb,$3)
        RETURNING id
      `, [tenantA.rows[0].id, ruleA.rows[0].id, userA.rows[0].id]);

      await expectDatabaseFailure(
        `UPDATE public.studio_rule_executions SET output='{"mutated":true}'::jsonb WHERE id=$1`,
        [execution.rows[0].id],
        { code: 'P0001' },
      );

      const runA = await client.query<{ id: string }>(`
        INSERT INTO public.intelligence_runs
          (tenant_id,analysis_type,data_cutoff,parameters,evidence_summary,created_by)
        VALUES ($1,'overview',NOW(),'{}'::jsonb,'{}'::jsonb,$2) RETURNING id
      `, [tenantA.rows[0].id, userA.rows[0].id]);
      const findingA = await client.query<{ id: string }>(`
        INSERT INTO public.intelligence_findings
          (tenant_id,run_id,finding_type,severity,entity_type,entity_id,title,explanation,observed,derived,confidence,recommended_action)
        VALUES ($1,$2,'replenishment','high','inventory','inventory-1','Low stock','Observed below target','{}'::jsonb,'{}'::jsonb,1,'{}'::jsonb)
        RETURNING id
      `, [tenantA.rows[0].id, runA.rows[0].id]);

      await expectDatabaseFailure(`
        INSERT INTO public.agent_action_requests
          (tenant_id,finding_id,action_type,payload,idempotency_key,requested_by)
        VALUES ($1,$2,'create_replenishment_rfq','{}'::jsonb,$3,$4)
      `, [tenantB.rows[0].id, findingA.rows[0].id, `cross-${suffix}`, userB.rows[0].id], {
        code: '23503',
        constraint: 'fk_agent_action_finding_scope',
      });

      const idempotencyKey = `replenishment-${suffix}`;
      const action = await client.query<{ id: string }>(`
        INSERT INTO public.agent_action_requests
          (tenant_id,finding_id,action_type,payload,idempotency_key,requested_by)
        VALUES ($1,$2,'create_replenishment_rfq',$3::jsonb,$4,$5) RETURNING id
      `, [
        tenantA.rows[0].id,
        findingA.rows[0].id,
        JSON.stringify({ inventoryId: 'inventory-1', approvedQuantity: 10 }),
        idempotencyKey,
        userA.rows[0].id,
      ]);

      await expectDatabaseFailure(`
        INSERT INTO public.agent_action_requests
          (tenant_id,finding_id,action_type,payload,idempotency_key,requested_by)
        VALUES ($1,$2,'create_replenishment_rfq','{}'::jsonb,$3,$4)
      `, [tenantA.rows[0].id, findingA.rows[0].id, idempotencyKey, userA.rows[0].id], {
        code: '23505',
        constraint: 'ux_agent_action_idempotency',
      });

      await expectDatabaseFailure(
        `UPDATE public.agent_action_requests SET status='executing' WHERE id=$1`,
        [action.rows[0].id],
        { code: 'P0001' },
      );
      await expectDatabaseFailure(
        `UPDATE public.agent_action_requests SET status='approved', payload='{}'::jsonb WHERE id=$1`,
        [action.rows[0].id],
        { code: 'P0001' },
      );

      await client.query(`
        UPDATE public.agent_action_requests
        SET status='approved',reviewed_by=$2,reviewed_at=NOW(),review_note='Approved in governance test'
        WHERE id=$1
      `, [action.rows[0].id, userA.rows[0].id]);
      await client.query(
        `UPDATE public.agent_action_requests SET status='executing',executed_by=$2 WHERE id=$1`,
        [action.rows[0].id, userA.rows[0].id],
      );
      const completed: QueryResult<{ status: string }> = await client.query(`
        UPDATE public.agent_action_requests
        SET status='completed',result='{"rfqId":321}'::jsonb,executed_at=NOW()
        WHERE id=$1 RETURNING status
      `, [action.rows[0].id]);
      expect(completed.rows[0].status).toBe('completed');

      await expectDatabaseFailure(
        `DELETE FROM public.agent_action_requests WHERE id=$1`,
        [action.rows[0].id],
        { code: 'P0001' },
      );
      await expectDatabaseFailure(
        `UPDATE public.intelligence_runs SET evidence_summary='{"mutated":true}'::jsonb WHERE id=$1`,
        [runA.rows[0].id],
        { code: 'P0001' },
      );
    } finally {
      await client.query('ROLLBACK');
    }
  });
});
