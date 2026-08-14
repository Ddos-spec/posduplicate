import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_TABLES = [
  'webhook_events',
  'crm_opportunities', 'sales_quotations', 'sales_orders', 'loyalty_ledger',
  'warehouse_locations', 'warehouse_stock_ledger', 'stock_transfers', 'stock_counts',
  'barcode_aliases', 'manufacturing_orders', 'quality_checks', 'maintenance_requests',
  'purchase_rfqs', 'purchase_rfq_items', 'purchase_rfq_suppliers',
  'purchase_rfq_supplier_items', 'procurement_event_ledger',
  'workforce_attendance_sessions', 'payroll_rate_profiles',
  'payroll_employee_statutory_settings', 'payroll_calculation_runs', 'payroll_profile_activation_events',
  'payroll_accounting_settings', 'payroll_official_materializations', 'payroll_official_postings',
  'workforce_leave_types', 'workforce_leave_allocations', 'workforce_leave_requests',
  'workforce_recruitment_vacancies', 'workforce_recruitment_applicants',
  'workforce_recruitment_interviews', 'workforce_recruitment_offers',
  'workforce_appraisal_cycles', 'workforce_appraisals', 'workforce_appraisal_goals',
  'service_projects', 'service_project_tasks', 'service_timesheet_entries', 'service_planning_allocations',
  'service_field_orders', 'service_field_events',
  'service_helpdesk_sla_policies', 'service_helpdesk_tickets', 'service_helpdesk_messages', 'service_helpdesk_events',
  'service_appointment_types', 'service_appointments', 'service_appointment_events',
] as const;

const REQUIRED_TRIGGERS = [
  'trg_loyalty_ledger_append_only',
  'trg_warehouse_stock_ledger_append_only',
  'trg_procurement_event_ledger_append_only',
  'trg_service_field_event_append_only',
  'trg_service_helpdesk_message_append_only',
  'trg_service_helpdesk_event_append_only',
  'trg_service_appointment_event_append_only',
  'trg_payroll_calculation_run_append_only',
  'trg_payroll_profile_activation_event_append_only',
  'trg_payroll_official_detail_immutable',
  'trg_payroll_official_materialization_append_only',
  'trg_payroll_official_posting_append_only',
] as const;

const REQUIRED_INDEXES = [
  'webhook_events_idempotency_key_key',
  'idx_webhook_events_tenant_type',
  'idx_webhook_events_expires',
  'idx_webhook_events_integration_external',
  'ux_workforce_attendance_open_employee',
  'ux_payroll_rate_profile_global_version',
  'ux_payroll_rate_profile_tenant_version',
  'idx_payroll_employee_statutory_tenant',
  'idx_payroll_calculation_run_period',
  'idx_payroll_calculation_run_profile',
  'idx_payroll_profile_activation_tenant',
  'ux_payroll_profile_activation_run',
  'ux_payroll_official_materialization_period',
  'ux_payroll_official_materialization_run',
  'ux_payroll_official_posting_period',
  'ux_payroll_official_posting_run',
  'ux_payroll_official_posting_journal',
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
  'idx_service_field_order_scope',
  'idx_service_field_order_employee',
  'idx_service_field_order_customer',
  'idx_service_field_event_order',
  'idx_helpdesk_sla_scope',
  'idx_helpdesk_ticket_scope',
  'idx_helpdesk_ticket_assignee',
  'idx_helpdesk_ticket_customer',
  'idx_helpdesk_ticket_sla_due',
  'idx_helpdesk_message_ticket',
  'idx_helpdesk_event_ticket',
  'idx_service_appointment_type_scope',
  'idx_service_appointment_scope',
  'idx_service_appointment_employee',
  'idx_service_appointment_customer',
  'idx_service_appointment_event_order',
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const expectMutationBlocked = async (client: Client, sql: string, label: string, index: number) => {
  const savepoint = `immutable_check_${index}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    await client.query(sql);
    throw new Error(`${label}: mutation unexpectedly succeeded`);
  } catch (error: any) {
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
    const tables = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
      [REQUIRED_TABLES],
    );
    const tableSet = new Set(tables.rows.map((row) => row.tablename));
    const missingTables = REQUIRED_TABLES.filter((table) => !tableSet.has(table));
    assert(missingTables.length === 0, `Missing suite tables: ${missingTables.join(', ')}`);

    const ledger = await client.query<{ migration_name: string; checksum_sha256: string }>(
      `SELECT migration_name, checksum_sha256 FROM public.suite_schema_migrations ORDER BY migration_name`,
    );
    assert(ledger.rows.length === 20, `Expected 20 suite migration ledger entries, found ${ledger.rows.length}`);
    assert(ledger.rows.every((row) => row.checksum_sha256?.length === 64), 'Invalid suite migration checksum');

    const migrationNames = [
      '20260121145000_create_trial_balance_view',
      '20260728135000_add_webhook_events',
      '20260813023000_p2_workforce_attendance',
      '20260813030000_p2_payroll_rate_profiles',
      '20260813033000_p2_workforce_leave',
      '20260813040000_p2_recruitment_core',
      '20260813043000_p2_appraisals_core',
      '20260813050000_p2_services_project_core',
      '20260813054000_p2_field_service_core',
      '20260813060000_p2_helpdesk_core',
      '20260813063000_p2_appointments_core',
      '20260813070000_p2_payroll_current_profile',
      '20260813073000_p2_payroll_calculation_runs',
      '20260813080000_p2_payroll_final_reconciliation',
      '20260813083000_p2_payroll_official_posting',
      '20260815090000_harden_webhook_events',
    ];
    for (const migrationName of migrationNames) {
      assert(ledger.rows.some((row) => row.migration_name === migrationName), `${migrationName} missing from ledger`);
    }

    const accountingViews = await client.query<{ viewname: string }>(`
      SELECT viewname FROM pg_views
      WHERE schemaname = 'accounting' AND viewname = 'v_trial_balance'
    `);
    assert(accountingViews.rows.length === 1, 'Accounting trial balance view is missing');

    const webhookEvidenceColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'webhook_events'
        AND column_name IN ('idempotency_key','integration_type','tenant_id','external_id','payload_digest','event_status','response_payload','expires_at')
    `);
    assert(webhookEvidenceColumns.rows.length === 8, 'Webhook idempotency evidence columns are incomplete');

    const indexes = await client.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1::text[])`,
      [REQUIRED_INDEXES],
    );
    const indexSet = new Set(indexes.rows.map((row) => row.indexname));
    const missingIndexes = REQUIRED_INDEXES.filter((name) => !indexSet.has(name));
    assert(missingIndexes.length === 0, `Missing suite indexes: ${missingIndexes.join(', ')}`);

    const accountingIndexes = await client.query<{ indexname: string }>(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'accounting'
        AND indexname IN ('ux_payroll_details_period_employee','idx_payroll_details_source_run','ux_journal_payroll_period_reference')
    `);
    assert(accountingIndexes.rows.length === 3, 'Payroll official accounting indexes are incomplete');

    const profileV1 = await client.query<any>(
      `SELECT * FROM public.payroll_rate_profiles WHERE tenant_id IS NULL AND profile_code = 'ID-PAYROLL-2026' AND version = 1 LIMIT 1`,
    );
    assert(profileV1.rows[0], 'Draft 2026 payroll governance profile missing');
    assert(profileV1.rows[0].status === 'draft', 'Reference payroll profile must remain draft until full engine verification');
    assert(profileV1.rows[0].tax_method === 'PPH21_TER', 'Payroll reference tax method must be PPH21_TER');

    const profileV2 = await client.query<any>(
      `SELECT * FROM public.payroll_rate_profiles WHERE tenant_id IS NULL AND profile_code = 'ID-PAYROLL-2026' AND version = 2 LIMIT 1`,
    );
    assert(profileV2.rows[0], 'Verified-component payroll profile v2 missing');
    assert(profileV2.rows[0].status === 'draft', 'Global reference payroll profile v2 must remain draft; only controlled tenant copies may become active');
    assert(profileV2.rows[0].configuration?.verificationStatus === 'verified-components-awaiting-engine-wiring', 'Payroll profile v2 verification marker missing');
    assert(Number(profileV2.rows[0].configuration?.bpjsKetenagakerjaan?.jpMaxMonthlyWage) === 10547400, 'Payroll profile v2 JP ceiling mismatch');
    assert(Number(profileV2.rows[0].configuration?.bpjsKesehatan?.maxMonthlyWage) === 12000000, 'Payroll profile v2 BPJS Kesehatan ceiling mismatch');
    assert(profileV2.rows[0].configuration?.bpjsKetenagakerjaan?.bpuReliefApplied === false, 'BPU relief must not leak into PPU payroll profile');

    const payrollSettingColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'payroll_employee_statutory_settings'
        AND column_name IN (
          'fixed_allowance_monthly','applicable_health_minimum_wage','bpjs_employment_enabled',
          'bpjs_health_enabled','jkk_risk_level','ptkp_status_year_start','tax_subjective_case',
          'zakat_via_employer_monthly'
        )
    `);
    assert(payrollSettingColumns.rows.length === 8, 'Payroll statutory/final-tax settings columns are incomplete');

    const payrollSettingEmployeeForeignKey = await client.query<{ constraint_name: string }>(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'payroll_employee_statutory_settings'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'accounting'
        AND ccu.table_name = 'employees'
        AND ccu.column_name = 'id'
    `);
    assert(payrollSettingEmployeeForeignKey.rows.length >= 1, 'Payroll statutory settings must reuse accounting.employees');

    const payrollRunForeignKeys = await client.query<{ constraint_name: string }>(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'payroll_calculation_runs'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ((ccu.table_schema = 'accounting' AND ccu.table_name = 'payroll_periods' AND ccu.column_name = 'id')
          OR (ccu.table_schema = 'public' AND ccu.table_name = 'payroll_rate_profiles' AND ccu.column_name = 'id'))
    `);
    assert(payrollRunForeignKeys.rows.length >= 2, 'Payroll calculation runs must reference payroll period and rate profile');

    const activationForeignKeys = await client.query<{ constraint_name: string }>(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'payroll_profile_activation_events'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ((ccu.table_schema = 'public' AND ccu.table_name = 'payroll_rate_profiles' AND ccu.column_name = 'id')
          OR (ccu.table_schema = 'public' AND ccu.table_name = 'payroll_calculation_runs' AND ccu.column_name = 'id'))
    `);
    assert(activationForeignKeys.rows.length >= 3, 'Payroll activation audit must reference source profile, activated profile and verification run');

    const officialDetailColumns = await client.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'accounting' AND table_name = 'payroll_details'
        AND column_name IN ('source_calculation_run_id','source_profile_id','source_profile_version','pph21_refund')
    `);
    assert(officialDetailColumns.rows.length === 4, 'Payroll official detail evidence columns are incomplete');

    const officialDetailForeignKeys = await client.query<{ constraint_name: string }>(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'accounting'
        AND tc.table_name = 'payroll_details'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'public'
        AND ccu.table_name IN ('payroll_calculation_runs','payroll_rate_profiles')
    `);
    assert(officialDetailForeignKeys.rows.length >= 2, 'Official payroll details must reference immutable run and profile evidence');

    const payrollAccountingForeignKeys = await client.query<{ constraint_name: string }>(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'payroll_accounting_settings'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'accounting'
        AND ccu.table_name = 'chart_of_accounts'
    `);
    assert(payrollAccountingForeignKeys.rows.length >= 5, 'Payroll accounting settings must reference five chart-of-account mappings');

    const officialEvidenceForeignKeys = await client.query<{ constraint_name: string }>(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name IN ('payroll_official_materializations','payroll_official_postings')
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ((ccu.table_schema = 'accounting' AND ccu.table_name IN ('payroll_periods','journal_entries'))
          OR (ccu.table_schema = 'public' AND ccu.table_name IN ('payroll_calculation_runs','payroll_rate_profiles','payroll_official_materializations')))
    `);
    assert(officialEvidenceForeignKeys.rows.length >= 8, 'Payroll official materialization/posting evidence FKs are incomplete');

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

    const fieldEmployeeForeignKeys = await client.query<{ constraint_name: string }>(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name IN ('service_field_orders','service_field_events')
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'accounting'
        AND ccu.table_name = 'employees'
        AND ccu.column_name = 'id'
    `);
    assert(fieldEmployeeForeignKeys.rows.length >= 2, 'Field Service must reuse accounting.employees source of truth');

    const fieldPlanningForeignKey = await client.query<{ constraint_name: string }>(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'service_field_orders'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'public'
        AND ccu.table_name = 'service_planning_allocations'
        AND ccu.column_name = 'id'
    `);
    assert(fieldPlanningForeignKey.rows.length >= 1, 'Field Service must reuse Services Planning allocations');

    const helpdeskEmployeeForeignKeys = await client.query<{ constraint_name: string }>(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name IN ('service_helpdesk_tickets','service_helpdesk_messages','service_helpdesk_events')
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'accounting'
        AND ccu.table_name = 'employees'
        AND ccu.column_name = 'id'
    `);
    assert(helpdeskEmployeeForeignKeys.rows.length >= 3, 'Helpdesk must reuse accounting.employees source of truth');

    const helpdeskSourceForeignKeys = await client.query<{ constraint_name: string }>(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'service_helpdesk_tickets'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'public'
        AND ccu.table_name IN ('customers','service_projects','service_field_orders','service_helpdesk_sla_policies')
    `);
    assert(helpdeskSourceForeignKeys.rows.length >= 4, 'Helpdesk must reuse customer/project/Field Service/SLA sources');

    const appointmentEmployeeForeignKeys = await client.query<{ constraint_name: string }>(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name IN ('service_appointments','service_appointment_events')
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'accounting'
        AND ccu.table_name = 'employees'
        AND ccu.column_name = 'id'
    `);
    assert(appointmentEmployeeForeignKeys.rows.length >= 2, 'Appointments must reuse accounting.employees source of truth');

    const appointmentSourceForeignKeys = await client.query<{ constraint_name: string }>(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'service_appointments'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'public'
        AND ccu.table_name IN ('customers','service_appointment_types','service_planning_allocations')
    `);
    assert(appointmentSourceForeignKeys.rows.length >= 3, 'Appointments must reuse customer/type/Planning sources');

    const triggers = await client.query<{ tgname: string }>(
      `SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY($1::text[])`,
      [REQUIRED_TRIGGERS],
    );
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

      const fieldTenant = await client.query<{ id: number }>(`
        INSERT INTO public.tenants (business_name, owner_name, email, subscription_status, is_active)
        VALUES ('Field Verify Business', 'Field Verify Owner', 'field-verifier@example.invalid', 'active', TRUE)
        RETURNING id
      `);
      const fieldTenantId = Number(fieldTenant.rows[0].id);
      const fieldOutlet = await client.query<{ id: number }>(`INSERT INTO public.outlets (tenant_id, name) VALUES ($1, 'Field Verify Outlet') RETURNING id`, [fieldTenantId]);
      const fieldCustomer = await client.query<{ id: number }>(`INSERT INTO public.customers (name, outlet_id) VALUES ('Field Verify Customer', $1) RETURNING id`, [fieldOutlet.rows[0].id]);
      const fieldEmployee = await client.query<{ id: number }>(`INSERT INTO accounting.employees (tenant_id, employee_id, name, status) VALUES ($1, 'VERIFY-EMP', 'Verify Employee', 'active') RETURNING id`, [fieldTenantId]);
      const fieldOrder = await client.query<{ id: number }>(`INSERT INTO public.service_field_orders (tenant_id, outlet_id, customer_id, code, title, service_address, status) VALUES ($1, $2, $3, 'VERIFY-FIELD', 'Verify Field Order', 'Verification address', 'draft') RETURNING id`, [fieldTenantId, fieldOutlet.rows[0].id, fieldCustomer.rows[0].id]);
      const fieldEvent = await client.query<{ id: number }>(`INSERT INTO public.service_field_events (tenant_id, field_order_id, event_type, notes) VALUES ($1, $2, 'created', 'suite immutable verification') RETURNING id`, [fieldTenantId, fieldOrder.rows[0].id]);

      const helpdeskSla = await client.query<{ id: number }>(`INSERT INTO public.service_helpdesk_sla_policies (tenant_id, name, priority, first_response_minutes, resolution_minutes) VALUES ($1, 'Verify SLA', 'normal', 30, 240) RETURNING id`, [fieldTenantId]);
      const helpdeskTicket = await client.query<{ id: number }>(`INSERT INTO public.service_helpdesk_tickets (tenant_id, outlet_id, customer_id, field_order_id, sla_policy_id, code, subject, channel, priority, status) VALUES ($1, $2, $3, $4, $5, 'VERIFY-HELP', 'Verify Helpdesk Ticket', 'internal', 'normal', 'new') RETURNING id`, [fieldTenantId, fieldOutlet.rows[0].id, fieldCustomer.rows[0].id, fieldOrder.rows[0].id, helpdeskSla.rows[0].id]);
      const helpdeskMessage = await client.query<{ id: number }>(`INSERT INTO public.service_helpdesk_messages (tenant_id, ticket_id, direction, visibility, body) VALUES ($1, $2, 'internal', 'internal', 'suite immutable verification') RETURNING id`, [fieldTenantId, helpdeskTicket.rows[0].id]);
      const helpdeskEvent = await client.query<{ id: number }>(`INSERT INTO public.service_helpdesk_events (tenant_id, ticket_id, event_type, payload) VALUES ($1, $2, 'created', '{}'::jsonb) RETURNING id`, [fieldTenantId, helpdeskTicket.rows[0].id]);

      const appointmentType = await client.query<{ id: number }>(`INSERT INTO public.service_appointment_types (tenant_id, outlet_id, code, name, duration_minutes, buffer_before_minutes, buffer_after_minutes) VALUES ($1, $2, 'VERIFY-APT-TYPE', 'Verify Appointment', 30, 5, 10) RETURNING id`, [fieldTenantId, fieldOutlet.rows[0].id]);
      const appointmentPlanning = await client.query<{ id: number }>(`INSERT INTO public.service_planning_allocations (tenant_id, employee_id, start_at, end_at, status, notes) VALUES ($1, $2, NOW() + INTERVAL '1 day' - INTERVAL '5 minutes', NOW() + INTERVAL '1 day' + INTERVAL '40 minutes', 'planned', 'appointment verifier') RETURNING id`, [fieldTenantId, fieldEmployee.rows[0].id]);
      const appointment = await client.query<{ id: number }>(`INSERT INTO public.service_appointments (tenant_id, outlet_id, appointment_type_id, customer_id, assigned_employee_id, planning_allocation_id, code, title, status, scheduled_start, scheduled_end, duration_minutes, buffer_before_minutes, buffer_after_minutes) VALUES ($1, $2, $3, $4, $5, $6, 'VERIFY-APT', 'Verify Appointment', 'booked', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '30 minutes', 30, 5, 10) RETURNING id`, [fieldTenantId, fieldOutlet.rows[0].id, appointmentType.rows[0].id, fieldCustomer.rows[0].id, fieldEmployee.rows[0].id, appointmentPlanning.rows[0].id]);
      const appointmentEvent = await client.query<{ id: number }>(`INSERT INTO public.service_appointment_events (tenant_id, appointment_id, event_type, actor_employee_id, notes, payload) VALUES ($1, $2, 'booked', $3, 'suite immutable verification', '{}'::jsonb) RETURNING id`, [fieldTenantId, appointment.rows[0].id, fieldEmployee.rows[0].id]);

      const payrollPeriod = await client.query<{ id: number }>(`INSERT INTO accounting.payroll_periods (tenant_id, period_start, period_end, description, status) VALUES ($1, DATE '2026-08-01', DATE '2026-08-31', 'Payroll immutable verification', 'draft') RETURNING id`, [fieldTenantId]);
      const payrollRun = await client.query<{ id: number }>(`INSERT INTO public.payroll_calculation_runs (tenant_id, period_id, profile_id, profile_code, profile_version, run_mode, tax_period_kind, rules_snapshot, input_snapshot, output_snapshot) VALUES ($1, $2, $3, 'ID-PAYROLL-2026', 2, 'verification_preview', 'non_final', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb) RETURNING id`, [fieldTenantId, payrollPeriod.rows[0].id, profileV2.rows[0].id]);

      const payrollFinalPeriod = await client.query<{ id: number }>(`INSERT INTO accounting.payroll_periods (tenant_id, period_start, period_end, description, status) VALUES ($1, DATE '2026-12-01', DATE '2026-12-31', 'Payroll final immutable verification', 'draft') RETURNING id`, [fieldTenantId]);
      const payrollFinalRun = await client.query<{ id: number }>(`INSERT INTO public.payroll_calculation_runs (tenant_id, period_id, profile_id, profile_code, profile_version, run_mode, tax_period_kind, rules_snapshot, input_snapshot, output_snapshot) VALUES ($1, $2, $3, 'ID-PAYROLL-2026', 2, 'verification_preview', 'final', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb) RETURNING id`, [fieldTenantId, payrollFinalPeriod.rows[0].id, profileV2.rows[0].id]);
      const tenantProfile = await client.query<{ id: number }>(`INSERT INTO public.payroll_rate_profiles (tenant_id, profile_code, version, country_code, effective_from, status, tax_method, tax_rule_reference, configuration, source_references, notes) VALUES ($1, 'ID-PAYROLL-2026', 2, 'ID', DATE '2026-01-01', 'active', 'PPH21_TER', 'verification fixture', '{}'::jsonb, '[]'::jsonb, 'tenant activation verifier') RETURNING id`, [fieldTenantId]);
      const activationEvent = await client.query<{ id: number }>(`INSERT INTO public.payroll_profile_activation_events (tenant_id, source_profile_id, activated_profile_id, verification_run_id, effective_from, payload) VALUES ($1, $2, $3, $4, DATE '2026-01-01', '{}'::jsonb) RETURNING id`, [fieldTenantId, profileV2.rows[0].id, tenantProfile.rows[0].id, payrollFinalRun.rows[0].id]);

      const officialDetail = await client.query<{ id: number }>(`
        INSERT INTO accounting.payroll_details
          (tenant_id, period_id, employee_id, basic_salary, total_allowance, gross_salary, pph21,
           total_deductions, net_salary, employer_cost, source_calculation_run_id, source_profile_id, source_profile_version)
        VALUES ($1, $2, $3, 1000000, 0, 1000000, 0, 0, 1000000, 1000000, $4, $5, 2)
        RETURNING id
      `, [fieldTenantId, payrollPeriod.rows[0].id, fieldEmployee.rows[0].id, payrollRun.rows[0].id, tenantProfile.rows[0].id]);
      const officialMaterialization = await client.query<{ id: number }>(`
        INSERT INTO public.payroll_official_materializations
          (tenant_id, period_id, calculation_run_id, profile_id, profile_version, tax_period_kind, detail_count, totals)
        VALUES ($1, $2, $3, $4, 2, 'non_final', 1, '{}'::jsonb)
        RETURNING id
      `, [fieldTenantId, payrollPeriod.rows[0].id, payrollRun.rows[0].id, tenantProfile.rows[0].id]);

      const checks = [
        [`UPDATE public.loyalty_ledger SET reason='tamper' WHERE id=${Number(loyalty.rows[0].id)}`, 'loyalty UPDATE'],
        [`DELETE FROM public.loyalty_ledger WHERE id=${Number(loyalty.rows[0].id)}`, 'loyalty DELETE'],
        [`UPDATE public.warehouse_stock_ledger SET notes='tamper' WHERE id=${Number(warehouse.rows[0].id)}`, 'warehouse UPDATE'],
        [`DELETE FROM public.warehouse_stock_ledger WHERE id=${Number(warehouse.rows[0].id)}`, 'warehouse DELETE'],
        [`UPDATE public.procurement_event_ledger SET event_type='tamper' WHERE id=${Number(procurement.rows[0].id)}`, 'procurement UPDATE'],
        [`DELETE FROM public.procurement_event_ledger WHERE id=${Number(procurement.rows[0].id)}`, 'procurement DELETE'],
        [`UPDATE public.service_field_events SET notes='tamper' WHERE id=${Number(fieldEvent.rows[0].id)}`, 'field event UPDATE'],
        [`DELETE FROM public.service_field_events WHERE id=${Number(fieldEvent.rows[0].id)}`, 'field event DELETE'],
        [`UPDATE public.service_helpdesk_messages SET body='tamper' WHERE id=${Number(helpdeskMessage.rows[0].id)}`, 'helpdesk message UPDATE'],
        [`DELETE FROM public.service_helpdesk_messages WHERE id=${Number(helpdeskMessage.rows[0].id)}`, 'helpdesk message DELETE'],
        [`UPDATE public.service_helpdesk_events SET event_type='tamper' WHERE id=${Number(helpdeskEvent.rows[0].id)}`, 'helpdesk event UPDATE'],
        [`DELETE FROM public.service_helpdesk_events WHERE id=${Number(helpdeskEvent.rows[0].id)}`, 'helpdesk event DELETE'],
        [`UPDATE public.service_appointment_events SET notes='tamper' WHERE id=${Number(appointmentEvent.rows[0].id)}`, 'appointment event UPDATE'],
        [`DELETE FROM public.service_appointment_events WHERE id=${Number(appointmentEvent.rows[0].id)}`, 'appointment event DELETE'],
        [`UPDATE public.payroll_calculation_runs SET run_mode='verification_preview' WHERE id=${Number(payrollRun.rows[0].id)}`, 'payroll calculation run UPDATE'],
        [`DELETE FROM public.payroll_calculation_runs WHERE id=${Number(payrollRun.rows[0].id)}`, 'payroll calculation run DELETE'],
        [`UPDATE public.payroll_profile_activation_events SET effective_from=DATE '2026-02-01' WHERE id=${Number(activationEvent.rows[0].id)}`, 'payroll activation event UPDATE'],
        [`DELETE FROM public.payroll_profile_activation_events WHERE id=${Number(activationEvent.rows[0].id)}`, 'payroll activation event DELETE'],
        [`UPDATE accounting.payroll_details SET net_salary=999999 WHERE id=${Number(officialDetail.rows[0].id)}`, 'official payroll detail UPDATE'],
        [`DELETE FROM accounting.payroll_details WHERE id=${Number(officialDetail.rows[0].id)}`, 'official payroll detail DELETE'],
        [`UPDATE public.payroll_official_materializations SET detail_count=2 WHERE id=${Number(officialMaterialization.rows[0].id)}`, 'payroll materialization UPDATE'],
        [`DELETE FROM public.payroll_official_materializations WHERE id=${Number(officialMaterialization.rows[0].id)}`, 'payroll materialization DELETE'],
      ] as const;
      for (let index = 0; index < checks.length; index += 1) {
        await expectMutationBlocked(client, checks[index][0], checks[index][1], index);
      }
      await client.query('ROLLBACK');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    console.log(`Suite DB verified: ${REQUIRED_TABLES.length} tables, ${ledger.rows.length} migrations, ${REQUIRED_TRIGGERS.length} immutable triggers, ${REQUIRED_INDEXES.length} public suite indexes, accounting trial balance view present, durable webhook idempotency evidence present, payroll governance draft present, payroll current profile v2 global draft present, payroll verification snapshots present, payroll final-tax settings present, tenant activation audit present, official payroll evidence/account mapping present, workforce leave balances present, recruitment lifecycle present, appraisal lifecycle present, services project/timesheet/planning lifecycle present, field service lifecycle/audit present, helpdesk SLA/ticket/conversation lifecycle present, appointments scheduling/lifecycle present, 22 blocked mutations.`);
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('[Suite DB verification] failed', error);
  process.exit(1);
});
