import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';
import { materializeSubscriptionRenewal } from './subscription.p3.service';
import { validateSubscriptionAutomationActor } from './subscription-automation-settings.p3.service';

const text = (value: unknown) => String(value || '').slice(0, 2000);

export const runTenantSubscriptionAutomation = async (tenantId: number) => {
  const settingsRows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT * FROM public.subscription_automation_settings WHERE tenant_id=${tenantId} AND enabled=TRUE LIMIT 1
  `);
  const settings = settingsRows[0];
  if (!settings) return { skipped: true, reason: 'disabled', attempted: 0, succeeded: 0, reused: 0, failed: 0 };

  let actor: { id: number; role: string };
  try {
    actor = await validateSubscriptionAutomationActor(tenantId, settings.automation_user_id);
  } catch (error) {
    const message = text(error instanceof Error ? error.message : 'Invalid automation actor');
    await prisma.$executeRaw(Prisma.sql`
      UPDATE public.subscription_automation_settings SET last_run_at=NOW(),last_error=${message},updated_at=NOW()
      WHERE tenant_id=${tenantId}
    `);
    return { skipped: true, reason: 'invalid_actor', error: message, attempted: 0, succeeded: 0, reused: 0, failed: 0 };
  }

  const limit = Math.max(1, Math.min(500, Number(settings.max_renewals_per_run) || 100));
  const dueRows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT id,next_renewal_at FROM public.customer_subscriptions
    WHERE tenant_id=${tenantId} AND status='active' AND next_renewal_at <= CURRENT_DATE
    ORDER BY next_renewal_at,id
    LIMIT ${limit}
  `);

  let succeeded = 0;
  let reused = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const row of dueRows) {
    const expectedRenewalAt = String(row.next_renewal_at).slice(0, 10);
    try {
      const result = await materializeSubscriptionRenewal(tenantId, actor.id, Number(row.id), expectedRenewalAt);
      if (result.reused) reused += 1;
      else succeeded += 1;
    } catch (error) {
      failed += 1;
      errors.push(`subscription ${row.id}: ${text(error instanceof Error ? error.message : 'Unknown renewal error')}`);
    }
  }

  const errorSummary = errors.length ? text(errors.join('; ')) : null;
  await prisma.$executeRaw(Prisma.sql`
    UPDATE public.subscription_automation_settings
    SET last_run_at=NOW(),last_success_at=CASE WHEN ${failed}=0 THEN NOW() ELSE last_success_at END,
        last_error=${errorSummary},updated_at=NOW()
    WHERE tenant_id=${tenantId}
  `);
  return { skipped: false, attempted: dueRows.length, succeeded, reused, failed, error: errorSummary };
};

export const runDueSubscriptionAutomation = async () => {
  const tenants = await prisma.$queryRaw<Array<{ tenant_id: number }>>(Prisma.sql`
    SELECT tenant_id FROM public.subscription_automation_settings WHERE enabled=TRUE ORDER BY tenant_id
  `);
  const results = [];
  for (const row of tenants) results.push({ tenantId: Number(row.tenant_id), result: await runTenantSubscriptionAutomation(Number(row.tenant_id)) });
  return results;
};
