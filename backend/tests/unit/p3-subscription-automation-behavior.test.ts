jest.mock('../../src/utils/prisma', () => ({ __esModule: true, default: { $queryRaw: jest.fn(), $executeRaw: jest.fn() } }));
jest.mock('../../src/modules/fnb/services/subscription.p3.service', () => ({ materializeSubscriptionRenewal: jest.fn() }));

import prisma from '../../src/utils/prisma';
import { materializeSubscriptionRenewal } from '../../src/modules/fnb/services/subscription.p3.service';
import { validateSubscriptionAutomationActor } from '../../src/modules/fnb/services/subscription-automation-settings.p3.service';
import { runTenantSubscriptionAutomation } from '../../src/modules/fnb/services/subscription-automation-runner.p3.service';

const queryRaw = prisma.$queryRaw as unknown as jest.Mock;
const executeRaw = prisma.$executeRaw as unknown as jest.Mock;
const materialize = materializeSubscriptionRenewal as jest.MockedFunction<typeof materializeSubscriptionRenewal>;

describe('P3.3 subscription automation behavior', () => {
  beforeEach(() => jest.clearAllMocks());

  test.each([
    [{ id: 7, tenant_id: 99, is_active: true, role_name: 'manager' }, 'SUBSCRIPTION_AUTOMATION_ACTOR_INVALID'],
    [{ id: 7, tenant_id: 4, is_active: false, role_name: 'manager' }, 'SUBSCRIPTION_AUTOMATION_ACTOR_INVALID'],
    [{ id: 7, tenant_id: 4, is_active: true, role_name: 'cashier' }, 'SUBSCRIPTION_AUTOMATION_ACTOR_FORBIDDEN'],
  ])('rejects unsafe automation actor %#', async (actor, code) => {
    queryRaw.mockResolvedValueOnce([actor]);
    await expect(validateSubscriptionAutomationActor(4, 7)).rejects.toMatchObject({ code });
  });

  test('disabled automation is a no-op', async () => {
    queryRaw.mockResolvedValueOnce([]);
    await expect(runTenantSubscriptionAutomation(4)).resolves.toMatchObject({ skipped: true, reason: 'disabled', attempted: 0 });
    expect(materialize).not.toHaveBeenCalled();
    expect(executeRaw).not.toHaveBeenCalled();
  });

  test('enabled automation forwards the selected due date into the idempotent renewal service', async () => {
    queryRaw
      .mockResolvedValueOnce([{ enabled: true, automation_user_id: 7, max_renewals_per_run: 10 }])
      .mockResolvedValueOnce([{ id: 7, tenant_id: 4, is_active: true, role_name: 'manager' }])
      .mockResolvedValueOnce([{ id: 21, next_renewal_at: '2026-08-14' }]);
    materialize.mockResolvedValueOnce({ renewal: { id: 1 }, reused: false } as any);

    await expect(runTenantSubscriptionAutomation(4)).resolves.toMatchObject({ skipped: false, attempted: 1, succeeded: 1, reused: 0, failed: 0 });
    expect(materialize).toHaveBeenCalledWith(4, 7, 21, '2026-08-14');
    expect(executeRaw).toHaveBeenCalledTimes(1);
  });
});
