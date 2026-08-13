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
  'service_field_orders', 'service_field_events',
  'service_helpdesk_sla_policies', 'service_helpdesk_tickets', 'service_helpdesk_messages', 'service_helpdesk_events',
] as const;

const REQUIRED_TRIGGERS = [
  'trg_loyalty_ledger_append_only',
  'trg_warehouse_stock_ledger_append_only',
  'trg_procurement_event_ledger_append_only',
  'trg_service_field_event_append_only',
  'trg_service_helpdesk_message_append_only',
  'trg_service_helpdesk_event_append_only',
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
    assert(ledger.rows.length === 12, `Expected 12 suite migration ledger entries, found ${ledger.rows.length}`);
    assert(ledger.rows.every((row) => row.checksum_sha256?.length === 64), 'Invalid suite migration checksum');
    assert(ledger.rows.some((row) => row.migration_name === '20260813023000_p2_workforce_attendance'), 'P2 workforce migration missing from ledger');
    assert(ledger.rows.some((row) => row.migration_name === '20260813030000_p2_payroll_rate_profiles'), 'P2 payroll profile migration missing from ledger');
    assert(ledger.rows.some((row) => row.migration_name === '20260813033000_p2_workforce_leave'), 'P2 workforce leave migration missing from ledger');
    assert(ledger.rows.some((row) => row.migration_name === '20260813040000_p2_recruitment_core'), 'P2 recruitment migration missing from ledger');
    assert(ledger.rows.some((row) => row.migration_name === '20260813043000_p2_appraisals_core'), 'P2 appraisals migration missing from ledger');
    assert(ledger.rows.some((row) => row.migration_name === '20260813050000_p2_services_project_core'), 'P2 services project migration missing from ledger');
    assert(ledger.rows.some((row) => row.migration_name === '20260813054000_p2_field_service_core'), 'P2 field service migration missing from ledger');
    assert(ledger.rows.some((row) => row.migration_name === '20260813060000_p2_helpdesk_core'), 'P2 helpdesk migration missing from ledger');

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

    const fieldColumns = await client.query<{ table_name: string; column_name: string }>(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND ((table_name = 'service_field_orders' AND column_name IN ('customer_id','project_id','task_id','planning_allocation_id','assigned_employee_id','status','scheduled_start','scheduled_end','resolution_note'))
          OR (table_name = 'service_field_events' AND column_name IN ('field_order_id','event_type','employee_id','latitude','longitude')))
    `);
    assert(fieldColumns.rows.length === 14, 'Field Service lifecycle/audit columns are incomplete');

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

    const helpdeskColumns = await client.query<{ table_name: string; column_name: string }>(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND ((table_name = 'service_helpdesk_sla_policies' AND column_name IN ('priority','first_response_minutes','resolution_minutes','is_active'))
          OR (table_name = 'service_helpdesk_tickets' AND column_name IN ('customer_id','project_id','field_order_id','sla_policy_id','assigned_employee_id','status','first_response_due_at','resolution_due_at','first_responded_at','resolution_note'))
          OR (table_name = 'service_helpdesk_messages' AND column_name IN ('ticket_id','author_employee_id','direction','visibility','body'))
          OR (table_name = 'service_helpdesk_events' AND column_name IN ('ticket_id','event_type','employee_id','payload')))
    `);
    assert(helpdeskColumns.rows.length === 23, 'Helpdesk SLA/ticket/conversation lifecycle columns are incomplete');

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

      const fieldTenant = await client.query<{ id: number }>(`
        INSERT INTO public.tenants (business_name, owner_name, email, subscription_status, is_active)
        VALUES ('Field Verify Business', 'Field Verify Owner', 'field-verifier@example.invalid', 'active', TRUE)
        RETURNING id
      `);
      const fieldTenantId = Number(fieldTenant.rows[0].id);
      const fieldOutlet = await client.query<{ id: number }>(`INSERT INTO public.outlets (tenant_id, name) VALUES ($1, 'Field Verify Outlet') RETURNING id`, [fieldTenantId]);
      const fieldCustomer = await client.query<{ id: number }>(`INSERT INTO public.customers (name, outlet_id) VALUES ('Field Verify Customer', $1) RETURNING id`, [fieldOutlet.rows[0].id]);
      const fieldOrder = await client.query<{ id: number }>(`INSERT INTO public.service_field_orders (tenant_id, outlet_id, customer_id, code, title, service_address, status) VALUES ($1, $2, $3, 'VERIFY-FIELD', 'Verify Field Order', 'Verification address', 'draft') RETURNING id`, [fieldTenantId, fieldOutlet.rows[0].id, fieldCustomer.rows[0].id]);
      const fieldEvent = await client.query<{ id: number }>(`INSERT INTO public.service_field_events (tenant_id, field_order_id, event_type, notes) VALUES ($1, $2, 'created', 'suite immutable verification') RETURNING id`, [fieldTenantId, fieldOrder.rows[0].id]);

      const helpdeskSla = await client.query<{ id: number }>(`INSERT INTO public.service_helpdesk_sla_policies (tenant_id, name, priority, first_response_minutes, resolution_minutes) VALUES ($1, 'Verify SLA', 'normal', 30, 240) RETURNING id`, [fieldTenantId]);
      const helpdeskTicket = await client.query<{ id: number }>(`INSERT INTO public.service_helpdesk_tickets (tenant_id, outlet_id, customer_id, field_order_id, sla_policy_id, code, subject, channel, priority, status) VALUES ($1, $2, $3, $4, $5, 'VERIFY-HELP', 'Verify Helpdesk Ticket', 'internal', 'normal', 'new') RETURNING id`, [fieldTenantId, fieldOutlet.rows[0].id, fieldCustomer.rows[0].id, fieldOrder.rows[0].id, helpdeskSla.rows[0].id]);
      const helpdeskMessage = await client.query<{ id: number }>(`INSERT INTO public.service_helpdesk_messages (tenant_id, ticket_id, direction, visibility, body) VALUES ($1, $2, 'internal', 'internal', 'suite immutable verification') RETURNING id`, [fieldTenantId, helpdeskTicket.rows[0].id]);
      const helpdeskEvent = await client.query<{ id: number }>(`INSERT INTO public.service_helpdesk_events (tenant_id, ticket_id, event_type, payload) VALUES ($1, $2, 'created', '{}'::jsonb) RETURNING id`, [fieldTenantId, helpdeskTicket.rows[0].id]);

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
      ] as const;
      for (let index = 0; index < checks.length; index += 1) await expectMutationBlocked(client, checks[index][0], checks[index][1], index);
      await client.query('ROLLBACK');
    } catch (error) { await client.query('ROLLBACK'); throw error; }

    console.log(`Suite DB verified: ${REQUIRED_TABLES.length} tables, ${ledger.rows.length} migrations, ${REQUIRED_TRIGGERS.length} immutable triggers, ${REQUIRED_INDEXES.length} suite indexes, payroll governance draft present, workforce leave balances present, recruitment lifecycle present, appraisal lifecycle present, services project/timesheet/planning lifecycle present, field service lifecycle/audit present, helpdesk SLA/ticket/conversation lifecycle present, 12 blocked mutations.`);
  } finally { await client.end(); }
}

run().catch((error) => { console.error('[Suite DB verification] failed', error); process.exit(1); });
