import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';
import { hashOrderToken, newOrderNumber, newOrderToken, RequestedOrderItem } from './ecommerce-order.p3.service';

export type GuestOrderInput = {
  publicSlug: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryAddress: Record<string, unknown>;
  notes: string | null;
  items: RequestedOrderItem[];
};

export const reserveGuestOrder = async (input: GuestOrderInput) => {
  const token = newOrderToken();
  const tokenHash = hashOrderToken(token);
  const orderNumber = newOrderNumber();

  const order = await prisma.$transaction(async (tx) => {
    const sites = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT id,tenant_id,fulfillment_outlet_id FROM public.website_sites
      WHERE lower(public_slug)=lower(${input.publicSlug}) AND status='published'
      LIMIT 1 FOR UPDATE
    `);
    const site = sites[0];
    if (!site) throw Object.assign(new Error('Published storefront not found'), { status: 404, code: 'STOREFRONT_NOT_FOUND' });
    if (!site.fulfillment_outlet_id) throw Object.assign(new Error('Fulfillment outlet is not configured'), { status: 409, code: 'FULFILLMENT_OUTLET_REQUIRED' });

    const outlet = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT id FROM public.outlets WHERE id=${site.fulfillment_outlet_id} AND tenant_id=${site.tenant_id} LIMIT 1
    `);
    if (!outlet[0]) throw Object.assign(new Error('Fulfillment outlet is invalid'), { status: 409, code: 'FULFILLMENT_OUTLET_INVALID' });

    const lines: any[] = [];
    let subtotal = 0;
    for (const requested of input.items) {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT i.id,i.name,i.sku,i.stock,i.track_stock,COALESCE(c.web_price,i.price) AS effective_price
        FROM public.web_catalog_items c
        JOIN public.items i ON i.id=c.item_id
        WHERE c.tenant_id=${site.tenant_id} AND c.site_id=${site.id} AND c.item_id=${requested.itemId}
          AND c.is_published=TRUE AND i.outlet_id=${site.fulfillment_outlet_id}
        LIMIT 1 FOR UPDATE OF i
      `);
      const item = rows[0];
      if (!item) throw Object.assign(new Error('Published item unavailable'), { status: 409, code: 'STOREFRONT_ITEM_UNAVAILABLE' });
      if (item.track_stock && Number(item.stock || 0) < requested.quantity) throw Object.assign(new Error(`Insufficient stock for ${item.name}`), { status: 409, code: 'INSUFFICIENT_STOCK' });
      const unitPrice = Number(item.effective_price || 0);
      const lineSubtotal = Math.round(unitPrice * requested.quantity * 100) / 100;
      subtotal += lineSubtotal;
      lines.push({ ...item, quantity: requested.quantity, unitPrice, lineSubtotal });
    }
    subtotal = Math.round(subtotal * 100) / 100;

    const addressJson = JSON.stringify(input.deliveryAddress);
    const created = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.ecommerce_orders
        (tenant_id,site_id,outlet_id,order_number,public_token_hash,customer_name,customer_phone,customer_email,delivery_address,notes,subtotal,total)
      VALUES (${site.tenant_id},${site.id},${site.fulfillment_outlet_id},${orderNumber},${tokenHash},${input.customerName},${input.customerPhone},${input.customerEmail},CAST(${addressJson} AS jsonb),${input.notes},${subtotal},${subtotal})
      RETURNING id,status,total
    `);
    const orderRow = created[0];

    for (const item of lines) {
      const reservedQty = item.track_stock ? item.quantity : 0;
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.ecommerce_order_items (tenant_id,order_id,item_id,item_name,sku,unit_price,quantity,subtotal,reserved_stock_quantity)
        VALUES (${site.tenant_id},${orderRow.id},${item.id},${item.name},${item.sku || null},${item.unitPrice},${item.quantity},${item.lineSubtotal},${reservedQty})
      `);
      if (item.track_stock) {
        const changed = await tx.$queryRaw<any[]>(Prisma.sql`
          UPDATE public.items SET stock=stock-${item.quantity}
          WHERE id=${item.id} AND stock>=${item.quantity}
          RETURNING id
        `);
        if (!changed[0]) throw Object.assign(new Error('Stock changed concurrently'), { status: 409, code: 'STOCK_CONCURRENT_UPDATE' });
      }
    }
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.ecommerce_order_events (tenant_id,order_id,event_type,to_status)
      VALUES (${site.tenant_id},${orderRow.id},'reserved','reserved')
    `);
    return orderRow;
  });

  return { orderNumber, token, status: order.status, total: order.total };
};
