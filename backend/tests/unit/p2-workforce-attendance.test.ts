import {
  clockInSelf,
  clockOutSelf,
  getEmployeeDirectory,
  getMyAttendance,
} from '../../src/modules/fnb/controllers/workforce.p2.controller';
import prisma from '../../src/utils/prisma';

jest.mock('../../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    outlets: { findFirst: jest.fn() },
    employees: { findFirst: jest.fn(), findMany: jest.fn() },
  },
}));

const db = prisma as any;
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });
const request = (overrides: Record<string, any> = {}) => ({
  tenantId: 1,
  userId: 10,
  params: {},
  query: {},
  body: {},
  ...overrides,
} as any);

const employee = { id: 7, tenant_id: 1, user_id: 10, employee_id: 'EMP-007', name: 'Operator', status: 'active', users: { id: 10, name: 'Operator', email: 'operator@test.local', role: 'Cashier' } };

describe('P2 workforce attendance runtime paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('employee directory is always tenant scoped', async () => {
    db.employees.findMany.mockResolvedValue([employee]);
    const res = response();
    const next = jest.fn();

    await getEmployeeDirectory(request({ tenantId: 55 }), res as any, next);

    expect(db.employees.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenant_id: 55 }) }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 1 }));
    expect(next).not.toHaveBeenCalled();
  });

  test('clock-in resolves employee from authenticated user rather than request employee id', async () => {
    db.outlets.findFirst.mockResolvedValue({ id: 3, name: 'Outlet' });
    db.employees.findFirst.mockResolvedValue(employee);
    db.$queryRaw.mockResolvedValue([{ id: 100, employee_id: 7, user_id: 10, outlet_id: 3, status: 'open' }]);
    const res = response();
    const next = jest.fn();

    await clockInSelf(request({ body: { outletId: 3, employeeId: 999 } }), res as any, next);

    expect(db.employees.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { tenant_id: 1, user_id: 10, status: 'active' } }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  test('database unique violation becomes ATTENDANCE_ALREADY_OPEN', async () => {
    db.outlets.findFirst.mockResolvedValue({ id: 3, name: 'Outlet' });
    db.employees.findFirst.mockResolvedValue(employee);
    db.$queryRaw.mockRejectedValue(Object.assign(new Error('duplicate'), { code: '23505' }));
    const res = response();
    const next = jest.fn();

    await clockInSelf(request({ body: { outletId: 3 } }), res as any, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'ATTENDANCE_ALREADY_OPEN' }) }));
    expect(next).not.toHaveBeenCalled();
  });

  test('clock-out rejects when authenticated employee has no open session', async () => {
    db.employees.findFirst.mockResolvedValue(employee);
    const tx = { $queryRaw: jest.fn().mockResolvedValueOnce([]) };
    db.$transaction.mockImplementation(async (callback: any) => callback(tx));
    const res = response();
    const next = jest.fn();

    await clockOutSelf(request(), res as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'NO_OPEN_ATTENDANCE' }));
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  test('clock-out locks and closes exactly one open self session', async () => {
    db.employees.findFirst.mockResolvedValue(employee);
    const tx = {
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 100, tenant_id: 1, employee_id: 7, status: 'open', clock_out_at: null }])
        .mockResolvedValueOnce([{ id: 100, tenant_id: 1, employee_id: 7, status: 'closed', clock_out_at: new Date() }]),
    };
    db.$transaction.mockImplementation(async (callback: any) => callback(tx));
    const res = response();
    const next = jest.fn();

    await clockOutSelf(request(), res as any, next);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'Clock-out berhasil' }));
    expect(next).not.toHaveBeenCalled();
  });

  test('my attendance requires linked active employee profile', async () => {
    db.employees.findFirst.mockResolvedValue(null);
    const res = response();
    const next = jest.fn();

    await getMyAttendance(request(), res as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'EMPLOYEE_PROFILE_REQUIRED' }));
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
});
