import { Prisma } from '@prisma/client';
import { rentalError } from './rental-availability.p3.service';

type RentalItemMutation = {
  stock?: number | null;
  outletId?: number | null;
  trackStock?: boolean | null;
  isActive?: boolean | null;
};

export const assertRentalItemMutationAllowed = async (
  tx: Prisma.TransactionClient,
  input: { tenantId: number; itemId: number; currentOutletId: number; currentStock: number; mutation: RentalItemMutation },
) => {
  const settings = await tx.$queryRaw<Array<{ id: number; outlet_id: number; buffer_minutes: number }>>(Prisma.sql`
    SELECT id,outlet_id,buffer_minutes
    FROM public.rental_item_settings
    WHERE tenant_id=${input.tenantId} AND item_id=${input.itemId} AND status='active'
    LIMIT 1
    FOR UPDATE
  `);
  const setting = settings[0];
  if (!setting) return;

  const committedRows = await tx.$queryRaw<Array<{ committed_quantity: Prisma.Decimal | number | string }>>(Prisma.sql`
    SELECT COALESCE(SUM(bi.quantity),0) AS committed_quantity
    FROM public.rental_booking_items bi
    JOIN public.rental_bookings b ON b.id=bi.booking_id AND b.tenant_id=bi.tenant_id
    WHERE bi.tenant_id=${input.tenantId}
      AND bi.item_id=${input.itemId}
      AND b.outlet_id=${Number(setting.outlet_id)}
      AND b.status IN ('reserved','confirmed','picked_up')
      AND (b.ends_at + (${Number(setting.buffer_minutes || 0)} * interval '1 minute')) > NOW()
  `);
  const committedQuantity = Number(committedRows[0]?.committed_quantity || 0);
  if (committedQuantity <= 0) return;

  if (input.mutation.outletId != null && Number(input.mutation.outletId) !== Number(input.currentOutletId)) {
    throw rentalError('Committed rental item cannot move outlet', 'RENTAL_ITEM_OUTLET_COMMITTED', 409);
  }
  if (input.mutation.trackStock === false) {
    throw rentalError('Committed rental item must remain tracked stock', 'RENTAL_ITEM_TRACKING_COMMITTED', 409);
  }
  if (input.mutation.isActive === false) {
    throw rentalError('Committed rental item cannot be deactivated', 'RENTAL_ITEM_ACTIVE_COMMITTED', 409);
  }
  if (input.mutation.stock != null && Number(input.mutation.stock) < committedQuantity) {
    throw rentalError('Stock cannot be reduced below committed rental quantity', 'RENTAL_ITEM_STOCK_COMMITTED', 409);
  }
};
