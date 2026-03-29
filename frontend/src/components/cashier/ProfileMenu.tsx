import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  User,
  Package,
  LogOut,
  Save,
  Plus,
  Minus,
  Settings,
  Printer,
  Download,
  Bluetooth,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import useConfirmationStore from '../../store/confirmationStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  NativeBluetoothPrinter,
  clearPrinterSelection,
  getSavedPrinterSelection,
  isNativeAndroidApp,
  savePrinterSelection,
} from '../../plugins/nativeBluetoothPrinter';
import type { BondedPrinterDevice } from '../../plugins/nativeBluetoothPrinter';

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

type TabType = 'profile' | 'inventory' | 'settings';

const ProfileMenu: React.FC<ProfileMenuProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { user, logout } = useAuthStore();
  const { showConfirmation } = useConfirmationStore();
  const nativePrinterMode = isNativeAndroidApp();
  const savedPrinter = getSavedPrinterSelection();

  // Profile states
  const [cashierName, setCashierName] = useState(user?.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Settings states
  const [printerDevice, setPrinterDevice] = useState(localStorage.getItem('defaultPrinterDevice') || '');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [nativePrinters, setNativePrinters] = useState<BondedPrinterDevice[]>([]);
  const [selectedNativePrinterAddress, setSelectedNativePrinterAddress] = useState(savedPrinter.address);
  const [nativeBluetoothEnabled, setNativeBluetoothEnabled] = useState(false);
  const [isLoadingNativePrinters, setIsLoadingNativePrinters] = useState(false);
  const [isTestingNativePrinter, setIsTestingNativePrinter] = useState(false);

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
    const currentStock = typeof selectedIngredient.stock === 'number' ? selectedIngredient.stock : parseFloat(String(selectedIngredient.stock));
    const qty = parseFloat(quantity);
    
    const newStock = adjustmentType === 'in'
      ? currentStock + qty
      : currentStock - qty;

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

  const ensureNativePrinterPermissions = useCallback(async () => {
    if (!nativePrinterMode) {
      return false;
    }

    try {
      const permissionResult = await NativeBluetoothPrinter.ensurePermissions();
      return permissionResult.granted;
    } catch (error) {
      console.error('Failed to request Bluetooth permissions:', error);
      toast.error('Izin Bluetooth diperlukan untuk mencari printer');
      return false;
    }
  }, [nativePrinterMode]);

  const loadNativePrinters = useCallback(async () => {
    if (!nativePrinterMode) {
      return;
    }

    setIsLoadingNativePrinters(true);
    try {
      const granted = await ensureNativePrinterPermissions();
      if (!granted) {
        return;
      }

      const bluetoothState = await NativeBluetoothPrinter.getBluetoothState();
      setNativeBluetoothEnabled(Boolean(bluetoothState.enabled));

      const result = await NativeBluetoothPrinter.getBondedPrinters();
      const printers = [...result.printers].sort((left, right) =>
        (left.name || left.address).localeCompare(right.name || right.address),
      );

      setNativePrinters(printers);

      const selectedPrinter = printers.find((printer) => printer.address === selectedNativePrinterAddress);
      if (!selectedPrinter && printers.length === 1) {
        setSelectedNativePrinterAddress(printers[0].address);
      }
    } catch (error) {
      console.error('Failed to load bonded Bluetooth printers:', error);
      toast.error('Gagal memuat printer Bluetooth');
    } finally {
      setIsLoadingNativePrinters(false);
    }
  }, [ensureNativePrinterPermissions, nativePrinterMode, selectedNativePrinterAddress]);

  useEffect(() => {
    if (isOpen && activeTab === 'settings' && nativePrinterMode) {
      loadNativePrinters();
    }
  }, [activeTab, isOpen, loadNativePrinters, nativePrinterMode]);

  // PWA install prompt handler
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleSavePrinterDevice = () => {
    try {
      localStorage.setItem('defaultPrinterDevice', printerDevice);
      toast.success('Printer device berhasil disimpan');
    } catch (error) {
      console.error('Error saving printer device:', error);
      toast.error('Gagal menyimpan printer device');
    }
  };

  const handleSaveNativePrinter = () => {
    const selectedPrinter = nativePrinters.find((printer) => printer.address === selectedNativePrinterAddress);
    if (!selectedPrinter) {
      toast.error('Pilih printer Bluetooth terlebih dahulu');
      return;
    }

    savePrinterSelection({
      address: selectedPrinter.address,
      name: selectedPrinter.name || selectedPrinter.address,
    });
    localStorage.setItem('defaultPrinterDevice', selectedPrinter.name || selectedPrinter.address);
    setPrinterDevice(selectedPrinter.name || selectedPrinter.address);
    toast.success(`Printer ${selectedPrinter.name || selectedPrinter.address} tersimpan`);
  };

  const handleResetNativePrinter = () => {
    clearPrinterSelection();
    localStorage.removeItem('defaultPrinterDevice');
    setSelectedNativePrinterAddress('');
    setPrinterDevice('');
    toast.success('Default printer berhasil dihapus');
  };

  const handleOpenBluetoothSettings = async () => {
    try {
      await NativeBluetoothPrinter.openBluetoothSettings();
    } catch (error) {
      console.error('Failed to open Bluetooth settings:', error);
      toast.error('Tidak bisa membuka pengaturan Bluetooth');
    }
  };

  const handleTestNativePrinter = async () => {
    const selectedPrinter = nativePrinters.find((printer) => printer.address === selectedNativePrinterAddress);
    if (!selectedPrinter) {
      toast.error('Pilih printer Bluetooth terlebih dahulu');
      return;
    }

    setIsTestingNativePrinter(true);
    try {
      const granted = await ensureNativePrinterPermissions();
      if (!granted) {
        return;
      }

      await NativeBluetoothPrinter.printFormattedText({
        address: selectedPrinter.address,
        text:
          `[C]<b>MyPOS Test Print</b>\n` +
          `[C]${new Date().toLocaleString('id-ID')}\n` +
          `[C]==============================\n` +
          `[L]Printer:[R]${selectedPrinter.name || selectedPrinter.address}\n` +
          `[L]Status:[R]Siap digunakan\n` +
          `[C]==============================\n` +
          `[C]Test print berhasil\n`,
        printerDpi: 203,
        printerWidthMm: 48,
        printerNbrCharactersPerLine: 32,
        feedPaperMm: 18,
        cutPaper: false,
      });

      toast.success('Test print berhasil dikirim');
      handleSaveNativePrinter();
    } catch (error) {
      console.error('Failed to print test receipt:', error);
      toast.error('Test print gagal. Pastikan printer aktif dan sudah paired.');
    } finally {
      setIsTestingNativePrinter(false);
    }
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      toast.error('Aplikasi sudah terinstall atau browser tidak mendukung instalasi');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast.success('Aplikasi berhasil diinstall!');
    } else {
      toast.error('Instalasi dibatalkan');
    }

    setDeferredPrompt(null);
  };

  const handleUpdateName = async () => {
    if (!cashierName.trim()) {
      toast.error('Nama kasir tidak boleh kosong');
      return;
    }

    setIsUpdatingName(true);
    try {
      const response = await api.put('/auth/me', { name: cashierName });

      const updatedUser = response.data?.data || { ...user!, name: cashierName };
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
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-3 font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Settings size={18} />
            Pengaturan
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
                            (adjustmentType === 'in' 
                              ? (Number(selectedIngredient.stock) + Number(quantity)) 
                              : (Number(selectedIngredient.stock) - Number(quantity))) < 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}>
                            {adjustmentType === 'in'
                              ? (Number(selectedIngredient.stock) + Number(quantity))
                              : (Number(selectedIngredient.stock) - Number(quantity))
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

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {nativePrinterMode ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    <Bluetooth size={20} />
                    Printer Bluetooth Android
                  </h3>
                  <div className="space-y-4">
                    <div className="rounded-lg bg-white border border-blue-100 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">Status Bluetooth</p>
                          <p className="text-xs text-gray-500">
                            {nativeBluetoothEnabled
                              ? 'Bluetooth aktif. Pilih printer yang sudah paired.'
                              : 'Bluetooth belum aktif atau printer belum paired.'}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            nativeBluetoothEnabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {nativeBluetoothEnabled ? 'Aktif' : 'Perlu dicek'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          onClick={handleOpenBluetoothSettings}
                          className="flex-1 bg-white border border-blue-200 text-blue-700 py-2.5 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                          <ExternalLink size={16} />
                          Buka Pengaturan Bluetooth
                        </button>
                        <button
                          onClick={loadNativePrinters}
                          disabled={isLoadingNativePrinters}
                          className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:bg-blue-400"
                        >
                          <RefreshCw size={16} className={isLoadingNativePrinters ? 'animate-spin' : ''} />
                          {isLoadingNativePrinters ? 'Memuat...' : 'Muat Printer'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Printer Tersambung / Paired
                      </label>
                      <div className="space-y-2">
                        {nativePrinters.length > 0 ? (
                          nativePrinters.map((printer) => (
                            <label
                              key={printer.address}
                              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                                selectedNativePrinterAddress === printer.address
                                  ? 'border-blue-500 bg-blue-100'
                                  : 'border-gray-200 bg-white hover:border-blue-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name="native-printer"
                                value={printer.address}
                                checked={selectedNativePrinterAddress === printer.address}
                                onChange={() => setSelectedNativePrinterAddress(printer.address)}
                                className="h-4 w-4 text-blue-600"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                  {printer.name || 'Unnamed Printer'}
                                </p>
                                <p className="text-xs text-gray-500">{printer.address}</p>
                              </div>
                            </label>
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed border-blue-200 bg-white p-4 text-sm text-gray-600">
                            Belum ada printer paired yang terdeteksi. Pair printer di Bluetooth Android
                            dulu, lalu klik <span className="font-semibold">Muat Printer</span>.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg bg-white border border-blue-100 p-4">
                      <p className="text-sm font-semibold text-gray-800">Default Printer</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {printerDevice
                          ? `Printer aktif: ${printerDevice}`
                          : 'Belum ada printer default yang disimpan di aplikasi ini.'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleSaveNativePrinter}
                        disabled={!selectedNativePrinterAddress}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
                      >
                        <Save size={18} />
                        Simpan Printer Default
                      </button>
                      <button
                        onClick={handleTestNativePrinter}
                        disabled={!selectedNativePrinterAddress || isTestingNativePrinter}
                        className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors font-semibold flex items-center justify-center gap-2 disabled:bg-emerald-300 disabled:cursor-not-allowed"
                      >
                        <Printer size={18} />
                        {isTestingNativePrinter ? 'Mengirim Test Print...' : 'Test Print'}
                      </button>
                      <button
                        onClick={handleResetNativePrinter}
                        className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                      >
                        Hapus Default Printer
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    <Printer size={20} />
                    Pengaturan Printer
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Device Printer Default
                      </label>
                      <input
                        type="text"
                        value={printerDevice}
                        onChange={(e) => setPrinterDevice(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Contoh: EPSON TM-T82, Bluetooth Printer, dll"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Masukkan nama device printer yang sering Anda gunakan
                      </p>
                    </div>
                    <button
                      onClick={handleSavePrinterDevice}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <Save size={18} />
                      Simpan Pengaturan Printer
                    </button>
                  </div>
                </div>
              )}

              {/* PWA Install */}
              {!nativePrinterMode && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
                    <Download size={20} />
                    Install Aplikasi Kasir
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Install aplikasi kasir di perangkat Anda untuk akses yang lebih cepat dan mudah.
                    Aplikasi dapat digunakan secara offline dan memberikan pengalaman seperti aplikasi native.
                  </p>
                  <div className="bg-white rounded-lg p-4 mb-4 border border-purple-200">
                    <h4 className="font-semibold text-sm mb-2 text-gray-800">✨ Keuntungan Install:</h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• Akses cepat dari home screen</li>
                      <li>• Bekerja offline (data tersimpan lokal)</li>
                      <li>• Notifikasi real-time</li>
                      <li>• Pengalaman seperti aplikasi native</li>
                      <li>• Tidak perlu buka browser</li>
                    </ul>
                  </div>
                  <button
                    onClick={handleInstallPWA}
                    disabled={!deferredPrompt}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold flex items-center justify-center gap-2 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg"
                  >
                    <Download size={18} />
                    {deferredPrompt ? 'Install Aplikasi Kasir' : 'Aplikasi Sudah Terinstall'}
                  </button>
                  {!deferredPrompt && (
                    <p className="text-xs text-center text-gray-500 mt-2">
                      ℹ️ Aplikasi sudah terinstall atau browser tidak mendukung instalasi PWA
                    </p>
                  )}
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
