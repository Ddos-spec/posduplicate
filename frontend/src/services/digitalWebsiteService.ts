import api from './api';

export type WebsiteStatus = 'draft' | 'published' | 'archived';
export type CmsBlockType = 'hero' | 'text' | 'image' | 'product-grid' | 'cta' | 'spacer' | 'columns';
export interface CmsBlock { type: CmsBlockType; [key: string]: unknown; }
export interface CmsDocument { blocks: CmsBlock[]; }

export interface WebsiteSite {
  id: number; tenant_id: number; code: string; name: string; public_slug: string;
  status: WebsiteStatus; default_locale: string; theme_config: Record<string, unknown>;
  fulfillment_outlet_id?: number | null;
  page_count?: number; catalog_count?: number; published_at?: string | null; archived_at?: string | null;
}

export interface WebsitePage {
  id: number; tenant_id: number; site_id: number; slug: string; title: string; status: WebsiteStatus;
  content: CmsDocument; seo_title?: string | null; seo_description?: string | null; sort_order: number;
  published_at?: string | null; archived_at?: string | null;
}

export interface WebsiteCatalogItem {
  id: number; item_id: number; sku?: string | null; item_name: string; item_description?: string | null;
  base_price: number | string; effective_price: number | string; stock: number | string; category?: string | null;
  is_published: boolean; web_price?: number | string | null; display_title?: string | null;
  display_description?: string | null; seo_title?: string | null; seo_description?: string | null; sort_order: number;
}

export interface PublicStorefrontMeta {
  site: Pick<WebsiteSite, 'id' | 'tenant_id' | 'code' | 'name' | 'public_slug' | 'default_locale' | 'theme_config' | 'published_at'>;
  navigation: Array<Pick<WebsitePage, 'slug' | 'title' | 'seo_title' | 'seo_description' | 'sort_order'>>;
}

export interface PublicStorefrontPage {
  slug: string; title: string; content: CmsDocument; seo_title?: string | null; seo_description?: string | null;
  published_at?: string | null; site_name: string; public_slug: string; default_locale: string;
  theme_config: Record<string, unknown>;
}

export interface PublicCatalogItem {
  item_id: number; sku?: string | null; name: string; description?: string | null; price: number | string;
  stock: number | string; category?: string | null; seo_title?: string | null; seo_description?: string | null; sort_order: number;
}

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export const getWebsiteSites = async () => unwrap<WebsiteSite[]>(await api.get('/digital/sites'));
export const createWebsiteSite = async (payload: { code: string; name: string; publicSlug: string; defaultLocale?: string; themeConfig?: Record<string, unknown> }) =>
  unwrap<WebsiteSite>(await api.post('/digital/sites', payload));
export const updateWebsiteSite = async (id: number, payload: { name: string; fulfillmentOutletId: number; defaultLocale?: string; themeConfig?: Record<string, unknown> }) =>
  unwrap<WebsiteSite>(await api.put(`/digital/sites/${id}`, payload));
export const updateWebsiteSiteStatus = async (id: number, status: WebsiteStatus) =>
  unwrap<WebsiteSite>(await api.patch(`/digital/sites/${id}/status`, { status }));

export const getWebsitePages = async (siteId: number) => unwrap<WebsitePage[]>(await api.get(`/digital/sites/${siteId}/pages`));
export const createWebsitePage = async (siteId: number, payload: { slug: string; title: string; content: CmsDocument; seoTitle?: string; seoDescription?: string; sortOrder?: number }) =>
  unwrap<WebsitePage>(await api.post(`/digital/sites/${siteId}/pages`, payload));
export const updateWebsitePage = async (id: number, payload: { title: string; content: CmsDocument; seoTitle?: string; seoDescription?: string; sortOrder?: number }) =>
  unwrap<WebsitePage>(await api.put(`/digital/pages/${id}`, payload));
export const updateWebsitePageStatus = async (id: number, status: WebsiteStatus) =>
  unwrap<WebsitePage>(await api.patch(`/digital/pages/${id}/status`, { status }));

export const getWebsiteCatalog = async (siteId: number) => unwrap<WebsiteCatalogItem[]>(await api.get(`/digital/sites/${siteId}/catalog`));
export const upsertWebsiteCatalogItem = async (siteId: number, itemId: number, payload: {
  isPublished: boolean; webPrice?: number | null; displayTitle?: string | null; displayDescription?: string | null;
  seoTitle?: string | null; seoDescription?: string | null; sortOrder?: number;
}) => unwrap<WebsiteCatalogItem>(await api.put(`/digital/sites/${siteId}/catalog/${itemId}`, payload));

export const getPublicStorefront = async (publicSlug: string) =>
  unwrap<PublicStorefrontMeta>(await api.get(`/digital/storefront/${encodeURIComponent(publicSlug)}`));
export const getPublicStorefrontPage = async (publicSlug: string, pageSlug: string) =>
  unwrap<PublicStorefrontPage>(await api.get(`/digital/storefront/${encodeURIComponent(publicSlug)}/pages/${encodeURIComponent(pageSlug)}`));
export const getPublicStorefrontCatalog = async (publicSlug: string) =>
  unwrap<PublicCatalogItem[]>(await api.get(`/digital/storefront/${encodeURIComponent(publicSlug)}/catalog`));
