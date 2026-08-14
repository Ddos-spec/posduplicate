import { Prisma } from '@prisma/client';

export const findTenantCustomer = async (
  tx: Prisma.TransactionClient,
  tenantId: number,
  customerId: number,
) => tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
  SELECT c.id
  FROM public.customers c
  JOIN public.outlets o ON o.id=c.outlet_id
  WHERE c.id=${customerId} AND o.tenant_id=${tenantId}
  LIMIT 1
`);
