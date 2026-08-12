-- P1 supply-chain extension.
-- Existing inventory.current_stock remains the aggregate source of truth.
-- Location balances refine stock placement and warehouse_stock_ledger is append-only audit history.

CREATE TABLE IF NOT EXISTS public.warehouse_locations (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  location_type VARCHAR(30) NOT NULL DEFAULT 'stock',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT warehouse_location_type_valid CHECK (location_type IN ('stock','receiving','dispatch','production','quality','scrap','transit')),
  CONSTRAINT warehouse_location_unique UNIQUE (tenant_id, outlet_id, code)
);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_scope ON public.warehouse_locations (tenant_id, outlet_id, is_active);

CREATE TABLE IF NOT EXISTS public.warehouse_stock_balances (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  location_id INTEGER NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE CASCADE,
  inventory_id INTEGER NOT NULL,
  quantity NUMERIC(18,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT warehouse_balance_nonnegative CHECK (quantity >= 0),
  CONSTRAINT warehouse_balance_unique UNIQUE (tenant_id, location_id, inventory_id)
);
CREATE INDEX IF NOT EXISTS idx_warehouse_balance_inventory ON public.warehouse_stock_balances (tenant_id, outlet_id, inventory_id);

CREATE TABLE IF NOT EXISTS public.warehouse_stock_ledger (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  location_id INTEGER NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE RESTRICT,
  inventory_id INTEGER NOT NULL,
  entry_type VARCHAR(30) NOT NULL,
  quantity_delta NUMERIC(18,3) NOT NULL,
  balance_before NUMERIC(18,3) NOT NULL,
  balance_after NUMERIC(18,3) NOT NULL,
  reference_type VARCHAR(50),
  reference_id VARCHAR(100),
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT warehouse_ledger_type_valid CHECK (entry_type IN ('bootstrap','receipt','transfer_in','transfer_out','count_adjustment','production_in','production_out','manual_adjustment'))
);
CREATE INDEX IF NOT EXISTS idx_warehouse_ledger_inventory ON public.warehouse_stock_ledger (tenant_id, outlet_id, inventory_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_ledger_reference ON public.warehouse_stock_ledger (tenant_id, reference_type, reference_id);
COMMENT ON TABLE public.warehouse_stock_ledger IS 'Append-only location-level stock history. Corrections use compensating entries.';

CREATE SEQUENCE IF NOT EXISTS public.stock_transfer_number_seq START 1;
CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  transfer_number VARCHAR(80) NOT NULL,
  source_location_id INTEGER NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE RESTRICT,
  destination_location_id INTEGER NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by INTEGER,
  completed_by INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_transfer_location_diff CHECK (source_location_id <> destination_location_id),
  CONSTRAINT stock_transfer_status_valid CHECK (status IN ('draft','ready','done','cancelled')),
  CONSTRAINT stock_transfer_number_unique UNIQUE (tenant_id, transfer_number)
);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_scope ON public.stock_transfers (tenant_id, outlet_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.stock_transfer_lines (
  id SERIAL PRIMARY KEY,
  transfer_id INTEGER NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  inventory_id INTEGER NOT NULL,
  quantity_requested NUMERIC(18,3) NOT NULL,
  quantity_done NUMERIC(18,3) NOT NULL DEFAULT 0,
  CONSTRAINT transfer_line_qty_valid CHECK (quantity_requested > 0 AND quantity_done >= 0)
);

CREATE SEQUENCE IF NOT EXISTS public.stock_count_number_seq START 1;
CREATE TABLE IF NOT EXISTS public.stock_counts (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  location_id INTEGER NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE RESTRICT,
  count_number VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by INTEGER,
  finalized_by INTEGER,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_count_status_valid CHECK (status IN ('draft','counting','finalized','cancelled')),
  CONSTRAINT stock_count_number_unique UNIQUE (tenant_id, count_number)
);

CREATE TABLE IF NOT EXISTS public.stock_count_lines (
  id SERIAL PRIMARY KEY,
  stock_count_id INTEGER NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
  inventory_id INTEGER NOT NULL,
  expected_quantity NUMERIC(18,3) NOT NULL DEFAULT 0,
  counted_quantity NUMERIC(18,3),
  variance_quantity NUMERIC(18,3),
  notes TEXT,
  CONSTRAINT stock_count_line_unique UNIQUE (stock_count_id, inventory_id)
);

CREATE TABLE IF NOT EXISTS public.barcode_aliases (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  inventory_id INTEGER NOT NULL,
  barcode VARCHAR(120) NOT NULL,
  alias_type VARCHAR(30) NOT NULL DEFAULT 'internal',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT barcode_alias_type_valid CHECK (alias_type IN ('internal','supplier','pack','legacy')),
  CONSTRAINT barcode_alias_unique UNIQUE (tenant_id, barcode)
);
CREATE INDEX IF NOT EXISTS idx_barcode_inventory ON public.barcode_aliases (tenant_id, outlet_id, inventory_id);

CREATE SEQUENCE IF NOT EXISTS public.manufacturing_order_number_seq START 1;
CREATE TABLE IF NOT EXISTS public.manufacturing_orders (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  mo_number VARCHAR(80) NOT NULL,
  item_id INTEGER NOT NULL,
  quantity_planned NUMERIC(18,3) NOT NULL,
  quantity_produced NUMERIC(18,3) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by INTEGER,
  completed_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mo_qty_valid CHECK (quantity_planned > 0 AND quantity_produced >= 0),
  CONSTRAINT mo_status_valid CHECK (status IN ('draft','confirmed','in_progress','done','cancelled')),
  CONSTRAINT mo_number_unique UNIQUE (tenant_id, mo_number)
);
CREATE INDEX IF NOT EXISTS idx_mo_scope ON public.manufacturing_orders (tenant_id, outlet_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.manufacturing_consumptions (
  id SERIAL PRIMARY KEY,
  manufacturing_order_id INTEGER NOT NULL REFERENCES public.manufacturing_orders(id) ON DELETE CASCADE,
  ingredient_id INTEGER,
  inventory_id INTEGER,
  quantity_planned NUMERIC(18,3) NOT NULL,
  quantity_consumed NUMERIC(18,3) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(15,4) NOT NULL DEFAULT 0,
  CONSTRAINT mo_consumption_target CHECK ((ingredient_id IS NOT NULL AND inventory_id IS NULL) OR (ingredient_id IS NULL AND inventory_id IS NOT NULL)),
  CONSTRAINT mo_consumption_qty_valid CHECK (quantity_planned >= 0 AND quantity_consumed >= 0)
);

CREATE TABLE IF NOT EXISTS public.quality_checks (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  check_type VARCHAR(40) NOT NULL,
  reference_type VARCHAR(50),
  reference_id VARCHAR(100),
  inventory_id INTEGER,
  item_id INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  checked_by INTEGER,
  checked_at TIMESTAMPTZ,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT quality_status_valid CHECK (status IN ('pending','pass','fail','waived'))
);
CREATE INDEX IF NOT EXISTS idx_quality_scope ON public.quality_checks (tenant_id, outlet_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.maintenance_equipment (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  code VARCHAR(60) NOT NULL,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(80),
  serial_number VARCHAR(120),
  purchase_date DATE,
  next_maintenance_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'operational',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT equipment_status_valid CHECK (status IN ('operational','maintenance','down','retired')),
  CONSTRAINT equipment_code_unique UNIQUE (tenant_id, outlet_id, code)
);

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER NOT NULL,
  equipment_id INTEGER NOT NULL REFERENCES public.maintenance_equipment(id) ON DELETE RESTRICT,
  request_type VARCHAR(30) NOT NULL DEFAULT 'corrective',
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  title VARCHAR(180) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_user_id INTEGER,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT maintenance_type_valid CHECK (request_type IN ('preventive','corrective','inspection')),
  CONSTRAINT maintenance_priority_valid CHECK (priority IN ('low','normal','high','critical')),
  CONSTRAINT maintenance_request_status_valid CHECK (status IN ('open','planned','in_progress','done','cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_maintenance_scope ON public.maintenance_requests (tenant_id, outlet_id, status, priority, created_at DESC);
