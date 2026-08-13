import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

export const getSubscriptionSummary = async (tenantId: number) => {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT
      (SELECT COUNT(*)::int FROM public.subscription_plans p WHERE p.tenant_id=${tenantId} AND p.status='active') AS active_plans,
      COUNT(DISTINCT s.id)::int AS active_contracts,
      COALESCE(SUM(CASE s.interval_unit
        WHEN 'day' THEN si.line_total * (30.0 / s.interval_count)
        WHEN 'week' THEN si.line_total * ((52.0 / 12.0) / s.interval_count)
        WHEN 'month' THEN si.line_total / s.interval_count
        WHEN 'year' THEN si.line_total / (12.0 * s.interval_count)
        ELSE 0 END),0) AS monthly_recurring_revenue,
      COALESCE((SELECT SUM(r.amount) FROM public.subscription_renewals r WHERE r.tenant_id=${tenantId} AND r.status='materialized'),0) AS billed_total
    FROM public.customer_subscriptions s
    LEFT JOIN public.customer_subscription_items si ON si.tenant_id=s.tenant_id AND si.subscription_id=s.id
    WHERE s.tenant_id=${tenantId} AND s.status='active'
  `);
  return rows[0] ?? { active_plans: 0, active_contracts: 0, monthly_recurring_revenue: 0, billed_total: 0 };
};
