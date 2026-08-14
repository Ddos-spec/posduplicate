import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('P2.7 Helpdesk contracts', () => {
  const controller = read('src/modules/fnb/controllers/services-helpdesk.p2.controller.ts');
  const routes = read('src/modules/fnb/routes/services.routes.ts');
  const capability = read('src/middlewares/capability.middleware.ts');
  const migration = read('prisma/migrations/20260813060000_p2_helpdesk_core/migration.sql');
  const runner = read('src/scripts/apply-p1-migrations.ts');
  const verifier = read('src/scripts/verify-p1-database-v2.ts');

  test('helpdesk surfaces separate read, manager and assigned-agent capabilities', () => {
    expect(routes).toContain("requireCapability('services.helpdesk.read')");
    expect(routes).toContain("requireCapability('services.helpdesk.manage')");
    expect(routes).toContain("requireCapability('services.helpdesk.self')");
    expect(routes).toContain("/helpdesk/tickets/:id/assign");
    expect(routes).toContain("/helpdesk/me/:id/reply");
    expect(routes).toContain("/helpdesk/me/:id/status");
    expect(capability).toContain("'services.helpdesk.self'");
  });

  test('ticket model reuses existing customer/project/field-service/employee sources', () => {
    expect(migration).toContain('REFERENCES public.customers(id)');
    expect(migration).toContain('REFERENCES public.service_projects(id)');
    expect(migration).toContain('REFERENCES public.service_field_orders(id)');
    expect(migration).toContain('REFERENCES accounting.employees(id)');
    expect(controller).toContain('getTenantCustomer(tenantId, customerId)');
    expect(controller).toContain('assertProject');
    expect(controller).toContain('assertFieldOrder');
    expect(verifier).toContain('Helpdesk must reuse customer/project/Field Service/SLA sources');
    expect(verifier).toContain('Helpdesk must reuse accounting.employees source of truth');
  });

  test('SLA policies drive first-response/resolution deadlines and breach visibility', () => {
    expect(migration).toContain('first_response_minutes');
    expect(migration).toContain('resolution_minutes');
    expect(controller).toContain('getSlaPolicy');
    expect(controller).toContain('first_response_due_at');
    expect(controller).toContain('resolution_due_at');
    expect(controller).toContain('first_response_breached');
    expect(controller).toContain('resolution_breached');
  });

  test('ticket transitions are transactional, row locked and concurrency guarded', () => {
    expect(controller).toContain('TICKET_TRANSITIONS');
    expect(controller).toContain('AGENT_TRANSITIONS');
    expect(controller).toContain('FOR UPDATE');
    expect(controller).toContain('HELPDESK_CONCURRENT_UPDATE');
    expect(controller).toContain('HELPDESK_RESOLUTION_REQUIRED');
    expect(controller).toContain('HELPDESK_CANCELLATION_REASON_REQUIRED');
  });

  test('agent self-service derives employee from login and enforces assignment ownership', () => {
    expect(controller).toContain('getSelfEmployee(tenantId, userId)');
    expect(controller).toContain('HELPDESK_ASSIGNMENT_MISMATCH');
    expect(controller).toContain('assigned_employee_id = ${employee.id}');
    expect(controller).toContain("visibility === 'public'");
    expect(controller).toContain('first_responded_at = NOW()');
  });

  test('conversation and lifecycle audit are immutable at the database layer', () => {
    expect(migration).toContain('trg_service_helpdesk_message_append_only');
    expect(migration).toContain('trg_service_helpdesk_event_append_only');
    expect(migration).toContain('prevent_suite_ledger_mutation');
    expect(verifier).toContain('helpdesk message UPDATE');
    expect(verifier).toContain('helpdesk message DELETE');
    expect(verifier).toContain('helpdesk event UPDATE');
    expect(verifier).toContain('helpdesk event DELETE');
    expect(verifier).toContain('22 blocked mutations');
  });

  test('suite deployment retains Helpdesk through migration seventeen', () => {
    expect(runner).toContain('20260813060000_p2_helpdesk_core');
    expect(verifier).toContain('Expected 20 suite migration ledger entries');
    expect(verifier).toContain('service_helpdesk_sla_policies');
    expect(verifier).toContain('service_helpdesk_tickets');
    expect(verifier).toContain('service_helpdesk_messages');
    expect(verifier).toContain('service_helpdesk_events');
  });
});
