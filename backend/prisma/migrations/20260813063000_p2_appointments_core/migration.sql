-- P2 Services Appointments core.
-- Reuses public.customers, public.outlets, accounting.employees and service_planning_allocations.

CREATE TABLE IF NOT EXISTS public.service_appointment_types (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER REFERENCES public.outlets(id) ON DELETE SET NULL,
  code VARCHAR(60) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0,
  buffer_after_minutes INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_appointment_type_code_not_blank CHECK (length(trim(code)) > 0),
  CONSTRAINT service_appointment_type_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT service_appointment_type_duration_valid CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  CONSTRAINT service_appointment_type_buffer_before_valid CHECK (buffer_before_minutes >= 0 AND buffer_before_minutes <= 1440),
  CONSTRAINT service_appointment_type_buffer_after_valid CHECK (buffer_after_minutes >= 0 AND buffer_after_minutes <= 1440),
  CONSTRAINT ux_service_appointment_type_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.service_appointments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER REFERENCES public.outlets(id) ON DELETE SET NULL,
  appointment_type_id INTEGER NOT NULL REFERENCES public.service_appointment_types(id) ON DELETE RESTRICT,
  customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  assigned_employee_id INTEGER NOT NULL REFERENCES accounting.employees(id) ON DELETE RESTRICT,
  planning_allocation_id INTEGER NOT NULL UNIQUE REFERENCES public.service_planning_allocations(id) ON DELETE RESTRICT,
  code VARCHAR(80) NOT NULL,
  title VARCHAR(220) NOT NULL,
  notes TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'booked',
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  no_show_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  completion_note TEXT,
  cancellation_reason TEXT,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_appointment_code_not_blank CHECK (length(trim(code)) > 0),
  CONSTRAINT service_appointment_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT service_appointment_period_valid CHECK (scheduled_end > scheduled_start),
  CONSTRAINT service_appointment_status_valid CHECK (status IN ('booked','confirmed','checked_in','completed','no_show','cancelled')),
  CONSTRAINT ux_service_appointment_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.service_appointment_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  appointment_id INTEGER NOT NULL REFERENCES public.service_appointments(id) ON DELETE CASCADE,
  event_type VARCHAR(40) NOT NULL,
  actor_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  actor_employee_id INTEGER REFERENCES accounting.employees(id) ON DELETE SET NULL,
  notes TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_appointment_event_type_not_blank CHECK (length(trim(event_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_service_appointment_type_scope
  ON public.service_appointment_types (tenant_id, is_active, name);
CREATE INDEX IF NOT EXISTS idx_service_appointment_scope
  ON public.service_appointments (tenant_id, status, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_service_appointment_employee
  ON public.service_appointments (tenant_id, assigned_employee_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_service_appointment_customer
  ON public.service_appointments (tenant_id, customer_id, scheduled_start DESC);
CREATE INDEX IF NOT EXISTS idx_service_appointment_event_order
  ON public.service_appointment_events (tenant_id, appointment_id, created_at, id);

DROP TRIGGER IF EXISTS trg_service_appointment_event_append_only ON public.service_appointment_events;
CREATE TRIGGER trg_service_appointment_event_append_only
BEFORE UPDATE OR DELETE ON public.service_appointment_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_suite_ledger_mutation();

COMMENT ON TABLE public.service_appointments IS
  'P2 Appointments. Scheduling is represented by the linked service_planning_allocations row so all service workloads share one overlap guard.';
COMMENT ON TABLE public.service_appointment_events IS
  'Immutable appointment lifecycle audit trail protected by the suite append-only trigger.';
