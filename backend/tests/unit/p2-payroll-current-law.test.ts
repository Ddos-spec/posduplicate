import {
  calculateBaseDailyTerPph21,
  calculateBaseMonthlyTerPph21,
  MONTHLY_TER_BRACKETS,
  PayrollRuleError,
  resolveMonthlyTerCategory,
} from '../../src/modules/accounting/services/payroll-current-law.p2';

describe('P2 payroll current-law PPh21 base rules', () => {
  test('monthly TER categories retain the official table cardinality', () => {
    expect(MONTHLY_TER_BRACKETS.A).toHaveLength(44);
    expect(MONTHLY_TER_BRACKETS.B).toHaveLength(40);
    expect(MONTHLY_TER_BRACKETS.C).toHaveLength(41);
  });

  test('PTKP maps only to supported official monthly TER categories', () => {
    expect(resolveMonthlyTerCategory('TK/0')).toBe('A');
    expect(resolveMonthlyTerCategory('K/0')).toBe('A');
    expect(resolveMonthlyTerCategory('TK/3')).toBe('B');
    expect(resolveMonthlyTerCategory('K/2')).toBe('B');
    expect(resolveMonthlyTerCategory('K/3')).toBe('C');
    expect(() => resolveMonthlyTerCategory('K/I/0')).toThrow(PayrollRuleError);
  });

  test('category A uses official boundaries where the legacy table had drifted', () => {
    expect(calculateBaseMonthlyTerPph21(30_050_000, 'TK/0').rate).toBe(0.12);
    expect(calculateBaseMonthlyTerPph21(30_050_001, 'TK/0').rate).toBe(0.13);
    expect(calculateBaseMonthlyTerPph21(43_850_000, 'TK/0').rate).toBe(0.16);
    expect(calculateBaseMonthlyTerPph21(43_850_001, 'TK/0').rate).toBe(0.17);
  });

  test('category B uses official 26m/27.7m boundaries', () => {
    expect(calculateBaseMonthlyTerPph21(26_000_000, 'TK/2').rate).toBe(0.09);
    expect(calculateBaseMonthlyTerPph21(26_000_001, 'TK/2').rate).toBe(0.10);
    expect(calculateBaseMonthlyTerPph21(27_700_000, 'K/1').rate).toBe(0.10);
    expect(calculateBaseMonthlyTerPph21(27_700_001, 'K/1').rate).toBe(0.11);
  });

  test('category C uses official 32.6m boundary', () => {
    expect(calculateBaseMonthlyTerPph21(32_600_000, 'K/3').rate).toBe(0.12);
    expect(calculateBaseMonthlyTerPph21(32_600_001, 'K/3').rate).toBe(0.13);
  });

  test('monthly TER applies directly to gross monthly income for non-final tax periods', () => {
    const result = calculateBaseMonthlyTerPph21(10_000_000, 'TK/0');
    expect(result.category).toBe('A');
    expect(result.rate).toBe(0.02);
    expect(result.basePph21).toBe(200_000);
    expect(result.scope).toBe('BASE_MONTHLY_TER_NON_FINAL_TAX_PERIOD');
  });

  test('top monthly bracket remains open ended at 34 percent', () => {
    expect(calculateBaseMonthlyTerPph21(2_000_000_000, 'TK/0').rate).toBe(0.34);
    expect(calculateBaseMonthlyTerPph21(2_000_000_000, 'TK/2').rate).toBe(0.34);
    expect(calculateBaseMonthlyTerPph21(2_000_000_000, 'K/3').rate).toBe(0.34);
  });

  test('daily TER stops at 2.5m and fails closed above the statutory TER limit', () => {
    expect(calculateBaseDailyTerPph21(450_000).rate).toBe(0);
    expect(calculateBaseDailyTerPph21(450_001).rate).toBe(0.005);
    expect(calculateBaseDailyTerPph21(2_500_000).rate).toBe(0.005);
    expect(() => calculateBaseDailyTerPph21(2_500_001)).toThrow(PayrollRuleError);
  });

  test('invalid income cannot silently enter a tax bracket', () => {
    expect(() => calculateBaseMonthlyTerPph21(-1, 'TK/0')).toThrow(PayrollRuleError);
    expect(() => calculateBaseMonthlyTerPph21(Number.NaN, 'TK/0')).toThrow(PayrollRuleError);
  });
});
