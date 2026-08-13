import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

export type SubscriptionIntervalUnit = 'day' | 'week' | 'month' | 'year';

type PlanItemInput = { itemId: number; quantity: number; unitPrice?: number };

type CreatePlanInput = {
  code: string;
  name: string;
  description?: string | null;
  intervalUnit: SubscriptionIntervalUnit;
  intervalCount: number;
  currency?: string;
  items: PlanItemInput[];
};

const domainError = (message: string, code: string, status = 400) =>
  Object.assign(new Error(message), { code, status });

const positiveInt = (value: unknown, code: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw domainError('Expected positive integer', code);
  return parsed;
};

const money = (value: unknown, code: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw domainError('Invalid monetary amount', code);
  return Math.round(parsed * 100) / 100;
};

const quantity = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100000) throw domainError('Invalid subscription item quantity', 'INVALID_SUBSCRIPTION_QUANTITY');
  return Math.round(parsed * 1000) / 1000;
};

const dateOnly = (value: unknown, fallback = new Date()) => {
  const raw = value ? String(value) : fallback.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) throw domainError('Invalid date', 'INVALID_SUBSCRIPTION_DATE');
  return raw;
};

const advanceDate = (dateValue: string, unit: SubscriptionIntervalUnit, count: number) => {
  const date = new Date(`${dateValue}T00:00:00Z`);
  if (unit === 'day') date.setUTCDate(date.getUTCDate() + count);
  else if (unit === 'week') date.setUTCDate(date.getUTCDate() + (count * 7));
  else if (unit === 'month') date.setUTCMonth(date.getUTCMonth() + count);
  else date.setUTCFullYear(date.getUTCFullYear() + count);
  return date.toISOString().slice(0, 10);
};

const normalizeInterval = (unit: unknown, countValue: unknown) => {
  const normalized = String(unit || '').trim().toLowerCase() as SubscriptionIntervalUnit;
  if (!['day', 'week', 'month', 'year'].includes(normalized)) throw domainError('Invalid subscription interval', 'INVALID_SUBSCRIPTION_INTERVAL');
  const count = positiveInt(countValue, 'INVALID_SUBSCRIPTION_INTERVAL_COUNT');
  if (count > 120) throw domainError('Subscription interval is too large', 'INVALID_SUBSCRIPTION_INTERVAL_COUNT');
  return { unit: normalized, count };
};

const appendEvent = async (
  tx: Prisma.TransactionClient,
  input: { tenantId: number; subscriptionId: number; eventType: string; actorUserId: number; payload?: Record<string, unknown> },
) => {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.subscription_events (tenant_id,subscription_id,event_type,actor_user_id,payload)
    VALUES (${input.tenantId},${input.subscriptionId},${input.eventType},${input.actorUserId},CAST(${JSON.stringify(input.payload ?? {})} AS jsonb))
  `);
};

export const listSubscriptionPlans = async (tenantId: number) => prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT p.*,
    COALESCE(json_agg(json_build_object(
      'id',pi.id,'item_id',pi.item_id,'item_name',i.name,'sku',i.sku,
      'quantity',pi.quantity,'unit_price',pi.unit_price,'sort_order',pi.sort_order
    ) ORDER BY pi.sort_order,pi.id) FILTER (WHERE pi.id IS NOT NULL),'[]'::json) AS items
  FROM public.subscription_plans p
  LEFT JOIN public.subscription_plan_items pi ON pi.plan_id=p.id AND pi.tenant_id=p.tenant_id
  LEFT JOIN public.items i ON i.id=pi.item_id
  WHERE p.tenant_id=${tenantId}
  GROUP BY p.id
  ORDER BY p.id DESC
`);

export const createSubscriptionPlan = async (tenantId: number, userId: number, input: CreatePlanInput) => {
  const code = String(input.code || '').trim().toLowerCase();
  const name = String(input.name || '').trim();
  if (!code || code.length > 80 || !/^[a-z0-9][a-z0-9_-]*$/.test(code)) throw domainError('Invalid plan code', 'INVALID_SUBSCRIPTION_PLAN_CODE');
  if (!name || name.length > 180) throw domainError('Invalid plan name', 'INVALID_SUBSCRIPTION_PLAN_NAME');
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 100) throw domainError('Plan requires 1-100 items', 'INVALID_SUBSCRIPTION_PLAN_ITEMS');
  const { unit, count } = normalizeInterval(input.intervalUnit, input.intervalCount);
  const currency = String(input.currency || 'IDR').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw domainError('Invalid currency', 'INVALID_SUBSCRIPTION_CURRENCY');

  return prisma.$transaction(async (tx) => {
    const planRows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.subscription_plans
        (tenant_id,code,name,description,status,interval_unit,interval_count,currency,created_by,updated_by)
      VALUES (${tenantId},${code},${name},${input.description ? String(input.description).trim().slice(0, 2000) : null},'draft',${unit},${count},${currency},${userId},${userId})
      RETURNING *
    `);
    const plan = planRows[0];
    const seen = new Set<number>();
    for (let index = 0; index < input.items.length; index += 1) {
      const requested = input.items[index];
      const itemId = positiveInt(requested.itemId, 'INVALID_SUBSCRIPTION_ITEM_ID');
      if (seen.has(itemId)) throw domainError('Duplicate subscription plan item', 'DUPLICATE_SUBSCRIPTION_ITEM');
      seen.add(itemId);
      const itemRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT i.id,i.price,i.is_active
        FROM public.items i
        JOIN public.outlets o ON o.id=i.outlet_id
        WHERE i.id=${itemId} AND o.tenant_id=${tenantId}
        LIMIT 1
      `);
      const item = itemRows[0];
      if (!item || item.is_active === false) throw domainError('Subscription item is unavailable', 'SUBSCRIPTION_ITEM_UNAVAILABLE', 409);
      const unitPrice = requested.unitPrice === undefined ? money(item.price, 'INVALID_SUBSCRIPTION_PRICE') : money(requested.unitPrice, 'INVALID_SUBSCRIPTION_PRICE');
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.subscription_plan_items (tenant_id,plan_id,item_id,quantity,unit_price,sort_order)
        VALUES (${tenantId},${Number(plan.id)},${itemId},${quantity(requested.quantity)},${unitPrice},${index})
      `);
    }
    return plan;
  });
};

export const updateSubscriptionPlanStatus = async (tenantId: number, userId: number, planIdValue: unknown, targetValue: unknown) => {
  const planId = positiveInt(planIdValue, 'INVALID_SUBSCRIPTION_PLAN_ID');
  const target = String(targetValue || '').trim().toLowerCase();
  const transitions: Record<string, string[]> = { draft: ['active', 'archived'], active: ['archived'], archived: [] };
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.subscription_plans WHERE id=${planId} AND tenant_id=${tenantId} FOR UPDATE`);
    const plan = rows[0];
    if (!plan) throw domainError('Subscription plan not found', 'SUBSCRIPTION_PLAN_NOT_FOUND', 404);
    if (!(transitions[String(plan.status)] || []).includes(target)) throw domainError('Invalid subscription plan transition', 'INVALID_SUBSCRIPTION_PLAN_TRANSITION', 409);
    const changed = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.subscription_plans SET status=${target},updated_by=${userId},updated_at=NOW()
      WHERE id=${planId} AND tenant_id=${tenantId} AND status=${String(plan.status)} RETURNING *
    `);
    if (!changed[0]) throw domainError('Concurrent subscription plan update', 'SUBSCRIPTION_PLAN_CONCURRENT_UPDATE', 409);
    return changed[0];
  });
};

export const listCustomerSubscriptions = async (tenantId: number) => prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT s.*,c.name AS customer_name,c.phone AS customer_phone,o.name AS outlet_name,p.name AS plan_name,
    COALESCE((SELECT SUM(r.amount) FROM public.subscription_renewals r WHERE r.tenant_id=s.tenant_id AND r.subscription_id=s.id AND r.status='materialized'),0) AS billed_total,
    COALESCE((SELECT COUNT(*) FROM public.subscription_renewals r WHERE r.tenant_id=s.tenant_id AND r.subscription_id=s.id AND r.status='materialized'),0)::int AS renewal_count
  FROM public.customer_subscriptions s
  JOIN public.customers c ON c.id=s.customer_id
  JOIN public.outlets o ON o.id=s.outlet_id AND o.tenant_id=s.tenant_id
  LEFT JOIN public.subscription_plans p ON p.id=s.plan_id AND p.tenant_id=s.tenant_id
  WHERE s.tenant_id=${tenantId}
  ORDER BY s.id DESC
`);

export const createCustomerSubscription = async (
  tenantId: number,
  userId: number,
  input: { planId: number; customerId: number; startsOn?: string; notes?: string | null },
) => prisma.$transaction(async (tx) => {
  const planId = positiveInt(input.planId, 'INVALID_SUBSCRIPTION_PLAN_ID');
  const customerId = positiveInt(input.customerId, 'INVALID_CUSTOMER_ID');
  const startsOn = dateOnly(input.startsOn);
  const planRows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT * FROM public.subscription_plans WHERE id=${planId} AND tenant_id=${tenantId} AND status='active' LIMIT 1
  `);
  const plan = planRows[0];
  if (!plan) throw domainError('Active subscription plan not found', 'SUBSCRIPTION_PLAN_NOT_ACTIVE', 409);
  const customerRows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT c.id,c.name,c.outlet_id FROM public.customers c
    JOIN public.outlets o ON o.id=c.outlet_id AND o.tenant_id=${tenantId}
    WHERE c.id=${customerId} LIMIT 1
  `);
  const customer = customerRows[0];
  if (!customer?.outlet_id) throw domainError('Tenant customer not found', 'CUSTOMER_NOT_FOUND', 404);
  const itemRows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT pi.item_id,pi.quantity,pi.unit_price,pi.sort_order,i.name,i.sku,i.outlet_id,i.is_active
    FROM public.subscription_plan_items pi
    JOIN public.items i ON i.id=pi.item_id
    WHERE pi.tenant_id=${tenantId} AND pi.plan_id=${planId}
    ORDER BY pi.sort_order,pi.id
  `);
  if (!itemRows.length) throw domainError('Subscription plan has no items', 'SUBSCRIPTION_PLAN_EMPTY', 409);
  for (const item of itemRows) {
    if (item.is_active === false || Number(item.outlet_id) !== Number(customer.outlet_id)) throw domainError('Plan item is not available in the customer outlet', 'SUBSCRIPTION_PLAN_OUTLET_MISMATCH', 409);
  }
  const seqRows = await tx.$queryRaw<Array<{ seq: bigint }>>(Prisma.sql`SELECT nextval('public.subscription_number_seq')::bigint AS seq`);
  const seq = String(seqRows[0].seq).padStart(6, '0');
  const subscriptionNumber = `SUB-${new Date().getUTCFullYear()}-${seq}`;
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    INSERT INTO public.customer_subscriptions
      (tenant_id,outlet_id,customer_id,plan_id,subscription_number,status,interval_unit,interval_count,currency,starts_on,next_renewal_at,notes,created_by,updated_by)
    VALUES (${tenantId},${Number(customer.outlet_id)},${customerId},${planId},${subscriptionNumber},'draft',${String(plan.interval_unit)},${Number(plan.interval_count)},${String(plan.currency)},CAST(${startsOn} AS date),CAST(${startsOn} AS date),${input.notes ? String(input.notes).trim().slice(0, 2000) : null},${userId},${userId})
    RETURNING *
  `);
  const subscription = rows[0];
  for (const item of itemRows) {
    const qty = Number(item.quantity);
    const unitPrice = Number(item.unit_price);
    const lineTotal = Math.round(qty * unitPrice * 100) / 100;
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.customer_subscription_items
        (tenant_id,subscription_id,item_id,item_name,sku,quantity,unit_price,line_total,sort_order)
      VALUES (${tenantId},${Number(subscription.id)},${Number(item.item_id)},${String(item.name)},${item.sku ? String(item.sku) : null},${qty},${unitPrice},${lineTotal},${Number(item.sort_order)})
    `);
  }
  await appendEvent(tx, { tenantId, subscriptionId: Number(subscription.id), eventType: 'created', actorUserId: userId, payload: { planId, customerId } });
  return subscription;
});

export const updateCustomerSubscriptionStatus = async (tenantId: number, userId: number, subscriptionIdValue: unknown, targetValue: unknown) => {
  const subscriptionId = positiveInt(subscriptionIdValue, 'INVALID_SUBSCRIPTION_ID');
  const target = String(targetValue || '').trim().toLowerCase();
  const transitions: Record<string, string[]> = { draft: ['active', 'cancelled'], active: ['paused', 'cancelled'], paused: ['active', 'cancelled'], cancelled: [] };
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.customer_subscriptions WHERE id=${subscriptionId} AND tenant_id=${tenantId} FOR UPDATE`);
    const subscription = rows[0];
    if (!subscription) throw domainError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND', 404);
    if (subscription.status === target) return subscription;
    if (!(transitions[String(subscription.status)] || []).includes(target)) throw domainError('Invalid subscription transition', 'INVALID_SUBSCRIPTION_TRANSITION', 409);
    const changed = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.customer_subscriptions
      SET status=${target},cancelled_at=CASE WHEN ${target}='cancelled' THEN NOW() ELSE cancelled_at END,updated_by=${userId},updated_at=NOW()
      WHERE id=${subscriptionId} AND tenant_id=${tenantId} AND status=${String(subscription.status)} RETURNING *
    `);
    if (!changed[0]) throw domainError('Concurrent subscription update', 'SUBSCRIPTION_CONCURRENT_UPDATE', 409);
    await appendEvent(tx, { tenantId, subscriptionId, eventType: 'status_changed', actorUserId: userId, payload: { from: subscription.status, to: target } });
    return changed[0];
  });
};

export const materializeSubscriptionRenewal = async (tenantId: number, userId: number, subscriptionIdValue: unknown) => {
  const subscriptionId = positiveInt(subscriptionIdValue, 'INVALID_SUBSCRIPTION_ID');
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT s.*,c.name AS customer_name
      FROM public.customer_subscriptions s
      JOIN public.customers c ON c.id=s.customer_id
      JOIN public.outlets o ON o.id=s.outlet_id AND o.tenant_id=s.tenant_id
      WHERE s.id=${subscriptionId} AND s.tenant_id=${tenantId}
      FOR UPDATE OF s
    `);
    const subscription = rows[0];
    if (!subscription) throw domainError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND', 404);
    if (subscription.status !== 'active') throw domainError('Subscription must be active before renewal', 'SUBSCRIPTION_NOT_ACTIVE', 409);

    const periodStart = dateOnly(subscription.next_renewal_at);
    const { unit, count } = normalizeInterval(subscription.interval_unit, subscription.interval_count);
    const periodEnd = advanceDate(periodStart, unit, count);
    const idempotencyKey = `subscription:${subscriptionId}:${periodStart}:${periodEnd}`;

    const existing = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.subscription_renewals
      WHERE tenant_id=${tenantId} AND subscription_id=${subscriptionId}
        AND period_start=CAST(${periodStart} AS date) AND period_end=CAST(${periodEnd} AS date)
      LIMIT 1
    `);
    if (existing[0]?.status === 'materialized') return { renewal: existing[0], reused: true };
    if (existing[0]) throw domainError('Subscription renewal is already being processed', 'SUBSCRIPTION_RENEWAL_EXISTS', 409);

    const items = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.customer_subscription_items
      WHERE tenant_id=${tenantId} AND subscription_id=${subscriptionId}
      ORDER BY sort_order,id
    `);
    if (!items.length) throw domainError('Subscription has no billable items', 'SUBSCRIPTION_ITEMS_EMPTY', 409);
    const total = Math.round(items.reduce((sum, item) => sum + Number(item.line_total), 0) * 100) / 100;

    const renewalRows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.subscription_renewals
        (tenant_id,subscription_id,period_start,period_end,due_at,status,amount,idempotency_key,created_by)
      VALUES (${tenantId},${subscriptionId},CAST(${periodStart} AS date),CAST(${periodEnd} AS date),CAST(${periodStart} AS date),'pending',${total},${idempotencyKey},${userId})
      RETURNING *
    `);
    const renewal = renewalRows[0];

    const orderSeqRows = await tx.$queryRaw<Array<{ seq: bigint }>>(Prisma.sql`SELECT nextval('public.sales_order_number_seq')::bigint AS seq`);
    const orderNumber = `SO-${new Date().getUTCFullYear()}-${String(orderSeqRows[0].seq).padStart(6, '0')}`;
    const orderRows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.sales_orders
        (tenant_id,outlet_id,customer_id,sales_order_number,status,currency,subtotal,discount_amount,tax_amount,total,notes,created_by,confirmed_at)
      VALUES (${tenantId},${Number(subscription.outlet_id)},${Number(subscription.customer_id)},${orderNumber},'confirmed',${String(subscription.currency)},${total},0,0,${total},${`Subscription renewal ${subscription.subscription_number} ${periodStart} - ${periodEnd}`},${userId},NOW())
      RETURNING *
    `);
    const salesOrder = orderRows[0];
    for (const item of items) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.sales_order_items (sales_order_id,item_id,description,quantity,unit_price,discount_amount,tax_rate,line_total)
        VALUES (${Number(salesOrder.id)},${Number(item.item_id)},${String(item.item_name)},${Number(item.quantity)},${Number(item.unit_price)},0,0,${Number(item.line_total)})
      `);
    }

    const invoiceNumber = `SUB-${subscription.subscription_number}-${periodStart.replace(/-/g, '')}`.slice(0, 100);
    const receivableRows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO accounting.accounts_receivable
        (tenant_id,outlet_id,customer_id,customer_name,invoice_number,invoice_date,due_date,amount,received_amount,balance,status,reference_type,reference_id,notes,created_by)
      VALUES (${tenantId},${Number(subscription.outlet_id)},${Number(subscription.customer_id)},${String(subscription.customer_name)},${invoiceNumber},CAST(${periodStart} AS date),CAST(${periodStart} AS date),${total},0,${total},'unpaid','subscription_renewal',${Number(renewal.id)},${`Generated from subscription ${subscription.subscription_number}; sales order ${orderNumber}`},${userId})
      RETURNING *
    `);
    const receivable = receivableRows[0];

    const materializedRows = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.subscription_renewals
      SET status='materialized',sales_order_id=${Number(salesOrder.id)},receivable_id=${Number(receivable.id)},materialized_at=NOW(),updated_at=NOW()
      WHERE id=${Number(renewal.id)} AND tenant_id=${tenantId} AND status='pending'
      RETURNING *
    `);
    if (!materializedRows[0]) throw domainError('Concurrent renewal materialization', 'SUBSCRIPTION_RENEWAL_CONCURRENT_UPDATE', 409);

    await tx.$executeRaw(Prisma.sql`
      UPDATE public.customer_subscriptions
      SET current_period_start=CAST(${periodStart} AS date),current_period_end=CAST(${periodEnd} AS date),next_renewal_at=CAST(${periodEnd} AS date),updated_by=${userId},updated_at=NOW()
      WHERE id=${subscriptionId} AND tenant_id=${tenantId}
    `);
    await appendEvent(tx, {
      tenantId,
      subscriptionId,
      eventType: 'renewal_materialized',
      actorUserId: userId,
      payload: { renewalId: Number(renewal.id), salesOrderId: Number(salesOrder.id), receivableId: Number(receivable.id), periodStart, periodEnd, amount: total },
    });
    return { renewal: materializedRows[0], salesOrder, receivable, reused: false };
  });
};
