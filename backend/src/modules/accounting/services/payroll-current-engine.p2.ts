import { calculateBaseMonthlyTerPph21, PPH21_BASE_RULESET } from './payroll-current-law.p2';
import {
  calculatePpuStatutoryContributions,
  JkkRiskLevel,
  PPU_STATUTORY_RULESET,
} from './payroll-statutory.p2';

export class PayrollCurrentEngineError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'PayrollCurrentEngineError';
    this.code = code;
  }
}

export interface PayrollEmployeeVerificationInput {
  employeeId: number;
  employeeCode: string;
  name: string;
  nik?: string | null;
  ptkpStatus?: string | null;
  basicSalary: number;
  allowances?: unknown;
  overtimeHours?: number;
  statutory: {
    fixedAllowanceMonthly: number;
    applicableHealthMinimumWage?: number | null;
    bpjsEmploymentEnabled: boolean;
    bpjsHealthEnabled: boolean;
    jkkRiskLevel: JkkRiskLevel;
  };
}

const assertMoney = (value: number, code: string, label: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new PayrollCurrentEngineError(code, `${label} harus berupa angka finite dan tidak negatif`);
  }
};

export const sumPayrollAllowances = (allowances: unknown): number => {
  if (allowances === null || allowances === undefined) return 0;
  if (typeof allowances !== 'object' || Array.isArray(allowances)) {
    throw new PayrollCurrentEngineError('INVALID_ALLOWANCE_PAYLOAD', 'Allowance payroll harus berupa object key/value');
  }

  return Object.entries(allowances as Record<string, unknown>).reduce((total, [key, raw]) => {
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      throw new PayrollCurrentEngineError('INVALID_ALLOWANCE_AMOUNT', `Allowance ${key} harus berupa angka finite dan tidak negatif`);
    }
    return total + value;
  }, 0);
};

/**
 * Verification engine for active, ongoing employees in a NON-FINAL tax period.
 *
 * Tax gross follows PMK 168/2023 for permanent employees: cash earnings plus
 * employer-paid JKK, JKM and health-insurance contributions. Employer JHT/JP are
 * intentionally excluded from TER gross because pension/old-age contributions
 * paid by the employer are excluded from PPh 21 income under PMK 168/2023.
 *
 * Overtime remuneration itself remains a compensation-policy concern. Until a
 * verified overtime compensation policy is wired, any non-zero overtime hours
 * fail closed rather than reusing the legacy 1.5x shortcut.
 */
export const calculateNonFinalPayrollVerification = (input: PayrollEmployeeVerificationInput) => {
  if (!input.nik?.trim()) {
    throw new PayrollCurrentEngineError(
      'EMPLOYEE_NIK_REQUIRED_FOR_VERIFICATION',
      `NIK employee ${input.employeeCode} wajib tersedia sebelum current-law payroll verification`,
    );
  }

  assertMoney(input.basicSalary, 'INVALID_BASIC_SALARY', 'Basic salary');
  assertMoney(input.statutory.fixedAllowanceMonthly, 'INVALID_FIXED_ALLOWANCE', 'Fixed allowance');

  const overtimeHours = Number(input.overtimeHours || 0);
  assertMoney(overtimeHours, 'INVALID_OVERTIME_HOURS', 'Overtime hours');
  if (overtimeHours > 0) {
    throw new PayrollCurrentEngineError(
      'OVERTIME_COMPENSATION_POLICY_NOT_WIRED',
      'Periode memiliki overtime; current payroll tidak boleh memakai rumus overtime legacy sebelum compensation policy terverifikasi',
    );
  }

  const totalAllowance = sumPayrollAllowances(input.allowances);
  const cashGross = input.basicSalary + totalAllowance;
  const reportedFixedWage = input.basicSalary + input.statutory.fixedAllowanceMonthly;

  const statutory = calculatePpuStatutoryContributions({
    reportedFixedWage,
    jkkRiskLevel: input.statutory.jkkRiskLevel,
    bpjsEmploymentEnabled: input.statutory.bpjsEmploymentEnabled,
    bpjsHealthEnabled: input.statutory.bpjsHealthEnabled,
    applicableHealthMinimumWage: input.statutory.applicableHealthMinimumWage ?? undefined,
  });

  const taxableEmployerBenefits =
    statutory.components.jkk.employer +
    statutory.components.jkm.employer +
    statutory.components.health.employer;

  const monthlyTerGross = cashGross + taxableEmployerBenefits;
  const pph21 = calculateBaseMonthlyTerPph21(monthlyTerGross, input.ptkpStatus || 'TK/0');

  const employeeStatutoryDeduction = statutory.employeeTotal;
  const totalDeductions = employeeStatutoryDeduction + pph21.basePph21;
  const netCashSalary = cashGross - totalDeductions;
  const employerCost = cashGross + statutory.employerTotal;

  return {
    employeeId: input.employeeId,
    employeeCode: input.employeeCode,
    name: input.name,
    ptkpStatus: input.ptkpStatus || 'TK/0',
    earnings: {
      basicSalary: input.basicSalary,
      totalAllowance,
      overtimeHours,
      overtimePay: 0,
      cashGross,
    },
    statutory: {
      ...statutory,
      fixedAllowanceMonthly: input.statutory.fixedAllowanceMonthly,
    },
    tax: {
      taxableEmployerBenefits,
      monthlyTerGross,
      pph21,
    },
    deductions: {
      employeeStatutory: employeeStatutoryDeduction,
      pph21: pph21.basePph21,
      total: totalDeductions,
    },
    netCashSalary,
    employerCost,
    rulesets: {
      pph21: PPH21_BASE_RULESET.id,
      statutory: PPU_STATUTORY_RULESET.id,
    },
    scope: 'VERIFICATION_NON_FINAL_TAX_PERIOD' as const,
  };
};
