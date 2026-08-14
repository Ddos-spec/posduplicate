import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('P2 payroll governance safety', () => {
  test('payroll rate profile is effective-dated, versioned and remains draft until full engine verification', () => {
    const migration = read('prisma/migrations/20260813030000_p2_payroll_rate_profiles/migration.sql');
    expect(migration).toContain('payroll_rate_profiles');
    expect(migration).toContain('effective_from');
    expect(migration).toContain('effective_to');
    expect(migration).toContain('version INTEGER');
    expect(migration).toContain("'ID-PAYROLL-2026'");
    expect(migration).toContain("'draft'");
    expect(migration).toContain("'PPH21_TER'");
    expect(migration).toContain('pending-current-rule-verification');
  });

  test('governance API stays read-only and exposes capability-protected TER and PPU previews', () => {
    const routes = read('src/modules/accounting/routes/accounting.payroll-rate.routes.ts');
    const controller = read('src/modules/accounting/controllers/accounting.payroll-rate-profile.controller.ts');
    const accountingIndex = read('src/modules/accounting/index.ts');
    expect(routes).toContain('authMiddleware');
    expect(routes).toContain('tenantMiddleware');
    expect(routes).toContain("requireCapability('workforce.payroll.read')");
    expect(routes).toContain("router.get('/pph21/ter/monthly'");
    expect(routes).toContain("router.get('/statutory/ppu'");
    expect(routes).not.toMatch(/router\.(post|put|patch|delete)\(/);
    expect(controller).toContain('calculateBaseMonthlyTerPph21');
    expect(controller).toContain('calculatePpuStatutoryContributions');
    expect(controller).toContain('StatutoryContributionError');
    expect(controller).toContain('complianceNotice');
    expect(controller).toContain('NO_ACTIVE_PAYROLL_RATE_PROFILE');
    expect(controller).toContain("status = 'active'");
    expect(accountingIndex).toContain("router.use('/payroll/rates', accountingPayrollRateRoutes)");
  });

  test('verified TER rules are externalized away from the legacy payroll controller', () => {
    const rules = read('src/modules/accounting/services/payroll-current-law.p2.ts');
    expect(rules).toContain('ID-PPH21-BASE-PP58-2023');
    expect(rules).toContain('BASE_MONTHLY_TER_NON_FINAL_TAX_PERIOD');
    expect(rules).toContain('30_050_000');
    expect(rules).toContain('27_700_000');
    expect(rules).toContain('32_600_000');
    expect(rules).toContain('1_419_000_000');
    expect(rules).toContain('DAILY_TER_LIMIT_EXCEEDED');
    expect(rules).toContain('UNSUPPORTED_PTKP_FOR_MONTHLY_TER');
  });

  test('PPU statutory rules are externalized and exclude BPU-only relief', () => {
    const rules = read('src/modules/accounting/services/payroll-statutory.p2.ts');
    expect(rules).toContain('ID-PPU-STATUTORY-2026-V1');
    expect(rules).toContain('BASIC_SALARY_PLUS_FIXED_ALLOWANCES');
    expect(rules).toContain('10_547_400');
    expect(rules).toContain('12_000_000');
    expect(rules).toContain('HEALTH_MINIMUM_WAGE_REQUIRED');
    expect(rules).toContain('BPU-specific temporary relief');
  });

  test('global verified component profile v2 stays draft while tenant activation is controlled', () => {
    const migration = read('prisma/migrations/20260813070000_p2_payroll_current_profile/migration.sql');
    const activationMigration = read('prisma/migrations/20260813080000_p2_payroll_final_reconciliation/migration.sql');
    const runner = read('src/scripts/apply-p1-migrations.ts');
    const verifier = read('src/scripts/verify-p1-database-v2.ts');
    expect(migration).toContain("'ID-PAYROLL-2026'");
    expect(migration).toContain("  2,");
    expect(migration).toContain("'draft'");
    expect(migration).toContain('verified-components-awaiting-engine-wiring');
    expect(migration).toContain("'bpuReliefApplied', false");
    expect(migration).toContain('APPLICABLE_UMK_OR_UMP_REQUIRED');
    expect(migration).toContain("'activationGuard'");
    expect(activationMigration).toContain('payroll_profile_activation_events');
    expect(runner).toContain('20260813080000_p2_payroll_final_reconciliation');
    expect(verifier).toContain('Expected 20 suite migration ledger entries');
    expect(verifier).toContain('Global reference payroll profile v2 must remain draft');
  });

  test('legacy payroll calculate and finalize stay capability-gated and fail closed', () => {
    const routes = read('src/modules/accounting/routes/accounting.payroll.routes.ts');
    const accountingIndex = read('src/modules/accounting/index.ts');
    const controller = read('src/modules/accounting/controllers/accounting.payroll-rate-profile.controller.ts');
    expect(routes).toContain("router.post('/periods/:periodId/calculate', requireCapability('workforce.payroll.manage'), calculatePayroll)");
    expect(routes).toContain("router.post('/periods/:periodId/finalize', requireCapability('workforce.payroll.manage'), finalizePayroll)");
    expect(accountingIndex).toContain("'/payroll/periods/:periodId/calculate'");
    expect(accountingIndex).toContain("'/payroll/periods/:periodId/finalize'");
    expect(accountingIndex).toContain("requireCapability('workforce.payroll.manage')");
    expect(accountingIndex).toContain('rejectLegacyPayrollMutation');
    expect(controller).toContain('CURRENT_PAYROLL_ENGINE_NOT_WIRED');
  });
});
