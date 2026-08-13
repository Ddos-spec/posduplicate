-- P3.4 Rental core. Reuses public.items, public.customers, public.outlets and public.users.
-- Booking availability is time-range based; reservations do not decrement physical stock.

CREATE SEQUENCE IF NOT EXISTS public.rental_booking_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.rental_item_settings (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  outlet_id INTEGER NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  item_id INTEGER NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  rate_unit VARCHAR(12) NOT NULL DEFAULT 'day',
  rate_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  deposit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  minimum_duration INTEGER NOT NULL DEFAULT 1,
  maximum_duration INTEGER,
  buffer_minutes INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rental_item_status_valid CHECK (status IN ('draft','active','archived')),
  CONSTRAINT rental_rate_unit_valid CHECK (rate_unit IN ('hour','day','week')),
  CONSTRAINT rental_rate_amount_valid CHECK (rate_amount >= 0),
  CONSTRAINT rental_deposit_amount_valid CHECK (deposit_amount >= 0),
  CONSTRAINT rental_minimum_duration_valid CHECK (minimum_duration BETWEEN 1 AND 10000),
  CONSTRAINT rental_maximum_duration_valid CHECK (maximum_duration IS NULL OR maximum_duration >= minimum_duration),
  CONSTRAINT rental_buffer_minutes_valid CHECK (buffer_minutes BETWEEN 0 AND 10080),
  CONSTRAINT ux_rental_item_setting UNIQUE (tenant_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_rental_item_setting_scope
  ON public.rental_item_settings (tenant_id, outlet_id, status, item_id);

CREATE TABLE IF NOT EXISTS public.rental_bookings (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  outlet_id INTEGER NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  booking_number VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'reserved',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  deposit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  deposit_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  picked_up_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rental_booking_status_valid CHECK (status IN ('reserved','confirmed','picked_up','returned','cancelled')),
  CONSTRAINT rental_booking_period_valid CHECK (ends_at > starts_at),
  CONSTRAINT rental_booking_amount_valid CHECK (subtotal >= 0 AND deposit_amount >= 0),
  CONSTRAINT rental_deposit_status_valid CHECK (deposit_status IN ('not_required','pending','held','released','forfeited')),
  CONSTRAINT ux_rental_booking_number UNIQUE (tenant_id, booking_number)
);
CREATE INDEX IF NOT EXISTS idx_rental_booking_scope
  ON public.rental_bookings (tenant_id, outlet_id, status, starts_at, ends_at, id);
CREATE INDEX IF NOT EXISTS idx_rental_booking_customer
  ON public.rental_bookings (tenant_id, customer_id, status, starts_at DESC, id);

CREATE TABLE IF NOT EXISTS public.rental_booking_items (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  booking_id BIGINT NOT NULL REFERENCES public.rental_bookings(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
  item_name VARCHAR(220) NOT NULL,
  sku VARCHAR(120),
  quantity NUMERIC(12,3) NOT NULL,
  rate_unit VARCHAR(12) NOT NULL,
  rate_amount NUMERIC(15,2) NOT NULL,
  duration_units NUMERIC(12,3) NOT NULL,
  line_total NUMERIC(15,2) NOT NULL,
  deposit_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rental_booking_item_quantity_valid CHECK (quantity > 0),
  CONSTRAINT rental_booking_item_rate_unit_valid CHECK (rate_unit IN ('hour','day','week')),
  CONSTRAINT rental_booking_item_amount_valid CHECK (rate_amount >= 0 AND duration_units > 0 AND line_total >= 0 AND deposit_amount >= 0),
  CONSTRAINT ux_rental_booking_item UNIQUE (tenant_id, booking_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_rental_booking_item_availability
  ON public.rental_booking_items (tenant_id, item_id, booking_id);

CREATE TABLE IF NOT EXISTS public.rental_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  booking_id BIGINT NOT NULL REFERENCES public.rental_bookings(id) ON DELETE CASCADE,
  event_type VARCHAR(60) NOT NULL,
  actor_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rental_event_type_not_blank CHECK (length(trim(event_type)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_rental_event_scope
  ON public.rental_events (tenant_id, booking_id, id);

CREATE OR REPLACE FUNCTION public.prevent_rental_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'rental_events is append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_rental_events_immutable ON public.rental_events;
CREATE TRIGGER trg_rental_events_immutable
BEFORE UPDATE OR DELETE ON public.rental_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_rental_event_mutation();

COMMENT ON TABLE public.rental_item_settings IS
  'Rental configuration projection over existing public.items; it is not a parallel product master.';
COMMENT ON TABLE public.rental_bookings IS
  'Time-range rental reservations. Physical stock is not decremented merely because a future interval is reserved.';
COMMENT ON TABLE public.rental_events IS
  'Append-only rental lifecycle audit ledger.';
