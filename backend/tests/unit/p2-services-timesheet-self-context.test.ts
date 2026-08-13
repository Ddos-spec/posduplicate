import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('P2 Services self timesheet context contract', () => {
  const controller = read('src/modules/fnb/controllers/services-timesheet-self-context.p2.controller.ts');
  const routes = read('src/modules/fnb/routes/services.routes.ts');

  test('self context is protected by timesheet self capability rather than project read', () => {
    expect(routes).toContain("router.get('/timesheets/me/context', requireCapability('services.timesheet.self'), getMyServiceTimesheetContext)");
  });

  test('employee identity comes from authenticated user and tenant', () => {
    expect(controller).toContain('tenant_id: tenantId, user_id: userId, status: \'active\'');
    expect(controller).not.toContain('req.body.employeeId');
    expect(controller).not.toContain('req.query.employeeId');
  });

  test('context only exposes time-editable tenant projects and non-cancelled tasks', () => {
    expect(controller).toContain("status IN ('open','on_hold')");
    expect(controller).toContain("p.status IN ('open','on_hold')");
    expect(controller).toContain("t.status <> 'cancelled'");
    expect(controller).toContain('WHERE tenant_id = ${tenantId}');
    expect(controller).toContain('WHERE t.tenant_id = ${tenantId}');
  });
});
