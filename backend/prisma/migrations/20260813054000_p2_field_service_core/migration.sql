-- P2.6 Field Service core.
-- Reuses P2.5 Projects/Planning plus existing customer, outlet, user and employee masters.

CREATE TABLE IF NOT EXISTS public.service_field_orders (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER REFERENCES public.outlets(id) ON DELETE SET NULL,
  customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  project_id INTEGER REFERENCES public.service_projects(id) ON DELETE SET NULL,
  task_id INTEGER REFERENCES public.service_project_tasks(id) ON DELETE SET NULL,
  planning_allocation_id INTEGER UNIQUE REFERENCES public.service_planning_allocations(id) ON DELETE SET NULL,
  assigned_employee_id INTEGER REFERENCES accounting.employees(id) ON DELETE SET NULL,
  code VARCHAR(60) NOT NULL,
  title VARCHAR(220) NOT NULL,
  description TEXT,
  service_address TEXT NOT NULL,
  contact_name VARCHAR(160),
  contact_phone VARCHAR(60),
  priority VARCHAR(16) NOT NULL DEFAULT 'normal',
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_field_order_code_not_blank CHECK (length(trim(code)) > 0),
  CONSTRAINT service_field_order_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT service_field_order_address_not_blank CHECK (length(trim(service_address)) > 0),
  CONSTRAINT service_field_order_priority_valid CHECK (priority IN ('low','normal','high','urgent')),
  CONSTRAINT service_field_order_status_valid CHECK (status IN ('draft','scheduled','en_route','on_site','completed','cancelled')),
  CONSTRAINT service_field_order_schedule_pair CHECK ((scheduled_start IS NULL) = (scheduled_end IS NULL)),
  CONSTRAINT service_field_order_schedule_period CHECK (scheduled_start IS NULL OR scheduled_end > scheduled_start),
  CONSTRAINT service_field_order_active_assignment CHECK (
    status IN ('draft','cancelled') OR
    (assigned_employee_id IS NOT NULL AND scheduled_start IS NOT NULL AND scheduled_end IS NOT NULL)
  ),
  CONSTRAINT ux_service_field_order_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.service_field_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  field_order_id INTEGER NOT NULL REFERENCES public.service_field_orders(id) ON DELETE CASCADE,
  event_type VARCHAR(32) NOT NULL,
  actor_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  employee_id INTEGER REFERENCES accounting.employees(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT service_field_event_type_valid CHECK (event_type IN ('created','scheduled','departed','arrived','completed','cancelled')),
  CONSTRAINT service_field_event_latitude_valid CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT service_field_event_longitude_valid CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  CONSTRAINT service_field_event_coordinate_pair CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_service_field_order_scope
  ON public.service_field_orders (tenant_id, status, scheduled_start, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_field_order_employee
  ON public.service_field_orders (tenant_id, assigned_employee_id, status, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_service_field_order_customer
  ON public.service_field_orders (tenant_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_field_event_order
  ON public.service_field_events (tenant_id, field_order_id, occurred_at, id);

DROP TRIGGER IF EXISTS trg_service_field_event_append_only ON public.service_field_events;
CREATE TRIGGER trg_service_field_event_append_only
  BEFORE UPDATE OR DELETE ON public.service_field_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_suite_ledger_mutation();

COMMENT ON TABLE public.service_field_orders IS
  'P2.6 Field Service work orders. Scheduling reuses service_planning_allocations and assigned technicians reuse accounting.employees.';
COMMENT ON TABLE public.service_field_events IS
  'Append-only Field Service lifecycle ledger for dispatch, arrival, completion and cancellation audit evidence.';
