import {
  buildOfficialPayrollTotals,
  normalizeOfficialPayrollOutput,
  PayrollOfficialPostingError,
} from '../../src/modules/accounting/services/payroll-official-posting.p2';

const statutory = {
  components: {
    health: { employer: 400_000, employee: 100_000 },
    jkk: { employer: 24_000, employee: 0 },
    jkm: { employer: 30_000, employee: 0 },
    jht: { employer: 370_000, employee: 200_000 },
    jp: { employer: 200_000, employee: 100_000 },
  },
  employeeTotal: 400_000,
  employerTotal: 1_024_000,
};

const earnings = {
  basicSalary: 10_000_000,
  totalAllowance: 1_000_000,
  overtimeHours: 0,
  overtimePay: 0,
  cashGross: 11_000_000,
};

describe('Payroll-C3 official posting mapper', () => {
  test('maps non-final verified output and produces a balanced accrual journal summary', () => {
    const rows = normalizeOfficialPayrollOutput({
      employees: [{
        employeeId: 11,
        earnings,
        statutory,
        taxInput: { zakatViaEmployerMonthly: 0 },
        deductions: { employeeStatutory: 400_000, pph21: 300_000, total: 700_000 },
        netCashSalary: 10_300_000,
        employerCost: 12_024_000,
      }],
    }, 'non_final');

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      employeeId: 11,
      grossSalary: 11_000_000,
      pph21: 300_000,
      pph21Refund: 0,
      totalDeductions: 700_000,
      netSalary: 10_300_000,
      employeeStatutory: 400_000,
      employerStatutory: 1_024_000,
    });

    const totals = buildOfficialPayrollTotals(rows);
    expect(totals.totalDebit).toBe(12_024_000);
    expect(totals.totalCredit).toBe(12_024_000);
  });

  test('maps final-period over-withholding as a separate refund debit and stays balanced', () => {
    const rows = normalizeOfficialPayrollOutput({
      employees: [{
        employeeId: 11,
        currentMonthComponents: {
          earnings,
          statutory,
          taxComponents: { zakatViaEmployerMonthly: 0 },
        },
        finalPeriod: {
          finalWithholdingSigned: -100_000,
          withholdingDue: 0,
          refundDue: 100_000,
          netCashSalary: 10_700_000,
          employerCost: 12_024_000,
        },
      }],
    }, 'final');

    expect(rows[0].pph21).toBe(0);
    expect(rows[0].pph21Refund).toBe(100_000);
    expect(rows[0].totalDeductions).toBe(300_000);
    expect(rows[0].netSalary).toBe(10_700_000);

    const totals = buildOfficialPayrollTotals(rows);
    expect(totals.pph21Refund).toBe(100_000);
    expect(totals.totalDebit).toBe(12_124_000);
    expect(totals.totalCredit).toBe(12_124_000);
  });

  test('official materialization fails closed when overtime compensation is not wired', () => {
    expect(() => normalizeOfficialPayrollOutput({
      employees: [{
        employeeId: 11,
        earnings: { ...earnings, overtimeHours: 2 },
        statutory,
        taxInput: { zakatViaEmployerMonthly: 0 },
        deductions: { employeeStatutory: 400_000, pph21: 300_000, total: 700_000 },
        netCashSalary: 10_300_000,
        employerCost: 12_024_000,
      }],
    }, 'non_final')).toThrow(expect.objectContaining<Partial<PayrollOfficialPostingError>>({
      code: 'OFFICIAL_OVERTIME_POLICY_NOT_WIRED',
    }));
  });

  test('official materialization fails closed when zakat cash settlement is not wired', () => {
    expect(() => normalizeOfficialPayrollOutput({
      employees: [{
        employeeId: 11,
        earnings,
        statutory,
        taxInput: { zakatViaEmployerMonthly: 50_000 },
        deductions: { employeeStatutory: 400_000, pph21: 300_000, total: 700_000 },
        netCashSalary: 10_300_000,
        employerCost: 12_024_000,
      }],
    }, 'non_final')).toThrow(expect.objectContaining<Partial<PayrollOfficialPostingError>>({
      code: 'OFFICIAL_ZAKAT_SETTLEMENT_NOT_WIRED',
    }));
  });
});
