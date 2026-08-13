export type JkkRiskLevel = 1 | 2 | 3 | 4 | 5;

export class StatutoryContributionError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'StatutoryContributionError';
    this.code = code;
  }
}

/**
 * Indonesian PPU statutory contribution rules verified 2026-08-13.
 *
 * BPJS Ketenagakerjaan source: official Penerima Upah contribution page.
 * - reported wage basis: basic salary + fixed allowances
 * - JKK: 0.24/0.54/0.89/1.27/1.74% employer
 * - JKM: 0.3% employer
 * - JHT: 3.7% employer + 2% employee
 * - JP: 2% employer + 1% employee, wage ceiling Rp10,547,400
 *
 * BPJS Kesehatan source: Perpres 64/2020 as amended by Perpres 59/2024;
 * BPJS Kesehatan stated on 2026-05-29 that contribution amounts remained unchanged.
 * - PPU: 4% employer + 1% employee
 * - wage ceiling: Rp12,000,000
 * - the lower wage basis depends on applicable UMK/UMP, therefore callers must
 *   explicitly provide the applicable minimum wage. This calculator never guesses it.
 *
 * BPU-specific temporary relief under PP 50/2025 is intentionally excluded.
 */
export const PPU_STATUTORY_RULESET = Object.freeze({
  id: 'ID-PPU-STATUTORY-2026-V1',
  verifiedOn: '2026-08-13',
  employment: Object.freeze({
    wageBasis: 'BASIC_SALARY_PLUS_FIXED_ALLOWANCES',
    jhtEmployerRate: 0.037,
    jhtEmployeeRate: 0.02,
    jkkRiskRates: Object.freeze([0.0024, 0.0054, 0.0089, 0.0127, 0.0174] as const),
    jkmEmployerRate: 0.003,
    jpEmployerRate: 0.02,
    jpEmployeeRate: 0.01,
    jpMaxMonthlyWage: 10_547_400,
  }),
  health: Object.freeze({
    employerRate: 0.04,
    employeeRate: 0.01,
    maxMonthlyWage: 12_000_000,
    minimumWagePolicy: 'APPLICABLE_UMK_OR_UMP_REQUIRED',
  }),
  references: Object.freeze([
    'BPJS Ketenagakerjaan Penerima Upah contribution page, verified 2026-08-13',
    'Perpres 64/2020 as amended by Perpres 59/2024',
    'BPJS Kesehatan contribution amount status, 2026-05-29',
  ]),
});

const assertMoney = (value: number, code: string, label: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new StatutoryContributionError(code, `${label} harus berupa angka finite dan tidak negatif`);
  }
};

const zeroComponent = () => ({ employer: 0, employee: 0, basis: 0 });

export interface CalculatePpuStatutoryInput {
  reportedFixedWage: number;
  jkkRiskLevel?: JkkRiskLevel;
  bpjsEmploymentEnabled?: boolean;
  bpjsHealthEnabled?: boolean;
  applicableHealthMinimumWage?: number;
}

export const calculatePpuStatutoryContributions = (input: CalculatePpuStatutoryInput) => {
  const {
    reportedFixedWage,
    jkkRiskLevel = 1,
    bpjsEmploymentEnabled = true,
    bpjsHealthEnabled = true,
    applicableHealthMinimumWage,
  } = input;

  assertMoney(reportedFixedWage, 'INVALID_REPORTED_FIXED_WAGE', 'Reported fixed wage');
  if (![1, 2, 3, 4, 5].includes(jkkRiskLevel)) {
    throw new StatutoryContributionError('INVALID_JKK_RISK_LEVEL', 'JKK risk level harus 1 sampai 5');
  }

  let jht = zeroComponent();
  let jkk = zeroComponent();
  let jkm = zeroComponent();
  let jp = zeroComponent();

  if (bpjsEmploymentEnabled) {
    const employment = PPU_STATUTORY_RULESET.employment;
    const jpBasis = Math.min(reportedFixedWage, employment.jpMaxMonthlyWage);
    jht = {
      basis: reportedFixedWage,
      employer: Math.round(reportedFixedWage * employment.jhtEmployerRate),
      employee: Math.round(reportedFixedWage * employment.jhtEmployeeRate),
    };
    jkk = {
      basis: reportedFixedWage,
      employer: Math.round(reportedFixedWage * employment.jkkRiskRates[jkkRiskLevel - 1]),
      employee: 0,
    };
    jkm = {
      basis: reportedFixedWage,
      employer: Math.round(reportedFixedWage * employment.jkmEmployerRate),
      employee: 0,
    };
    jp = {
      basis: jpBasis,
      employer: Math.round(jpBasis * employment.jpEmployerRate),
      employee: Math.round(jpBasis * employment.jpEmployeeRate),
    };
  }

  let health = zeroComponent();
  if (bpjsHealthEnabled) {
    if (applicableHealthMinimumWage === undefined) {
      throw new StatutoryContributionError(
        'HEALTH_MINIMUM_WAGE_REQUIRED',
        'Applicable UMK/UMP wajib diberikan untuk menghitung basis BPJS Kesehatan PPU secara aman',
      );
    }
    assertMoney(applicableHealthMinimumWage, 'INVALID_HEALTH_MINIMUM_WAGE', 'Applicable health minimum wage');
    const healthRules = PPU_STATUTORY_RULESET.health;
    const healthBasis = Math.min(
      Math.max(reportedFixedWage, applicableHealthMinimumWage),
      healthRules.maxMonthlyWage,
    );
    health = {
      basis: healthBasis,
      employer: Math.round(healthBasis * healthRules.employerRate),
      employee: Math.round(healthBasis * healthRules.employeeRate),
    };
  }

  const employerTotal = jht.employer + jkk.employer + jkm.employer + jp.employer + health.employer;
  const employeeTotal = jht.employee + jkk.employee + jkm.employee + jp.employee + health.employee;

  return {
    rulesetId: PPU_STATUTORY_RULESET.id,
    reportedFixedWage,
    jkkRiskLevel,
    enrollment: {
      bpjsEmployment: bpjsEmploymentEnabled,
      bpjsHealth: bpjsHealthEnabled,
    },
    components: { jht, jkk, jkm, jp, health },
    employerTotal,
    employeeTotal,
    combinedTotal: employerTotal + employeeTotal,
    notice: 'JKP tidak ditambahkan sebagai potongan langsung pekerja/perusahaan pada calculator ini; BPU-specific relief juga tidak diterapkan.',
  };
};
