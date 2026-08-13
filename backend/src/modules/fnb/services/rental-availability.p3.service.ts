import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

export type RentalRateUnit = 'hour' | 'day' | 'week';

export const rentalError = (message: string, code: string, status = 400) =>
  Object.assign(new Error(message), { code, status });

export const rentalPositiveInt = (value: unknown, code: string, maximum = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > maximum) throw rentalError('Expected positive integer', code);
  return parsed;
};

export const rentalMoney = (value: unknown, code: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw rentalError('Invalid monetary amount', code);
  return Math.round(parsed * 100) / 100;
};

export const rentalTimestamp = (value: unknown, code: string) => {
  const parsed = new Date(String(value || ''));
  if (Number.isNaN(parsed.getTime())) throw rentalError('Invalid rental timestamp', code);
  return parsed;
};

export const rentalDurationUnits = (startsAt: Date, endsAt: Date, unit: RentalRateUnit) => {
  const milliseconds = endsAt.getTime() - startsAt.getTime();
  if (milliseconds <= 0) throw rentalError('Rental end must be after start', 'INVALID_RENTAL_PERIOD');
  const denominator = unit === 'hour' ? 3600000 : unit === 'day' ? 86400000 : 604800000;
  return Math.max(1, Math.ceil(milliseconds / denominator));
};

export const listRentalItems = async (tenantId: number) => prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT s.id,s.tenant_id,s.outlet_id,o.name AS outlet_name,s.item_id,i.name AS item_name,i.sku,i.stock,
    s.status,s.rate_unit,s.rate_amount,s.deposit_amount,s.minimum_duration,s.maximum_duration,s.buffer_minutes,
    s.created_at,s.updated_at
  FROM public.rental_item_settings s
  JOIN public.items i ON i.id=s.item_id AND i.outlet_id=s.outlet_id
  JOIN public.outlets o ON o.id=s.outlet_id AND o.tenant_id=s.tenant_id
  WHERE s.tenant_id=${tenantId}
  ORDER BY s.id DESC
`);

export const upsertRentalItem = async (
  tenantId: number,
  userId: number,
  input: {
    itemId: number;
    rateUnit: RentalRateUnit;
    rateAmount: number;
    depositAmount?: number;
    minimumDuration?: number;
    maximumDuration?: number | null;
    bufferMinutes?: number;
    status?: 'draft' | 'active' | 'archived';
  },
) => prisma.$transaction(async (tx) => {
  const itemId = rentalPositiveInt(input.itemId, 'INVALID_RENTAL_ITEM_ID');
  const rateUnit = String(input.rateUnit || '').trim().toLowerCase() as RentalRateUnit;
  if (!['hour', 'day', 'week'].includes(rateUnit)) throw rentalError('Invalid rental rate unit', 'INVALID_RENTAL_RATE_UNIT');
  const rateAmount = rentalMoney(input.rateAmount, 'INVALID_RENTAL_RATE');
  const depositAmount = rentalMoney(input.depositAmount ?? 0, 'INVALID_RENTAL_DEPOSIT');
  const minimumDuration = rentalPositiveInt(input.minimumDuration ?? 1, 'INVALID_RENTAL_MINIMUM_DURATION', 10000);
  const maximumDuration = input.maximumDuration == null ? null : rentalPositiveInt(input.maximumDuration, 'INVALID_RENTAL_MAXIMUM_DURATION', 10000);
  if (maximumDuration !== null && maximumDuration < minimumDuration) throw rentalError('Maximum duration cannot be below minimum', 'INVALID_RENTAL_MAXIMUM_DURATION');
  const bufferMinutes = Number(input.bufferMinutes ?? 0);
  if (!Number.isInteger(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 10080) throw rentalError('Invalid rental buffer', 'INVALID_RENTAL_BUFFER');
  const status = String(input.status || 'draft').trim().toLowerCase();
  if (!['draft', 'active', 'archived'].includes(status)) throw rentalError('Invalid rental item status', 'INVALID_RENTAL_ITEM_STATUS');

  const itemRows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT i.id,i.outlet_id,i.stock,i.track_stock,i.is_active
    FROM public.items i
    JOIN public.outlets o ON o.id=i.outlet_id AND o.tenant_id=${tenantId}
    WHERE i.id=${itemId}
    LIMIT 1
    FOR UPDATE OF i
  `);
  const item = itemRows[0];
  if (!item || item.is_active === false) throw rentalError('Tenant item not found', 'RENTAL_ITEM_NOT_FOUND', 404);
  if (item.track_stock !== true) throw rentalError('Rental item must use tracked stock', 'RENTAL_ITEM_REQUIRES_TRACKED_STOCK', 409);
  if (Math.floor(Number(item.stock || 0)) < 1) throw rentalError('Rental item requires positive stock', 'RENTAL_ITEM_REQUIRES_STOCK', 409);

  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    INSERT INTO public.rental_item_settings
      (tenant_id,outlet_id,item_id,status,rate_unit,rate_amount,deposit_amount,minimum_duration,maximum_duration,buffer_minutes,created_by,updated_by)
    VALUES (${tenantId},${Number(item.outlet_id)},${itemId},${status},${rateUnit},${rateAmount},${depositAmount},${minimumDuration},${maximumDuration},${bufferMinutes},${userId},${userId})
    ON CONFLICT (tenant_id,item_id) DO UPDATE SET
      outlet_id=EXCLUDED.outlet_id,status=EXCLUDED.status,rate_unit=EXCLUDED.rate_unit,rate_amount=EXCLUDED.rate_amount,
      deposit_amount=EXCLUDED.deposit_amount,minimum_duration=EXCLUDED.minimum_duration,maximum_duration=EXCLUDED.maximum_duration,
      buffer_minutes=EXCLUDED.buffer_minutes,updated_by=EXCLUDED.updated_by,updated_at=NOW()
    RETURNING *
  `);
  return rows[0];
});

export const lockRentalSetting = async (
  tx: Prisma.TransactionClient,
  tenantId: number,
  outletId: number,
  itemId: number,
) => {
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT s.*,i.name AS item_name,i.sku,i.stock,i.track_stock,i.is_active
    FROM public.rental_item_settings s
    JOIN public.items i ON i.id=s.item_id
    JOIN public.outlets o ON o.id=s.outlet_id AND o.tenant_id=s.tenant_id
    WHERE s.tenant_id=${tenantId} AND s.outlet_id=${outletId} AND s.item_id=${itemId}
      AND s.status='active' AND i.outlet_id=${outletId}
    LIMIT 1
    FOR UPDATE OF s
  `);
  const setting = rows[0];
  if (!setting || setting.is_active === false || setting.track_stock !== true) throw rentalError('Rental item is unavailable', 'RENTAL_ITEM_UNAVAILABLE', 409);
  return setting;
};

export const reservedRentalQuantity = async (
  tx: Prisma.TransactionClient,
  input: { tenantId: number; outletId: number; itemId: number; startsAt: Date; endsAt: Date; bufferMinutes: number },
) => {
  const rows = await tx.$queryRaw<Array<{ reserved_quantity: Prisma.Decimal | number | string }>>(Prisma.sql`
    SELECT COALESCE(SUM(bi.quantity),0) AS reserved_quantity
    FROM public.rental_booking_items bi
    JOIN public.rental_bookings b ON b.id=bi.booking_id AND b.tenant_id=bi.tenant_id
    WHERE bi.tenant_id=${input.tenantId} AND bi.item_id=${input.itemId}
      AND b.outlet_id=${input.outletId}
      AND b.status IN ('reserved','confirmed','picked_up')
      AND b.starts_at < (${input.endsAt}::timestamptz + (${input.bufferMinutes} * interval '1 minute'))
      AND b.ends_at > (${input.startsAt}::timestamptz - (${input.bufferMinutes} * interval '1 minute'))
  `);
  return Number(rows[0]?.reserved_quantity || 0);
};

export const getRentalAvailability = async (tenantId: number, input: { itemId: number; startsAt: string; endsAt: string }) =>
  prisma.$transaction(async (tx) => {
    const itemId = rentalPositiveInt(input.itemId, 'INVALID_RENTAL_ITEM_ID');
    const startsAt = rentalTimestamp(input.startsAt, 'INVALID_RENTAL_START');
    const endsAt = rentalTimestamp(input.endsAt, 'INVALID_RENTAL_END');
    if (endsAt <= startsAt) throw rentalError('Rental end must be after start', 'INVALID_RENTAL_PERIOD');
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT s.*,i.stock,i.track_stock,i.is_active
      FROM public.rental_item_settings s
      JOIN public.items i ON i.id=s.item_id
      JOIN public.outlets o ON o.id=s.outlet_id AND o.tenant_id=s.tenant_id
      WHERE s.tenant_id=${tenantId} AND s.item_id=${itemId} AND s.status='active' AND i.outlet_id=s.outlet_id
      LIMIT 1
    `);
    const setting = rows[0];
    if (!setting || setting.is_active === false || setting.track_stock !== true) throw rentalError('Rental item is unavailable', 'RENTAL_ITEM_UNAVAILABLE', 404);
    const totalStock = Math.max(0, Math.floor(Number(setting.stock || 0)));
    const reserved = await reservedRentalQuantity(tx, {
      tenantId,
      outletId: Number(setting.outlet_id),
      itemId,
      startsAt,
      endsAt,
      bufferMinutes: Number(setting.buffer_minutes || 0),
    });
    return { itemId, totalStock, reserved, available: Math.max(0, totalStock - reserved), startsAt, endsAt };
  });
