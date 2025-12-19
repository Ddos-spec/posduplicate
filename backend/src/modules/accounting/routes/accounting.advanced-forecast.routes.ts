import express, { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import advancedForecast from '../../../services/advanced-forecasting.service';

const router = express.Router();

// All routes require authentication and tenant
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @route GET /api/accounting/forecast/advanced/revenue
 * @desc Get advanced revenue forecast with ensemble methods
 */
router.get('/revenue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, days = 30 } = req.query;

    const forecast = await advancedForecast.getAdvancedRevenueForecast(
      tenantId,
      outletId ? Number(outletId) : undefined,
      Number(days)
    );

    res.json({
      success: true,
      data: {
        ...forecast,
        metrics: {
          ...forecast.metrics,
          totalPredictedFormatted: formatCurrency(forecast.metrics.totalPredicted),
          averageDailyFormatted: formatCurrency(forecast.metrics.averageDaily),
          growthRateFormatted: `${forecast.metrics.growthRate.toFixed(1)}%`,
          volatilityFormatted: `${forecast.metrics.volatility.toFixed(1)}%`
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/accounting/forecast/advanced/expense
 * @desc Get advanced expense forecast with ensemble methods
 */
router.get('/expense', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, days = 30 } = req.query;

    const forecast = await advancedForecast.getAdvancedExpenseForecast(
      tenantId,
      outletId ? Number(outletId) : undefined,
      Number(days)
    );

    res.json({
      success: true,
      data: {
        ...forecast,
        metrics: {
          ...forecast.metrics,
          totalPredictedFormatted: formatCurrency(forecast.metrics.totalPredicted),
          averageDailyFormatted: formatCurrency(forecast.metrics.averageDaily),
          growthRateFormatted: `${forecast.metrics.growthRate.toFixed(1)}%`,
          volatilityFormatted: `${forecast.metrics.volatility.toFixed(1)}%`
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/accounting/forecast/advanced/sales
 * @desc Get advanced sales forecast with ensemble methods
 */
router.get('/sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, days = 30 } = req.query;

    const forecast = await advancedForecast.getAdvancedSalesForecast(
      tenantId,
      outletId ? Number(outletId) : undefined,
      Number(days)
    );

    res.json({
      success: true,
      data: {
        ...forecast,
        metrics: {
          ...forecast.metrics,
          totalPredictedFormatted: formatCurrency(forecast.metrics.totalPredicted),
          averageDailyFormatted: formatCurrency(forecast.metrics.averageDaily),
          growthRateFormatted: `${forecast.metrics.growthRate.toFixed(1)}%`,
          volatilityFormatted: `${forecast.metrics.volatility.toFixed(1)}%`
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/accounting/forecast/advanced/comprehensive
 * @desc Get comprehensive advanced forecast (all types + health score)
 */
router.get('/comprehensive', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, days = 30 } = req.query;

    const forecast = await advancedForecast.getAdvancedComprehensiveForecast(
      tenantId,
      outletId ? Number(outletId) : undefined,
      Number(days)
    );

    res.json({
      success: true,
      data: {
        summary: {
          confidence: forecast.overallConfidence,
          method: 'Ensemble (Linear + Holt-Winters + ARIMA)',
          healthGrade: forecast.healthScore.grade,
          healthScore: forecast.healthScore.overall
        },
        revenue: {
          total: formatCurrency(forecast.revenue.metrics.totalPredicted),
          trend: forecast.revenue.trend,
          confidence: forecast.revenue.confidence,
          growthRate: `${forecast.revenue.metrics.growthRate.toFixed(1)}%`
        },
        expense: {
          total: formatCurrency(forecast.expense.metrics.totalPredicted),
          trend: forecast.expense.trend,
          confidence: forecast.expense.confidence,
          growthRate: `${forecast.expense.metrics.growthRate.toFixed(1)}%`
        },
        profit: {
          total: formatCurrency(forecast.profit.metrics.totalPredicted),
          trend: forecast.profit.trend,
          trendLabel: forecast.profit.trendLabel
        },
        healthScore: forecast.healthScore,
        anomalies: forecast.allAnomalies.slice(0, 10),
        charts: {
          revenue: forecast.revenue.data,
          expense: forecast.expense.data,
          profit: forecast.profit.data,
          sales: forecast.sales.data
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/accounting/forecast/advanced/health
 * @desc Get financial health score only
 */
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId } = req.query;

    const healthScore = await advancedForecast.calculateFinancialHealth(
      tenantId,
      outletId ? Number(outletId) : undefined
    );

    res.json({
      success: true,
      data: {
        ...healthScore,
        description: getHealthDescription(healthScore.grade),
        componentDescriptions: {
          profitability: `Kemampuan menghasilkan laba: ${healthScore.components.profitability}%`,
          liquidity: `Kemampuan memenuhi kewajiban jangka pendek: ${healthScore.components.liquidity}%`,
          growth: `Pertumbuhan bisnis: ${healthScore.components.growth}%`,
          stability: `Stabilitas keuangan: ${healthScore.components.stability}%`,
          efficiency: `Efisiensi operasional: ${healthScore.components.efficiency}%`
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/accounting/forecast/advanced/custom
 * @desc Run custom forecast with specified parameters
 */
router.post('/custom', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const {
      type = 'revenue',
      outletId,
      days = 30,
      method = 'ensemble',
      seasonLength = 7
    } = req.body;

    let forecast;

    switch (type) {
      case 'revenue':
        forecast = await advancedForecast.getAdvancedRevenueForecast(tenantId, outletId, days);
        break;
      case 'expense':
        forecast = await advancedForecast.getAdvancedExpenseForecast(tenantId, outletId, days);
        break;
      case 'sales':
        forecast = await advancedForecast.getAdvancedSalesForecast(tenantId, outletId, days);
        break;
      default:
        forecast = await advancedForecast.getAdvancedRevenueForecast(tenantId, outletId, days);
    }

    res.json({
      success: true,
      data: {
        ...forecast,
        parameters: {
          type,
          days,
          method,
          seasonLength
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/accounting/forecast/advanced/compare
 * @desc Compare forecast methods
 */
router.get('/compare', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, days = 30, type = 'revenue' } = req.query;

    // Get forecast using different methods to compare
    let forecast;
    switch (type) {
      case 'expense':
        forecast = await advancedForecast.getAdvancedExpenseForecast(tenantId, outletId ? Number(outletId) : undefined, Number(days));
        break;
      case 'sales':
        forecast = await advancedForecast.getAdvancedSalesForecast(tenantId, outletId ? Number(outletId) : undefined, Number(days));
        break;
      default:
        forecast = await advancedForecast.getAdvancedRevenueForecast(tenantId, outletId ? Number(outletId) : undefined, Number(days));
    }

    // Since we use ensemble, show the weights of each method
    const methodComparison = forecast.modelWeights ? {
      linearRegression: {
        weight: `${(forecast.modelWeights.lr * 100).toFixed(1)}%`,
        description: 'Metode sederhana, cocok untuk tren linear'
      },
      holtWinters: {
        weight: `${(forecast.modelWeights.hw * 100).toFixed(1)}%`,
        description: 'Triple exponential smoothing, cocok untuk data musiman'
      },
      arima: {
        weight: `${(forecast.modelWeights.arima * 100).toFixed(1)}%`,
        description: 'Autoregressive integrated moving average, cocok untuk pola kompleks'
      }
    } : null;

    res.json({
      success: true,
      data: {
        ensemble: {
          confidence: forecast.confidence,
          accuracy: forecast.accuracy,
          seasonality: forecast.seasonality
        },
        methodComparison,
        recommendation: getMethodRecommendation(forecast.modelWeights, forecast.seasonality)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2)}M`;
  } else if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  } else if (value >= 1000) {
    return `Rp ${(value / 1000).toFixed(0)}rb`;
  }
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function getHealthDescription(grade: string): string {
  switch (grade) {
    case 'A':
      return 'Kesehatan keuangan sangat baik. Bisnis dalam kondisi prima.';
    case 'B':
      return 'Kesehatan keuangan baik. Ada beberapa area yang bisa ditingkatkan.';
    case 'C':
      return 'Kesehatan keuangan cukup. Perlu perhatian pada beberapa metrik.';
    case 'D':
      return 'Kesehatan keuangan kurang. Perlu tindakan perbaikan segera.';
    case 'F':
      return 'Kesehatan keuangan kritis. Butuh intervensi mendesak.';
    default:
      return 'Tidak dapat menentukan status kesehatan keuangan.';
  }
}

function getMethodRecommendation(
  weights: { lr: number; hw: number; arima: number } | undefined,
  seasonality: string
): string {
  if (!weights) return 'Gunakan metode Ensemble untuk hasil terbaik.';

  const maxWeight = Math.max(weights.lr, weights.hw, weights.arima);

  if (maxWeight === weights.hw && seasonality !== 'none') {
    return 'Data Anda menunjukkan pola musiman yang kuat. Metode Holt-Winters memberikan kontribusi terbesar untuk akurasi prediksi.';
  } else if (maxWeight === weights.arima) {
    return 'Data Anda memiliki pola kompleks. Metode ARIMA memberikan kontribusi terbesar untuk akurasi prediksi.';
  } else if (maxWeight === weights.lr) {
    return 'Data Anda menunjukkan tren linear. Metode Linear Regression memberikan kontribusi terbesar untuk akurasi prediksi.';
  }

  return 'Metode Ensemble menggabungkan kekuatan semua model untuk prediksi optimal.';
}

export default router;
