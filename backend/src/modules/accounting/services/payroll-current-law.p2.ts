export type MonthlyTerCategory = 'A' | 'B' | 'C';

export interface TerBracket {
  maxInclusive: number | null;
  rate: number;
}

export class PayrollRuleError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'PayrollRuleError';
    this.code = code;
  }
}

/**
 * Base statutory PPh 21 withholding rules verified against:
 * - PP 58/2023 (still in force when checked 2026-08-13)
 * - PMK 168/2023 (effective 2024-01-01 until revoked)
 * - DJP "Cermat Pemotongan PPh Pasal 21/26", tables 6.1-6.4
 *
 * This module intentionally contains only the base statutory rate schedule.
 * DTP/stimulus eligibility, identity/NPWP treatment, BPJS, and the final-tax-period
 * annual reconciliation are separate compliance layers and must not be inferred here.
 */
export const PPH21_BASE_RULESET = Object.freeze({
  id: 'ID-PPH21-BASE-PP58-2023',
  effectiveFrom: '2024-01-01',
  verifiedOn: '2026-08-13',
  references: [
    'PP 58/2023',
    'PMK 168/2023',
    'DJP Cermat Pemotongan PPh Pasal 21/26 tables 6.1-6.4',
  ],
});

export const PTKP_TO_MONTHLY_TER_CATEGORY: Readonly<Record<string, MonthlyTerCategory>> = Object.freeze({
  'TK/0': 'A',
  'TK/1': 'A',
  'K/0': 'A',
  'TK/2': 'B',
  'TK/3': 'B',
  'K/1': 'B',
  'K/2': 'B',
  'K/3': 'C',
});

export const MONTHLY_TER_BRACKETS: Readonly<Record<MonthlyTerCategory, readonly TerBracket[]>> = Object.freeze({
  A: Object.freeze([
    { maxInclusive: 5_400_000, rate: 0 },
    { maxInclusive: 5_650_000, rate: 0.0025 },
    { maxInclusive: 5_950_000, rate: 0.005 },
    { maxInclusive: 6_300_000, rate: 0.0075 },
    { maxInclusive: 6_750_000, rate: 0.01 },
    { maxInclusive: 7_500_000, rate: 0.0125 },
    { maxInclusive: 8_550_000, rate: 0.015 },
    { maxInclusive: 9_650_000, rate: 0.0175 },
    { maxInclusive: 10_050_000, rate: 0.02 },
    { maxInclusive: 10_350_000, rate: 0.0225 },
    { maxInclusive: 10_700_000, rate: 0.025 },
    { maxInclusive: 11_050_000, rate: 0.03 },
    { maxInclusive: 11_600_000, rate: 0.035 },
    { maxInclusive: 12_500_000, rate: 0.04 },
    { maxInclusive: 13_750_000, rate: 0.05 },
    { maxInclusive: 15_100_000, rate: 0.06 },
    { maxInclusive: 16_950_000, rate: 0.07 },
    { maxInclusive: 19_750_000, rate: 0.08 },
    { maxInclusive: 24_150_000, rate: 0.09 },
    { maxInclusive: 26_450_000, rate: 0.10 },
    { maxInclusive: 28_000_000, rate: 0.11 },
    { maxInclusive: 30_050_000, rate: 0.12 },
    { maxInclusive: 32_400_000, rate: 0.13 },
    { maxInclusive: 35_400_000, rate: 0.14 },
    { maxInclusive: 39_100_000, rate: 0.15 },
    { maxInclusive: 43_850_000, rate: 0.16 },
    { maxInclusive: 47_800_000, rate: 0.17 },
    { maxInclusive: 51_400_000, rate: 0.18 },
    { maxInclusive: 56_300_000, rate: 0.19 },
    { maxInclusive: 62_200_000, rate: 0.20 },
    { maxInclusive: 68_600_000, rate: 0.21 },
    { maxInclusive: 77_500_000, rate: 0.22 },
    { maxInclusive: 89_000_000, rate: 0.23 },
    { maxInclusive: 103_000_000, rate: 0.24 },
    { maxInclusive: 125_000_000, rate: 0.25 },
    { maxInclusive: 157_000_000, rate: 0.26 },
    { maxInclusive: 206_000_000, rate: 0.27 },
    { maxInclusive: 337_000_000, rate: 0.28 },
    { maxInclusive: 454_000_000, rate: 0.29 },
    { maxInclusive: 550_000_000, rate: 0.30 },
    { maxInclusive: 695_000_000, rate: 0.31 },
    { maxInclusive: 910_000_000, rate: 0.32 },
    { maxInclusive: 1_400_000_000, rate: 0.33 },
    { maxInclusive: null, rate: 0.34 },
  ]),
  B: Object.freeze([
    { maxInclusive: 6_200_000, rate: 0 },
    { maxInclusive: 6_500_000, rate: 0.0025 },
    { maxInclusive: 6_850_000, rate: 0.005 },
    { maxInclusive: 7_300_000, rate: 0.0075 },
    { maxInclusive: 9_200_000, rate: 0.01 },
    { maxInclusive: 10_750_000, rate: 0.015 },
    { maxInclusive: 11_250_000, rate: 0.02 },
    { maxInclusive: 11_600_000, rate: 0.025 },
    { maxInclusive: 12_600_000, rate: 0.03 },
    { maxInclusive: 13_600_000, rate: 0.04 },
    { maxInclusive: 14_950_000, rate: 0.05 },
    { maxInclusive: 16_400_000, rate: 0.06 },
    { maxInclusive: 18_450_000, rate: 0.07 },
    { maxInclusive: 21_850_000, rate: 0.08 },
    { maxInclusive: 26_000_000, rate: 0.09 },
    { maxInclusive: 27_700_000, rate: 0.10 },
    { maxInclusive: 29_350_000, rate: 0.11 },
    { maxInclusive: 31_450_000, rate: 0.12 },
    { maxInclusive: 33_950_000, rate: 0.13 },
    { maxInclusive: 37_100_000, rate: 0.14 },
    { maxInclusive: 41_100_000, rate: 0.15 },
    { maxInclusive: 45_800_000, rate: 0.16 },
    { maxInclusive: 49_500_000, rate: 0.17 },
    { maxInclusive: 53_800_000, rate: 0.18 },
    { maxInclusive: 58_500_000, rate: 0.19 },
    { maxInclusive: 64_000_000, rate: 0.20 },
    { maxInclusive: 71_000_000, rate: 0.21 },
    { maxInclusive: 80_000_000, rate: 0.22 },
    { maxInclusive: 93_000_000, rate: 0.23 },
    { maxInclusive: 109_000_000, rate: 0.24 },
    { maxInclusive: 129_000_000, rate: 0.25 },
    { maxInclusive: 163_000_000, rate: 0.26 },
    { maxInclusive: 211_000_000, rate: 0.27 },
    { maxInclusive: 374_000_000, rate: 0.28 },
    { maxInclusive: 459_000_000, rate: 0.29 },
    { maxInclusive: 555_000_000, rate: 0.30 },
    { maxInclusive: 704_000_000, rate: 0.31 },
    { maxInclusive: 957_000_000, rate: 0.32 },
    { maxInclusive: 1_405_000_000, rate: 0.33 },
    { maxInclusive: null, rate: 0.34 },
  ]),
  C: Object.freeze([
    { maxInclusive: 6_600_000, rate: 0 },
    { maxInclusive: 6_950_000, rate: 0.0025 },
    { maxInclusive: 7_350_000, rate: 0.005 },
    { maxInclusive: 7_800_000, rate: 0.0075 },
    { maxInclusive: 8_850_000, rate: 0.01 },
    { maxInclusive: 9_800_000, rate: 0.0125 },
    { maxInclusive: 10_950_000, rate: 0.015 },
    { maxInclusive: 11_200_000, rate: 0.0175 },
    { maxInclusive: 12_050_000, rate: 0.02 },
    { maxInclusive: 12_950_000, rate: 0.03 },
    { maxInclusive: 14_150_000, rate: 0.04 },
    { maxInclusive: 15_550_000, rate: 0.05 },
    { maxInclusive: 17_050_000, rate: 0.06 },
    { maxInclusive: 19_500_000, rate: 0.07 },
    { maxInclusive: 22_700_000, rate: 0.08 },
    { maxInclusive: 26_600_000, rate: 0.09 },
    { maxInclusive: 28_100_000, rate: 0.10 },
    { maxInclusive: 30_100_000, rate: 0.11 },
    { maxInclusive: 32_600_000, rate: 0.12 },
    { maxInclusive: 35_400_000, rate: 0.13 },
    { maxInclusive: 38_900_000, rate: 0.14 },
    { maxInclusive: 43_000_000, rate: 0.15 },
    { maxInclusive: 47_400_000, rate: 0.16 },
    { maxInclusive: 51_200_000, rate: 0.17 },
    { maxInclusive: 55_800_000, rate: 0.18 },
    { maxInclusive: 60_400_000, rate: 0.19 },
    { maxInclusive: 66_700_000, rate: 0.20 },
    { maxInclusive: 74_500_000, rate: 0.21 },
    { maxInclusive: 83_200_000, rate: 0.22 },
    { maxInclusive: 95_600_000, rate: 0.23 },
    { maxInclusive: 110_000_000, rate: 0.24 },
    { maxInclusive: 134_000_000, rate: 0.25 },
    { maxInclusive: 169_000_000, rate: 0.26 },
    { maxInclusive: 221_000_000, rate: 0.27 },
    { maxInclusive: 390_000_000, rate: 0.28 },
    { maxInclusive: 463_000_000, rate: 0.29 },
    { maxInclusive: 561_000_000, rate: 0.30 },
    { maxInclusive: 709_000_000, rate: 0.31 },
    { maxInclusive: 965_000_000, rate: 0.32 },
    { maxInclusive: 1_419_000_000, rate: 0.33 },
    { maxInclusive: null, rate: 0.34 },
  ]),
});

export const ARTICLE_17_ANNUAL_BRACKETS: readonly TerBracket[] = Object.freeze([
  { maxInclusive: 60_000_000, rate: 0.05 },
  { maxInclusive: 250_000_000, rate: 0.15 },
  { maxInclusive: 500_000_000, rate: 0.25 },
  { maxInclusive: 5_000_000_000, rate: 0.30 },
  { maxInclusive: null, rate: 0.35 },
]);

export const DAILY_TER_BRACKETS: readonly TerBracket[] = Object.freeze([
  { maxInclusive: 450_000, rate: 0 },
  { maxInclusive: 2_500_000, rate: 0.005 },
]);

export const resolveMonthlyTerCategory = (ptkpStatus: string): MonthlyTerCategory => {
  const normalized = String(ptkpStatus || '').trim().toUpperCase();
  const category = PTKP_TO_MONTHLY_TER_CATEGORY[normalized];
  if (!category) {
    throw new PayrollRuleError(
      'UNSUPPORTED_PTKP_FOR_MONTHLY_TER',
      `Status PTKP ${normalized || '(kosong)'} belum dapat dipetakan ke TER bulanan`,
    );
  }
  return category;
};

const assertIncome = (income: number, code: string) => {
  if (!Number.isFinite(income) || income < 0) {
    throw new PayrollRuleError(code, 'Penghasilan harus berupa angka finite dan tidak negatif');
  }
};

export const calculateBaseMonthlyTerPph21 = (grossMonthly: number, ptkpStatus: string) => {
  assertIncome(grossMonthly, 'INVALID_MONTHLY_GROSS');
  const normalizedPtkpStatus = String(ptkpStatus || '').trim().toUpperCase();
  const category = resolveMonthlyTerCategory(normalizedPtkpStatus);
  const brackets = MONTHLY_TER_BRACKETS[category];
  const index = brackets.findIndex((bracket) => bracket.maxInclusive === null || grossMonthly <= bracket.maxInclusive);
  const bracket = brackets[index];
  if (!bracket) {
    throw new PayrollRuleError('TER_BRACKET_NOT_FOUND', 'Bracket TER bulanan tidak ditemukan');
  }

  const previousMax = index > 0 ? brackets[index - 1].maxInclusive : null;
  return {
    rulesetId: PPH21_BASE_RULESET.id,
    ptkpStatus: normalizedPtkpStatus,
    category,
    grossMonthly,
    bracket: {
      minExclusive: previousMax,
      maxInclusive: bracket.maxInclusive,
    },
    rate: bracket.rate,
    basePph21: Math.round(grossMonthly * bracket.rate),
    scope: 'BASE_MONTHLY_TER_NON_FINAL_TAX_PERIOD' as const,
  };
};

export const calculateBaseDailyTerPph21 = (grossDaily: number) => {
  assertIncome(grossDaily, 'INVALID_DAILY_GROSS');
  const index = DAILY_TER_BRACKETS.findIndex((bracket) => grossDaily <= Number(bracket.maxInclusive));
  if (index < 0) {
    throw new PayrollRuleError(
      'DAILY_TER_LIMIT_EXCEEDED',
      'Penghasilan harian di atas Rp2.500.000 harus menggunakan tarif Pasal 17, bukan TER harian',
    );
  }
  const bracket = DAILY_TER_BRACKETS[index];
  const previousMax = index > 0 ? DAILY_TER_BRACKETS[index - 1].maxInclusive : null;
  return {
    rulesetId: PPH21_BASE_RULESET.id,
    grossDaily,
    bracket: {
      minExclusive: previousMax,
      maxInclusive: bracket.maxInclusive,
    },
    rate: bracket.rate,
    basePph21: Math.round(grossDaily * bracket.rate),
    scope: 'BASE_DAILY_TER' as const,
  };
};
