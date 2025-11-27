import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import useConfirmationStore from '../../store/confirmationStore';

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  alert: boolean;
  stockAlert: number;
  trackCost: boolean;
  costAmount: number;
  outletId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function InventoryTab() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // State for form
  const [form, setForm] = useState({
    name: '',
    category: '',
    unit: 'kg',
    currentStock: '0',
    alert: false,
    stockAlert: '0',
    trackCost: false,
    costAmount: '0'
  });

  const { showConfirmation } = useConfirmationStore();

  // Load inventory
  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
      const outletId = user?.outletId || user?.outlet?.id;

      const params: any = {};
      if (outletId) params.outlet_id = outletId;
      if (showLowStockOnly) params.low_stock = 'true';

      const response = await api.get('/inventory-module', { params });
      setInventory(response.data.data || []);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('Gagal memuat data inventory');
    } finally {
      setLoading(false);
    }
  }, [showLowStockOnly]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Get unique categories
  const categories = Array.from(new Set(inventory.map(item => item.category))).filter(Boolean);

  // Filter inventory
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    const matchesLowStock = !showLowStockOnly || (item.alert && item.currentStock <= item.stockAlert);
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // Paginate
  const paginatedInventory = filteredInventory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);

  const handleFormChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenForm = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setForm({
        name: item.name,
        category: item.category,
        unit: item.unit,
        currentStock: item.currentStock.toString(),
        alert: item.alert,
        stockAlert: item.stockAlert.toString(),
        trackCost: item.trackCost,
        costAmount: item.costAmount.toString()
      });
    } else {
      setEditingItem(null);
      setForm({
        name: '',
        category: '',
        unit: 'kg',
        currentStock: '0',
        alert: false,
        stockAlert: '0',
        trackCost: false,
        costAmount: '0'
      });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.category || !form.unit) {
      toast.error('Nama, kategori, dan satuan wajib diisi');
      return;
    }

    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
    const outletId = user?.outletId || user?.outlet?.id;

    try {
      const data = {
        name: form.name,
        category: form.category,
        unit: form.unit,
        currentStock: parseFloat(form.currentStock || '0'),
        alert: form.alert,
        stockAlert: parseFloat(form.stockAlert || '0'),
        trackCost: form.trackCost,
        costAmount: parseFloat(form.costAmount || '0'),
        outletId: outletId || null
      };

      if (editingItem) {
        await api.put(`/inventory-module/${editingItem.id}`, data);
        toast.success('Item berhasil diupdate');
      } else {
        await api.post('/inventory-module', data);
        toast.success('Item berhasil ditambahkan');
      }

      setShowForm(false);
      loadInventory();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Gagal menyimpan item');
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    showConfirmation({
      title: 'Hapus Item',
      message: `Yakin ingin menghapus ${item.name}?`,
      confirmText: 'Hapus',
      onConfirm: async () => {
        try {
          await api.delete(`/inventory-module/${item.id}`);
          toast.success('Item berhasil dihapus');
          loadInventory();
        } catch (error) {
          console.error('Error deleting item:', error);
          toast.error('Gagal menghapus item');
        }
      }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const isLowStock = (item: InventoryItem) => {
    return item.alert && item.currentStock <= item.stockAlert;
  };

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Item</p>
              <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
            </div>
            <Package className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-red-600">
                {inventory.filter(isLowStock).length}
              </p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Kategori</p>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tracking Cost</p>
              <p className="text-2xl font-bold text-gray-900">
                {inventory.filter(i => i.trackCost).length}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-yellow-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Semua Kategori</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Low Stock Toggle */}
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Low Stock Only</span>
          </label>

          {/* Add Button */}
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Tambah Item
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : paginatedInventory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Tidak ada data inventory</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stok
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Satuan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alert
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedInventory.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 ${isLowStock(item) ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {isLowStock(item) && (
                            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.currentStock > item.stockAlert ? (
                            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                          )}
                          <span className={`text-sm font-semibold ${
                            isLowStock(item) ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {item.currentStock.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.alert ? (
                          <div className="text-sm">
                            <span className="text-xs text-gray-500">Y</span>
                            <span className="text-xs text-gray-400 ml-1">
                              (≤{item.stockAlert})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">N</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.trackCost ? (
                          <div className="text-sm">
                            <span className="text-xs text-gray-500">Y</span>
                            <div className="text-xs font-medium text-gray-900">
                              {formatCurrency(item.costAmount)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">N</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenForm(item)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredInventory.length)} of {filteredInventory.length} items
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingItem ? 'Edit Item' : 'Tambah Item Baru'}
              </h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Item <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Contoh: Gula Pasir"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Contoh: Bahan Baku, Finished Goods"
                    list="categories-list"
                  />
                  {categories.length > 0 && (
                    <datalist id="categories-list">
                      {categories.map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  )}
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Satuan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => handleFormChange('unit', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="liter">Liter</option>
                    <option value="ml">Mililiter (ml)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="box">Box</option>
                    <option value="pack">Pack</option>
                    <option value="bottle">Bottle</option>
                  </select>
                </div>

                {/* Current Stock */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stok Saat Ini
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.currentStock}
                    onChange={(e) => handleFormChange('currentStock', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Alert Settings */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      id="alert"
                      checked={form.alert}
                      onChange={(e) => handleFormChange('alert', e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="alert" className="text-sm font-medium text-gray-700">
                      Aktifkan Peringatan Low Stock
                    </label>
                  </div>

                  {form.alert && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Threshold Peringatan
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.stockAlert}
                        onChange={(e) => handleFormChange('stockAlert', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Minimum stok sebelum peringatan"
                      />
                    </div>
                  )}
                </div>

                {/* Cost Tracking */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      id="trackCost"
                      checked={form.trackCost}
                      onChange={(e) => handleFormChange('trackCost', e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="trackCost" className="text-sm font-medium text-gray-700">
                      Track Cost of Goods
                    </label>
                  </div>

                  {form.trackCost && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Biaya per Unit (IDR)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.costAmount}
                        onChange={(e) => handleFormChange('costAmount', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Cost of Goods per unit"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingItem ? 'Update' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
