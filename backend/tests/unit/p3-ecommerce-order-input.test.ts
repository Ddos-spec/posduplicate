import { normalizeOrderItems } from '../../src/modules/fnb/services/ecommerce-order.p3.service';

describe('P3.2 ecommerce order input normalization', () => {
  test('merges duplicate item rows deterministically', () => {
    expect(normalizeOrderItems([
      { itemId: 9, quantity: 1.25 },
      { itemId: 9, quantity: 2.5 },
      { itemId: 4, quantity: 1 },
    ])).toEqual([
      { itemId: 9, quantity: 3.75 },
      { itemId: 4, quantity: 1 },
    ]);
  });

  test('rejects duplicate rows whose merged quantity exceeds the per-item limit', () => {
    expect(() => normalizeOrderItems([
      { itemId: 9, quantity: 600 },
      { itemId: 9, quantity: 500 },
    ])).toThrow('Merged item quantity exceeds limit');
  });

  test('rejects malformed or empty order lines', () => {
    expect(() => normalizeOrderItems([])).toThrow('Order must contain 1-50 items');
    expect(() => normalizeOrderItems([{ itemId: 0, quantity: 1 }])).toThrow('Invalid item id');
    expect(() => normalizeOrderItems([{ itemId: 1, quantity: 0 }])).toThrow('Invalid quantity');
  });
});
