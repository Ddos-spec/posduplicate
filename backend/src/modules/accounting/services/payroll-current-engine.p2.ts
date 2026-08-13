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
  tax?: {
    ptkpStatusYearStart?: string | null;
    taxSubjectiveCase?: string | null;
    zakatViaEmployerMonthly?: number;
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
 * Tax-independent monthly components shared by non-final TER and final-period reconciliation.
 * Overtime remains fail-closed until a separately verified compensation policy is wired.
 */
export const calculateMonthlyPayrollComponents = (input: PayrollEmployeeVerificationInput) => {
  if (!input.nik?.trim()) {
    throw new PayrollCurrentEngineError(
      'EMPLOYEE_NIK_REQUIRED_FOR_VERIFICATION',
      `NIK employee ${input.employeeCode} wajib tersedia sebelum current-law payroll verification`,
    );
  }

  assertMoney(input.basicSalary, 'INVALID_BASIC_SALARY', 'Basic salary');
  assertMoney(input.statutory.fixedAllowanceMonthly, 'INVALID_FIXED_ALLOWANCE', 'Fixed allowance');
  const zakatViaEmployerMonthly = Number(input.tax?.zakatViaEmployerMonthly || 0);
  assertMoney(zakatViaEmployerMonthly, 'INVALID_ZAKAT_AMOUNT', 'Zakat via employer');

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
  const taxableGross = cashGross + taxableEmployerBenefits;
  const employeePensionOldAgeDeduction =
    statutory.components.jht.employee + statutory.components.jp.employee;

  return {
    employeeId: input.employeeId,
    employeeCode: input.employeeCode,
    name: input.name,
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
    taxComponents: {
      taxableEmployerBenefits,
      taxableGross,
      employeePensionOldAgeDeduction,
      zakatViaEmployerMonthly,
    },
    employerCost: cashGross + statutory.employerTotal,
  };
};

/**
 * Verification engine for active, ongoing employees in a NON-FINAL tax period.
 * TER gross includes employer-paid JKK, JKM and health contributions; employer JHT/JP
 * are excluded from taxable gross. This function never mutates official payroll details.
 */
export const calculateNonFinalPayrollVerification = (input: PayrollEmployeeVerificationInput) => {
  const components = calculateMonthlyPayrollComponents(input);
  const ptkpStatus = input.tax?.ptkpStatusYearStart || input.ptkpStatus || 'TK/0';
  const pph21 = calculateBaseMonthlyTerPph21(components.taxComponents.taxableGross, ptkpStatus);

  const employeeStatutoryDeduction = components.statutory.employeeTotal;
  const totalDeductions = employeeStatutoryDeduction + pph21.basePph21;
  const netCashSalary = components.earnings.cashGross - totalDeductions;

  return {
    employeeId: input.employeeId,
    employeeCode: input.employeeCode,
    name: input.name,
    ptkpStatus,
    earnings: components.earnings,
    statutory: components.statutory,
    tax: {
      taxableEmployerBenefits: components.taxComponents.taxableEmployerBenefits,
      monthlyTerGross: components.taxComponents.taxableGross,
      pph21,
    },
    taxInput: {
      ptkpStatusYearStart: input.tax?.ptkpStatusYearStart || null,
      taxSubjectiveCase: input.tax?.taxSubjectiveCase || 'unverified',
      zakatViaEmployerMonthly: components.taxComponents.zakatViaEmployerMonthly,
    },
    deductions: {
      employeeStatutory: employeeStatutoryDeduction,
      pph21: pph21.basePph21,
      total: totalDeductions,
    },
    netCashSalary,
    employerCost: components.employerCost,
    rulesets: {
      pph21: PPH21_BASE_RULESET.id,
      statutory: PPU_STATUTORY_RULESET.id,
    },
    scope: 'VERIFICATION_NON_FINAL_TAX_PERIOD' as const,
  };
};
