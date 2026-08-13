jest.mock('../../src/utils/prisma', () => ({
  __esModule: true,
  default: { $transaction: jest.fn() },
}));
jest.mock('../../src/modules/fnb/services/ecommerce-catalog-lock.p3.service', () => ({
  lockPublishedStorefront: jest.fn(),
  lockPublishedCatalogItem: jest.fn(),
}));
jest.mock('../../src/modules/fnb/services/ecommerce-order-write.p3.service', () => ({
  findGuestOrderByTokenHash: jest.fn(),
  appendOrderEvent: jest.fn(),
  decrementReservedStock: jest.fn(),
  insertGuestOrder: jest.fn(),
  insertReservedOrderLine: jest.fn(),
}));

import prisma from '../../src/utils/prisma';
import { lockPublishedCatalogItem, lockPublishedStorefront } from '../../src/modules/fnb/services/ecommerce-catalog-lock.p3.service';
import {
  appendOrderEvent,
  decrementReservedStock,
  findGuestOrderByTokenHash,
  insertGuestOrder,
  insertReservedOrderLine,
} from '../../src/modules/fnb/services/ecommerce-order-write.p3.service';
import { reserveGuestOrderV2 } from '../../src/modules/fnb/services/ecommerce-reservation-v2.p3.service';

const transactionMock = prisma.$transaction as unknown as jest.Mock;
const lockStorefrontMock = lockPublishedStorefront as jest.MockedFunction<typeof lockPublishedStorefront>;
const lockCatalogMock = lockPublishedCatalogItem as jest.MockedFunction<typeof lockPublishedCatalogItem>;
const findByTokenMock = findGuestOrderByTokenHash as jest.MockedFunction<typeof findGuestOrderByTokenHash>;
const insertOrderMock = insertGuestOrder as jest.MockedFunction<typeof insertGuestOrder>;
const insertLineMock = insertReservedOrderLine as jest.MockedFunction<typeof insertReservedOrderLine>;
const decrementStockMock = decrementReservedStock as jest.MockedFunction<typeof decrementReservedStock>;
const appendEventMock = appendOrderEvent as jest.MockedFunction<typeof appendOrderEvent>;

const tx = {} as any;
const input = {
  publicSlug: 'demo-store',
  token: 'a'.repeat(64),
  customerName: 'Guest',
  customerPhone: '08123456789',
  customerEmail: null,
  deliveryAddress: {},
  notes: null,
  items: [{ itemId: 7, quantity: 1 }],
};

describe('P3.2 storefront checkout idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transactionMock.mockImplementation(async (fn: (client: any) => unknown) => fn(tx));
    lockStorefrontMock.mockResolvedValue({ id: 20, tenant_id: 10, fulfillment_outlet_id: 30 } as any);
  });

  test('same checkout token returns existing order without touching inventory again', async () => {
    findByTokenMock.mockResolvedValue({
      id: 99, tenant_id: 10, site_id: 20, order_number: 'WEB-EXISTING', status: 'reserved', total: '12000.00',
    } as any);

    await expect(reserveGuestOrderV2(input)).resolves.toMatchObject({
      orderNumber: 'WEB-EXISTING', token: input.token, status: 'reserved', total: '12000.00', reused: true,
    });
    expect(lockCatalogMock).not.toHaveBeenCalled();
    expect(insertOrderMock).not.toHaveBeenCalled();
    expect(insertLineMock).not.toHaveBeenCalled();
    expect(decrementStockMock).not.toHaveBeenCalled();
    expect(appendEventMock).not.toHaveBeenCalled();
  });

  test('token reuse across storefronts fails before inventory mutation', async () => {
    findByTokenMock.mockResolvedValue({
      id: 100, tenant_id: 10, site_id: 21, order_number: 'WEB-OTHER', status: 'reserved', total: '5000.00',
    } as any);
    await expect(reserveGuestOrderV2(input)).rejects.toMatchObject({ code: 'CHECKOUT_TOKEN_REUSED', status: 409 });
    expect(lockCatalogMock).not.toHaveBeenCalled();
    expect(decrementStockMock).not.toHaveBeenCalled();
    expect(appendEventMock).not.toHaveBeenCalled();
  });

  test('first attempt reserves stock and writes one lifecycle event', async () => {
    findByTokenMock.mockResolvedValue(null);
    lockCatalogMock.mockResolvedValue({ id: 7, name: 'Tea', sku: 'TEA', stock: 5, track_stock: true, effective_price: 12000 } as any);
    insertOrderMock.mockResolvedValue({ id: 30, order_number: 'WEB-CREATED', status: 'reserved', total: 12000 } as any);

    await expect(reserveGuestOrderV2(input)).resolves.toMatchObject({ orderNumber: 'WEB-CREATED', token: input.token, reused: false });
    expect(insertOrderMock).toHaveBeenCalledTimes(1);
    expect(insertLineMock).toHaveBeenCalledTimes(1);
    expect(decrementStockMock).toHaveBeenCalledWith(tx, 7, 1);
    expect(appendEventMock).toHaveBeenCalledTimes(1);
  });
});
