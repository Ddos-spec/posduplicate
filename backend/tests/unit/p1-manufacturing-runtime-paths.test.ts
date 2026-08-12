import {
  completeManufacturingOrder,
  createManufacturingOrder,
  transitionManufacturingOrder,
} from '../../src/modules/fnb/controllers/manufacturing.p1.controller';
import {
  resolveQualityCheck,
  updateMaintenanceRequest,
} from '../../src/modules/fnb/controllers/quality-maintenance.p1.controller';
import prisma from '../../src/utils/prisma';

jest.mock('../../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    outlets: { findFirst: jest.fn() },
    items: { findFirst: jest.fn() },
    recipes: { findMany: jest.fn() },
    inventory: { findFirst: jest.fn() },
    users: { findFirst: jest.fn() },
  },
}));

const db = prisma as any;
const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});
const request = (overrides: Record<string, any> = {}) => ({
  tenantId: 1,
  userId: 99,
  userRole: 'Owner',
  params: {},
  query: {},
  body: {},
  ...overrides,
} as any);
const txRunner = (tx: any) => db.$transaction.mockImplementation(async (callback: any) => callback(tx));

describe('P1-B manufacturing runtime failure paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('tenant isolation: MO creation rejects outlet outside tenant', async () => {
    db.outlets.findFirst.mockResolvedValue(null);
    const res = response();
    const next = jest.fn();

    await createManufacturingOrder(request({
      tenantId: 2,
      body: { outletId: 10, itemId: 20, quantityPlanned: 2 },
    }), res as any, next);

    expect(db.outlets.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 10, tenant_id: 2 } }));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'OUTLET_ACCESS_DENIED' }));
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test('illegal MO transition is rejected under row lock', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValueOnce([{ id: 1, tenant_id: 1, status: 'in_progress' }]),
    };
    txRunner(tx);
    const res = response();
    const next = jest.fn();

    await transitionManufacturingOrder(request({ params: { id: '1' }, body: { action: 'confirm' } }), res as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_MO_TRANSITION' }));
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  test('double completion is rejected before a second material or output posting', async () => {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValueOnce([{ id: 1, tenant_id: 1, outlet_id: 10, status: 'done', mo_number: 'MO-1' }]),
      ingredients: { findFirst: jest.fn() },
      inventory: { findFirst: jest.fn() },
      stock_movements: { create: jest.fn() },
      items: { findFirst: jest.fn() },
    };
    txRunner(tx);
    const res = response();
    const next = jest.fn();

    await completeManufacturingOrder(request({ params: { id: '1' }, body: { quantityProduced: 1 } }), res as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_MO_STATUS' }));
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.stock_movements.create).not.toHaveBeenCalled();
    expect(tx.items.findFirst).not.toHaveBeenCalled();
  });

  test('insufficient material aborts completion before finished goods posting', async () => {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, tenant_id: 1, outlet_id: 10, item_id: 20, status: 'in_progress', mo_number: 'MO-1', quantity_planned: 2 }])
        .mockResolvedValueOnce([{ id: 101, manufacturing_order_id: 1, ingredient_id: 7, inventory_id: null, quantity_planned: 5, quantity_consumed: 0, unit_cost: 1000 }])
        .mockResolvedValueOnce([]),
      ingredients: { findFirst: jest.fn().mockResolvedValue({ id: 7, name: 'Flour', stock: 2, is_active: true }) },
      inventory: { findFirst: jest.fn() },
      stock_movements: { create: jest.fn() },
      items: { findFirst: jest.fn() },
    };
    txRunner(tx);
    const res = response();
    const next = jest.fn();

    await completeManufacturingOrder(request({ params: { id: '1' }, body: { quantityProduced: 2 } }), res as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INSUFFICIENT_MATERIAL' }));
    expect(tx.stock_movements.create).not.toHaveBeenCalled();
    expect(tx.items.findFirst).not.toHaveBeenCalled();
  });
});

describe('P1-B quality and maintenance runtime failure paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('QC fail without a reason is rejected before transaction', async () => {
    const res = response();
    const next = jest.fn();

    await resolveQualityCheck(request({ params: { id: '9' }, body: { status: 'fail', notes: '   ' } }), res as any, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'QC_REASON_REQUIRED' }) }));
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('QC cannot be resolved twice', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValueOnce([{ id: 9, tenant_id: 1, status: 'pass' }]),
    };
    txRunner(tx);
    const res = response();
    const next = jest.fn();

    await resolveQualityCheck(request({ params: { id: '9' }, body: { status: 'pass', measurements: {} } }), res as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'QC_ALREADY_RESOLVED' }));
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  test('terminal maintenance request cannot be reopened', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValueOnce([{ id: 12, tenant_id: 1, equipment_id: 4, status: 'done' }]),
      $executeRaw: jest.fn(),
    };
    txRunner(tx);
    const res = response();
    const next = jest.fn();

    await updateMaintenanceRequest(request({ params: { id: '12' }, body: { status: 'planned' } }), res as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_MAINTENANCE_TRANSITION' }));
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
});
