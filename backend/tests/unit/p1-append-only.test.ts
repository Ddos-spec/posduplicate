import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('suite immutable audit guards', () => {
  test('append-only guard migration protects every P1 operational ledger', () => {
    const migration = read('prisma/migrations/20260812140000_p1_append_only_guards/migration.sql');
    expect(migration).toContain('prevent_suite_ledger_mutation');
    expect(migration).toContain('trg_loyalty_ledger_append_only');
    expect(migration).toContain('trg_warehouse_stock_ledger_append_only');
    expect(migration).toContain('trg_procurement_event_ledger_append_only');
    expect(migration).toMatch(/BEFORE UPDATE OR DELETE ON public\.loyalty_ledger/);
    expect(migration).toMatch(/BEFORE UPDATE OR DELETE ON public\.warehouse_stock_ledger/);
    expect(migration).toMatch(/BEFORE UPDATE OR DELETE ON public\.procurement_event_ledger/);
    expect(migration).toContain("ERRCODE = '55000'");
  });

  test('production migration runner includes P2 workforce and services migrations', () => {
    const runner = read('src/scripts/apply-p1-migrations.ts');
    expect(runner).toContain("'20260812140000_p1_append_only_guards'");
    expect(runner).toContain("'20260813023000_p2_workforce_attendance'");
    expect(runner).toContain("'20260813030000_p2_payroll_rate_profiles'");
    expect(runner).toContain("'20260813033000_p2_workforce_leave'");
    expect(runner).toContain("'20260813040000_p2_recruitment_core'");
    expect(runner).toContain("'20260813043000_p2_appraisals_core'");
    expect(runner).toContain("'20260813050000_p2_services_project_core'");
    expect(runner).toContain('checksum_sha256');
    expect(runner).toContain('Never edit an applied suite migration');
  });

  test('shared database verifier validates ten suite migrations and workforce/services objects', () => {
    const verifier = read('src/scripts/verify-p1-database-v2.ts');
    const suiteWorkflow = read('../.github/workflows/frontend-ci.yml');
    const runtimeWorkflow = read('../.github/workflows/p1-runtime-ci.yml');
    expect(verifier).toContain('ledger.rows.length === 10');
    expect(verifier).toContain('workforce_attendance_sessions');
    expect(verifier).toContain('payroll_rate_profiles');
    expect(verifier).toContain('workforce_leave_types');
    expect(verifier).toContain('workforce_leave_allocations');
    expect(verifier).toContain('workforce_leave_requests');
    expect(verifier).toContain('workforce_recruitment_vacancies');
    expect(verifier).toContain('workforce_recruitment_applicants');
    expect(verifier).toContain('workforce_recruitment_interviews');
    expect(verifier).toContain('workforce_recruitment_offers');
    expect(verifier).toContain('workforce_appraisal_cycles');
    expect(verifier).toContain('workforce_appraisals');
    expect(verifier).toContain('workforce_appraisal_goals');
    expect(verifier).toContain('service_projects');
    expect(verifier).toContain('service_project_tasks');
    expect(verifier).toContain('service_timesheet_entries');
    expect(verifier).toContain('service_planning_allocations');
    expect(verifier).toContain('reserved_days');
    expect(verifier).toContain('used_days');
    expect(verifier).toContain('hired_employee_id');
    expect(verifier).toContain('reviewer_user_id');
    expect(verifier).toContain('ux_workforce_attendance_open_employee');
    expect(verifier).toContain('ux_payroll_rate_profile_global_version');
    expect(verifier).toContain('idx_workforce_leave_request_scope');
    expect(verifier).toContain('ux_workforce_recruitment_applicant_email_vacancy');
    expect(verifier).toContain('ux_workforce_recruitment_hired_employee');
    expect(verifier).toContain('ux_workforce_recruitment_offer_accepted');
    expect(verifier).toContain('idx_workforce_appraisal_scope');
    expect(verifier).toContain('idx_workforce_appraisal_reviewer');
    expect(verifier).toContain('idx_service_project_scope');
    expect(verifier).toContain('idx_service_timesheet_employee');
    expect(verifier).toContain('idx_service_planning_employee');
    expect(verifier).toContain('trg_loyalty_ledger_append_only');
    expect(verifier).toContain('trg_warehouse_stock_ledger_append_only');
    expect(verifier).toContain('trg_procurement_event_ledger_append_only');
    expect(verifier).toContain("error?.code === '55000'");
    expect(suiteWorkflow).toContain('node dist/scripts/verify-p1-database-v2.js');
    expect(runtimeWorkflow).toContain('node dist/scripts/verify-p1-database-v2.js');
    expect(suiteWorkflow).toContain('Production backend Docker image build gate');
    expect(runtimeWorkflow).toContain('Backend production Docker build');
  });
});
