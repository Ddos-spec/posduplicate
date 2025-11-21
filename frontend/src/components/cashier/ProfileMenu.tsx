import React, { useState, useEffect, useCallback } from 'react';
import { X, User, Package, Clock, LogOut, Save } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
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

interface ShiftData {
  id: number;
  shift_number: string;
  started_at: string;
  ended_at?: string;
  opening_cash: number;
  closing_cash?: number;
  total_sales?: number;
  transaction_count?: number;
  status: string;
  users: {
    id: number;
    name: string;
    email: string;
  };
}

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftChange?: () => void;
}

type TabType = 'profile' | 'inventory' | 'shift';

const ProfileMenu: React.FC<ProfileMenuProps> = ({ isOpen, onClose, onShiftChange }) => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { user, logout } = useAuthStore();

  // Profile states
  const [cashierName, setCashierName] = useState(user?.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Inventory states
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  // Shift states
  const [currentShift, setCurrentShift] = useState<ShiftData | null>(null);
  const [loadingShift, setLoadingShift] = useState(false);
  const [closingCash, setClosingCash] = useState<string>('0');
  const [shiftNotes, setShiftNotes] = useState<string>('');

  // Load ingredients when inventory tab is active
  const loadIngredients = useCallback(async () => {
    try {
      setLoadingIngredients(true);
      const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
      const outletId = user?.outletId || user?.outlet?.id;

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
  }, []);

  // Load current shift
  const loadCurrentShift = useCallback(async () => {
    try {
      setLoadingShift(true);
      const response = await fetch('http://localhost:3000/api/shifts/current', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentShift(data.data);
      } else if (response.status === 404) {
        setCurrentShift(null);
      }
    } catch (error) {
      console.error('Error fetching current shift:', error);
    } finally {
      setLoadingShift(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'inventory') {
        loadIngredients();
      } else if (activeTab === 'shift') {
        loadCurrentShift();
      }
    }
  }, [isOpen, activeTab, loadIngredients, loadCurrentShift]);

  const handleUpdateName = async () => {
    if (!cashierName.trim()) {
      toast.error('Nama kasir tidak boleh kosong');
      return;
    }

    setIsUpdatingName(true);
    try {
      // Update user name in the backend
      await api.put(`/users/${user?.id}`, { name: cashierName });

      // Update localStorage
      const storedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : {};
      storedUser.name = cashierName;
      localStorage.setItem('user', JSON.stringify(storedUser));

      // Update auth store
      useAuthStore.setState({ user: { ...user!, name: cashierName } });

      toast.success('Nama kasir berhasil diperbarui');
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Gagal memperbarui nama kasir');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin logout?')) {
      logout();
      onClose();
    }
  };

  const handleStartShift = async () => {
    const confirmed = window.confirm('Mulai shift sekarang?');
    if (!confirmed) return;

    setLoadingShift(true);
    try {
      const response = await fetch('http://localhost:3000/api/shifts/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          opening_cash: 0,
          notes: shiftNotes || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentShift(data.data);
        setShiftNotes('');
        if (onShiftChange) onShiftChange();
        toast.success('Shift berhasil dimulai!');
      } else {
        toast.error(data.message || 'Gagal memulai shift');
      }
    } catch (error) {
      console.error('Error starting shift:', error);
      toast.error('Terjadi kesalahan saat memulai shift');
    } finally {
      setLoadingShift(false);
    }
  };

  const handleEndShift = async () => {
    if (!closingCash) {
      toast.error('Mohon masukkan uang penutup');
      return;
    }

    const confirmed = window.confirm('Apakah Anda yakin ingin mengakhiri shift?');
    if (!confirmed) return;

    setLoadingShift(true);
    try {
      const response = await fetch('http://localhost:3000/api/shifts/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          closing_cash: parseFloat(closingCash),
          actual_cash: parseFloat(closingCash),
          notes: shiftNotes || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Shift berhasil diakhiri!');
        setCurrentShift(null);
        setClosingCash('0');
        setShiftNotes('');
        if (onShiftChange) onShiftChange();
      } else {
        toast.error(data.message || 'Gagal mengakhiri shift');
      }
    } catch (error) {
      console.error('Error ending shift:', error);
      toast.error('Terjadi kesalahan saat mengakhiri shift');
    } finally {
      setLoadingShift(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} jam ${minutes} menit`;
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
          <button
            onClick={() => setActiveTab('shift')}
            className={`flex-1 px-4 py-3 font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'shift'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Clock size={18} />
            Shift
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
                <p className="text-sm text-gray-600">Daftar stok bahan baku yang tersedia</p>
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
                          <tr key={ing.id} className="hover:bg-gray-50">
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
            </div>
          )}

          {/* Shift Tab */}
          {activeTab === 'shift' && (
            <div className="space-y-6">
              {loadingShift ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Memuat data shift...</p>
                </div>
              ) : !currentShift ? (
                // Start Shift
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <Clock className="mr-2" size={20} />
                    Mulai Shift Baru
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kasir
                      </label>
                      <input
                        type="text"
                        value={user?.name || ''}
                        disabled
                        className="w-full px-4 py-2 border rounded-lg bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Catatan (opsional)
                      </label>
                      <textarea
                        value={shiftNotes}
                        onChange={(e) => setShiftNotes(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Tambahkan catatan jika diperlukan"
                      />
                    </div>
                    <button
                      onClick={handleStartShift}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      Mulai Shift
                    </button>
                  </div>
                </div>
              ) : (
                // Active Shift
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                      <Clock className="mr-2" size={20} />
                      Shift Aktif
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">No. Shift</p>
                        <p className="font-semibold text-gray-900">{currentShift.shift_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Kasir</p>
                        <p className="font-semibold text-gray-900">{currentShift.users.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Mulai Shift</p>
                        <p className="font-semibold text-gray-900">
                          {formatDateTime(currentShift.started_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Durasi</p>
                        <p className="font-semibold text-gray-900">
                          {calculateDuration(currentShift.started_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Penjualan</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(currentShift.total_sales || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Jumlah Transaksi</p>
                        <p className="font-semibold text-gray-900">
                          {currentShift.transaction_count || 0} transaksi
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* End Shift */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-900 mb-4">Akhiri Shift</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Uang Penutup (Rp) *
                        </label>
                        <input
                          type="number"
                          value={closingCash}
                          onChange={(e) => setClosingCash(e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                          placeholder="0"
                        />
                      </div>
                      {parseFloat(closingCash) > 0 && (
                        <div className="bg-white rounded-lg p-4 border">
                          <p className="text-sm text-gray-600 mb-1">Selisih Kas</p>
                          <p
                            className={`text-xl font-bold ${
                              parseFloat(closingCash) -
                                ((currentShift.opening_cash || 0) + (currentShift.total_sales || 0)) ===
                              0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(
                              parseFloat(closingCash) -
                                ((currentShift.opening_cash || 0) + (currentShift.total_sales || 0))
                            )}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Catatan Penutupan (opsional)
                        </label>
                        <textarea
                          value={shiftNotes}
                          onChange={(e) => setShiftNotes(e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                          rows={3}
                          placeholder="Tambahkan catatan penutupan jika diperlukan"
                        />
                      </div>
                      <button
                        onClick={handleEndShift}
                        className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold"
                      >
                        Akhiri Shift
                      </button>
                    </div>
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
