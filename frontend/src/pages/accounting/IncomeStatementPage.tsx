import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import {
  Calendar, Printer, Download, TrendingUp, TrendingDown,
  RefreshCw, ToggleLeft, ToggleRight
} from 'lucide-react';

export default function IncomeStatementPage() {
  const { isDark } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'laba-rugi' | 'neraca' | 'arus-kas'>('laba-rugi');
  const [period, setPeriod] = useState('Januari 2024');
  const [comparePeriod, setComparePeriod] = useState(true);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('table');

  const incomeStatement = {
    revenue: {
      title: 'PENDAPATAN USAHA',
      icon: TrendingUp,
      items: [
        { name: 'Penjualan Barang', current: 1250000000, previous: 1100000000 },
        { name: 'Pendapatan Jasa', current: 450000000, previous: 400000000 },
        { name: 'Retur Penjualan', current: -25000000, previous: -20000000 },
      ],
      total: { current: 1675000000, previous: 1480000000 }
    },
    cogs: {
      title: 'HARGA POKOK PENJUALAN',
      icon: TrendingDown,
      items: [
        { name: 'Persediaan Awal', current: 300000000, previous: 280000000 },
        { name: 'Pembelian Bersih', current: 600000000, previous: 550000000 },
        { name: 'Persediaan Akhir', current: -250000000, previous: -220000000 },
      ],
      total: { current: -650000000, previous: -610000000 }
    },
    grossProfit: { current: 1025000000, previous: 870000000, label: 'LABA KOTOR' },
    operatingExpenses: {
      title: 'BEBAN OPERASIONAL',
      items: [
        { name: 'Beban Gaji', current: 250000000, previous: 230000000 },
        { name: 'Beban Sewa', current: 100000000, previous: 100000000 },
        { name: 'Beban Utilitas', current: 50000000, previous: 45000000 },
        { name: 'Beban Depresiasi', current: 75000000, previous: 70000000 },
      ],
      total: { current: -475000000, previous: -445000000 }
    },
    operatingProfit: { current: 550000000, previous: 425000000, label: 'LABA OPERASIONAL' },
    otherIncome: {
      title: 'PENDAPATAN LAIN-LAIN',
      items: [
        { name: 'Pendapatan Bunga', current: 15000000, previous: 12000000 },
        { name: 'Beban Bunga', current: -20000000, previous: -18000000 },
      ],
      total: { current: -5000000, previous: -6000000 }
    },
    netProfit: { current: 545000000, previous: 419000000, label: 'LABA BERSIH' }
  };

  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1000000000) {
      return `${(value / 1000000000).toFixed(3).replace('.', ',')}`;
    }
    return value.toLocaleString('id-ID').replace(/,/g, '.');
  };

  const isNegative = (value: number) => value < 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Laporan Keuangan / <span className={isDark ? 'text-white' : 'text-gray-900'}>Laba Rugi</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Laporan Laba Rugi</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            Pantau kinerja keuangan perusahaan dalam periode tertentu.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>TERAKHIR DIPERBARUI:</span>
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>12 MENIT LALU</span>
          <button className={`p-1 rounded ${isDark ? 'hover:bg-slate-700 text-emerald-400' : 'hover:bg-gray-100 text-emerald-500'}`}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Report Type Tabs */}
            <div className={`flex items-center rounded-lg p-1 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
              {(['laba-rugi', 'neraca', 'arus-kas'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? isDark ? 'bg-slate-600 text-white' : 'bg-white text-gray-900 shadow'
                      : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tab === 'laba-rugi' ? 'Laba Rugi' : tab === 'neraca' ? 'Neraca' : 'Arus Kas'}
                </button>
              ))}
            </div>

            {/* Period Selector */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
              <Calendar className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className={`bg-transparent text-sm font-medium focus:outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                <option value="Januari 2024">Januari 2024</option>
                <option value="Februari 2024">Februari 2024</option>
                <option value="Maret 2024">Maret 2024</option>
              </select>
            </div>

            {/* Compare Toggle */}
            <button
              onClick={() => setComparePeriod(!comparePeriod)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                comparePeriod
                  ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                  : isDark ? 'bg-slate-700 text-gray-400' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {comparePeriod ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              <span className="text-sm font-medium">Bandingkan Periode</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className={`rounded-xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
        {/* Report Header */}
        <div className={`p-8 text-center border-b-4 ${isDark ? 'bg-emerald-500/10 border-emerald-500' : 'bg-emerald-50 border-emerald-500'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>PT. TEKNOLOGI MASA DEPAN</p>
          <h2 className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <span className="border-b-2 border-current pb-1">LAPORAN LABA RUGI</span>
          </h2>
          <p className={`mt-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            Periode: 01 Januari 2024 - 31 Januari 2024
          </p>
        </div>

        {/* Table */}
        <div className="p-6">
          <table className="w-full">
            <thead>
              <tr className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <th className="text-left pb-4 font-medium">AKUN</th>
                <th className="text-right pb-4 font-medium">JAN 2024</th>
                {comparePeriod && <th className="text-right pb-4 font-medium">JAN 2023</th>}
              </tr>
            </thead>
            <tbody className="text-sm">
              {/* Revenue Section */}
              <tr>
                <td colSpan={comparePeriod ? 3 : 2} className="pt-6 pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                    <span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {incomeStatement.revenue.title}
                    </span>
                  </div>
                </td>
              </tr>
              {incomeStatement.revenue.items.map((item, idx) => (
                <tr key={idx} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
                  <td className={`py-2 pl-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.name}</td>
                  <td className={`py-2 text-right ${isNegative(item.current) ? 'text-red-500' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {isNegative(item.current) ? `(${formatCurrency(item.current)})` : formatCurrency(item.current)}
                  </td>
                  {comparePeriod && (
                    <td className={`py-2 text-right ${isNegative(item.previous) ? 'text-red-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {isNegative(item.previous) ? `(${formatCurrency(item.previous)})` : formatCurrency(item.previous)}
                    </td>
                  )}
                </tr>
              ))}
              <tr className={`font-semibold ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                <td className={`py-2 pl-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Total Pendapatan</td>
                <td className={`py-2 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(incomeStatement.revenue.total.current)}
                </td>
                {comparePeriod && (
                  <td className={`py-2 text-right ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {formatCurrency(incomeStatement.revenue.total.previous)}
                  </td>
                )}
              </tr>

              {/* COGS Section */}
              <tr>
                <td colSpan={comparePeriod ? 3 : 2} className="pt-8 pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
                    <span className={`font-semibold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                      {incomeStatement.cogs.title}
                    </span>
                  </div>
                </td>
              </tr>
              {incomeStatement.cogs.items.map((item, idx) => (
                <tr key={idx} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
                  <td className={`py-2 pl-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.name}</td>
                  <td className={`py-2 text-right ${isNegative(item.current) ? 'text-red-500' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {isNegative(item.current) ? `(${formatCurrency(item.current)})` : formatCurrency(item.current)}
                  </td>
                  {comparePeriod && (
                    <td className={`py-2 text-right ${isNegative(item.previous) ? 'text-red-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {isNegative(item.previous) ? `(${formatCurrency(item.previous)})` : formatCurrency(item.previous)}
                    </td>
                  )}
                </tr>
              ))}
              <tr className={`font-semibold ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
                <td className={`py-2 pl-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>Total HPP</td>
                <td className={`py-2 text-right text-red-500`}>
                  ({formatCurrency(incomeStatement.cogs.total.current)})
                </td>
                {comparePeriod && (
                  <td className={`py-2 text-right text-red-500`}>
                    ({formatCurrency(incomeStatement.cogs.total.previous)})
                  </td>
                )}
              </tr>

              {/* Gross Profit */}
              <tr className={`border-t-2 ${isDark ? 'border-slate-600 bg-slate-700/50' : 'border-gray-300 bg-gray-100'}`}>
                <td className={`py-4 font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {incomeStatement.grossProfit.label}
                </td>
                <td className={`py-4 text-right font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(incomeStatement.grossProfit.current)}
                </td>
                {comparePeriod && (
                  <td className={`py-4 text-right font-bold text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {formatCurrency(incomeStatement.grossProfit.previous)}
                  </td>
                )}
              </tr>

              {/* Operating Expenses */}
              <tr>
                <td colSpan={comparePeriod ? 3 : 2} className="pt-8 pb-2">
                  <span className={`font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {incomeStatement.operatingExpenses.title}
                  </span>
                </td>
              </tr>
              {incomeStatement.operatingExpenses.items.map((item, idx) => (
                <tr key={idx} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
                  <td className={`py-2 pl-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.name}</td>
                  <td className={`py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {formatCurrency(item.current)}
                  </td>
                  {comparePeriod && (
                    <td className={`py-2 text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatCurrency(item.previous)}
                    </td>
                  )}
                </tr>
              ))}

              {/* Net Profit */}
              <tr className={`border-t-4 ${isDark ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-500 bg-emerald-50'}`}>
                <td className={`py-6 font-bold text-xl ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {incomeStatement.netProfit.label}
                </td>
                <td className={`py-6 text-right font-bold text-xl ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {formatCurrency(incomeStatement.netProfit.current)}
                </td>
                {comparePeriod && (
                  <td className={`py-6 text-right font-bold text-xl ${isDark ? 'text-emerald-300' : 'text-emerald-500'}`}>
                    {formatCurrency(incomeStatement.netProfit.previous)}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
