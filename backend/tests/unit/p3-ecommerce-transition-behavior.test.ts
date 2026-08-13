import { transitionOrder } from '../../src/modules/fnb/services/ecommerce-transition.p3.service';
import prisma from '../../src/utils/prisma';

jest.mock('../../src/utils/prisma', () => ({ __esModule: true, default: { $transaction: jest.fn() } }));
const db = prisma as any;

describe('P3.2 ecommerce transition behavior', () => {
  beforeEach(() => jest.clearAllMocks());
  test('repeating cancelled -> cancelled is a no-op without double restock or duplicate event', async () => {
    const cancelled = { id: 41, tenant_id: 7, outlet_id: 3, status: 'cancelled' };
    const tx = { $queryRaw: jest.fn().mockResolvedValueOnce([cancelled]), $executeRaw: jest.fn() };
    db.$transaction.mockImplementation(async (callback: any) => callback(tx));
    await expect(transitionOrder(7, 99, 41, 'cancelled')).resolves.toEqual(cancelled);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  test('completed -> cancelled is rejected before any stock mutation', async () => {
    const tx = { $queryRaw: jest.fn().mockResolvedValueOnce([{ id: 42, tenant_id: 7, outlet_id: 3, status: 'completed' }]), $executeRaw: jest.fn() };
    db.$transaction.mockImplementation(async (callback: any) => callback(tx));
    await expect(transitionOrder(7, 99, 42, 'cancelled')).rejects.toMatchObject({ code: 'INVALID_ECOMMERCE_ORDER_TRANSITION' });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
});
