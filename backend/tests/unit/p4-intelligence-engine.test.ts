import { buildIntelligenceSnapshot, type IntelligenceObservedData } from '../../src/modules/fnb/services/intelligenceEngine.p4';

const observed: IntelligenceObservedData = {
  sales: { last30Days: 40_000_000, previous30Days: 100_000_000, completedTransactions: 40 },
  cashflow: { receivableDue30: 10_000_000, payableDue30: 25_000_000, receivableOverdue: 2_000_000, payableOverdue: 3_000_000 },
  marginItems: [
    { itemId: 1, outletId: 1, name: 'Loss item', price: 8_000, cost: 10_000 },
    { itemId: 2, outletId: 1, name: 'Healthy item', price: 20_000, cost: 10_000 },
  ],
  stockItems: [
    { inventoryId: 1, outletId: 1, outletName: 'HQ', name: 'Coffee', unit: 'kg', currentStock: 2, minStock: 5, averageDailyUsage: 1, supplierId: 7, supplierName: 'Supplier A' },
    { inventoryId: 2, outletId: 1, outletName: 'HQ', name: 'Milk', unit: 'l', currentStock: 50, minStock: 5, averageDailyUsage: 1, supplierId: null, supplierName: null },
  ],
};

describe('P4 deterministic intelligence engine', () => {
  test('derives traceable sales, cashflow, margin, demand, and replenishment findings', () => {
    const snapshot = buildIntelligenceSnapshot(observed, '2026-08-14T00:00:00.000Z');
    expect(snapshot.sales.changeRate).toBe(-0.6);
    expect(snapshot.cashflow.scheduledNet30).toBe(-15_000_000);
    expect(snapshot.margin.leakageCount).toBe(1);
    expect(snapshot.demand.replenishment[0]).toMatchObject({ inventoryId: 1, targetStock: 14, recommendedQuantity: 12 });
    expect(new Set(snapshot.findings.map((finding) => finding.findingType))).toEqual(new Set([
      'sales_signal', 'cashflow_gap', 'margin_leakage', 'stock_risk', 'replenishment',
    ]));
    expect(snapshot.provenance.unavailable).toContain('bank balance');
  });

  test('does not invent trend or replenishment findings without supporting evidence', () => {
    const snapshot = buildIntelligenceSnapshot({
      sales: { last30Days: 0, previous30Days: 0, completedTransactions: 0 },
      cashflow: { receivableDue30: 0, payableDue30: 0, receivableOverdue: 0, payableOverdue: 0 },
      marginItems: [],
      stockItems: [],
    }, '2026-08-14T00:00:00.000Z');
    expect(snapshot.sales.changeRate).toBeNull();
    expect(snapshot.demand.replenishment).toEqual([]);
    expect(snapshot.findings).toEqual([]);
  });

  test('negative stock remains critical even when average usage is unavailable', () => {
    const snapshot = buildIntelligenceSnapshot({
      ...observed,
      stockItems: [{ ...observed.stockItems[0], currentStock: -3, averageDailyUsage: 0 }],
    }, '2026-08-14T00:00:00.000Z');
    const finding = snapshot.findings.find((candidate) => candidate.findingType === 'stock_risk');
    expect(finding).toMatchObject({ severity: 'critical', confidence: 0.99 });
  });
});
