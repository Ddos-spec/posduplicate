import { useEffect, useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import api from '../../services/api';
import {
  TrendingUp, TrendingDown, DollarSign, Loader2, FileText
} from 'lucide-react';

export default function DashboardAkuntansiPage() {
  const { isDark } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    expense: 0,
    netProfit: 0,
    assets: 0 // Optional if we fetch Balance Sheet
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const endOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

        // Parallel fetch: Income Statement (for stats) + Recent Journals
        const [reportRes, journalRes] = await Promise.all([
          api.get('/accounting/reports/income-statement', { params: { startDate: startOfMonth, endDate: endOfMonth } }),
          api.get('/accounting/journals', { params: { limit: 5 } })
        ]);

        if (reportRes.data?.success) {
          const { revenue, expenses, netIncome } = reportRes.data.data.sections;
          setStats({
            revenue: Number(revenue.total || 0),
            expense: Number(expenses.total || 0), // expenses.total is usually negative in calc, but let's check. 
            // In backend controller: totalExpenses = debit - credit (positive for normal expense).
            // Let's use the absolute value or direct value.
            netProfit: Number(netIncome || 0),
            assets: 0
          });
        }

        if (journalRes.data?.success) {
          setRecentTransactions(journalRes.data.data.journals || []);
        }

      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
  };

  const statCards = [
    {
      title: 'Total Pendapatan',
      value: formatCurrency(stats.revenue),
      icon: DollarSign,
      color: 'emerald',
      trend: 'up' // Dynamic trend requires comparison with prev month, keeping static for now
    },
    {
      title: 'Total Pengeluaran',
      value: formatCurrency(stats.expense),
      icon: TrendingDown,
      color: 'red',
      trend: 'down'
    },
    {
      title: 'Laba Bersih',
      value: formatCurrency(stats.netProfit),
      icon: TrendingUp,
      color: stats.netProfit >= 0 ? 'purple' : 'red',
      trend: stats.netProfit >= 0 ? 'up' : 'down'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-10 h-10 animate-spin text-gray-500" />
      </div>
    );
  }

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
            Ringkasan keuangan bulan ini.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                stat.color === 'red' ? 'bg-red-100 text-red-600' :
                'bg-purple-100 text-purple-600'
              }`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.title}</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Transaksi Jurnal Terbaru</h2>
        </div>
        <div className="space-y-3">
          {recentTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Belum ada transaksi jurnal.</p>
          ) : (
            recentTransactions.map((tx: any) => (
              <div
                key={tx.id}
                className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600`}>
                    <FileText className="w-5 h-5" />
                  </div> // Using generic icon since type isn't always clear credit/debit mix
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{tx.description || tx.journal_number}</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(tx.transaction_date).toLocaleDateString('id-ID')} • {tx.journal_number}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Rp {Number(tx.total_debit).toLocaleString('id-ID')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
