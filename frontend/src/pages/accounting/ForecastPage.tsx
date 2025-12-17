import { useThemeStore } from '../../store/themeStore';
import { Sparkles, TrendingUp } from 'lucide-react';

type ForecastVariant = 'owner' | 'retail' | 'distributor' | 'produsen';

type ForecastMetric = {
  label: string;
  value: string;
};

type ForecastConfig = {
  title: string;
  subtitle: string;
  confidence: number;
  trendLabel: string;
  metrics: ForecastMetric[];
  trend: number[];
};

const forecastByVariant: Record<ForecastVariant, ForecastConfig> = {
  owner: {
    title: 'Forecast',
    subtitle: 'Prediksi 30 hari ke depan berdasarkan tren terbaru.',
    confidence: 72,
    trendLabel: 'Tren naik',
    metrics: [
      { label: 'Prediksi Pendapatan', value: 'Rp 1.35M' },
      { label: 'Prediksi Pengeluaran', value: 'Rp 480jt' },
      { label: 'Prediksi Laba Bersih', value: 'Rp 870jt' }
    ],
    trend: [32, 38, 44, 48, 52, 50, 56, 60, 64, 68, 72, 76]
  },
  retail: {
    title: 'Forecast Retail',
    subtitle: 'Proyeksi penjualan dan transaksi untuk 30 hari ke depan.',
    confidence: 68,
    trendLabel: 'Penjualan stabil',
    metrics: [
      { label: 'Prediksi Penjualan', value: 'Rp 620jt' },
      { label: 'Prediksi Transaksi', value: '1.240 transaksi' },
      { label: 'Prediksi Margin', value: '18%' }
    ],
    trend: [28, 34, 39, 41, 45, 47, 50, 53, 57, 60, 62, 65]
  },
  distributor: {
    title: 'Forecast Distributor',
    subtitle: 'Estimasi pembelian, stok, dan arus kas bulan berjalan.',
    confidence: 70,
    trendLabel: 'Stok menipis',
    metrics: [
      { label: 'Prediksi Pembelian', value: 'Rp 410jt' },
      { label: 'Stok Kritis', value: '12 item' },
      { label: 'Hutang Jatuh Tempo', value: 'Rp 95jt' }
    ],
    trend: [26, 30, 35, 38, 42, 46, 49, 51, 55, 58, 61, 64]
  },
  produsen: {
    title: 'Forecast Produsen',
    subtitle: 'Estimasi output produksi dan kebutuhan bahan baku.',
    confidence: 66,
    trendLabel: 'Produksi naik',
    metrics: [
      { label: 'Output Produksi', value: '1.850 unit' },
      { label: 'Bahan Baku Aman', value: '21 hari' },
      { label: 'Estimasi WIP', value: '12 batch' }
    ],
    trend: [24, 28, 32, 36, 40, 44, 48, 52, 56, 58, 60, 62]
  }
};

type ForecastPageProps = {
  variant?: ForecastVariant;
};

export default function ForecastPage({ variant = 'owner' }: ForecastPageProps) {
  const { isDark } = useThemeStore();
  const forecast = forecastByVariant[variant];

  return (
    <div className="space-y-6">
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

      <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-600'}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Forecast</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Confidence {forecast.confidence}%
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
            <div key={metric.label}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{metric.label}</p>
              <p className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 h-14 flex items-end gap-1">
          {forecast.trend.map((value, idx) => (
            <div
              key={idx}
              className={`flex-1 rounded-t ${isDark ? 'bg-purple-500/70' : 'bg-purple-500/60'}`}
              style={{ height: `${value}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
