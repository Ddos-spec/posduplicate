import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import {
  ShoppingBag, Users, FileText, TrendingUp, Star, Calendar,
  Building2, Plus, Eye
} from 'lucide-react';

export default function DashboardRetailPage() {
  const { isDark } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'today' | 'pending' | 'done'>('today');

  const stats = [
    {
      title: 'Penjualan Hari Ini',
      value: 'Rp 12.500.000',
      change: '+15%',
      sub: '45 transaksi berhasil',
      progress: 85,
      color: 'emerald'
    },
    {
      title: 'Customer Hari Ini',
      value: '38 customer',
      badge: '5 Baru',
      sub: '+33 returning',
      color: 'blue'
    },
    {
      title: 'Piutang Customer',
      value: 'Rp 18.500.000',
      badge: '3 Overdue',
      sub: '12 jatuh tempo minggu ini',
      color: 'orange'
    },
    {
      title: 'Produk Terlaris',
      value: 'Product A',
      trending: true,
      sub: 'Sold: 25 unit | Revenue: Rp 2.5M',
      color: 'yellow'
    }
  ];

  const salesOrders = [
    { id: 'SO-2025-156', customer: 'John Doe', items: 5, total: 1250000, status: 'Lunas' },
    { id: 'SO-2025-155', customer: 'Sarah Smith', items: 2, total: 850000, status: 'Pending' },
    { id: 'SO-2025-154', customer: 'Mike Ross', items: 8, total: 3400000, status: 'Lunas' },
    { id: 'SO-2025-153', customer: 'Elena G', items: 1, total: 150000, status: 'Selesai' },
    { id: 'SO-2025-152', customer: 'Tom H', items: 3, total: 750000, status: 'Lunas' },
  ];

  const topProducts = [
    { name: 'Product A', revenue: 2500000, color: 'emerald' },
    { name: 'Product B', revenue: 1800000, color: 'blue' },
    { name: 'Product C', revenue: 1200000, color: 'orange' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
            <ShoppingBag className={`w-6 h-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Dashboard Retail</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                ● LIVE
              </span>
            </div>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Kelola penjualan dan customer</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Calendar className="w-4 h-4" />
            Hari Ini
          </button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Building2 className="w-4 h-4" />
            Outlet Pusat
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                stat.color === 'emerald' ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600' :
                stat.color === 'blue' ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600' :
                stat.color === 'orange' ? isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600' :
                isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
              }`}>
                {stat.trending ? <Star className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
              </div>
              {stat.change && (
                <span className="text-sm font-medium text-emerald-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {stat.change}
                </span>
              )}
              {stat.badge && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  stat.badge.includes('Overdue') ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {stat.badge}
                </span>
              )}
              {stat.trending && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600">
                  #1 Trending
                </span>
              )}
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.title}</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
            {stat.progress && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Target Harian</span>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{stat.progress}%</span>
                </div>
                <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${stat.progress}%` }} />
                </div>
              </div>
            )}
            {stat.sub && !stat.progress && (
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{stat.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sales Orders Table */}
        <div className={`lg:col-span-2 p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Sales Orders Terbaru</h2>
            <div className="flex items-center gap-2">
              {/* Tabs */}
              <div className={`flex items-center rounded-lg p-1 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                {(['today', 'pending', 'done'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? isDark ? 'bg-slate-600 text-white' : 'bg-white text-gray-900 shadow'
                        : isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    {tab === 'today' ? 'Hari Ini' : tab === 'pending' ? 'Pending' : 'Selesai'}
                  </button>
                ))}
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600">
                <Plus className="w-4 h-4" />
                Buat Order
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <th className="pb-3 font-medium">SO NUMBER</th>
                  <th className="pb-3 font-medium">CUSTOMER</th>
                  <th className="pb-3 font-medium">ITEMS</th>
                  <th className="pb-3 font-medium">TOTAL</th>
                  <th className="pb-3 font-medium">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {salesOrders.map((order) => (
                  <tr key={order.id} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
                    <td className={`py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{order.id}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm">
                          {order.customer.charAt(0)}
                        </div>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>{order.customer}</span>
                      </div>
                    </td>
                    <td className={`py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>📦 {order.items} items</td>
                    <td className={`py-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Rp {order.total.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'Lunas' ? 'bg-emerald-100 text-emerald-600' :
                        order.status === 'Pending' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className={`w-full mt-4 py-2 text-center text-sm font-medium ${isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'}`}>
            View All Orders
          </button>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Top Products */}
          <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Produk Terlaris</h2>
              <button className="text-sm text-emerald-500 hover:text-emerald-400">Lihat Semua</button>
            </div>
            <div className="space-y-4">
              {topProducts.map((product, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-100'} flex items-center justify-center`}>
                        📦
                      </div>
                      <span className={isDark ? 'text-white' : 'text-gray-900'}>{product.name}</span>
                    </div>
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Rp {(product.revenue / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-full rounded-full ${
                        product.color === 'emerald' ? 'bg-emerald-500' :
                        product.color === 'blue' ? 'bg-blue-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${(product.revenue / 2500000) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Insights */}
          <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Customer Insights</h2>
              <button className={`p-1 rounded ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                •••
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Active (30d)</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>180</p>
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loyal (10+)</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>45</p>
              </div>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Avg. Transaction</span>
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Rp 275.000</span>
            </div>
            <button className={`w-full py-2 rounded-lg border text-center font-medium ${isDark ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              Kelola Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
