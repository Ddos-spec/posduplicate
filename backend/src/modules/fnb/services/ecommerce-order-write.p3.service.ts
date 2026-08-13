import { Prisma } from '@prisma/client';

export const findGuestOrderByTokenHash = async (tx: Prisma.TransactionClient, tokenHash: string) => {
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT id,tenant_id,site_id,order_number,status,total FROM public.ecommerce_orders WHERE public_token_hash=${tokenHash} LIMIT 1`);
  return rows[0] ?? null;
};

export const insertGuestOrder = async (tx: Prisma.TransactionClient, input: {
  tenantId: number; siteId: number; outletId: number; orderNumber: string; tokenHash: string;
  customerName: string; customerPhone: string; customerEmail: string | null;
  deliveryAddress: Record<string, unknown>; notes: string | null; total: number;
}) => {
  const addressJson = JSON.stringify(input.deliveryAddress);
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    INSERT INTO public.ecommerce_orders
      (tenant_id,site_id,outlet_id,order_number,public_token_hash,customer_name,customer_phone,customer_email,delivery_address,notes,subtotal,total)
    VALUES (${input.tenantId},${input.siteId},${input.outletId},${input.orderNumber},${input.tokenHash},${input.customerName},${input.customerPhone},${input.customerEmail},CAST(${addressJson} AS jsonb),${input.notes},${input.total},${input.total})
    RETURNING id,order_number,status,total
  `);
  return rows[0];
};

export const insertReservedOrderLine = async (tx: Prisma.TransactionClient, input: {
  tenantId: number; orderId: number; itemId: number; itemName: string; sku: string | null;
  unitPrice: number; quantity: number; subtotal: number; reservedStock: number;
}) => {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.ecommerce_order_items
      (tenant_id,order_id,item_id,item_name,sku,unit_price,quantity,subtotal,reserved_stock_quantity)
    VALUES (${input.tenantId},${input.orderId},${input.itemId},${input.itemName},${input.sku},${input.unitPrice},${input.quantity},${input.subtotal},${input.reservedStock})
  `);
};

export const decrementReservedStock = async (tx: Prisma.TransactionClient, itemId: number, quantity: number) => {
  if (quantity <= 0) return;
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    UPDATE public.items SET stock=stock-${quantity}
    WHERE id=${itemId} AND stock>=${quantity}
    RETURNING id
  `);
  if (!rows[0]) throw Object.assign(new Error('Stock changed concurrently'), { status: 409, code: 'STOCK_CONCURRENT_UPDATE' });
};

export const appendOrderEvent = async (tx: Prisma.TransactionClient, input: {
  tenantId: number; orderId: number; eventType: string; fromStatus?: string | null; toStatus?: string | null; actorUserId?: number | null;
}) => {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.ecommerce_order_events (tenant_id,order_id,event_type,from_status,to_status,actor_user_id)
    VALUES (${input.tenantId},${input.orderId},${input.eventType},${input.fromStatus ?? null},${input.toStatus ?? null},${input.actorUserId ?? null})
  `);
};
