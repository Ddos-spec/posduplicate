import React, { useState, useEffect, useCallback } from 'react';
import { X, User, Package, LogOut, Save, Plus, Minus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import useConfirmationStore from '../../store/confirmationStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Ingredient {
  id: number;
  name: string;
  categories?: { name: string };
  unit: string;
  stock: number;
  min_stock: number;
  cost_per_unit: number;
}

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'profile' | 'inventory';

const ProfileMenu: React.FC<ProfileMenuProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { user, logout } = useAuthStore();
  const { showConfirmation } = useConfirmationStore();

  // Profile states
  const [cashierName, setCashierName] = useState(user?.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Inventory states
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  // Stock adjustment states
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'in' | 'out'>('in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Load ingredients when inventory tab is active
  const loadIngredients = useCallback(async () => {
    try {
      setLoadingIngredients(true);
      const outletId = user?.outletId || user?.outlets?.id;

      if (!outletId) {
        toast.error('Outlet information missing');
        return;
      }

      const response = await api.get('/ingredients', {
        params: { outlet_id: outletId }
      });
      setIngredients(response.data.data);
    } catch (error) {
      console.error('Failed to load ingredients:', error);
      toast.error('Gagal memuat data bahan baku');
    } finally {
      setLoadingIngredients(false);
    }
  }, [user]);

  const handleAdjustStock = async () => {
    if (!selectedIngredient) {
      toast.error('Pilih bahan baku terlebih dahulu');
      return;
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error('Masukkan jumlah yang valid');
      return;
    }

    if (!reason.trim()) {
      toast.error('Alasan penyesuaian stok wajib diisi');
      return;
    }

    // Check if stock will be negative
    const newStock = adjustmentType === 'in'
      ? parseFloat(selectedIngredient.stock.toString()) + parseFloat(quantity)
      : parseFloat(selectedIngredient.stock.toString()) - parseFloat(quantity);

    if (newStock < 0) {
      toast.error('Stok tidak boleh negatif');
      return;
    }

    setIsAdjusting(true);
    try {
      await api.post('/ingredients/adjust-stock', {
        ingredientId: selectedIngredient.id,
        quantity: parseFloat(quantity),
        type: adjustmentType,
        reason: reason.trim(),
        notes: notes.trim() || null,
      });

      toast.success('Stok berhasil disesuaikan!');
      setSelectedIngredient(null);
      setQuantity('');
      setReason('');
      setNotes('');
      setAdjustmentType('in');
      loadIngredients();
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      // ... error handling ...
      const errorMessage = error.response?.data?.error?.message
        || error.response?.data?.message
        || error.message
        || 'Gagal menyesuaikan stok - Server Error (500)';

      toast.error(errorMessage);
    } finally {
      setIsAdjusting(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'inventory') {
      loadIngredients();
    }
  }, [isOpen, activeTab, loadIngredients]);

  const handleUpdateName = async () => {
    if (!cashierName.trim()) {
      toast.error('Nama kasir tidak boleh kosong');
      return;
    }

    setIsUpdatingName(true);
    try {
      // Update user name in the backend
      await api.put(`/users/${user?.id}`, { name: cashierName });

      // Update auth store
      // We don't need to update localStorage manually as zustand persist handles it
      // useAuthStore.setState({ user: { ...user!, name: cashierName } });
      // Better to fetch me again or just update store optimistically if we are sure
      const updatedUser = { ...user!, name: cashierName };
      useAuthStore.setState({ user: updatedUser });

      toast.success('Nama kasir berhasil diperbarui');
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Gagal memperbarui nama kasir');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleLogout = () => {
    showConfirmation({
      title: 'Konfirmasi Logout',
      message: 'Apakah Anda yakin ingin keluar dari akun ini?',
      type: 'warning',
      confirmText: 'Ya, Logout',
      cancelText: 'Batal',
      onConfirm: () => {
        logout();
        onClose();
      },
    });
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Menu Kasir</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-4 py-3 font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <User size={18} />
            Profil
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 px-4 py-3 font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'inventory'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Package size={18} />
            Inventori
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Informasi Kasir</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Kasir
                    </label>
                    <input
                      type="text"
                      value={cashierName}
                      onChange={(e) => setCashierName(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Masukkan nama kasir"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Nama ini akan muncul di struk pembayaran
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="text"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-2 border rounded-lg bg-gray-100"
                    />
                  </div>
                  <button
                    onClick={handleUpdateName}
                    disabled={isUpdatingName || cashierName === user?.name}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 font-semibold flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    {isUpdatingName ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Bahan Baku</h3>
                <p className="text-sm text-gray-600">Klik pada bahan baku untuk menyesuaikan stok</p>
              </div>

              {loadingIngredients ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Memuat data...</p>
                </div>
              ) : ingredients.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-16 h-16 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">Tidak ada bahan baku</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nama
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stok
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Harga/Unit
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {ingredients.map((ing) => (
                          <tr
                            key={ing.id}
                            onClick={() => setSelectedIngredient(ing)}
                            className={`cursor-pointer transition-colors ${
                              selectedIngredient?.id === ing.id
                                ? 'bg-blue-50 hover:bg-blue-100'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">{ing.name}</div>
                              {ing.categories && (
                                <div className="text-xs text-gray-500">{ing.categories.name}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  ing.stock <= ing.min_stock
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {ing.stock}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {ing.unit}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              Rp {ing.cost_per_unit.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Stock Adjustment Form */}
              {selectedIngredient && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 shadow-md">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{selectedIngredient.name}</h4>
                      <p className="text-sm text-gray-600">
                        Stok saat ini: <span className="font-semibold text-blue-600">{selectedIngredient.stock} {selectedIngredient.unit}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedIngredient(null);
                        setQuantity('');
                        setReason('');
                        setNotes('');
                        setAdjustmentType('in');
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Adjustment Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setAdjustmentType('in')}
                          className={`flex items-center justify-center px-4 py-2 rounded-lg border-2 font-semibold transition-all ${
                            adjustmentType === 'in'
                              ? 'border-green-500 bg-green-500 text-white shadow-md'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-green-400'
                          }`}
                        >
                          <Plus className="mr-2" size={18} />
                          Tambah
                        </button>
                        <button
                          onClick={() => setAdjustmentType('out')}
                          className={`flex items-center justify-center px-4 py-2 rounded-lg border-2 font-semibold transition-all ${
                            adjustmentType === 'out'
                              ? 'border-red-500 bg-red-500 text-white shadow-md'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-red-400'
                          }`}
                        >
                          <Minus className="mr-2" size={18} />
                          Kurangi
                        </button>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Jumlah <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Masukkan jumlah (${selectedIngredient.unit})`}
                        min="0"
                      />
                      {quantity && (
                        <p className="mt-2 text-sm">
                          Stok setelah penyesuaian:{' '}
                          <span className={`font-semibold ${
                            (adjustmentType === 'in' ? parseFloat(selectedIngredient.stock) + parseFloat(quantity) : parseFloat(selectedIngredient.stock) - parseFloat(quantity)) < 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}>
                            {adjustmentType === 'in'
                              ? parseFloat(selectedIngredient.stock) + parseFloat(quantity)
                              : parseFloat(selectedIngredient.stock) - parseFloat(quantity)
                            } {selectedIngredient.unit}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alasan <span className="text-red-500">* (Wajib)</span>
                      </label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Contoh: Stok masuk dari supplier, Bahan rusak, dll"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Catatan Tambahan (opsional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                        placeholder="Detail tambahan jika diperlukan"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={handleAdjustStock}
                      disabled={isAdjusting || !quantity || !reason.trim()}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold shadow-md"
                    >
                      {isAdjusting ? 'Menyimpan...' : '💾 Simpan Penyesuaian'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileMenu;
