import { useEffect, useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Search, Download, RefreshCw, Loader2, Plus,
  TrendingUp, TrendingDown, Target, AlertCircle,
  ChevronLeft, ChevronRight, X, Edit2, Trash2
} from 'lucide-react';

interface Budget {
  id: number;
  budget_name: string;
  period_id: number;
  account_id: number;
  budgeted_amount: string | number;
  outlet_id?: number;
  notes?: string;
  chart_of_accounts?: {
    id: number;
    account_code: string;
    account_name: string;
  };
  accounting_periods?: {
    id: number;
    period_name: string;
    start_date: string;
    end_date: string;
  };
  outlets?: { name: string };
}

interface BudgetComparison {
  budgetId: number;
  budgetName: string;
  accountId: number;
  accountCode: string;
  accountName: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  status: 'under_budget' | 'over_budget';
}

interface Period {
  id: number;
  period_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface CoAAccount {
  id: number;
  account_code: string;
  account_name: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function BudgetPage() {
  const { isDark } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'list' | 'comparison'>('list');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [comparisons, setComparisons] = useState<BudgetComparison[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [accounts, setAccounts] = useState<CoAAccount[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<number | ''>('');

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [budgetForm, setBudgetForm] = useState({
    budgetName: '',
    periodId: '',
    accountId: '',
    budgetedAmount: '',
    notes: ''
  });

  const fetchBudgets = async (page = 1) => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page, limit: 50 };
      if (selectedPeriod) params.period_id = selectedPeriod;

      const response = await api.get('/accounting/budgets', { params });

      if (response.data?.success) {
        setBudgets(response.data.data || []);
        setPagination(response.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error('Failed to load budgets:', error);
      toast.error('Gagal memuat data anggaran');
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async () => {
    if (!selectedPeriod) {
      toast.error('Pilih periode terlebih dahulu');
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/accounting/budgets/vs-actual', {
        params: { period_id: selectedPeriod }
      });

      if (response.data?.success) {
        setComparisons(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load comparison:', error);
      toast.error('Gagal memuat perbandingan');
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriods = async () => {
    try {
      const response = await api.get('/accounting/periods');
      if (response.data?.success) {
        setPeriods(response.data.data || []);
        // Auto-select first open period
        const openPeriod = response.data.data.find((p: Period) => p.status === 'open');
        if (openPeriod) {
          setSelectedPeriod(openPeriod.id);
        }
      }
    } catch (error) {
      console.error('Failed to load periods:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounting/coa');
      if (response.data?.success) {
        const flat = response.data.data.flat || [];
        setAccounts(flat.map((a: any) => ({
          id: a.id,
          account_code: a.account_code,
          account_name: a.account_name
        })));
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  useEffect(() => {
    fetchPeriods();
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchBudgets();
    } else if (selectedPeriod) {
      fetchComparison();
    }
  }, [activeTab, selectedPeriod]);

  const handleCreateBudget = async () => {
    if (!budgetForm.budgetName || !budgetForm.periodId || !budgetForm.accountId || !budgetForm.budgetedAmount) {
      toast.error('Lengkapi semua data yang wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/accounting/budgets', {
        budgetName: budgetForm.budgetName,
        periodId: parseInt(budgetForm.periodId),
        accountId: parseInt(budgetForm.accountId),
        budgetedAmount: budgetForm.budgetedAmount,
        notes: budgetForm.notes || undefined
      });

      toast.success('Anggaran berhasil ditambahkan');
      setCreateModal(false);
      resetForm();
      fetchBudgets();
    } catch (error: any) {
      console.error('Create budget failed:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal menambahkan anggaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBudget = async () => {
    if (!selectedBudget || !budgetForm.budgetName || !budgetForm.budgetedAmount) {
      toast.error('Lengkapi data yang wajib diisi');
      return;
    }

    try {
      setSubmitting(true);
      await api.patch(`/accounting/budgets/${selectedBudget.id}`, {
        budgetName: budgetForm.budgetName,
        budgetedAmount: budgetForm.budgetedAmount,
        notes: budgetForm.notes || undefined
      });

      toast.success('Anggaran berhasil diperbarui');
      setEditModal(false);
      setSelectedBudget(null);
      resetForm();
      fetchBudgets();
    } catch (error: any) {
      console.error('Update budget failed:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal memperbarui anggaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBudget = async (id: number) => {
    if (!confirm('Yakin ingin menghapus anggaran ini?')) return;

    try {
      await api.delete(`/accounting/budgets/${id}`);
      toast.success('Anggaran berhasil dihapus');
      fetchBudgets();
    } catch (error: any) {
      console.error('Delete budget failed:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal menghapus anggaran');
    }
  };

  const openEditModal = (budget: Budget) => {
    setSelectedBudget(budget);
    setBudgetForm({
      budgetName: budget.budget_name,
      periodId: String(budget.period_id),
      accountId: String(budget.account_id),
      budgetedAmount: String(budget.budgeted_amount),
      notes: budget.notes || ''
    });
    setEditModal(true);
  };

  const resetForm = () => {
    setBudgetForm({
      budgetName: '',
      periodId: selectedPeriod ? String(selectedPeriod) : '',
      accountId: '',
      budgetedAmount: '',
      notes: ''
    });
  };

  const formatCurrency = (value: string | number) => {
    const num = Number(value);
    return num.toLocaleString('id-ID');
  };

  const filteredBudgets = budgets.filter(b =>
    b.budget_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.chart_of_accounts?.account_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary stats for comparison
  const totalBudgeted = comparisons.reduce((sum, c) => sum + c.budgetedAmount, 0);
  const totalActual = comparisons.reduce((sum, c) => sum + c.actualAmount, 0);
  const totalVariance = totalBudgeted - totalActual;
  const overBudgetCount = comparisons.filter(c => c.status === 'over_budget').length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Akuntansi / <span className={isDark ? 'text-white' : 'text-gray-900'}>Anggaran</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Anggaran</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            Kelola anggaran dan bandingkan dengan realisasi
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => activeTab === 'list' ? fetchBudgets() : fetchComparison()}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {activeTab === 'list' && (
            <button
              onClick={() => { resetForm(); setCreateModal(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600"
            >
              <Plus className="w-4 h-4" />
              Tambah Anggaran
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Period Filter */}
      <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className={`flex items-center rounded-lg p-1 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'list'
                  ? isDark ? 'bg-slate-600 text-white' : 'bg-white text-gray-900 shadow'
                  : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Daftar Anggaran
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'comparison'
                  ? isDark ? 'bg-slate-600 text-white' : 'bg-white text-gray-900 shadow'
                  : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Budget vs Actual
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Periode:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value ? parseInt(e.target.value) : '')}
                className={`px-3 py-2 rounded-lg border focus:outline-none ${
                  isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                <option value="">Semua Periode</option>
                {periods.map(p => (
                  <option key={p.id} value={p.id}>{p.period_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards (for comparison tab) */}
      {activeTab === 'comparison' && comparisons.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Anggaran</p>
            </div>
            <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Rp {formatCurrency(totalBudgeted)}
            </p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Realisasi</p>
            </div>
            <p className={`text-2xl font-bold mt-1 text-blue-500`}>
              Rp {formatCurrency(totalActual)}
            </p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
            <div className="flex items-center gap-2">
              {totalVariance >= 0 ? (
                <TrendingDown className="w-5 h-5 text-emerald-500" />
              ) : (
                <TrendingUp className="w-5 h-5 text-red-500" />
              )}
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Selisih</p>
            </div>
            <p className={`text-2xl font-bold mt-1 ${totalVariance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              Rp {formatCurrency(Math.abs(totalVariance))}
            </p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Over Budget</p>
            </div>
            <p className={`text-2xl font-bold mt-1 text-red-500`}>
              {overBudgetCount} Akun
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
        {activeTab === 'list' ? (
          <>
            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="relative max-w-md">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Cari anggaran..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>

            {/* Budget List Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-sm ${isDark ? 'text-gray-400 bg-slate-700/50' : 'text-gray-500 bg-gray-50'}`}>
                    <th className="text-left px-4 py-3 font-medium">Nama Anggaran</th>
                    <th className="text-left px-4 py-3 font-medium">Periode</th>
                    <th className="text-left px-4 py-3 font-medium">Akun</th>
                    <th className="text-right px-4 py-3 font-medium">Jumlah Anggaran</th>
                    <th className="text-center px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                        <p className="mt-2 text-gray-500">Memuat data...</p>
                      </td>
                    </tr>
                  ) : filteredBudgets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-gray-500">
                        Tidak ada data anggaran.
                      </td>
                    </tr>
                  ) : (
                    filteredBudgets.map((budget) => (
                      <tr key={budget.id} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
                        <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {budget.budget_name}
                        </td>
                        <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {budget.accounting_periods?.period_name || '-'}
                        </td>
                        <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {budget.chart_of_accounts ? (
                            <span>{budget.chart_of_accounts.account_code} - {budget.chart_of_accounts.account_name}</span>
                          ) : '-'}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Rp {formatCurrency(budget.budgeted_amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(budget)}
                              className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBudget(budget.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-sm ${isDark ? 'text-gray-400 bg-slate-700/50' : 'text-gray-500 bg-gray-50'}`}>
                    <th className="text-left px-4 py-3 font-medium">Anggaran</th>
                    <th className="text-left px-4 py-3 font-medium">Akun</th>
                    <th className="text-right px-4 py-3 font-medium">Anggaran</th>
                    <th className="text-right px-4 py-3 font-medium">Realisasi</th>
                    <th className="text-right px-4 py-3 font-medium">Selisih</th>
                    <th className="text-right px-4 py-3 font-medium">%</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                        <p className="mt-2 text-gray-500">Memuat data...</p>
                      </td>
                    </tr>
                  ) : !selectedPeriod ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-gray-500">
                        Pilih periode untuk melihat perbandingan.
                      </td>
                    </tr>
                  ) : comparisons.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-gray-500">
                        Tidak ada data perbandingan untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    comparisons.map((comp) => (
                      <tr key={comp.budgetId} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
                        <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {comp.budgetName}
                        </td>
                        <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {comp.accountCode} - {comp.accountName}
                        </td>
                        <td className={`px-4 py-3 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Rp {formatCurrency(comp.budgetedAmount)}
                        </td>
                        <td className={`px-4 py-3 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Rp {formatCurrency(comp.actualAmount)}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${comp.variance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {comp.variance >= 0 ? '+' : ''}{formatCurrency(comp.variance)}
                        </td>
                        <td className={`px-4 py-3 text-right ${comp.variance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {comp.variancePercent.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          {comp.status === 'under_budget' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-600">
                              <TrendingDown className="w-3 h-3" />
                              Under
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                              <TrendingUp className="w-3 h-3" />
                              Over
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination (for list tab) */}
        {activeTab === 'list' && pagination.totalPages > 1 && (
          <div className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchBudgets(pagination.page - 1)}
                disabled={pagination.page === 1}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 disabled:opacity-50' : 'hover:bg-gray-100 disabled:opacity-50'}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchBudgets(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 disabled:opacity-50' : 'hover:bg-gray-100 disabled:opacity-50'}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white shadow-xl'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Tambah Anggaran
              </h3>
              <button
                onClick={() => { setCreateModal(false); resetForm(); }}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nama Anggaran *
                </label>
                <input
                  type="text"
                  value={budgetForm.budgetName}
                  onChange={(e) => setBudgetForm({ ...budgetForm, budgetName: e.target.value })}
                  placeholder="Contoh: Anggaran Marketing Q1"
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Periode *
                </label>
                <select
                  value={budgetForm.periodId}
                  onChange={(e) => setBudgetForm({ ...budgetForm, periodId: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="">Pilih periode</option>
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>{p.period_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Akun *
                </label>
                <select
                  value={budgetForm.accountId}
                  onChange={(e) => setBudgetForm({ ...budgetForm, accountId: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="">Pilih akun</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Jumlah Anggaran *
                </label>
                <input
                  type="number"
                  value={budgetForm.budgetedAmount}
                  onChange={(e) => setBudgetForm({ ...budgetForm, budgetedAmount: e.target.value })}
                  placeholder="0"
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Catatan
                </label>
                <textarea
                  value={budgetForm.notes}
                  onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })}
                  rows={2}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setCreateModal(false); resetForm(); }}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium ${
                  isDark ? 'bg-slate-700 text-gray-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Batal
              </button>
              <button
                onClick={handleCreateBudget}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && selectedBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white shadow-xl'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Edit Anggaran
              </h3>
              <button
                onClick={() => { setEditModal(false); setSelectedBudget(null); resetForm(); }}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nama Anggaran *
                </label>
                <input
                  type="text"
                  value={budgetForm.budgetName}
                  onChange={(e) => setBudgetForm({ ...budgetForm, budgetName: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Jumlah Anggaran *
                </label>
                <input
                  type="number"
                  value={budgetForm.budgetedAmount}
                  onChange={(e) => setBudgetForm({ ...budgetForm, budgetedAmount: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Catatan
                </label>
                <textarea
                  value={budgetForm.notes}
                  onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })}
                  rows={2}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setEditModal(false); setSelectedBudget(null); resetForm(); }}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium ${
                  isDark ? 'bg-slate-700 text-gray-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Batal
              </button>
              <button
                onClick={handleUpdateBudget}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
