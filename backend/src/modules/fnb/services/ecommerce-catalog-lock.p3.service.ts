import { Prisma } from '@prisma/client';

export const lockPublishedStorefront = async (tx: Prisma.TransactionClient, publicSlug: string) => {
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT id,tenant_id,fulfillment_outlet_id
    FROM public.website_sites
    WHERE lower(public_slug)=lower(${publicSlug}) AND status='published'
    LIMIT 1 FOR UPDATE
  `);
  const site = rows[0];
  if (!site) throw Object.assign(new Error('Published storefront not found'), { status: 404, code: 'STOREFRONT_NOT_FOUND' });
  if (!site.fulfillment_outlet_id) throw Object.assign(new Error('Fulfillment outlet is not configured'), { status: 409, code: 'FULFILLMENT_OUTLET_REQUIRED' });
  const outlet = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT id FROM public.outlets WHERE id=${site.fulfillment_outlet_id} AND tenant_id=${site.tenant_id} LIMIT 1
  `);
  if (!outlet[0]) throw Object.assign(new Error('Fulfillment outlet is invalid'), { status: 409, code: 'FULFILLMENT_OUTLET_INVALID' });
  return site;
};

export const lockPublishedCatalogItem = async (
  tx: Prisma.TransactionClient,
  site: { id: number; tenant_id: number; fulfillment_outlet_id: number },
  itemId: number,
) => {
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT i.id,i.name,i.sku,i.stock,i.track_stock,COALESCE(c.web_price,i.price) AS effective_price
    FROM public.web_catalog_items c
    JOIN public.items i ON i.id=c.item_id
    WHERE c.tenant_id=${site.tenant_id} AND c.site_id=${site.id} AND c.item_id=${itemId}
      AND c.is_published=TRUE AND i.outlet_id=${site.fulfillment_outlet_id}
    LIMIT 1 FOR UPDATE OF i
  `);
  if (!rows[0]) throw Object.assign(new Error('Published item unavailable'), { status: 409, code: 'STOREFRONT_ITEM_UNAVAILABLE' });
  return rows[0];
};
