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
    expect(hasCapability(requestFor('manager'), 'supply.manufacturing.manage')).toBe(true);
    expect(hasCapability(requestFor('manager'), 'supply.quality.manage')).toBe(true);
    expect(hasCapability(requestFor('manager'), 'supply.maintenance.manage')).toBe(true);
  });

  test('explicit tenant deny overrides permissive role preset', () => {
    const req = requestFor('owner', {
      'revenue.loyalty.adjust': false,
      'supply.maintenance.manage': false,
    });
    expect(hasCapability(req, 'revenue.loyalty.adjust')).toBe(false);
    expect(hasCapability(req, 'supply.maintenance.manage')).toBe(false);
  });

  test('explicit tenant allow can grant one capability to a restricted role', () => {
    const req = requestFor('cashier', {
      'revenue.crm.manage': true,
      'supply.quality.manage': true,
    });
    expect(hasCapability(req, 'revenue.crm.manage')).toBe(true);
    expect(hasCapability(req, 'supply.quality.manage')).toBe(true);
    expect(hasCapability(req, 'supply.procurement.manage')).toBe(false);
    expect(hasCapability(req, 'supply.maintenance.manage')).toBe(false);
  });

  test('accountant preset is read-only for procurement and cannot operate manufacturing', () => {
    const req = requestFor('accountant');
    expect(hasCapability(req, 'supply.procurement.read')).toBe(true);
    expect(hasCapability(req, 'supply.procurement.manage')).toBe(false);
    expect(hasCapability(req, 'supply.manufacturing.read')).toBe(false);
    expect(hasCapability(req, 'supply.quality.manage')).toBe(false);
    expect(hasCapability(req, 'supply.maintenance.manage')).toBe(false);
  });

  test('middleware returns 403 with machine-readable capability when manufacturing is denied', () => {
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

  test.each([
    'supply.quality.manage',
    'supply.maintenance.manage',
  ] as const)('cashier is denied %s by default', (capability) => {
    const req = requestFor('cashier');
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = { status } as unknown as Response;
    const next = jest.fn() as NextFunction;

    requireCapability(capability)(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ capability }),
    }));
    expect(next).not.toHaveBeenCalled();
  });
});
