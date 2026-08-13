import {
  calculateNonFinalPayrollVerification,
  PayrollCurrentEngineError,
  sumPayrollAllowances,
} from '../../src/modules/accounting/services/payroll-current-engine.p2';

describe('Payroll-C1 current-law verification engine', () => {
  test('TER gross includes employer JKK, JKM and health while payroll cash gross stays separate', () => {
    const result = calculateNonFinalPayrollVerification({
      employeeId: 1,
      employeeCode: 'EMP-001',
      name: 'Employee One',
      nik: '3174000000000001',
      ptkpStatus: 'TK/0',
      basicSalary: 10_000_000,
      allowances: { position: 20_000_000 },
      overtimeHours: 0,
      statutory: {
        fixedAllowanceMonthly: 0,
        applicableHealthMinimumWage: 5_000_000,
        bpjsEmploymentEnabled: true,
        bpjsHealthEnabled: true,
        jkkRiskLevel: 1,
      },
    });

    expect(result.earnings.cashGross).toBe(30_000_000);
    expect(result.statutory.reportedFixedWage).toBe(10_000_000);
    expect(result.statutory.components.jkk.employer).toBe(24_000);
    expect(result.statutory.components.jkm.employer).toBe(30_000);
    expect(result.statutory.components.health.employer).toBe(400_000);
    expect(result.tax.taxableEmployerBenefits).toBe(454_000);
    expect(result.tax.monthlyTerGross).toBe(30_454_000);
    expect(result.tax.pph21.rate).toBe(0.13);
    expect(result.tax.pph21.basePph21).toBe(3_959_020);
    expect(result.deductions.employeeStatutory).toBe(400_000);
    expect(result.netCashSalary).toBe(25_640_980);
    expect(result.employerCost).toBe(31_024_000);
  });

  test('BPJS can be disabled without inventing contributions', () => {
    const result = calculateNonFinalPayrollVerification({
      employeeId: 2,
      employeeCode: 'EMP-002',
      name: 'Employee Two',
      nik: '3174000000000002',
      ptkpStatus: 'TK/0',
      basicSalary: 5_000_000,
      allowances: {},
      overtimeHours: 0,
      statutory: {
        fixedAllowanceMonthly: 0,
        bpjsEmploymentEnabled: false,
        bpjsHealthEnabled: false,
        jkkRiskLevel: 1,
      },
    });

    expect(result.statutory.employeeTotal).toBe(0);
    expect(result.statutory.employerTotal).toBe(0);
    expect(result.tax.monthlyTerGross).toBe(5_000_000);
    expect(result.tax.pph21.basePph21).toBe(0);
    expect(result.netCashSalary).toBe(5_000_000);
  });

  test('overtime fails closed until a verified compensation policy is wired', () => {
    expect(() => calculateNonFinalPayrollVerification({
      employeeId: 3,
      employeeCode: 'EMP-003',
      name: 'Employee Three',
      nik: '3174000000000003',
      ptkpStatus: 'TK/0',
      basicSalary: 10_000_000,
      allowances: {},
      overtimeHours: 1,
      statutory: {
        fixedAllowanceMonthly: 0,
        bpjsEmploymentEnabled: false,
        bpjsHealthEnabled: false,
        jkkRiskLevel: 1,
      },
    })).toThrow(expect.objectContaining({ code: 'OVERTIME_COMPENSATION_POLICY_NOT_WIRED' }));
  });

  test('employee NIK is required for current-law verification', () => {
    expect(() => calculateNonFinalPayrollVerification({
      employeeId: 4,
      employeeCode: 'EMP-004',
      name: 'Employee Four',
      nik: null,
      ptkpStatus: 'TK/0',
      basicSalary: 10_000_000,
      allowances: {},
      overtimeHours: 0,
      statutory: {
        fixedAllowanceMonthly: 0,
        bpjsEmploymentEnabled: false,
        bpjsHealthEnabled: false,
        jkkRiskLevel: 1,
      },
    })).toThrow(expect.objectContaining({ code: 'EMPLOYEE_NIK_REQUIRED_FOR_VERIFICATION' }));
  });

  test('allowance payload rejects negative or non-numeric values', () => {
    expect(() => sumPayrollAllowances({ transport: -1 })).toThrow(PayrollCurrentEngineError);
    expect(() => sumPayrollAllowances({ transport: 'abc' })).toThrow(PayrollCurrentEngineError);
  });
});
