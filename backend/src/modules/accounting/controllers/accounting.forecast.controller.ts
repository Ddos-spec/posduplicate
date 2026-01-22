import { Request, Response, NextFunction } from 'express';
import {
  getRevenueForecast,
  getExpenseForecast,
  getSalesForecast,
  getComprehensiveForecast,
  getInventoryForecast
} from '../../../services/forecasting.service';

/**
 * Get Owner Dashboard Forecast (Comprehensive)
 * Returns revenue, expense, sales, and profit forecasts
 */
export const getOwnerForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, days = 30 } = req.query;

    const forecast = await getComprehensiveForecast(
      tenantId,
      outletId ? Number(outletId) : undefined,
      Number(days)
    );

    res.json({
      success: true,
      data: {
        title: 'Forecast',
        subtitle: `Prediksi ${days} hari ke depan berdasarkan tren terbaru.`,
        confidence: forecast.overallConfidence,
        trendLabel: forecast.profit.trendLabel,
        metrics: [
          {
            label: 'Prediksi Pendapatan',
            value: formatCurrency(forecast.revenue.metrics.totalPredicted),
            trend: forecast.revenue.trend
          },
          {
            label: 'Prediksi Pengeluaran',
            value: formatCurrency(forecast.expense.metrics.totalPredicted),
            trend: forecast.expense.trend
          },
          {
            label: 'Prediksi Laba Bersih',
            value: formatCurrency(forecast.profit.metrics.totalPredicted),
            trend: forecast.profit.trend
          }
        ],
        charts: {
          revenue: forecast.revenue.data,
          expense: forecast.expense.data,
          profit: forecast.profit.data
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Retail Forecast
 * Focus on sales and transaction projections
 */
export const getRetailForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, days = 30 } = req.query;

    const salesForecast = await getSalesForecast(
      tenantId,
      outletId ? Number(outletId) : undefined,
      Number(days)
    );

    // Calculate transaction count estimate
    const avgTransactionValue = salesForecast.metrics.averageDaily / 50; // Assume avg 50 transactions/day baseline
    const estimatedTransactionCount = Math.round(salesForecast.metrics.totalPredicted / Math.max(avgTransactionValue, 50000));

    // Estimate margin (industry average ~18-25% for retail)
    const estimatedMargin = 18 + (salesForecast.trend === 'up' ? 2 : salesForecast.trend === 'down' ? -1 : 0);

    res.json({
      success: true,
      data: {
        title: 'Forecast Retail',
        subtitle: `Proyeksi penjualan dan transaksi untuk ${days} hari ke depan.`,
        confidence: salesForecast.confidence,
        trendLabel: salesForecast.trendLabel,
        metrics: [
          {
            label: 'Prediksi Penjualan',
            value: formatCurrency(salesForecast.metrics.totalPredicted),
            trend: salesForecast.trend
          },
          {
            label: 'Prediksi Transaksi',
            value: `${estimatedTransactionCount.toLocaleString()} transaksi`,
            trend: salesForecast.trend
          },
          {
            label: 'Prediksi Margin',
            value: `${estimatedMargin}%`,
            trend: salesForecast.trend === 'up' ? 'up' : 'stable'
          }
        ],
        charts: {
          sales: salesForecast.data
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Distributor Forecast
 * Focus on purchasing, stock, and cash flow
 */
export const getDistributorForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, days = 30 } = req.query;

    const [expenseForecast, inventoryForecast] = await Promise.all([
      getExpenseForecast(tenantId, outletId ? Number(outletId) : undefined, Number(days)),
      getInventoryForecast(tenantId, outletId ? Number(outletId) : undefined, Number(days))
    ]);

    // Get accounts payable due soon
    const apDueSoon = await getAPDueSoon(tenantId);

    res.json({
      success: true,
      data: {
        title: 'Forecast Distributor',
        subtitle: `Estimasi pembelian, stok, dan arus kas ${days} hari ke depan.`,
        confidence: Math.round((expenseForecast.confidence + inventoryForecast.confidence) / 2),
        trendLabel: inventoryForecast.metrics.daysOfStockRemaining < 14 ? 'Stok menipis' : 'Stok aman',
        metrics: [
          {
            label: 'Prediksi Pembelian',
            value: formatCurrency(expenseForecast.metrics.totalPredicted),
            trend: expenseForecast.trend
          },
          {
            label: 'Stok Kritis',
            value: `${inventoryForecast.metrics.lowStockItemCount} item`,
            trend: inventoryForecast.metrics.lowStockItemCount > 10 ? 'down' : 'stable'
          },
          {
            label: 'Hutang Jatuh Tempo',
            value: formatCurrency(apDueSoon),
            trend: 'stable'
          }
        ],
        charts: {
          expense: expenseForecast.data
        },
        inventory: inventoryForecast.metrics
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Produsen (Manufacturer) Forecast
 * Focus on production output and raw material
 */
export const getProdusenForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, days = 30 } = req.query;

    const inventoryForecast = await getInventoryForecast(
      tenantId,
      outletId ? Number(outletId) : undefined,
      Number(days)
    );

    // Estimate production output based on historical consumption
    const avgDailyConsumption = inventoryForecast.metrics.predictedConsumption30Days / 30;
    // Assume 1 unit of finished goods per X units of raw material consumption (simplified)
    const estimatedProductionUnits = Math.round(avgDailyConsumption / 10000 * 30); // Rough estimate
    const rawMaterialDays = inventoryForecast.metrics.daysOfStockRemaining;
    const estimatedWIPBatches = Math.round(estimatedProductionUnits / 150); // Assume 150 units per batch

    res.json({
      success: true,
      data: {
        title: 'Forecast Produsen',
        subtitle: `Estimasi output produksi dan kebutuhan bahan baku ${days} hari ke depan.`,
        confidence: inventoryForecast.confidence,
        trendLabel: inventoryForecast.trend === 'up' ? 'Produksi naik' : 'Produksi stabil',
        metrics: [
          {
            label: 'Output Produksi',
            value: `${estimatedProductionUnits.toLocaleString()} unit`,
            trend: inventoryForecast.trend
          },
          {
            label: 'Bahan Baku Aman',
            value: `${rawMaterialDays} hari`,
            trend: rawMaterialDays > 21 ? 'up' : rawMaterialDays < 7 ? 'down' : 'stable'
          },
          {
            label: 'Estimasi WIP',
            value: `${estimatedWIPBatches} batch`,
            trend: 'stable'
          }
        ],
        inventory: inventoryForecast.metrics
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Raw Forecast Data (for charts)
 */
export const getForecastData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { type = 'revenue', outletId, days = 30 } = req.query;

    let forecast;
    switch (type) {
      case 'revenue':
        forecast = await getRevenueForecast(tenantId, outletId ? Number(outletId) : undefined, Number(days));
        break;
      case 'expense':
        forecast = await getExpenseForecast(tenantId, outletId ? Number(outletId) : undefined, Number(days));
        break;
      case 'sales':
        forecast = await getSalesForecast(tenantId, outletId ? Number(outletId) : undefined, Number(days));
        break;
      case 'inventory':
        forecast = await getInventoryForecast(tenantId, outletId ? Number(outletId) : undefined, Number(days));
        break;
      default:
        forecast = await getRevenueForecast(tenantId, outletId ? Number(outletId) : undefined, Number(days));
    }

    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    next(error);
  }
};

// ============= HELPER FUNCTIONS =============

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2)}M`;
  } else if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(0)}jt`;
  } else if (value >= 1000) {
    return `Rp ${(value / 1000).toFixed(0)}rb`;
  }
  return `Rp ${value.toFixed(0)}`;
}

async function getAPDueSoon(tenantId: number): Promise<number> {
  const prisma = (await import('../../../utils/prisma')).default;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const result: any[] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(balance), 0) as total
    FROM "accounting"."accounts_payable"
    WHERE tenant_id = ${tenantId}
    AND status != 'paid'
    AND due_date <= ${dueDate}
  `;

  return Number(result[0]?.total || 0);
}
