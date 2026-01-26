import { useEffect, useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Search, Download, RefreshCw, Loader2, Plus,
  Building2, Truck, Monitor, Package, Trash2,
  ChevronLeft, ChevronRight, X, Calculator, History
} from 'lucide-react';

interface Asset {
  id: number;
  asset_code: string;
  asset_name: string;
  category: string;
  purchase_date: string;
  purchase_price: string | number;
  salvage_value: string | number;
  useful_life_months: number;
  depreciation_method: string;
  accumulated_depreciation: string | number;
  book_value: string | number;
  status: 'active' | 'disposed' | 'sold';
  location?: string;
  notes?: string;
  outlets?: { name: string };
  _count?: { depreciation_logs: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CoAAccount {
  id: number;
  account_code: string;
  account_name: string;
}

export default function FixedAssetsPage() {
  const { isDark } = useThemeStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disposed'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [depreciateModal, setDepreciateModal] = useState(false);
  const [disposeModal, setDisposeModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [accounts, setAccounts] = useState<CoAAccount[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [assetForm, setAssetForm] = useState({
    assetCode: '',
    assetName: '',
    category: 'Equipment',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    salvageValue: '0',
    usefulLifeMonths: '60',
    depreciationMethod: 'STRAIGHT_LINE',
    accountIdAsset: '',
    accountIdDepreciation: '',
    accountIdExpense: '',
    location: '',
    notes: ''
  });

  const [disposeForm, setDisposeForm] = useState({
    disposalDate: new Date().toISOString().split('T')[0],
    disposalValue: '0',
    notes: ''
  });

  const categories = ['Equipment', 'Vehicle', 'Building', 'Furniture', 'Computer', 'Machinery', 'Other'];

  const fetchAssets = async (page = 1) => {
    try {
      setLoading(true);
      const params: Record<string, any> = { page, limit: 50 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const response = await api.get('/accounting/assets', { params });

      if (response.data?.success) {
        setAssets(response.data.data || []);
        setPagination(response.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
      toast.error('Gagal memuat data aset');
    } finally {
      setLoading(false);
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
    fetchAssets();
    fetchAccounts();
  }, [statusFilter, categoryFilter]);

  const handleCreateAsset = async () => {
    if (!assetForm.assetCode || !assetForm.assetName || !assetForm.purchasePrice) {
      toast.error('Lengkapi data aset yang wajib diisi');
      return;
    }

    if (!assetForm.accountIdAsset || !assetForm.accountIdDepreciation || !assetForm.accountIdExpense) {
      toast.error('Pilih akun untuk aset, akumulasi penyusutan, dan beban penyusutan');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/accounting/assets', {
        assetCode: assetForm.assetCode,
        assetName: assetForm.assetName,
        category: assetForm.category,
        purchaseDate: assetForm.purchaseDate,
        purchasePrice: assetForm.purchasePrice,
        salvageValue: assetForm.salvageValue || '0',
        usefulLifeMonths: parseInt(assetForm.usefulLifeMonths),
        depreciationMethod: assetForm.depreciationMethod,
        accountIdAsset: parseInt(assetForm.accountIdAsset),
        accountIdDepreciation: parseInt(assetForm.accountIdDepreciation),
        accountIdExpense: parseInt(assetForm.accountIdExpense),
        location: assetForm.location || undefined,
        notes: assetForm.notes || undefined
      });

      toast.success('Aset berhasil ditambahkan');
      setCreateModal(false);
      resetAssetForm();
      fetchAssets();
    } catch (error: any) {
      console.error('Create asset failed:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal menambahkan aset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDepreciate = async () => {
    if (!selectedAsset) return;

    try {
      setSubmitting(true);
      await api.post(`/accounting/assets/${selectedAsset.id}/depreciate`);

      toast.success('Penyusutan berhasil dicatat');
      setDepreciateModal(false);
      setSelectedAsset(null);
      fetchAssets();
    } catch (error: any) {
      console.error('Depreciation failed:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal mencatat penyusutan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDepreciateAll = async () => {
    try {
      setSubmitting(true);
      const response = await api.post('/accounting/assets/depreciate-all');

      if (response.data?.success) {
        const { processed, failed } = response.data.data;
        toast.success(`Penyusutan selesai: ${processed} berhasil, ${failed} gagal`);
        fetchAssets();
      }
    } catch (error: any) {
      console.error('Depreciate all failed:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal menjalankan penyusutan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispose = async () => {
    if (!selectedAsset) return;

    try {
      setSubmitting(true);
      await api.post(`/accounting/assets/${selectedAsset.id}/dispose`, {
        disposalDate: disposeForm.disposalDate,
        disposalValue: disposeForm.disposalValue || '0',
        notes: disposeForm.notes || undefined
      });

      toast.success('Aset berhasil dihapuskan');
      setDisposeModal(false);
      setSelectedAsset(null);
      setDisposeForm({ disposalDate: new Date().toISOString().split('T')[0], disposalValue: '0', notes: '' });
      fetchAssets();
    } catch (error: any) {
      console.error('Dispose failed:', error);
      toast.error(error.response?.data?.error?.message || 'Gagal menghapuskan aset');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAssetForm = () => {
    setAssetForm({
      assetCode: '',
      assetName: '',
      category: 'Equipment',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: '',
      salvageValue: '0',
      usefulLifeMonths: '60',
      depreciationMethod: 'STRAIGHT_LINE',
      accountIdAsset: '',
      accountIdDepreciation: '',
      accountIdExpense: '',
      location: '',
      notes: ''
    });
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

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'building': return Building2;
      case 'vehicle': return Truck;
      case 'computer': return Monitor;
      default: return Package;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-600">Aktif</span>;
      case 'disposed':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Dihapuskan</span>;
      case 'sold':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">Dijual</span>;
      default:
        return null;
    }
  };

  const filteredAssets = assets.filter(a =>
    a.asset_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.asset_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary stats
  const totalAssetValue = assets.filter(a => a.status === 'active').reduce((sum, a) => sum + Number(a.purchase_price), 0);
  const totalBookValue = assets.filter(a => a.status === 'active').reduce((sum, a) => sum + Number(a.book_value), 0);
  const totalDepreciation = assets.filter(a => a.status === 'active').reduce((sum, a) => sum + Number(a.accumulated_depreciation), 0);
  const activeCount = assets.filter(a => a.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Akuntansi / <span className={isDark ? 'text-white' : 'text-gray-900'}>Aset Tetap</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Aset Tetap</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            Kelola aset tetap dan penyusutan
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDepreciateAll}
            disabled={submitting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Calculator className="w-4 h-4" />
            Susutkan Semua
          </button>
          <button
            onClick={() => setCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600"
          >
            <Plus className="w-4 h-4" />
            Tambah Aset
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Aset Aktif</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {activeCount} Unit
          </p>
        </div>
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Nilai Perolehan</p>
          <p className={`text-2xl font-bold mt-1 text-blue-500`}>
            Rp {formatCurrency(totalAssetValue)}
          </p>
        </div>
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Akum. Penyusutan</p>
          <p className={`text-2xl font-bold mt-1 text-red-500`}>
            Rp {formatCurrency(totalDepreciation)}
          </p>
        </div>
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Nilai Buku</p>
          <p className={`text-2xl font-bold mt-1 text-emerald-500`}>
            Rp {formatCurrency(totalBookValue)}
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
                placeholder="Cari kode atau nama aset..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`px-3 py-2 rounded-lg border focus:outline-none ${
                  isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                <option value="all">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {(['all', 'active', 'disposed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-purple-500 text-white'
                      : isDark ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'Semua' : status === 'active' ? 'Aktif' : 'Dihapuskan'}
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
                <th className="text-left px-4 py-3 font-medium">Kode</th>
                <th className="text-left px-4 py-3 font-medium">Nama Aset</th>
                <th className="text-left px-4 py-3 font-medium">Kategori</th>
                <th className="text-left px-4 py-3 font-medium">Tgl Perolehan</th>
                <th className="text-right px-4 py-3 font-medium">Nilai Perolehan</th>
                <th className="text-right px-4 py-3 font-medium">Akum. Penyusutan</th>
                <th className="text-right px-4 py-3 font-medium">Nilai Buku</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    <p className="mt-2 text-gray-500">Memuat data...</p>
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-500">
                    Tidak ada data aset.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const CategoryIcon = getCategoryIcon(asset.category);
                  return (
                    <tr key={asset.id} className={isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}>
                      <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {asset.asset_code}
                      </td>
                      <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="w-4 h-4 text-gray-400" />
                          {asset.asset_name}
                        </div>
                      </td>
                      <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {asset.category}
                      </td>
                      <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDate(asset.purchase_date)}
                      </td>
                      <td className={`px-4 py-3 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Rp {formatCurrency(asset.purchase_price)}
                      </td>
                      <td className={`px-4 py-3 text-right text-red-500`}>
                        Rp {formatCurrency(asset.accumulated_depreciation)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Rp {formatCurrency(asset.book_value)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(asset.status)}
                      </td>
                      <td className="px-4 py-3">
                        {asset.status === 'active' && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedAsset(asset);
                                setDepreciateModal(true);
                              }}
                              className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                              title="Susutkan"
                            >
                              <Calculator className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAsset(asset);
                                setDisposeModal(true);
                              }}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                              title="Hapuskan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
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
                onClick={() => fetchAssets(pagination.page - 1)}
                disabled={pagination.page === 1}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 disabled:opacity-50' : 'hover:bg-gray-100 disabled:opacity-50'}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchAssets(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700 disabled:opacity-50' : 'hover:bg-gray-100 disabled:opacity-50'}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Asset Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl p-6 my-8 ${isDark ? 'bg-slate-800' : 'bg-white shadow-xl'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Tambah Aset Baru
              </h3>
              <button
                onClick={() => { setCreateModal(false); resetAssetForm(); }}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Kode Aset *
                </label>
                <input
                  type="text"
                  value={assetForm.assetCode}
                  onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value })}
                  placeholder="AST-001"
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nama Aset *
                </label>
                <input
                  type="text"
                  value={assetForm.assetName}
                  onChange={(e) => setAssetForm({ ...assetForm, assetName: e.target.value })}
                  placeholder="Nama aset"
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Kategori
                </label>
                <select
                  value={assetForm.category}
                  onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tanggal Perolehan *
                </label>
                <input
                  type="date"
                  value={assetForm.purchaseDate}
                  onChange={(e) => setAssetForm({ ...assetForm, purchaseDate: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nilai Perolehan *
                </label>
                <input
                  type="number"
                  value={assetForm.purchasePrice}
                  onChange={(e) => setAssetForm({ ...assetForm, purchasePrice: e.target.value })}
                  placeholder="0"
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nilai Residu
                </label>
                <input
                  type="number"
                  value={assetForm.salvageValue}
                  onChange={(e) => setAssetForm({ ...assetForm, salvageValue: e.target.value })}
                  placeholder="0"
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Masa Manfaat (bulan)
                </label>
                <input
                  type="number"
                  value={assetForm.usefulLifeMonths}
                  onChange={(e) => setAssetForm({ ...assetForm, usefulLifeMonths: e.target.value })}
                  placeholder="60"
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Lokasi
                </label>
                <input
                  type="text"
                  value={assetForm.location}
                  onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                  placeholder="Kantor pusat"
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Akun Aset *
                </label>
                <select
                  value={assetForm.accountIdAsset}
                  onChange={(e) => setAssetForm({ ...assetForm, accountIdAsset: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="">Pilih akun aset</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Akun Akum. Penyusutan *
                </label>
                <select
                  value={assetForm.accountIdDepreciation}
                  onChange={(e) => setAssetForm({ ...assetForm, accountIdDepreciation: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="">Pilih akun akumulasi</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Akun Beban Penyusutan *
                </label>
                <select
                  value={assetForm.accountIdExpense}
                  onChange={(e) => setAssetForm({ ...assetForm, accountIdExpense: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="">Pilih akun beban</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Catatan
                </label>
                <textarea
                  value={assetForm.notes}
                  onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                  rows={2}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setCreateModal(false); resetAssetForm(); }}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium ${
                  isDark ? 'bg-slate-700 text-gray-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Batal
              </button>
              <button
                onClick={handleCreateAsset}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Aset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Depreciate Modal */}
      {depreciateModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white shadow-xl'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Susutkan Aset
              </h3>
              <button
                onClick={() => { setDepreciateModal(false); setSelectedAsset(null); }}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedAsset.asset_name}</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{selectedAsset.asset_code}</p>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Nilai Perolehan</p>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Rp {formatCurrency(selectedAsset.purchase_price)}
                  </p>
                </div>
                <div>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Nilai Buku</p>
                  <p className={`font-medium text-emerald-500`}>
                    Rp {formatCurrency(selectedAsset.book_value)}
                  </p>
                </div>
              </div>
            </div>

            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Apakah Anda yakin ingin mencatat penyusutan untuk aset ini? Jurnal penyusutan akan dibuat secara otomatis.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => { setDepreciateModal(false); setSelectedAsset(null); }}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium ${
                  isDark ? 'bg-slate-700 text-gray-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Batal
              </button>
              <button
                onClick={handleDepreciate}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {submitting ? 'Memproses...' : 'Susutkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispose Modal */}
      {disposeModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white shadow-xl'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Hapuskan Aset
              </h3>
              <button
                onClick={() => { setDisposeModal(false); setSelectedAsset(null); }}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedAsset.asset_name}</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Nilai Buku: Rp {formatCurrency(selectedAsset.book_value)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tanggal Penghapusan
                </label>
                <input
                  type="date"
                  value={disposeForm.disposalDate}
                  onChange={(e) => setDisposeForm({ ...disposeForm, disposalDate: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nilai Penjualan (jika dijual)
                </label>
                <input
                  type="number"
                  value={disposeForm.disposalValue}
                  onChange={(e) => setDisposeForm({ ...disposeForm, disposalValue: e.target.value })}
                  placeholder="0"
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Catatan
                </label>
                <textarea
                  value={disposeForm.notes}
                  onChange={(e) => setDisposeForm({ ...disposeForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Alasan penghapusan..."
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setDisposeModal(false); setSelectedAsset(null); }}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium ${
                  isDark ? 'bg-slate-700 text-gray-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Batal
              </button>
              <button
                onClick={handleDispose}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {submitting ? 'Memproses...' : 'Hapuskan Aset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
