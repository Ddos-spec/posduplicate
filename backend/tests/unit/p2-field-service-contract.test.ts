import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('P2.6 Field Service contracts', () => {
  const controller = read('src/modules/fnb/controllers/services-field-service.p2.controller.ts');
  const routes = read('src/modules/fnb/routes/services.routes.ts');
  const capability = read('src/middlewares/capability.middleware.ts');
  const migration = read('prisma/migrations/20260813054000_p2_field_service_core/migration.sql');
  const runner = read('src/scripts/apply-p1-migrations.ts');
  const verifier = read('src/scripts/verify-p1-database-v2.ts');

  test('field service routes separate manager/read/self capabilities', () => {
    expect(routes).toContain("requireCapability('services.field_service.read')");
    expect(routes).toContain("requireCapability('services.field_service.manage')");
    expect(routes).toContain("requireCapability('services.field_service.self')");
    expect(routes).toContain("/field-service/orders/:id/schedule");
    expect(routes).toContain("/field-service/:id/depart");
    expect(routes).toContain("/field-service/:id/arrive");
    expect(routes).toContain("/field-service/:id/complete");
    expect(capability).toContain("'services.field_service.self'");
  });

  test('field orders reuse existing customer, project, planning and employee sources', () => {
    expect(migration).toContain('REFERENCES public.customers(id)');
    expect(migration).toContain('REFERENCES public.service_projects(id)');
    expect(migration).toContain('REFERENCES public.service_planning_allocations(id)');
    expect(migration).toContain('REFERENCES accounting.employees(id)');
    expect(controller).toContain('getTenantCustomer(tenantId, customerId)');
    expect(controller).toContain('assertProjectTask');
    expect(verifier).toContain('Field Service must reuse Services Planning allocations');
    expect(verifier).toContain('Field Service must reuse accounting.employees source of truth');
  });

  test('scheduling shares planning concurrency lock and rejects double booking', () => {
    expect(controller).toContain('pg_advisory_xact_lock(${tenantId}, 74001)');
    expect(controller).toContain("status IN ('planned','confirmed')");
    expect(controller).toContain('start_at < ${endAt} AND end_at > ${startAt}');
    expect(controller).toContain('PLANNING_OVERLAP');
    expect(controller).toContain('INSERT INTO public.service_planning_allocations');
    expect(controller).toContain("'confirmed'");
  });

  test('technician self-service is assignment-bound and terminal-safe', () => {
    expect(controller).toContain('getSelfEmployee(tenantId, userId)');
    expect(controller).toContain('FIELD_ASSIGNMENT_MISMATCH');
    expect(controller).toContain('INVALID_FIELD_ORDER_TRANSITION');
    expect(controller).toContain('FIELD_RESOLUTION_REQUIRED');
    expect(controller).toContain('FOR UPDATE');
    expect(controller).toContain('FIELD_ORDER_CONCURRENT_UPDATE');
    expect(controller).toContain("targetStatus === 'completed'");
  });

  test('field lifecycle events are immutable and may capture paired coordinates', () => {
    expect(migration).toContain('service_field_events');
    expect(migration).toContain('trg_service_field_event_append_only');
    expect(migration).toContain('prevent_suite_ledger_mutation');
    expect(migration).toContain('service_field_event_coordinate_pair');
    expect(controller).toContain('FIELD_COORDINATE_PAIR_REQUIRED');
    expect(controller).toContain('insertFieldEvent');
    expect(routes).toContain("/field-service/orders/:id/events");
  });

  test('suite deployment and verifier retain Field Service through migration seventeen', () => {
    expect(runner).toContain('20260813054000_p2_field_service_core');
    expect(verifier).toContain('Expected 17 suite migration ledger entries');
    expect(verifier).toContain('service_field_orders');
    expect(verifier).toContain('service_field_events');
    expect(verifier).toContain('trg_service_field_event_append_only');
    expect(verifier).toContain('22 blocked mutations');
  });
});
