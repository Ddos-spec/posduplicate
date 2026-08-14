export interface IntelligenceObservedData {
  sales: {
    last30Days: number;
    previous30Days: number;
    completedTransactions: number;
  };
  cashflow: {
    receivableDue30: number;
    payableDue30: number;
    receivableOverdue: number;
    payableOverdue: number;
  };
  marginItems: Array<{
    itemId: number;
    outletId: number;
    name: string;
    price: number;
    cost: number;
  }>;
  stockItems: Array<{
    inventoryId: number;
    outletId: number;
    outletName: string;
    name: string;
    unit: string;
    currentStock: number;
    minStock: number;
    averageDailyUsage: number;
    supplierId: number | null;
    supplierName: string | null;
  }>;
}

export interface IntelligenceFinding {
  findingType: 'sales_signal' | 'stock_risk' | 'cashflow_gap' | 'margin_leakage' | 'demand_signal' | 'replenishment';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  entityType?: string;
  entityId?: string;
  title: string;
  explanation: string;
  observed: Record<string, unknown>;
  derived: Record<string, unknown>;
  confidence: number;
  recommendedAction: Record<string, unknown>;
}

export interface ReplenishmentRecommendation {
  inventoryId: number;
  outletId: number;
  outletName: string;
  inventoryName: string;
  unit: string;
  currentStock: number;
  minStock: number;
  averageDailyUsage: number;
  targetStock: number;
  recommendedQuantity: number;
  supplierId: number | null;
  supplierName: string | null;
  evidence: 'inventory.current_stock+min_stock+avg_daily_usage';
}

const round = (value: number, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};
export const buildIntelligenceSnapshot = (observed: IntelligenceObservedData, dataCutoff: string) => {
  const previous = observed.sales.previous30Days;
  const salesChangeRate = previous > 0
    ? (observed.sales.last30Days - previous) / previous
    : null;
  const scheduledNet30 = observed.cashflow.receivableDue30 - observed.cashflow.payableDue30;

  const marginRows = observed.marginItems.map((item) => {
    const marginAmount = item.price - item.cost;
    const marginRate = item.price > 0 ? marginAmount / item.price : null;
    return { ...item, marginAmount: round(marginAmount), marginRate: marginRate === null ? null : round(marginRate, 4) };
  });
  const marginLeakage = marginRows
    .filter((item) => item.price > 0 && item.marginRate !== null && item.marginRate < 0.1)
    .sort((left, right) => Number(left.marginRate) - Number(right.marginRate));

  const replenishment: ReplenishmentRecommendation[] = observed.stockItems
    .map((item) => {
      const demandTarget = Math.max(0, item.averageDailyUsage) * 14;
      const targetStock = Math.max(item.minStock, demandTarget);
      const recommendedQuantity = Math.max(0, targetStock - item.currentStock);
      return {
        inventoryId: item.inventoryId,
        outletId: item.outletId,
        outletName: item.outletName,
        inventoryName: item.name,
        unit: item.unit,
        currentStock: round(item.currentStock, 3),
        minStock: round(item.minStock, 3),
        averageDailyUsage: round(item.averageDailyUsage, 3),
        targetStock: round(targetStock, 3),
        recommendedQuantity: round(recommendedQuantity, 3),
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        evidence: 'inventory.current_stock+min_stock+avg_daily_usage' as const,
      };
    })
    .filter((item) => item.recommendedQuantity > 0)
    .sort((left, right) => right.recommendedQuantity - left.recommendedQuantity);

  const findings: IntelligenceFinding[] = [];
  if (salesChangeRate !== null && Math.abs(salesChangeRate) >= 0.5) {
    findings.push({
      findingType: 'sales_signal',
      severity: salesChangeRate <= -0.5 ? 'high' : 'info',
      title: salesChangeRate < 0 ? 'Thirty-day sales declined materially' : 'Thirty-day sales increased materially',
      explanation: 'Completed transaction value changed by at least 50% versus the preceding 30-day window.',
      observed: { last30Days: observed.sales.last30Days, previous30Days: previous },
      derived: { changeRate: round(salesChangeRate, 4) },
      confidence: 0.95,
      recommendedAction: { type: 'review_sales_window' },
    });
  }

  if (scheduledNet30 < 0) {
    findings.push({
      findingType: 'cashflow_gap',
      severity: 'high',
      title: 'Scheduled 30-day payable position exceeds receivables',
      explanation: 'This is not a bank-balance forecast; it compares open accounting receivables and payables due within 30 days.',
      observed: {
        receivableDue30: observed.cashflow.receivableDue30,
        payableDue30: observed.cashflow.payableDue30,
      },
      derived: { scheduledNet30: round(scheduledNet30) },
      confidence: 0.98,
      recommendedAction: { type: 'review_collections_and_due_payables' },
    });
  }

  for (const item of marginLeakage.slice(0, 20)) {
    findings.push({
      findingType: 'margin_leakage',
      severity: item.marginAmount < 0 ? 'critical' : 'high',
      entityType: 'item',
      entityId: String(item.itemId),
      title: `${item.name} has a margin below 10%`,
      explanation: 'Current item master price and cost imply a low or negative unit margin before discounts and channel fees.',
      observed: { price: item.price, cost: item.cost },
      derived: { marginAmount: item.marginAmount, marginRate: item.marginRate },
      confidence: 0.98,
      recommendedAction: { type: 'review_price_or_cost', itemId: item.itemId },
    });
  }

  for (const item of observed.stockItems) {
    const daysCover = item.averageDailyUsage > 0 ? item.currentStock / item.averageDailyUsage : null;
    if (item.currentStock < 0 || item.currentStock <= item.minStock) {
      findings.push({
        findingType: 'stock_risk',
        severity: item.currentStock < 0 ? 'critical' : 'high',
        entityType: 'inventory',
        entityId: String(item.inventoryId),
        title: `${item.name} is ${item.currentStock < 0 ? 'negative' : 'at or below minimum stock'}`,
        explanation: 'The finding uses the current inventory aggregate and configured minimum stock for the tenant outlet.',
        observed: { currentStock: item.currentStock, minStock: item.minStock, unit: item.unit },
        derived: { daysCover: daysCover === null ? null : round(daysCover, 2) },
        confidence: 0.99,
        recommendedAction: { type: 'create_replenishment_rfq', inventoryId: item.inventoryId },
      });
    } else if (daysCover !== null && daysCover < 7) {
      findings.push({
        findingType: 'demand_signal',
        severity: 'medium',
        entityType: 'inventory',
        entityId: String(item.inventoryId),
        title: `${item.name} has less than seven days of cover`,
        explanation: 'Days cover is derived from current stock divided by the stored average daily usage.',
        observed: { currentStock: item.currentStock, averageDailyUsage: item.averageDailyUsage },
        derived: { daysCover: round(daysCover, 2) },
        confidence: 0.8,
        recommendedAction: { type: 'review_replenishment', inventoryId: item.inventoryId },
      });
    }
  }

  for (const recommendation of replenishment.slice(0, 30)) {
    findings.push({
      findingType: 'replenishment',
      severity: recommendation.currentStock < 0 ? 'critical' : 'medium',
      entityType: 'inventory',
      entityId: String(recommendation.inventoryId),
      title: `Replenish ${recommendation.inventoryName}`,
      explanation: 'Recommended quantity closes the gap to the greater of minimum stock or fourteen days of average usage.',
      observed: {
        currentStock: recommendation.currentStock,
        minStock: recommendation.minStock,
        averageDailyUsage: recommendation.averageDailyUsage,
      },
      derived: {
        targetStock: recommendation.targetStock,
        recommendedQuantity: recommendation.recommendedQuantity,
      },
      confidence: recommendation.averageDailyUsage > 0 ? 0.8 : 0.99,
      recommendedAction: {
        type: 'create_replenishment_rfq',
        inventoryId: recommendation.inventoryId,
        requiresApproval: true,
      },
    });
  }

  return {
    dataCutoff,
    provenance: {
      observed: ['transactions', 'accounting.accounts_receivable', 'accounting.accounts_payable', 'items', 'inventory'],
      derived: ['30-day comparison', 'scheduled receivable-payable position', 'unit margin', 'days cover', '14-day replenishment target'],
      inferred: [],
      unavailable: ['bank balance', 'committed credit facilities', 'supplier lead-time variability'],
    },
    sales: {
      ...observed.sales,
      changeRate: salesChangeRate === null ? null : round(salesChangeRate, 4),
    },
    cashflow: {
      ...observed.cashflow,
      scheduledNet30: round(scheduledNet30),
      interpretation: 'Open accounting receivables minus payables due within 30 days; not a bank cash balance.',
    },
    margin: {
      assessedItems: marginRows.length,
      leakageCount: marginLeakage.length,
      leakage: marginLeakage.slice(0, 20),
    },
    demand: {
      assessedInventory: observed.stockItems.length,
      replenishment,
    },
    findings,
  };
};
