import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const TRANSITIONS: Record<string, string[]> = {
  reserved: ['confirmed'], confirmed: ['preparing'], preparing: ['ready'], ready: ['completed'], completed: [], cancelled: [],
};

export const transitionOrder = async (tenantId: number, userId: number, orderId: number, target: string) => prisma.$transaction(async (tx) => {
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.ecommerce_orders WHERE id=${orderId} AND tenant_id=${tenantId} FOR UPDATE`);
  const order = rows[0];
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404, code: 'ECOMMERCE_ORDER_NOT_FOUND' });
  if (!(TRANSITIONS[order.status] || []).includes(target)) throw Object.assign(new Error('Invalid order transition'), { status: 409, code: 'INVALID_ECOMMERCE_ORDER_TRANSITION' });
  const changed = await tx.$queryRaw<any[]>(Prisma.sql`
    UPDATE public.ecommerce_orders SET status=${target},updated_at=NOW(),
      confirmed_at=CASE WHEN ${target}='confirmed' THEN NOW() ELSE confirmed_at END,
      preparing_at=CASE WHEN ${target}='preparing' THEN NOW() ELSE preparing_at END,
      ready_at=CASE WHEN ${target}='ready' THEN NOW() ELSE ready_at END,
      completed_at=CASE WHEN ${target}='completed' THEN NOW() ELSE completed_at END
    WHERE id=${orderId} AND tenant_id=${tenantId} AND status=${String(order.status)} RETURNING *
  `);
  if (!changed[0]) throw Object.assign(new Error('Concurrent order update'), { status: 409, code: 'ECOMMERCE_ORDER_CONCURRENT_UPDATE' });
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.ecommerce_order_events (tenant_id,order_id,event_type,from_status,to_status,actor_user_id)
    VALUES (${tenantId},${orderId},'status_changed',${String(order.status)},${target},${userId})
  `);
  return changed[0];
});
