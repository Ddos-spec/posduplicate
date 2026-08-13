import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('P2 service-operation frontend context contracts', () => {
  const context = read('src/modules/fnb/controllers/services-operations-context.p2.controller.ts');
  const selfMessages = read('src/modules/fnb/controllers/services-helpdesk-self-messages.p2.controller.ts');
  const routes = read('src/modules/fnb/routes/services.routes.ts');

  test('each manager context uses its own manage capability', () => {
    expect(routes).toContain("router.get('/field-service/context', requireCapability('services.field_service.manage'), getFieldServiceContext)");
    expect(routes).toContain("router.get('/helpdesk/context', requireCapability('services.helpdesk.manage'), getHelpdeskContext)");
    expect(routes).toContain("router.get('/appointments/context', requireCapability('services.appointment.manage'), getAppointmentContext)");
  });

  test('contexts are tenant scoped and reuse existing masters', () => {
    expect(context).toContain('tenant_id: tenantId, status: \'active\'');
    expect(context).toContain('JOIN public.outlets o ON o.id = c.outlet_id AND o.tenant_id = ${tenantId}');
    expect(context).toContain('FROM public.service_projects');
    expect(context).toContain('FROM public.service_field_orders');
    expect(context).not.toContain('INSERT INTO public.customers');
    expect(context).not.toContain('INSERT INTO accounting.employees');
  });

  test('self helpdesk conversation read is assignment-bound', () => {
    expect(routes).toContain("router.get('/helpdesk/me/:id/messages', requireCapability('services.helpdesk.self'), getMyHelpdeskMessages)");
    expect(selfMessages).toContain('user_id: req.userId, status: \'active\'');
    expect(selfMessages).toContain('assigned_employee_id = ${employee.id}');
    expect(selfMessages).toContain('HELPDESK_ASSIGNMENT_MISMATCH');
    expect(selfMessages).not.toContain('req.body.employeeId');
  });
});
