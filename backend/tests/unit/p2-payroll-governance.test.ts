import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('P2 payroll governance safety', () => {
  test('payroll rate profile is effective-dated, versioned and seeded as draft only', () => {
    const migration = read('prisma/migrations/20260813030000_p2_payroll_rate_profiles/migration.sql');
    expect(migration).toContain('payroll_rate_profiles');
    expect(migration).toContain('effective_from');
    expect(migration).toContain('effective_to');
    expect(migration).toContain('version INTEGER');
    expect(migration).toContain("'ID-PAYROLL-2026'");
    expect(migration).toContain("'draft'");
    expect(migration).toContain("'PPH21_TER'");
    expect(migration).toContain('10547400');
    expect(migration).toContain('pending-current-rule-verification');
  });

  test('governance API is read-only and payroll-capability protected', () => {
    const routes = read('src/modules/accounting/routes/accounting.payroll-rate.routes.ts');
    const controller = read('src/modules/accounting/controllers/accounting.payroll-rate-profile.controller.ts');
    const accountingIndex = read('src/modules/accounting/index.ts');
    expect(routes).toContain('authMiddleware');
    expect(routes).toContain('tenantMiddleware');
    expect(routes).toContain("requireCapability('workforce.payroll.read')");
    expect(routes).not.toMatch(/router\.(post|put|patch|delete)\(/);
    expect(controller).toContain('NO_ACTIVE_PAYROLL_RATE_PROFILE');
    expect(controller).toContain("status = 'active'");
    expect(accountingIndex).toContain("router.use('/payroll/rates', accountingPayrollRateRoutes)");
  });

  test('legacy payroll calculation remains capability-gated while governance migration proceeds', () => {
    const routes = read('src/modules/accounting/routes/accounting.payroll.routes.ts');
    expect(routes).toContain("router.post('/periods/:periodId/calculate', requireCapability('workforce.payroll.manage'), calculatePayroll)");
    expect(routes).toContain("router.post('/periods/:periodId/finalize', requireCapability('workforce.payroll.manage'), finalizePayroll)");
  });
});
