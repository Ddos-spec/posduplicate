import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';
import {
  calculateNonFinalPayrollVerification,
  PayrollCurrentEngineError,
  PayrollEmployeeVerificationInput,
} from '../services/payroll-current-engine.p2';
import { PayrollRuleError, PPH21_BASE_RULESET } from '../services/payroll-current-law.p2';
import {
  JkkRiskLevel,
  PPU_STATUTORY_RULESET,
  StatutoryContributionError,
} from '../services/payroll-statutory.p2';
import {
  calculateFullYearFinalReconciliation,
  PayrollFinalReconciliationError,
} from '../services/payroll-final-reconciliation.p2';

const VERIFIED_PROFILE_CODE = 'ID-PAYROLL-2026';
const VERIFIED_PROFILE_VERSION = 2;

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const booleanInput = (value: unknown, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return fallback;
};

const errorResponse = (res: Response, error: unknown) => {
  if (
    error instanceof PayrollCurrentEngineError ||
    error instanceof PayrollRuleError ||
    error instanceof StatutoryContributionError ||
    error instanceof PayrollFinalReconciliationError
  ) {
    return res.status(409).json({ success: false, error: { code: error.code, message: error.message } });
  }
  return null;
};

const loadVerifiedProfile = async (tenantId: number, profileId: number, effectiveDate: Date) => {
  const date = effectiveDate.toISOString().slice(0, 10);
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT id, tenant_id, profile_code, version, country_code, effective_from, effective_to,
           status, tax_method, tax_rule_reference, configuration, source_references, notes
    FROM public.payroll_rate_profiles
    WHERE id = ${profileId}
      AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
      AND effective_from <= ${date}::date
      AND (effective_to IS NULL OR effective_to >= ${date}::date)
    LIMIT 1
  `);
  const profile = rows[0];
  if (!profile) return null;
  if (profile.profile_code !== VERIFIED_PROFILE_CODE || Number(profile.version) !== VERIFIED_PROFILE_VERSION) return 'unverified' as const;
  return profile;
};

const profileSnapshot = (profile: any) => ({
  id: Number(profile.id),
  code: profile.profile_code,
  version: Number(profile.version),
  statusAtCalculation: profile.status,
  effectiveFrom: profile.effective_from,
  effectiveTo: profile.effective_to,
  taxMethod: profile.tax_method,
  taxRuleReference: profile.tax_rule_reference,
  configuration: profile.configuration,
  sourceReferences: profile.source_references,
});

const buildEmployeeInput = (
  employee: any,
  settings: any,
  overtimeHours: number,
): PayrollEmployeeVerificationInput => ({
  employeeId: Number(employee.id),
  employeeCode: String(employee.employee_id),
  name: String(employee.name),
  nik: employee.nik,
  ptkpStatus: employee.ptkp_status,
  basicSalary: toNumber(employee.basic_salary),
  allowances: employee.allowances || {},
  overtimeHours,
  statutory: {
    fixedAllowanceMonthly: toNumber(settings.fixed_allowance_monthly),
    applicableHealthMinimumWage: settings.applicable_health_minimum_wage === null
      ? null
      : toNumber(settings.applicable_health_minimum_wage),
    bpjsEmploymentEnabled: Boolean(settings.bpjs_employment_enabled),
    bpjsHealthEnabled: Boolean(settings.bpjs_health_enabled),
    jkkRiskLevel: Number(settings.jkk_risk_level || employee.jkk_risk_level || 1) as JkkRiskLevel,
  },
  tax: {
    ptkpStatusYearStart: settings.ptkp_status_year_start || null,
    taxSubjectiveCase: settings.tax_subjective_case || 'unverified',
    zakatViaEmployerMonthly: toNumber(settings.zakat_via_employer_monthly),
  },
});

const loadEmployeeSettings = async (tenantId: number, employeeIds: number[]) => {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT tenant_id, employee_id, fixed_allowance_monthly, applicable_health_minimum_wage,
           bpjs_employment_enabled, bpjs_health_enabled, jkk_risk_level,
           ptkp_status_year_start, tax_subjective_case, zakat_via_employer_monthly
    FROM public.payroll_employee_statutory_settings
    WHERE tenant_id = ${tenantId} AND employee_id IN (${Prisma.join(employeeIds)})
  `);
  return new Map(rows.map((row) => [Number(row.employee_id), row]));
};

const loadOvertimeMap = async (tenantId: number, employeeIds: number[], start: Date, end: Date) => {
  const rows = await prisma.overtime.groupBy({
    by: ['employee_id'],
    where: {
      tenant_id: tenantId,
      employee_id: { in: employeeIds },
      date: { gte: start, lte: end },
    },
    _sum: { hours: true },
  });
  return new Map(rows.map((row) => [row.employee_id, Number(row._sum.hours || 0)]));
};

export const getPayrollStatutorySettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT e.id AS employee_id, e.employee_id AS employee_code, e.name, e.status,
             s.id AS setting_id, s.fixed_allowance_monthly, s.applicable_health_minimum_wage,
             s.bpjs_employment_enabled, s.bpjs_health_enabled,
             COALESCE(s.jkk_risk_level, e.jkk_risk_level, 1) AS jkk_risk_level,
             s.ptkp_status_year_start, s.tax_subjective_case, s.zakat_via_employer_monthly,
             s.updated_at
      FROM accounting.employees e
      LEFT JOIN public.payroll_employee_statutory_settings s
        ON s.tenant_id = e.tenant_id AND s.employee_id = e.id
      WHERE e.tenant_id = ${tenantId}
      ORDER BY e.employee_id ASC
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const upsertPayrollStatutorySetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId as number | undefined;
    const employeeId = Number(req.params.employeeId);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_EMPLOYEE_ID', message: 'Employee ID tidak valid' } });
    }

    const employee = await prisma.employees.findFirst({ where: { id: employeeId, tenant_id: tenantId } });
    if (!employee) {
      return res.status(404).json({ success: false, error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee tidak ditemukan pada tenant ini' } });
    }

    const fixedAllowanceMonthly = Number(req.body.fixedAllowanceMonthly ?? 0);
    const healthMinimumRaw = req.body.applicableHealthMinimumWage;
    const applicableHealthMinimumWage = healthMinimumRaw === undefined || healthMinimumRaw === null || healthMinimumRaw === ''
      ? null
      : Number(healthMinimumRaw);
    const jkkRiskLevel = req.body.jkkRiskLevel === undefined || req.body.jkkRiskLevel === null || req.body.jkkRiskLevel === ''
      ? Number(employee.jkk_risk_level || 1)
      : Number(req.body.jkkRiskLevel);
    const ptkpStatusYearStart = req.body.ptkpStatusYearStart === undefined || req.body.ptkpStatusYearStart === null || req.body.ptkpStatusYearStart === ''
      ? null
      : String(req.body.ptkpStatusYearStart).trim().toUpperCase();
    const taxSubjectiveCase = String(req.body.taxSubjectiveCase || 'unverified').trim();
    const zakatViaEmployerMonthly = Number(req.body.zakatViaEmployerMonthly ?? 0);

    if (!Number.isFinite(fixedAllowanceMonthly) || fixedAllowanceMonthly < 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_FIXED_ALLOWANCE', message: 'Fixed allowance harus angka non-negatif' } });
    }
    if (applicableHealthMinimumWage !== null && (!Number.isFinite(applicableHealthMinimumWage) || applicableHealthMinimumWage < 0)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_HEALTH_MINIMUM_WAGE', message: 'UMK/UMP harus angka non-negatif' } });
    }
    if (![1, 2, 3, 4, 5].includes(jkkRiskLevel)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_JKK_RISK_LEVEL', message: 'JKK risk level harus 1 sampai 5' } });
    }
    if (ptkpStatusYearStart !== null && !['TK/0','TK/1','TK/2','TK/3','K/0','K/1','K/2','K/3'].includes(ptkpStatusYearStart)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PTKP_YEAR_START', message: 'Status PTKP awal tahun tidak didukung' } });
    }
    if (!['unverified', 'full_year_same_employer'].includes(taxSubjectiveCase)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TAX_SUBJECTIVE_CASE', message: 'Tax subjective case belum didukung' } });
    }
    if (!Number.isFinite(zakatViaEmployerMonthly) || zakatViaEmployerMonthly < 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ZAKAT_AMOUNT', message: 'Zakat via employer harus angka non-negatif' } });
    }

    const bpjsEmploymentEnabled = booleanInput(req.body.bpjsEmploymentEnabled, false);
    const bpjsHealthEnabled = booleanInput(req.body.bpjsHealthEnabled, false);
    if (bpjsHealthEnabled && applicableHealthMinimumWage === null) {
      return res.status(409).json({
        success: false,
        error: { code: 'HEALTH_MINIMUM_WAGE_REQUIRED', message: 'UMK/UMP wajib diisi jika BPJS Kesehatan diaktifkan' },
      });
    }
    if (taxSubjectiveCase === 'full_year_same_employer' && ptkpStatusYearStart === null) {
      return res.status(409).json({
        success: false,
        error: { code: 'PTKP_YEAR_START_REQUIRED', message: 'PTKP awal tahun wajib diisi untuk full-year final reconciliation' },
      });
    }

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.payroll_employee_statutory_settings
        (tenant_id, employee_id, fixed_allowance_monthly, applicable_health_minimum_wage,
         bpjs_employment_enabled, bpjs_health_enabled, jkk_risk_level,
         ptkp_status_year_start, tax_subjective_case, zakat_via_employer_monthly,
         updated_by, updated_at)
      VALUES
        (${tenantId}, ${employeeId}, ${fixedAllowanceMonthly}, ${applicableHealthMinimumWage},
         ${bpjsEmploymentEnabled}, ${bpjsHealthEnabled}, ${jkkRiskLevel},
         ${ptkpStatusYearStart}, ${taxSubjectiveCase}, ${zakatViaEmployerMonthly},
         ${userId ?? null}, NOW())
      ON CONFLICT (tenant_id, employee_id)
      DO UPDATE SET
        fixed_allowance_monthly = EXCLUDED.fixed_allowance_monthly,
        applicable_health_minimum_wage = EXCLUDED.applicable_health_minimum_wage,
        bpjs_employment_enabled = EXCLUDED.bpjs_employment_enabled,
        bpjs_health_enabled = EXCLUDED.bpjs_health_enabled,
        jkk_risk_level = EXCLUDED.jkk_risk_level,
        ptkp_status_year_start = EXCLUDED.ptkp_status_year_start,
        tax_subjective_case = EXCLUDED.tax_subjective_case,
        zakat_via_employer_monthly = EXCLUDED.zakat_via_employer_monthly,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING *
    `);

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

export const getPayrollCalculationRuns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const periodId = req.query.periodId ? Number(req.query.periodId) : null;
    if (periodId !== null && (!Number.isInteger(periodId) || periodId <= 0)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PERIOD_ID', message: 'Period ID tidak valid' } });
    }
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, tenant_id, period_id, profile_id, profile_code, profile_version,
             run_mode, tax_period_kind, rules_snapshot, input_snapshot, output_snapshot,
             calculated_by, calculated_at
      FROM public.payroll_calculation_runs
      WHERE tenant_id = ${tenantId}
        AND (${periodId}::integer IS NULL OR period_id = ${periodId})
      ORDER BY calculated_at DESC, id DESC
      LIMIT 100
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const getPayrollActivationEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, tenant_id, source_profile_id, activated_profile_id, verification_run_id,
             effective_from, activated_by, payload, activated_at
      FROM public.payroll_profile_activation_events
      WHERE tenant_id = ${tenantId}
      ORDER BY activated_at DESC, id DESC
      LIMIT 100
    `);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    next(error);
  }
};

export const runPayrollCurrentVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId as number | undefined;
    const periodId = Number(req.params.periodId);
    const profileId = Number(req.body.profileId);

    if (!Number.isInteger(periodId) || periodId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PERIOD_ID', message: 'Period ID tidak valid' } });
    }
    if (!Number.isInteger(profileId) || profileId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'PROFILE_ID_REQUIRED', message: 'profileId current-law wajib diberikan secara eksplisit' } });
    }
    if (req.body.confirmNonFinalTaxPeriod !== true) {
      return res.status(409).json({
        success: false,
        error: { code: 'NON_FINAL_TAX_PERIOD_CONFIRMATION_REQUIRED', message: 'C1 hanya boleh dijalankan setelah caller mengonfirmasi ini bukan Masa Pajak Terakhir' },
      });
    }

    const period = await prisma.payroll_periods.findFirst({ where: { id: periodId, tenant_id: tenantId } });
    if (!period) {
      return res.status(404).json({ success: false, error: { code: 'PAYROLL_PERIOD_NOT_FOUND', message: 'Periode payroll tidak ditemukan' } });
    }
    if (period.status === 'finalized') {
      return res.status(409).json({ success: false, error: { code: 'PAYROLL_PERIOD_FINALIZED', message: 'Periode finalized tidak dapat dihitung ulang' } });
    }
    if (period.period_end.getUTCMonth() === 11) {
      return res.status(409).json({
        success: false,
        error: { code: 'FINAL_TAX_PERIOD_RECONCILIATION_REQUIRED', message: 'Periode Desember wajib memakai rekonsiliasi Masa Pajak Terakhir; C1 tidak boleh menghitungnya' },
      });
    }

    const profile = await loadVerifiedProfile(tenantId, profileId, period.period_end);
    if (!profile) {
      return res.status(404).json({ success: false, error: { code: 'PAYROLL_PROFILE_NOT_FOUND', message: 'Profile payroll tidak berlaku untuk tenant/periode ini' } });
    }
    if (profile === 'unverified') {
      return res.status(409).json({ success: false, error: { code: 'UNVERIFIED_PAYROLL_PROFILE', message: 'C1 hanya menerima verified profile ID-PAYROLL-2026 v2' } });
    }
    if (!['draft', 'active'].includes(profile.status)) {
      return res.status(409).json({ success: false, error: { code: 'PAYROLL_PROFILE_NOT_USABLE', message: 'Profile payroll tidak dapat dipakai untuk verification run' } });
    }

    const employees = await prisma.employees.findMany({
      where: { tenant_id: tenantId, status: 'active' },
      orderBy: { employee_id: 'asc' },
    });
    if (employees.length === 0) {
      return res.status(409).json({ success: false, error: { code: 'NO_ACTIVE_EMPLOYEES', message: 'Tidak ada employee aktif untuk diverifikasi' } });
    }

    const employeeIds = employees.map((employee) => employee.id);
    const settingsMap = await loadEmployeeSettings(tenantId, employeeIds);
    const overtimeMap = await loadOvertimeMap(tenantId, employeeIds, period.period_start, period.period_end);
    const employeeInputs: PayrollEmployeeVerificationInput[] = [];
    const employeeOutputs: any[] = [];

    for (const employee of employees) {
      const settings = settingsMap.get(employee.id);
      if (!settings) {
        return res.status(409).json({
          success: false,
          error: { code: 'EMPLOYEE_STATUTORY_SETTINGS_REQUIRED', message: `Statutory settings employee ${employee.employee_id} belum dikonfigurasi` },
        });
      }
      const input = buildEmployeeInput(employee, settings, overtimeMap.get(employee.id) || 0);
      employeeInputs.push(input);
      employeeOutputs.push(calculateNonFinalPayrollVerification(input));
    }

    const totals = employeeOutputs.reduce((acc, row) => ({
      cashGross: acc.cashGross + row.earnings.cashGross,
      monthlyTerGross: acc.monthlyTerGross + row.tax.monthlyTerGross,
      employeeStatutory: acc.employeeStatutory + row.deductions.employeeStatutory,
      pph21: acc.pph21 + row.deductions.pph21,
      netCashSalary: acc.netCashSalary + row.netCashSalary,
      employerCost: acc.employerCost + row.employerCost,
    }), { cashGross: 0, monthlyTerGross: 0, employeeStatutory: 0, pph21: 0, netCashSalary: 0, employerCost: 0 });

    const rulesSnapshot = {
      profile: profileSnapshot(profile),
      runtimeRulesets: { pph21: PPH21_BASE_RULESET, statutory: PPU_STATUTORY_RULESET },
    };
    const inputSnapshot = {
      period: { id: period.id, start: period.period_start, end: period.period_end, statusAtCalculation: period.status },
      confirmedNonFinalTaxPeriod: true,
      employees: employeeInputs,
    };
    const outputSnapshot = { employees: employeeOutputs, totals };

    const runRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.payroll_calculation_runs
        (tenant_id, period_id, profile_id, profile_code, profile_version, run_mode, tax_period_kind,
         rules_snapshot, input_snapshot, output_snapshot, calculated_by)
      VALUES
        (${tenantId}, ${periodId}, ${profileId}, ${profile.profile_code}, ${Number(profile.version)},
         'verification_preview', 'non_final',
         ${JSON.stringify(rulesSnapshot)}::jsonb,
         ${JSON.stringify(inputSnapshot)}::jsonb,
         ${JSON.stringify(outputSnapshot)}::jsonb,
         ${userId ?? null})
      RETURNING id, tenant_id, period_id, profile_id, profile_code, profile_version,
                run_mode, tax_period_kind, calculated_by, calculated_at
    `);

    res.status(201).json({
      success: true,
      data: {
        run: runRows[0],
        profile: rulesSnapshot.profile,
        payroll: employeeOutputs,
        totals,
        mutationStatus: 'VERIFICATION_ONLY_NO_PAYROLL_DETAILS_WRITTEN',
      },
    });
  } catch (error) {
    const handled = errorResponse(res, error);
    if (handled) return handled;
    next(error);
  }
};

export const runPayrollFinalVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId as number | undefined;
    const periodId = Number(req.params.periodId);
    const profileId = Number(req.body.profileId);
    const priorRunIds = Array.isArray(req.body.priorRunIds)
      ? req.body.priorRunIds.map((value: unknown) => Number(value))
      : [];

    if (!Number.isInteger(periodId) || periodId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PERIOD_ID', message: 'Period ID tidak valid' } });
    }
    if (!Number.isInteger(profileId) || profileId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'PROFILE_ID_REQUIRED', message: 'profileId current-law wajib diberikan' } });
    }
    if (req.body.confirmFullYearSameEmployer !== true) {
      return res.status(409).json({
        success: false,
        error: { code: 'FULL_YEAR_CASE_CONFIRMATION_REQUIRED', message: 'C2 saat ini hanya mendukung full-year same-employer dan membutuhkan konfirmasi eksplisit' },
      });
    }
    if (priorRunIds.length !== 11 || new Set(priorRunIds).size !== 11 || priorRunIds.some((id: number) => !Number.isInteger(id) || id <= 0)) {
      return res.status(409).json({
        success: false,
        error: { code: 'FULL_YEAR_PRIOR_RUNS_REQUIRED', message: 'Wajib memberikan 11 priorRunIds unik untuk Januari-November' },
      });
    }

    const period = await prisma.payroll_periods.findFirst({ where: { id: periodId, tenant_id: tenantId } });
    if (!period) {
      return res.status(404).json({ success: false, error: { code: 'PAYROLL_PERIOD_NOT_FOUND', message: 'Periode payroll tidak ditemukan' } });
    }
    if (period.status === 'finalized') {
      return res.status(409).json({ success: false, error: { code: 'PAYROLL_PERIOD_FINALIZED', message: 'Periode finalized tidak dapat diverifikasi ulang' } });
    }
    if (period.period_end.getUTCMonth() !== 11) {
      return res.status(409).json({ success: false, error: { code: 'DECEMBER_FINAL_PERIOD_REQUIRED', message: 'C2 full-year hanya mendukung Masa Pajak Terakhir Desember' } });
    }

    const year = period.period_end.getUTCFullYear();
    const profile = await loadVerifiedProfile(tenantId, profileId, period.period_end);
    if (!profile) {
      return res.status(404).json({ success: false, error: { code: 'PAYROLL_PROFILE_NOT_FOUND', message: 'Profile payroll tidak berlaku untuk periode ini' } });
    }
    if (profile === 'unverified') {
      return res.status(409).json({ success: false, error: { code: 'UNVERIFIED_PAYROLL_PROFILE', message: 'C2 hanya menerima ID-PAYROLL-2026 v2' } });
    }
    if (!['draft', 'active'].includes(profile.status)) {
      return res.status(409).json({ success: false, error: { code: 'PAYROLL_PROFILE_NOT_USABLE', message: 'Profile payroll tidak dapat dipakai' } });
    }

    const priorRuns = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT r.id, r.period_id, r.profile_id, r.profile_code, r.profile_version,
             r.tax_period_kind, r.input_snapshot, r.output_snapshot,
             p.period_start, p.period_end
      FROM public.payroll_calculation_runs r
      JOIN accounting.payroll_periods p ON p.id = r.period_id
      WHERE r.tenant_id = ${tenantId} AND r.id IN (${Prisma.join(priorRunIds)})
      ORDER BY p.period_end ASC, r.id ASC
    `);
    if (priorRuns.length !== 11) {
      return res.status(409).json({ success: false, error: { code: 'PRIOR_RUN_NOT_FOUND', message: 'Sebagian prior verification run tidak ditemukan pada tenant ini' } });
    }

    const observedMonths = new Set<number>();
    for (const run of priorRuns) {
      const runEnd = new Date(run.period_end);
      const month = runEnd.getUTCMonth();
      if (
        run.tax_period_kind !== 'non_final' ||
        Number(run.profile_id) !== profileId ||
        Number(run.profile_version) !== VERIFIED_PROFILE_VERSION ||
        runEnd.getUTCFullYear() !== year ||
        month < 0 || month > 10 || observedMonths.has(month)
      ) {
        return res.status(409).json({
          success: false,
          error: { code: 'INVALID_PRIOR_RUN_COVERAGE', message: 'Prior runs harus tepat satu run non-final per bulan Januari-November dengan profile yang sama' },
        });
      }
      observedMonths.add(month);
    }
    if (observedMonths.size !== 11) {
      return res.status(409).json({ success: false, error: { code: 'INCOMPLETE_PRIOR_MONTH_COVERAGE', message: 'Coverage Januari-November tidak lengkap' } });
    }

    const employees = await prisma.employees.findMany({
      where: { tenant_id: tenantId, status: 'active' },
      orderBy: { employee_id: 'asc' },
    });
    if (employees.length === 0) {
      return res.status(409).json({ success: false, error: { code: 'NO_ACTIVE_EMPLOYEES', message: 'Tidak ada employee aktif untuk final reconciliation' } });
    }

    const yearStart = new Date(Date.UTC(year, 0, 1));
    const employeeIds = employees.map((employee) => employee.id);
    const settingsMap = await loadEmployeeSettings(tenantId, employeeIds);
    const overtimeMap = await loadOvertimeMap(tenantId, employeeIds, period.period_start, period.period_end);
    const currentInputs: PayrollEmployeeVerificationInput[] = [];
    const employeeOutputs: any[] = [];

    for (const employee of employees) {
      const settings = settingsMap.get(employee.id);
      if (!settings) {
        return res.status(409).json({ success: false, error: { code: 'EMPLOYEE_STATUTORY_SETTINGS_REQUIRED', message: `Settings ${employee.employee_id} belum ada` } });
      }
      if (settings.tax_subjective_case !== 'full_year_same_employer') {
        return res.status(409).json({ success: false, error: { code: 'UNSUPPORTED_TAX_SUBJECTIVE_CASE', message: `Employee ${employee.employee_id} belum dikonfirmasi full-year same-employer` } });
      }
      if (!settings.ptkp_status_year_start) {
        return res.status(409).json({ success: false, error: { code: 'PTKP_YEAR_START_REQUIRED', message: `PTKP awal tahun ${employee.employee_id} belum dikonfigurasi` } });
      }
      if (!employee.join_date || employee.join_date.getTime() > yearStart.getTime()) {
        return res.status(409).json({
          success: false,
          error: { code: 'FULL_YEAR_EMPLOYMENT_NOT_PROVEN', message: `Join date ${employee.employee_id} tidak membuktikan bekerja sejak awal tahun` },
        });
      }

      const priorMonths = priorRuns.map((run) => {
        const outputs = Array.isArray(run.output_snapshot?.employees) ? run.output_snapshot.employees : [];
        const inputs = Array.isArray(run.input_snapshot?.employees) ? run.input_snapshot.employees : [];
        const output = outputs.find((row: any) => Number(row.employeeId) === employee.id);
        const input = inputs.find((row: any) => Number(row.employeeId) === employee.id);
        if (!output || !input) {
          throw new PayrollFinalReconciliationError(
            'EMPLOYEE_PRIOR_RUN_COVERAGE_REQUIRED',
            `Employee ${employee.employee_id} tidak terdapat pada seluruh prior run`,
          );
        }
        const priorTaxCase = input.tax?.taxSubjectiveCase || output.taxInput?.taxSubjectiveCase;
        const priorPtkp = input.tax?.ptkpStatusYearStart || output.taxInput?.ptkpStatusYearStart;
        if (priorTaxCase !== 'full_year_same_employer' || priorPtkp !== settings.ptkp_status_year_start) {
          throw new PayrollFinalReconciliationError(
            'PRIOR_TAX_SETTINGS_DRIFT',
            `Tax case/PTKP employee ${employee.employee_id} berubah di prior verification snapshots`,
          );
        }
        return {
          taxableGross: toNumber(output.tax?.monthlyTerGross),
          pph21Withheld: toNumber(output.deductions?.pph21),
          employeeJht: toNumber(output.statutory?.components?.jht?.employee),
          employeeJp: toNumber(output.statutory?.components?.jp?.employee),
          zakatViaEmployer: toNumber(input.tax?.zakatViaEmployerMonthly ?? output.taxInput?.zakatViaEmployerMonthly),
        };
      });

      const currentInput = buildEmployeeInput(employee, settings, overtimeMap.get(employee.id) || 0);
      currentInputs.push(currentInput);
      employeeOutputs.push(calculateFullYearFinalReconciliation({
        current: currentInput,
        priorMonths,
        ptkpStatusYearStart: settings.ptkp_status_year_start,
      }));
    }

    const totals = employeeOutputs.reduce((acc, row) => ({
      annualGross: acc.annualGross + row.annual.gross,
      annualTaxDue: acc.annualTaxDue + row.annual.taxDue,
      priorWithheld: acc.priorWithheld + row.annual.priorWithheld,
      withholdingDue: acc.withholdingDue + row.finalPeriod.withholdingDue,
      refundDue: acc.refundDue + row.finalPeriod.refundDue,
      netCashSalary: acc.netCashSalary + row.finalPeriod.netCashSalary,
      employerCost: acc.employerCost + row.finalPeriod.employerCost,
    }), { annualGross: 0, annualTaxDue: 0, priorWithheld: 0, withholdingDue: 0, refundDue: 0, netCashSalary: 0, employerCost: 0 });

    const rulesSnapshot = {
      profile: profileSnapshot(profile),
      runtimeRulesets: { pph21: PPH21_BASE_RULESET, statutory: PPU_STATUTORY_RULESET },
      finalPeriodPolicy: {
        supportedCase: 'full_year_same_employer',
        jobExpenseRate: 0.05,
        jobExpenseAnnualCap: 6000000,
        pkpRoundDown: 1000,
        priorWithholdingMechanism: 'ANNUAL_ARTICLE17_TAX_MINUS_NON_FINAL_WITHHOLDING',
      },
    };
    const inputSnapshot = {
      period: { id: period.id, start: period.period_start, end: period.period_end, statusAtCalculation: period.status },
      confirmedFullYearSameEmployer: true,
      priorRunIds,
      employees: currentInputs,
    };
    const outputSnapshot = { employees: employeeOutputs, totals };

    const runRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.payroll_calculation_runs
        (tenant_id, period_id, profile_id, profile_code, profile_version, run_mode, tax_period_kind,
         rules_snapshot, input_snapshot, output_snapshot, calculated_by)
      VALUES
        (${tenantId}, ${periodId}, ${profileId}, ${profile.profile_code}, ${Number(profile.version)},
         'verification_preview', 'final',
         ${JSON.stringify(rulesSnapshot)}::jsonb,
         ${JSON.stringify(inputSnapshot)}::jsonb,
         ${JSON.stringify(outputSnapshot)}::jsonb,
         ${userId ?? null})
      RETURNING id, tenant_id, period_id, profile_id, profile_code, profile_version,
                run_mode, tax_period_kind, calculated_by, calculated_at
    `);

    res.status(201).json({
      success: true,
      data: {
        run: runRows[0],
        profile: rulesSnapshot.profile,
        payroll: employeeOutputs,
        totals,
        mutationStatus: 'FINAL_VERIFICATION_ONLY_NO_PAYROLL_DETAILS_WRITTEN',
      },
    });
  } catch (error) {
    const handled = errorResponse(res, error);
    if (handled) return handled;
    next(error);
  }
};

export const activatePayrollProfileForTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId as number | undefined;
    const verificationRunId = Number(req.body.verificationRunId);
    const effectiveFromRaw = String(req.body.effectiveFrom || '');

    if (!Number.isInteger(verificationRunId) || verificationRunId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'FINAL_VERIFICATION_RUN_REQUIRED', message: 'verificationRunId final wajib diberikan' } });
    }
    if (req.body.confirmTenantActivation !== true) {
      return res.status(409).json({ success: false, error: { code: 'TENANT_ACTIVATION_CONFIRMATION_REQUIRED', message: 'Aktivasi tenant membutuhkan konfirmasi eksplisit' } });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFromRaw) || Number.isNaN(Date.parse(`${effectiveFromRaw}T00:00:00Z`))) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ACTIVATION_EFFECTIVE_DATE', message: 'effectiveFrom harus YYYY-MM-DD yang valid' } });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${tenantId}, 76001)`);

      const runRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT id, tenant_id, period_id, profile_id, profile_code, profile_version,
               tax_period_kind, output_snapshot, calculated_at
        FROM public.payroll_calculation_runs
        WHERE id = ${verificationRunId} AND tenant_id = ${tenantId}
        FOR UPDATE
      `);
      const run = runRows[0];
      if (!run || run.tax_period_kind !== 'final' || run.profile_code !== VERIFIED_PROFILE_CODE || Number(run.profile_version) !== VERIFIED_PROFILE_VERSION) {
        throw new PayrollFinalReconciliationError('VALID_FINAL_VERIFICATION_REQUIRED', 'Activation requires a valid tenant final verification run on profile v2');
      }

      const sourceRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.payroll_rate_profiles
        WHERE id = ${Number(run.profile_id)} AND profile_code = ${VERIFIED_PROFILE_CODE} AND version = ${VERIFIED_PROFILE_VERSION}
        FOR UPDATE
      `);
      const source = sourceRows[0];
      if (!source) throw new PayrollFinalReconciliationError('SOURCE_PROFILE_NOT_FOUND', 'Source profile v2 tidak ditemukan');
      if (effectiveFromRaw < new Date(source.effective_from).toISOString().slice(0, 10)) {
        throw new PayrollFinalReconciliationError('ACTIVATION_BEFORE_PROFILE_EFFECTIVE', 'effectiveFrom tidak boleh sebelum source profile berlaku');
      }

      const existingEvent = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT e.*, p.status AS profile_status
        FROM public.payroll_profile_activation_events e
        JOIN public.payroll_rate_profiles p ON p.id = e.activated_profile_id
        WHERE e.tenant_id = ${tenantId} AND e.verification_run_id = ${verificationRunId}
        LIMIT 1
      `);
      if (existingEvent[0]) return { activation: existingEvent[0], idempotent: true };

      await tx.$executeRaw(Prisma.sql`
        UPDATE public.payroll_rate_profiles
        SET status = 'retired', updated_at = NOW()
        WHERE tenant_id = ${tenantId} AND profile_code = ${VERIFIED_PROFILE_CODE} AND status = 'active'
      `);

      const tenantProfileRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM public.payroll_rate_profiles
        WHERE tenant_id = ${tenantId} AND profile_code = ${VERIFIED_PROFILE_CODE} AND version = ${VERIFIED_PROFILE_VERSION}
        FOR UPDATE
      `);

      let activatedProfile: any;
      if (tenantProfileRows[0]) {
        const updated = await tx.$queryRaw<any[]>(Prisma.sql`
          UPDATE public.payroll_rate_profiles
          SET country_code = ${source.country_code},
              effective_from = ${effectiveFromRaw}::date,
              effective_to = ${source.effective_to},
              status = 'active',
              tax_method = ${source.tax_method},
              tax_rule_reference = ${source.tax_rule_reference},
              configuration = ${JSON.stringify({
                ...(source.configuration || {}),
                tenantActivation: { verificationRunId, scope: 'verified-full-year-same-employer' },
              })}::jsonb,
              source_references = ${JSON.stringify(source.source_references || [])}::jsonb,
              notes = 'Tenant activation from verified final-period reconciliation run',
              updated_at = NOW()
          WHERE id = ${Number(tenantProfileRows[0].id)}
          RETURNING *
        `);
        activatedProfile = updated[0];
      } else {
        const inserted = await tx.$queryRaw<any[]>(Prisma.sql`
          INSERT INTO public.payroll_rate_profiles
            (tenant_id, profile_code, version, country_code, effective_from, effective_to,
             status, tax_method, tax_rule_reference, configuration, source_references, notes)
          VALUES
            (${tenantId}, ${VERIFIED_PROFILE_CODE}, ${VERIFIED_PROFILE_VERSION}, ${source.country_code},
             ${effectiveFromRaw}::date, ${source.effective_to}, 'active', ${source.tax_method},
             ${source.tax_rule_reference},
             ${JSON.stringify({
               ...(source.configuration || {}),
               tenantActivation: { verificationRunId, scope: 'verified-full-year-same-employer' },
             })}::jsonb,
             ${JSON.stringify(source.source_references || [])}::jsonb,
             'Tenant activation from verified final-period reconciliation run')
          RETURNING *
        `);
        activatedProfile = inserted[0];
      }

      const eventRows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.payroll_profile_activation_events
          (tenant_id, source_profile_id, activated_profile_id, verification_run_id,
           effective_from, activated_by, payload)
        VALUES
          (${tenantId}, ${Number(source.id)}, ${Number(activatedProfile.id)}, ${verificationRunId},
           ${effectiveFromRaw}::date, ${userId ?? null},
           ${JSON.stringify({
             sourceProfileCode: VERIFIED_PROFILE_CODE,
             sourceProfileVersion: VERIFIED_PROFILE_VERSION,
             verificationScope: 'FULL_YEAR_SAME_EMPLOYER_FINAL_TAX_PERIOD',
             officialLegacyMutationStillBlocked: true,
           })}::jsonb)
        RETURNING *
      `);
      return { activation: eventRows[0], profile: activatedProfile, idempotent: false };
    });

    res.status(result.idempotent ? 200 : 201).json({
      success: true,
      data: {
        ...result,
        safetyStatus: 'TENANT_PROFILE_ACTIVE_BUT_LEGACY_CALCULATE_FINALIZE_STILL_BLOCKED',
      },
    });
  } catch (error) {
    const handled = errorResponse(res, error);
    if (handled) return handled;
    next(error);
  }
};
