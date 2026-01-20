import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import toast from 'react-hot-toast';
import axios from 'axios';
import api from '../../services/api';
import { outletService, type Outlet } from '../../services/outletService';
import {
  ArrowLeft, Mail, Check, ChevronDown,
  Package, Factory, ShoppingCart, Info
} from 'lucide-react';

type RoleType = 'distributor' | 'produsen' | 'retail' | null;

export default function CreateUserPage() {
  const { isDark } = useThemeStore();
  const navigate = useNavigate();
  const initialFormState = {
    name: '',
    email: '',
    password: '',
    role: null as RoleType,
    outletId: '',
    allOutlets: false,
    confirmed: false,
    sendEmailNotification: true
  };
  const [formData, setFormData] = useState(initialFormState);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [slotStats, setSlotStats] = useState({ used: 0, total: 0, percentage: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUser, setCreatedUser] = useState<{
    name: string;
    email: string;
    tempPassword: string;
    emailSent: boolean;
  } | null>(null);

  const roleLabelMap: Record<Exclude<RoleType, null>, string> = {
    distributor: 'Distributor',
    produsen: 'Produsen',
    retail: 'Retail'
  };

  const roles = [
    {
      id: 'distributor',
      name: 'Distributor',
      description: 'Kelola pembelian, supplier, dan stok barang',
      icon: Package,
      color: 'blue',
      features: ['Akses Gudang', 'Laporan Stok']
    },
    {
      id: 'produsen',
      name: 'Produsen',
      description: 'Manajemen produksi dan bahan baku',
      icon: Factory,
      color: 'purple',
      features: ['Input Produksi', 'HPP Calculator']
    },
    {
      id: 'retail',
      name: 'Retail',
      description: 'POS, penjualan harian, dan kasir',
      icon: ShoppingCart,
      color: 'emerald',
      features: ['Akses POS', 'Tutup Kasir']
    }
  ];

  useEffect(() => {
    let isActive = true;

    const loadOutlets = async () => {
      try {
        const response = await outletService.getAll({ is_active: true });
        if (isActive) {
          setOutlets(response.data || []);
        }
      } catch (error) {
        console.error('Failed to load outlets:', error);
      }
    };

    const loadStats = async () => {
      try {
        const response = await api.get('/accounting/users', {
          params: { page: 1, limit: 1 }
        });
        const statsData = response.data?.data?.stats;
        if (!statsData || !isActive) return;

        const used = Number(statsData.totalUsers || 0);
        const total = Number(statsData.maxUsers || used || 0);
        const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
        setSlotStats({ used, total, percentage });
      } catch (error) {
        console.error('Failed to load user stats:', error);
      }
    };

    loadOutlets();
    loadStats();

    return () => {
      isActive = false;
    };
  }, []);

  const completionSteps = [
    Boolean(formData.name.trim()),
    Boolean(formData.email.trim()),
    Boolean(formData.role),
    formData.confirmed
  ];
  const completionPercent = Math.round(
    (completionSteps.filter(Boolean).length / completionSteps.length) * 100
  );

  const generatePassword = (length = 12) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < length; i += 1) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleGeneratePassword = () => {
    const generated = generatePassword();
    setFormData((prev) => ({ ...prev, password: generated }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.role) {
      toast.error('Nama, email, dan role wajib diisi');
      return;
    }

    if (!formData.confirmed) {
      toast.error('Mohon konfirmasi data sebelum membuat akun');
      return;
    }

    const roleLabel = formData.role ? roleLabelMap[formData.role] : '';
    const trimmedPassword = formData.password.trim();
    const outletId = formData.allOutlets
      ? null
      : formData.outletId
        ? Number(formData.outletId)
        : null;

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: roleLabel,
        outletId,
        sendEmailNotification: formData.sendEmailNotification
      };
      if (trimmedPassword) {
        payload.password = trimmedPassword;
      }

      const response = await api.post('/accounting/users/create', payload);

      const created = response.data?.data?.user;
      setCreatedUser({
        name: created?.name || formData.name.trim(),
        email: created?.email || formData.email.trim(),
        tempPassword: created?.tempPassword || trimmedPassword || '',
        emailSent: Boolean(response.data?.data?.emailSent)
      });
      setSlotStats((prev) => {
        const used = prev.used + 1;
        const total = prev.total || used;
        const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
        return { ...prev, used, percentage };
      });
      toast.success('Pengguna berhasil dibuat');
    } catch (error: unknown) {
      console.error('Failed to create user:', error);
      let errorMessage = 'Gagal membuat pengguna';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ ...initialFormState });
  };

  const handleCopyPassword = async () => {
    if (!createdUser?.tempPassword) {
      toast.error('Password sementara tidak tersedia');
      return;
    }

    try {
      await navigator.clipboard.writeText(createdUser.tempPassword);
      toast.success('Password berhasil disalin');
    } catch (error) {
      console.error('Failed to copy password:', error);
      toast.error('Gagal menyalin password');
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/accounting/users')}
            className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title */}
            <div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Buat Akun Pengguna Baru
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  Buat akun untuk anggota tim dengan role dan akses spesifik
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'}`}>
                  ⚠ {slotStats.used} dari {slotStats.total} pengguna telah digunakan
                </span>
              </div>
            </div>

            {/* Personal Info Section */}
            <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Informasi Pribadi</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                  <p className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Info className="w-3 h-3" />
                    Nama akan ditampilkan di seluruh sistem
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Alamat Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Mail className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                      type="email"
                      placeholder="john@perusahaan.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full pl-12 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                  </div>
                  <p className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Info className="w-3 h-3" />
                    Email digunakan untuk login dan notifikasi
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Password (Opsional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      autoComplete="new-password"
                      placeholder="Klik Generate atau isi manual"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full pr-28 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                        isDark ? 'bg-slate-600 text-gray-200 hover:bg-slate-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Generate
                    </button>
                  </div>
                  <p className={`text-xs mt-1 flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Info className="w-3 h-3" />
                    Isi manual atau klik Generate untuk password acak.
                  </p>
                </div>
              </div>
            </div>

            {/* Role Section */}
            <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Role & Hak Akses</h2>
              </div>
              <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Pilih Role Pengguna <span className="text-red-500">*</span>
                <br />
                <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Role menentukan akses dan fitur yang tersedia</span>
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setFormData({ ...formData, role: role.id as RoleType })}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formData.role === role.id
                        ? isDark ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-500 bg-emerald-50'
                        : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        role.color === 'blue' ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600' :
                        role.color === 'purple' ? isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600' :
                        role.color === 'emerald' ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600' :
                        isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        <role.icon className="w-5 h-5" />
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.role === role.id
                          ? 'border-emerald-500 bg-emerald-500'
                          : isDark ? 'border-slate-600' : 'border-gray-300'
                      }`}>
                        {formData.role === role.id && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{role.name}</h3>
                    </div>
                    <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{role.description}</p>

                    <div className="space-y-1">
                      {role.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Check className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Outlet Assignment */}
            <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Assign ke Outlet</h3>
                <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Opsional</span>
              </div>

              <div className="relative mb-3">
                <select
                  value={formData.outletId}
                  onChange={(e) => setFormData({ ...formData, outletId: e.target.value })}
                  disabled={formData.allOutlets}
                  className={`w-full px-4 py-3 rounded-xl border appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="">Pilih outlet...</option>
                  {outlets.length === 0 ? (
                    <option value="" disabled>
                      Tidak ada outlet aktif
                    </option>
                  ) : (
                    outlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allOutlets}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allOutlets: e.target.checked,
                      outletId: e.target.checked ? '' : formData.outletId
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Berikan akses ke semua outlet</span>
              </label>
            </div>

            {/* Confirmation Section */}
            <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Konfirmasi</h2>
              </div>

              <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                    <Mail className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <div>
                    <h4 className={`font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Email Otomatis</h4>
                    <p className={`text-sm ${isDark ? 'text-emerald-300/80' : 'text-emerald-600'}`}>
                      Email dengan kredensial login akan dikirim otomatis ke alamat yang dimasukkan. User dapat langsung login setelah menerima email.
                    </p>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.confirmed}
                  onChange={(e) => setFormData({ ...formData, confirmed: e.target.checked })}
                  className="w-5 h-5 mt-0.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Saya mengonfirmasi bahwa data yang dimasukkan sudah benar
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => navigate('/accounting/users')}
                className={`px-6 py-3 rounded-xl font-medium border ${isDark ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.email || !formData.role || !formData.confirmed || isSubmitting}
                className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
                  formData.name && formData.email && formData.role && formData.confirmed && !isSubmitting
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : isDark ? 'bg-slate-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Membuat akun...' : 'Buat Akun & Kirim Email'}
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>

          {/* Sidebar - Email Preview */}
          <div className="space-y-6">
            <div className={`p-6 rounded-xl sticky top-6 ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Preview Email</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-slate-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  LIVE
                </span>
              </div>

              {/* Email Preview Card */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <div className="text-center py-6">
                  <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Akun Anda di MyAkuntan</h4>
                  <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Selamat datang! Akun Anda telah dibuat.<br />
                    Silakan klik tombol di bawah untuk<br />
                    mengaktifkan akun Anda.
                  </p>
                  <button className="mt-4 px-6 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium">
                    Aktivasi Akun
                  </button>
                  <p className={`text-xs mt-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    User akan menerima email seperti ini
                  </p>
                </div>
              </div>

              {/* Data Completion */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Kelengkapan Data</span>
                  <span className="text-sm font-medium text-emerald-500">{completionPercent}%</span>
                </div>
                <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Selesaikan semua field bertanda bintang (*)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {createdUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white shadow-xl'}`}>
            <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Pengguna berhasil dibuat
            </h3>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Simpan kredensial ini untuk login pertama.
            </p>

            <div className={`mt-4 rounded-lg border p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Email</p>
              <p className={`mt-1 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{createdUser.email}</p>
            </div>

            <div className={`mt-3 rounded-lg border p-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Password login</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdUser.tempPassword || 'Tidak tersedia'}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
                <button
                  onClick={handleCopyPassword}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 text-gray-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Salin
                </button>
              </div>
              <p className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {createdUser.emailSent ? 'Email dikirim (mock). Pastikan user menerima kredensial.' : 'Email tidak dikirim, bagikan password ini secara aman.'}
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setCreatedUser(null);
                  resetForm();
                }}
                className={`flex-1 rounded-lg px-4 py-2 font-medium ${isDark ? 'bg-slate-700 text-gray-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Buat Lagi
              </button>
              <button
                onClick={() => navigate('/accounting/users')}
                className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 font-medium text-white hover:bg-emerald-600"
              >
                Lihat Pengguna
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
