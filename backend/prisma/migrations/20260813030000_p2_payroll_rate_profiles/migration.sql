-- P2 payroll governance foundation.
-- Rate profiles are versioned/effective-dated so historical payroll never changes when regulations change.

CREATE TABLE IF NOT EXISTS public.payroll_rate_profiles (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER,
  profile_code VARCHAR(80) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  country_code CHAR(2) NOT NULL DEFAULT 'ID',
  effective_from DATE NOT NULL,
  effective_to DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  tax_method VARCHAR(40) NOT NULL,
  tax_rule_reference TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payroll_rate_profile_status_valid CHECK (status IN ('draft','active','retired')),
  CONSTRAINT payroll_rate_profile_dates_valid CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT payroll_rate_profile_config_object CHECK (jsonb_typeof(configuration) = 'object'),
  CONSTRAINT payroll_rate_profile_sources_array CHECK (jsonb_typeof(source_references) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_payroll_rate_profile_global_version
  ON public.payroll_rate_profiles (profile_code, version)
  WHERE tenant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payroll_rate_profile_tenant_version
  ON public.payroll_rate_profiles (tenant_id, profile_code, version)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payroll_rate_profile_effective
  ON public.payroll_rate_profiles (country_code, tenant_id, status, effective_from DESC, effective_to);

-- Draft reference profile. It is intentionally not active until the complete payroll engine
-- (including current health-insurance rules and full TER table source) is verified end-to-end.
INSERT INTO public.payroll_rate_profiles
  (tenant_id, profile_code, version, country_code, effective_from, status, tax_method, tax_rule_reference, configuration, source_references, notes)
SELECT
  NULL,
  'ID-PAYROLL-2026',
  1,
  'ID',
  DATE '2026-01-01',
  'draft',
  'PPH21_TER',
  'PP 58/2023 + PMK 168/2023',
  jsonb_build_object(
    'bpjsKetenagakerjaan', jsonb_build_object(
      'jhtEmployerRate', 0.037,
      'jhtEmployeeRate', 0.020,
      'jkmEmployerRate', 0.003,
      'jkkRiskRates', jsonb_build_array(0.0024, 0.0054, 0.0089, 0.0127, 0.0174),
      'jpEmployerRate', 0.020,
      'jpEmployeeRate', 0.010,
      'jpMaxMonthlyWage', 10547400
    ),
    'bpjsKesehatan', jsonb_build_object(
      'verificationStatus', 'pending-current-rule-verification'
    ),
    'pph21', jsonb_build_object(
      'method', 'TER',
      'tableExternalizationStatus', 'pending'
    )
  ),
  jsonb_build_array(
    'JDIH Kemenkeu PMK 168/2023',
    'PP 58/2023',
    'BPJS Ketenagakerjaan Penerima Upah - current reference checked 2026-08-13'
  ),
  'Governance seed only. Keep Payroll app PARTIAL until the active profile and full calculation engine are verified.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.payroll_rate_profiles
  WHERE tenant_id IS NULL AND profile_code = 'ID-PAYROLL-2026' AND version = 1
);
