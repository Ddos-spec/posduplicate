import {
  requireTenantContext,
  tenantMiddleware,
  tenantOutletScopeMiddleware
} from '../../src/middlewares/tenant.middleware';
import prisma from '../../src/utils/prisma';

jest.mock('../../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    users: { findUnique: jest.fn() },
    tenants: { findFirst: jest.fn() },
    outlets: { findMany: jest.fn() }
  }
}));

const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn()
});

describe('tenant isolation middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires an explicit tenant context for tenant-owned routes', () => {
    const req = {} as any;
    const res = response() as any;
    const next = jest.fn();

    requireTenantContext(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects malformed tenant selectors before database access', async () => {
    const req = {
      userId: 1,
      header: jest.fn().mockReturnValue('not-a-number')
    } as any;
    const res = response() as any;
    const next = jest.fn();

    await tenantMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('loads only outlets belonging to the active tenant', async () => {
    const req = { tenantId: 42 } as any;
    const res = response() as any;
    const next = jest.fn();
    (prisma.outlets.findMany as jest.Mock).mockResolvedValue([{ id: 5 }, { id: 9 }]);

    await tenantOutletScopeMiddleware(req, res, next);

    expect(prisma.outlets.findMany).toHaveBeenCalledWith({
      where: { tenant_id: 42 },
      select: { id: true }
    });
    expect(req.tenantOutletIds).toEqual([5, 9]);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
