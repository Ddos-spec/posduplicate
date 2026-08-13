import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_TABLES = [
  'crm_opportunities', 'sales_quotations', 'sales_orders', 'loyalty_ledger',
  'warehouse_locations', 'warehouse_stock_ledger', 'stock_transfers', 'stock_counts',
  'barcode_aliases', 'manufacturing_orders', 'quality_checks', 'maintenance_requests',
  'purchase_rfqs', 'purchase_rfq_items', 'purchase_rfq_suppliers',
  'purchase_rfq_supplier_items', 'procurement_event_ledger',
  'workforce_attendance_sessions', 'payroll_rate_profiles',
  'workforce_leave_types', 'workforce_leave_allocations', 'workforce_leave_requests',
  'workforce_recruitment_vacancies', 'workforce_recruitment_applicants',
  'workforce_recruitment_interviews', 'workforce_recruitment_offers',
  'workforce_appraisal_cycles', 'workforce_appraisals', 'workforce_appraisal_goals',
  'service_projects', 'service_project_tasks', 'service_timesheet_entries', 'service_planning_allocations',
] as const;

const REQUIRED_TRIGGERS = [
  'trg_loyalty_ledger_append_only',
  'trg_warehouse_stock_ledger_append_only',
  'trg_procurement_event_ledger_append_only',
] as const;

const REQUIRED_INDEXES = [
  'ux_workforce_attendance_open_employee',
  'ux_payroll_rate_profile_global_version',
  'ux_payroll_rate_profile_tenant_version',
  'idx_workforce_leave_allocation_employee',
  'idx_workforce_leave_request_scope',
  'idx_workforce_leave_request_employee',
  'idx_workforce_recruitment_vacancy_scope',
  'idx_workforce_recruitment_applicant_scope',
  'ux_workforce_recruitment_applicant_email_vacancy',
  'ux_workforce_recruitment_hired_employee',
  'ux_workforce_recruitment_offer_accepted',
  'idx_workforce_appraisal_cycle_scope',
  'idx_workforce_appraisal_scope',
  'idx_workforce_appraisal_employee',
  'idx_workforce_appraisal_reviewer',
  'idx_workforce_appraisal_goal_appraisal',
  'idx_service_project_scope',
  'idx_service_task_scope',
  'idx_service_task_assignee',
  'idx_service_timesheet_scope',
  'idx_service_timesheet_employee',
  'idx_service_planning_employee',
  'idx_service_planning_project',
] as const;

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

const expectMutationBlocked = async (client: Client, sql: string, label: string, index: number) => {
  const savepoint = `immutable_check_${index}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  try { await client.query(sql); throw new Error(`${label}: mutation unexpectedly succeeded`); }
  catch (error: any) {
    if (String(error?.message || '').includes('unexpectedly succeeded')) throw error;
    assert(error?.code === '55000', `${label}: expected SQLSTATE 55000, got ${error?.code || 'unknown'} (${error?.message || error})`);
  } finally {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
  }
};

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  assert(databaseUrl, 'DATABASE_URL is required');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const tables = await client.query<{ tablename: string }>(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[])`, [REQUIRED_TABLES]);
    const tableSet = new Set(tables.rows.map((row) => row.tablename));
    const missingTables = REQUIRED_TABLES.filter((table) => !tableSet.has(table));
    assert(missingTables.length === 0, `Missing suite tables: ${missingTables.join(', ')}`);

    const ledger = await client.query<{ migration_name: string; checksum_sha256: string }>(`SELECT migration_name, checksum_sha256 FROM public.suite_schema_migrations ORDER BY migration_name`);
    assert(ledger.rows.length === 10, `Expected 10 suite migration ledger entries, found ${ledger.rows.length}`);
    assert(ledger.rows.every((row) => row.checksum_sha256?.length === 64), 'Invalid suite migration checksum');
    assert(ledger.rows.some((row) => row.migration_name === '20260813023000_p2_workforce_attendance'), 'P2 workforce migration missing from ledger');
    assert(ledger.rows.some((row) => row.migration_name === '20260813030000_p2_payroll_rate_profiles'), 'P2 payroll profile migration missing from ledger');
    assert(ledger.rows.some((row) => row.migration_name === '20260813033000_p2_workforce_leave'), 'P2 workforce leave migration missing from ledger');
    assert(ledger.rows.some((row) => row.migration_name === '20260813040000_p2_recruitment_core'), 'P2 recruitment migration missing from ledger');
    assert(ledger.rows.some((row) => row.migration_name === '20260813043000_p2_appraisals_core'), 'P2 appraisals migration missing from ledger');
    assert(ledger.rows.some((row) => row.migration_name === '20260813050000_p2_services_project_core'), 'P2 services project migration missing from ledger');

    const indexes = await client.query<{ indexname: string }>(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1::text[])`, [REQUIRED_INDEXES]);
    const indexSet = new Set(indexes.rows.map((row) => row.indexname));
    const missingIndexes = REQUIRED_INDEXES.filter((name) => !indexSet.has(name));
    assert(missingIndexes.length === 0, `Missing suite indexes: ${missingIndexes.join(', ')}`);

    const profile = await client.query<any>(`SELECT * FROM public.payroll_rate_profiles WHERE tenant_id IS NULL AND profile_code = 'ID-PAYROLL-2026' AND version = 1 LIMIT 1`);
    assert(profile.rows[0], 'Draft 2026 payroll governance profile missing');
    assert(profile.rows[0].status === 'draft', 'Reference payroll profile must remain draft until full engine verification');
    assert(profile.rows[0].tax_method === 'PPH21_TER', 'Payroll reference tax method must be PPH21_TER');

    const leaveColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'workforce_leave_allocations'
        AND column_name IN ('allocated_days','reserved_days','used_days')
    `);
    assert(leaveColumns.rows.length === 3, 'Workforce leave allocation balance columns are incomplete');

    const recruitmentColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'workforce_recruitment_applicants'
        AND column_name IN ('vacancy_id','stage','hired_employee_id','hired_at')
    `);
    assert(recruitmentColumns.rows.length === 4, 'Recruitment applicant lifecycle columns are incomplete');

    const appraisalColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'workforce_appraisals'
        AND column_name IN ('cycle_id','employee_id','reviewer_user_id','status','overall_score','self_submitted_at','completed_at')
    `);
    assert(appraisalColumns.rows.length === 7, 'Appraisal lifecycle columns are incomplete');

    const appraisalEmployeeForeignKey = await client.query<{ constraint_name: string }>(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'workforce_appraisals'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'accounting'
        AND ccu.table_name = 'employees'
        AND ccu.column_name = 'id'
    `);
    assert(appraisalEmployeeForeignKey.rows.length >= 1, 'Appraisals must reference accounting.employees source of truth');

    const serviceColumns = await client.query<{ table_name: string; column_name: string }>(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND ((table_name = 'service_project_tasks' AND column_name = 'assignee_employee_id')
          OR (table_name = 'service_timesheet_entries' AND column_name IN ('employee_id','minutes','status'))
          OR (table_name = 'service_planning_allocations' AND column_name IN ('employee_id','start_at','end_at','status')))
    `);
    assert(serviceColumns.rows.length === 8, 'Project/timesheet/planning lifecycle columns are incomplete');

    const serviceEmployeeForeignKeys = await client.query<{ constraint_name: string }>(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name IN ('service_project_tasks','service_timesheet_entries','service_planning_allocations')
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'accounting'
        AND ccu.table_name = 'employees'
        AND ccu.column_name = 'id'
    `);
    assert(serviceEmployeeForeignKeys.rows.length >= 3, 'Services must reference accounting.employees source of truth');

    const triggers = await client.query<{ tgname: string }>(`SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY($1::text[])`, [REQUIRED_TRIGGERS]);
    const triggerSet = new Set(triggers.rows.map((row) => row.tgname));
    const missingTriggers = REQUIRED_TRIGGERS.filter((name) => !triggerSet.has(name));
    assert(missingTriggers.length === 0, `Missing immutable triggers: ${missingTriggers.join(', ')}`);

    await client.query('BEGIN');
    try {
      const wallet = await client.query<{ id: number }>(`INSERT INTO public.loyalty_wallets (tenant_id, customer_id, points_balance) VALUES (999001, 999001, 10) RETURNING id`);
      const loyalty = await client.query<{ id: number }>(`INSERT INTO public.loyalty_ledger (tenant_id, customer_id, wallet_id, entry_type, points_delta, reason) VALUES (999001, 999001, $1, 'adjustment', 10, 'suite immutable verification') RETURNING id`, [wallet.rows[0].id]);
      const location = await client.query<{ id: number }>(`INSERT INTO public.warehouse_locations (tenant_id, outlet_id, code, name, location_type) VALUES (999001, 999001, 'VERIFY', 'Suite Verify Location', 'stock') ON CONFLICT (tenant_id, outlet_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING id`);
      const warehouse = await client.query<{ id: number }>(`INSERT INTO public.warehouse_stock_ledger (tenant_id, outlet_id, location_id, inventory_id, entry_type, quantity_delta, balance_before, balance_after, reference_type, reference_id, notes) VALUES (999001, 999001, $1, 999001, 'manual_adjustment', 1, 0, 1, 'verification', 'verify', 'suite immutable verification') RETURNING id`, [location.rows[0].id]);
      const procurement = await client.query<{ id: number }>(`INSERT INTO public.procurement_event_ledger (tenant_id, outlet_id, event_type, reference_type, reference_id, payload) VALUES (999001, 999001, 'verification', 'verification', 'verify', '{}'::jsonb) RETURNING id`);
      const checks = [
        [`UPDATE public.loyalty_ledger SET reason='tamper' WHERE id=${Number(loyalty.rows[0].id)}`, 'loyalty UPDATE'],
        [`DELETE FROM public.loyalty_ledger WHERE id=${Number(loyalty.rows[0].id)}`, 'loyalty DELETE'],
        [`UPDATE public.warehouse_stock_ledger SET notes='tamper' WHERE id=${Number(warehouse.rows[0].id)}`, 'warehouse UPDATE'],
        [`DELETE FROM public.warehouse_stock_ledger WHERE id=${Number(warehouse.rows[0].id)}`, 'warehouse DELETE'],
        [`UPDATE public.procurement_event_ledger SET event_type='tamper' WHERE id=${Number(procurement.rows[0].id)}`, 'procurement UPDATE'],
        [`DELETE FROM public.procurement_event_ledger WHERE id=${Number(procurement.rows[0].id)}`, 'procurement DELETE'],
      ] as const;
      for (let index = 0; index < checks.length; index += 1) await expectMutationBlocked(client, checks[index][0], checks[index][1], index);
      await client.query('ROLLBACK');
    } catch (error) { await client.query('ROLLBACK'); throw error; }

    console.log(`Suite DB verified: ${REQUIRED_TABLES.length} tables, ${ledger.rows.length} migrations, ${REQUIRED_TRIGGERS.length} immutable triggers, ${REQUIRED_INDEXES.length} suite indexes, payroll governance draft present, workforce leave balances present, recruitment lifecycle present, appraisal lifecycle present, services project/timesheet/planning lifecycle present, 6 blocked mutations.`);
  } finally { await client.end(); }
}

run().catch((error) => { console.error('[Suite DB verification] failed', error); process.exit(1); });
