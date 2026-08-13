-- Payroll-C3: controlled official materialization + payroll accounting mapping + append-only posting evidence.

ALTER TABLE accounting.payroll_details
  ADD COLUMN IF NOT EXISTS source_calculation_run_id BIGINT,
  ADD COLUMN IF NOT EXISTS source_profile_id INTEGER,
  ADD COLUMN IF NOT EXISTS source_profile_version INTEGER,
  ADD COLUMN IF NOT EXISTS pph21_refund NUMERIC(15,2) NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE accounting.payroll_details
    ADD CONSTRAINT payroll_details_source_run_fk
    FOREIGN KEY (source_calculation_run_id)
    REFERENCES public.payroll_calculation_runs(id)
    ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE accounting.payroll_details
    ADD CONSTRAINT payroll_details_source_profile_fk
    FOREIGN KEY (source_profile_id)
    REFERENCES public.payroll_rate_profiles(id)
    ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE accounting.payroll_details
    ADD CONSTRAINT payroll_details_pph21_refund_nonnegative
    CHECK (pph21_refund >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payroll_details_period_employee
  ON accounting.payroll_details (tenant_id, period_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_details_source_run
  ON accounting.payroll_details (source_calculation_run_id);

CREATE TABLE IF NOT EXISTS public.payroll_accounting_settings (
  tenant_id INTEGER PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  salary_expense_account_id INTEGER NOT NULL REFERENCES accounting.chart_of_accounts(id) ON DELETE RESTRICT,
  employer_statutory_expense_account_id INTEGER NOT NULL REFERENCES accounting.chart_of_accounts(id) ON DELETE RESTRICT,
  salary_payable_account_id INTEGER NOT NULL REFERENCES accounting.chart_of_accounts(id) ON DELETE RESTRICT,
  pph21_payable_account_id INTEGER NOT NULL REFERENCES accounting.chart_of_accounts(id) ON DELETE RESTRICT,
  bpjs_payable_account_id INTEGER NOT NULL REFERENCES accounting.chart_of_accounts(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payroll_official_postings (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_id INTEGER NOT NULL REFERENCES accounting.payroll_periods(id) ON DELETE RESTRICT,
  calculation_run_id BIGINT NOT NULL REFERENCES public.payroll_calculation_runs(id) ON DELETE RESTRICT,
  profile_id INTEGER NOT NULL REFERENCES public.payroll_rate_profiles(id) ON DELETE RESTRICT,
  profile_version INTEGER NOT NULL,
  journal_entry_id INTEGER NOT NULL REFERENCES accounting.journal_entries(id) ON DELETE RESTRICT,
  tax_period_kind VARCHAR(20) NOT NULL,
  detail_count INTEGER NOT NULL,
  totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  posted_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payroll_official_posting_tax_kind_valid CHECK (tax_period_kind IN ('non_final','final')),
  CONSTRAINT payroll_official_posting_detail_count_positive CHECK (detail_count > 0),
  CONSTRAINT payroll_official_posting_totals_object CHECK (jsonb_typeof(totals) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_payroll_official_posting_period
  ON public.payroll_official_postings (tenant_id, period_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_payroll_official_posting_run
  ON public.payroll_official_postings (tenant_id, calculation_run_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_payroll_official_posting_journal
  ON public.payroll_official_postings (tenant_id, journal_entry_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_journal_payroll_period_reference
  ON accounting.journal_entries (tenant_id, reference_id)
  WHERE reference_type = 'payroll_period';

DROP TRIGGER IF EXISTS trg_payroll_official_posting_append_only ON public.payroll_official_postings;
CREATE TRIGGER trg_payroll_official_posting_append_only
  BEFORE UPDATE OR DELETE ON public.payroll_official_postings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_suite_ledger_mutation();
