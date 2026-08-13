import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('P2.8 Appointments contracts', () => {
  const controller = read('src/modules/fnb/controllers/services-appointments.p2.controller.ts');
  const routes = read('src/modules/fnb/routes/services.routes.ts');
  const capability = read('src/middlewares/capability.middleware.ts');
  const migration = read('prisma/migrations/20260813063000_p2_appointments_core/migration.sql');
  const runner = read('src/scripts/apply-p1-migrations.ts');
  const verifier = read('src/scripts/verify-p1-database-v2.ts');

  test('appointments separate read, manager and self-service capabilities', () => {
    expect(routes).toContain("requireCapability('services.appointment.read')");
    expect(routes).toContain("requireCapability('services.appointment.manage')");
    expect(routes).toContain("requireCapability('services.appointment.self')");
    expect(routes).toContain("router.get('/appointments/me'");
    expect(routes).toContain("router.post('/appointments/me/:id/check-in'");
    expect(routes).toContain("router.post('/appointments/me/:id/complete'");
    expect(capability).toContain("'services.appointment.read'");
    expect(capability).toContain("'services.appointment.manage'");
    expect(capability).toContain("'services.appointment.self'");
  });

  test('appointment model reuses customer, employee and shared Planning sources', () => {
    expect(migration).toContain('REFERENCES public.customers(id)');
    expect(migration).toContain('REFERENCES accounting.employees(id)');
    expect(migration).toContain('REFERENCES public.service_planning_allocations(id)');
    expect(migration).toContain('planning_allocation_id INTEGER NOT NULL UNIQUE');
    expect(controller).toContain('getCustomer(tenantId, customerId)');
    expect(controller).toContain('assertEmployee(tenantId, employeeId)');
    expect(verifier).toContain('Appointments must reuse accounting.employees source of truth');
    expect(verifier).toContain('Appointments must reuse customer/type/Planning sources');
  });

  test('booking and rescheduling share Planning concurrency lock and reject double booking', () => {
    expect(controller).toContain('pg_advisory_xact_lock(${tenantId}, 74001)');
    expect(controller).toContain("status IN ('planned','confirmed')");
    expect(controller).toContain('start_at < ${endAt}');
    expect(controller).toContain('end_at > ${startAt}');
    expect(controller).toContain('PLANNING_OVERLAP');
    expect(controller).toContain('INSERT INTO public.service_planning_allocations');
    expect(controller).toContain('excludePlanningId');
    expect(controller).toContain('planning_allocation_id');
  });

  test('appointment type duration and buffers are snapshotted per booking', () => {
    expect(migration).toContain('duration_minutes INTEGER NOT NULL');
    expect(migration).toContain('buffer_before_minutes INTEGER NOT NULL DEFAULT 0');
    expect(migration).toContain('buffer_after_minutes INTEGER NOT NULL DEFAULT 0');
    expect(controller).toContain('duration_minutes, buffer_before_minutes');
    expect(controller).toContain('buffer_after_minutes');
    expect(controller).toContain('Number(current.duration_minutes)');
    expect(controller).toContain('Number(current.buffer_before_minutes || 0)');
    expect(controller).toContain('Number(current.buffer_after_minutes || 0)');
  });

  test('lifecycle is terminal-safe, row locked and concurrency guarded', () => {
    expect(routes).toContain("/appointments/:id/confirm");
    expect(routes).toContain("/appointments/:id/reschedule");
    expect(routes).toContain("/appointments/:id/check-in");
    expect(routes).toContain("/appointments/:id/complete");
    expect(routes).toContain("/appointments/:id/no-show");
    expect(routes).toContain("/appointments/:id/cancel");
    expect(controller).toContain('FOR UPDATE');
    expect(controller).toContain('INVALID_APPOINTMENT_TRANSITION');
    expect(controller).toContain('APPOINTMENT_CONCURRENT_UPDATE');
    expect(controller).toContain('APPOINTMENT_PLANNING_CONCURRENT_UPDATE');
    expect(controller).toContain('APPOINTMENT_CANCELLATION_REASON_REQUIRED');
  });

  test('staff self-service derives employee from login and enforces assignment ownership', () => {
    expect(controller).toContain('getSelfEmployee(tenantId, userId)');
    expect(controller).toContain('APPOINTMENT_ASSIGNMENT_MISMATCH');
    expect(controller).toContain('Number(current.assigned_employee_id) !== employee.id');
    expect(controller).toContain("operationalTransition(req, 'checked_in', true)");
    expect(controller).toContain("operationalTransition(req, 'completed', true)");
  });

  test('appointment lifecycle event ledger is immutable in PostgreSQL', () => {
    expect(migration).toContain('service_appointment_events');
    expect(migration).toContain('trg_service_appointment_event_append_only');
    expect(migration).toContain('prevent_suite_ledger_mutation');
    expect(verifier).toContain('appointment event UPDATE');
    expect(verifier).toContain('appointment event DELETE');
    expect(verifier).toContain('18 blocked mutations');
  });

  test('suite deployment includes Appointments before payroll migration sixteen', () => {
    expect(runner).toContain('20260813063000_p2_appointments_core');
    expect(verifier).toContain('Expected 16 suite migration ledger entries');
    expect(verifier).toContain('service_appointment_types');
    expect(verifier).toContain('service_appointments');
    expect(verifier).toContain('service_appointment_events');
  });
});
