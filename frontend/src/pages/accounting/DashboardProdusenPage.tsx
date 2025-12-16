import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import {
  Factory, Layers, ClipboardList, Package, CheckCircle, AlertTriangle,
  Plus, Calendar, Building2, TrendingUp
} from 'lucide-react';

export default function DashboardProdusenPage() {
  const { isDark } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'completed'>('active');

  const stats = [
    {
      title: 'Produksi Hari Ini',
      value: '450',
      unit: 'unit',
      progress: 90,
      target: 500,
      status: 'on-track',
      color: 'blue'
    },
    {
      title: 'Bahan Baku Tersedia',
      value: '85%',
      warning: '3 bahan menipis',
      color: 'yellow'
    },
    {
      title: 'Work Orders Aktif',
      value: '12',
      unit: 'WO',
      sub: '8 progress • 4 pending',
      progress: 67,
      color: 'purple'
    },
    {
      title: 'Barang Jadi',
      value: '1.250',
      unit: 'unit',
      sub: 'Est. Value: Rp 125M',
      status: 'ready',
      color: 'emerald'
    }
  ];

  const workOrders = [
    { id: 'WO-2025-045', product: 'Product Alpha', quantity: 100, progress: 75, date: '14 Des', estDate: '18 Des' },
    { id: 'WO-2025-046', product: 'Snack Pack B', quantity: 500, progress: 25, date: '15 Des', estDate: '20 Des' },
    { id: 'WO-2025-047', product: 'Flour Mix XL', quantity: 200, progress: 10, date: '16 Des', estDate: '22 Des' },
  ];

  const materials = [
    { name: 'Tepung Terigu', used: 50, left: 200, unit: 'kg', status: 'normal' },
    { name: 'Gula Halus', used: null, left: null, unit: null, status: 'low' },
    { name: 'Telur Ayam', used: 12, left: 45, unit: 'trays', status: 'normal' },
  ];

  const timeline = [
    { id: '#045', days: [true, true, true, true, false] },
    { id: '#046', days: [false, true, true, false, false] },
    { id: '#047', days: [false, false, true, true, false] },
    { id: '#048', days: [false, false, false, true, true] },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
            <Factory className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Dashboard Produsen</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                PRODUSEN
              </span>
            </div>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Kelola produksi dan manufaktur harian anda</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Calendar className="w-4 h-4" />
            16 Des 2025
          </button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Building2 className="w-4 h-4" />
            Outlet: Pusat
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
                stat.color === 'blue' ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600' :
                stat.color === 'yellow' ? isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600' :
                stat.color === 'purple' ? isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600' :
                isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {stat.color === 'blue' ? <Factory className="w-5 h-5" /> :
                 stat.color === 'yellow' ? <Layers className="w-5 h-5" /> :
                 stat.color === 'purple' ? <ClipboardList className="w-5 h-5" /> :
                 <CheckCircle className="w-5 h-5" />}
              </div>
              {stat.status === 'on-track' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-600">On Track</span>
              )}
              {stat.status === 'ready' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-600">Ready</span>
              )}
              {stat.progress !== undefined && stat.status !== 'on-track' && (
                <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.progress}%</span>
              )}
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.title}</p>
            <div className="flex items-baseline gap-1">
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
              {stat.unit && <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{stat.unit}</span>}
            </div>

            {stat.target && (
              <>
                <div className={`mt-2 h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${stat.progress}%` }} />
                </div>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Target: {stat.target} unit ({stat.progress}%)
                </p>
              </>
            )}
            {stat.warning && (
              <p className="text-sm mt-1 text-yellow-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {stat.warning}
              </p>
            )}
            {stat.sub && !stat.target && (
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{stat.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Work Orders Table */}
        <div className={`lg:col-span-2 p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Work Orders Produksi</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Monitor status dan progres pesanan</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600">
              <Plus className="w-4 h-4" />
              Buat Work Order
            </button>
          </div>

          {/* Tabs */}
          <div className={`flex items-center rounded-lg p-1 mb-4 w-fit ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
            {(['active', 'pending', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? isDark ? 'bg-slate-600 text-white' : 'bg-white text-gray-900 shadow'
                    : isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {tab === 'active' ? 'Active (12)' : tab === 'pending' ? 'Pending (4)' : 'Completed (45)'}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <th className="pb-3 font-medium">WO NUMBER</th>
                  <th className="pb-3 font-medium">PRODUCT</th>
                  <th className="pb-3 font-medium">QUANTITY</th>
                  <th className="pb-3 font-medium">PROGRESS</th>
                  <th className="pb-3 font-medium">DATE</th>
                  <th className="pb-3 font-medium">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {workOrders.map((order) => (
                  <tr key={order.id} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
                    <td className={`py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{order.id}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-100'} flex items-center justify-center`}>
                          📦
                        </div>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>{order.product}</span>
                      </div>
                    </td>
                    <td className={`py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{order.quantity} unit</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-16 h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                          <div
                            className={`h-full rounded-full ${
                              order.progress >= 70 ? 'bg-blue-500' :
                              order.progress >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${order.progress}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${
                          order.progress >= 70 ? 'text-blue-500' :
                          order.progress >= 30 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {order.progress}%
                        </span>
                      </div>
                    </td>
                    <td className={`py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      <div>
                        <p>{order.date}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Est. {order.estDate}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <button className={`p-1 rounded ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                        ⋮
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Timeline Produksi</h2>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Next 5 Days</span>
            </div>

            {/* Days header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-12" />
              {['Today', '17', '18', '19', '20'].map((day, idx) => (
                <div key={idx} className={`flex-1 text-center text-xs ${idx === 0 ? 'bg-purple-500 text-white rounded px-2 py-1' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Timeline rows */}
            {timeline.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <span className={`w-12 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{row.id}</span>
                {row.days.map((active, dayIdx) => (
                  <div key={dayIdx} className="flex-1 h-6">
                    {active && (
                      <div className={`h-full rounded ${
                        dayIdx === 0 ? 'bg-blue-500' :
                        dayIdx === 1 ? 'bg-yellow-500' :
                        dayIdx === 2 ? 'bg-purple-500' :
                        'bg-gray-400'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Materials Usage */}
          <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Penggunaan Bahan</h2>
              <button className="text-sm text-purple-500 hover:text-purple-400">+ Tambah</button>
            </div>
            <div className="space-y-4">
              {materials.map((material, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={isDark ? 'text-white' : 'text-gray-900'}>{material.name}</span>
                    {material.status === 'low' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-red-500 text-sm">Low Stock</span>
                        <button className="px-2 py-0.5 rounded bg-red-500 text-white text-xs">Order</button>
                      </div>
                    ) : (
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Used: {material.used}{material.unit}
                      </span>
                    )}
                  </div>
                  {material.status === 'normal' && (
                    <>
                      <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${material.left ? (material.left / (material.left + (material.used || 0))) * 100 : 0}%` }}
                        />
                      </div>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {material.left} {material.unit} left
                      </p>
                    </>
                  )}
                  {material.status === 'low' && (
                    <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                      <div className="h-full rounded-full bg-yellow-500" style={{ width: '15%' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
