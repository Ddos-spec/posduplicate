import {
  calculateFullYearFinalReconciliation,
  calculateProgressiveArticle17Tax,
  PayrollFinalReconciliationError,
} from '../../src/modules/accounting/services/payroll-final-reconciliation.p2';

const currentEmployee = () => ({
  employeeId: 1,
  employeeCode: 'EMP-001',
  name: 'Employee One',
  nik: '3174000000000001',
  ptkpStatus: 'TK/0',
  basicSalary: 10_000_000,
  allowances: {},
  overtimeHours: 0,
  statutory: {
    fixedAllowanceMonthly: 0,
    bpjsEmploymentEnabled: false,
    bpjsHealthEnabled: false,
    jkkRiskLevel: 1 as const,
  },
  tax: {
    ptkpStatusYearStart: 'TK/0',
    taxSubjectiveCase: 'full_year_same_employer',
    zakatViaEmployerMonthly: 0,
  },
});

const priorMonths = (pph21Withheld: number) => Array.from({ length: 11 }, () => ({
  taxableGross: 10_000_000,
  pph21Withheld,
  employeeJht: 0,
  employeeJp: 0,
  zakatViaEmployer: 0,
}));

describe('Payroll-C2 final PPh21 reconciliation', () => {
  test('full-year TK/0 reconciles Article 17 tax against Jan-Nov withholding', () => {
    const result = calculateFullYearFinalReconciliation({
      current: currentEmployee(),
      priorMonths: priorMonths(200_000),
      ptkpStatusYearStart: 'TK/0',
    });

    expect(result.annual.gross).toBe(120_000_000);
    expect(result.annual.jobExpense).toBe(6_000_000);
    expect(result.annual.net).toBe(114_000_000);
    expect(result.annual.ptkp).toBe(54_000_000);
    expect(result.annual.taxableIncome).toBe(60_000_000);
    expect(result.annual.taxDue).toBe(3_000_000);
    expect(result.annual.priorWithheld).toBe(2_200_000);
    expect(result.finalPeriod.finalWithholdingSigned).toBe(800_000);
    expect(result.finalPeriod.withholdingDue).toBe(800_000);
    expect(result.finalPeriod.refundDue).toBe(0);
    expect(result.finalPeriod.netCashSalary).toBe(9_200_000);
  });

  test('over-withholding produces an employee refund instead of negative tax being discarded', () => {
    const result = calculateFullYearFinalReconciliation({
      current: currentEmployee(),
      priorMonths: priorMonths(500_000),
      ptkpStatusYearStart: 'TK/0',
    });

    expect(result.annual.taxDue).toBe(3_000_000);
    expect(result.annual.priorWithheld).toBe(5_500_000);
    expect(result.finalPeriod.finalWithholdingSigned).toBe(-2_500_000);
    expect(result.finalPeriod.withholdingDue).toBe(0);
    expect(result.finalPeriod.refundDue).toBe(2_500_000);
    expect(result.finalPeriod.netCashSalary).toBe(12_500_000);
  });

  test('Article 17 calculation is progressive, not a flat top-bracket rate', () => {
    const result = calculateProgressiveArticle17Tax(300_000_000);
    expect(result.tax).toBe(44_000_000);
    expect(result.layers.map((layer) => layer.tax)).toEqual([3_000_000, 28_500_000, 12_500_000]);
  });

  test('PKP is rounded down to full thousands before Article 17', () => {
    const current = currentEmployee();
    current.basicSalary = 10_000_999;
    const result = calculateFullYearFinalReconciliation({
      current,
      priorMonths: priorMonths(200_000),
      ptkpStatusYearStart: 'TK/0',
    });

    expect(result.annual.taxableIncome % 1000).toBe(0);
    expect(result.annual.taxableIncome).toBeLessThanOrEqual(
      result.annual.net - result.annual.ptkp,
    );
  });

  test('final reconciliation refuses incomplete prior-month coverage', () => {
    expect(() => calculateFullYearFinalReconciliation({
      current: currentEmployee(),
      priorMonths: priorMonths(200_000).slice(0, 10),
      ptkpStatusYearStart: 'TK/0',
    })).toThrow(expect.objectContaining({ code: 'FULL_YEAR_PRIOR_MONTH_COVERAGE_REQUIRED' }));
  });

  test('unsupported PTKP fails closed', () => {
    expect(() => calculateFullYearFinalReconciliation({
      current: currentEmployee(),
      priorMonths: priorMonths(200_000),
      ptkpStatusYearStart: 'K/I/0',
    })).toThrow(PayrollFinalReconciliationError);
  });
});
