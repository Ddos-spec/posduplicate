import { useState, useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { MOCK_INVENTORY_STATS, MOCK_ALERTS, MOCK_FORECAST_DATA } from './mockInventoryData';
import { inventoryService, InventoryStats, InventoryAlert, ForecastData } from '../../services/inventoryService';
import {
  AlertTriangle, Package, ShoppingCart, TrendingUp, ArrowRight, XCircle, Clock, Loader2
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Line
} from 'recharts';
import { useNavigate, useLocation } from 'react-router-dom';

const RECENT_ACTIVITIES = [
  { id: 1, user: 'Budi (Gudang)', action: 'Stok Opname: Kopi Arabika', time: '10 mins ago', type: 'adjustment' },
  { id: 2, user: 'Siti (Purchasing)', action: 'PO Created: #PO-2025-001', time: '1 hour ago', type: 'order' },
  { id: 3, user: 'System', action: 'Alert: Susu Low Stock', time: '2 hours ago', type: 'alert' },
  { id: 4, user: 'Andi (Kitchen)', action: 'Usage: 5kg Tepung', time: '3 hours ago', type: 'usage' },
];

export default function InventoryDashboard() {
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isDemo = location.pathname.startsWith('/demo');
  const basePath = isDemo ? '/demo/inventory' : '/inventory';

  // State for API data
  const [loading, setLoading] = useState(!isDemo);
  const [statsData, setStatsData] = useState<InventoryStats>(MOCK_INVENTORY_STATS);
  const [alertsData, setAlertsData] = useState<InventoryAlert[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData[]>(MOCK_FORECAST_DATA);

  // Fetch data from API (non-demo mode)
  useEffect(() => {
    if (isDemo) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const outletId = user?.outlet_id;

        const [statsRes, alertsRes, forecastRes] = await Promise.all([
          inventoryService.getStats(outletId),
          inventoryService.getAlerts(outletId),
          inventoryService.getForecast(outletId, 7)
        ]);

        if (statsRes.success) setStatsData(statsRes.data);
        if (alertsRes.success) setAlertsData(alertsRes.data);
        if (forecastRes.success) setForecastData(forecastRes.data);
      } catch (error) {
        console.error('Failed to fetch inventory data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isDemo, user?.outlet_id]);

  // Map alerts to display format
  const displayAlerts = isDemo ? MOCK_ALERTS : alertsData.map(a => ({
    id: a.id,
    type: a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'info',
    message: a.message,
    item: a.inventory?.name || 'Unknown'
  }));

  const stats = [
    {
      label: 'Nilai Aset Stok',
      value: `Rp ${(statsData.totalValue / 1000000).toFixed(1)} Jt`,
      icon: Package,
      color: 'blue',
      desc: 'Total valuasi gudang saat ini'
    },
    {
      label: 'Avg Days Cover',
      value: `${statsData.avgDaysCover} Hari`,
      icon: Clock,
      color: 'green',
      desc: 'Target aman: 4-5 hari'
    },
    {
      label: 'Low Stock Items',
      value: statsData.lowStockCount,
      icon: AlertTriangle,
      color: 'orange',
      desc: 'Perlu restock segera',
      action: () => navigate(`${basePath}/stock`)
    },
    {
      label: 'PO Pending',
      value: statsData.pendingPO,
      icon: ShoppingCart,
      color: 'purple',
      desc: 'Menunggu approval supplier'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Dashboard Inventory</h1>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Overview kondisi stok dan prediksi kebutuhan.</p>
      </div>

      {/* Critical Alerts */}
      {displayAlerts.filter(a => a.type === 'critical').map((alert, idx) => (
        <div key={idx} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-4 animate-pulse">
          <div className="p-2 bg-red-500 rounded-lg text-white">
            <XCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-red-600 dark:text-red-400">PERHATIAN: Stok Habis!</h3>
            <p className="text-red-700 dark:text-red-300 text-sm mt-1">{alert.message}</p>
          </div>
          <button 
            onClick={() => navigate(`${basePath}/reorder`)}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-red-500/30 transition-all"
          >
            Order Sekarang
          </button>
        </div>
      ))}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            onClick={stat.action}
            className={`p-5 rounded-2xl border transition-all ${stat.action ? 'cursor-pointer hover:scale-[1.02]' : ''} ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${
                stat.color === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                stat.color === 'orange' ? 'bg-orange-500/10 text-orange-500' :
                'bg-purple-500/10 text-purple-500'
              }`}>
                <stat.icon className="w-6 h-6" />
              </div>
              {stat.color === 'orange' && (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
              )}
            </div>
            <h3 className={`text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</h3>
            <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Main Charts Area */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Forecast Chart */}
        <div className={`lg:col-span-2 p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Tren Penggunaan Bahan</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Real vs Prediksi (7 Hari)</p>
            </div>
            <button onClick={() => navigate(`${basePath}/forecast`)} className="text-sm font-bold text-orange-500 flex items-center gap-1 hover:underline">
              Lihat Detail <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#64748b'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
                <Area type="monotone" dataKey="usage" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorUsage)" name="Penggunaan (Unit)" />
                <Line type="monotone" dataKey="predicted" stroke="#a855f7" strokeWidth={3} strokeDasharray="5 5" name="Prediksi AI" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Action / Recommendations */}
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className={`font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Rekomendasi Cerdas</h3>
            <div className="space-y-4">
              {displayAlerts.filter(a => a.type !== 'critical').map((alert, idx) => (
                <div key={idx} className={`p-4 rounded-xl flex gap-3 ${isDark ? 'bg-slate-700/50' : 'bg-orange-50'}`}>
                  <div className="mt-1">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{alert.item}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{alert.message}</p>
                  </div>
                </div>
              ))}
              
              <div className={`p-4 rounded-xl flex gap-3 ${isDark ? 'bg-slate-700/50' : 'bg-green-50'}`}>
                <div className="mt-1">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Weekend Peak!</p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Prediksi demand naik 20% hari Sabtu. Siapkan stok susu lebih banyak.</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => navigate(`${basePath}/reorder`)}
              className="w-full mt-6 py-3 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Buat Purchase Order
            </button>
          </div>

          {/* Activity Log Widget */}
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Aktivitas Terbaru</h3>
              <Clock className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
            <div className="space-y-4">
              {RECENT_ACTIVITIES.map((log) => (
                <div key={log.id} className="flex gap-3 items-start">
                  <div className={`mt-1 w-2 h-2 rounded-full ${
                    log.type === 'alert' ? 'bg-red-500' : 
                    log.type === 'order' ? 'bg-blue-500' : 
                    log.type === 'adjustment' ? 'bg-orange-500' : 'bg-gray-400'
                  }`} />
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{log.action}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{log.user} • {log.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
