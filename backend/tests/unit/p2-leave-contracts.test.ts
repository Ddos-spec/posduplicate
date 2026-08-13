import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('P2 workforce leave contracts', () => {
  test('leave migration models types, allocations, requests and balance buckets', () => {
    const migration = read('prisma/migrations/20260813033000_p2_workforce_leave/migration.sql');
    expect(migration).toContain('workforce_leave_types');
    expect(migration).toContain('workforce_leave_allocations');
    expect(migration).toContain('workforce_leave_requests');
    expect(migration).toContain('reserved_days');
    expect(migration).toContain('used_days');
    expect(migration).toContain("status IN ('pending','approved','rejected','cancelled')");
  });

  test('self-service request is user-bound, overlap protected and reserves tracked balance', () => {
    const controller = read('src/modules/fnb/controllers/workforce-leave.p2.controller.ts');
    expect(controller).toContain('user_id: userId');
    expect(controller).toContain('LEAVE_REQUEST_OVERLAP');
    expect(controller).toContain('INSUFFICIENT_LEAVE_BALANCE');
    expect(controller).toContain('pg_advisory_xact_lock');
    expect(controller).toContain('FOR UPDATE');
    expect(controller).toContain('reserved_days = reserved_days +');
  });

  test('manager decision atomically moves or releases reservation and cannot double-resolve', () => {
    const controller = read('src/modules/fnb/controllers/workforce-leave.p2.controller.ts');
    expect(controller).toContain("request.status !== 'pending'");
    expect(controller).toContain('LEAVE_REQUEST_NOT_PENDING');
    expect(controller).toContain('reserved_days = reserved_days -');
    expect(controller).toContain('used_days = used_days +');
    expect(controller).toContain('LEAVE_REQUEST_CONCURRENT_UPDATE');
  });

  test('routes separate self-service, read and manager capabilities', () => {
    const routes = read('src/modules/fnb/routes/workforce.routes.ts');
    expect(routes).toContain("requireCapability('workforce.leave.self')");
    expect(routes).toContain("requireCapability('workforce.leave.read')");
    expect(routes).toContain("requireCapability('workforce.leave.manage')");
  });
});
