-- P3.1 Digital Business Suite: Website/CMS + storefront catalog foundation.
-- Catalog rows are web projections of the existing public.items source of truth.

CREATE TABLE IF NOT EXISTS public.website_sites (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code VARCHAR(60) NOT NULL,
  name VARCHAR(180) NOT NULL,
  public_slug VARCHAR(120) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  default_locale VARCHAR(16) NOT NULL DEFAULT 'id-ID',
  theme_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT website_site_code_not_blank CHECK (length(trim(code)) > 0),
  CONSTRAINT website_site_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT website_site_public_slug_not_blank CHECK (length(trim(public_slug)) > 0),
  CONSTRAINT website_site_status_valid CHECK (status IN ('draft','published','archived')),
  CONSTRAINT ux_website_site_code UNIQUE (tenant_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_website_site_public_slug
  ON public.website_sites (lower(public_slug));
CREATE INDEX IF NOT EXISTS idx_website_site_scope
  ON public.website_sites (tenant_id, status, name);

CREATE TABLE IF NOT EXISTS public.website_pages (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  site_id INTEGER NOT NULL REFERENCES public.website_sites(id) ON DELETE CASCADE,
  slug VARCHAR(180) NOT NULL,
  title VARCHAR(220) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL DEFAULT '{"blocks":[]}'::jsonb,
  seo_title VARCHAR(220),
  seo_description VARCHAR(500),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT website_page_slug_not_blank CHECK (length(trim(slug)) > 0),
  CONSTRAINT website_page_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT website_page_status_valid CHECK (status IN ('draft','published','archived')),
  CONSTRAINT website_page_sort_order_valid CHECK (sort_order >= 0),
  CONSTRAINT ux_website_page_slug UNIQUE (tenant_id, site_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_website_page_scope
  ON public.website_pages (tenant_id, site_id, status, sort_order, id);

CREATE TABLE IF NOT EXISTS public.web_catalog_items (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  site_id INTEGER NOT NULL REFERENCES public.website_sites(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  web_price NUMERIC(15,2),
  display_title VARCHAR(220),
  display_description TEXT,
  seo_title VARCHAR(220),
  seo_description VARCHAR(500),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT web_catalog_price_valid CHECK (web_price IS NULL OR web_price >= 0),
  CONSTRAINT web_catalog_sort_order_valid CHECK (sort_order >= 0),
  CONSTRAINT ux_web_catalog_site_item UNIQUE (tenant_id, site_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_web_catalog_scope
  ON public.web_catalog_items (tenant_id, site_id, is_published, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_web_catalog_item
  ON public.web_catalog_items (tenant_id, item_id, site_id);

COMMENT ON TABLE public.website_sites IS
  'P3 Website/CMS tenant-owned sites. public_slug is globally unique so unauthenticated storefront resolution never accepts a caller-supplied tenant id.';
COMMENT ON TABLE public.website_pages IS
  'P3 declarative CMS pages. Application validation rejects executable script/event-handler content before storage.';
COMMENT ON TABLE public.web_catalog_items IS
  'P3 storefront projection only. Product identity, base price and inventory remain sourced from public.items.';
