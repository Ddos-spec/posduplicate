import { ARTICLE_17_ANNUAL_BRACKETS, PPH21_BASE_RULESET } from './payroll-current-law.p2';
import {
  calculateMonthlyPayrollComponents,
  PayrollEmployeeVerificationInput,
} from './payroll-current-engine.p2';

export class PayrollFinalReconciliationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'PayrollFinalReconciliationError';
    this.code = code;
  }
}

export const PTKP_ANNUAL: Readonly<Record<string, number>> = Object.freeze({
  'TK/0': 54_000_000,
  'TK/1': 58_500_000,
  'TK/2': 63_000_000,
  'TK/3': 67_500_000,
  'K/0': 58_500_000,
  'K/1': 63_000_000,
  'K/2': 67_500_000,
  'K/3': 72_000_000,
});

export interface PriorNonFinalEmployeeMonth {
  taxableGross: number;
  pph21Withheld: number;
  employeeJht: number;
  employeeJp: number;
  zakatViaEmployer: number;
}

const assertNonNegative = (value: number, code: string, label: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new PayrollFinalReconciliationError(code, `${label} harus angka finite dan tidak negatif`);
  }
};

export const calculateProgressiveArticle17Tax = (taxableIncome: number) => {
  assertNonNegative(taxableIncome, 'INVALID_TAXABLE_INCOME', 'PKP');
  let remaining = taxableIncome;
  let lowerBound = 0;
  let tax = 0;
  const layers: Array<{ fromExclusive: number; toInclusive: number | null; taxable: number; rate: number; tax: number }> = [];

  for (const bracket of ARTICLE_17_ANNUAL_BRACKETS) {
    if (remaining <= 0) break;
    const upper = bracket.maxInclusive;
    const capacity = upper === null ? remaining : Math.max(0, upper - lowerBound);
    const taxable = Math.min(remaining, capacity);
    const layerTax = Math.round(taxable * bracket.rate);
    layers.push({ fromExclusive: lowerBound, toInclusive: upper, taxable, rate: bracket.rate, tax: layerTax });
    tax += layerTax;
    remaining -= taxable;
    if (upper !== null) lowerBound = upper;
  }

  return { taxableIncome, tax, layers };
};

/**
 * Full-year / same-employer final-period reconciliation only.
 * Unsupported mid-year subjective-tax or employer-transfer cases are rejected upstream.
 */
export const calculateFullYearFinalReconciliation = (args: {
  current: PayrollEmployeeVerificationInput;
  priorMonths: PriorNonFinalEmployeeMonth[];
  ptkpStatusYearStart: string;
}) => {
  if (args.priorMonths.length !== 11) {
    throw new PayrollFinalReconciliationError(
      'FULL_YEAR_PRIOR_MONTH_COVERAGE_REQUIRED',
      'Full-year reconciliation membutuhkan tepat 11 masa non-final sebelum Desember',
    );
  }

  const ptkpStatus = String(args.ptkpStatusYearStart || '').trim().toUpperCase();
  const ptkp = PTKP_ANNUAL[ptkpStatus];
  if (ptkp === undefined) {
    throw new PayrollFinalReconciliationError('UNSUPPORTED_FINAL_PTKP_STATUS', `Status PTKP ${ptkpStatus || '(kosong)'} tidak didukung`);
  }

  const current = calculateMonthlyPayrollComponents(args.current);
  const prior = args.priorMonths.map((month, index) => {
    assertNonNegative(month.taxableGross, 'INVALID_PRIOR_TAXABLE_GROSS', `Prior taxable gross month ${index + 1}`);
    assertNonNegative(month.pph21Withheld, 'INVALID_PRIOR_WITHHOLDING', `Prior withholding month ${index + 1}`);
    assertNonNegative(month.employeeJht, 'INVALID_PRIOR_JHT', `Prior employee JHT month ${index + 1}`);
    assertNonNegative(month.employeeJp, 'INVALID_PRIOR_JP', `Prior employee JP month ${index + 1}`);
    assertNonNegative(month.zakatViaEmployer, 'INVALID_PRIOR_ZAKAT', `Prior zakat month ${index + 1}`);
    return month;
  });

  const annualGross = prior.reduce((sum, month) => sum + month.taxableGross, 0) + current.taxComponents.taxableGross;
  const annualEmployeeJht = prior.reduce((sum, month) => sum + month.employeeJht, 0) + current.statutory.components.jht.employee;
  const annualEmployeeJp = prior.reduce((sum, month) => sum + month.employeeJp, 0) + current.statutory.components.jp.employee;
  const annualZakat = prior.reduce((sum, month) => sum + month.zakatViaEmployer, 0) + current.taxComponents.zakatViaEmployerMonthly;
  const jobExpense = Math.min(Math.round(annualGross * 0.05), 6_000_000);
  const annualNet = Math.max(0, annualGross - jobExpense - annualEmployeeJht - annualEmployeeJp - annualZakat);
  const rawPkp = Math.max(0, annualNet - ptkp);
  const taxableIncome = Math.floor(rawPkp / 1_000) * 1_000;
  const article17 = calculateProgressiveArticle17Tax(taxableIncome);
  const priorWithheld = prior.reduce((sum, month) => sum + month.pph21Withheld, 0);
  const finalWithholdingSigned = article17.tax - priorWithheld;
  const withholdingDue = Math.max(0, finalWithholdingSigned);
  const refundDue = Math.max(0, -finalWithholdingSigned);
  const employeeStatutory = current.statutory.employeeTotal;
  const currentNetCashSalary = current.earnings.cashGross - employeeStatutory - finalWithholdingSigned;

  return {
    employeeId: args.current.employeeId,
    employeeCode: args.current.employeeCode,
    name: args.current.name,
    ptkpStatusYearStart: ptkpStatus,
    annual: {
      gross: annualGross,
      jobExpense,
      employeeJht: annualEmployeeJht,
      employeeJp: annualEmployeeJp,
      zakatViaEmployer: annualZakat,
      net: annualNet,
      ptkp,
      taxableIncome,
      article17,
      taxDue: article17.tax,
      priorWithheld,
    },
    finalPeriod: {
      cashGross: current.earnings.cashGross,
      employeeStatutory,
      finalWithholdingSigned,
      withholdingDue,
      refundDue,
      netCashSalary: currentNetCashSalary,
      employerCost: current.employerCost,
    },
    currentMonthComponents: current,
    rulesetId: PPH21_BASE_RULESET.id,
    scope: 'FULL_YEAR_SAME_EMPLOYER_FINAL_TAX_PERIOD' as const,
  };
};
