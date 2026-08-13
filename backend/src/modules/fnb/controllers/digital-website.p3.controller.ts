import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const requireTenant = (req: Request) => {
  if (!req.tenantId) throw Object.assign(new Error('Tenant context is required'), { status: 400, code: 'TENANT_REQUIRED' });
  return req.tenantId;
};
const requireUser = (req: Request) => {
  if (!req.userId) throw Object.assign(new Error('Authenticated user is required'), { status: 401, code: 'USER_REQUIRED' });
  return req.userId;
};
const positiveInt = (value: unknown, code: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw Object.assign(new Error(`${code} must be a positive integer`), { status: 400, code });
  return parsed;
};
const cleanText = (value: unknown, max = 5000) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
};
const nonNegativeInt = (value: unknown, code: string, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw Object.assign(new Error(`${code} must be non-negative`), { status: 400, code });
  return parsed;
};
const normalizeSlug = (value: unknown, code: string, max = 180) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text || text.length > max || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text)) {
    throw Object.assign(new Error(`${code} must be a lowercase slug`), { status: 400, code });
  }
  return text;
};
const optionalMoney = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw Object.assign(new Error('Web price must be non-negative'), { status: 400, code: 'INVALID_WEB_PRICE' });
  return Math.round(parsed * 100) / 100;
};

const BLOCK_TYPES = new Set(['hero', 'text', 'image', 'product-grid', 'cta', 'spacer', 'columns']);
const URL_KEYS = new Set(['url', 'href', 'src', 'imageUrl']);
const validateSafeValue = (value: unknown, depth = 0): void => {
  if (depth > 20) throw Object.assign(new Error('CMS document nesting is too deep'), { status: 400, code: 'CMS_CONTENT_TOO_DEEP' });
  if (typeof value === 'string') {
    if (value.includes('<') || value.includes('>')) throw Object.assign(new Error('Raw markup is not accepted in declarative CMS content'), { status: 400, code: 'CMS_RAW_MARKUP_REJECTED' });
    return;
  }
  if (Array.isArray(value)) return value.forEach((child) => validateSafeValue(child, depth + 1));
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (URL_KEYS.has(key) && typeof child === 'string' && !/^(https?:\/\/|\/)[^\s]+$/i.test(child)) {
        throw Object.assign(new Error('CMS URL fields must use http(s) or an absolute path'), { status: 400, code: 'CMS_URL_REJECTED' });
      }
      validateSafeValue(child, depth + 1);
    }
  }
};
const encodeDocument = (value: unknown, requireBlocks: boolean) => {
  const doc = value ?? (requireBlocks ? { blocks: [] } : {});
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw Object.assign(new Error('CMS document must be an object'), { status: 400, code: 'INVALID_CMS_JSON' });
  if (requireBlocks) {
    const blocks = (doc as Record<string, unknown>).blocks;
    if (!Array.isArray(blocks) || blocks.length > 100) throw Object.assign(new Error('CMS blocks must be an array with at most 100 entries'), { status: 400, code: 'INVALID_CMS_BLOCKS' });
    for (const block of blocks) {
      if (!block || typeof block !== 'object' || Array.isArray(block) || !BLOCK_TYPES.has(String((block as any).type || ''))) {
        throw Object.assign(new Error('Unsupported CMS block type'), { status: 400, code: 'INVALID_CMS_BLOCK_TYPE' });
      }
    }
  }
  validateSafeValue(doc);
  const encoded = JSON.stringify(doc);
  if (encoded.length > 200000) throw Object.assign(new Error('CMS document is too large'), { status: 413, code: 'CMS_CONTENT_TOO_LARGE' });
  return encoded;
};

const SITE_TRANSITIONS: Record<string, string[]> = { draft: ['published', 'archived'], published: ['draft', 'archived'], archived: [] };
const PAGE_TRANSITIONS: Record<string, string[]> = { draft: ['published', 'archived'], published: ['draft', 'archived'], archived: [] };

const assertTenantSite = async (tenantId: number, siteId: number) => {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.website_sites WHERE id=${siteId} AND tenant_id=${tenantId} LIMIT 1`);
  if (!rows[0]) throw Object.assign(new Error('Website not found'), { status: 404, code: 'WEBSITE_SITE_NOT_FOUND' });
  return rows[0];
};
const assertTenantItem = async (tenantId: number, itemId: number) => {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT i.id, i.name, i.description, i.price, i.stock, i.sku, i.outlet_id
    FROM public.items i JOIN public.outlets o ON o.id=i.outlet_id
    WHERE i.id=${itemId} AND o.tenant_id=${tenantId} LIMIT 1
  `);
  if (!rows[0]) throw Object.assign(new Error('Item not found in tenant'), { status: 404, code: 'WEBSITE_ITEM_NOT_FOUND' });
  return rows[0];
};

export const getWebsiteSites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT s.*,
        (SELECT COUNT(*)::int FROM public.website_pages p WHERE p.tenant_id=s.tenant_id AND p.site_id=s.id) AS page_count,
        (SELECT COUNT(*)::int FROM public.web_catalog_items c WHERE c.tenant_id=s.tenant_id AND c.site_id=s.id) AS catalog_count
      FROM public.website_sites s WHERE s.tenant_id=${tenantId} ORDER BY s.created_at DESC
    `);
    return res.json({ success: true, data: rows, count: rows.length });
  } catch (error) { next(error); }
};

export const createWebsiteSite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = requireTenant(req); const userId = requireUser(req);
    const code = cleanText(req.body.code, 60)?.toUpperCase(); const name = cleanText(req.body.name, 180);
    if (!code || !name) return res.status(400).json({ success: false, error: { code: 'WEBSITE_SITE_FIELDS_REQUIRED', message: 'Code and name are required' } });
    const publicSlug = normalizeSlug(req.body.publicSlug, 'INVALID_PUBLIC_SLUG', 120);
    const theme = encodeDocument(req.body.themeConfig ?? {}, false);
    try {
      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.website_sites (tenant_id,code,name,public_slug,default_locale,theme_config,created_by,updated_by)
        VALUES (${tenantId},${code},${name},${publicSlug},${cleanText(req.body.defaultLocale,16) || 'id-ID'},CAST(${theme} AS jsonb),${userId},${userId}) RETURNING *
      `);
      return res.status(201).json({ success: true, data: rows[0] });
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ success: false, error: { code: 'WEBSITE_SITE_DUPLICATE', message: 'Code or public slug is already used' } });
      throw error;
    }
  } catch (error) { next(error); }
};

export const updateWebsiteSite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId=requireTenant(req), userId=requireUser(req), siteId=positiveInt(req.params.id,'INVALID_SITE_ID');
    const name=cleanText(req.body.name,180); if(!name) return res.status(400).json({success:false,error:{code:'WEBSITE_SITE_NAME_REQUIRED',message:'Name is required'}});
    const theme=encodeDocument(req.body.themeConfig ?? {},false);
    const fulfillmentOutletId=positiveInt(req.body.fulfillmentOutletId,'INVALID_FULFILLMENT_OUTLET_ID');
    const outlet=await prisma.$queryRaw<any[]>(Prisma.sql`SELECT id FROM public.outlets WHERE id=${fulfillmentOutletId} AND tenant_id=${tenantId} LIMIT 1`);
    if(!outlet[0]) return res.status(404).json({success:false,error:{code:'FULFILLMENT_OUTLET_NOT_FOUND',message:'Outlet not found in tenant'}});
    const rows=await prisma.$queryRaw<any[]>(Prisma.sql`UPDATE public.website_sites SET name=${name},default_locale=${cleanText(req.body.defaultLocale,16)||'id-ID'},theme_config=CAST(${theme} AS jsonb),fulfillment_outlet_id=${fulfillmentOutletId},updated_by=${userId},updated_at=NOW() WHERE id=${siteId} AND tenant_id=${tenantId} AND status<>'archived' RETURNING *`);
    if(!rows[0]) return res.status(404).json({success:false,error:{code:'WEBSITE_SITE_NOT_EDITABLE',message:'Website not found or archived'}});
    return res.json({success:true,data:rows[0]});
  } catch(error){ next(error); }
};

export const updateWebsiteSiteStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId=requireTenant(req), userId=requireUser(req), siteId=positiveInt(req.params.id,'INVALID_SITE_ID'), target=String(req.body.status||'').trim();
    const data=await prisma.$transaction(async tx=>{
      const rows=await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.website_sites WHERE id=${siteId} AND tenant_id=${tenantId} FOR UPDATE`); const site=rows[0];
      if(!site) throw Object.assign(new Error('Website not found'),{status:404,code:'WEBSITE_SITE_NOT_FOUND'});
      if(!(SITE_TRANSITIONS[site.status]||[]).includes(target)) throw Object.assign(new Error('Invalid website transition'),{status:409,code:'INVALID_WEBSITE_SITE_TRANSITION'});
      const changed=await tx.$queryRaw<any[]>(Prisma.sql`UPDATE public.website_sites SET status=${target},published_at=CASE WHEN ${target}='published' THEN NOW() ELSE published_at END,archived_at=CASE WHEN ${target}='archived' THEN NOW() ELSE archived_at END,updated_by=${userId},updated_at=NOW() WHERE id=${siteId} AND tenant_id=${tenantId} AND status=${String(site.status)} RETURNING *`);
      if(!changed[0]) throw Object.assign(new Error('Concurrent update'),{status:409,code:'WEBSITE_SITE_CONCURRENT_UPDATE'}); return changed[0];
    });
    return res.json({success:true,data});
  } catch(error){ next(error); }
};

export const getWebsitePages = async (req: Request,res: Response,next: NextFunction) => {
  try { const tenantId=requireTenant(req),siteId=positiveInt(req.params.siteId,'INVALID_SITE_ID'); await assertTenantSite(tenantId,siteId); const rows=await prisma.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.website_pages WHERE tenant_id=${tenantId} AND site_id=${siteId} ORDER BY sort_order,id`); return res.json({success:true,data:rows,count:rows.length}); } catch(error){next(error);}
};
export const createWebsitePage = async (req: Request,res: Response,next: NextFunction) => {
  try { const tenantId=requireTenant(req),userId=requireUser(req),siteId=positiveInt(req.params.siteId,'INVALID_SITE_ID'); await assertTenantSite(tenantId,siteId); const pageSlug=normalizeSlug(req.body.slug,'INVALID_PAGE_SLUG'),title=cleanText(req.body.title,220); if(!title)return res.status(400).json({success:false,error:{code:'WEBSITE_PAGE_TITLE_REQUIRED',message:'Title is required'}}); const content=encodeDocument(req.body.content??{blocks:[]},true); try{const rows=await prisma.$queryRaw<any[]>(Prisma.sql`INSERT INTO public.website_pages (tenant_id,site_id,slug,title,content,seo_title,seo_description,sort_order,created_by,updated_by) VALUES (${tenantId},${siteId},${pageSlug},${title},CAST(${content} AS jsonb),${cleanText(req.body.seoTitle,220)},${cleanText(req.body.seoDescription,500)},${nonNegativeInt(req.body.sortOrder,'INVALID_PAGE_SORT_ORDER')},${userId},${userId}) RETURNING *`);return res.status(201).json({success:true,data:rows[0]});}catch(error:any){if(error?.code==='23505')return res.status(409).json({success:false,error:{code:'WEBSITE_PAGE_SLUG_EXISTS',message:'Page slug already exists'}});throw error;} } catch(error){next(error);}
};
export const updateWebsitePage = async (req: Request,res: Response,next: NextFunction) => {
  try { const tenantId=requireTenant(req),userId=requireUser(req),pageId=positiveInt(req.params.id,'INVALID_PAGE_ID'),title=cleanText(req.body.title,220); if(!title)return res.status(400).json({success:false,error:{code:'WEBSITE_PAGE_TITLE_REQUIRED',message:'Title is required'}}); const content=encodeDocument(req.body.content??{blocks:[]},true); const rows=await prisma.$queryRaw<any[]>(Prisma.sql`UPDATE public.website_pages SET title=${title},content=CAST(${content} AS jsonb),seo_title=${cleanText(req.body.seoTitle,220)},seo_description=${cleanText(req.body.seoDescription,500)},sort_order=${nonNegativeInt(req.body.sortOrder,'INVALID_PAGE_SORT_ORDER')},updated_by=${userId},updated_at=NOW() WHERE id=${pageId} AND tenant_id=${tenantId} AND status<>'archived' RETURNING *`); if(!rows[0])return res.status(404).json({success:false,error:{code:'WEBSITE_PAGE_NOT_EDITABLE',message:'Page not found or archived'}}); return res.json({success:true,data:rows[0]}); } catch(error){next(error);}
};
export const updateWebsitePageStatus = async (req: Request,res: Response,next: NextFunction) => {
  try { const tenantId=requireTenant(req),userId=requireUser(req),pageId=positiveInt(req.params.id,'INVALID_PAGE_ID'),target=String(req.body.status||'').trim(); const data=await prisma.$transaction(async tx=>{const rows=await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.website_pages WHERE id=${pageId} AND tenant_id=${tenantId} FOR UPDATE`),page=rows[0];if(!page)throw Object.assign(new Error('Page not found'),{status:404,code:'WEBSITE_PAGE_NOT_FOUND'});if(!(PAGE_TRANSITIONS[page.status]||[]).includes(target))throw Object.assign(new Error('Invalid page transition'),{status:409,code:'INVALID_WEBSITE_PAGE_TRANSITION'});const changed=await tx.$queryRaw<any[]>(Prisma.sql`UPDATE public.website_pages SET status=${target},published_at=CASE WHEN ${target}='published' THEN NOW() ELSE published_at END,archived_at=CASE WHEN ${target}='archived' THEN NOW() ELSE archived_at END,updated_by=${userId},updated_at=NOW() WHERE id=${pageId} AND tenant_id=${tenantId} AND status=${String(page.status)} RETURNING *`);if(!changed[0])throw Object.assign(new Error('Concurrent update'),{status:409,code:'WEBSITE_PAGE_CONCURRENT_UPDATE'});return changed[0];});return res.json({success:true,data}); } catch(error){next(error);}
};

export const getWebsiteCatalog = async (req: Request,res: Response,next: NextFunction) => {
  try { const tenantId=requireTenant(req),siteId=positiveInt(req.params.siteId,'INVALID_SITE_ID'); await assertTenantSite(tenantId,siteId); const rows=await prisma.$queryRaw<any[]>(Prisma.sql`SELECT c.*,i.sku,i.name AS item_name,i.description AS item_description,i.price AS base_price,i.stock,cat.name AS category,COALESCE(c.web_price,i.price) AS effective_price FROM public.web_catalog_items c JOIN public.items i ON i.id=c.item_id JOIN public.outlets o ON o.id=i.outlet_id AND o.tenant_id=c.tenant_id LEFT JOIN public.categories cat ON cat.id=i.category_id WHERE c.tenant_id=${tenantId} AND c.site_id=${siteId} ORDER BY c.sort_order,c.id`); return res.json({success:true,data:rows,count:rows.length}); } catch(error){next(error);}
};
export const upsertWebsiteCatalogItem = async (req: Request,res: Response,next: NextFunction) => {
  try { const tenantId=requireTenant(req),userId=requireUser(req),siteId=positiveInt(req.params.siteId,'INVALID_SITE_ID'),itemId=positiveInt(req.params.itemId,'INVALID_ITEM_ID'); await assertTenantSite(tenantId,siteId); await assertTenantItem(tenantId,itemId); const rows=await prisma.$queryRaw<any[]>(Prisma.sql`INSERT INTO public.web_catalog_items (tenant_id,site_id,item_id,is_published,web_price,display_title,display_description,seo_title,seo_description,sort_order,created_by,updated_by) VALUES (${tenantId},${siteId},${itemId},${Boolean(req.body.isPublished)},${optionalMoney(req.body.webPrice)},${cleanText(req.body.displayTitle,220)},${cleanText(req.body.displayDescription)},${cleanText(req.body.seoTitle,220)},${cleanText(req.body.seoDescription,500)},${nonNegativeInt(req.body.sortOrder,'INVALID_CATALOG_SORT_ORDER')},${userId},${userId}) ON CONFLICT (tenant_id,site_id,item_id) DO UPDATE SET is_published=EXCLUDED.is_published,web_price=EXCLUDED.web_price,display_title=EXCLUDED.display_title,display_description=EXCLUDED.display_description,seo_title=EXCLUDED.seo_title,seo_description=EXCLUDED.seo_description,sort_order=EXCLUDED.sort_order,updated_by=EXCLUDED.updated_by,updated_at=NOW() RETURNING *`); return res.json({success:true,data:rows[0]}); } catch(error){next(error);}
};

export const getPublicStorefront = async (req: Request,res: Response,next: NextFunction) => {
  try { const publicSlug=normalizeSlug(req.params.publicSlug,'INVALID_PUBLIC_SLUG',120); const sites=await prisma.$queryRaw<any[]>(Prisma.sql`SELECT id,tenant_id,code,name,public_slug,default_locale,theme_config,published_at FROM public.website_sites WHERE lower(public_slug)=lower(${publicSlug}) AND status='published' LIMIT 1`),site=sites[0]; if(!site)return res.status(404).json({success:false,error:{code:'STOREFRONT_NOT_FOUND',message:'Storefront not found'}}); const pages=await prisma.$queryRaw<any[]>(Prisma.sql`SELECT slug,title,seo_title,seo_description,sort_order FROM public.website_pages WHERE tenant_id=${Number(site.tenant_id)} AND site_id=${Number(site.id)} AND status='published' ORDER BY sort_order,id`); return res.json({success:true,data:{site,navigation:pages}}); } catch(error){next(error);}
};
export const getPublicStorefrontPage = async (req: Request,res: Response,next: NextFunction) => {
  try { const publicSlug=normalizeSlug(req.params.publicSlug,'INVALID_PUBLIC_SLUG',120),pageSlug=normalizeSlug(req.params.slug,'INVALID_PAGE_SLUG'); const rows=await prisma.$queryRaw<any[]>(Prisma.sql`SELECT p.slug,p.title,p.content,p.seo_title,p.seo_description,p.published_at,s.name AS site_name,s.public_slug,s.default_locale,s.theme_config FROM public.website_pages p JOIN public.website_sites s ON s.id=p.site_id AND s.tenant_id=p.tenant_id WHERE lower(s.public_slug)=lower(${publicSlug}) AND s.status='published' AND p.slug=${pageSlug} AND p.status='published' LIMIT 1`); if(!rows[0])return res.status(404).json({success:false,error:{code:'STOREFRONT_PAGE_NOT_FOUND',message:'Page not found'}}); return res.json({success:true,data:rows[0]}); } catch(error){next(error);}
};
export const getPublicStorefrontCatalog = async (req: Request,res: Response,next: NextFunction) => {
  try { const publicSlug=normalizeSlug(req.params.publicSlug,'INVALID_PUBLIC_SLUG',120); const rows=await prisma.$queryRaw<any[]>(Prisma.sql`SELECT i.id AS item_id,i.sku,COALESCE(NULLIF(c.display_title,''),i.name) AS name,COALESCE(NULLIF(c.display_description,''),i.description) AS description,COALESCE(c.web_price,i.price) AS price,i.stock,cat.name AS category,c.seo_title,c.seo_description,c.sort_order FROM public.web_catalog_items c JOIN public.website_sites s ON s.id=c.site_id AND s.tenant_id=c.tenant_id JOIN public.items i ON i.id=c.item_id AND i.outlet_id=s.fulfillment_outlet_id JOIN public.outlets o ON o.id=i.outlet_id AND o.tenant_id=c.tenant_id LEFT JOIN public.categories cat ON cat.id=i.category_id WHERE lower(s.public_slug)=lower(${publicSlug}) AND s.status='published' AND c.is_published=TRUE AND COALESCE(i.is_active,TRUE)=TRUE ORDER BY c.sort_order,c.id`); return res.json({success:true,data:rows,count:rows.length}); } catch(error){next(error);}
};
