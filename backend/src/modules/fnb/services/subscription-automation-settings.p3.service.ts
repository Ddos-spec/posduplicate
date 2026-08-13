import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const MANAGE_ROLES = new Set(['owner', 'manager', 'admin', 'super admin', 'super_admin']);
const fail = (message: string, code: string, status = 400) => Object.assign(new Error(message), { code, status });

export type SubscriptionAutomationSettingsInput = {
  enabled: boolean;
  automationUserId?: number | null;
  maxRenewalsPerRun?: number;
};

export const validateSubscriptionAutomationActor = async (tenantId: number, userIdValue: unknown) => {
  const userId = Number(userIdValue);
  if (!Number.isInteger(userId) || userId <= 0) throw fail('Automation actor is required', 'SUBSCRIPTION_AUTOMATION_ACTOR_REQUIRED');
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT u.id,u.tenant_id,u.is_active,r.name AS role_name
    FROM public.users u JOIN public.roles r ON r.id=u.role_id
    WHERE u.id=${userId} LIMIT 1
  `);
  const actor = rows[0];
  if (!actor || Number(actor.tenant_id) !== tenantId || actor.is_active === false) {
    throw fail('Automation actor must be an active user in this tenant', 'SUBSCRIPTION_AUTOMATION_ACTOR_INVALID', 409);
  }
  const role = String(actor.role_name || '').trim().toLowerCase();
  if (!MANAGE_ROLES.has(role)) throw fail('Automation actor lacks subscription management authority', 'SUBSCRIPTION_AUTOMATION_ACTOR_FORBIDDEN', 403);
  return { id: Number(actor.id), role };
};

export const getSubscriptionAutomationSettings = async (tenantId: number) => {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT s.*,u.name AS automation_user_name,u.email AS automation_user_email,r.name AS automation_user_role
    FROM public.subscription_automation_settings s
    LEFT JOIN public.users u ON u.id=s.automation_user_id
    LEFT JOIN public.roles r ON r.id=u.role_id
    WHERE s.tenant_id=${tenantId} LIMIT 1
  `);
  return rows[0] ?? { tenant_id: tenantId, enabled: false, automation_user_id: null, max_renewals_per_run: 100, last_run_at: null, last_success_at: null, last_error: null };
};

export const updateSubscriptionAutomationSettings = async (tenantId: number, updatedBy: number, input: SubscriptionAutomationSettingsInput) => {
  const enabled = Boolean(input.enabled);
  const actorId = input.automationUserId == null ? null : Number(input.automationUserId);
  const maxRenewals = input.maxRenewalsPerRun == null ? 100 : Number(input.maxRenewalsPerRun);
  if (!Number.isInteger(maxRenewals) || maxRenewals < 1 || maxRenewals > 500) throw fail('Invalid automation batch size', 'INVALID_SUBSCRIPTION_AUTOMATION_BATCH');
  if (actorId != null) await validateSubscriptionAutomationActor(tenantId, actorId);
  if (enabled && actorId == null) throw fail('Automation actor is required when enabled', 'SUBSCRIPTION_AUTOMATION_ACTOR_REQUIRED');
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    INSERT INTO public.subscription_automation_settings (tenant_id,enabled,automation_user_id,max_renewals_per_run,updated_by)
    VALUES (${tenantId},${enabled},${actorId},${maxRenewals},${updatedBy})
    ON CONFLICT (tenant_id) DO UPDATE SET enabled=EXCLUDED.enabled,automation_user_id=EXCLUDED.automation_user_id,
      max_renewals_per_run=EXCLUDED.max_renewals_per_run,updated_by=EXCLUDED.updated_by,
      last_error=CASE WHEN EXCLUDED.enabled THEN subscription_automation_settings.last_error ELSE NULL END,updated_at=NOW()
    RETURNING *
  `);
  return rows[0];
};
