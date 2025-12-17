import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import toast from 'react-hot-toast';
import {
  ShoppingCart, CreditCard, FileText, Package, TrendingDown, TrendingUp,
  Plus, Calendar, Building2, AlertTriangle, CheckCircle
} from 'lucide-react';

export default function DashboardDistributorPage() {
  const { isDark } = useThemeStore();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'delivered'>('all');

  const stats = [
    {
      title: 'Total Pembelian',
      value: 'Rp 87.200.000',
      change: '-5,2%',
      trend: 'down',
      icon: ShoppingCart,
      color: 'blue'
    },
    {
      title: 'Hutang Supplier',
      value: 'Rp 27.800.000',
      sub: 'Dari 12 supplier',
      badge: '3 jatuh tempo',
      icon: CreditCard,
      color: 'red'
    },
    {
      title: 'Purchase Orders',
      value: '8 PO Aktif',
      sub: '3 pending • 5 approved',
      progress: 62,
      icon: FileText,
      color: 'purple'
    },
    {
      title: 'Level Stok',
      value: 'Healthy',
      sub: '2 item low stock',
      status: 'good',
      icon: Package,
      color: 'emerald'
    }
  ];

  const allPurchaseOrders = [
    { id: 'PO-2025-001', supplier: 'PT Supplier A', items: 12, total: 15500000, status: 'Pending' },
    { id: 'PO-2025-002', supplier: 'PT Berkah Jaya', items: 8, total: 4200000, status: 'Approved' },
    { id: 'PO-2025-003', supplier: 'CV Maju Terus', items: 25, total: 22100000, status: 'Delivered' },
    { id: 'PO-2025-004', supplier: 'PT Supplier A', items: 5, total: 2500000, status: 'Pending' },
    { id: 'PO-2025-005', supplier: 'PT Jaya Makmur', items: 10, total: 8500000, status: 'Approved' },
    { id: 'PO-2025-006', supplier: 'CV Sentosa', items: 15, total: 12000000, status: 'Delivered' },
  ];

  const purchaseOrders = useMemo(() => {
    if (activeTab === 'all') return allPurchaseOrders;
    return allPurchaseOrders.filter(order =>
      order.status.toLowerCase() === activeTab
    );
  }, [activeTab]);

  const handleCreatePO = () => {
    toast.success('Fitur Buat PO akan segera tersedia');
    // navigate('/accounting/distributor/pembelian/create');
  };

  const handlePayment = (supplier: string, amount: number) => {
    toast.success(`Pembayaran ke ${supplier} sebesar Rp ${amount.toLocaleString('id-ID')} diproses`);
  };

  const topSuppliers = [
    { name: 'PT Supplier A', items: 45, amount: 25500000 },
    { name: 'PT Berkah Jaya', items: 32, amount: 18200000 },
    { name: 'CV Maju Terus', items: 12, amount: 8100000 },
  ];

  const paymentSchedule = [
    { supplier: 'PT Supplier B', invoice: 'Inv #99281', amount: 8500000, dueDate: '18', dueMonth: 'DEC', urgent: true },
    { supplier: 'CV Sentosa', invoice: 'Inv #99292', amount: 6700000, dueDate: '24', dueMonth: 'DEC', urgent: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
            <ShoppingCart className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Dashboard Distributor</h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Kelola pembelian dan supplier</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className={`flex items-center rounded-lg p-1 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
            {(['today', 'week', 'month'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900 shadow'
                    : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
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
                stat.color === 'red' ? isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600' :
                stat.color === 'purple' ? isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600' :
                isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              }`}>
                <stat.icon className="w-5 h-5" />
              </div>
              {stat.change && (
                <span className={`text-sm font-medium flex items-center gap-1 ${stat.trend === 'down' ? 'text-red-500' : 'text-emerald-500'}`}>
                  {stat.trend === 'down' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {stat.change}
                </span>
              )}
              {stat.status === 'good' && (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              )}
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.title}</p>
            <p className={`text-xl font-bold ${stat.status === 'good' ? 'text-emerald-500' : isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>

            {stat.sub && (
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{stat.sub}</p>
            )}
            {stat.badge && (
              <span className="inline-block mt-2 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-600">
                {stat.badge}
              </span>
            )}
            {stat.progress !== undefined && (
              <div className="mt-3 flex items-center gap-2">
                <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                  <div className="h-full rounded-full bg-purple-500" style={{ width: `${stat.progress}%` }} />
                </div>
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.progress}%</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Purchase Orders Table */}
        <div className={`lg:col-span-2 p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Purchase Orders Terbaru</h2>
            <div className="flex items-center gap-2">
              {/* Tabs */}
              <div className={`flex items-center rounded-lg p-1 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                {(['all', 'pending', 'approved', 'delivered'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? isDark ? 'bg-slate-600 text-white' : 'bg-white text-gray-900 shadow'
                        : isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    {tab === 'all' ? 'Semua' : tab === 'pending' ? 'Pending' : tab === 'approved' ? 'Approved' : 'Delivered'}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCreatePO}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
              >
                <Plus className="w-4 h-4" />
                Buat PO
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <th className="pb-3 font-medium">PO NUMBER</th>
                  <th className="pb-3 font-medium">SUPPLIER</th>
                  <th className="pb-3 font-medium">ITEMS</th>
                  <th className="pb-3 font-medium">TOTAL</th>
                  <th className="pb-3 font-medium">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {purchaseOrders.map((order) => (
                  <tr key={order.id} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
                    <td className={`py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{order.id}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm">
                          {order.supplier.charAt(0)}
                        </div>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>{order.supplier}</span>
                      </div>
                    </td>
                    <td className={`py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>📦 {order.items} items</td>
                    <td className={`py-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Rp {order.total.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'Pending' ? 'bg-yellow-100 text-yellow-600' :
                        order.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' :
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
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Top Suppliers */}
          <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Top Suppliers</h2>
              <button className={`p-1 rounded ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                •••
              </button>
            </div>
            <div className="space-y-4">
              {topSuppliers.map((supplier, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm">
                      {supplier.name.charAt(0)}
                    </div>
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{supplier.name}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{supplier.items} items ordered</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Rp {(supplier.amount / 1000000).toFixed(1)}M
                    </p>
                    <div className={`h-1 w-16 rounded-full mt-1 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${(supplier.amount / 25500000) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Schedule */}
          <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Jadwal Pembayaran</h2>
            </div>
            <div className="space-y-4">
              {paymentSchedule.map((payment, idx) => (
                <div key={idx} className={`p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <div className="text-center">
                      <p className="text-red-500 text-xs font-medium">{payment.dueMonth}</p>
                      <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{payment.dueDate}</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{payment.supplier}</p>
                        {payment.urgent && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">2 hari</span>
                        )}
                      </div>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{payment.invoice}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Rp {payment.amount.toLocaleString('id-ID')}
                        </p>
                        {payment.urgent ? (
                          <button
                            onClick={() => handlePayment(payment.supplier, payment.amount)}
                            className="px-3 py-1 rounded-lg bg-blue-500 text-white text-sm font-medium"
                          >
                            Pay
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate('/accounting/distributor/keuangan')}
                            className={`px-3 py-1 rounded-lg border text-sm font-medium ${isDark ? 'border-slate-600 text-gray-300' : 'border-gray-200 text-gray-600'}`}
                          >
                            Detail
                          </button>
                        )}
                      </div>
                    </div>
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
