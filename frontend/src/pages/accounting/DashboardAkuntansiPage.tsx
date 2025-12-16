import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, ArrowUpRight, ArrowDownRight,
  Download, Eye, PieChart, Calendar
} from 'lucide-react';

export default function DashboardAkuntansiPage() {
  const { isDark } = useThemeStore();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const stats = [
    {
      title: 'Total Pendapatan',
      value: 'Rp 1.25M',
      change: '+12%',
      trend: 'up',
      icon: DollarSign,
      color: 'emerald'
    },
    {
      title: 'Total Pengeluaran',
      value: 'Rp 450jt',
      change: '-5%',
      trend: 'down',
      icon: TrendingDown,
      color: 'red'
    },
    {
      title: 'Laba Bersih',
      value: 'Rp 800jt',
      change: '+8%',
      trend: 'up',
      icon: TrendingUp,
      color: 'purple'
    },
    {
      title: 'Saldo Kas',
      value: 'Rp 320jt',
      change: '0%',
      trend: 'neutral',
      icon: Wallet,
      color: 'blue'
    }
  ];

  const recentTransactions = [
    { id: 1, date: '15 Des 2025', description: 'Penjualan Produk A', amount: 2500000, type: 'credit' },
    { id: 2, date: '15 Des 2025', description: 'Pembelian Bahan Baku', amount: 1200000, type: 'debit' },
    { id: 3, date: '14 Des 2025', description: 'Pembayaran Gaji', amount: 5000000, type: 'debit' },
    { id: 4, date: '14 Des 2025', description: 'Pendapatan Jasa', amount: 3500000, type: 'credit' },
  ];

  const chartData = [
    { month: 'Jan', income: 850, expense: 320, profit: 530 },
    { month: 'Feb', income: 720, expense: 400, profit: 320 },
    { month: 'Mar', income: 680, expense: 350, profit: 330 },
    { month: 'Apr', income: 590, expense: 280, profit: 310 },
    { month: 'May', income: 780, expense: 420, profit: 360 },
    { month: 'Jun', income: 820, expense: 380, profit: 440 },
    { month: 'Jul', income: 950, expense: 450, profit: 500 },
    { month: 'Aug', income: 880, expense: 400, profit: 480 },
    { month: 'Sep', income: 920, expense: 520, profit: 400 },
    { month: 'Oct', income: 1050, expense: 480, profit: 570 },
    { month: 'Nov', income: 1100, expense: 500, profit: 600 },
    { month: 'Dec', income: 1250, expense: 450, profit: 800 },
  ];

  const maxValue = Math.max(...chartData.map(d => d.income));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span>Dashboard</span>
            <span>›</span>
            <span>Overview</span>
          </div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Dashboard Akuntansi
          </h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Ringkasan keuangan bisnis Anda dan performa terkini.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className={`flex items-center rounded-lg p-1 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? isDark ? 'bg-slate-700 text-white' : 'bg-white text-gray-900 shadow'
                    : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : 'Bulanan'}
              </button>
            ))}
          </div>

          {/* Date Picker */}
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Calendar className="w-4 h-4" />
            Dec 2025
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
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                stat.color === 'red' ? 'bg-red-100 text-red-600' :
                stat.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={`text-sm font-medium flex items-center gap-1 ${
                stat.trend === 'up' ? 'text-emerald-500' :
                stat.trend === 'down' ? 'text-red-500' :
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {stat.trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
                {stat.trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
                {stat.change}
              </span>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.title}</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>

            {/* Mini Chart */}
            <div className="mt-3 h-8 flex items-end gap-0.5">
              {[40, 65, 45, 70, 55, 80, 60, 75, 85, 70, 90, 100].map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${
                    stat.color === 'emerald' ? 'bg-emerald-500' :
                    stat.color === 'red' ? 'bg-red-500' :
                    stat.color === 'purple' ? 'bg-purple-500' :
                    'bg-blue-500'
                  }`}
                  style={{ height: `${h}%`, opacity: 0.3 + (i * 0.05) }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart Section */}
      <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Laporan Laba Rugi</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Analisa pendapatan vs pengeluaran tahun ini</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className={`flex items-center rounded-lg p-1 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
              {(['chart', 'table'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    viewMode === v
                      ? isDark ? 'bg-slate-600 text-white' : 'bg-white text-gray-900 shadow'
                      : isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {v === 'chart' ? 'Chart' : 'Table'}
                </button>
              ))}
            </div>
            <button className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${isDark ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search for transactions, invoices, or help..."
            className={`w-full max-w-md px-4 py-2.5 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
        </div>

        {/* Chart */}
        <div className="h-80 flex items-end gap-2">
          {chartData.map((data, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col gap-1" style={{ height: '280px' }}>
                {/* Income bar */}
                <div
                  className="w-full bg-emerald-500 rounded-t transition-all hover:opacity-80"
                  style={{ height: `${(data.income / maxValue) * 100}%` }}
                />
                {/* Expense bar (overlaid as line) */}
                <div className="relative -mt-1">
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500"
                    style={{ bottom: `${(data.expense / maxValue) * 280}px` }}
                  />
                </div>
              </div>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{data.month}</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pendapatan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pengeluaran</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Laba Bersih</span>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className={`lg:col-span-2 p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Transaksi Jurnal Terbaru</h2>
            <button className="text-sm text-purple-500 hover:text-purple-400 font-medium">View all</button>
          </div>
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tx.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {tx.type === 'credit' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{tx.description}</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tx.date}</p>
                  </div>
                </div>
                <span className={`font-semibold ${tx.type === 'credit' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {tx.type === 'credit' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Piutang & Hutang */}
        <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Piutang & Hutang</h2>

          {/* Donut Chart Placeholder */}
          <div className="flex justify-center mb-4">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke={isDark ? '#334155' : '#e5e7eb'} strokeWidth="12" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="12"
                  strokeDasharray={`${65 * 2.51} ${100 * 2.51}`}
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="12"
                  strokeDasharray={`${35 * 2.51} ${100 * 2.51}`}
                  strokeDashoffset={`${-65 * 2.51}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>65%</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Piutang</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500" />
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>PIUTANG (65%)</span>
              </div>
              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Rp 125jt</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>HUTANG (35%)</span>
              </div>
              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Rp 67jt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
