import { useState, useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Sparkles, TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle } from 'lucide-react';
import { forecastService, ForecastResponse, ForecastDataPoint } from '../../services/forecastService';

type ForecastVariant = 'owner' | 'retail' | 'distributor' | 'produsen';

type ForecastPageProps = {
  variant?: ForecastVariant;
};

// Fallback data for when API fails or returns empty
const fallbackData: Record<ForecastVariant, ForecastResponse> = {
  owner: {
    title: 'Forecast',
    subtitle: 'Prediksi 30 hari ke depan berdasarkan tren terbaru.',
    confidence: 0,
    trendLabel: 'Menunggu data...',
    metrics: [
      { label: 'Prediksi Pendapatan', value: '-', trend: 'stable' },
      { label: 'Prediksi Pengeluaran', value: '-', trend: 'stable' },
      { label: 'Prediksi Laba Bersih', value: '-', trend: 'stable' }
    ]
  },
  retail: {
    title: 'Forecast Retail',
    subtitle: 'Proyeksi penjualan dan transaksi untuk 30 hari ke depan.',
    confidence: 0,
    trendLabel: 'Menunggu data...',
    metrics: [
      { label: 'Prediksi Penjualan', value: '-', trend: 'stable' },
      { label: 'Prediksi Transaksi', value: '-', trend: 'stable' },
      { label: 'Prediksi Margin', value: '-', trend: 'stable' }
    ]
  },
  distributor: {
    title: 'Forecast Distributor',
    subtitle: 'Estimasi pembelian, stok, dan arus kas bulan berjalan.',
    confidence: 0,
    trendLabel: 'Menunggu data...',
    metrics: [
      { label: 'Prediksi Pembelian', value: '-', trend: 'stable' },
      { label: 'Stok Kritis', value: '-', trend: 'stable' },
      { label: 'Hutang Jatuh Tempo', value: '-', trend: 'stable' }
    ]
  },
  produsen: {
    title: 'Forecast Produsen',
    subtitle: 'Estimasi output produksi dan kebutuhan bahan baku.',
    confidence: 0,
    trendLabel: 'Menunggu data...',
    metrics: [
      { label: 'Output Produksi', value: '-', trend: 'stable' },
      { label: 'Bahan Baku Aman', value: '-', trend: 'stable' },
      { label: 'Estimasi WIP', value: '-', trend: 'stable' }
    ]
  }
};

export default function ForecastPage({ variant = 'owner' }: ForecastPageProps) {
  const { isDark } = useThemeStore();
  const [forecast, setForecast] = useState<ForecastResponse>(fallbackData[variant]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<number[]>([]);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);

    try {
      let data: ForecastResponse;

      switch (variant) {
        case 'owner':
          data = await forecastService.getOwnerForecast({ days: 30 });
          break;
        case 'retail':
          data = await forecastService.getRetailForecast({ days: 30 });
          break;
        case 'distributor':
          data = await forecastService.getDistributorForecast({ days: 30 });
          break;
        case 'produsen':
          data = await forecastService.getProdusenForecast({ days: 30 });
          break;
        default:
          data = await forecastService.getOwnerForecast({ days: 30 });
      }

      setForecast(data);

      // Extract chart data from the response
      if (data.charts) {
        const chartPoints = data.charts.revenue || data.charts.sales || data.charts.expense || data.charts.profit || [];
        const normalizedData = normalizeChartData(chartPoints);
        setChartData(normalizedData);
      }

    } catch (err: any) {
      console.error('Failed to fetch forecast:', err);
      setError(err.response?.data?.message || 'Gagal memuat forecast. Pastikan data transaksi tersedia.');
      setForecast(fallbackData[variant]);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [variant]);

  // Normalize chart data to percentages for display
  const normalizeChartData = (data: ForecastDataPoint[]): number[] => {
    if (!data || data.length === 0) return [];

    // Take last 12 points (or fewer if less available)
    const points = data.slice(-12);
    const values = points.map(p => p.predictedValue || p.actualValue || 0);

    const max = Math.max(...values, 1);
    return values.map(v => Math.round((v / max) * 100));
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-500" />;
      default:
        return <Minus className="w-3 h-3 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return isDark ? 'text-green-400' : 'text-green-600';
    if (confidence >= 40) return isDark ? 'text-yellow-400' : 'text-yellow-600';
    return isDark ? 'text-red-400' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Dashboard / Forecast
          </div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {forecast.title}
          </h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {forecast.subtitle}
          </p>
        </div>
        <button
          onClick={fetchForecast}
          disabled={loading}
          className={`p-2 rounded-lg ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors disabled:opacity-50`}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''} ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </button>
      </div>

      {error && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
          <AlertCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
          <span className={isDark ? 'text-red-300' : 'text-red-700'}>{error}</span>
        </div>
      )}

      <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-600'}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Forecast</h2>
              <p className={`text-sm ${getConfidenceColor(forecast.confidence)}`}>
                {loading ? (
                  <span className="animate-pulse">Memuat...</span>
                ) : (
                  `Confidence ${forecast.confidence}%`
                )}
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            <TrendingUp className="w-3 h-3" />
            {forecast.trendLabel}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {forecast.metrics.map((metric) => (
            <div key={metric.label} className={`p-4 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{metric.label}</p>
                {getTrendIcon(metric.trend)}
              </div>
              <p className={`text-xl font-semibold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {loading ? (
                  <span className="animate-pulse bg-gray-300 rounded w-24 h-6 inline-block" />
                ) : (
                  metric.value
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Trend Chart */}
        <div className="mt-6">
          <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Tren 12 Periode Terakhir
          </p>
          <div className="h-14 flex items-end gap-1">
            {loading ? (
              // Loading skeleton bars
              Array.from({ length: 12 }).map((_, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-t animate-pulse ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`}
                  style={{ height: `${30 + Math.random() * 40}%` }}
                />
              ))
            ) : chartData.length > 0 ? (
              chartData.map((value, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-t transition-all duration-300 ${
                    idx >= chartData.length - (chartData.length > 6 ? Math.floor(chartData.length / 2) : 3)
                      ? isDark ? 'bg-purple-400/80' : 'bg-purple-400/70' // Future predictions lighter
                      : isDark ? 'bg-purple-500/70' : 'bg-purple-500/60'
                  }`}
                  style={{ height: `${Math.max(value, 5)}%` }}
                  title={`${value}%`}
                />
              ))
            ) : (
              // Empty state bars
              Array.from({ length: 12 }).map((_, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-t ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}
                  style={{ height: '20%' }}
                />
              ))
            )}
          </div>
          {chartData.length > 0 && (
            <div className="flex justify-between mt-1">
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Historis</span>
              <span className={`text-xs ${isDark ? 'text-purple-400' : 'text-purple-500'}`}>Prediksi →</span>
            </div>
          )}
        </div>

        {/* Additional Info for specific variants */}
        {variant === 'distributor' && forecast.inventory && (
          <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
            <h3 className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Detail Inventori</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Nilai Stok: </span>
                <span className={isDark ? 'text-white' : 'text-gray-900'}>
                  Rp {(forecast.inventory.currentStockValue / 1000000).toFixed(0)}jt
                </span>
              </div>
              <div>
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Stok Tersisa: </span>
                <span className={isDark ? 'text-white' : 'text-gray-900'}>
                  {forecast.inventory.daysOfStockRemaining} hari
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Source Info */}
      <div className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        * Prediksi menggunakan Linear Regression dan Moving Average berdasarkan data 90 hari terakhir
      </div>
    </div>
  );
}
