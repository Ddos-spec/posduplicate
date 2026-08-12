-- P1 procurement depth: RFQ -> supplier quotations -> selected supplier -> PO conversion.
-- Forward-only migration. Existing suppliers, inventory and purchase_orders remain source of truth.

CREATE SEQUENCE IF NOT EXISTS public.purchase_rfq_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.purchase_rfqs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  rfq_number VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  required_date DATE,
  notes TEXT,
  selected_supplier_id INTEGER,
  converted_po_id INTEGER,
  created_by INTEGER,
  sent_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT purchase_rfq_status_valid CHECK (status IN ('draft','sent','quoted','selected','converted','cancelled')),
  CONSTRAINT purchase_rfq_number_unique UNIQUE (tenant_id, rfq_number)
);
CREATE INDEX IF NOT EXISTS idx_purchase_rfq_scope ON public.purchase_rfqs (tenant_id, outlet_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.purchase_rfq_items (
  id SERIAL PRIMARY KEY,
  rfq_id INTEGER NOT NULL REFERENCES public.purchase_rfqs(id) ON DELETE CASCADE,
  inventory_id INTEGER NOT NULL,
  quantity NUMERIC(18,3) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  target_unit_price NUMERIC(15,4),
  notes TEXT,
  CONSTRAINT purchase_rfq_item_qty_valid CHECK (quantity > 0),
  CONSTRAINT purchase_rfq_item_unique UNIQUE (rfq_id, inventory_id)
);

CREATE TABLE IF NOT EXISTS public.purchase_rfq_suppliers (
  id SERIAL PRIMARY KEY,
  rfq_id INTEGER NOT NULL REFERENCES public.purchase_rfqs(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'invited',
  quote_reference VARCHAR(120),
  quoted_total NUMERIC(15,2),
  lead_time_days INTEGER,
  valid_until DATE,
  notes TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT purchase_rfq_supplier_status_valid CHECK (status IN ('invited','responded','declined','selected')),
  CONSTRAINT purchase_rfq_supplier_unique UNIQUE (rfq_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS public.purchase_rfq_supplier_items (
  id SERIAL PRIMARY KEY,
  rfq_supplier_id INTEGER NOT NULL REFERENCES public.purchase_rfq_suppliers(id) ON DELETE CASCADE,
  rfq_item_id INTEGER NOT NULL REFERENCES public.purchase_rfq_items(id) ON DELETE CASCADE,
  unit_price NUMERIC(15,4) NOT NULL,
  available_quantity NUMERIC(18,3),
  notes TEXT,
  CONSTRAINT purchase_rfq_quote_price_valid CHECK (unit_price >= 0),
  CONSTRAINT purchase_rfq_quote_item_unique UNIQUE (rfq_supplier_id, rfq_item_id)
);

CREATE TABLE IF NOT EXISTS public.procurement_event_ledger (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  reference_type VARCHAR(40) NOT NULL,
  reference_id VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_procurement_event_reference ON public.procurement_event_ledger (tenant_id, reference_type, reference_id, created_at DESC);
COMMENT ON TABLE public.procurement_event_ledger IS 'Append-only procurement audit events for RFQ and PO lifecycle.';
