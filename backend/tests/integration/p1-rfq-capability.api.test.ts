import request from 'supertest';
import app from '../../src/server';

jest.mock('../../src/middlewares/auth.middleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.userId = 1;
    req.tenantId = 1;
    req.userRole = String(req.headers['x-test-role'] || 'Cashier');
    next();
  },
  optionalAuth: (_req: any, _res: any, next: any) => next(),
  roleMiddleware: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../src/middlewares/tenant.middleware', () => ({
  tenantMiddleware: (req: any, _res: any, next: any) => {
    req.tenantId = 1;
    const capabilities: Record<string, boolean> = {};
    if (req.headers['x-test-allow'] === 'true') capabilities['supply.procurement.manage'] = true;
    if (req.headers['x-test-deny'] === 'true') capabilities['supply.procurement.manage'] = false;
    req.tenant = { id: 1, features: { capabilities } };
    next();
  },
  ownerOnly: (_req: any, _res: any, next: any) => next(),
  superAdminOnly: (_req: any, _res: any, next: any) => next(),
}));

describe('P1-A procurement API capability enforcement', () => {
  test('cashier cannot bypass RFQ procurement manage capability through API', async () => {
    const res = await request(app).post('/api/supply-chain/procurement/rfqs').set('x-test-role', 'Cashier').send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CAPABILITY_REQUIRED');
    expect(res.body.error.capability).toBe('supply.procurement.manage');
  });

  test('explicit tenant deny overrides Owner preset on RFQ', async () => {
    const res = await request(app).post('/api/supply-chain/procurement/rfqs').set('x-test-role', 'Owner').set('x-test-deny', 'true').send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CAPABILITY_REQUIRED');
  });

  test('explicit tenant allow lets restricted role reach RFQ controller', async () => {
    const res = await request(app).post('/api/supply-chain/procurement/rfqs').set('x-test-role', 'Cashier').set('x-test-allow', 'true').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RFQ_INPUT_REQUIRED');
  });

  test('cashier cannot create supplier without procurement manage capability', async () => {
    const res = await request(app).post('/api/suppliers').set('x-test-role', 'Cashier').send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CAPABILITY_REQUIRED');
    expect(res.body.error.capability).toBe('supply.procurement.manage');
  });

  test('explicit tenant deny overrides Owner preset on supplier master', async () => {
    const res = await request(app).post('/api/suppliers').set('x-test-role', 'Owner').set('x-test-deny', 'true').send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CAPABILITY_REQUIRED');
  });

  test('explicit tenant allow lets restricted role reach supplier validation', async () => {
    const res = await request(app).post('/api/suppliers').set('x-test-role', 'Cashier').set('x-test-allow', 'true').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
