import type { NextFunction, Request, Response } from 'express';
import { hasCapability, requireCapability } from '../../src/middlewares/capability.middleware';

const requestFor = (role: string, capabilities?: Record<string, boolean>) => ({
  userRole: role,
  tenant: {
    id: 7,
    features: capabilities ? { capabilities } : {},
  },
}) as unknown as Request;

describe('P1 capability authorization', () => {
  test('owner and manager presets allow P1 management by default', () => {
    expect(hasCapability(requestFor('owner'), 'revenue.sales.manage')).toBe(true);
    expect(hasCapability(requestFor('manager'), 'supply.warehouse.manage')).toBe(true);
  });

  test('explicit tenant deny overrides permissive role preset', () => {
    const req = requestFor('owner', { 'revenue.loyalty.adjust': false });
    expect(hasCapability(req, 'revenue.loyalty.adjust')).toBe(false);
  });

  test('explicit tenant allow can grant one capability to a restricted role', () => {
    const req = requestFor('cashier', { 'revenue.crm.manage': true });
    expect(hasCapability(req, 'revenue.crm.manage')).toBe(true);
    expect(hasCapability(req, 'supply.procurement.manage')).toBe(false);
  });

  test('accountant preset is read-only for procurement', () => {
    const req = requestFor('accountant');
    expect(hasCapability(req, 'supply.procurement.read')).toBe(true);
    expect(hasCapability(req, 'supply.procurement.manage')).toBe(false);
  });

  test('middleware returns 403 with machine-readable capability when denied', () => {
    const req = requestFor('cashier');
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = { status } as unknown as Response;
    const next = jest.fn() as NextFunction;

    requireCapability('supply.manufacturing.manage')(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        code: 'CAPABILITY_REQUIRED',
        capability: 'supply.manufacturing.manage',
      }),
    }));
    expect(next).not.toHaveBeenCalled();
  });
});
