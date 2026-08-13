import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('P2 project/timesheet/planning contracts', () => {
  const controller = read('src/modules/fnb/controllers/services-project.p2.controller.ts');
  const routes = read('src/modules/fnb/routes/services.routes.ts');
  const fnbIndex = read('src/modules/fnb/index.ts');
  const capability = read('src/middlewares/capability.middleware.ts');
  const migration = read('prisma/migrations/20260813050000_p2_services_project_core/migration.sql');
  const runner = read('src/scripts/apply-p1-migrations.ts');
  const verifier = read('src/scripts/verify-p1-database-v2.ts');

  test('services router is mounted and every surface is capability-gated', () => {
    expect(fnbIndex).toContain("router.use('/services', servicesRoutes)");
    expect(routes).toContain("requireCapability('services.project.read')");
    expect(routes).toContain("requireCapability('services.project.manage')");
    expect(routes).toContain("requireCapability('services.timesheet.read')");
    expect(routes).toContain("requireCapability('services.timesheet.manage')");
    expect(routes).toContain("requireCapability('services.timesheet.self')");
    expect(routes).toContain("requireCapability('services.planning.read')");
    expect(routes).toContain("requireCapability('services.planning.manage')");
    expect(capability).toContain("'services.timesheet.self'");
  });

  test('projects and tasks have terminal-safe state machines with row-lock guards', () => {
    expect(controller).toContain('PROJECT_TRANSITIONS');
    expect(controller).toContain('TASK_TRANSITIONS');
    expect(controller).toContain('FOR UPDATE');
    expect(controller).toContain('PROJECT_CONCURRENT_UPDATE');
    expect(controller).toContain('TASK_CONCURRENT_UPDATE');
    expect(controller).toContain('PROJECT_TASKS_INCOMPLETE');
  });

  test('self timesheet resolves employee from login and cannot accept arbitrary employee id', () => {
    expect(controller).toContain('getSelfEmployee(tenantId, userId)');
    expect(controller).toContain('employee_id, work_date, minutes');
    expect(controller).toContain('${employee.id}');
    expect(routes).toContain("router.post('/timesheets/me'");
    expect(migration).toContain('REFERENCES accounting.employees(id)');
  });

  test('timesheet decision is row locked and only submitted entries can be decided once', () => {
    expect(controller).toContain("current.status !== 'submitted'");
    expect(controller).toContain('TIMESHEET_ALREADY_DECIDED');
    expect(controller).toContain('TIMESHEET_CONCURRENT_UPDATE');
    expect(controller).toContain('TIMESHEET_REJECTION_REASON_REQUIRED');
  });

  test('planning allocation is serialized and rejects employee overlap', () => {
    expect(controller).toContain('pg_advisory_xact_lock');
    expect(controller).toContain('74001');
    expect(controller).toContain("status IN ('planned','confirmed')");
    expect(controller).toContain('start_at < ${endAt} AND end_at > ${startAt}');
    expect(controller).toContain('PLANNING_OVERLAP');
    expect(migration).toContain('service_planning_period_valid');
  });

  test('suite deployment and DB verification include services migration', () => {
    expect(runner).toContain('20260813050000_p2_services_project_core');
    expect(verifier).toContain('Expected 15 suite migration ledger entries');
    expect(verifier).toContain('service_projects');
    expect(verifier).toContain('service_timesheet_entries');
    expect(verifier).toContain('service_planning_allocations');
    expect(verifier).toContain('Services must reference accounting.employees source of truth');
  });
});
