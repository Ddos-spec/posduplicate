import { useState, useEffect, useCallback } from 'react';
import { Save, Upload, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { settingsService } from '../../services/settingsService';
import type { TenantSettings } from '../../services/settingsService';
import api, { getFullUrl } from '../../services/api';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'business' | 'tax' | 'receipt' | 'notifications' | 'system' | 'password'>('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TenantSettings | null>(null);

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const result = await settingsService.getSettings();
      setSettings(result.data);
      // Convert relative logo path to full URL if it exists
      const logoUrl = result.data.logo ? getFullUrl(result.data.logo) : '';
      setLogoPreview(logoUrl);
    } catch (error: unknown) {
      console.error('Error fetching settings:', error);
      let errorMessage = 'Failed to load settings';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const logoUrl = getFullUrl(response.data.data.url);
      setLogoPreview(logoUrl);
      if (settings) {
        // Create a clean settings object with only the fields that go to tenant table and settings object
        const cleanSettings = {
          ...settings,
          logo: response.data.data.url
        };

        setSettings(cleanSettings);
        // Save only the logo field to the settings in the database
        await handleSave({ logo: response.data.data.url });
      }
      toast.success('Logo uploaded successfully');
    } catch (error: unknown) {
      console.error('Error uploading logo:', error);
      let errorMessage = 'Failed to upload logo';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (updateData: Partial<TenantSettings>) => {
    try {
      setSaving(true);

      // Clean the updateData to avoid circular references
      const cleanUpdateData = { ...updateData };
      delete (cleanUpdateData as any).id; // Remove id if it's not supposed to be updated

      await settingsService.updateSettings(cleanUpdateData as any);
      toast.success('Settings saved successfully!');
      fetchSettings(); // Refresh settings
    } catch (error: unknown) {
      console.error('Error saving settings:', error);
      let errorMessage = 'Failed to save settings';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      await settingsService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      let errorMessage = 'Failed to change password';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  if (!settings) {
    return <div className="text-center py-8 text-gray-500">Failed to load settings</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600">Configure your business settings</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-4 overflow-x-auto">
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
              className={`px-4 py-2 font-medium border-b-2 whitespace-nowrap ${
                activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        {activeTab === 'business' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">Business Information</h3>
            <form id="business-form" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSave({
                businessName: (formData.get('businessName') as string) || '',
                ownerName: (formData.get('ownerName') as string) || null,
                email: (formData.get('email') as string) || '',
                phone: (formData.get('phone') as string) || null,
                address: (formData.get('address') as string) || null,
                logo: settings.logo || null
              });
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Business Name</label>
                  <input
                    type="text"
                    name="businessName"
                    defaultValue={settings.businessName}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Owner Name</label>
                  <input
                    type="text"
                    name="ownerName"
                    defaultValue={settings.ownerName || ''}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={settings.email}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={settings.phone || ''}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Address</label>
                <textarea
                  name="address"
                  defaultValue={settings.address || ''}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Business Logo</label>
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
                        onClick={async () => {
                          setLogoPreview('');
                          if (settings) {
                            setSettings({ ...settings, logo: null });
                            // Save the removal to database
                            await handleSave({ logo: null });
                          }
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
                      {uploadingLogo ? 'Uploading...' : logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </span>
                  </label>
                  <p className="text-xs text-gray-500">Recommended: Square image, max 5MB</p>
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'tax' && settings && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">Tax & Service Charges</h3>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="enable-tax"
                checked={settings.enableTax || false}
                onChange={(e) => setSettings({ ...settings, enableTax: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="enable-tax" className="cursor-pointer">Enable Tax</label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tax Rate (%)</label>
                <input
                  type="number"
                  value={settings.taxRate || 0}
                  onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tax Name</label>
                <input
                  type="text"
                  value={settings.taxName || ''}
                  onChange={(e) => setSettings({ ...settings, taxName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., PB1, VAT, Sales Tax"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="enable-service"
                checked={settings.enableServiceCharge || false}
                onChange={(e) => setSettings({ ...settings, enableServiceCharge: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="enable-service" className="cursor-pointer">Enable Service Charge</label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Service Charge (%)</label>
              <input
                type="number"
                value={settings.serviceCharge || 0}
                onChange={(e) => setSettings({ ...settings, serviceCharge: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <button
              onClick={() => handleSave({
                enableTax: settings.enableTax,
                taxRate: settings.taxRate,
                taxName: settings.taxName,
                enableServiceCharge: settings.enableServiceCharge,
                serviceCharge: settings.serviceCharge
              })}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}

        {activeTab === 'receipt' && settings && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg mb-4">Receipt / Struk Settings</h3>

            {/* Business Info for Receipt */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h4 className="font-medium">Informasi Toko (akan tampil di struk)</h4>
              <div>
                <label className="block text-sm font-medium mb-2">Nama Toko</label>
                <input
                  type="text"
                  value={settings.businessName || ''}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Contoh: Toko Saya"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Alamat</label>
                <input
                  type="text"
                  value={settings.address || ''}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Jl. Contoh No. 123, Jakarta"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nomor Telepon</label>
                <input
                  type="text"
                  value={settings.phone || ''}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="021-12345678"
                />
              </div>
            </div>

            {/* Custom Messages */}
            <div>
              <label className="block text-sm font-medium mb-2">Header Custom (opsional)</label>
              <textarea
                value={settings.receiptHeader || ''}
                onChange={(e) => setSettings({ ...settings, receiptHeader: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                placeholder="Pesan tambahan di atas struk (opsional)"
              />
              <p className="text-xs text-gray-500 mt-1">Contoh: "Promo 10% setiap Jumat!"</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Footer Custom (opsional)</label>
              <textarea
                value={settings.receiptFooter || ''}
                onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                placeholder="Pesan tambahan di bawah struk (opsional)"
              />
              <p className="text-xs text-gray-500 mt-1">Sudah ada default: "Terima kasih, Barang tidak dapat dikembalikan"</p>
            </div>

            {/* Printer Settings */}
            <div>
              <label className="block text-sm font-medium mb-2">Lebar Printer</label>
              <select
                value={settings.printerWidth || '80mm'}
                onChange={(e) => setSettings({ ...settings, printerWidth: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="58mm">58mm (kecil)</option>
                <option value="80mm">80mm (standard)</option>
              </select>
            </div>

            {/* Logo Upload Section */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h4 className="font-medium">Logo Toko</h4>
              {logoPreview && (
                <div className="relative w-32 h-32">
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    className="w-full h-full object-contain rounded-lg border-2 border-gray-300 bg-white p-2"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      setLogoPreview('');
                      if (settings) {
                        setSettings({ ...settings, logo: null });
                        // Save the removal to database
                        await handleSave({ logo: null });
                      }
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
              <p className="text-xs text-gray-500">Logo persegi, maksimal 5MB</p>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="show-logo"
                  checked={settings.showLogoOnReceipt || false}
                  onChange={(e) => setSettings({ ...settings, showLogoOnReceipt: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="show-logo" className="cursor-pointer text-sm">Tampilkan Logo di Struk</label>
              </div>
            </div>

            <button
              onClick={() => handleSave({
                businessName: settings.businessName,
                address: settings.address,
                phone: settings.phone,
                receiptHeader: settings.receiptHeader,
                receiptFooter: settings.receiptFooter,
                printerWidth: settings.printerWidth,
                logo: settings.logo || null,
                showLogoOnReceipt: settings.showLogoOnReceipt
              })}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan Pengaturan Struk
                </>
              )}
            </button>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">Notification Settings</h3>
            {['Email notifications', 'Low stock alerts', 'Daily sales report', 'WhatsApp notifications'].map((item) => (
              <div key={item} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span>{item}</span>
                <input type="checkbox" defaultChecked={item !== 'WhatsApp notifications'} className="w-4 h-4" />
              </div>
            ))}
            <button onClick={() => handleSave({})} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save Changes</button>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">System Preferences</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Currency</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>IDR - Indonesian Rupiah</option>
                  <option>USD - US Dollar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date Format</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time Format</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>24 Hour</option>
                  <option>12 Hour</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>Indonesia</option>
                  <option>English</option>
                </select>
              </div>
            </div>
            <button onClick={() => handleSave({})} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save Changes</button>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="space-y-4 max-w-md">
            <h3 className="font-semibold text-lg mb-4">Change Password</h3>
            <div>
              <label className="block text-sm font-medium mb-2">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Confirm New Password</label>
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
              {saving ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
