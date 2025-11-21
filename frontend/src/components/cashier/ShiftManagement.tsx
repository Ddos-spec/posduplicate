import React, { useState, useEffect } from 'react';
import { X, Clock, DollarSign, FileText, TrendingUp, Users } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface ShiftData {
  id: number;
  shift_number: string;
  started_at: string;
  ended_at?: string;
  opening_cash: number;
  closing_cash?: number;
  expected_cash?: number;
  actual_cash?: number;
  difference?: number;
  total_sales?: number;
  transaction_count?: number;
  status: string;
  notes?: string;
  users: {
    id: number;
    name: string;
    email: string;
  };
}

interface ShiftManagementProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftChange?: () => void;
}

const ShiftManagement: React.FC<ShiftManagementProps> = ({ isOpen, onClose, onShiftChange }) => {
  const [currentShift, setCurrentShift] = useState<ShiftData | null>(null);
  const [loading, setLoading] = useState(false);
  const [openingCash, setOpeningCash] = useState<string>('0');
  const [closingCash, setClosingCash] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [showReport, setShowReport] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentShift();
    }
  }, [isOpen]);

  const fetchCurrentShift = async () => {
    try {
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
    }
  };

  const handleStartShift = async () => {
    if (!openingCash) {
      alert('Mohon masukkan uang pembuka');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/shifts/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          opening_cash: parseFloat(openingCash),
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentShift(data.data);
        setOpeningCash('0');
        setNotes('');
        if (onShiftChange) onShiftChange();
        alert('Shift berhasil dimulai!');
      } else {
        alert(data.message || 'Gagal memulai shift');
      }
    } catch (error) {
      console.error('Error starting shift:', error);
      alert('Terjadi kesalahan saat memulai shift');
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async () => {
    if (!closingCash) {
      alert('Mohon masukkan uang penutup');
      return;
    }

    const confirmed = window.confirm('Apakah Anda yakin ingin mengakhiri shift?');
    if (!confirmed) return;

    setLoading(true);
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
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Shift berhasil diakhiri!');
        setCurrentShift(null);
        setClosingCash('0');
        setNotes('');
        if (onShiftChange) onShiftChange();
        setShowReport(false);
      } else {
        alert(data.message || 'Gagal mengakhiri shift');
      }
    } catch (error) {
      console.error('Error ending shift:', error);
      alert('Terjadi kesalahan saat mengakhiri shift');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'Rp 0';
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
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Manajemen Shift</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {!currentShift ? (
            // Start Shift Form
            <div className="space-y-6">
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
                      Uang Pembuka (Rp) *
                    </label>
                    <input
                      type="number"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catatan (opsional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Tambahkan catatan jika diperlukan"
                    />
                  </div>
                  <button
                    onClick={handleStartShift}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 font-semibold"
                  >
                    {loading ? 'Memulai Shift...' : 'Mulai Shift'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Current Shift Info
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                  <Clock className="mr-2" size={20} />
                  Shift Aktif
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <p className="text-sm text-gray-600">Uang Pembuka</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(currentShift.opening_cash)}
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

              {/* Sales Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Penjualan</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(currentShift.total_sales || 0)}
                      </p>
                    </div>
                    <TrendingUp className="text-green-600" size={32} />
                  </div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Kas Diharapkan</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(
                          (currentShift.opening_cash || 0) + (currentShift.total_sales || 0)
                        )}
                      </p>
                    </div>
                    <DollarSign className="text-blue-600" size={32} />
                  </div>
                </div>
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Transaksi</p>
                      <p className="text-xl font-bold text-gray-900">
                        {currentShift.transaction_count || 0}
                      </p>
                    </div>
                    <Users className="text-purple-600" size={32} />
                  </div>
                </div>
              </div>

              {/* End Shift Form */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
                  <FileText className="mr-2" size={20} />
                  Akhiri Shift
                </h3>
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
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                      rows={3}
                      placeholder="Tambahkan catatan penutupan jika diperlukan"
                    />
                  </div>
                  <button
                    onClick={handleEndShift}
                    disabled={loading}
                    className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 font-semibold"
                  >
                    {loading ? 'Mengakhiri Shift...' : 'Akhiri Shift'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShiftManagement;
