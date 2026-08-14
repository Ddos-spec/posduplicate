import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Payroll-C2 final reconciliation and activation contracts', () => {
  const migration = read('prisma/migrations/20260813080000_p2_payroll_final_reconciliation/migration.sql');
  const engine = read('src/modules/accounting/services/payroll-final-reconciliation.p2.ts');
  const controller = read('src/modules/accounting/controllers/accounting.payroll-current.controller.ts');
  const routes = read('src/modules/accounting/routes/accounting.payroll-current.routes.ts');
  const accountingIndex = read('src/modules/accounting/index.ts');
  const runner = read('src/scripts/apply-p1-migrations.ts');
  const verifier = read('src/scripts/verify-p1-database-v2.ts');

  test('final-tax settings are explicit and unsupported tax-subjective cases remain blocked', () => {
    expect(migration).toContain('ptkp_status_year_start');
    expect(migration).toContain('tax_subjective_case');
    expect(migration).toContain('full_year_same_employer');
    expect(migration).toContain('zakat_via_employer_monthly');
    expect(controller).toContain('UNSUPPORTED_TAX_SUBJECTIVE_CASE');
    expect(controller).toContain('FULL_YEAR_EMPLOYMENT_NOT_PROVEN');
    expect(controller).toContain('PTKP_YEAR_START_REQUIRED');
  });

  test('final verification requires exact Jan-Nov immutable coverage and stable tax settings', () => {
    expect(routes).toContain("router.post('/periods/:periodId/final-verify'");
    expect(routes).toContain("requireCapability('workforce.payroll.manage')");
    expect(controller).toContain('confirmFullYearSameEmployer');
    expect(controller).toContain('FULL_YEAR_PRIOR_RUNS_REQUIRED');
    expect(controller).toContain('INVALID_PRIOR_RUN_COVERAGE');
    expect(controller).toContain('INCOMPLETE_PRIOR_MONTH_COVERAGE');
    expect(controller).toContain('EMPLOYEE_PRIOR_RUN_COVERAGE_REQUIRED');
    expect(controller).toContain('PRIOR_TAX_SETTINGS_DRIFT');
    expect(controller).toContain("tax_period_kind !== 'non_final'");
    expect(controller).toContain('observedMonths.size !== 11');
  });

  test('annual reconciliation uses PTKP, job expense, progressive Article 17 and explicit refund', () => {
    expect(engine).toContain('PTKP_ANNUAL');
    expect(engine).toContain('Math.min(Math.round(annualGross * 0.05), 6_000_000)');
    expect(engine).toContain('Math.floor(rawPkp / 1_000) * 1_000');
    expect(engine).toContain('calculateProgressiveArticle17Tax');
    expect(engine).toContain('finalWithholdingSigned = article17.tax - priorWithheld');
    expect(engine).toContain('withholdingDue = Math.max(0, finalWithholdingSigned)');
    expect(engine).toContain('refundDue = Math.max(0, -finalWithholdingSigned)');
    expect(engine).toContain('FULL_YEAR_SAME_EMPLOYER_FINAL_TAX_PERIOD');
  });

  test('tenant activation is transactional, locked, auditable and does not unblock legacy payroll', () => {
    expect(routes).toContain("router.post('/activate'");
    expect(controller).toContain('confirmTenantActivation');
    expect(controller).toContain('pg_advisory_xact_lock(${tenantId}, 76001)');
    expect(controller).toContain("tax_period_kind !== 'final'");
    expect(controller).toContain("status = 'retired'");
    expect(controller).toContain("'active'");
    expect(controller).toContain('payroll_profile_activation_events');
    expect(controller).toContain('TENANT_PROFILE_ACTIVE_BUT_LEGACY_CALCULATE_FINALIZE_STILL_BLOCKED');
    expect(accountingIndex).toContain('rejectLegacyPayrollMutation');
    expect(accountingIndex).toContain("'/payroll/periods/:periodId/calculate'");
    expect(accountingIndex).toContain("'/payroll/periods/:periodId/finalize'");
  });

  test('activation audit is append-only in PostgreSQL', () => {
    expect(migration).toContain('payroll_profile_activation_events');
    expect(migration).toContain('trg_payroll_profile_activation_event_append_only');
    expect(migration).toContain('prevent_suite_ledger_mutation');
    expect(verifier).toContain('payroll activation event UPDATE');
    expect(verifier).toContain('payroll activation event DELETE');
    expect(verifier).toContain('22 blocked mutations');
  });

  test('suite deployment retains final reconciliation through migration seventeen', () => {
    expect(runner).toContain('20260813080000_p2_payroll_final_reconciliation');
    expect(verifier).toContain('Expected 20 suite migration ledger entries');
    expect(verifier).toContain('payroll_profile_activation_events');
    expect(verifier).toContain('idx_payroll_profile_activation_tenant');
    expect(verifier).toContain('ux_payroll_profile_activation_run');
    expect(verifier).toContain('Global reference payroll profile v2 must remain draft');
  });
});
