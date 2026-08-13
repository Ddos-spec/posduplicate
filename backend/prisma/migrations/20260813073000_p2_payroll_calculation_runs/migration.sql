-- Payroll-C1: profile-driven verification calculation runs.
-- Official payroll mutation/finalization remains blocked until final-tax-period reconciliation is complete.

CREATE TABLE IF NOT EXISTS public.payroll_employee_statutory_settings (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES accounting.employees(id) ON DELETE CASCADE,
  fixed_allowance_monthly NUMERIC(15,2) NOT NULL DEFAULT 0,
  applicable_health_minimum_wage NUMERIC(15,2),
  bpjs_employment_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  bpjs_health_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  jkk_risk_level SMALLINT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payroll_employee_statutory_fixed_allowance_nonnegative CHECK (fixed_allowance_monthly >= 0),
  CONSTRAINT payroll_employee_statutory_health_floor_nonnegative CHECK (applicable_health_minimum_wage IS NULL OR applicable_health_minimum_wage >= 0),
  CONSTRAINT payroll_employee_statutory_jkk_valid CHECK (jkk_risk_level IS NULL OR jkk_risk_level BETWEEN 1 AND 5),
  CONSTRAINT ux_payroll_employee_statutory_settings UNIQUE (tenant_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee_statutory_tenant
  ON public.payroll_employee_statutory_settings (tenant_id, employee_id);

CREATE TABLE IF NOT EXISTS public.payroll_calculation_runs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_id INTEGER NOT NULL REFERENCES accounting.payroll_periods(id) ON DELETE CASCADE,
  profile_id INTEGER NOT NULL REFERENCES public.payroll_rate_profiles(id) ON DELETE RESTRICT,
  profile_code VARCHAR(80) NOT NULL,
  profile_version INTEGER NOT NULL,
  run_mode VARCHAR(30) NOT NULL DEFAULT 'verification_preview',
  tax_period_kind VARCHAR(20) NOT NULL DEFAULT 'non_final',
  rules_snapshot JSONB NOT NULL,
  input_snapshot JSONB NOT NULL,
  output_snapshot JSONB NOT NULL,
  calculated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payroll_calculation_run_mode_valid CHECK (run_mode IN ('verification_preview')),
  CONSTRAINT payroll_calculation_tax_period_valid CHECK (tax_period_kind IN ('non_final','final')),
  CONSTRAINT payroll_calculation_rules_object CHECK (jsonb_typeof(rules_snapshot) = 'object'),
  CONSTRAINT payroll_calculation_input_object CHECK (jsonb_typeof(input_snapshot) = 'object'),
  CONSTRAINT payroll_calculation_output_object CHECK (jsonb_typeof(output_snapshot) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_payroll_calculation_run_period
  ON public.payroll_calculation_runs (tenant_id, period_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_calculation_run_profile
  ON public.payroll_calculation_runs (profile_id, profile_version, calculated_at DESC);

-- Calculation evidence is audit material: once recorded it must never be rewritten.
DROP TRIGGER IF EXISTS trg_payroll_calculation_run_append_only ON public.payroll_calculation_runs;
CREATE TRIGGER trg_payroll_calculation_run_append_only
  BEFORE UPDATE OR DELETE ON public.payroll_calculation_runs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_suite_ledger_mutation();
