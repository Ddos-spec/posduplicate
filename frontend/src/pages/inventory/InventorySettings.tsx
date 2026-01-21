import { useState, useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { inventorySettingsService, InventorySettings as ISettings } from '../../services/inventoryService';
import { Bell, Archive, Save, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function InventorySettings() {
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const location = useLocation();

  const isDemo = location.pathname.startsWith('/demo');

  const [loading, setLoading] = useState(!isDemo);
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState('FIFO');
  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [expiryAlert, setExpiryAlert] = useState(true);
  const [waApproval, setWaApproval] = useState(false);
  const [settings, setSettings] = useState<Partial<ISettings>>({});

  useEffect(() => {
    if (isDemo) return;

    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await inventorySettingsService.get(user?.outlet_id!);
        if (response.success && response.data) {
          const data = response.data;
          setSettings(data);
          // Load custom settings if available
          if (data.settings) {
            setMethod(data.settings.valuation_method || 'FIFO');
            setLowStockAlert(data.settings.low_stock_alert !== false);
            setExpiryAlert(data.track_expiry || false);
            setWaApproval(data.settings.wa_approval || false);
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [isDemo, user?.outlet_id]);

  const handleSave = async () => {
    if (isDemo) {
      toast.success('Pengaturan berhasil disimpan!');
      return;
    }

    try {
      setSaving(true);
      const response = await inventorySettingsService.update(user?.outlet_id!, {
        track_expiry: expiryAlert,
        settings: {
          ...settings.settings,
          valuation_method: method,
          low_stock_alert: lowStockAlert,
          wa_approval: waApproval
        }
      });

      if (response.success) {
        toast.success('Pengaturan berhasil disimpan!');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Pengaturan Inventory</h1>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Konfigurasi metode valuasi dan notifikasi.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Valuation Method */}
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className={`font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Archive className="text-orange-500" /> Metode Valuasi Stok
            </h3>
            
            <div className="space-y-3">
                {['FIFO (First In First Out)', 'LIFO (Last In First Out)', 'Average Cost'].map((m) => (
                    <label key={m} className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                        method === m.split(' ')[0] 
                        ? 'border-orange-500 bg-orange-50 dark:bg-slate-700' 
                        : isDark ? 'border-slate-600' : 'border-gray-200'
                    }`}>
                        <input 
                            type="radio" 
                            name="valuation" 
                            className="w-5 h-5 text-orange-600 focus:ring-orange-500"
                            checked={method === m.split(' ')[0]}
                            onChange={() => setMethod(m.split(' ')[0])}
                        />
                        <span className={`ml-3 font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{m}</span>
                    </label>
                ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">* Perubahan metode valuasi akan mempengaruhi laporan keuangan periode berikutnya.</p>
        </div>

        {/* Notifications */}
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className={`font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Bell className="text-blue-500" /> Notifikasi Stok
            </h3>
            
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Alert Stok Menipis</p>
                        <p className="text-xs text-gray-500">Kirim notifikasi saat stok di bawah batas aman.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={lowStockAlert}
                      onChange={(e) => setLowStockAlert(e.target.checked)}
                      className="toggle-checkbox"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Alert Barang Expired (H-30)</p>
                        <p className="text-xs text-gray-500">Peringatan dini untuk barang yang akan kadaluarsa.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={expiryAlert}
                      onChange={(e) => setExpiryAlert(e.target.checked)}
                      className="toggle-checkbox"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Approval PO via WhatsApp</p>
                        <p className="text-xs text-gray-500">Kirim link approval ke nomor owner.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={waApproval}
                      onChange={(e) => setWaApproval(e.target.checked)}
                      className="toggle-checkbox"
                    />
                </div>
            </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-lg flex items-center gap-2 disabled:opacity-50"
        >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  );
}
