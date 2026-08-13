import api from './api';

export interface PayrollPeriod {
  id: number;
  tenant_id: number;
  period_start: string;
  period_end: string;
  pay_date?: string | null;
  description?: string | null;
  status: 'draft' | 'calculated' | 'finalized';
  finalized_at?: string | null;
}

export interface PayrollProfile {
  id: number;
  tenant_id?: number | null;
  profile_code: string;
  version: number;
  country: string;
  effective_from: string;
  effective_to?: string | null;
  status: 'draft' | 'active' | 'retired';
  tax_method: string;
  tax_reference?: string | null;
  configuration?: Record<string, unknown>;
  source_references?: unknown;
  notes?: string | null;
}

export interface PayrollContextEmployee {
  id: number;
  employee_id: string;
  name: string;
  nik?: string | null;
  ptkp_status?: string | null;
  department?: string | null;
  position?: string | null;
  basic_salary?: number | string | null;
  jkk_risk_level?: number | null;
  bpjs_kesehatan?: boolean | null;
  bpjs_ketenagakerjaan?: boolean | null;
}

export interface PayrollAccount {
  id: number;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: 'DEBIT' | 'CREDIT';
  is_active: boolean;
}

export interface PayrollCurrentContext { employees: PayrollContextEmployee[]; accounts: PayrollAccount[]; }

export interface PayrollStatutorySetting {
  employee_id: number;
  employee_code: string;
  name: string;
  status: string;
  setting_id?: number | null;
  fixed_allowance_monthly?: number | string | null;
  applicable_health_minimum_wage?: number | string | null;
  bpjs_employment_enabled?: boolean | null;
  bpjs_health_enabled?: boolean | null;
  jkk_risk_level?: number | null;
  ptkp_status_year_start?: string | null;
  tax_subjective_case?: 'unverified' | 'full_year_same_employer' | null;
  zakat_via_employer_monthly?: number | string | null;
  updated_at?: string | null;
}

export interface PayrollRun {
  id: number;
  tenant_id: number;
  period_id: number;
  profile_id: number;
  profile_code: string;
  profile_version: number;
  run_mode: string;
  tax_period_kind: 'non_final' | 'final';
  rules_snapshot: Record<string, unknown>;
  input_snapshot: { period?: { id?: number; start?: string; end?: string; statusAtCalculation?: string }; [key: string]: unknown };
  output_snapshot: { employees?: unknown[]; totals?: Record<string, number>; [key: string]: unknown };
  calculated_at: string;
}

export interface PayrollAccountingSettings {
  tenant_id?: number;
  salary_expense_account_id: number;
  employer_statutory_expense_account_id: number;
  salary_payable_account_id: number;
  pph21_payable_account_id: number;
  bpjs_payable_account_id: number;
  salary_expense_code?: string;
  salary_expense_name?: string;
  employer_statutory_expense_code?: string;
  employer_statutory_expense_name?: string;
  salary_payable_code?: string;
  salary_payable_name?: string;
  pph21_payable_code?: string;
  pph21_payable_name?: string;
  bpjs_payable_code?: string;
  bpjs_payable_name?: string;
}

export interface PayrollDetail {
  id: number;
  employee_id: number;
  gross_salary: number | string;
  total_deductions: number | string;
  net_salary: number | string;
  employer_cost: number | string;
  pph21?: number | string | null;
  pph21_refund?: number | string | null;
  source_calculation_run_id?: number | null;
  source_profile_id?: number | null;
  source_profile_version?: number | null;
  employees?: { employee_id: string; name: string; department?: string | null; position?: string | null; bank_name?: string | null; bank_account?: string | null };
}

export interface PayrollMaterialization { id: number; period_id: number; calculation_run_id: number; profile_id: number; profile_version: number; detail_count?: number; totals_snapshot?: Record<string, number>; materialized_at?: string; }
export interface PayrollPosting { id: number; period_id: number; calculation_run_id: number; journal_entry_id: number; profile_id: number; profile_version: number; totals_snapshot?: Record<string, number>; posted_at?: string; }
export interface PayrollActivationEvent { id: number; source_profile_id: number; activated_profile_id: number; verification_run_id: number; effective_from: string; activated_at: string; }

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;
export const payrollErrorMessage = (error: unknown, fallback: string) => {
  const candidate = error as { response?: { data?: { error?: { message?: string; code?: string } } }; message?: string };
  const code = candidate.response?.data?.error?.code;
  const message = candidate.response?.data?.error?.message || candidate.message || fallback;
  return code ? `${code}: ${message}` : message;
};

export async function getPayrollCurrentContext(): Promise<PayrollCurrentContext> { return unwrap(await api.get('/accounting/payroll/current/context')); }
export async function getPayrollPeriods(): Promise<PayrollPeriod[]> { return unwrap(await api.get('/accounting/payroll/periods')); }
export async function createPayrollPeriod(payload: { periodStart: string; periodEnd: string; payDate?: string; description?: string }): Promise<PayrollPeriod> { return unwrap(await api.post('/accounting/payroll/periods', payload)); }
export async function getPayrollProfiles(): Promise<PayrollProfile[]> { return unwrap(await api.get('/accounting/payroll/rates')); }
export async function getPayrollStatutorySettings(): Promise<PayrollStatutorySetting[]> { return unwrap(await api.get('/accounting/payroll/current/statutory-settings')); }
export async function upsertPayrollStatutorySetting(employeeId: number, payload: { fixedAllowanceMonthly: number; applicableHealthMinimumWage?: number | null; bpjsEmploymentEnabled: boolean; bpjsHealthEnabled: boolean; jkkRiskLevel: number; ptkpStatusYearStart?: string | null; taxSubjectiveCase: 'unverified' | 'full_year_same_employer'; zakatViaEmployerMonthly: number }) { return unwrap<PayrollStatutorySetting>(await api.put(`/accounting/payroll/current/statutory-settings/${employeeId}`, payload)); }
export async function getPayrollRuns(periodId?: number): Promise<PayrollRun[]> { return unwrap(await api.get('/accounting/payroll/current/runs', { params: periodId ? { periodId } : undefined })); }
export async function runPayrollVerification(periodId: number, profileId: number) { return unwrap<{ run: PayrollRun; profile: unknown; payroll: unknown[]; totals: Record<string, number>; mutationStatus: string }>(await api.post(`/accounting/payroll/current/periods/${periodId}/verify`, { profileId, confirmNonFinalTaxPeriod: true })); }
export async function runPayrollFinalVerification(periodId: number, profileId: number, priorRunIds: number[]) { return unwrap<{ run: PayrollRun; profile: unknown; payroll: unknown[]; totals: Record<string, number>; mutationStatus: string }>(await api.post(`/accounting/payroll/current/periods/${periodId}/final-verify`, { profileId, priorRunIds, confirmFullYearSameEmployer: true })); }
export async function activatePayrollProfile(verificationRunId: number, effectiveFrom: string) { return unwrap(await api.post('/accounting/payroll/current/activate', { verificationRunId, effectiveFrom, confirmTenantActivation: true })); }
export async function getPayrollActivationEvents(): Promise<PayrollActivationEvent[]> { return unwrap(await api.get('/accounting/payroll/current/activation-events')); }
export async function getPayrollAccountingSettings(): Promise<PayrollAccountingSettings | null> { return unwrap(await api.get('/accounting/payroll/current/accounting-settings')); }
export async function upsertPayrollAccountingSettings(payload: { salaryExpenseAccountId: number; employerStatutoryExpenseAccountId: number; salaryPayableAccountId: number; pph21PayableAccountId: number; bpjsPayableAccountId: number }) { return unwrap<PayrollAccountingSettings>(await api.put('/accounting/payroll/current/accounting-settings', payload)); }
export async function getPayrollMaterializations(): Promise<PayrollMaterialization[]> { return unwrap(await api.get('/accounting/payroll/current/official/materializations')); }
export async function getPayrollPostings(): Promise<PayrollPosting[]> { return unwrap(await api.get('/accounting/payroll/current/official/postings')); }
export async function materializePayroll(periodId: number, verificationRunId: number) { return unwrap(await api.post(`/accounting/payroll/current/periods/${periodId}/materialize`, { verificationRunId, confirmOfficialMaterialization: true })); }
export async function finalizePayrollOfficial(periodId: number) { return unwrap(await api.post(`/accounting/payroll/current/periods/${periodId}/finalize-official`, { confirmOfficialFinalization: true })); }
export async function getPayrollDetails(periodId: number): Promise<{ period: PayrollPeriod; details: PayrollDetail[]; totals: { totalGross: number; totalDeductions: number; totalNet: number; totalEmployerCost: number } }> { return unwrap(await api.get(`/accounting/payroll/periods/${periodId}/details`)); }
