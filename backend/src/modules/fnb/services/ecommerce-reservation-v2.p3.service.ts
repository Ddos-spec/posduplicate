import prisma from '../../../utils/prisma';
import { lockPublishedCatalogItem, lockPublishedStorefront } from './ecommerce-catalog-lock.p3.service';
import { hashOrderToken, newOrderNumber, newOrderToken, RequestedOrderItem } from './ecommerce-order.p3.service';
import { appendOrderEvent, decrementReservedStock, insertGuestOrder, insertReservedOrderLine } from './ecommerce-order-write.p3.service';

export type GuestReservationInput = {
  publicSlug: string; customerName: string; customerPhone: string; customerEmail: string | null;
  deliveryAddress: Record<string, unknown>; notes: string | null; items: RequestedOrderItem[];
};

export const reserveGuestOrderV2 = async (input: GuestReservationInput) => {
  const token = newOrderToken();
  const orderNumber = newOrderNumber();
  const tokenHash = hashOrderToken(token);

  const order = await prisma.$transaction(async (tx) => {
    const site = await lockPublishedStorefront(tx, input.publicSlug);
    const lines: Array<{ item: any; quantity: number; unitPrice: number; subtotal: number; reservedStock: number }> = [];
    let total = 0;

    for (const requested of input.items) {
      const item = await lockPublishedCatalogItem(tx, site, requested.itemId);
      const reservedStock = item.track_stock ? requested.quantity : 0;
      if (reservedStock > 0 && Number(item.stock || 0) < reservedStock) throw Object.assign(new Error(`Insufficient stock for ${item.name}`), { status: 409, code: 'INSUFFICIENT_STOCK' });
      const unitPrice = Number(item.effective_price || 0);
      const subtotal = Math.round(unitPrice * requested.quantity * 100) / 100;
      total += subtotal;
      lines.push({ item, quantity: requested.quantity, unitPrice, subtotal, reservedStock });
    }
    total = Math.round(total * 100) / 100;

    const row = await insertGuestOrder(tx, {
      tenantId: Number(site.tenant_id), siteId: Number(site.id), outletId: Number(site.fulfillment_outlet_id),
      orderNumber, tokenHash, customerName: input.customerName, customerPhone: input.customerPhone,
      customerEmail: input.customerEmail, deliveryAddress: input.deliveryAddress, notes: input.notes, total,
    });

    for (const line of lines) {
      await insertReservedOrderLine(tx, {
        tenantId: Number(site.tenant_id), orderId: Number(row.id), itemId: Number(line.item.id), itemName: String(line.item.name),
        sku: line.item.sku || null, unitPrice: line.unitPrice, quantity: line.quantity, subtotal: line.subtotal, reservedStock: line.reservedStock,
      });
      await decrementReservedStock(tx, Number(line.item.id), line.reservedStock);
    }
    await appendOrderEvent(tx, { tenantId: Number(site.tenant_id), orderId: Number(row.id), eventType: 'reserved', toStatus: 'reserved' });
    return row;
  });

  return { orderNumber, token, status: order.status, total: order.total };
};
