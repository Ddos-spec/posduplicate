import { useState } from 'react';
import { useThemeStore } from '../../../store/themeStore';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Info, ArrowRight } from 'lucide-react';
import DemoLayout from '../DemoLayout';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Bar, Legend, ReferenceLine
} from 'recharts';

type ForecastVariant = 'owner' | 'retail' | 'distributor' | 'produsen';

// Advanced Dummy Data per Variant
const DATA_BY_VARIANT = {
  owner: [ // Revenue Trend (Steady Growth)
    { month: 'Jan', actual: 4000, forecast: 4000, lower: 3800, upper: 4200 },
    { month: 'Feb', actual: 4200, forecast: 4200, lower: 4000, upper: 4400 },
    { month: 'Mar', actual: 4100, forecast: 4100, lower: 3900, upper: 4300 },
    { month: 'Apr', actual: 4500, forecast: 4500, lower: 4300, upper: 4700 },
    { month: 'May', actual: 4800, forecast: 4800, lower: 4600, upper: 5000 },
    { month: 'Jun', actual: 5200, forecast: 5200, lower: 5000, upper: 5400 },
    { month: 'Jul', actual: 5500, forecast: 5500, lower: 5300, upper: 5700 },
    { month: 'Aug', actual: null, forecast: 5800, lower: 5500, upper: 6100 },
    { month: 'Sep', actual: null, forecast: 6200, lower: 5800, upper: 6600 },
    { month: 'Oct', actual: null, forecast: 6500, lower: 6000, upper: 7000 },
    { month: 'Nov', actual: null, forecast: 7000, lower: 6500, upper: 7500 },
    { month: 'Dec', actual: null, forecast: 7500, lower: 7000, upper: 8000 },
  ],
  retail: [ // Sales Transaction Trend (Seasonal/Volatile)
    { month: 'Jan', actual: 1200, forecast: 1200, lower: 1100, upper: 1300 },
    { month: 'Feb', actual: 1100, forecast: 1100, lower: 1000, upper: 1200 },
    { month: 'Mar', actual: 1300, forecast: 1300, lower: 1200, upper: 1400 },
    { month: 'Apr', actual: 1500, forecast: 1500, lower: 1400, upper: 1600 }, // Lebaran Effect
    { month: 'May', actual: 1250, forecast: 1250, lower: 1150, upper: 1350 },
    { month: 'Jun', actual: 1300, forecast: 1300, lower: 1200, upper: 1400 },
    { month: 'Jul', actual: 1400, forecast: 1400, lower: 1300, upper: 1500 },
    { month: 'Aug', actual: null, forecast: 1450, lower: 1300, upper: 1600 },
    { month: 'Sep', actual: null, forecast: 1350, lower: 1200, upper: 1500 },
    { month: 'Oct', actual: null, forecast: 1500, lower: 1300, upper: 1700 },
    { month: 'Nov', actual: null, forecast: 1600, lower: 1400, upper: 1800 },
    { month: 'Dec', actual: null, forecast: 2000, lower: 1800, upper: 2200 }, // Holiday
  ],
  distributor: [ // Purchase/Stock Trend (Lumpy/Big Batches)
    { month: 'Jan', actual: 8000, forecast: 8000, lower: 7500, upper: 8500 },
    { month: 'Feb', actual: 6000, forecast: 6000, lower: 5500, upper: 6500 },
    { month: 'Mar', actual: 7500, forecast: 7500, lower: 7000, upper: 8000 },
    { month: 'Apr', actual: 9000, forecast: 9000, lower: 8500, upper: 9500 },
    { month: 'May', actual: 6500, forecast: 6500, lower: 6000, upper: 7000 },
    { month: 'Jun', actual: 7000, forecast: 7000, lower: 6500, upper: 7500 },
    { month: 'Jul', actual: 8500, forecast: 8500, lower: 8000, upper: 9000 },
    { month: 'Aug', actual: null, forecast: 8000, lower: 7000, upper: 9000 },
    { month: 'Sep', actual: null, forecast: 8200, lower: 7200, upper: 9200 },
    { month: 'Oct', actual: null, forecast: 9500, lower: 8500, upper: 10500 },
    { month: 'Nov', actual: null, forecast: 10000, lower: 9000, upper: 11000 },
    { month: 'Dec', actual: null, forecast: 12000, lower: 10000, upper: 14000 },
  ],
  produsen: [ // Production Output (Capacity ramp up)
    { month: 'Jan', actual: 500, forecast: 500, lower: 480, upper: 520 },
    { month: 'Feb', actual: 520, forecast: 520, lower: 500, upper: 540 },
    { month: 'Mar', actual: 550, forecast: 550, lower: 530, upper: 570 },
    { month: 'Apr', actual: 580, forecast: 580, lower: 560, upper: 600 },
    { month: 'May', actual: 600, forecast: 600, lower: 580, upper: 620 },
    { month: 'Jun', actual: 650, forecast: 650, lower: 630, upper: 670 },
    { month: 'Jul', actual: 700, forecast: 700, lower: 680, upper: 720 },
    { month: 'Aug', actual: null, forecast: 750, lower: 700, upper: 800 },
    { month: 'Sep', actual: null, forecast: 800, lower: 750, upper: 850 },
    { month: 'Oct', actual: null, forecast: 850, lower: 800, upper: 900 }, // New machine effect
    { month: 'Nov', actual: null, forecast: 900, lower: 850, upper: 950 },
    { month: 'Dec', actual: null, forecast: 950, lower: 900, upper: 1000 },
  ]
};

const CHART_TITLES = {
  owner: 'Proyeksi Pendapatan (Revenue)',
  retail: 'Proyeksi Transaksi Penjualan',
  distributor: 'Proyeksi Nilai Stok Masuk',
  produsen: 'Proyeksi Output Produksi (Unit)'
};

const INSIGHTS = {
  owner: [
    "Pendapatan diprediksi naik 15% di Q4 karena tren liburan akhir tahun.",
    "Cash flow aman untuk 6 bulan ke depan, disarankan investasi ke cabang baru.",
    "Pengeluaran operasional stabil, efisiensi terjaga di angka 92%."
  ],
  retail: [
    "Stok 'Kemeja' perlu ditambah 20% bulan depan untuk menghindari stockout.",
    "Traffic pelanggan diprediksi memuncak di akhir pekan minggu ke-3.",
    "Potensi cross-selling produk aksesoris meningkat."
  ],
  distributor: [
    "Permintaan dari Retail A meningkat drastis, siapkan armada tambahan.",
    "Optimalkan rute pengiriman wilayah Barat untuk hemat BBM 10%.",
    "Waspada piutang macet sebesar 5% dari total invoice bulan lalu."
  ],
  produsen: [
    "Maintenance mesin disarankan minggu depan sebelum peak production.",
    "Bahan baku 'Tepung' akan naik harga, segera lakukan kontrak pembelian.",
    "Output produksi diprediksi mencapai kapasitas maksimal di bulan November."
  ]
};

const SCENARIOS = [
  { label: 'Optimistic', value: '+20% Growth', color: 'text-green-500' },
  { label: 'Realistic', value: '+12% Growth', color: 'text-blue-500' },
  { label: 'Pessimistic', value: '+5% Growth', color: 'text-orange-500' },
];

export default function DemoForecastPage({ variant = 'owner' }: { variant: ForecastVariant }) {
  const { isDark } = useThemeStore();
  const [scenario, setScenario] = useState('Realistic');

  const insights = INSIGHTS[variant];
  const chartData = DATA_BY_VARIANT[variant];
  const chartTitle = CHART_TITLES[variant];
  
  // Map internal variant to layout variant
  const layoutVariant = variant === 'owner' ? 'accounting' : variant === 'produsen' ? 'producer' : variant;

  return (
    <DemoLayout variant={layoutVariant as any} title="AI Financial Forecast">
      <div className="p-6 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Sparkles className="w-6 h-6 text-purple-500" />
              AI Financial Forecast
            </h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
              Prediksi cerdas berbasis data historis & tren pasar.
            </p>
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Skenario:</span>
            <select 
              value={scenario} 
              onChange={(e) => setScenario(e.target.value)}
              className={`bg-transparent font-semibold focus:outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              {SCENARIOS.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Main Forecast Chart */}
        <div className={`p-6 rounded-2xl shadow-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{chartTitle}</h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Historis</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Prediksi AI</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-200"></span>
                <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Rentang (Confidence)</span>
              </div>
            </div>
          </div>

          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <defs>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" stroke={isDark ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => variant === 'produsen' || variant === 'retail' ? `${value.toLocaleString()} Unit/Trx` : `Rp ${value.toLocaleString()}`}
                />
                
                {/* Confidence Interval (Area) */}
                <Area 
                  type="monotone" 
                  dataKey="upper" 
                  stroke="none" 
                  fill="#8b5cf6" 
                  fillOpacity={0.1} 
                />
                
                {/* Historical Data (Line) */}
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#3b82f6' }}
                  connectNulls 
                />

                {/* Forecast Data (Line) */}
                <Line 
                  type="monotone" 
                  dataKey="forecast" 
                  stroke="#8b5cf6" 
                  strokeWidth={3} 
                  strokeDasharray="5 5" 
                  dot={{ r: 4, fill: '#8b5cf6' }}
                />
                
                <ReferenceLine x="Jul" stroke="gray" strokeDasharray="3 3" label={{ position: 'top',  value: 'Hari Ini', fill: 'gray', fontSize: 12 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights & Metrics */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* AI Insights Panel */}
          <div className={`lg:col-span-2 p-6 rounded-2xl shadow-lg border relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-white to-purple-50 border-purple-100'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-32 h-32 text-purple-600" />
            </div>
            
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              <Info className="w-5 h-5 text-purple-500" />
              Rekomendasi Cerdas (AI Insights)
            </h3>
            
            <div className="space-y-4 relative z-10">
              {insights.map((insight, idx) => (
                <div key={idx} className={`p-4 rounded-xl flex gap-4 items-start ${isDark ? 'bg-slate-700/50' : 'bg-white shadow-sm'}`}>
                  <div className="mt-1">
                    {idx === 0 ? <TrendingUp className="w-5 h-5 text-green-500" /> : 
                     idx === 1 ? <AlertCircle className="w-5 h-5 text-blue-500" /> : 
                     <TrendingDown className="w-5 h-5 text-orange-500" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      {insight}
                    </p>
                    <button className="text-xs text-purple-500 font-bold mt-2 flex items-center gap-1 hover:underline">
                      Lihat Detail <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="space-y-6">
            {SCENARIOS.map((s, idx) => (
              <div key={idx} className={`p-5 rounded-xl shadow border flex justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                <div>
                  <p className={`text-xs uppercase tracking-wider font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Skenario {s.label}
                  </p>
                  <p className={`text-xl font-bold mt-1 ${s.color}`}>
                    {s.value}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                  <div className={`w-3 h-3 rounded-full ${s.color.replace('text-', 'bg-')}`}></div>
                </div>
              </div>
            ))}
            
            <div className={`p-5 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center gap-3 ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-purple-200 bg-purple-50/50'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Confidence Level
              </p>
              <div className="text-4xl font-black text-purple-600">85%</div>
              <p className="text-xs text-gray-500">Akurasi prediksi sangat tinggi berdasarkan data 12 bulan terakhir.</p>
            </div>
          </div>
        </div>

      </div>
    </DemoLayout>
  );
}