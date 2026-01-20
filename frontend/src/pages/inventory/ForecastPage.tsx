import { useThemeStore } from '../../store/themeStore';
import { MOCK_FORECAST_DATA } from './mockInventoryData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { CloudRain, Sun, Info } from 'lucide-react';

export default function ForecastPage() {
  const { isDark } = useThemeStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Smart Forecast</h1>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Analisis prediksi kebutuhan bahan baku berbasis AI (Mock).</p>
      </div>

      {/* Main Chart Card */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Prediksi Demand Mingguan</h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">
                        <Info size={12} /> Confidence Level: 85%
                    </span>
                </div>
            </div>
            <select className={`px-4 py-2 rounded-lg text-sm border outline-none ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                <option>Semua Kategori</option>
                <option>Bahan Baku (Kopi/Susu)</option>
                <option>Kemasan</option>
            </select>
        </div>

        <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_FORECAST_DATA} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
                    <ReferenceLine x="Jumat" stroke="red" strokeDasharray="3 3" label={{ position: 'top', value: 'Today', fill: 'red', fontSize: 12 }} />
                    <Line type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} name="Real Usage" />
                    <Line type="monotone" dataKey="predicted" stroke="#a855f7" strokeWidth={3} strokeDasharray="5 5" dot={{r:4}} name="AI Forecast" />
                </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Insights / Weather Impact (FnB Specific) */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Faktor Dampak (AI Insights)</h3>
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                        <Sun size={24} />
                    </div>
                    <div>
                        <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Cuaca Panas</p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Prediksi penjualan Es Kopi & Minuman Dingin naik 15%.</p>
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
            </div>
        </div>

        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Saran Stok</h3>
            <ul className="space-y-3">
                <li className={`flex justify-between items-center text-sm p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Siapkan <strong>+5kg Kopi Arabika</strong> untuk Weekend.</span>
                    <span className="text-green-500 font-bold">+5kg</span>
                </li>
                <li className={`flex justify-between items-center text-sm p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Kurangi stok <strong>Roti</strong> (Tren menurun).</span>
                    <span className="text-red-500 font-bold">-20%</span>
                </li>
            </ul>
        </div>
      </div>
    </div>
  );
}
