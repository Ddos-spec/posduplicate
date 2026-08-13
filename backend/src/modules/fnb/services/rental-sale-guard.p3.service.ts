import { Prisma } from '@prisma/client';
import { rentalError } from './rental-availability.p3.service';

export const assertRentalStockSaleAllowed = async (
  tx: Prisma.TransactionClient,
  input: { tenantId: number; outletId: number; itemId: number },
) => {
  const settings = await tx.$queryRaw<Array<{ id: number; buffer_minutes: number }>>(Prisma.sql`
    SELECT id,buffer_minutes
    FROM public.rental_item_settings
    WHERE tenant_id=${input.tenantId} AND outlet_id=${input.outletId} AND item_id=${input.itemId} AND status='active'
    LIMIT 1
  `);
  const setting = settings[0];
  if (!setting) return;

  const committed = await tx.$queryRaw<Array<{ booking_id: bigint }>>(Prisma.sql`
    SELECT b.id AS booking_id
    FROM public.rental_booking_items bi
    JOIN public.rental_bookings b ON b.id=bi.booking_id AND b.tenant_id=bi.tenant_id
    WHERE bi.tenant_id=${input.tenantId}
      AND bi.item_id=${input.itemId}
      AND b.outlet_id=${input.outletId}
      AND b.status IN ('reserved','confirmed','picked_up')
      AND (b.ends_at + (${Number(setting.buffer_minutes || 0)} * interval '1 minute')) > NOW()
    LIMIT 1
  `);

  if (committed[0]) {
    throw rentalError(
      'Item has committed rental bookings and cannot be sold from stock until those commitments are cleared',
      'RENTAL_STOCK_COMMITTED',
      409,
    );
  }
};
