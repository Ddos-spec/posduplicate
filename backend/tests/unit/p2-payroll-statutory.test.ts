import {
  calculatePpuStatutoryContributions,
  PPU_STATUTORY_RULESET,
  StatutoryContributionError,
} from '../../src/modules/accounting/services/payroll-statutory.p2';

describe('P2 Payroll-B PPU statutory contributions', () => {
  test('calculates current PU/PPU contribution splits from fixed reported wage', () => {
    const result = calculatePpuStatutoryContributions({
      reportedFixedWage: 6_000_000,
      applicableHealthMinimumWage: 5_000_000,
      jkkRiskLevel: 2,
    });

    expect(result.components.jht).toEqual({ basis: 6_000_000, employer: 222_000, employee: 120_000 });
    expect(result.components.jkk).toEqual({ basis: 6_000_000, employer: 32_400, employee: 0 });
    expect(result.components.jkm).toEqual({ basis: 6_000_000, employer: 18_000, employee: 0 });
    expect(result.components.jp).toEqual({ basis: 6_000_000, employer: 120_000, employee: 60_000 });
    expect(result.components.health).toEqual({ basis: 6_000_000, employer: 240_000, employee: 60_000 });
    expect(result.employerTotal).toBe(632_400);
    expect(result.employeeTotal).toBe(240_000);
    expect(result.combinedTotal).toBe(872_400);
  });

  test('applies JP and health ceilings independently', () => {
    const result = calculatePpuStatutoryContributions({
      reportedFixedWage: 20_000_000,
      applicableHealthMinimumWage: 5_000_000,
      jkkRiskLevel: 1,
    });

    expect(result.components.jp.basis).toBe(10_547_400);
    expect(result.components.jp.employer).toBe(210_948);
    expect(result.components.jp.employee).toBe(105_474);
    expect(result.components.health.basis).toBe(12_000_000);
    expect(result.components.health.employer).toBe(480_000);
    expect(result.components.health.employee).toBe(120_000);
  });

  test('applies health minimum wage floor explicitly instead of guessing tenant geography', () => {
    const result = calculatePpuStatutoryContributions({
      reportedFixedWage: 4_000_000,
      applicableHealthMinimumWage: 5_000_000,
      bpjsEmploymentEnabled: false,
    });
    expect(result.components.health.basis).toBe(5_000_000);
    expect(result.components.health.employee).toBe(50_000);
    expect(result.components.jht.employee).toBe(0);
  });

  test('fails closed when BPJS Kesehatan is enabled without applicable UMK/UMP', () => {
    expect(() => calculatePpuStatutoryContributions({ reportedFixedWage: 6_000_000 }))
      .toThrow(StatutoryContributionError);
    try {
      calculatePpuStatutoryContributions({ reportedFixedWage: 6_000_000 });
    } catch (error) {
      expect((error as StatutoryContributionError).code).toBe('HEALTH_MINIMUM_WAGE_REQUIRED');
    }
  });

  test('ruleset explicitly excludes BPU-only relief from PPU payroll', () => {
    expect(PPU_STATUTORY_RULESET.id).toBe('ID-PPU-STATUTORY-2026-V1');
    expect(PPU_STATUTORY_RULESET.employment.jpMaxMonthlyWage).toBe(10_547_400);
    expect(PPU_STATUTORY_RULESET.health.maxMonthlyWage).toBe(12_000_000);
  });
});
