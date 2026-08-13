-- P2 Payroll-B: verified current-law statutory profile foundation.
-- This remains DRAFT until the period calculator consumes the profile and persists a calculation snapshot.

INSERT INTO public.payroll_rate_profiles
  (tenant_id, profile_code, version, country_code, effective_from, status, tax_method, tax_rule_reference, configuration, source_references, notes)
SELECT
  NULL,
  'ID-PAYROLL-2026',
  2,
  'ID',
  DATE '2026-01-01',
  'draft',
  'PPH21_TER',
  'PP 58/2023 + PMK 168/2023 + BPJS PU rules verified 2026-08-13',
  jsonb_build_object(
    'verificationStatus', 'verified-components-awaiting-engine-wiring',
    'pph21', jsonb_build_object(
      'method', 'TER',
      'baseRulesetId', 'ID-PPH21-BASE-PP58-2023',
      'monthlyTerExternalized', true,
      'finalTaxPeriodAnnualReconciliation', 'required-before-engine-activation'
    ),
    'bpjsKetenagakerjaan', jsonb_build_object(
      'participantSegment', 'PU',
      'wageBasis', 'BASIC_SALARY_PLUS_FIXED_ALLOWANCES',
      'jhtEmployerRate', 0.037,
      'jhtEmployeeRate', 0.020,
      'jkkRiskRates', jsonb_build_array(0.0024, 0.0054, 0.0089, 0.0127, 0.0174),
      'jkmEmployerRate', 0.003,
      'jpEmployerRate', 0.020,
      'jpEmployeeRate', 0.010,
      'jpMaxMonthlyWage', 10547400,
      'bpuReliefApplied', false
    ),
    'bpjsKesehatan', jsonb_build_object(
      'participantSegment', 'PPU',
      'employerRate', 0.040,
      'employeeRate', 0.010,
      'maxMonthlyWage', 12000000,
      'minimumWagePolicy', 'APPLICABLE_UMK_OR_UMP_REQUIRED'
    ),
    'activationGuard', jsonb_build_object(
      'status', 'blocked',
      'reason', 'Period calculation must consume this profile and persist profile/version snapshot before activation'
    )
  ),
  jsonb_build_array(
    'PP 58/2023',
    'PMK 168/2023',
    'BPJS Ketenagakerjaan Penerima Upah contribution page - verified 2026-08-13',
    'Perpres 64/2020 as amended by Perpres 59/2024',
    'BPJS Kesehatan - contribution amounts stated unchanged 2026-05-29'
  ),
  'Verified component profile only. Keep draft and keep legacy calculate/finalize blocked until profile-driven period calculation and final-tax-period reconciliation are implemented.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.payroll_rate_profiles
  WHERE tenant_id IS NULL AND profile_code = 'ID-PAYROLL-2026' AND version = 2
);
