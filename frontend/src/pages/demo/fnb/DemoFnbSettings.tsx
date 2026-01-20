import { useState, useEffect } from 'react';
import { Save, Upload, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import DemoLayout from '../DemoLayout';

// Mock Data
const MOCK_SETTINGS = {
  id: 1,
  businessName: 'FNB Demo Store',
  ownerName: 'Pak Budi',
  email: 'owner@fnbdemo.com',
  phone: '081234567890',
  address: 'Jl. Sudirman No. 1, Jakarta',
  logo: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=100&q=80',
  enableTax: true,
  taxRate: 11,
  taxName: 'PB1',
  enableServiceCharge: true,
  serviceCharge: 5,
  receiptHeader: 'Selamat Datang!',
  receiptFooter: 'Terima kasih atas kunjungan Anda.',
  printerWidth: '80mm',
  showLogoOnReceipt: true
};

export default function DemoFnbSettings() {
  const [activeTab, setActiveTab] = useState<'business' | 'tax' | 'receipt' | 'notifications' | 'system' | 'password'>('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setSettings(MOCK_SETTINGS);
      setLogoPreview(MOCK_SETTINGS.logo);
      setLoading(false);
    }, 800);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    setUploadingLogo(true);
    // Simulate upload delay
    setTimeout(() => {
        const fakeUrl = URL.createObjectURL(file);
        setLogoPreview(fakeUrl);
        setSettings({ ...settings, logo: fakeUrl });
        toast.success('Simulasi: Logo berhasil diupload');
        setUploadingLogo(false);
    }, 1500);
  };

  const handleSave = (updateData: any) => {
    setSaving(true);
    setTimeout(() => {
      setSettings({ ...settings, ...updateData });
      toast.success('Simulasi: Pengaturan disimpan');
      setSaving(false);
    }, 1000);
  };

  const handleChangePassword = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Mohon isi semua field password');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Password baru tidak cocok');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      toast.success('Simulasi: Password berhasil diubah');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSaving(false);
    }, 1000);
  };

  if (loading) {
    return (
      <DemoLayout variant="owner" title="Pengaturan (Demo)">
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Memuat pengaturan...</span>
        </div>
      </DemoLayout>
    );
  }

  return (
    <DemoLayout variant="owner" title="Pengaturan (Demo)">
        <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600">Konfigurasi bisnis Anda (Mode Demo)</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {[
            { key: 'business', label: 'Business Info' },
            { key: 'tax', label: 'Tax & Charges' },
            { key: 'receipt', label: 'Receipt' },
            { key: 'notifications', label: 'Notifications' },
            { key: 'system', label: 'System' },
            { key: 'password', label: 'Password' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
        {activeTab === 'business' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">Informasi Bisnis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nama Bisnis</label>
                  <input
                    type="text"
                    value={settings.businessName}
                    onChange={(e) => setSettings({...settings, businessName: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nama Pemilik</label>
                  <input
                    type="text"
                    value={settings.ownerName}
                    onChange={(e) => setSettings({...settings, ownerName: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({...settings, email: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Telepon</label>
                  <input
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => setSettings({...settings, phone: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
            </div>
              <div>
                <label className="block text-sm font-medium mb-2">Alamat</label>
                <textarea
                  value={settings.address}
                  onChange={(e) => setSettings({...settings, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Logo Bisnis</label>
                <div className="space-y-3">
                  {logoPreview && (
                    <div className="relative w-32 h-32">
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        className="w-full h-full object-contain rounded-lg border-2 border-gray-300 bg-white p-2"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLogoPreview('');
                          setSettings({ ...settings, logo: null });
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <label className={`inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition ${
                    uploadingLogo ? 'bg-gray-100 cursor-wait' : 'hover:border-blue-500 hover:bg-blue-50'
                  }`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">
                      {uploadingLogo ? 'Uploading...' : logoPreview ? 'Ganti Logo' : 'Upload Logo'}
                    </span>
                  </label>
                  <p className="text-xs text-gray-500">Rekomendasi: Persegi, max 5MB</p>
                </div>
              </div>
              <button
                onClick={() => handleSave({})}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
          </div>
        )}

        {activeTab === 'tax' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">Pajak & Biaya Layanan</h3>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="enable-tax"
                checked={settings.enableTax}
                onChange={(e) => setSettings({ ...settings, enableTax: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="enable-tax" className="cursor-pointer font-medium">Aktifkan Pajak</label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tarif Pajak (%)</label>
                <input
                  type="number"
                  value={settings.taxRate}
                  onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nama Pajak</label>
                <input
                  type="text"
                  value={settings.taxName}
                  onChange={(e) => setSettings({ ...settings, taxName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="enable-service"
                checked={settings.enableServiceCharge}
                onChange={(e) => setSettings({ ...settings, enableServiceCharge: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="enable-service" className="cursor-pointer font-medium">Aktifkan Service Charge</label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Service Charge (%)</label>
              <input
                type="number"
                value={settings.serviceCharge}
                onChange={(e) => setSettings({ ...settings, serviceCharge: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => handleSave({})}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Simpan Perubahan
            </button>
          </div>
        )}

        {activeTab === 'receipt' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg mb-4">Pengaturan Struk</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Header Custom</label>
              <textarea
                value={settings.receiptHeader}
                onChange={(e) => setSettings({ ...settings, receiptHeader: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Footer Custom</label>
              <textarea
                value={settings.receiptFooter}
                onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Lebar Printer</label>
              <select
                value={settings.printerWidth}
                onChange={(e) => setSettings({ ...settings, printerWidth: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="58mm">58mm (Kecil)</option>
                <option value="80mm">80mm (Standar)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="show-logo"
                  checked={settings.showLogoOnReceipt}
                  onChange={(e) => setSettings({ ...settings, showLogoOnReceipt: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="show-logo" className="cursor-pointer text-sm">Tampilkan Logo di Struk</label>
            </div>

            <button
              onClick={() => handleSave({})}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Simpan Pengaturan
            </button>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">Pengaturan Notifikasi</h3>
            {['Notifikasi Email', 'Peringatan Stok Menipis', 'Laporan Harian (Email)', 'Notifikasi WhatsApp'].map((item) => (
              <div key={item} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">{item}</span>
                <input type="checkbox" defaultChecked={true} className="w-5 h-5 text-blue-600" />
              </div>
            ))}
            <button onClick={() => handleSave({})} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan Perubahan</button>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">Preferensi Sistem</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Mata Uang</label>
                <select className="w-full px-3 py-2 border rounded-lg bg-gray-50 cursor-not-allowed" disabled>
                  <option>IDR - Rupiah Indonesia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Format Tanggal</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>DD/MM/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Bahasa</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>Indonesia</option>
                  <option>English</option>
                </select>
              </div>
            </div>
            <button onClick={() => handleSave({})} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan Perubahan</button>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="space-y-4 max-w-md">
            <h3 className="font-semibold text-lg mb-4">Ganti Password</h3>
            <div>
              <label className="block text-sm font-medium mb-2">Password Saat Ini</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password Baru</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Konfirmasi Password Baru</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={saving}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? 'Memproses...' : 'Ganti Password'}
            </button>
          </div>
        )}
      </div>
      </div>
    </DemoLayout>
  );
}
