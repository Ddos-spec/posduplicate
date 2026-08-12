from pathlib import Path

controller_path = Path('backend/src/modules/fnb/controllers/procurement-receiving.p1.controller.ts')
text = controller_path.read_text()

validation_marker = """    const receiptItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (receiptItems.length === 0) return res.status(400).json({ success: false, error: { code: 'ITEMS_REQUIRED', message: 'Item penerimaan wajib diisi' } });"""
validation_replacement = validation_marker + """
    const receiptItemIds = receiptItems.map((item: any) => Number(item.itemId));
    if (receiptItemIds.some((itemId: number) => !Number.isInteger(itemId) || itemId <= 0)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_RECEIPT_ITEM_ID', message: 'Semua itemId penerimaan harus berupa ID valid' } });
    }
    if (new Set(receiptItemIds).size !== receiptItemIds.length) {
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE_RECEIPT_ITEM', message: 'Satu PO item hanya boleh muncul sekali dalam satu request receiving' } });
    }"""
if "code: 'DUPLICATE_RECEIPT_ITEM'" not in text:
    if validation_marker not in text:
        raise SystemExit('receipt validation marker not found')
    text = text.replace(validation_marker, validation_replacement, 1)

transaction_marker = """    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<any[]>(Prisma.sql`"""
transaction_replacement = """    const result = await prisma.$transaction(async (tx) => {
      // Serialize aggregate-stock mutations per tenant so concurrent PO receipts cannot overwrite each other.
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, 73001)`);
      const locked = await tx.$queryRaw<any[]>(Prisma.sql`"""
if 'pg_advisory_xact_lock(${tenantId}, 73001)' not in text:
    if transaction_marker not in text:
        raise SystemExit('transaction marker not found')
    text = text.replace(transaction_marker, transaction_replacement, 1)

required = [
    "code: 'DUPLICATE_RECEIPT_ITEM'",
    'pg_advisory_xact_lock(${tenantId}, 73001)',
    "code: 'INVALID_RECEIVED_QTY'",
    "'receipt'",
    "'purchase_order'",
    "warehouse RECEIVE",
]
missing = [m for m in required if m not in text]
if missing:
    raise SystemExit(f'missing receiving hardening markers: {missing}')
controller_path.write_text(text)

unit_test = r'''import { receivePOItemsWithWarehouse } from '../../src/modules/fnb/controllers/procurement-receiving.p1.controller';
import prisma from '../../src/utils/prisma';

jest.mock('../../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    outlets: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const db = prisma as any;
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });
const request = (overrides: Record<string, any> = {}) => ({
  tenantId: 1,
  userId: 99,
  params: { id: '10' },
  body: { items: [{ itemId: 100, receivedQty: 2 }] },
  ...overrides,
} as any);
const runTx = (tx: any) => db.$transaction.mockImplementation(async (cb: any) => cb(tx));

const baseTx = (po: any, latestItems: any[]) => ({
  $executeRaw: jest.fn().mockResolvedValue(1),
  $queryRaw: jest.fn()
    .mockResolvedValueOnce([{ id: po.id, outlet_id: po.outlet_id }])
    .mockResolvedValueOnce([{ id: 1, code: 'MAIN' }, { id: 2, code: 'RECEIVE' }])
    .mockResolvedValueOnce([{ rows: 1 }])
    .mockResolvedValueOnce([{ id: 50, quantity: 0 }]),
  purchase_orders: {
    findUnique: jest.fn().mockResolvedValue(po),
    update: jest.fn().mockResolvedValue({}),
  },
  purchase_order_items: {
    update: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue(latestItems),
  },
  inventory: {
    findFirst: jest.fn().mockResolvedValue({ id: 7, outlet_id: po.outlet_id, current_stock: 10 }),
    update: jest.fn().mockResolvedValue({}),
  },
  stock_movements: { create: jest.fn().mockResolvedValue({}) },
});

describe('P1-A procurement receiving integrity', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects duplicate PO item lines before transaction', async () => {
    const res = response();
    const next = jest.fn();
    await receivePOItemsWithWarehouse(request({ body: { items: [{ itemId: 100, receivedQty: 1 }, { itemId: 100, receivedQty: 2 }] } }), res as any, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'DUPLICATE_RECEIPT_ITEM' }) }));
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test('tenant isolation rejects PO outside tenant outlets', async () => {
    db.outlets.findMany.mockResolvedValue([{ id: 20 }]);
    const tx = { $executeRaw: jest.fn().mockResolvedValue(1), $queryRaw: jest.fn().mockResolvedValueOnce([]) };
    runTx(tx);
    const res = response();
    const next = jest.fn();
    await receivePOItemsWithWarehouse(request(), res as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'PO_NOT_FOUND' }));
  });

  test('over-receive is rejected without stock mutation', async () => {
    db.outlets.findMany.mockResolvedValue([{ id: 20 }]);
    const po = { id: 10, outlet_id: 20, status: 'ordered', po_number: 'PO-1', supplier_id: 3, purchase_order_items: [{ id: 100, inventory_id: 7, quantity: 5, received_qty: 2, unit_price: 1000 }] };
    const tx = baseTx(po, []);
    runTx(tx);
    const res = response();
    const next = jest.fn();
    await receivePOItemsWithWarehouse(request({ body: { items: [{ itemId: 100, receivedQty: 6 }] } }), res as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_RECEIVED_QTY' }));
    expect(tx.inventory.update).not.toHaveBeenCalled();
    expect(tx.stock_movements.create).not.toHaveBeenCalled();
  });

  test('repeating same cumulative received quantity is idempotent', async () => {
    db.outlets.findMany.mockResolvedValue([{ id: 20 }]);
    const poItem = { id: 100, inventory_id: 7, quantity: 5, received_qty: 2, unit_price: 1000 };
    const po = { id: 10, outlet_id: 20, status: 'partial', po_number: 'PO-1', supplier_id: 3, purchase_order_items: [poItem] };
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValueOnce([{ id: 10, outlet_id: 20 }]).mockResolvedValueOnce([{ id: 1, code: 'MAIN' }, { id: 2, code: 'RECEIVE' }]),
      purchase_orders: { findUnique: jest.fn().mockResolvedValue(po), update: jest.fn().mockResolvedValue({}) },
      purchase_order_items: { update: jest.fn(), findMany: jest.fn().mockResolvedValue([poItem]) },
      inventory: { findFirst: jest.fn(), update: jest.fn() },
      stock_movements: { create: jest.fn() },
    };
    runTx(tx);
    const res = response();
    const next = jest.fn();
    await receivePOItemsWithWarehouse(request({ body: { items: [{ itemId: 100, receivedQty: 2 }] } }), res as any, next);
    expect(next).not.toHaveBeenCalled();
    expect(tx.inventory.update).not.toHaveBeenCalled();
    expect(tx.stock_movements.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('partial receipt posts cumulative delta to aggregate stock, RECEIVE ledger, and stock movement atomically', async () => {
    db.outlets.findMany.mockResolvedValue([{ id: 20 }]);
    const po = { id: 10, outlet_id: 20, status: 'ordered', po_number: 'PO-1', supplier_id: 3, purchase_order_items: [{ id: 100, inventory_id: 7, quantity: 5, received_qty: 0, unit_price: 1000 }] };
    const latest = [{ id: 100, quantity: 5, received_qty: 2 }];
    const tx = baseTx(po, latest);
    runTx(tx);
    const res = response();
    const next = jest.fn();
    await receivePOItemsWithWarehouse(request({ body: { items: [{ itemId: 100, receivedQty: 2 }] } }), res as any, next);
    expect(next).not.toHaveBeenCalled();
    expect(tx.inventory.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 }, data: expect.objectContaining({ current_stock: 12 }) }));
    expect(tx.purchase_order_items.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 100 }, data: { received_qty: 2 } }));
    expect(tx.stock_movements.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ quantity: 2, stock_before: 10, stock_after: 12 }) }));
    expect(tx.purchase_orders.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'partial' }) }));
    expect(tx.$executeRaw.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ status: 'partial' }) }));
  });
});
'''
Path('backend/tests/unit/p1-receiving-integrity.test.ts').write_text(unit_test)
