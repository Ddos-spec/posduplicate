import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import {
  ChevronDown, ChevronRight, Search, Download, Plus,
  Wallet, CreditCard, TrendingUp, MoreHorizontal
} from 'lucide-react';

interface Account {
  code: string;
  name: string;
  type: 'Category' | 'Sub-Category' | 'Cash / Bank' | 'Receivable' | 'Expense';
  balance?: number;
  debit?: boolean;
  children?: Account[];
}

export default function ChartOfAccountsPage() {
  const { isDark } = useThemeStore();
  const [activeFilter, setActiveFilter] = useState<'all' | 'asset' | 'liability' | 'equity' | 'revenue'>('all');
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>(['1000', '1100']);
  const [searchTerm, setSearchTerm] = useState('');

  const accounts: Account[] = [
    {
      code: '1000',
      name: 'ASET',
      type: 'Category',
      children: [
        {
          code: '1100',
          name: 'Aset Lancar',
          type: 'Sub-Category',
          children: [
            { code: '1101', name: 'Kas Kecil', type: 'Cash / Bank', debit: true },
            { code: '1102', name: 'Bank BCA', type: 'Cash / Bank', debit: true },
          ]
        }
      ]
    },
    {
      code: '2000',
      name: 'KEWAJIBAN',
      type: 'Category',
    },
    {
      code: '3000',
      name: 'EKUITAS',
      type: 'Category',
    },
  ];

  const stats = {
    totalAsset: 1450000000,
    totalLiability: 45000000,
    totalAccounts: 123
  };

  const toggleExpand = (code: string) => {
    setExpandedAccounts(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const renderAccount = (account: Account, level: number = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.includes(account.code);

    return (
      <div key={account.code}>
        <div
          className={`flex items-center justify-between py-3 px-4 cursor-pointer transition-colors ${
            isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${level * 24 + 16}px` }}
          onClick={() => hasChildren && toggleExpand(account.code)}
        >
          <div className="flex items-center gap-3">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              ) : (
                <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              )
            ) : (
              <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{account.name}</span>
                {account.debit && (
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-slate-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                    DB
                  </span>
                )}
              </div>
              <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{account.code}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              account.type === 'Category' ? 'bg-purple-100 text-purple-600' :
              account.type === 'Sub-Category' ? isDark ? 'bg-slate-600 text-gray-300' : 'bg-gray-100 text-gray-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              {account.type}
            </span>
            {account.balance !== undefined && (
              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Rp {account.balance.toLocaleString('id-ID')}
              </span>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && account.children?.map(child => renderAccount(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Akuntansi / <span className={isDark ? 'text-white' : 'text-gray-900'}>Chart of Accounts</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Chart of Accounts</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Daftar Akun Perkiraan •</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
              {stats.totalAccounts} akun aktif
            </span>
          </div>
        </div>

        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <Download className="w-4 h-4" />
          Import CoA
        </button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className={`lg:col-span-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Cari nama atau kode akun..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                {(['all', 'asset', 'liability', 'equity', 'revenue'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeFilter === filter
                        ? 'bg-blue-500 text-white'
                        : isDark ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter === 'all' ? 'Semua' : filter.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b text-sm font-medium ${isDark ? 'border-slate-700 text-gray-400 bg-slate-800/50' : 'border-gray-200 text-gray-500 bg-gray-50'}`}>
            <span>NAMA AKUN & KODE</span>
            <div className="flex items-center gap-8">
              <span>TIPE</span>
              <span className="w-32 text-right">SALDO</span>
            </div>
          </div>

          {/* Account Tree */}
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {accounts.map(account => renderAccount(account))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Donut Chart */}
          <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Ringkasan CoA</h2>

            {/* Donut Chart */}
            <div className="flex justify-center mb-4">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke={isDark ? '#334155' : '#e5e7eb'} strokeWidth="12" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#3b82f6"
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
                    strokeDasharray={`${15 * 2.51} ${100 * 2.51}`}
                    strokeDashoffset={`${-65 * 2.51}`}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="12"
                    strokeDasharray={`${20 * 2.51} ${100 * 2.51}`}
                    strokeDashoffset={`${-80 * 2.51}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Balance</p>
                    <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>2.3M</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Assets</span>
                </div>
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>65%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Liabilities</span>
                </div>
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>15%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Equity</span>
                </div>
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>20%</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>QUICK STATS</h2>

            <div className={`p-4 rounded-lg mb-3 ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Aset (Asset)</p>
              <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Rp {(stats.totalAsset / 1000000).toLocaleString('id-ID')}.000.000
              </p>
            </div>

            <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Kewajiban (Liability)</p>
              <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Rp {stats.totalLiability.toLocaleString('id-ID')}
              </p>
            </div>

            {/* Info box */}
            <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
              <div className="flex gap-2">
                <span className="text-blue-500">ℹ</span>
                <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                  Pastikan semua akun penyeimbang telah dikonfigurasi sebelum melakukan tutup buku akhir bulan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
