import {
  executeStockTransfer,
  finalizeStockCount,
} from '../../src/modules/fnb/controllers/warehouse.p1.controller';
import prisma from '../../src/utils/prisma';

jest.mock('../../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    outlets: { findMany: jest.fn(), findFirst: jest.fn() },
    $queryRaw: jest.fn(),
    inventory: { findMany: jest.fn(), findFirst: jest.fn() },
  },
}));

const db = prisma as any;
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });
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

const baseTx = () => ({
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn().mockResolvedValue(1),
  inventory: { findFirst: jest.fn(), update: jest.fn() },
  stock_movements: { create: jest.fn() },
});

describe('P1-A warehouse transfer integrity', () => {
  beforeEach(() => jest.clearAllMocks());

  test('successful internal transfer moves location balances without mutating aggregate inventory', async () => {
    const tx = baseTx();
    tx.$queryRaw
      .mockResolvedValueOnce([{ id: 1, tenant_id: 1, outlet_id: 10, source_location_id: 100, destination_location_id: 200, status: 'ready', transfer_number: 'TRF-1' }])
      .mockResolvedValueOnce([{ id: 11, inventory_id: 3, quantity_requested: 4 }])
      .mockResolvedValueOnce([{ id: 21, quantity: 10 }])
      .mockResolvedValueOnce([{ id: 22, quantity: 2 }])
      .mockResolvedValueOnce([{ id: 1, status: 'done' }]);
    txRunner(tx);
    const res = response();
    const next = jest.fn();

    await executeStockTransfer(request({ params: { id: '1' } }), res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(tx.inventory.update).not.toHaveBeenCalled();
    expect(tx.stock_movements.create).not.toHaveBeenCalled();
    expect(tx.$executeRaw).toHaveBeenCalled();
  });

  test('insufficient source stock rejects the transfer before destination mutation', async () => {
    const tx = baseTx();
    tx.$queryRaw
      .mockResolvedValueOnce([{ id: 1, tenant_id: 1, outlet_id: 10, source_location_id: 100, destination_location_id: 200, status: 'ready', transfer_number: 'TRF-1' }])
      .mockResolvedValueOnce([{ id: 11, inventory_id: 3, quantity_requested: 5 }])
      .mockResolvedValueOnce([{ id: 21, quantity: 2 }]);
    txRunner(tx);
    const res = response();
    const next = jest.fn();

    await executeStockTransfer(request({ params: { id: '1' } }), res as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INSUFFICIENT_LOCATION_STOCK' }));
    // Only the advisory lock may execute before the failure.
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test('double execute is rejected safely after transfer is already done', async () => {
    const tx = baseTx();
    tx.$queryRaw.mockResolvedValueOnce([{ id: 1, tenant_id: 1, status: 'done' }]);
    txRunner(tx);
    const res = response();
    const next = jest.fn();

    await executeStockTransfer(request({ params: { id: '1' } }), res as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TRANSFER_STATUS' }));
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  });

  test('tenant isolation returns not found when transfer is outside tenant scope', async () => {
    const tx = baseTx();
    tx.$queryRaw.mockResolvedValueOnce([]);
    txRunner(tx);
    const res = response();
    const next = jest.fn();

    await executeStockTransfer(request({ tenantId: 2, params: { id: '1' } }), res as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'TRANSFER_NOT_FOUND' }));
  });
});

describe('P1-A cycle count integrity', () => {
  beforeEach(() => jest.clearAllMocks());

  test('duplicate submitted inventory lines are rejected before transaction', async () => {
    const res = response();
    const next = jest.fn();
    await finalizeStockCount(request({
      params: { id: '1' },
      body: { lines: [{ inventoryId: 3, countedQuantity: 5 }, { inventoryId: 3, countedQuantity: 5 }] },
    }), res as any, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'DUPLICATE_COUNT_LINE' }) }));
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test('movement during count does not double-adjust aggregate stock', async () => {
    const tx = baseTx();
    tx.$queryRaw
      .mockResolvedValueOnce([{ id: 1, tenant_id: 1, outlet_id: 10, location_id: 100, status: 'counting', count_number: 'CNT-1' }])
      .mockResolvedValueOnce([{ id: 11, inventory_id: 3, expected_quantity: 10 }])
      .mockResolvedValueOnce([{ inventory_id: 3 }])
      .mockResolvedValueOnce([{ id: 21, quantity: 5 }])
      .mockResolvedValueOnce([{ id: 1, status: 'finalized' }]);
    txRunner(tx);
    const res = response();
    const next = jest.fn();

    await finalizeStockCount(request({ params: { id: '1' }, body: { lines: [{ inventoryId: 3, countedQuantity: 5 }] } }), res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(tx.inventory.update).not.toHaveBeenCalled();
    expect(tx.stock_movements.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('true physical discrepancy adjusts aggregate only by delta versus current location balance', async () => {
    const tx = baseTx();
    tx.$queryRaw
      .mockResolvedValueOnce([{ id: 1, tenant_id: 1, outlet_id: 10, location_id: 100, status: 'counting', count_number: 'CNT-1' }])
      .mockResolvedValueOnce([{ id: 11, inventory_id: 3, expected_quantity: 10 }])
      .mockResolvedValueOnce([{ inventory_id: 3 }])
      .mockResolvedValueOnce([{ id: 21, quantity: 5 }])
      .mockResolvedValueOnce([{ id: 1, status: 'finalized' }]);
    tx.inventory.findFirst.mockResolvedValue({ id: 3, current_stock: 100, cost_amount: 2500 });
    tx.inventory.update.mockResolvedValue({});
    tx.stock_movements.create.mockResolvedValue({});
    txRunner(tx);
    const res = response();
    const next = jest.fn();

    await finalizeStockCount(request({ params: { id: '1' }, body: { lines: [{ inventoryId: 3, countedQuantity: 4 }] } }), res as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(tx.inventory.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { current_stock: 99 } });
    expect(tx.stock_movements.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ quantity: 1, stock_before: 100, stock_after: 99 }),
    }));
  });

  test('new nonzero SKU appearing after count opened forces count restart', async () => {
    const tx = baseTx();
    tx.$queryRaw
      .mockResolvedValueOnce([{ id: 1, tenant_id: 1, outlet_id: 10, location_id: 100, status: 'counting', count_number: 'CNT-1' }])
      .mockResolvedValueOnce([{ id: 11, inventory_id: 3, expected_quantity: 10 }])
      .mockResolvedValueOnce([{ inventory_id: 3 }, { inventory_id: 4 }]);
    txRunner(tx);
    const res = response();
    const next = jest.fn();

    await finalizeStockCount(request({ params: { id: '1' }, body: { lines: [{ inventoryId: 3, countedQuantity: 10 }] } }), res as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'COUNT_SCOPE_CHANGED' }));
    expect(tx.inventory.update).not.toHaveBeenCalled();
  });
});
