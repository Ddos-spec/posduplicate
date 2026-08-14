import { useState, useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { MOCK_FORECAST_DATA } from './mockInventoryData';
import { inventoryService } from '../../services/inventoryService';
import type { ForecastData } from '../../services/inventoryService';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { CloudRain, Sun, Info, Loader2, Database, AlertCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function ForecastPage() {
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const location = useLocation();

  const isDemo = location.pathname.startsWith('/demo');

  const [loading, setLoading] = useState(!isDemo);
  const [forecastData, setForecastData] = useState<ForecastData[]>(isDemo ? MOCK_FORECAST_DATA : []);
  const [forecastSource, setForecastSource] = useState<'demo' | 'database' | 'insufficient_data'>(isDemo ? 'demo' : 'insufficient_data');

  useEffect(() => {
    if (isDemo) return;

    const fetchForecast = async () => {
      try {
        setLoading(true);
        const response = await inventoryService.getForecast(user?.outletId, 7);
        if (response.success) {
          setForecastData(response.data);
          setForecastSource(response.source === 'database' ? 'database' : 'insufficient_data');
        }
      } catch (error) {
        console.error('Failed to fetch forecast:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [isDemo, user?.outletId]);

  const confidenceValues = forecastData
    .map((entry) => entry.confidence)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const averageConfidence = confidenceValues.length
    ? confidenceValues.reduce((total, value) => total + value, 0) / confidenceValues.length
    : null;
  const liveReasons = Array.from(new Set(forecastData.map((entry) => entry.reason.trim()).filter(Boolean)));
  const stockSuggestions = forecastData
    .filter((entry) => entry.usage !== null && entry.predicted > entry.usage)
    .sort((a, b) => (b.predicted - Number(b.usage)) - (a.predicted - Number(a.usage)))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Smart Forecast</h1>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {isDemo ? 'Simulasi forecast untuk pratinjau demo.' : 'Forecast tersimpan dari database operasional; nilai yang belum tersedia tetap ditandai kosong.'}
        </p>
      </div>

      {/* Main Chart Card */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Prediksi Demand Mingguan</h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">
                        {forecastSource === 'database' ? <Database size={12} /> : <Info size={12} />}
                        {isDemo ? 'Demo · confidence 85%' : averageConfidence === null ? 'Confidence tidak tersedia' : `Rata-rata confidence ${averageConfidence.toFixed(1)}%`}
                    </span>
                </div>
            </div>
            <span className={`rounded-lg border px-3 py-2 text-xs font-semibold ${isDark ? 'border-slate-600 text-gray-300' : 'border-gray-200 text-gray-600'}`}>
              Sumber: {forecastSource === 'database' ? 'database' : forecastSource === 'demo' ? 'demo' : 'belum cukup data'}
            </span>
        </div>

        <div className="h-[400px]">
            {forecastData.length === 0 ? (
              <div className={`flex h-full items-center justify-center rounded-xl border border-dashed px-6 text-center text-sm ${isDark ? 'border-slate-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                Belum ada forecast untuk outlet ini. Sistem tidak membuat angka pengganti.
              </div>
            ) : <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#64748b'}} />
                    <Tooltip 
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className={`p-4 rounded-xl shadow-xl border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-100 text-gray-900'}`}>
                                        <p className="font-bold mb-2">{label}</p>
                                        <p className="text-sm text-blue-500">Usage: {data.usage}</p>
                                        <p className="text-sm text-purple-500">Predicted: {data.predicted}</p>
                                        <p className="text-xs text-gray-500 mt-2 italic">"{data.reason}"</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Line type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} name="Real Usage" />
                    <Line type="monotone" dataKey="predicted" stroke="#a855f7" strokeWidth={3} strokeDasharray="5 5" dot={{r:4}} name="AI Forecast" />
                </LineChart>
            </ResponsiveContainer>}
        </div>
      </div>

      {/* Insights / Weather Impact (FnB Specific) */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Faktor Dampak (AI Insights)</h3>
            {isDemo ? <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                        <Sun size={24} />
                    </div>
                    <div>
                        <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Cuaca Panas</p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Prediksi penjualan Es Kopi &amp; Minuman Dingin naik 15%.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                        <CloudRain size={24} />
                    </div>
                    <div>
                        <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Hujan Sore Hari</p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Potensi penurunan traffic dine-in sekitar 10%.</p>
                    </div>
                </div>
            </div> : liveReasons.length > 0 ? (
              <div className="space-y-3">
                {liveReasons.map((reason) => (
                  <div key={reason} className={`flex items-start gap-3 rounded-xl p-4 ${isDark ? 'bg-slate-700/50 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                    <Info size={18} className="mt-0.5 shrink-0 text-blue-500" />
                    <p className="text-sm">{reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`flex items-start gap-3 rounded-xl border border-dashed p-4 text-sm ${isDark ? 'border-slate-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                <AlertCircle size={18} className="mt-0.5 shrink-0" /> Faktor penjelas belum tersedia pada record forecast.
              </div>
            )}
        </div>

        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Saran Stok</h3>
            {isDemo ? <ul className="space-y-3">
                <li className={`flex justify-between items-center text-sm p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Siapkan <strong>+5kg Kopi Arabika</strong> untuk Weekend.</span>
                    <span className="text-green-500 font-bold">+5kg</span>
                </li>
                <li className={`flex justify-between items-center text-sm p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Kurangi stok <strong>Roti</strong> (Tren menurun).</span>
                    <span className="text-red-500 font-bold">-20%</span>
                </li>
            </ul> : stockSuggestions.length > 0 ? (
              <ul className="space-y-3">
                {stockSuggestions.map((entry) => (
                  <li key={`${entry.itemId ?? 'item'}-${entry.date ?? entry.day}`} className={`flex justify-between gap-4 rounded-lg p-3 text-sm ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      {entry.itemName || 'Item tanpa nama'} · {entry.date || entry.day}
                    </span>
                    <span className="shrink-0 font-bold text-amber-600">
                      +{(entry.predicted - Number(entry.usage)).toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`rounded-xl border border-dashed p-4 text-sm ${isDark ? 'border-slate-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                Belum ada selisih demand yang dapat dihitung dari data aktual dan prediksi.
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
