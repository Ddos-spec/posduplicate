from pathlib import Path

controller_path = Path('backend/src/modules/fnb/controllers/procurement-rfq.p1.controller.ts')
text = controller_path.read_text()

quote_marker = """    const itemQuotes = Array.isArray(req.body.items) ? req.body.items : [];
    if (itemQuotes.length === 0) return res.status(400).json({ success: false, error: { code: 'QUOTE_ITEMS_REQUIRED', message: 'Supplier quote membutuhkan item prices' } });"""
quote_replacement = quote_marker + """
    const leadTimeDays = req.body.leadTimeDays === undefined || req.body.leadTimeDays === null || req.body.leadTimeDays === ''
      ? null
      : Number(req.body.leadTimeDays);
    if (leadTimeDays !== null && (!Number.isFinite(leadTimeDays) || leadTimeDays < 0)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_LEAD_TIME', message: 'Lead time supplier harus angka >= 0' } });
    }"""
if "code: 'INVALID_LEAD_TIME'" not in text:
    if quote_marker not in text:
        raise SystemExit('RFQ quote validation marker not found')
    text = text.replace(quote_marker, quote_replacement, 1)

old_lead = "lead_time_days = ${req.body.leadTimeDays === undefined ? null : Number(req.body.leadTimeDays)}"
if old_lead in text:
    text = text.replace(old_lead, "lead_time_days = ${leadTimeDays}", 1)

old_payload = "payload: { supplierId, quotedTotal, leadTimeDays: req.body.leadTimeDays ?? null },"
if old_payload in text:
    text = text.replace(old_payload, "payload: { supplierId, quotedTotal, leadTimeDays, items: itemQuotes },", 1)

select_marker = """      const supplierRows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.purchase_rfq_suppliers WHERE rfq_id = ${rfqId} AND supplier_id = ${supplierId} AND status = 'responded' FOR UPDATE`);
      if (!supplierRows[0]) throw Object.assign(new Error('Supplier belum memberikan quote valid'), { status: 409, code: 'SUPPLIER_QUOTE_REQUIRED' });"""
capacity_block = select_marker + """

      const capacityShortages = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT ri.inventory_id, ri.quantity AS requested_quantity, rsi.available_quantity
        FROM public.purchase_rfq_items ri
        JOIN public.purchase_rfq_supplier_items rsi
          ON rsi.rfq_item_id = ri.id AND rsi.rfq_supplier_id = ${supplierRows[0].id}
        WHERE ri.rfq_id = ${rfqId}
          AND rsi.available_quantity IS NOT NULL
          AND rsi.available_quantity < ri.quantity
      `);
      if (capacityShortages.length > 0) {
        throw Object.assign(new Error('Supplier tidak memiliki kapasitas cukup untuk seluruh kebutuhan RFQ'), {
          status: 409,
          code: 'SUPPLIER_CAPACITY_INSUFFICIENT',
          details: capacityShortages,
        });
      }"""
if "code: 'SUPPLIER_CAPACITY_INSUFFICIENT'" not in text:
    if select_marker not in text:
        raise SystemExit('RFQ supplier-selection marker not found')
    text = text.replace(select_marker, capacity_block, 1)

required = [
    "code: 'INVALID_LEAD_TIME'",
    'lead_time_days = ${leadTimeDays}',
    'payload: { supplierId, quotedTotal, leadTimeDays, items: itemQuotes }',
    "code: 'SUPPLIER_CAPACITY_INSUFFICIENT'",
    'rsi.available_quantity < ri.quantity',
]
missing = [marker for marker in required if marker not in text]
if missing:
    raise SystemExit(f'RFQ hardening markers missing: {missing}')
controller_path.write_text(text)

unit_test = r'''import {
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
'''
Path('backend/tests/unit/p1-rfq-paths.test.ts').write_text(unit_test)

integration_test = r'''import request from 'supertest';
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

describe('P1-A RFQ API capability enforcement', () => {
  test('cashier cannot bypass procurement manage capability through API', async () => {
    const res = await request(app).post('/api/supply-chain/procurement/rfqs').set('x-test-role', 'Cashier').send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CAPABILITY_REQUIRED');
    expect(res.body.error.capability).toBe('supply.procurement.manage');
  });

  test('explicit tenant deny overrides Owner preset', async () => {
    const res = await request(app).post('/api/supply-chain/procurement/rfqs').set('x-test-role', 'Owner').set('x-test-deny', 'true').send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CAPABILITY_REQUIRED');
  });

  test('explicit tenant allow lets restricted role reach RFQ controller', async () => {
    const res = await request(app).post('/api/supply-chain/procurement/rfqs').set('x-test-role', 'Cashier').set('x-test-allow', 'true').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RFQ_INPUT_REQUIRED');
  });
});
'''
Path('backend/tests/integration/p1-rfq-capability.api.test.ts').write_text(integration_test)

print('P1-A RFQ hardening patch and tests prepared')
