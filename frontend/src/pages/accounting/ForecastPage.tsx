import { useThemeStore } from '../../store/themeStore';
import { Sparkles, TrendingUp } from 'lucide-react';

export default function ForecastPage() {
  const { isDark } = useThemeStore();

  const forecast = {
    revenue: 'Rp 1.35M',
    expense: 'Rp 480jt',
    profit: 'Rp 870jt',
    confidence: 72
  };

  const trend = [32, 38, 44, 48, 52, 50, 56, 60, 64, 68, 72, 76];

  return (
    <div className="space-y-6">
      <div>
        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Dashboard / Forecast
        </div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Forecast
        </h1>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Prediksi 30 hari ke depan berdasarkan tren terbaru.
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
            Tren naik
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Prediksi Pendapatan</p>
            <p className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{forecast.revenue}</p>
          </div>
          <div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Prediksi Pengeluaran</p>
            <p className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{forecast.expense}</p>
          </div>
          <div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Prediksi Laba Bersih</p>
            <p className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{forecast.profit}</p>
          </div>
        </div>

        <div className="mt-6 h-14 flex items-end gap-1">
          {trend.map((value, idx) => (
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
