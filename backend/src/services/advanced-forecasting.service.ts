import prisma from '../utils/prisma';

/**
 * Advanced Forecasting Service
 * - Holt-Winters Triple Exponential Smoothing (Seasonality)
 * - ARIMA-style forecasting
 * - Seasonal Decomposition
 * - Ensemble Methods (combining multiple models)
 * - Confidence Intervals
 * - Anomaly Detection
 */

// ============= STATISTICAL HELPERS =============

/**
 * Calculate Mean
 */
const mean = (data: number[]): number => {
  if (data.length === 0) return 0;
  return data.reduce((a, b) => a + b, 0) / data.length;
};

/**
 * Calculate Standard Deviation
 */
const standardDeviation = (data: number[]): number => {
  if (data.length < 2) return 0;
  const avg = mean(data);
  const squareDiffs = data.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squareDiffs));
};

/**
 * Calculate Median
 */
const median = (data: number[]): number => {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Calculate Percentile
 */
const percentile = (data: number[], p: number): number => {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
};

/**
 * Calculate Autocorrelation
 */
const autocorrelation = (data: number[], lag: number): number => {
  if (data.length <= lag) return 0;
  const n = data.length;
  const avg = mean(data);
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n - lag; i++) {
    numerator += (data[i] - avg) * (data[i + lag] - avg);
  }
  for (let i = 0; i < n; i++) {
    denominator += Math.pow(data[i] - avg, 2);
  }

  return denominator === 0 ? 0 : numerator / denominator;
};

// ============= ADVANCED ALGORITHMS =============

/**
 * Simple Moving Average (SMA)
 */
const simpleMovingAverage = (data: number[], window: number): number[] => {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(data[i]);
    } else {
      const slice = data.slice(i - window + 1, i + 1);
      result.push(mean(slice));
    }
  }
  return result;
};

/**
 * Exponential Moving Average (EMA)
 */
const exponentialMovingAverage = (data: number[], alpha: number = 0.3): number[] => {
  if (data.length === 0) return [];
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
};

/**
 * Weighted Moving Average (WMA)
 */
const weightedMovingAverage = (data: number[], weights: number[]): number[] => {
  const result: number[] = [];
  const windowSize = weights.length;
  const weightSum = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      result.push(data[i]);
    } else {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += data[i - windowSize + 1 + j] * weights[j];
      }
      result.push(sum / weightSum);
    }
  }
  return result;
};

/**
 * Linear Regression with confidence
 */
const linearRegression = (data: number[]): {
  slope: number;
  intercept: number;
  r2: number;
  standardError: number;
  predictions: number[];
} => {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0, standardError: 0, predictions: [] };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
    sumY2 += data[i] * data[i];
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared and Standard Error
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  const predictions: number[] = [];

  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    predictions.push(predicted);
    ssTot += Math.pow(data[i] - yMean, 2);
    ssRes += Math.pow(data[i] - predicted, 2);
  }

  const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
  const standardError = Math.sqrt(ssRes / Math.max(1, n - 2));

  return { slope, intercept, r2, standardError, predictions };
};

/**
 * Holt-Winters Triple Exponential Smoothing
 * Handles trend AND seasonality
 */
const holtWinters = (
  data: number[],
  seasonLength: number = 7, // Weekly seasonality
  alpha: number = 0.3,      // Level smoothing
  beta: number = 0.1,       // Trend smoothing
  gamma: number = 0.2,      // Seasonal smoothing
  forecastPeriods: number = 30
): {
  fitted: number[];
  forecast: number[];
  level: number;
  trend: number;
  seasonal: number[];
  mape: number;
} => {
  const n = data.length;
  if (n < seasonLength * 2) {
    // Not enough data for seasonality, fall back to double exponential
    return holtLinear(data, alpha, beta, forecastPeriods);
  }

  // Initialize level and trend
  let level = mean(data.slice(0, seasonLength));
  let trend = (mean(data.slice(seasonLength, seasonLength * 2)) - level) / seasonLength;

  // Initialize seasonal factors
  const seasonal: number[] = [];
  for (let i = 0; i < seasonLength; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i; j < n; j += seasonLength) {
      if (j < seasonLength) {
        sum += data[j] / (level + trend * j);
      } else {
        sum += data[j] / (level + trend * j);
      }
      count++;
    }
    seasonal.push(count > 0 ? sum / count : 1);
  }

  // Normalize seasonal factors
  const seasonalSum = seasonal.reduce((a, b) => a + b, 0);
  for (let i = 0; i < seasonLength; i++) {
    seasonal[i] = seasonal[i] * seasonLength / seasonalSum;
  }

  // Fit the model
  const fitted: number[] = [];
  let prevLevel = level;
  let prevTrend = trend;

  for (let t = 0; t < n; t++) {
    const seasonIndex = t % seasonLength;
    const y = data[t];

    // Update level
    const newLevel = alpha * (y / seasonal[seasonIndex]) + (1 - alpha) * (prevLevel + prevTrend);

    // Update trend
    const newTrend = beta * (newLevel - prevLevel) + (1 - beta) * prevTrend;

    // Update seasonal
    seasonal[seasonIndex] = gamma * (y / newLevel) + (1 - gamma) * seasonal[seasonIndex];

    // Store fitted value
    fitted.push((prevLevel + prevTrend) * seasonal[seasonIndex]);

    prevLevel = newLevel;
    prevTrend = newTrend;
  }

  level = prevLevel;
  trend = prevTrend;

  // Generate forecast
  const forecast: number[] = [];
  for (let h = 1; h <= forecastPeriods; h++) {
    const seasonIndex = (n + h - 1) % seasonLength;
    const predicted = (level + trend * h) * seasonal[seasonIndex];
    forecast.push(Math.max(0, predicted));
  }

  // Calculate MAPE (Mean Absolute Percentage Error)
  let mapeSum = 0;
  let mapeCount = 0;
  for (let i = seasonLength; i < n; i++) {
    if (data[i] !== 0) {
      mapeSum += Math.abs((data[i] - fitted[i]) / data[i]);
      mapeCount++;
    }
  }
  const mape = mapeCount > 0 ? (mapeSum / mapeCount) * 100 : 0;

  return { fitted, forecast, level, trend, seasonal, mape };
};

/**
 * Holt's Linear (Double Exponential Smoothing)
 * For trend without seasonality
 */
const holtLinear = (
  data: number[],
  alpha: number = 0.3,
  beta: number = 0.1,
  forecastPeriods: number = 30
): {
  fitted: number[];
  forecast: number[];
  level: number;
  trend: number;
  seasonal: number[];
  mape: number;
} => {
  const n = data.length;
  if (n < 2) {
    return {
      fitted: [...data],
      forecast: new Array(forecastPeriods).fill(data[0] || 0),
      level: data[0] || 0,
      trend: 0,
      seasonal: [],
      mape: 0
    };
  }

  let level = data[0];
  let trend = data[1] - data[0];
  const fitted: number[] = [level];

  for (let t = 1; t < n; t++) {
    const prevLevel = level;
    level = alpha * data[t] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    fitted.push(prevLevel + trend);
  }

  const forecast: number[] = [];
  for (let h = 1; h <= forecastPeriods; h++) {
    forecast.push(Math.max(0, level + trend * h));
  }

  let mapeSum = 0;
  let mapeCount = 0;
  for (let i = 1; i < n; i++) {
    if (data[i] !== 0) {
      mapeSum += Math.abs((data[i] - fitted[i]) / data[i]);
      mapeCount++;
    }
  }
  const mape = mapeCount > 0 ? (mapeSum / mapeCount) * 100 : 0;

  return { fitted, forecast, level, trend, seasonal: [], mape };
};

/**
 * ARIMA-style Forecasting (Simplified)
 * AR(p) + MA(q) with differencing
 */
const arimaForecast = (
  data: number[],
  p: number = 2,  // AR order
  d: number = 1,  // Differencing
  q: number = 2,  // MA order
  forecastPeriods: number = 30
): {
  forecast: number[];
  confidence: { lower: number[]; upper: number[] };
  aic: number;
} => {
  const n = data.length;
  if (n < p + d + q + 10) {
    // Not enough data, use simple method
    const lr = linearRegression(data);
    const forecast: number[] = [];
    for (let i = 0; i < forecastPeriods; i++) {
      forecast.push(Math.max(0, lr.slope * (n + i) + lr.intercept));
    }
    return {
      forecast,
      confidence: {
        lower: forecast.map(f => Math.max(0, f * 0.8)),
        upper: forecast.map(f => f * 1.2)
      },
      aic: 0
    };
  }

  // Apply differencing
  let diffData = [...data];
  for (let i = 0; i < d; i++) {
    const temp: number[] = [];
    for (let j = 1; j < diffData.length; j++) {
      temp.push(diffData[j] - diffData[j - 1]);
    }
    diffData = temp;
  }

  // Calculate AR coefficients using Yule-Walker approximation
  const arCoeffs: number[] = [];
  for (let i = 1; i <= p; i++) {
    arCoeffs.push(autocorrelation(diffData, i));
  }

  // Calculate residuals and MA coefficients
  const residuals: number[] = [];
  const fitted: number[] = [];
  for (let t = p; t < diffData.length; t++) {
    let predicted = 0;
    for (let i = 0; i < p; i++) {
      predicted += arCoeffs[i] * diffData[t - i - 1];
    }
    fitted.push(predicted);
    residuals.push(diffData[t] - predicted);
  }

  const maCoeffs: number[] = [];
  if (residuals.length > q) {
    for (let i = 1; i <= q; i++) {
      maCoeffs.push(autocorrelation(residuals, i) * 0.5); // Simplified
    }
  }

  // Generate forecast on differenced series
  const diffForecast: number[] = [];
  const extendedDiff = [...diffData];
  const extendedResiduals = [...residuals];

  for (let h = 0; h < forecastPeriods; h++) {
    let predicted = 0;

    // AR component
    for (let i = 0; i < p && i < extendedDiff.length; i++) {
      predicted += arCoeffs[i] * extendedDiff[extendedDiff.length - 1 - i];
    }

    // MA component (decays to 0 for longer horizons)
    for (let i = 0; i < q && i < extendedResiduals.length && h < q; i++) {
      predicted += maCoeffs[i] * extendedResiduals[extendedResiduals.length - 1 - i];
    }

    diffForecast.push(predicted);
    extendedDiff.push(predicted);
    extendedResiduals.push(0); // Unknown future residuals
  }

  // Invert differencing
  let forecast = [...diffForecast];
  for (let i = d - 1; i >= 0; i--) {
    const integrated: number[] = [];
    let lastValue = data[data.length - 1 - i];
    for (const val of forecast) {
      lastValue = lastValue + val;
      integrated.push(lastValue);
    }
    forecast = integrated;
  }

  // Ensure non-negative
  forecast = forecast.map(f => Math.max(0, f));

  // Calculate confidence intervals
  const residualStd = standardDeviation(residuals);
  const confidence = {
    lower: forecast.map((f, i) => Math.max(0, f - 1.96 * residualStd * Math.sqrt(i + 1))),
    upper: forecast.map((f, i) => f + 1.96 * residualStd * Math.sqrt(i + 1))
  };

  // Simplified AIC
  const aic = n * Math.log(residualStd * residualStd || 1) + 2 * (p + q + 1);

  return { forecast, confidence, aic };
};

/**
 * Seasonal Decomposition (STL-like)
 */
const seasonalDecomposition = (
  data: number[],
  seasonLength: number = 7
): {
  trend: number[];
  seasonal: number[];
  residual: number[];
} => {
  const n = data.length;

  // Calculate trend using centered moving average
  const trend: number[] = [];
  const halfWindow = Math.floor(seasonLength / 2);

  for (let i = 0; i < n; i++) {
    if (i < halfWindow || i >= n - halfWindow) {
      trend.push(data[i]);
    } else {
      let sum = 0;
      for (let j = -halfWindow; j <= halfWindow; j++) {
        sum += data[i + j];
      }
      trend.push(sum / seasonLength);
    }
  }

  // Calculate seasonal component
  const detrended = data.map((d, i) => d - trend[i]);
  const seasonalAvg: number[] = new Array(seasonLength).fill(0);
  const seasonalCount: number[] = new Array(seasonLength).fill(0);

  for (let i = 0; i < n; i++) {
    const seasonIndex = i % seasonLength;
    seasonalAvg[seasonIndex] += detrended[i];
    seasonalCount[seasonIndex]++;
  }

  for (let i = 0; i < seasonLength; i++) {
    seasonalAvg[i] = seasonalCount[i] > 0 ? seasonalAvg[i] / seasonalCount[i] : 0;
  }

  // Normalize seasonal
  const seasonalMean = mean(seasonalAvg);
  const normalizedSeasonal = seasonalAvg.map(s => s - seasonalMean);

  const seasonal: number[] = [];
  for (let i = 0; i < n; i++) {
    seasonal.push(normalizedSeasonal[i % seasonLength]);
  }

  // Calculate residual
  const residual = data.map((d, i) => d - trend[i] - seasonal[i]);

  return { trend, seasonal, residual };
};

/**
 * Ensemble Forecast (combines multiple methods)
 */
const ensembleForecast = (
  data: number[],
  forecastPeriods: number = 30,
  seasonLength: number = 7
): {
  forecast: number[];
  confidence: { lower: number[]; upper: number[] };
  components: {
    linearRegression: number[];
    holtWinters: number[];
    arima: number[];
  };
  weights: { lr: number; hw: number; arima: number };
  accuracy: number;
} => {
  // Get forecasts from all methods
  const lr = linearRegression(data);
  const lrForecast: number[] = [];
  for (let i = 0; i < forecastPeriods; i++) {
    lrForecast.push(Math.max(0, lr.slope * (data.length + i) + lr.intercept));
  }

  const hw = holtWinters(data, seasonLength, 0.3, 0.1, 0.2, forecastPeriods);
  const arima = arimaForecast(data, 2, 1, 2, forecastPeriods);

  // Calculate weights based on in-sample accuracy
  const lrMAPE = calculateMAPE(data.slice(-30), lr.predictions.slice(-30));
  const hwMAPE = hw.mape;
  const arimaMAPE = calculateMAPE(data.slice(-30), arima.forecast.slice(0, 30));

  // Inverse MAPE weighting (lower error = higher weight)
  const epsilon = 0.01;
  const invLR = 1 / (lrMAPE + epsilon);
  const invHW = 1 / (hwMAPE + epsilon);
  const invARIMA = 1 / (arimaMAPE + epsilon);
  const totalInv = invLR + invHW + invARIMA;

  const weights = {
    lr: invLR / totalInv,
    hw: invHW / totalInv,
    arima: invARIMA / totalInv
  };

  // Combine forecasts
  const forecast: number[] = [];
  for (let i = 0; i < forecastPeriods; i++) {
    const combined =
      weights.lr * lrForecast[i] +
      weights.hw * hw.forecast[i] +
      weights.arima * arima.forecast[i];
    forecast.push(Math.max(0, combined));
  }

  // Calculate confidence intervals
  const std = standardDeviation(data.slice(-30));
  const confidence = {
    lower: forecast.map((f, i) => Math.max(0, f - 1.5 * std * Math.sqrt((i + 1) / 10))),
    upper: forecast.map((f, i) => f + 1.5 * std * Math.sqrt((i + 1) / 10))
  };

  // Overall accuracy score (0-100)
  const accuracy = Math.max(0, Math.min(100, 100 - (lrMAPE * weights.lr + hwMAPE * weights.hw + arimaMAPE * weights.arima)));

  return {
    forecast,
    confidence,
    components: {
      linearRegression: lrForecast,
      holtWinters: hw.forecast,
      arima: arima.forecast
    },
    weights,
    accuracy
  };
};

/**
 * Calculate MAPE (Mean Absolute Percentage Error)
 */
const calculateMAPE = (actual: number[], predicted: number[]): number => {
  if (actual.length === 0 || predicted.length === 0) return 100;
  const n = Math.min(actual.length, predicted.length);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (actual[i] !== 0) {
      sum += Math.abs((actual[i] - predicted[i]) / actual[i]);
      count++;
    }
  }
  return count > 0 ? (sum / count) * 100 : 100;
};

// ============= ANOMALY DETECTION =============

interface Anomaly {
  date: string;
  value: number;
  expected: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'spike' | 'drop' | 'unusual_pattern';
}

/**
 * Detect anomalies in time series data
 */
const detectAnomalies = (
  data: number[],
  dates: string[],
  threshold: number = 2.5 // Standard deviations
): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  if (data.length < 10) return anomalies;

  // Calculate rolling statistics
  const windowSize = Math.min(14, Math.floor(data.length / 3));

  for (let i = windowSize; i < data.length; i++) {
    const window = data.slice(i - windowSize, i);
    const windowMean = mean(window);
    const windowStd = standardDeviation(window);

    if (windowStd === 0) continue;

    const zScore = Math.abs((data[i] - windowMean) / windowStd);

    if (zScore > threshold) {
      const deviation = ((data[i] - windowMean) / windowMean) * 100;

      let severity: Anomaly['severity'];
      if (zScore > 4) severity = 'critical';
      else if (zScore > 3.5) severity = 'high';
      else if (zScore > 3) severity = 'medium';
      else severity = 'low';

      let type: Anomaly['type'];
      if (data[i] > windowMean) type = 'spike';
      else type = 'drop';

      anomalies.push({
        date: dates[i] || `Day ${i}`,
        value: data[i],
        expected: windowMean,
        deviation,
        severity,
        type
      });
    }
  }

  return anomalies;
};

// ============= FINANCIAL HEALTH SCORE =============

interface FinancialHealthScore {
  overall: number; // 0-100
  components: {
    profitability: number;
    liquidity: number;
    growth: number;
    stability: number;
    efficiency: number;
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

/**
 * Calculate comprehensive financial health score
 */
const calculateFinancialHealth = async (
  tenantId: number,
  outletId?: number
): Promise<FinancialHealthScore> => {
  const whereOutlet = outletId ? `AND outlet_id = ${outletId}` : '';

  // Get key metrics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // Revenue trend
  const revenueData: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      SUM(CASE WHEN gl.transaction_date >= '${thirtyDaysAgo.toISOString()}'
          THEN gl.credit_amount - gl.debit_amount ELSE 0 END) as current_revenue,
      SUM(CASE WHEN gl.transaction_date >= '${sixtyDaysAgo.toISOString()}'
          AND gl.transaction_date < '${thirtyDaysAgo.toISOString()}'
          THEN gl.credit_amount - gl.debit_amount ELSE 0 END) as previous_revenue
    FROM "accounting"."general_ledger" gl
    JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
    WHERE gl.tenant_id = ${tenantId}
    ${whereOutlet}
    AND coa.account_type = 'REVENUE'
  `);

  // Expense trend
  const expenseData: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      SUM(CASE WHEN gl.transaction_date >= '${thirtyDaysAgo.toISOString()}'
          THEN gl.debit_amount - gl.credit_amount ELSE 0 END) as current_expense,
      SUM(CASE WHEN gl.transaction_date >= '${sixtyDaysAgo.toISOString()}'
          AND gl.transaction_date < '${thirtyDaysAgo.toISOString()}'
          THEN gl.debit_amount - gl.credit_amount ELSE 0 END) as previous_expense
    FROM "accounting"."general_ledger" gl
    JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
    WHERE gl.tenant_id = ${tenantId}
    ${whereOutlet}
    AND coa.account_type IN ('EXPENSE', 'COGS')
  `);

  // AR/AP health
  const arApData: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT COALESCE(SUM(balance), 0) FROM "accounting"."accounts_receivable"
       WHERE tenant_id = ${tenantId} AND status != 'paid') as ar_balance,
      (SELECT COALESCE(SUM(balance), 0) FROM "accounting"."accounts_payable"
       WHERE tenant_id = ${tenantId} AND status != 'paid') as ap_balance,
      (SELECT COUNT(*) FROM "accounting"."accounts_receivable"
       WHERE tenant_id = ${tenantId} AND status != 'paid' AND due_date < NOW()) as ar_overdue,
      (SELECT COUNT(*) FROM "accounting"."accounts_payable"
       WHERE tenant_id = ${tenantId} AND status != 'paid' AND due_date < NOW()) as ap_overdue
  `);

  const currentRevenue = Number(revenueData[0]?.current_revenue || 0);
  const previousRevenue = Number(revenueData[0]?.previous_revenue || 0);
  const currentExpense = Number(expenseData[0]?.current_expense || 0);
  const previousExpense = Number(expenseData[0]?.previous_expense || 0);
  const arBalance = Number(arApData[0]?.ar_balance || 0);
  const apBalance = Number(arApData[0]?.ap_balance || 0);
  const arOverdue = Number(arApData[0]?.ar_overdue || 0);
  const apOverdue = Number(arApData[0]?.ap_overdue || 0);

  // Calculate scores
  const currentProfit = currentRevenue - currentExpense;
  const previousProfit = previousRevenue - previousExpense;

  // Profitability (0-100)
  let profitability = 50;
  if (currentRevenue > 0) {
    const profitMargin = (currentProfit / currentRevenue) * 100;
    profitability = Math.min(100, Math.max(0, profitMargin + 50));
  }

  // Liquidity (0-100) - Based on AR/AP ratio
  let liquidity = 50;
  if (apBalance > 0) {
    const ratio = arBalance / apBalance;
    liquidity = Math.min(100, Math.max(0, ratio * 50));
  } else if (arBalance > 0) {
    liquidity = 80;
  }

  // Growth (0-100)
  let growth = 50;
  if (previousRevenue > 0) {
    const revenueGrowth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    growth = Math.min(100, Math.max(0, 50 + revenueGrowth));
  }

  // Stability (0-100) - Based on variance
  let stability = 70;
  if (arOverdue > 5 || apOverdue > 5) stability -= 20;
  if (currentProfit < 0) stability -= 30;

  // Efficiency (0-100) - Expense control
  let efficiency = 50;
  if (previousExpense > 0) {
    const expenseChange = ((currentExpense - previousExpense) / previousExpense) * 100;
    efficiency = Math.min(100, Math.max(0, 50 - expenseChange));
  }

  // Overall score (weighted average)
  const overall = Math.round(
    profitability * 0.25 +
    liquidity * 0.20 +
    growth * 0.25 +
    stability * 0.15 +
    efficiency * 0.15
  );

  // Grade
  let grade: FinancialHealthScore['grade'];
  if (overall >= 80) grade = 'A';
  else if (overall >= 65) grade = 'B';
  else if (overall >= 50) grade = 'C';
  else if (overall >= 35) grade = 'D';
  else grade = 'F';

  // Recommendations
  const recommendations: string[] = [];
  if (profitability < 50) recommendations.push('Tingkatkan margin keuntungan dengan optimasi harga atau kurangi biaya');
  if (liquidity < 50) recommendations.push('Percepat penagihan piutang untuk meningkatkan likuiditas');
  if (growth < 50) recommendations.push('Fokus pada strategi pertumbuhan pendapatan');
  if (stability < 50) recommendations.push('Kurangi piutang/hutang jatuh tempo untuk stabilitas keuangan');
  if (efficiency < 50) recommendations.push('Review pengeluaran dan identifikasi area untuk efisiensi');
  if (arOverdue > 0) recommendations.push(`${arOverdue} piutang sudah jatuh tempo - segera tagih`);
  if (apOverdue > 0) recommendations.push(`${apOverdue} hutang sudah jatuh tempo - segera bayar untuk jaga reputasi`);

  return {
    overall,
    components: {
      profitability: Math.round(profitability),
      liquidity: Math.round(liquidity),
      growth: Math.round(growth),
      stability: Math.round(stability),
      efficiency: Math.round(efficiency)
    },
    grade,
    recommendations: recommendations.slice(0, 5)
  };
};

// ============= MAIN FORECAST FUNCTIONS =============

interface AdvancedForecastResult {
  forecastType: string;
  method: string;
  confidence: number;
  accuracy: number;
  trend: 'up' | 'down' | 'stable';
  trendLabel: string;
  seasonality: 'daily' | 'weekly' | 'monthly' | 'none';
  data: {
    date: string;
    actualValue: number | null;
    predictedValue: number;
    lowerBound: number;
    upperBound: number;
  }[];
  metrics: {
    totalPredicted: number;
    averageDaily: number;
    growthRate: number;
    volatility: number;
  };
  anomalies: Anomaly[];
  modelWeights?: { lr: number; hw: number; arima: number };
}

/**
 * Get Advanced Revenue Forecast
 */
export const getAdvancedRevenueForecast = async (
  tenantId: number,
  outletId?: number,
  forecastDays: number = 30
): Promise<AdvancedForecastResult> => {
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

  const { values, dates } = fillMissingDatesWithDates(historicalData, historicalDays, startDate);

  // Detect seasonality
  const weeklyAC = autocorrelation(values, 7);
  const monthlyAC = autocorrelation(values, 30);
  let seasonLength = 7;
  let seasonality: AdvancedForecastResult['seasonality'] = 'weekly';

  if (Math.abs(monthlyAC) > Math.abs(weeklyAC) && Math.abs(monthlyAC) > 0.3) {
    seasonLength = 30;
    seasonality = 'monthly';
  } else if (Math.abs(weeklyAC) < 0.2) {
    seasonality = 'none';
  }

  // Use ensemble forecast
  const ensemble = ensembleForecast(values, forecastDays, seasonLength);

  // Detect anomalies
  const anomalies = detectAnomalies(values, dates);

  // Determine trend
  const recentMean = mean(values.slice(-14));
  const olderMean = mean(values.slice(-28, -14));
  let trend: 'up' | 'down' | 'stable' = 'stable';
  let trendLabel = 'Stabil';

  if (recentMean > olderMean * 1.05) {
    trend = 'up';
    trendLabel = 'Tren naik';
  } else if (recentMean < olderMean * 0.95) {
    trend = 'down';
    trendLabel = 'Tren turun';
  }

  // Build result data
  const data: AdvancedForecastResult['data'] = [];
  const today = new Date();

  // Add historical data (last 30 days)
  for (let i = Math.max(0, values.length - 30); i < values.length; i++) {
    data.push({
      date: dates[i],
      actualValue: values[i],
      predictedValue: values[i],
      lowerBound: values[i],
      upperBound: values[i]
    });
  }

  // Add forecast data
  for (let i = 0; i < forecastDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i + 1);
    data.push({
      date: date.toISOString().split('T')[0],
      actualValue: null,
      predictedValue: ensemble.forecast[i],
      lowerBound: ensemble.confidence.lower[i],
      upperBound: ensemble.confidence.upper[i]
    });
  }

  const totalPredicted = ensemble.forecast.reduce((a, b) => a + b, 0);
  const averageDaily = totalPredicted / forecastDays;
  const lastMonthAvg = mean(values.slice(-30));
  const growthRate = lastMonthAvg > 0 ? ((averageDaily - lastMonthAvg) / lastMonthAvg) * 100 : 0;
  const volatility = (standardDeviation(values.slice(-30)) / lastMonthAvg) * 100;

  return {
    forecastType: 'revenue',
    method: 'Ensemble (Linear + Holt-Winters + ARIMA)',
    confidence: Math.round(ensemble.accuracy),
    accuracy: Math.round(ensemble.accuracy),
    trend,
    trendLabel,
    seasonality,
    data,
    metrics: {
      totalPredicted,
      averageDaily,
      growthRate,
      volatility
    },
    anomalies,
    modelWeights: ensemble.weights
  };
};

/**
 * Get Advanced Expense Forecast
 */
export const getAdvancedExpenseForecast = async (
  tenantId: number,
  outletId?: number,
  forecastDays: number = 30
): Promise<AdvancedForecastResult> => {
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

  const { values, dates } = fillMissingDatesWithDates(historicalData, historicalDays, startDate);

  const weeklyAC = autocorrelation(values, 7);
  let seasonLength = 7;
  let seasonality: AdvancedForecastResult['seasonality'] = Math.abs(weeklyAC) > 0.2 ? 'weekly' : 'none';

  const ensemble = ensembleForecast(values, forecastDays, seasonLength);
  const anomalies = detectAnomalies(values, dates);

  const recentMean = mean(values.slice(-14));
  const olderMean = mean(values.slice(-28, -14));
  let trend: 'up' | 'down' | 'stable' = 'stable';
  let trendLabel = 'Pengeluaran stabil';

  if (recentMean > olderMean * 1.05) {
    trend = 'up';
    trendLabel = 'Pengeluaran naik';
  } else if (recentMean < olderMean * 0.95) {
    trend = 'down';
    trendLabel = 'Pengeluaran turun';
  }

  const data: AdvancedForecastResult['data'] = [];
  const today = new Date();

  for (let i = Math.max(0, values.length - 30); i < values.length; i++) {
    data.push({
      date: dates[i],
      actualValue: values[i],
      predictedValue: values[i],
      lowerBound: values[i],
      upperBound: values[i]
    });
  }

  for (let i = 0; i < forecastDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i + 1);
    data.push({
      date: date.toISOString().split('T')[0],
      actualValue: null,
      predictedValue: ensemble.forecast[i],
      lowerBound: ensemble.confidence.lower[i],
      upperBound: ensemble.confidence.upper[i]
    });
  }

  const totalPredicted = ensemble.forecast.reduce((a, b) => a + b, 0);
  const averageDaily = totalPredicted / forecastDays;
  const lastMonthAvg = mean(values.slice(-30));
  const growthRate = lastMonthAvg > 0 ? ((averageDaily - lastMonthAvg) / lastMonthAvg) * 100 : 0;
  const volatility = (standardDeviation(values.slice(-30)) / (lastMonthAvg || 1)) * 100;

  return {
    forecastType: 'expense',
    method: 'Ensemble (Linear + Holt-Winters + ARIMA)',
    confidence: Math.round(ensemble.accuracy),
    accuracy: Math.round(ensemble.accuracy),
    trend,
    trendLabel,
    seasonality,
    data,
    metrics: {
      totalPredicted,
      averageDaily,
      growthRate,
      volatility
    },
    anomalies,
    modelWeights: ensemble.weights
  };
};

/**
 * Get Advanced Sales Forecast
 */
export const getAdvancedSalesForecast = async (
  tenantId: number,
  outletId?: number,
  forecastDays: number = 30
): Promise<AdvancedForecastResult> => {
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

  const { values, dates } = fillMissingDatesWithDates(historicalData, historicalDays, startDate);

  const weeklyAC = autocorrelation(values, 7);
  let seasonLength = 7;
  let seasonality: AdvancedForecastResult['seasonality'] = Math.abs(weeklyAC) > 0.2 ? 'weekly' : 'none';

  const ensemble = ensembleForecast(values, forecastDays, seasonLength);
  const anomalies = detectAnomalies(values, dates);

  const recentMean = mean(values.slice(-14));
  const olderMean = mean(values.slice(-28, -14));
  let trend: 'up' | 'down' | 'stable' = 'stable';
  let trendLabel = 'Penjualan stabil';

  if (recentMean > olderMean * 1.05) {
    trend = 'up';
    trendLabel = 'Penjualan naik';
  } else if (recentMean < olderMean * 0.95) {
    trend = 'down';
    trendLabel = 'Penjualan turun';
  }

  const data: AdvancedForecastResult['data'] = [];
  const today = new Date();

  for (let i = Math.max(0, values.length - 30); i < values.length; i++) {
    data.push({
      date: dates[i],
      actualValue: values[i],
      predictedValue: values[i],
      lowerBound: values[i],
      upperBound: values[i]
    });
  }

  for (let i = 0; i < forecastDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i + 1);
    data.push({
      date: date.toISOString().split('T')[0],
      actualValue: null,
      predictedValue: ensemble.forecast[i],
      lowerBound: ensemble.confidence.lower[i],
      upperBound: ensemble.confidence.upper[i]
    });
  }

  const totalPredicted = ensemble.forecast.reduce((a, b) => a + b, 0);
  const averageDaily = totalPredicted / forecastDays;
  const lastMonthAvg = mean(values.slice(-30));
  const growthRate = lastMonthAvg > 0 ? ((averageDaily - lastMonthAvg) / lastMonthAvg) * 100 : 0;
  const volatility = (standardDeviation(values.slice(-30)) / (lastMonthAvg || 1)) * 100;

  return {
    forecastType: 'sales',
    method: 'Ensemble (Linear + Holt-Winters + ARIMA)',
    confidence: Math.round(ensemble.accuracy),
    accuracy: Math.round(ensemble.accuracy),
    trend,
    trendLabel,
    seasonality,
    data,
    metrics: {
      totalPredicted,
      averageDaily,
      growthRate,
      volatility
    },
    anomalies,
    modelWeights: ensemble.weights
  };
};

/**
 * Get Comprehensive Advanced Forecast
 */
export const getAdvancedComprehensiveForecast = async (
  tenantId: number,
  outletId?: number,
  forecastDays: number = 30
) => {
  const [revenue, expense, sales, healthScore] = await Promise.all([
    getAdvancedRevenueForecast(tenantId, outletId, forecastDays),
    getAdvancedExpenseForecast(tenantId, outletId, forecastDays),
    getAdvancedSalesForecast(tenantId, outletId, forecastDays),
    calculateFinancialHealth(tenantId, outletId)
  ]);

  // Calculate profit forecast
  const profitData = revenue.data.map((r, i) => ({
    date: r.date,
    actualValue: r.actualValue !== null && expense.data[i]?.actualValue !== null
      ? r.actualValue - (expense.data[i]?.actualValue || 0)
      : null,
    predictedValue: r.predictedValue - (expense.data[i]?.predictedValue || 0),
    lowerBound: r.lowerBound - (expense.data[i]?.upperBound || 0),
    upperBound: r.upperBound - (expense.data[i]?.lowerBound || 0)
  }));

  const avgConfidence = Math.round((revenue.confidence + expense.confidence + sales.confidence) / 3);

  return {
    revenue,
    expense,
    sales,
    profit: {
      forecastType: 'profit',
      method: 'Derived from Revenue - Expense',
      confidence: avgConfidence,
      accuracy: avgConfidence,
      trend: revenue.trend,
      trendLabel: revenue.metrics.growthRate > expense.metrics.growthRate ? 'Laba naik' : 'Laba tertekan',
      seasonality: revenue.seasonality,
      data: profitData,
      metrics: {
        totalPredicted: revenue.metrics.totalPredicted - expense.metrics.totalPredicted,
        averageDaily: revenue.metrics.averageDaily - expense.metrics.averageDaily,
        growthRate: revenue.metrics.growthRate - expense.metrics.growthRate,
        volatility: Math.max(revenue.metrics.volatility, expense.metrics.volatility)
      },
      anomalies: []
    },
    healthScore,
    overallConfidence: avgConfidence,
    allAnomalies: [
      ...revenue.anomalies.map(a => ({ ...a, category: 'revenue' })),
      ...expense.anomalies.map(a => ({ ...a, category: 'expense' })),
      ...sales.anomalies.map(a => ({ ...a, category: 'sales' }))
    ]
  };
};

// ============= HELPER FUNCTIONS =============

function fillMissingDatesWithDates(
  data: any[],
  days: number,
  startDate: Date
): { values: number[]; dates: string[] } {
  const values: number[] = [];
  const dates: string[] = [];

  const dateMap = new Map<string, number>();
  for (const row of data) {
    const dateStr = new Date(row.date).toISOString().split('T')[0];
    dateMap.set(dateStr, Number(row.net_amount || 0));
  }

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dates.push(dateStr);
    values.push(dateMap.get(dateStr) || 0);
  }

  return { values, dates };
}

export default {
  // Core forecasts
  getAdvancedRevenueForecast,
  getAdvancedExpenseForecast,
  getAdvancedSalesForecast,
  getAdvancedComprehensiveForecast,

  // Health & Analytics
  calculateFinancialHealth,
  detectAnomalies,

  // Statistical utilities
  ensembleForecast,
  holtWinters,
  arimaForecast,
  seasonalDecomposition
};
