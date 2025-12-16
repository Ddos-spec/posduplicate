import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import {
  ArrowLeft, Mail, User, Check, ChevronDown, Eye, Building2,
  Package, Factory, ShoppingCart, Calculator, Info
} from 'lucide-react';

type RoleType = 'distributor' | 'produsen' | 'retail' | 'accountant' | null;

export default function CreateUserPage() {
  const { isDark } = useThemeStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: null as RoleType,
    outlet: '',
    allOutlets: false,
    confirmed: false
  });

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
    },
    {
      id: 'accountant',
      name: 'Accountant',
      description: 'Akses penuh ke semua laporan keuangan',
      icon: Calculator,
      color: 'indigo',
      badge: 'FULL ACCESS',
      features: ['Jurnal & Buku Besar', 'Laporan Laba Rugi']
    }
  ];

  const stats = {
    used: 8,
    total: 20,
    percentage: 60
  };

  const handleSubmit = () => {
    // Handle form submission
    console.log('Creating user:', formData);
    navigate('/accounting/users');
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
                  ⚠ {stats.used} dari {stats.total} pengguna telah digunakan
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
                      {role.badge && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                          {role.badge}
                        </span>
                      )}
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
                  value={formData.outlet}
                  onChange={(e) => setFormData({ ...formData, outlet: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                >
                  <option value="">Pilih outlet...</option>
                  <option value="pusat">Outlet Pusat</option>
                  <option value="jakarta">Outlet Jakarta</option>
                  <option value="surabaya">Outlet Surabaya</option>
                </select>
                <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allOutlets}
                  onChange={(e) => setFormData({ ...formData, allOutlets: e.target.checked })}
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
                disabled={!formData.name || !formData.email || !formData.role || !formData.confirmed}
                className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
                  formData.name && formData.email && formData.role && formData.confirmed
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : isDark ? 'bg-slate-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Buat Akun & Kirim Email
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
                  <span className="text-sm font-medium text-emerald-500">{stats.percentage}%</span>
                </div>
                <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${stats.percentage}%` }}
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
    </div>
  );
}
