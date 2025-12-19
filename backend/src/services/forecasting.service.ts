import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Forecasting Service
 * - Linear Regression for trend prediction
 * - Moving Average for smoothing
 * - Store predictions in ai_forecast_data
 */

// ============= ALGORITHM HELPERS =============

/**
 * Simple Moving Average
 */
const calculateMovingAverage = (data: number[], window: number): number[] => {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(data[i]); // Not enough data points yet
    } else {
      const slice = data.slice(i - window + 1, i + 1);
      const avg = slice.reduce((a, b) => a + b, 0) / window;
      result.push(avg);
    }
  }
  return result;
};

/**
 * Linear Regression
 * Returns slope (m) and intercept (b) for y = mx + b
 */
const linearRegression = (data: number[]): { slope: number; intercept: number; r2: number } => {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };

  // x = index (0, 1, 2, ...), y = data values
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
    sumY2 += data[i] * data[i];
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared (coefficient of determination)
  const yMean = sumY / n;
  let ssTot = 0;
  let ssRes = 0;

  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssTot += (data[i] - yMean) ** 2;
    ssRes += (data[i] - predicted) ** 2;
  }

  const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

  return { slope, intercept, r2 };
};

/**
 * Predict future values using linear regression
 */
const predictFuture = (
  slope: number,
  intercept: number,
  startIndex: number,
  days: number
): number[] => {
  const predictions: number[] = [];
  for (let i = 0; i < days; i++) {
    const predicted = slope * (startIndex + i) + intercept;
    predictions.push(Math.max(0, predicted)); // No negative values
  }
  return predictions;
};

// ============= MAIN FORECASTING FUNCTIONS =============

interface ForecastDataPoint {
  date: string;
  actualValue: number | null;
  predictedValue: number;
}

interface ForecastResult {
  forecastType: string;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  trendLabel: string;
  data: ForecastDataPoint[];
  metrics: {
    totalPredicted: number;
    averageDaily: number;
    growthRate: number;
  };
}

/**
 * Get Revenue Forecast
 */
export const getRevenueForecast = async (
  tenantId: number,
  outletId?: number,
  forecastDays: number = 30
): Promise<ForecastResult> => {
  // Fetch historical revenue data (last 90 days)
  const historicalDays = 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - historicalDays);

  const whereOutlet = outletId ? `AND gl.outlet_id = ${outletId}` : '';

  const historicalData: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      DATE(gl.transaction_date) as date,
      SUM(gl.credit_amount - gl.debit_amount) as net_amount
    FROM "accounting"."general_ledger" gl
    JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
    WHERE gl.tenant_id = ${tenantId}
    ${whereOutlet}
    AND gl.transaction_date >= '${startDate.toISOString()}'
    AND coa.account_type = 'REVENUE'
    GROUP BY DATE(gl.transaction_date)
    ORDER BY date
  `);

  // Fill missing dates with 0
  const dailyValues = fillMissingDates(historicalData, historicalDays);

  // Apply smoothing
  const smoothed = calculateMovingAverage(dailyValues, 7);

  // Linear regression
  const { slope, intercept, r2 } = linearRegression(smoothed);

  // Predict future
  const predictions = predictFuture(slope, intercept, smoothed.length, forecastDays);

  // Calculate confidence based on R2 and data availability
  const dataQuality = Math.min(1, dailyValues.filter(v => v > 0).length / 30);
  const confidence = Math.round((r2 * 0.6 + dataQuality * 0.4) * 100);

  // Determine trend
  let trend: 'up' | 'down' | 'stable' = 'stable';
  let trendLabel = 'Stabil';

  if (slope > 0.01 * (smoothed[smoothed.length - 1] || 1)) {
    trend = 'up';
    trendLabel = 'Tren naik';
  } else if (slope < -0.01 * (smoothed[smoothed.length - 1] || 1)) {
    trend = 'down';
    trendLabel = 'Tren turun';
  }

  // Build result data
  const data: ForecastDataPoint[] = [];
  const today = new Date();

  // Add last 30 days of actual data
  for (let i = Math.max(0, dailyValues.length - 30); i < dailyValues.length; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    data.push({
      date: date.toISOString().split('T')[0],
      actualValue: dailyValues[i],
      predictedValue: smoothed[i]
    });
  }

  // Add forecast days
  for (let i = 0; i < forecastDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i + 1);
    data.push({
      date: date.toISOString().split('T')[0],
      actualValue: null,
      predictedValue: predictions[i]
    });
  }

  const totalPredicted = predictions.reduce((a, b) => a + b, 0);
  const averageDaily = totalPredicted / forecastDays;
  const lastMonthAvg = dailyValues.slice(-30).reduce((a, b) => a + b, 0) / 30;
  const growthRate = lastMonthAvg > 0 ? ((averageDaily - lastMonthAvg) / lastMonthAvg) * 100 : 0;

  return {
    forecastType: 'revenue',
    confidence,
    trend,
    trendLabel,
    data,
    metrics: {
      totalPredicted,
      averageDaily,
      growthRate
    }
  };
};

/**
 * Get Expense Forecast
 */
export const getExpenseForecast = async (
  tenantId: number,
  outletId?: number,
  forecastDays: number = 30
): Promise<ForecastResult> => {
  const historicalDays = 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - historicalDays);

  const whereOutlet = outletId ? `AND gl.outlet_id = ${outletId}` : '';

  const historicalData: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      DATE(gl.transaction_date) as date,
      SUM(gl.debit_amount - gl.credit_amount) as net_amount
    FROM "accounting"."general_ledger" gl
    JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
    WHERE gl.tenant_id = ${tenantId}
    ${whereOutlet}
    AND gl.transaction_date >= '${startDate.toISOString()}'
    AND coa.account_type IN ('EXPENSE', 'COGS')
    GROUP BY DATE(gl.transaction_date)
    ORDER BY date
  `);

  const dailyValues = fillMissingDates(historicalData, historicalDays);
  const smoothed = calculateMovingAverage(dailyValues, 7);
  const { slope, intercept, r2 } = linearRegression(smoothed);
  const predictions = predictFuture(slope, intercept, smoothed.length, forecastDays);

  const dataQuality = Math.min(1, dailyValues.filter(v => v > 0).length / 30);
  const confidence = Math.round((r2 * 0.6 + dataQuality * 0.4) * 100);

  let trend: 'up' | 'down' | 'stable' = 'stable';
  let trendLabel = 'Stabil';

  if (slope > 0.01 * (smoothed[smoothed.length - 1] || 1)) {
    trend = 'up';
    trendLabel = 'Pengeluaran naik';
  } else if (slope < -0.01 * (smoothed[smoothed.length - 1] || 1)) {
    trend = 'down';
    trendLabel = 'Pengeluaran turun';
  }

  const data: ForecastDataPoint[] = [];
  const today = new Date();

  for (let i = Math.max(0, dailyValues.length - 30); i < dailyValues.length; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    data.push({
      date: date.toISOString().split('T')[0],
      actualValue: dailyValues[i],
      predictedValue: smoothed[i]
    });
  }

  for (let i = 0; i < forecastDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i + 1);
    data.push({
      date: date.toISOString().split('T')[0],
      actualValue: null,
      predictedValue: predictions[i]
    });
  }

  const totalPredicted = predictions.reduce((a, b) => a + b, 0);
  const averageDaily = totalPredicted / forecastDays;
  const lastMonthAvg = dailyValues.slice(-30).reduce((a, b) => a + b, 0) / 30;
  const growthRate = lastMonthAvg > 0 ? ((averageDaily - lastMonthAvg) / lastMonthAvg) * 100 : 0;

  return {
    forecastType: 'expense',
    confidence,
    trend,
    trendLabel,
    data,
    metrics: {
      totalPredicted,
      averageDaily,
      growthRate
    }
  };
};

/**
 * Get Sales Transaction Forecast (from POS data)
 */
export const getSalesForecast = async (
  tenantId: number,
  outletId?: number,
  forecastDays: number = 30
): Promise<ForecastResult> => {
  const historicalDays = 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - historicalDays);

  const whereOutlet = outletId
    ? `AND outlet_id = ${outletId}`
    : `AND outlet_id IN (SELECT id FROM outlets WHERE tenant_id = ${tenantId})`;

  const historicalData: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      DATE(created_at) as date,
      SUM(total) as net_amount
    FROM "transactions"
    WHERE status = 'completed'
    ${whereOutlet}
    AND created_at >= '${startDate.toISOString()}'
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  const dailyValues = fillMissingDates(historicalData, historicalDays);
  const smoothed = calculateMovingAverage(dailyValues, 7);
  const { slope, intercept, r2 } = linearRegression(smoothed);
  const predictions = predictFuture(slope, intercept, smoothed.length, forecastDays);

  const dataQuality = Math.min(1, dailyValues.filter(v => v > 0).length / 30);
  const confidence = Math.round((r2 * 0.6 + dataQuality * 0.4) * 100);

  let trend: 'up' | 'down' | 'stable' = 'stable';
  let trendLabel = 'Penjualan stabil';

  if (slope > 0.01 * (smoothed[smoothed.length - 1] || 1)) {
    trend = 'up';
    trendLabel = 'Penjualan naik';
  } else if (slope < -0.01 * (smoothed[smoothed.length - 1] || 1)) {
    trend = 'down';
    trendLabel = 'Penjualan turun';
  }

  const data: ForecastDataPoint[] = [];
  const today = new Date();

  for (let i = Math.max(0, dailyValues.length - 30); i < dailyValues.length; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    data.push({
      date: date.toISOString().split('T')[0],
      actualValue: dailyValues[i],
      predictedValue: smoothed[i]
    });
  }

  for (let i = 0; i < forecastDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i + 1);
    data.push({
      date: date.toISOString().split('T')[0],
      actualValue: null,
      predictedValue: predictions[i]
    });
  }

  const totalPredicted = predictions.reduce((a, b) => a + b, 0);
  const averageDaily = totalPredicted / forecastDays;
  const lastMonthAvg = dailyValues.slice(-30).reduce((a, b) => a + b, 0) / 30;
  const growthRate = lastMonthAvg > 0 ? ((averageDaily - lastMonthAvg) / lastMonthAvg) * 100 : 0;

  return {
    forecastType: 'sales',
    confidence,
    trend,
    trendLabel,
    data,
    metrics: {
      totalPredicted,
      averageDaily,
      growthRate
    }
  };
};

/**
 * Get Comprehensive Forecast (for Owner dashboard)
 */
export const getComprehensiveForecast = async (
  tenantId: number,
  outletId?: number,
  forecastDays: number = 30
) => {
  const [revenue, expense, sales] = await Promise.all([
    getRevenueForecast(tenantId, outletId, forecastDays),
    getExpenseForecast(tenantId, outletId, forecastDays),
    getSalesForecast(tenantId, outletId, forecastDays)
  ]);

  // Calculate net profit forecast
  const profitData: ForecastDataPoint[] = revenue.data.map((r, i) => ({
    date: r.date,
    actualValue: r.actualValue !== null && expense.data[i]?.actualValue !== null
      ? r.actualValue - (expense.data[i]?.actualValue || 0)
      : null,
    predictedValue: r.predictedValue - (expense.data[i]?.predictedValue || 0)
  }));

  const avgConfidence = Math.round((revenue.confidence + expense.confidence + sales.confidence) / 3);

  return {
    revenue,
    expense,
    sales,
    profit: {
      forecastType: 'profit',
      confidence: avgConfidence,
      trend: revenue.trend,
      trendLabel: revenue.metrics.growthRate > expense.metrics.growthRate ? 'Laba naik' : 'Laba tertekan',
      data: profitData,
      metrics: {
        totalPredicted: revenue.metrics.totalPredicted - expense.metrics.totalPredicted,
        averageDaily: revenue.metrics.averageDaily - expense.metrics.averageDaily,
        growthRate: revenue.metrics.growthRate - expense.metrics.growthRate
      }
    },
    overallConfidence: avgConfidence
  };
};

/**
 * Store Forecast to Database (for historical tracking)
 */
export const storeForecastData = async (
  tenantId: number,
  forecastType: string,
  data: ForecastDataPoint[],
  confidence: number,
  outletId?: number,
  accountId?: number
) => {
  const modelVersion = 'v1.0-linear-ma7';

  // Only store future predictions
  const futureData = data.filter(d => d.actualValue === null);

  for (const point of futureData) {
    await prisma.ai_forecast_data.upsert({
      where: {
        // Need to find existing by composite - use findFirst then update or create
        id: -1 // Force create via upsert fallback
      },
      update: {
        forecast_amount: new Decimal(point.predictedValue),
        confidence_level: new Decimal(confidence),
        model_version: modelVersion
      },
      create: {
        tenant_id: tenantId,
        outlet_id: outletId,
        account_id: accountId,
        forecast_type: forecastType,
        forecast_date: new Date(point.date),
        forecast_amount: new Decimal(point.predictedValue),
        confidence_level: new Decimal(confidence),
        model_version: modelVersion
      }
    });
  }
};

// ============= HELPER FUNCTIONS =============

function fillMissingDates(data: any[], days: number): number[] {
  const result: number[] = new Array(days).fill(0);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const dateMap = new Map<string, number>();
  for (const row of data) {
    const dateStr = new Date(row.date).toISOString().split('T')[0];
    dateMap.set(dateStr, Number(row.net_amount || 0));
  }

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    result[i] = dateMap.get(dateStr) || 0;
  }

  return result;
}

/**
 * Get Inventory Forecast (for Distributor/Produsen)
 */
export const getInventoryForecast = async (
  tenantId: number,
  outletId?: number,
  forecastDays: number = 30
) => {
  // Get stock consumption pattern
  const historicalDays = 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - historicalDays);

  const whereOutlet = outletId
    ? `AND outlet_id = ${outletId}`
    : `AND outlet_id IN (SELECT id FROM outlets WHERE tenant_id = ${tenantId})`;

  // Get daily consumption (OUT movements)
  const consumptionData: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      DATE(created_at) as date,
      SUM(total_cost) as net_amount
    FROM "stock_movements"
    WHERE type = 'OUT'
    ${whereOutlet}
    AND created_at >= '${startDate.toISOString()}'
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  const dailyValues = fillMissingDates(consumptionData, historicalDays);
  const smoothed = calculateMovingAverage(dailyValues, 7);
  const { slope, intercept, r2 } = linearRegression(smoothed);
  const predictions = predictFuture(slope, intercept, smoothed.length, forecastDays);

  // Get current stock value
  const stockValue: any[] = await prisma.$queryRawUnsafe(`
    SELECT SUM(current_stock * cost_amount) as total_value
    FROM "inventory"
    WHERE is_active = true
    ${whereOutlet.replace('outlet_id', 'outlet_id')}
  `);

  // Get low stock items count
  const lowStockItems: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count
    FROM "inventory"
    WHERE is_active = true
    AND alert = true
    AND current_stock <= stock_alert
    ${whereOutlet.replace('outlet_id', 'outlet_id')}
  `);

  const dataQuality = Math.min(1, dailyValues.filter(v => v > 0).length / 30);
  const confidence = Math.round((r2 * 0.6 + dataQuality * 0.4) * 100);

  const avgDailyConsumption = dailyValues.slice(-30).reduce((a, b) => a + b, 0) / 30;
  const currentStockValue = Number(stockValue[0]?.total_value || 0);
  const daysOfStockRemaining = avgDailyConsumption > 0
    ? Math.floor(currentStockValue / avgDailyConsumption)
    : 999;

  return {
    forecastType: 'inventory',
    confidence,
    trend: slope > 0 ? 'up' : slope < 0 ? 'down' : 'stable',
    trendLabel: slope > 0 ? 'Konsumsi naik' : 'Konsumsi stabil',
    metrics: {
      currentStockValue,
      lowStockItemCount: Number(lowStockItems[0]?.count || 0),
      daysOfStockRemaining,
      predictedConsumption30Days: predictions.reduce((a, b) => a + b, 0)
    },
    dailyPredictions: predictions
  };
};

export default {
  getRevenueForecast,
  getExpenseForecast,
  getSalesForecast,
  getComprehensiveForecast,
  getInventoryForecast,
  storeForecastData
};
