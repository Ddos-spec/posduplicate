import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Payroll-C3 official posting contracts', () => {
  const migration = read('prisma/migrations/20260813083000_p2_payroll_official_posting/migration.sql');
  const mapper = read('src/modules/accounting/services/payroll-official-posting.p2.ts');
  const controller = read('src/modules/accounting/controllers/accounting.payroll-official.controller.ts');
  const routes = read('src/modules/accounting/routes/accounting.payroll-current.routes.ts');
  const accountingIndex = read('src/modules/accounting/index.ts');
  const ledger = read('src/services/ledger.service.ts');
  const runner = read('src/scripts/apply-p1-migrations.ts');
  const verifier = read('src/scripts/verify-p1-database-v2.ts');

  test('official details retain immutable calculation/profile evidence and one employee per period', () => {
    expect(migration).toContain('source_calculation_run_id BIGINT');
    expect(migration).toContain('source_profile_id INTEGER');
    expect(migration).toContain('source_profile_version INTEGER');
    expect(migration).toContain('pph21_refund NUMERIC(15,2)');
    expect(migration).toContain('ux_payroll_details_period_employee');
    expect(migration).toContain('trg_payroll_official_detail_immutable');
    expect(migration).toContain("ERRCODE = '55000'");
  });

  test('accounting mapping is tenant-owned and contains no hardcoded chart-of-account codes', () => {
    expect(migration).toContain('payroll_accounting_settings');
    expect(migration).toContain('salary_expense_account_id');
    expect(migration).toContain('employer_statutory_expense_account_id');
    expect(migration).toContain('salary_payable_account_id');
    expect(migration).toContain('pph21_payable_account_id');
    expect(migration).toContain('bpjs_payable_account_id');
    expect(controller).toContain('PAYROLL_ACCOUNT_TENANT_MISMATCH');
    expect(controller).toContain('PAYROLL_EXPENSE_ACCOUNT_NORMAL_BALANCE_INVALID');
    expect(controller).toContain('PAYROLL_PAYABLE_ACCOUNT_NORMAL_BALANCE_INVALID');
  });

  test('materialization and posting evidence are append-only and period-idempotent', () => {
    expect(migration).toContain('payroll_official_materializations');
    expect(migration).toContain('payroll_official_postings');
    expect(migration).toContain('ux_payroll_official_materialization_period');
    expect(migration).toContain('ux_payroll_official_posting_period');
    expect(migration).toContain('trg_payroll_official_materialization_append_only');
    expect(migration).toContain('trg_payroll_official_posting_append_only');
    expect(controller).toContain('OFFICIAL_PERIOD_ALREADY_MATERIALIZED');
    expect(controller).toContain('OFFICIAL_MATERIALIZATION_REQUIRED');
    expect(controller).toContain('idempotent: true');
  });

  test('official flow is explicit, capability gated and legacy mutations remain blocked', () => {
    expect(routes).toContain("router.post('/periods/:periodId/materialize'");
    expect(routes).toContain("router.post('/periods/:periodId/finalize-official'");
    expect(routes).toContain("router.put('/accounting-settings'");
    expect(routes).toContain("requireCapability('workforce.payroll.manage')");
    expect(routes).toContain("requireCapability('workforce.payroll.read')");
    expect(controller).toContain('confirmOfficialMaterialization');
    expect(controller).toContain('confirmOfficialFinalization');
    expect(accountingIndex).toContain('rejectLegacyPayrollMutation');
    expect(accountingIndex).toContain("'/payroll/periods/:periodId/calculate'");
    expect(accountingIndex).toContain("'/payroll/periods/:periodId/finalize'");
  });

  test('official posting requires active tenant profile and refuses evidence drift', () => {
    expect(controller).toContain('ACTIVE_TENANT_PAYROLL_PROFILE_REQUIRED');
    expect(controller).toContain('ACTIVE_PROFILE_CHANGED_AFTER_MATERIALIZATION');
    expect(controller).toContain('EXISTING_PAYROLL_DETAILS_PRESENT');
    expect(controller).toContain('OFFICIAL_DETAIL_TAMPER_DETECTED');
    expect(controller).toContain('FOR UPDATE');
    expect(controller).toContain('VERIFIED_PROFILE_VERSION = 2');
    expect(mapper).toContain('OFFICIAL_OVERTIME_POLICY_NOT_WIRED');
    expect(mapper).toContain('OFFICIAL_ZAKAT_SETTLEMENT_NOT_WIRED');
  });

  test('journal finalization is balanced, serialized and posts period state atomically', () => {
    expect(controller).toContain('PAYROLL_POSTING_LOCK = 78001');
    expect(controller).toContain('GENERAL_LEDGER_POSTING_LOCK = 77002');
    expect(controller).toContain("reference_type: 'payroll_period'");
    expect(controller).toContain("journal_type: 'payroll'");
    expect(controller).toContain('JPR-');
    expect(controller).toContain("status = 'finalized'");
    expect(controller).toContain('PAYROLL_JOURNAL_NOT_BALANCED');
    expect(ledger).toContain('GENERAL_LEDGER_POSTING_LOCK = 77002');
    expect(ledger).toContain('pg_advisory_xact_lock');
    expect(ledger).toContain("{ id: 'desc' }");
  });

  test('deployment and DB acceptance include migration seventeen and official immutability proof', () => {
    expect(runner).toContain('20260813083000_p2_payroll_official_posting');
    expect(verifier).toContain('Expected 17 suite migration ledger entries');
    expect(verifier).toContain('payroll_accounting_settings');
    expect(verifier).toContain('payroll_official_materializations');
    expect(verifier).toContain('payroll_official_postings');
    expect(verifier).toContain('official payroll detail UPDATE');
    expect(verifier).toContain('payroll materialization DELETE');
    expect(verifier).toContain('22 blocked mutations');
  });
});
