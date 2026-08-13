jest.mock('../../src/utils/prisma', () => ({ __esModule: true, default: { $transaction: jest.fn() } }));

import prisma from '../../src/utils/prisma';
import { materializeSubscriptionRenewal } from '../../src/modules/fnb/services/subscription.p3.service';

const transaction = prisma.$transaction as unknown as jest.Mock;
const queryRaw = jest.fn();
const executeRaw = jest.fn();
const tx = { $queryRaw: queryRaw, $executeRaw: executeRaw } as any;

describe('P3.3 subscription renewal retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transaction.mockImplementation(async (fn: (client: any) => unknown) => fn(tx));
  });

  test('reuses a materialized period without duplicate downstream writes', async () => {
    const subscription = {
      id: 9, tenant_id: 4, outlet_id: 2, customer_id: 7, customer_name: 'Customer A',
      subscription_number: 'SUB-2026-000009', status: 'active', interval_unit: 'month', interval_count: 1,
      currency: 'IDR', next_renewal_at: '2026-08-01',
    };
    const renewal = {
      id: 21, tenant_id: 4, subscription_id: 9, period_start: '2026-08-01', period_end: '2026-09-01',
      status: 'materialized', sales_order_id: 31, receivable_id: 41, amount: '150000.00',
    };
    queryRaw.mockResolvedValueOnce([subscription]).mockResolvedValueOnce([renewal]);

    await expect(materializeSubscriptionRenewal(4, 3, 9)).resolves.toEqual({ renewal, reused: true });
    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(executeRaw).not.toHaveBeenCalled();
  });
});
