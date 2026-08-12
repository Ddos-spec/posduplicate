import {
  createPurchaseRfq,
  sendPurchaseRfq,
  submitSupplierRfqQuote,
  selectRfqSupplier,
  convertRfqToPurchaseOrder,
} from '../../src/modules/fnb/controllers/procurement-rfq.p1.controller';
import prisma from '../../src/utils/prisma';

jest.mock('../../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    outlets: { findFirst: jest.fn() },
    suppliers: { findMany: jest.fn() },
    inventory: { findMany: jest.fn() },
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

describe('P1-A RFQ business paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('happy path: draft RFQ can be sent', async () => {
    const tx = {
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, outlet_id: 10, status: 'draft' }])
        .mockResolvedValueOnce([{ id: 1, outlet_id: 10, status: 'sent' }]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    txRunner(tx);
    const res = response();
    const next = jest.fn();
    await sendPurchaseRfq(request({ params: { id: '1' } }), res as any, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('failure path: illegal RFQ status transition is rejected', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValueOnce([{ id: 1, outlet_id: 10, status: 'sent' }]),
      $executeRaw: jest.fn(),
    };
    txRunner(tx);
    const res = response();
    const next = jest.fn();
    await sendPurchaseRfq(request({ params: { id: '1' } }), res as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_RFQ_STATUS' }));
  });

  test('failure path: incomplete supplier quote is rejected before persistence', async () => {
    const tx = {
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, outlet_id: 10, status: 'sent' }])
        .mockResolvedValueOnce([{ id: 55, supplier_id: 7 }])
        .mockResolvedValueOnce([{ id: 101, quantity: 5 }, { id: 102, quantity: 3 }]),
      $executeRaw: jest.fn(),
    };
    txRunner(tx);
    const res = response();
    const next = jest.fn();
    await submitSupplierRfqQuote(request({
      params: { id: '1', supplierId: '7' },
      body: { items: [{ rfqItemId: 101, unitPrice: 1000, availableQuantity: 5 }], leadTimeDays: 3 },
    }), res as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INCOMPLETE_SUPPLIER_QUOTE' }));
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  test('failure path: invalid supplier lead time is rejected before transaction', async () => {
    const res = response();
    const next = jest.fn();
    await submitSupplierRfqQuote(request({
      params: { id: '1', supplierId: '7' },
      body: { items: [{ rfqItemId: 101, unitPrice: 1000 }], leadTimeDays: -1 },
    }), res as any, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'INVALID_LEAD_TIME' }) }));
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test('failure path: supplier with insufficient quoted capacity cannot be selected', async () => {
    const tx = {
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, outlet_id: 10, status: 'quoted' }])
        .mockResolvedValueOnce([{ id: 55, supplier_id: 7, status: 'responded' }])
        .mockResolvedValueOnce([{ inventory_id: 3, requested_quantity: 10, available_quantity: 4 }]),
      $executeRaw: jest.fn(),
    };
    txRunner(tx);
    const res = response();
    const next = jest.fn();
    await selectRfqSupplier(request({ params: { id: '1' }, body: { supplierId: 7 } }), res as any, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'SUPPLIER_CAPACITY_INSUFFICIENT' }));
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  test('tenant isolation: RFQ creation rejects outlet outside tenant', async () => {
    db.outlets.findFirst.mockResolvedValue(null);
    const res = response();
    const next = jest.fn();
    await createPurchaseRfq(request({
      tenantId: 2,
      body: { outletId: 10, supplierIds: [7], items: [{ inventoryId: 3, quantity: 1 }] },
    }), res as any, next);
    expect(db.outlets.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 10, tenant_id: 2 } }));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'OUTLET_ACCESS_DENIED' }));
  });

  test('idempotency: already-converted RFQ returns existing PO without creating another', async () => {
    const existingPo = { id: 77, po_number: 'PO-2026-000001', purchase_order_items: [] };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValueOnce([{ id: 1, outlet_id: 10, status: 'converted', converted_po_id: 77 }]),
      $executeRaw: jest.fn(),
      purchase_orders: {
        findUnique: jest.fn().mockResolvedValue(existingPo),
        create: jest.fn(),
      },
    };
    txRunner(tx);
    const res = response();
    const next = jest.fn();
    await convertRfqToPurchaseOrder(request({ params: { id: '1' } }), res as any, next);
    expect(next).not.toHaveBeenCalled();
    expect(tx.purchase_orders.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: existingPo }));
  });
});
