from pathlib import Path

controller = Path('backend/src/modules/fnb/controllers/warehouse.p1.controller.ts')
text = controller.read_text()

# Serialize transfer execution with the same tenant-scoped lock used by receiving/count reconciliation.
transfer_marker = """    const result = await prisma.$transaction(async (tx) => {\n      const transfers = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.stock_transfers WHERE id = ${transferId} AND tenant_id = ${tenantId} FOR UPDATE`);"""
transfer_replacement = """    const result = await prisma.$transaction(async (tx) => {\n      // Share the aggregate-stock mutation lock with receiving and cycle-count finalization.\n      // Transfers do not mutate aggregate stock, but serialization prevents a count from reconciling\n      // against a location balance while that same balance is moving between locations.\n      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, 73001)`);\n      const transfers = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.stock_transfers WHERE id = ${transferId} AND tenant_id = ${tenantId} FOR UPDATE`);"""
if "Share the aggregate-stock mutation lock with receiving" not in text:
    if transfer_marker not in text:
        raise SystemExit('execute transfer marker not found')
    text = text.replace(transfer_marker, transfer_replacement, 1)

# Reject malformed/duplicated count submissions before opening a transaction.
count_input_marker = """    const submitted = Array.isArray(req.body.lines) ? req.body.lines : [];\n    const submittedMap = new Map<number, number>(\n      submitted.map((line: any) => [Number(line.inventoryId), Number(line.countedQuantity)] as [number, number])\n    );"""
count_input_replacement = """    const submitted = Array.isArray(req.body.lines) ? req.body.lines : [];\n    const submittedIds = submitted.map((line: any) => Number(line.inventoryId));\n    if (submittedIds.some((inventoryId: number) => !Number.isInteger(inventoryId) || inventoryId <= 0)) {\n      return res.status(400).json({ success: false, error: { code: 'INVALID_COUNT_INVENTORY_ID', message: 'Semua inventoryId stock count harus valid' } });\n    }\n    if (new Set(submittedIds).size !== submittedIds.length) {\n      return res.status(400).json({ success: false, error: { code: 'DUPLICATE_COUNT_LINE', message: 'Satu inventory hanya boleh muncul sekali saat finalize stock count' } });\n    }\n    const submittedMap = new Map<number, number>(\n      submitted.map((line: any) => [Number(line.inventoryId), Number(line.countedQuantity)] as [number, number])\n    );"""
if "code: 'DUPLICATE_COUNT_LINE'" not in text:
    if count_input_marker not in text:
        raise SystemExit('count input marker not found')
    text = text.replace(count_input_marker, count_input_replacement, 1)

# Add the shared lock and detect scope changes (new SKU/location balance after the count opened).
count_tx_marker = """    const result = await prisma.$transaction(async (tx) => {\n      const counts = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.stock_counts WHERE id = ${stockCountId} AND tenant_id = ${tenantId} FOR UPDATE`);"""
count_tx_replacement = """    const result = await prisma.$transaction(async (tx) => {\n      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, 73001)`);\n      const counts = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.stock_counts WHERE id = ${stockCountId} AND tenant_id = ${tenantId} FOR UPDATE`);"""
if "await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, 73001)`);\n      const counts" not in text:
    if count_tx_marker not in text:
        raise SystemExit('count transaction marker not found')
    text = text.replace(count_tx_marker, count_tx_replacement, 1)

scope_marker = """      const lines = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.stock_count_lines WHERE stock_count_id = ${stockCountId} ORDER BY id`);\n\n      for (const line of lines) {"""
scope_replacement = """      const lines = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.stock_count_lines WHERE stock_count_id = ${stockCountId} ORDER BY id`);\n      const scopedInventoryIds = new Set(lines.map((line: any) => Number(line.inventory_id)));\n      const currentBalanceScope = await tx.$queryRaw<any[]>(Prisma.sql`\n        SELECT inventory_id FROM public.warehouse_stock_balances\n        WHERE tenant_id = ${tenantId} AND location_id = ${count.location_id} AND quantity <> 0\n      `);\n      const newInventoryIds = currentBalanceScope\n        .map((row: any) => Number(row.inventory_id))\n        .filter((inventoryId: number) => !scopedInventoryIds.has(inventoryId));\n      if (newInventoryIds.length > 0) {\n        throw Object.assign(new Error('Scope stock count berubah karena ada inventory baru pada lokasi setelah count dibuka'), {\n          status: 409,\n          code: 'COUNT_SCOPE_CHANGED',\n          details: { newInventoryIds },\n        });\n      }\n\n      for (const line of lines) {"""
if "code: 'COUNT_SCOPE_CHANGED'" not in text:
    if scope_marker not in text:
        raise SystemExit('count scope marker not found')
    text = text.replace(scope_marker, scope_replacement, 1)

# Reconcile aggregate stock using the *current* location balance, not the opening snapshot.
old_variance_block = """        const expected = Number(line.expected_quantity || 0);\n        const variance = counted - expected;\n\n        const balanceRows = await tx.$queryRaw<any[]>(Prisma.sql`\n          SELECT * FROM public.warehouse_stock_balances WHERE tenant_id = ${tenantId} AND location_id = ${count.location_id} AND inventory_id = ${inventoryId} FOR UPDATE\n        `);\n        const balanceBefore = Number(balanceRows[0]?.quantity || 0);"""
new_variance_block = """        const expected = Number(line.expected_quantity || 0);\n        // Keep variance against the opening snapshot for audit/reporting, but reconcile using the\n        // location balance that is actually current at finalize time. This prevents transfers or\n        // receipts that happened during the count window from being applied a second time.\n        const snapshotVariance = counted - expected;\n\n        const balanceRows = await tx.$queryRaw<any[]>(Prisma.sql`\n          SELECT * FROM public.warehouse_stock_balances WHERE tenant_id = ${tenantId} AND location_id = ${count.location_id} AND inventory_id = ${inventoryId} FOR UPDATE\n        `);\n        const balanceBefore = Number(balanceRows[0]?.quantity || 0);\n        const appliedVariance = counted - balanceBefore;"""
if "const snapshotVariance = counted - expected;" not in text:
    if old_variance_block not in text:
        raise SystemExit('variance block marker not found')
    text = text.replace(old_variance_block, new_variance_block, 1)

old_aggregate = """        if (variance !== 0) {\n          const inventory = await tx.inventory.findFirst({ where: { id: inventoryId, outlet_id: Number(count.outlet_id) } });\n          if (!inventory) throw Object.assign(new Error(`Inventory ${inventoryId} tidak ditemukan`), { status: 404, code: 'INVENTORY_NOT_FOUND' });\n          const aggregateBefore = Number(inventory.current_stock || 0);\n          const aggregateAfter = aggregateBefore + variance;\n          if (aggregateAfter < 0) throw Object.assign(new Error('Variance membuat aggregate stock negatif'), { status: 409, code: 'NEGATIVE_AGGREGATE_STOCK' });\n          await tx.inventory.update({ where: { id: inventory.id }, data: { current_stock: aggregateAfter } });\n          await tx.stock_movements.create({\n            data: {\n              outlet_id: Number(count.outlet_id),\n              inventory_id: inventory.id,\n              type: 'ADJUST',\n              quantity: Math.abs(variance),\n              unit_price: Number(inventory.cost_amount || 0),\n              total_cost: Math.abs(variance) * Number(inventory.cost_amount || 0),\n              stock_before: aggregateBefore,\n              stock_after: aggregateAfter,\n              notes: `Stock count ${count.count_number}; variance ${variance}`,\n              user_id: req.userId!\n            }\n          });\n        }\n        await tx.$executeRaw(Prisma.sql`UPDATE public.stock_count_lines SET counted_quantity = ${counted}, variance_quantity = ${variance} WHERE id = ${line.id}`);"""
new_aggregate = """        if (appliedVariance !== 0) {\n          const inventory = await tx.inventory.findFirst({ where: { id: inventoryId, outlet_id: Number(count.outlet_id) } });\n          if (!inventory) throw Object.assign(new Error(`Inventory ${inventoryId} tidak ditemukan`), { status: 404, code: 'INVENTORY_NOT_FOUND' });\n          const aggregateBefore = Number(inventory.current_stock || 0);\n          const aggregateAfter = aggregateBefore + appliedVariance;\n          if (aggregateAfter < 0) throw Object.assign(new Error('Variance membuat aggregate stock negatif'), { status: 409, code: 'NEGATIVE_AGGREGATE_STOCK' });\n          await tx.inventory.update({ where: { id: inventory.id }, data: { current_stock: aggregateAfter } });\n          await tx.stock_movements.create({\n            data: {\n              outlet_id: Number(count.outlet_id),\n              inventory_id: inventory.id,\n              type: 'ADJUST',\n              quantity: Math.abs(appliedVariance),\n              unit_price: Number(inventory.cost_amount || 0),\n              total_cost: Math.abs(appliedVariance) * Number(inventory.cost_amount || 0),\n              stock_before: aggregateBefore,\n              stock_after: aggregateAfter,\n              notes: `Stock count ${count.count_number}; snapshot variance ${snapshotVariance}; applied variance ${appliedVariance}`,\n              user_id: req.userId!\n            }\n          });\n        }\n        await tx.$executeRaw(Prisma.sql`UPDATE public.stock_count_lines SET counted_quantity = ${counted}, variance_quantity = ${snapshotVariance} WHERE id = ${line.id}`);"""
if "snapshot variance ${snapshotVariance}; applied variance ${appliedVariance}" not in text:
    if old_aggregate not in text:
        raise SystemExit('aggregate variance marker not found')
    text = text.replace(old_aggregate, new_aggregate, 1)

required = [
    "Share the aggregate-stock mutation lock with receiving",
    "code: 'DUPLICATE_COUNT_LINE'",
    "code: 'COUNT_SCOPE_CHANGED'",
    "const snapshotVariance = counted - expected;",
    "const appliedVariance = counted - balanceBefore;",
    "aggregateBefore + appliedVariance",
]
missing = [marker for marker in required if marker not in text]
if missing:
    raise SystemExit(f'warehouse hardening markers missing: {missing}')
controller.write_text(text)

# Executable path tests.
test_path = Path('backend/tests/unit/p1-warehouse-integrity.test.ts')
test_path.write_text(r'''import {
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
''')
