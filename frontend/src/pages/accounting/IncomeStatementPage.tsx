import { useEffect, useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Calendar, Printer, Download, TrendingUp, TrendingDown,
  RefreshCw, ToggleLeft, ToggleRight, Loader2, Scale
} from 'lucide-react';

interface AccountRow {
  account_code: string;
  account_name: string;
  amount: string | number; // Backend sends Decimal string or number
  balance?: string | number; // Balance sheet uses 'balance'
}

interface Section {
  accounts: AccountRow[];
  total: string | number;
}

interface IncomeStatementData {
  period: { start: string; end: string };
  sections: {
    revenue: Section;
    cogs: Section;
    grossProfit: string | number;
    expenses: Section;
    netIncome: string | number;
  };
}

interface BalanceSheetData {
  date: string;
  sections: {
    assets: Section;
    liabilities: Section;
    equity: Section;
  };
  balanced: boolean;
  check: {
    assets: string | number;
    liabPlusEquity: string | number;
    diff: string | number;
  };
}

export default function IncomeStatementPage() {
  const { isDark } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'laba-rugi' | 'neraca' | 'arus-kas'>('laba-rugi');
  
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [plData, setPlData] = useState<IncomeStatementData | null>(null);
  const [bsData, setBsData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      // Construct dates
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      if (activeTab === 'laba-rugi') {
        const response = await api.get('/accounting/reports/income-statement', {
          params: { startDate, endDate }
        });
        if (response.data?.success) {
          setPlData(response.data.data);
        }
      } else if (activeTab === 'neraca') {
        const response = await api.get('/accounting/reports/balance-sheet', {
          params: { endDate } // Balance Sheet is "As of" end date
        });
        if (response.data?.success) {
          setBsData(response.data.data);
        }
      } else {
        // Arus Kas - Placeholder for now
        toast.success('Laporan Arus Kas akan segera hadir');
      }

    } catch (error) {
      console.error('Failed to load report:', error);
      toast.error('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [month, year, activeTab]);

  const formatCurrency = (value: string | number | undefined) => {
    if (value === undefined) return '0';
    const num = Number(value);
    if (isNaN(num)) return '0';
    const absVal = Math.abs(num);
    const formatted = absVal.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return num < 0 ? `(${formatted})` : formatted;
  };

  const months = [
    { val: 1, label: 'Januari' }, { val: 2, label: 'Februari' }, { val: 3, label: 'Maret' },
    { val: 4, label: 'April' }, { val: 5, label: 'Mei' }, { val: 6, label: 'Juni' },
    { val: 7, label: 'Juli' }, { val: 8, label: 'Agustus' }, { val: 9, label: 'September' },
    { val: 10, label: 'Oktober' }, { val: 11, label: 'November' }, { val: 12, label: 'Desember' }
  ];

  const renderIncomeStatement = () => {
    if (!plData) return <div className="text-center py-10 text-gray-500">Tidak ada data.</div>;
    return (
      <table className="w-full">
        <thead>
          <tr className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <th className="text-left pb-4 font-medium">AKUN</th>
            <th className="text-right pb-4 font-medium">TOTAL</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {/* Revenue */}
          <tr>
            <td colSpan={2} className="pt-6 pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                <span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>PENDAPATAN USAHA</span>
              </div>
            </td>
          </tr>
          {plData.sections.revenue.accounts.map((item, idx) => (
            <tr key={idx} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
              <td className={`py-2 pl-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.account_code} - {item.account_name}</td>
              <td className={`py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{formatCurrency(item.amount)}</td>
            </tr>
          ))}
          <tr className={`font-semibold ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
            <td className={`py-2 pl-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Total Pendapatan</td>
            <td className={`py-2 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(plData.sections.revenue.total)}</td>
          </tr>

          {/* COGS */}
          <tr>
            <td colSpan={2} className="pt-8 pb-2">
              <div className="flex items-center gap-2">
                <TrendingDown className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
                <span className={`font-semibold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>HARGA POKOK PENJUALAN</span>
              </div>
            </td>
          </tr>
          {plData.sections.cogs.accounts.map((item, idx) => (
            <tr key={idx} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
              <td className={`py-2 pl-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.account_code} - {item.account_name}</td>
              <td className="py-2 text-right text-red-500">({formatCurrency(item.amount)})</td>
            </tr>
          ))}
          <tr className={`font-semibold ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
            <td className={`py-2 pl-6 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>Total HPP</td>
            <td className="py-2 text-right text-red-500">({formatCurrency(plData.sections.cogs.total)})</td>
          </tr>

          {/* Gross Profit */}
          <tr className={`border-t-2 ${isDark ? 'border-slate-600 bg-slate-700/50' : 'border-gray-300 bg-gray-100'}`}>
            <td className={`py-4 font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>LABA KOTOR</td>
            <td className={`py-4 text-right font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(plData.sections.grossProfit)}</td>
          </tr>

          {/* Expenses */}
          <tr>
            <td colSpan={2} className="pt-8 pb-2">
              <span className={`font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>BEBAN OPERASIONAL</span>
            </td>
          </tr>
          {plData.sections.expenses.accounts.map((item, idx) => (
            <tr key={idx} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
              <td className={`py-2 pl-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.account_code} - {item.account_name}</td>
              <td className={`py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{formatCurrency(item.amount)}</td>
            </tr>
          ))}
          <tr className={`font-semibold ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
            <td className={`py-2 pl-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Beban</td>
            <td className={`py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{formatCurrency(plData.sections.expenses.total)}</td>
          </tr>

          {/* Net Profit */}
          <tr className={`border-t-4 ${isDark ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-500 bg-emerald-50'}`}>
            <td className={`py-6 font-bold text-xl ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>LABA BERSIH</td>
            <td className={`py-6 text-right font-bold text-xl ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatCurrency(plData.sections.netIncome)}</td>
          </tr>
        </tbody>
      </table>
    );
  };

  const renderBalanceSheet = () => {
    if (!bsData) return <div className="text-center py-10 text-gray-500">Tidak ada data.</div>;
    return (
      <table className="w-full">
        <thead>
          <tr className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <th className="text-left pb-4 font-medium">AKUN</th>
            <th className="text-right pb-4 font-medium">SALDO</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {/* Assets */}
          <tr>
            <td colSpan={2} className="pt-6 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                <span className={`font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>ASET (ASSETS)</span>
              </div>
            </td>
          </tr>
          {bsData.sections.assets.accounts.map((item, idx) => (
            <tr key={idx} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
              <td className={`py-2 pl-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.account_code} - {item.account_name}</td>
              <td className={`py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{formatCurrency(item.balance)}</td>
            </tr>
          ))}
          <tr className={`font-semibold ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
            <td className={`py-2 pl-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Total Aset</td>
            <td className={`py-2 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(bsData.sections.assets.total)}</td>
          </tr>

          {/* Liabilities */}
          <tr>
            <td colSpan={2} className="pt-8 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                <span className={`font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>KEWAJIBAN (LIABILITIES)</span>
              </div>
            </td>
          </tr>
          {bsData.sections.liabilities.accounts.map((item, idx) => (
            <tr key={idx} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
              <td className={`py-2 pl-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.account_code} - {item.account_name}</td>
              <td className={`py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{formatCurrency(item.balance)}</td>
            </tr>
          ))}
          <tr className={`font-semibold ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
            <td className={`py-2 pl-6 ${isDark ? 'text-red-400' : 'text-red-600'}`}>Total Kewajiban</td>
            <td className={`py-2 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(bsData.sections.liabilities.total)}</td>
          </tr>

          {/* Equity */}
          <tr>
            <td colSpan={2} className="pt-8 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                <span className={`font-semibold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>EKUITAS (EQUITY)</span>
              </div>
            </td>
          </tr>
          {bsData.sections.equity.accounts.map((item, idx) => (
            <tr key={idx} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
              <td className={`py-2 pl-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.account_code} - {item.account_name}</td>
              <td className={`py-2 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{formatCurrency(item.balance)}</td>
            </tr>
          ))}
          <tr className={`font-semibold ${isDark ? 'bg-slate-700/30' : 'bg-gray-50'}`}>
            <td className={`py-2 pl-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Total Ekuitas</td>
            <td className={`py-2 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(bsData.sections.equity.total)}</td>
          </tr>

          {/* Balance Check */}
          <tr className={`border-t-4 ${isDark ? 'border-slate-600 bg-slate-700/50' : 'border-gray-300 bg-gray-100'}`}>
            <td className={`py-4 font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
              TOTAL KEWAJIBAN & EKUITAS
            </td>
            <td className={`py-4 text-right font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatCurrency(bsData.check.liabPlusEquity)}
            </td>
          </tr>
          {/* Balance Indicator */}
           <tr>
             <td colSpan={2} className="py-2 text-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                    bsData.balanced 
                    ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                    : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
                }`}>
                    <Scale className="w-4 h-4" />
                    {bsData.balanced ? 'Balance (Seimbang)' : 'Tidak Balance!'}
                </div>
             </td>
           </tr>
        </tbody>
      </table>
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Laporan Keuangan / <span className={isDark ? 'text-white' : 'text-gray-900'}>
          {activeTab === 'laba-rugi' ? 'Laba Rugi' : activeTab === 'neraca' ? 'Neraca' : 'Arus Kas'}
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Laporan Keuangan</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            Pantau kinerja keuangan perusahaan dalam periode tertentu.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <button 
            onClick={fetchReport}
            className={`p-1 rounded ${isDark ? 'hover:bg-slate-700 text-emerald-400' : 'hover:bg-gray-100 text-emerald-500'}`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className={`bg-transparent text-sm font-medium focus:outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className={`bg-transparent text-sm font-medium focus:outline-none ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
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
            <span className="border-b-2 border-current pb-1">
              {activeTab === 'laba-rugi' ? 'LAPORAN LABA RUGI' : activeTab === 'neraca' ? 'LAPORAN POSISI KEUANGAN (NERACA)' : 'LAPORAN ARUS KAS'}
            </span>
          </h2>
          <p className={`mt-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            Periode: {months[month-1]?.label} {year}
          </p>
        </div>

        {/* Table */}
        <div className="p-6">
          {loading ? (
             <div className="flex justify-center py-10">
               <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
             </div>
          ) : activeTab === 'laba-rugi' ? renderIncomeStatement() : activeTab === 'neraca' ? renderBalanceSheet() : (
            <div className="text-center py-10 text-gray-500">Fitur Arus Kas belum tersedia.</div>
          )}
        </div>
      </div>
    </div>
  );
}
