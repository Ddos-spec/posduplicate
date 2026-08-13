-- P3.3 Subscriptions. Reuses public.customers, public.items, public.sales_orders,
-- and accounting.accounts_receivable rather than creating parallel masters/ledgers.

CREATE SEQUENCE IF NOT EXISTS public.subscription_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  interval_unit VARCHAR(12) NOT NULL,
  interval_count INTEGER NOT NULL DEFAULT 1,
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_plan_status_valid CHECK (status IN ('draft','active','archived')),
  CONSTRAINT subscription_plan_interval_unit_valid CHECK (interval_unit IN ('day','week','month','year')),
  CONSTRAINT subscription_plan_interval_count_valid CHECK (interval_count BETWEEN 1 AND 120),
  CONSTRAINT subscription_plan_code_not_blank CHECK (length(trim(code)) > 0),
  CONSTRAINT subscription_plan_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT ux_subscription_plan_code UNIQUE (tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_subscription_plan_scope
  ON public.subscription_plans (tenant_id, status, id);

CREATE TABLE IF NOT EXISTS public.subscription_plan_items (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  quantity NUMERIC(12,3) NOT NULL,
  unit_price NUMERIC(15,2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_plan_item_quantity_valid CHECK (quantity > 0),
  CONSTRAINT subscription_plan_item_price_valid CHECK (unit_price >= 0),
  CONSTRAINT subscription_plan_item_sort_valid CHECK (sort_order >= 0),
  CONSTRAINT ux_subscription_plan_item UNIQUE (tenant_id, plan_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_subscription_plan_item_scope
  ON public.subscription_plan_items (tenant_id, plan_id, sort_order, id);

CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  outlet_id INTEGER NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  plan_id INTEGER REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  subscription_number VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  interval_unit VARCHAR(12) NOT NULL,
  interval_count INTEGER NOT NULL DEFAULT 1,
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  starts_on DATE NOT NULL,
  current_period_start DATE,
  current_period_end DATE,
  next_renewal_at DATE NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_subscription_status_valid CHECK (status IN ('draft','active','paused','cancelled')),
  CONSTRAINT customer_subscription_interval_unit_valid CHECK (interval_unit IN ('day','week','month','year')),
  CONSTRAINT customer_subscription_interval_count_valid CHECK (interval_count BETWEEN 1 AND 120),
  CONSTRAINT customer_subscription_period_valid CHECK (current_period_end IS NULL OR current_period_start IS NULL OR current_period_end > current_period_start),
  CONSTRAINT ux_customer_subscription_number UNIQUE (tenant_id, subscription_number)
);
CREATE INDEX IF NOT EXISTS idx_customer_subscription_scope
  ON public.customer_subscriptions (tenant_id, status, next_renewal_at, id);
CREATE INDEX IF NOT EXISTS idx_customer_subscription_customer
  ON public.customer_subscriptions (tenant_id, customer_id, status, id);

CREATE TABLE IF NOT EXISTS public.customer_subscription_items (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id INTEGER NOT NULL REFERENCES public.customer_subscriptions(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  item_name VARCHAR(220) NOT NULL,
  sku VARCHAR(120),
  quantity NUMERIC(12,3) NOT NULL,
  unit_price NUMERIC(15,2) NOT NULL,
  line_total NUMERIC(15,2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_subscription_item_quantity_valid CHECK (quantity > 0),
  CONSTRAINT customer_subscription_item_amount_valid CHECK (unit_price >= 0 AND line_total >= 0),
  CONSTRAINT customer_subscription_item_sort_valid CHECK (sort_order >= 0)
);
CREATE INDEX IF NOT EXISTS idx_customer_subscription_item_scope
  ON public.customer_subscription_items (tenant_id, subscription_id, sort_order, id);

CREATE TABLE IF NOT EXISTS public.subscription_renewals (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id INTEGER NOT NULL REFERENCES public.customer_subscriptions(id) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_at DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  amount NUMERIC(15,2) NOT NULL,
  sales_order_id INTEGER REFERENCES public.sales_orders(id) ON DELETE RESTRICT,
  receivable_id INTEGER REFERENCES accounting.accounts_receivable(id) ON DELETE RESTRICT,
  idempotency_key VARCHAR(160) NOT NULL,
  materialized_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_renewal_status_valid CHECK (status IN ('pending','materialized','failed','cancelled')),
  CONSTRAINT subscription_renewal_amount_valid CHECK (amount >= 0),
  CONSTRAINT subscription_renewal_period_valid CHECK (period_end > period_start),
  CONSTRAINT ux_subscription_renewal_period UNIQUE (tenant_id, subscription_id, period_start, period_end),
  CONSTRAINT ux_subscription_renewal_key UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_subscription_renewal_scope
  ON public.subscription_renewals (tenant_id, subscription_id, status, period_start DESC);

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id INTEGER NOT NULL REFERENCES public.customer_subscriptions(id) ON DELETE CASCADE,
  event_type VARCHAR(60) NOT NULL,
  actor_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_event_type_not_blank CHECK (length(trim(event_type)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_subscription_event_scope
  ON public.subscription_events (tenant_id, subscription_id, id);

CREATE OR REPLACE FUNCTION public.prevent_subscription_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'subscription_events is append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_subscription_events_immutable ON public.subscription_events;
CREATE TRIGGER trg_subscription_events_immutable
BEFORE UPDATE OR DELETE ON public.subscription_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_subscription_event_mutation();

COMMENT ON TABLE public.customer_subscriptions IS
  'P3.3 customer subscription contracts. Customers/items remain existing system-of-record entities.';
COMMENT ON TABLE public.subscription_renewals IS
  'P3.3 idempotent renewal materialization linking to existing sales_orders and accounting.accounts_receivable.';
COMMENT ON TABLE public.subscription_events IS
  'Append-only P3.3 subscription lifecycle audit ledger.';
