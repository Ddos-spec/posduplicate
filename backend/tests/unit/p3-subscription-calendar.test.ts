import { advanceSubscriptionDate } from '../../src/modules/fnb/services/subscription.p3.service';

describe('P3.3 subscription calendar boundaries', () => {
  test('clamps month end instead of overflowing', () => {
    expect(advanceSubscriptionDate('2026-01-31', 'month', 1)).toBe('2026-02-28');
    expect(advanceSubscriptionDate('2028-01-31', 'month', 1)).toBe('2028-02-29');
    expect(advanceSubscriptionDate('2026-03-31', 'month', 1)).toBe('2026-04-30');
  });
  test('clamps leap day annual renewal', () => {
    expect(advanceSubscriptionDate('2028-02-29', 'year', 1)).toBe('2029-02-28');
  });
});
