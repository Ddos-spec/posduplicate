-- P1 Revenue & Supply Chain: revenue-side foundation
-- This migration intentionally reuses existing customers, outlets, items, transactions and accounting ledgers.

CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER,
  customer_id INTEGER,
  title VARCHAR(255) NOT NULL,
  stage VARCHAR(30) NOT NULL DEFAULT 'new',
  probability INTEGER NOT NULL DEFAULT 10,
  expected_revenue NUMERIC(15,2) NOT NULL DEFAULT 0,
  source VARCHAR(80),
  owner_user_id INTEGER,
  next_activity_at TIMESTAMPTZ,
  notes TEXT,
  lost_reason TEXT,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT crm_probability_range CHECK (probability >= 0 AND probability <= 100),
  CONSTRAINT crm_stage_valid CHECK (stage IN ('new','qualified','proposal','negotiation','won','lost'))
);

CREATE INDEX IF NOT EXISTS idx_crm_opportunities_tenant_stage
  ON public.crm_opportunities (tenant_id, stage);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_customer
  ON public.crm_opportunities (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_owner
  ON public.crm_opportunities (tenant_id, owner_user_id);

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  opportunity_id BIGINT NOT NULL REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  activity_type VARCHAR(30) NOT NULL DEFAULT 'follow_up',
  summary VARCHAR(255) NOT NULL,
  due_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  assigned_user_id INTEGER,
  completed_at TIMESTAMPTZ,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT crm_activity_status_valid CHECK (status IN ('open','done','cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_tenant_due
  ON public.crm_activities (tenant_id, status, due_at);

CREATE SEQUENCE IF NOT EXISTS public.sales_quotation_number_seq START 1;
CREATE TABLE IF NOT EXISTS public.sales_quotations (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER,
  customer_id INTEGER,
  quotation_number VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  valid_until DATE,
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  opportunity_id BIGINT REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_quotation_status_valid CHECK (status IN ('draft','sent','accepted','rejected','expired','converted')),
  CONSTRAINT sales_quotation_amounts_valid CHECK (subtotal >= 0 AND discount_amount >= 0 AND tax_amount >= 0 AND total >= 0),
  CONSTRAINT sales_quotation_tenant_number_unique UNIQUE (tenant_id, quotation_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_quotations_tenant_status
  ON public.sales_quotations (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_quotations_customer
  ON public.sales_quotations (tenant_id, customer_id);

CREATE TABLE IF NOT EXISTS public.sales_quotation_items (
  id BIGSERIAL PRIMARY KEY,
  quotation_id BIGINT NOT NULL REFERENCES public.sales_quotations(id) ON DELETE CASCADE,
  item_id INTEGER,
  description VARCHAR(255) NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit_price NUMERIC(15,2) NOT NULL,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
  line_total NUMERIC(15,2) NOT NULL,
  CONSTRAINT sales_quote_item_qty_valid CHECK (quantity > 0),
  CONSTRAINT sales_quote_item_amount_valid CHECK (unit_price >= 0 AND discount_amount >= 0 AND line_total >= 0)
);

CREATE SEQUENCE IF NOT EXISTS public.sales_order_number_seq START 1;
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER,
  customer_id INTEGER,
  quotation_id BIGINT UNIQUE REFERENCES public.sales_quotations(id) ON DELETE SET NULL,
  sales_order_number VARCHAR(80) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'confirmed',
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by INTEGER,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_order_status_valid CHECK (status IN ('confirmed','processing','ready','fulfilled','cancelled')),
  CONSTRAINT sales_order_tenant_number_unique UNIQUE (tenant_id, sales_order_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant_status
  ON public.sales_orders (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer
  ON public.sales_orders (tenant_id, customer_id);

CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id BIGSERIAL PRIMARY KEY,
  sales_order_id BIGINT NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  item_id INTEGER,
  description VARCHAR(255) NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit_price NUMERIC(15,2) NOT NULL,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
  line_total NUMERIC(15,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.loyalty_wallets (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  points_balance BIGINT NOT NULL DEFAULT 0,
  monetary_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  lifetime_points_earned BIGINT NOT NULL DEFAULT 0,
  lifetime_points_redeemed BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loyalty_wallet_unique UNIQUE (tenant_id, customer_id)
);

CREATE TABLE IF NOT EXISTS public.loyalty_ledger (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  wallet_id BIGINT NOT NULL REFERENCES public.loyalty_wallets(id) ON DELETE CASCADE,
  entry_type VARCHAR(20) NOT NULL,
  points_delta BIGINT NOT NULL DEFAULT 0,
  monetary_delta NUMERIC(15,2) NOT NULL DEFAULT 0,
  reference_type VARCHAR(50),
  reference_id VARCHAR(100),
  reason TEXT NOT NULL,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT loyalty_entry_type_valid CHECK (entry_type IN ('earn','redeem','adjustment','expiry','refund'))
);

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_customer
  ON public.loyalty_ledger (tenant_id, customer_id, created_at DESC);

COMMENT ON TABLE public.loyalty_ledger IS 'Append-only loyalty audit ledger. Never update historical entries; corrections use compensating entries.';
