-- P2 workforce attendance foundation.
-- accounting.employees remains the employee source of truth.

CREATE TABLE IF NOT EXISTS public.workforce_attendance_sessions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL REFERENCES accounting.employees(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  outlet_id INTEGER NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  clock_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  source VARCHAR(30) NOT NULL DEFAULT 'self_service',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workforce_attendance_status_valid CHECK (status IN ('open','closed','corrected')),
  CONSTRAINT workforce_attendance_time_valid CHECK (clock_out_at IS NULL OR clock_out_at >= clock_in_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_workforce_attendance_open_employee
  ON public.workforce_attendance_sessions (tenant_id, employee_id)
  WHERE clock_out_at IS NULL AND status = 'open';

CREATE INDEX IF NOT EXISTS idx_workforce_attendance_scope
  ON public.workforce_attendance_sessions (tenant_id, outlet_id, clock_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_workforce_attendance_employee
  ON public.workforce_attendance_sessions (tenant_id, employee_id, clock_in_at DESC);

COMMENT ON TABLE public.workforce_attendance_sessions IS
  'P2 attendance sessions. One open self-service session per employee is enforced by a partial unique index.';
