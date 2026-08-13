-- P3.2 eCommerce order core. Orders snapshot guest contact data and reuse public.items.

ALTER TABLE public.website_sites
  ADD COLUMN IF NOT EXISTS fulfillment_outlet_id INTEGER REFERENCES public.outlets(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_website_site_fulfillment_outlet
  ON public.website_sites (tenant_id, fulfillment_outlet_id);

CREATE TABLE IF NOT EXISTS public.ecommerce_orders (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  site_id INTEGER NOT NULL REFERENCES public.website_sites(id) ON DELETE RESTRICT,
  outlet_id INTEGER NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  order_number VARCHAR(80) NOT NULL,
  public_token_hash CHAR(64) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'reserved',
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  customer_name VARCHAR(180) NOT NULL,
  customer_phone VARCHAR(40) NOT NULL,
  customer_email VARCHAR(254),
  delivery_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes VARCHAR(1000),
  subtotal NUMERIC(15,2) NOT NULL,
  total NUMERIC(15,2) NOT NULL,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ecommerce_order_status_valid CHECK (status IN ('reserved','confirmed','preparing','ready','completed','cancelled')),
  CONSTRAINT ecommerce_order_amounts_valid CHECK (subtotal >= 0 AND total >= 0),
  CONSTRAINT ecommerce_order_name_not_blank CHECK (length(trim(customer_name)) > 0),
  CONSTRAINT ecommerce_order_phone_not_blank CHECK (length(trim(customer_phone)) > 0),
  CONSTRAINT ux_ecommerce_order_number UNIQUE (tenant_id, order_number),
  CONSTRAINT ux_ecommerce_public_token_hash UNIQUE (public_token_hash)
);
CREATE INDEX IF NOT EXISTS idx_ecommerce_order_scope
  ON public.ecommerce_orders (tenant_id, site_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ecommerce_order_outlet
  ON public.ecommerce_orders (tenant_id, outlet_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ecommerce_order_items (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES public.ecommerce_orders(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  item_name VARCHAR(220) NOT NULL,
  sku VARCHAR(120),
  unit_price NUMERIC(15,2) NOT NULL,
  quantity NUMERIC(15,3) NOT NULL,
  subtotal NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ecommerce_order_item_price_valid CHECK (unit_price >= 0 AND subtotal >= 0),
  CONSTRAINT ecommerce_order_item_quantity_valid CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS idx_ecommerce_order_item_order ON public.ecommerce_order_items (tenant_id, order_id, id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_order_item_item ON public.ecommerce_order_items (tenant_id, item_id, order_id);

CREATE TABLE IF NOT EXISTS public.ecommerce_order_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES public.ecommerce_orders(id) ON DELETE CASCADE,
  event_type VARCHAR(60) NOT NULL,
  from_status VARCHAR(24),
  to_status VARCHAR(24),
  actor_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ecommerce_order_event_type_not_blank CHECK (length(trim(event_type)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_ecommerce_order_event_order ON public.ecommerce_order_events (tenant_id, order_id, id);

CREATE OR REPLACE FUNCTION public.prevent_ecommerce_order_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ecommerce_order_events is append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_ecommerce_order_events_immutable ON public.ecommerce_order_events;
CREATE TRIGGER trg_ecommerce_order_events_immutable
BEFORE UPDATE OR DELETE ON public.ecommerce_order_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_ecommerce_order_event_mutation();

COMMENT ON TABLE public.ecommerce_orders IS
  'P3.2 guest storefront orders. Stock is reserved transactionally at order creation; no parallel customer or product master is created.';
COMMENT ON TABLE public.ecommerce_order_events IS
  'Append-only P3.2 order lifecycle audit ledger.';
