import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';
import {
  lockRentalSetting,
  rentalDurationUnits,
  rentalError,
  rentalPositiveInt,
  rentalTimestamp,
  reservedRentalQuantity,
  type RentalRateUnit,
} from './rental-availability.p3.service';

type RentalStatus = 'reserved' | 'confirmed' | 'picked_up' | 'returned' | 'cancelled';
type RentalItemInput = { itemId: number; quantity: number };

const appendEvent = async (
  tx: Prisma.TransactionClient,
  input: { tenantId: number; bookingId: number; eventType: string; actorUserId: number; payload?: Record<string, unknown> },
) => {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.rental_events (tenant_id,booking_id,event_type,actor_user_id,payload)
    VALUES (${input.tenantId},${input.bookingId},${input.eventType},${input.actorUserId},CAST(${JSON.stringify(input.payload ?? {})} AS jsonb))
  `);
};

const normalizeItems = (items: RentalItemInput[]) => {
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) throw rentalError('Rental booking requires 1-50 item lines', 'INVALID_RENTAL_ITEMS');
  const aggregated = new Map<number, number>();
  for (const row of items) {
    const itemId = rentalPositiveInt(row.itemId, 'INVALID_RENTAL_ITEM_ID');
    const quantity = rentalPositiveInt(row.quantity, 'INVALID_RENTAL_QUANTITY', 1000);
    const next = (aggregated.get(itemId) || 0) + quantity;
    if (next > 1000) throw rentalError('Rental item quantity is too large', 'INVALID_RENTAL_QUANTITY');
    aggregated.set(itemId, next);
  }
  return [...aggregated.entries()].map(([itemId, quantity]) => ({ itemId, quantity })).sort((a, b) => a.itemId - b.itemId);
};

export const listRentalBookings = async (tenantId: number) => prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT b.id::int AS id,b.tenant_id,b.outlet_id,o.name AS outlet_name,b.customer_id,c.name AS customer_name,c.phone AS customer_phone,
    b.booking_number,b.status,b.starts_at,b.ends_at,b.currency,b.subtotal,b.deposit_amount,b.deposit_status,b.notes,
    b.picked_up_at,b.returned_at,b.cancelled_at,b.created_at,b.updated_at,
    COALESCE(json_agg(json_build_object(
      'id',bi.id::int,'item_id',bi.item_id,'item_name',bi.item_name,'sku',bi.sku,'quantity',bi.quantity,
      'rate_unit',bi.rate_unit,'rate_amount',bi.rate_amount,'duration_units',bi.duration_units,'line_total',bi.line_total,'deposit_amount',bi.deposit_amount
    ) ORDER BY bi.id) FILTER (WHERE bi.id IS NOT NULL),'[]'::json) AS items
  FROM public.rental_bookings b
  JOIN public.customers c ON c.id=b.customer_id
  JOIN public.outlets o ON o.id=b.outlet_id AND o.tenant_id=b.tenant_id
  LEFT JOIN public.rental_booking_items bi ON bi.booking_id=b.id AND bi.tenant_id=b.tenant_id
  WHERE b.tenant_id=${tenantId}
  GROUP BY b.id,o.name,c.name,c.phone
  ORDER BY b.starts_at DESC,b.id DESC
`);

export const createRentalBooking = async (
  tenantId: number,
  userId: number,
  input: { customerId: number; startsAt: string; endsAt: string; notes?: string | null; items: RentalItemInput[] },
) => {
  const customerId = rentalPositiveInt(input.customerId, 'INVALID_RENTAL_CUSTOMER_ID');
  const startsAt = rentalTimestamp(input.startsAt, 'INVALID_RENTAL_START');
  const endsAt = rentalTimestamp(input.endsAt, 'INVALID_RENTAL_END');
  if (endsAt <= startsAt) throw rentalError('Rental end must be after start', 'INVALID_RENTAL_PERIOD');
  const requestedItems = normalizeItems(input.items);

  return prisma.$transaction(async (tx) => {
    const customerRows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT c.id,c.name,c.outlet_id
      FROM public.customers c
      JOIN public.outlets o ON o.id=c.outlet_id AND o.tenant_id=${tenantId}
      WHERE c.id=${customerId}
      LIMIT 1
    `);
    const customer = customerRows[0];
    if (!customer?.outlet_id) throw rentalError('Tenant customer not found', 'RENTAL_CUSTOMER_NOT_FOUND', 404);
    const outletId = Number(customer.outlet_id);

    const prepared: Array<{
      itemId: number; itemName: string; sku: string | null; quantity: number; rateUnit: RentalRateUnit;
      rateAmount: number; durationUnits: number; lineTotal: number; depositAmount: number;
    }> = [];
    let subtotal = 0;
    let depositAmount = 0;

    for (const requested of requestedItems) {
      const setting = await lockRentalSetting(tx, tenantId, outletId, requested.itemId);
      const units = rentalDurationUnits(startsAt, endsAt, String(setting.rate_unit) as RentalRateUnit);
      if (units < Number(setting.minimum_duration)) throw rentalError('Rental period is below the item minimum', 'RENTAL_PERIOD_BELOW_MINIMUM', 409);
      if (setting.maximum_duration != null && units > Number(setting.maximum_duration)) throw rentalError('Rental period exceeds the item maximum', 'RENTAL_PERIOD_ABOVE_MAXIMUM', 409);

      const totalStock = Math.max(0, Math.floor(Number(setting.stock || 0)));
      const reserved = await reservedRentalQuantity(tx, {
        tenantId,
        outletId,
        itemId: requested.itemId,
        startsAt,
        endsAt,
        bufferMinutes: Number(setting.buffer_minutes || 0),
      });
      const available = Math.max(0, totalStock - reserved);
      if (requested.quantity > available) throw rentalError('Rental item is overbooked for the requested period', 'RENTAL_ITEM_OVERBOOKED', 409);

      const rateAmount = Number(setting.rate_amount);
      const lineTotal = Math.round(requested.quantity * units * rateAmount * 100) / 100;
      const lineDeposit = Math.round(requested.quantity * Number(setting.deposit_amount) * 100) / 100;
      subtotal += lineTotal;
      depositAmount += lineDeposit;
      prepared.push({
        itemId: requested.itemId,
        itemName: String(setting.item_name),
        sku: setting.sku ? String(setting.sku) : null,
        quantity: requested.quantity,
        rateUnit: String(setting.rate_unit) as RentalRateUnit,
        rateAmount,
        durationUnits: units,
        lineTotal,
        depositAmount: lineDeposit,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    depositAmount = Math.round(depositAmount * 100) / 100;
    const seqRows = await tx.$queryRaw<Array<{ seq: bigint }>>(Prisma.sql`SELECT nextval('public.rental_booking_number_seq')::bigint AS seq`);
    const bookingNumber = `RNT-${new Date().getUTCFullYear()}-${String(seqRows[0].seq).padStart(6, '0')}`;
    const bookingRows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.rental_bookings
        (tenant_id,outlet_id,customer_id,booking_number,status,starts_at,ends_at,currency,subtotal,deposit_amount,deposit_status,notes,created_by,updated_by)
      VALUES (${tenantId},${outletId},${customerId},${bookingNumber},'reserved',${startsAt},${endsAt},'IDR',${subtotal},${depositAmount},${depositAmount > 0 ? 'pending' : 'not_required'},${input.notes ? String(input.notes).trim().slice(0,2000) : null},${userId},${userId})
      RETURNING id::int AS id,tenant_id,outlet_id,customer_id,booking_number,status,starts_at,ends_at,currency,subtotal,deposit_amount,deposit_status,notes,created_at,updated_at
    `);
    const booking = bookingRows[0];

    for (const row of prepared) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.rental_booking_items
          (tenant_id,booking_id,item_id,item_name,sku,quantity,rate_unit,rate_amount,duration_units,line_total,deposit_amount)
        VALUES (${tenantId},${Number(booking.id)},${row.itemId},${row.itemName},${row.sku},${row.quantity},${row.rateUnit},${row.rateAmount},${row.durationUnits},${row.lineTotal},${row.depositAmount})
      `);
    }
    await appendEvent(tx, {
      tenantId,
      bookingId: Number(booking.id),
      eventType: 'reserved',
      actorUserId: userId,
      payload: { customerId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), itemCount: prepared.length },
    });
    return { ...booking, items: prepared };
  });
};

export const updateRentalBookingStatus = async (tenantId: number, userId: number, bookingIdValue: unknown, targetValue: unknown) => {
  const bookingId = rentalPositiveInt(bookingIdValue, 'INVALID_RENTAL_BOOKING_ID');
  const target = String(targetValue || '').trim().toLowerCase() as RentalStatus;
  const transitions: Record<RentalStatus, RentalStatus[]> = {
    reserved: ['confirmed', 'cancelled'],
    confirmed: ['picked_up', 'cancelled'],
    picked_up: ['returned'],
    returned: [],
    cancelled: [],
  };
  if (!Object.prototype.hasOwnProperty.call(transitions, target)) throw rentalError('Invalid rental status', 'INVALID_RENTAL_STATUS');

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT id::int AS id,tenant_id,outlet_id,status,starts_at,ends_at
      FROM public.rental_bookings
      WHERE id=${bookingId} AND tenant_id=${tenantId}
      FOR UPDATE
    `);
    const booking = rows[0];
    if (!booking) throw rentalError('Rental booking not found', 'RENTAL_BOOKING_NOT_FOUND', 404);
    if (booking.status === target) return booking;
    if (!(transitions[String(booking.status) as RentalStatus] || []).includes(target)) throw rentalError('Invalid rental booking transition', 'INVALID_RENTAL_TRANSITION', 409);

    const changedRows = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.rental_bookings SET
        status=${target},
        picked_up_at=CASE WHEN ${target}='picked_up' THEN COALESCE(picked_up_at,NOW()) ELSE picked_up_at END,
        returned_at=CASE WHEN ${target}='returned' THEN COALESCE(returned_at,NOW()) ELSE returned_at END,
        cancelled_at=CASE WHEN ${target}='cancelled' THEN COALESCE(cancelled_at,NOW()) ELSE cancelled_at END,
        updated_by=${userId},updated_at=NOW()
      WHERE id=${bookingId} AND tenant_id=${tenantId} AND status=${String(booking.status)}
      RETURNING id::int AS id,tenant_id,outlet_id,status,starts_at,ends_at,picked_up_at,returned_at,cancelled_at,updated_at
    `);
    const changed = changedRows[0];
    if (!changed) throw rentalError('Concurrent rental booking update', 'RENTAL_BOOKING_CONCURRENT_UPDATE', 409);
    await appendEvent(tx, { tenantId, bookingId, eventType: target, actorUserId: userId, payload: { from: booking.status, to: target } });
    return changed;
  });
};
