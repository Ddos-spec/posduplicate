export class PayrollOfficialPostingError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'PayrollOfficialPostingError';
    this.code = code;
  }
}

export interface OfficialPayrollDetailRow {
  employeeId: number;
  basicSalary: number;
  totalAllowance: number;
  overtimeHours: number;
  overtimePay: number;
  grossSalary: number;
  bpjsKesEmployer: number;
  bpjsKesEmployee: number;
  jkk: number;
  jkm: number;
  jhtEmployer: number;
  jhtEmployee: number;
  jpEmployer: number;
  jpEmployee: number;
  pph21: number;
  pph21Refund: number;
  totalDeductions: number;
  netSalary: number;
  employerCost: number;
  employeeStatutory: number;
  employerStatutory: number;
}

const money = (value: unknown, code: string, label: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new PayrollOfficialPostingError(code, `${label} harus angka finite`);
  }
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
};

const nonNegative = (value: unknown, code: string, label: string) => {
  const parsed = money(value, code, label);
  if (parsed < 0) throw new PayrollOfficialPostingError(code, `${label} tidak boleh negatif`);
  return parsed;
};

const assertClose = (left: number, right: number, code: string, label: string) => {
  if (Math.abs(left - right) > 0.01) {
    throw new PayrollOfficialPostingError(code, `${label} tidak konsisten (${left} vs ${right})`);
  }
};

const statutoryFrom = (statutory: any) => {
  if (!statutory?.components) {
    throw new PayrollOfficialPostingError('OFFICIAL_STATUTORY_SNAPSHOT_MISSING', 'Snapshot statutory employee tidak lengkap');
  }
  const healthEmployer = nonNegative(statutory.components.health?.employer, 'INVALID_HEALTH_EMPLOYER', 'BPJS Kesehatan employer');
  const healthEmployee = nonNegative(statutory.components.health?.employee, 'INVALID_HEALTH_EMPLOYEE', 'BPJS Kesehatan employee');
  const jkk = nonNegative(statutory.components.jkk?.employer, 'INVALID_JKK_EMPLOYER', 'JKK employer');
  const jkm = nonNegative(statutory.components.jkm?.employer, 'INVALID_JKM_EMPLOYER', 'JKM employer');
  const jhtEmployer = nonNegative(statutory.components.jht?.employer, 'INVALID_JHT_EMPLOYER', 'JHT employer');
  const jhtEmployee = nonNegative(statutory.components.jht?.employee, 'INVALID_JHT_EMPLOYEE', 'JHT employee');
  const jpEmployer = nonNegative(statutory.components.jp?.employer, 'INVALID_JP_EMPLOYER', 'JP employer');
  const jpEmployee = nonNegative(statutory.components.jp?.employee, 'INVALID_JP_EMPLOYEE', 'JP employee');
  const employeeStatutory = Math.round((healthEmployee + jhtEmployee + jpEmployee) * 100) / 100;
  const employerStatutory = Math.round((healthEmployer + jkk + jkm + jhtEmployer + jpEmployer) * 100) / 100;
  assertClose(employeeStatutory, nonNegative(statutory.employeeTotal, 'INVALID_EMPLOYEE_STATUTORY_TOTAL', 'Employee statutory total'), 'EMPLOYEE_STATUTORY_TOTAL_MISMATCH', 'Employee statutory total');
  assertClose(employerStatutory, nonNegative(statutory.employerTotal, 'INVALID_EMPLOYER_STATUTORY_TOTAL', 'Employer statutory total'), 'EMPLOYER_STATUTORY_TOTAL_MISMATCH', 'Employer statutory total');
  return {
    healthEmployer,
    healthEmployee,
    jkk,
    jkm,
    jhtEmployer,
    jhtEmployee,
    jpEmployer,
    jpEmployee,
    employeeStatutory,
    employerStatutory,
  };
};

const baseEarnings = (earnings: any) => {
  if (!earnings) throw new PayrollOfficialPostingError('OFFICIAL_EARNINGS_SNAPSHOT_MISSING', 'Snapshot earnings employee tidak lengkap');
  const basicSalary = nonNegative(earnings.basicSalary, 'INVALID_BASIC_SALARY', 'Basic salary');
  const totalAllowance = nonNegative(earnings.totalAllowance, 'INVALID_TOTAL_ALLOWANCE', 'Total allowance');
  const overtimeHours = nonNegative(earnings.overtimeHours, 'INVALID_OVERTIME_HOURS', 'Overtime hours');
  const overtimePay = nonNegative(earnings.overtimePay, 'INVALID_OVERTIME_PAY', 'Overtime pay');
  if (overtimeHours > 0 || overtimePay > 0) {
    throw new PayrollOfficialPostingError(
      'OFFICIAL_OVERTIME_POLICY_NOT_WIRED',
      'Official payroll belum boleh mematerialisasi overtime sampai compensation policy terverifikasi',
    );
  }
  const grossSalary = nonNegative(earnings.cashGross, 'INVALID_CASH_GROSS', 'Cash gross');
  assertClose(grossSalary, basicSalary + totalAllowance + overtimePay, 'CASH_GROSS_MISMATCH', 'Cash gross');
  return { basicSalary, totalAllowance, overtimeHours, overtimePay, grossSalary };
};

const assertNoUnsupportedZakat = (value: unknown) => {
  const zakat = nonNegative(value || 0, 'INVALID_ZAKAT_AMOUNT', 'Zakat via employer');
  if (zakat > 0) {
    throw new PayrollOfficialPostingError(
      'OFFICIAL_ZAKAT_SETTLEMENT_NOT_WIRED',
      'Official payroll belum mematerialisasi zakat via employer sampai cash-settlement account mapping tersedia',
    );
  }
};

export const normalizeOfficialPayrollOutput = (
  outputSnapshot: any,
  taxPeriodKind: 'non_final' | 'final',
): OfficialPayrollDetailRow[] => {
  const employees = outputSnapshot?.employees;
  if (!Array.isArray(employees) || employees.length === 0) {
    throw new PayrollOfficialPostingError('OFFICIAL_RUN_EMPLOYEES_MISSING', 'Verification run tidak memiliki employee output');
  }

  const seen = new Set<number>();
  return employees.map((row: any) => {
    const employeeId = Number(row?.employeeId);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      throw new PayrollOfficialPostingError('INVALID_OFFICIAL_EMPLOYEE_ID', 'Employee ID pada verification snapshot tidak valid');
    }
    if (seen.has(employeeId)) {
      throw new PayrollOfficialPostingError('DUPLICATE_OFFICIAL_EMPLOYEE', `Employee ${employeeId} muncul lebih dari sekali pada verification snapshot`);
    }
    seen.add(employeeId);

    if (taxPeriodKind === 'non_final') {
      const earnings = baseEarnings(row.earnings);
      const statutory = statutoryFrom(row.statutory);
      assertNoUnsupportedZakat(row.taxInput?.zakatViaEmployerMonthly);
      const pph21 = nonNegative(row.deductions?.pph21, 'INVALID_PPH21_WITHHOLDING', 'PPh21 withholding');
      const totalDeductions = money(row.deductions?.total, 'INVALID_TOTAL_DEDUCTIONS', 'Total deductions');
      const netSalary = money(row.netCashSalary, 'INVALID_NET_SALARY', 'Net salary');
      const employerCost = nonNegative(row.employerCost, 'INVALID_EMPLOYER_COST', 'Employer cost');
      assertClose(totalDeductions, statutory.employeeStatutory + pph21, 'TOTAL_DEDUCTION_MISMATCH', 'Total deductions');
      assertClose(netSalary, earnings.grossSalary - totalDeductions, 'NET_SALARY_MISMATCH', 'Net salary');
      assertClose(employerCost, earnings.grossSalary + statutory.employerStatutory, 'EMPLOYER_COST_MISMATCH', 'Employer cost');
      return {
        employeeId,
        ...earnings,
        bpjsKesEmployer: statutory.healthEmployer,
        bpjsKesEmployee: statutory.healthEmployee,
        jkk: statutory.jkk,
        jkm: statutory.jkm,
        jhtEmployer: statutory.jhtEmployer,
        jhtEmployee: statutory.jhtEmployee,
        jpEmployer: statutory.jpEmployer,
        jpEmployee: statutory.jpEmployee,
        pph21,
        pph21Refund: 0,
        totalDeductions,
        netSalary,
        employerCost,
        employeeStatutory: statutory.employeeStatutory,
        employerStatutory: statutory.employerStatutory,
      };
    }

    const earnings = baseEarnings(row.currentMonthComponents?.earnings);
    const statutory = statutoryFrom(row.currentMonthComponents?.statutory);
    assertNoUnsupportedZakat(row.currentMonthComponents?.taxComponents?.zakatViaEmployerMonthly);
    const pph21 = nonNegative(row.finalPeriod?.withholdingDue, 'INVALID_FINAL_WITHHOLDING', 'Final-period withholding');
    const pph21Refund = nonNegative(row.finalPeriod?.refundDue, 'INVALID_FINAL_REFUND', 'Final-period refund');
    const signedWithholding = money(row.finalPeriod?.finalWithholdingSigned, 'INVALID_FINAL_WITHHOLDING_SIGNED', 'Final-period signed withholding');
    assertClose(signedWithholding, pph21 - pph21Refund, 'FINAL_WITHHOLDING_SPLIT_MISMATCH', 'Final withholding split');
    const totalDeductions = Math.round((statutory.employeeStatutory + signedWithholding) * 100) / 100;
    const netSalary = money(row.finalPeriod?.netCashSalary, 'INVALID_FINAL_NET_SALARY', 'Final net salary');
    const employerCost = nonNegative(row.finalPeriod?.employerCost, 'INVALID_FINAL_EMPLOYER_COST', 'Final employer cost');
    assertClose(netSalary, earnings.grossSalary - totalDeductions, 'FINAL_NET_SALARY_MISMATCH', 'Final net salary');
    assertClose(employerCost, earnings.grossSalary + statutory.employerStatutory, 'FINAL_EMPLOYER_COST_MISMATCH', 'Final employer cost');
    return {
      employeeId,
      ...earnings,
      bpjsKesEmployer: statutory.healthEmployer,
      bpjsKesEmployee: statutory.healthEmployee,
      jkk: statutory.jkk,
      jkm: statutory.jkm,
      jhtEmployer: statutory.jhtEmployer,
      jhtEmployee: statutory.jhtEmployee,
      jpEmployer: statutory.jpEmployer,
      jpEmployee: statutory.jpEmployee,
      pph21,
      pph21Refund,
      totalDeductions,
      netSalary,
      employerCost,
      employeeStatutory: statutory.employeeStatutory,
      employerStatutory: statutory.employerStatutory,
    };
  });
};

export const buildOfficialPayrollTotals = (rows: OfficialPayrollDetailRow[]) => {
  const totals = rows.reduce((acc, row) => ({
    cashGross: acc.cashGross + row.grossSalary,
    employerStatutory: acc.employerStatutory + row.employerStatutory,
    employeeStatutory: acc.employeeStatutory + row.employeeStatutory,
    pph21Withholding: acc.pph21Withholding + row.pph21,
    pph21Refund: acc.pph21Refund + row.pph21Refund,
    netSalary: acc.netSalary + row.netSalary,
    employerCost: acc.employerCost + row.employerCost,
  }), {
    cashGross: 0,
    employerStatutory: 0,
    employeeStatutory: 0,
    pph21Withholding: 0,
    pph21Refund: 0,
    netSalary: 0,
    employerCost: 0,
  });

  for (const key of Object.keys(totals) as Array<keyof typeof totals>) {
    totals[key] = Math.round((totals[key] + Number.EPSILON) * 100) / 100;
  }

  const totalDebit = Math.round((totals.cashGross + totals.employerStatutory + totals.pph21Refund) * 100) / 100;
  const totalCredit = Math.round((totals.netSalary + totals.employeeStatutory + totals.employerStatutory + totals.pph21Withholding) * 100) / 100;
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new PayrollOfficialPostingError(
      'PAYROLL_JOURNAL_NOT_BALANCED',
      `Payroll journal tidak balance. Debit=${totalDebit}, Credit=${totalCredit}`,
    );
  }

  return { ...totals, totalDebit, totalCredit };
};
