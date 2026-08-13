-- P2 workforce time-off foundation.
-- Reuses accounting.employees as the employee source of truth.

CREATE TABLE IF NOT EXISTS public.workforce_leave_types (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  track_balance BOOLEAN NOT NULL DEFAULT TRUE,
  allow_negative BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workforce_leave_type_code_not_blank CHECK (length(trim(code)) > 0),
  CONSTRAINT workforce_leave_type_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT ux_workforce_leave_type_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.workforce_leave_allocations (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL REFERENCES accounting.employees(id) ON DELETE CASCADE,
  leave_type_id INTEGER NOT NULL REFERENCES public.workforce_leave_types(id) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  allocated_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  reserved_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  used_days NUMERIC(8,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  notes TEXT,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workforce_leave_allocation_period_valid CHECK (period_end >= period_start),
  CONSTRAINT workforce_leave_allocation_amounts_valid CHECK (allocated_days >= 0 AND reserved_days >= 0 AND used_days >= 0),
  CONSTRAINT workforce_leave_allocation_status_valid CHECK (status IN ('active','closed','cancelled')),
  CONSTRAINT ux_workforce_leave_allocation_period UNIQUE (tenant_id, employee_id, leave_type_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS public.workforce_leave_requests (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL REFERENCES accounting.employees(id) ON DELETE CASCADE,
  leave_type_id INTEGER NOT NULL REFERENCES public.workforce_leave_types(id) ON DELETE RESTRICT,
  allocation_id INTEGER REFERENCES public.workforce_leave_allocations(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  requested_days NUMERIC(8,2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  decided_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  decision_note TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workforce_leave_request_period_valid CHECK (end_date >= start_date),
  CONSTRAINT workforce_leave_request_days_valid CHECK (requested_days > 0),
  CONSTRAINT workforce_leave_request_status_valid CHECK (status IN ('pending','approved','rejected','cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_workforce_leave_type_scope
  ON public.workforce_leave_types (tenant_id, is_active, code);

CREATE INDEX IF NOT EXISTS idx_workforce_leave_allocation_employee
  ON public.workforce_leave_allocations (tenant_id, employee_id, leave_type_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_workforce_leave_request_scope
  ON public.workforce_leave_requests (tenant_id, status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_workforce_leave_request_employee
  ON public.workforce_leave_requests (tenant_id, employee_id, created_at DESC);

COMMENT ON TABLE public.workforce_leave_allocations IS
  'Balance buckets for P2 Time Off. Pending requests reserve balance; approval moves reserved balance to used balance.';

COMMENT ON TABLE public.workforce_leave_requests IS
  'Tenant-scoped time-off requests with transactional reservation and manager decision lifecycle.';
