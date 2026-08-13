import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Payroll frontend current-law context contracts', () => {
  const context = read('src/modules/accounting/controllers/accounting.payroll-current-context.controller.ts');
  const currentRoutes = read('src/modules/accounting/routes/accounting.payroll-current.routes.ts');
  const accountingIndex = read('src/modules/accounting/index.ts');

  test('readiness context is payroll-read capability gated and tenant scoped', () => {
    expect(currentRoutes).toContain("router.get('/context', requireCapability('workforce.payroll.read'), getPayrollCurrentContext)");
    expect(context).toContain("where: { tenant_id: tenantId, status: 'active' }");
    expect(context).toContain("where: { tenant_id: tenantId, is_active: true, category: 'ACCOUNT' }");
    expect(context).toContain('nik: true');
    expect(context).toContain('ptkp_status: true');
    expect(context).toContain('basic_salary: true');
  });

  test('period creation is intercepted by hardened tenant-serialized path', () => {
    expect(accountingIndex).toContain("'/payroll/periods'");
    expect(accountingIndex).toContain('createPayrollPeriodSafely');
    expect(accountingIndex).toContain("requireCapability('workforce.payroll.manage')");
    expect(context).toContain('PERIOD_CREATE_LOCK = 76002');
    expect(context).toContain('pg_advisory_xact_lock');
    expect(context).toContain('period_start: { lte: end }');
    expect(context).toContain('period_end: { gte: start }');
    expect(context).toContain('INVALID_PAYROLL_PERIOD_RANGE');
  });
});
