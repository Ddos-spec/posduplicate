import { useEffect, useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Search, Download, RefreshCw, Loader2, Plus,
  CreditCard, AlertTriangle, CheckCircle, Clock,
  ChevronLeft, ChevronRight, X
} from 'lucide-react';

interface Payable {
  id: number;
  invoice_number: string;
  supplier_id: number;
  supplier?: { name: string };
  amount: string | number;
  paid_amount: string | number;
  balance: string | number;
  status: 'unpaid' | 'partial' | 'paid' | 'cancelled';
  invoice_date: string;
  due_date: string;
  notes?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AccountsPayablePage() {
  const { isDark } = useThemeStore();
  const [payables, setPayables] = useState<Payable[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');

  // Payment modal
  const [payModal, setPayModal] = useState(false);
  const [selectedAP, setSelectedAP] = useState<Payable | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_amount: '',
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPayables = async (page = 1) => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await api.get('/accounting/ap', { params });

      if (response.data?.success) {
        setPayables(response.data.data.payables || []);
        setPagination(response.data.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error('Failed to load AP:', error);
      toast.error('Gagal memuat data hutang');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, [statusFilter]);

  const handlePayment = async () => {
    if (!selectedAP || !paymentForm.payment_amount) {
      toast.error('Masukkan jumlah pembayaran');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/accounting/ap/${selectedAP.id}/pay`, {
        payment_date: paymentForm.payment_date,
        payment_amount: paymentForm.payment_amount,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number || undefined,
        notes: paymentForm.notes || undefined
      });

      toast.success('Pembayaran berhasil dicatat');
      setPayModal(false);
      setSelectedAP(null);
      setPaymentForm({
        payment_date: new Date().toISOString().split('T')[0],
        payment_amount: '',
        payment_method: 'bank_transfer',
        reference_number: '',
        notes: ''
      });
      fetchPayables(pagination.page);
    } catch (error: any) {
      console.error('Payment failed:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal mencatat pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  const openPayModal = (ap: Payable) => {
    setSelectedAP(ap);
    setPaymentForm({
      ...paymentForm,
      payment_amount: String(ap.balance)
    });
    setPayModal(true);
  };

  const formatCurrency = (value: string | number) => {
    const num = Number(value);
    return num.toLocaleString('id-ID');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status !== 'paid';

    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
          <AlertTriangle className="w-3 h-3" />
          Jatuh Tempo
        </span>
      );
    }

    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-600">
            <CheckCircle className="w-3 h-3" />
            Lunas
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-600">
            <Clock className="w-3 h-3" />
            Sebagian
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <Clock className="w-3 h-3" />
            Belum Bayar
          </span>
        );
    }
  };

  const filteredPayables = payables.filter(p =>
    p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary stats
  const totalUnpaid = payables.filter(p => p.status === 'unpaid').reduce((sum, p) => sum + Number(p.balance), 0);
  const totalPartial = payables.filter(p => p.status === 'partial').reduce((sum, p) => sum + Number(p.balance), 0);
  const overdue = payables.filter(p => new Date(p.due_date) < new Date() && p.status !== 'paid').length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Akuntansi / <span className={isDark ? 'text-white' : 'text-gray-900'}>Hutang Usaha (AP)</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Hutang Usaha</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            Kelola pembayaran ke supplier
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fetchPayables(pagination.page)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Hutang</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Rp {formatCurrency(totalUnpaid + totalPartial)}
          </p>
        </div>
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Belum Dibayar</p>
          <p className={`text-2xl font-bold mt-1 text-yellow-500`}>
            Rp {formatCurrency(totalUnpaid)}
          </p>
        </div>
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Dibayar Sebagian</p>
          <p className={`text-2xl font-bold mt-1 text-blue-500`}>
            Rp {formatCurrency(totalPartial)}
          </p>
        </div>
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Jatuh Tempo</p>
          <p className={`text-2xl font-bold mt-1 text-red-500`}>
            {overdue} Invoice
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className={`rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Cari invoice atau supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              {(['all', 'unpaid', 'partial', 'paid'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-purple-500 text-white'
                      : isDark ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'Semua' : status === 'unpaid' ? 'Belum Bayar' : status === 'partial' ? 'Sebagian' : 'Lunas'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-sm ${isDark ? 'text-gray-400 bg-slate-700/50' : 'text-gray-500 bg-gray-50'}`}>
                <th className="text-left px-4 py-3 font-medium">Invoice</th>
                <th className="text-left px-4 py-3 font-medium">Supplier</th>
                <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium">Jatuh Tempo</th>
                <th className="text-right px-4 py-3 font-medium">Jumlah</th>
                <th className="text-right px-4 py-3 font-medium">Sisa</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    <p className="mt-2 text-gray-500">Memuat data...</p>
                  </td>
                </tr>
              ) : filteredPayables.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-500">
                    Tidak ada data hutang.
                  </td>
                </tr>
              ) : (
                filteredPayables.map((ap) => (
                  <tr key={ap.id} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
                    <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {ap.invoice_number}
                    </td>
                    <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {ap.supplier?.name || '-'}
                    </td>
                    <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(ap.invoice_date)}
                    </td>
                    <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(ap.due_date)}
                    </td>
                    <td className={`px-4 py-3 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Rp {formatCurrency(ap.amount)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Rp {formatCurrency(ap.balance)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(ap.status, ap.due_date)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ap.status !== 'paid' && (
                        <button
                          onClick={() => openPayModal(ap)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600"
                        >
                          <CreditCard className="w-4 h-4" />
                          Bayar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchPayables(pagination.page - 1)}
                disabled={pagination.page === 1}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 disabled:opacity-50' : 'hover:bg-gray-100 disabled:opacity-50'}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchPayables(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 disabled:opacity-50' : 'hover:bg-gray-100 disabled:opacity-50'}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {payModal && selectedAP && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white shadow-xl'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Pembayaran Hutang
              </h3>
              <button
                onClick={() => setPayModal(false)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Invoice</p>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedAP.invoice_number}</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sisa Hutang</p>
              <p className={`text-xl font-bold text-emerald-500`}>Rp {formatCurrency(selectedAP.balance)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tanggal Pembayaran
                </label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Jumlah Pembayaran
                </label>
                <input
                  type="number"
                  value={paymentForm.payment_amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_amount: e.target.value })}
                  placeholder="0"
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Metode Pembayaran
                </label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="bank_transfer">Transfer Bank</option>
                  <option value="cash">Tunai</option>
                  <option value="check">Cek/Giro</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  No. Referensi (Opsional)
                </label>
                <input
                  type="text"
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                  placeholder="No. bukti transfer"
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Catatan (Opsional)
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  rows={2}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPayModal(false)}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium ${
                  isDark ? 'bg-slate-700 text-gray-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Batal
              </button>
              <button
                onClick={handlePayment}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {submitting ? 'Memproses...' : 'Bayar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
