-- Payroll-C2: final-tax-period verification inputs and controlled tenant activation audit.

ALTER TABLE public.payroll_employee_statutory_settings
  ADD COLUMN IF NOT EXISTS ptkp_status_year_start VARCHAR(10),
  ADD COLUMN IF NOT EXISTS tax_subjective_case VARCHAR(40) NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS zakat_via_employer_monthly NUMERIC(15,2) NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE public.payroll_employee_statutory_settings
    ADD CONSTRAINT payroll_employee_statutory_ptkp_status_valid
    CHECK (ptkp_status_year_start IS NULL OR ptkp_status_year_start IN ('TK/0','TK/1','TK/2','TK/3','K/0','K/1','K/2','K/3'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.payroll_employee_statutory_settings
    ADD CONSTRAINT payroll_employee_statutory_tax_case_valid
    CHECK (tax_subjective_case IN ('unverified','full_year_same_employer'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.payroll_employee_statutory_settings
    ADD CONSTRAINT payroll_employee_statutory_zakat_nonnegative
    CHECK (zakat_via_employer_monthly >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.payroll_profile_activation_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_profile_id INTEGER NOT NULL REFERENCES public.payroll_rate_profiles(id) ON DELETE RESTRICT,
  activated_profile_id INTEGER NOT NULL REFERENCES public.payroll_rate_profiles(id) ON DELETE RESTRICT,
  verification_run_id BIGINT NOT NULL REFERENCES public.payroll_calculation_runs(id) ON DELETE RESTRICT,
  effective_from DATE NOT NULL,
  activated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payroll_profile_activation_payload_object CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_payroll_profile_activation_tenant
  ON public.payroll_profile_activation_events (tenant_id, activated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_payroll_profile_activation_run
  ON public.payroll_profile_activation_events (tenant_id, verification_run_id);

DROP TRIGGER IF EXISTS trg_payroll_profile_activation_event_append_only ON public.payroll_profile_activation_events;
CREATE TRIGGER trg_payroll_profile_activation_event_append_only
  BEFORE UPDATE OR DELETE ON public.payroll_profile_activation_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_suite_ledger_mutation();
