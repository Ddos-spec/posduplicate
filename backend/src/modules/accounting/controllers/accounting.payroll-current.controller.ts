import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';
import {
  calculateNonFinalPayrollVerification,
  PayrollCurrentEngineError,
} from '../services/payroll-current-engine.p2';
import { PayrollRuleError, PPH21_BASE_RULESET } from '../services/payroll-current-law.p2';
import {
  JkkRiskLevel,
  PPU_STATUTORY_RULESET,
  StatutoryContributionError,
} from '../services/payroll-statutory.p2';

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
    error instanceof StatutoryContributionError
  ) {
    return res.status(409).json({ success: false, error: { code: error.code, message: error.message } });
  }
  return null;
};

export const getPayrollStatutorySettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT e.id AS employee_id, e.employee_id AS employee_code, e.name, e.status,
             s.id AS setting_id, s.fixed_allowance_monthly, s.applicable_health_minimum_wage,
             s.bpjs_employment_enabled, s.bpjs_health_enabled,
             COALESCE(s.jkk_risk_level, e.jkk_risk_level, 1) AS jkk_risk_level,
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

    if (!Number.isFinite(fixedAllowanceMonthly) || fixedAllowanceMonthly < 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_FIXED_ALLOWANCE', message: 'Fixed allowance harus angka non-negatif' } });
    }
    if (applicableHealthMinimumWage !== null && (!Number.isFinite(applicableHealthMinimumWage) || applicableHealthMinimumWage < 0)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_HEALTH_MINIMUM_WAGE', message: 'UMK/UMP harus angka non-negatif' } });
    }
    if (![1, 2, 3, 4, 5].includes(jkkRiskLevel)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_JKK_RISK_LEVEL', message: 'JKK risk level harus 1 sampai 5' } });
    }

    const bpjsEmploymentEnabled = booleanInput(req.body.bpjsEmploymentEnabled, false);
    const bpjsHealthEnabled = booleanInput(req.body.bpjsHealthEnabled, false);
    if (bpjsHealthEnabled && applicableHealthMinimumWage === null) {
      return res.status(409).json({
        success: false,
        error: { code: 'HEALTH_MINIMUM_WAGE_REQUIRED', message: 'UMK/UMP wajib diisi jika BPJS Kesehatan diaktifkan' },
      });
    }

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.payroll_employee_statutory_settings
        (tenant_id, employee_id, fixed_allowance_monthly, applicable_health_minimum_wage,
         bpjs_employment_enabled, bpjs_health_enabled, jkk_risk_level, updated_by, updated_at)
      VALUES
        (${tenantId}, ${employeeId}, ${fixedAllowanceMonthly}, ${applicableHealthMinimumWage},
         ${bpjsEmploymentEnabled}, ${bpjsHealthEnabled}, ${jkkRiskLevel}, ${userId ?? null}, NOW())
      ON CONFLICT (tenant_id, employee_id)
      DO UPDATE SET
        fixed_allowance_monthly = EXCLUDED.fixed_allowance_monthly,
        applicable_health_minimum_wage = EXCLUDED.applicable_health_minimum_wage,
        bpjs_employment_enabled = EXCLUDED.bpjs_employment_enabled,
        bpjs_health_enabled = EXCLUDED.bpjs_health_enabled,
        jkk_risk_level = EXCLUDED.jkk_risk_level,
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

    const profileRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, tenant_id, profile_code, version, country_code, effective_from, effective_to,
             status, tax_method, tax_rule_reference, configuration, source_references, notes
      FROM public.payroll_rate_profiles
      WHERE id = ${profileId}
        AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
        AND effective_from <= ${period.period_end.toISOString().slice(0, 10)}::date
        AND (effective_to IS NULL OR effective_to >= ${period.period_end.toISOString().slice(0, 10)}::date)
      LIMIT 1
    `);
    const profile = profileRows[0];
    if (!profile) {
      return res.status(404).json({ success: false, error: { code: 'PAYROLL_PROFILE_NOT_FOUND', message: 'Profile payroll tidak berlaku untuk tenant/periode ini' } });
    }
    if (profile.profile_code !== 'ID-PAYROLL-2026' || Number(profile.version) !== 2) {
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
    const settingsRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT tenant_id, employee_id, fixed_allowance_monthly, applicable_health_minimum_wage,
             bpjs_employment_enabled, bpjs_health_enabled, jkk_risk_level
      FROM public.payroll_employee_statutory_settings
      WHERE tenant_id = ${tenantId} AND employee_id IN (${Prisma.join(employeeIds)})
    `);
    const settingsMap = new Map(settingsRows.map((row) => [Number(row.employee_id), row]));

    const overtimeRows = await prisma.overtime.groupBy({
      by: ['employee_id'],
      where: {
        tenant_id: tenantId,
        employee_id: { in: employeeIds },
        date: { gte: period.period_start, lte: period.period_end },
      },
      _sum: { hours: true },
    });
    const overtimeMap = new Map(overtimeRows.map((row) => [row.employee_id, Number(row._sum.hours || 0)]));

    const employeeInputs: any[] = [];
    const employeeOutputs: any[] = [];

    for (const employee of employees) {
      const settings = settingsMap.get(employee.id);
      if (!settings) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMPLOYEE_STATUTORY_SETTINGS_REQUIRED',
            message: `Statutory settings employee ${employee.employee_id} belum dikonfigurasi`,
          },
        });
      }

      const input = {
        employeeId: employee.id,
        employeeCode: employee.employee_id,
        name: employee.name,
        nik: employee.nik,
        ptkpStatus: employee.ptkp_status,
        basicSalary: toNumber(employee.basic_salary),
        allowances: employee.allowances || {},
        overtimeHours: overtimeMap.get(employee.id) || 0,
        statutory: {
          fixedAllowanceMonthly: toNumber(settings.fixed_allowance_monthly),
          applicableHealthMinimumWage: settings.applicable_health_minimum_wage === null
            ? null
            : toNumber(settings.applicable_health_minimum_wage),
          bpjsEmploymentEnabled: Boolean(settings.bpjs_employment_enabled),
          bpjsHealthEnabled: Boolean(settings.bpjs_health_enabled),
          jkkRiskLevel: Number(settings.jkk_risk_level || employee.jkk_risk_level || 1) as JkkRiskLevel,
        },
      };
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
      profile: {
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
      },
      runtimeRulesets: {
        pph21: PPH21_BASE_RULESET,
        statutory: PPU_STATUTORY_RULESET,
      },
    };
    const inputSnapshot = {
      period: {
        id: period.id,
        start: period.period_start,
        end: period.period_end,
        statusAtCalculation: period.status,
      },
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
