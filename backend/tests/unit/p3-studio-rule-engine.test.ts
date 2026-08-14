import {
  evaluateStudioCondition,
  normalizeRuleDefinition,
  normalizeStudioValue,
  StudioValidationError,
} from '../../src/modules/fnb/services/studioRuleEngine.p3';

describe('P3 Studio deterministic rule engine', () => {
  test('normalizes each supported custom-field value type', () => {
    expect(normalizeStudioValue('text', '  VIP  ', true)).toBe('VIP');
    expect(normalizeStudioValue('number', '42.5', true)).toBe(42.5);
    expect(normalizeStudioValue('boolean', false, true)).toBe(false);
    expect(normalizeStudioValue('date', '2026-08-14', true)).toBe('2026-08-14');
    expect(normalizeStudioValue('select', 'gold', true, ['silver', 'gold'])).toBe('gold');
  });

  test('rejects invalid required, boolean, date, and select values', () => {
    for (const run of [
      () => normalizeStudioValue('text', '', true),
      () => normalizeStudioValue('boolean', 'true', true),
      () => normalizeStudioValue('date', '14-08-2026', true),
      () => normalizeStudioValue('date', '2026-02-31', true),
      () => normalizeStudioValue('select', 'platinum', true, ['gold']),
    ]) expect(run).toThrow(StudioValidationError);
  });

  test('whitelists rule operators and actions without executable code', () => {
    expect(normalizeRuleDefinition(
      { field: 'expected_revenue', operator: 'gte', value: 1_000_000 },
      { type: 'require_approval', message: 'Owner review required' },
    )).toEqual({
      condition: { field: 'expected_revenue', operator: 'gte', value: 1_000_000 },
      action: { type: 'require_approval', message: 'Owner review required' },
    });

    expect(() => normalizeRuleDefinition(
      { field: 'expected_revenue', operator: 'eval', value: 'process.exit()' },
      { type: 'shell', message: 'unsafe' },
    )).toThrow(StudioValidationError);
  });

  test('evaluates comparison, contains, exists, and numeric conditions deterministically', () => {
    const data = { segment: 'Priority Retail', revenue: 1_500_000, active: false, tags: ['vip', 'north'] };
    expect(evaluateStudioCondition({ field: 'segment', operator: 'contains', value: 'retail' }, data)).toBe(true);
    expect(evaluateStudioCondition({ field: 'revenue', operator: 'gt', value: 1_000_000 }, data)).toBe(true);
    expect(evaluateStudioCondition({ field: 'active', operator: 'exists' }, data)).toBe(true);
    expect(evaluateStudioCondition({ field: 'tags', operator: 'contains', value: 'vip' }, data)).toBe(true);
    expect(evaluateStudioCondition({ field: 'revenue', operator: 'lt', value: 1_000_000 }, data)).toBe(false);
  });
});
