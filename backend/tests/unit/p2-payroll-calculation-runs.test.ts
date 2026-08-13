import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Payroll-C1 profile-driven verification contracts', () => {
  const migration = read('prisma/migrations/20260813073000_p2_payroll_calculation_runs/migration.sql');
  const engine = read('src/modules/accounting/services/payroll-current-engine.p2.ts');
  const controller = read('src/modules/accounting/controllers/accounting.payroll-current.controller.ts');
  const routes = read('src/modules/accounting/routes/accounting.payroll-current.routes.ts');
  const accountingIndex = read('src/modules/accounting/index.ts');
  const runner = read('src/scripts/apply-p1-migrations.ts');
  const verifier = read('src/scripts/verify-p1-database-v2.ts');

  test('calculation evidence and employee statutory settings reuse existing payroll sources', () => {
    expect(migration).toContain('payroll_employee_statutory_settings');
    expect(migration).toContain('payroll_calculation_runs');
    expect(migration).toContain('REFERENCES accounting.employees(id)');
    expect(migration).toContain('REFERENCES accounting.payroll_periods(id)');
    expect(migration).toContain('REFERENCES public.payroll_rate_profiles(id)');
    expect(migration).toContain('rules_snapshot JSONB NOT NULL');
    expect(migration).toContain('input_snapshot JSONB NOT NULL');
    expect(migration).toContain('output_snapshot JSONB NOT NULL');
  });

  test('calculation runs are immutable at the database layer', () => {
    expect(migration).toContain('trg_payroll_calculation_run_append_only');
    expect(migration).toContain('prevent_suite_ledger_mutation');
    expect(verifier).toContain('payroll calculation run UPDATE');
    expect(verifier).toContain('payroll calculation run DELETE');
    expect(verifier).toContain('16 blocked mutations');
  });

  test('verification engine uses correct TER gross composition and rejects legacy overtime shortcut', () => {
    expect(engine).toContain('statutory.components.jkk.employer');
    expect(engine).toContain('statutory.components.jkm.employer');
    expect(engine).toContain('statutory.components.health.employer');
    expect(engine).toContain('monthlyTerGross = cashGross + taxableEmployerBenefits');
    expect(engine).toContain('OVERTIME_COMPENSATION_POLICY_NOT_WIRED');
    expect(engine).toContain('EMPLOYEE_NIK_REQUIRED_FOR_VERIFICATION');
    expect(engine).not.toContain('1.5');
  });

  test('verification endpoint is capability-gated, explicit-profile and non-final only', () => {
    expect(routes).toContain("requireCapability('workforce.payroll.read')");
    expect(routes).toContain("requireCapability('workforce.payroll.manage')");
    expect(routes).toContain("router.post('/periods/:periodId/verify'");
    expect(controller).toContain('PROFILE_ID_REQUIRED');
    expect(controller).toContain('confirmNonFinalTaxPeriod');
    expect(controller).toContain('NON_FINAL_TAX_PERIOD_CONFIRMATION_REQUIRED');
    expect(controller).toContain('FINAL_TAX_PERIOD_RECONCILIATION_REQUIRED');
    expect(controller).toContain("profile.profile_code !== 'ID-PAYROLL-2026'");
    expect(controller).toContain('EMPLOYEE_STATUTORY_SETTINGS_REQUIRED');
    expect(controller).toContain('VERIFICATION_ONLY_NO_PAYROLL_DETAILS_WRITTEN');
    expect(controller).not.toContain('tx.payroll_details');
    expect(accountingIndex).toContain("router.use('/payroll/current', accountingPayrollCurrentRoutes)");
  });

  test('legacy official payroll mutation remains fail-closed during C1', () => {
    expect(accountingIndex).toContain("'/payroll/periods/:periodId/calculate'");
    expect(accountingIndex).toContain("'/payroll/periods/:periodId/finalize'");
    expect(accountingIndex).toContain('rejectLegacyPayrollMutation');
  });

  test('suite deploy path includes migration fifteen and DB verifier accepts it', () => {
    expect(runner).toContain('20260813073000_p2_payroll_calculation_runs');
    expect(verifier).toContain('Expected 15 suite migration ledger entries');
    expect(verifier).toContain('payroll_employee_statutory_settings');
    expect(verifier).toContain('payroll_calculation_runs');
    expect(verifier).toContain('trg_payroll_calculation_run_append_only');
  });
});
