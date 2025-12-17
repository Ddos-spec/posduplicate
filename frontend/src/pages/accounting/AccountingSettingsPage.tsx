import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { settingsService } from '../../services/settingsService';
import { useThemeStore } from '../../store/themeStore';

type AccountOption = {
  id: number;
  account_code: string;
  account_name: string;
  category?: string | null;
  is_active?: boolean | null;
};

type AccountingSettings = {
  fiscalYearStartMonth: number;
  autoPostJournal: boolean;
  defaultCashAccountId: number | null;
  defaultSalesAccountId: number | null;
  defaultCogsAccountId: number | null;
  defaultInventoryAccountId: number | null;
  defaultReceivableAccountId: number | null;
  defaultPayableAccountId: number | null;
};

const monthOptions = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' }
];

const defaultSettings: AccountingSettings = {
  fiscalYearStartMonth: 1,
  autoPostJournal: false,
  defaultCashAccountId: null,
  defaultSalesAccountId: null,
  defaultCogsAccountId: null,
  defaultInventoryAccountId: null,
  defaultReceivableAccountId: null,
  defaultPayableAccountId: null
};

export default function AccountingSettingsPage() {
  const { isDark } = useThemeStore();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [settings, setSettings] = useState<AccountingSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsResponse, coaResponse] = await Promise.all([
        settingsService.getSettings(),
        api.get('/accounting/coa')
      ]);

      const accountingSettings = (settingsResponse.data as any)?.accountingSettings || {};
      setSettings({ ...defaultSettings, ...accountingSettings });

      const flatAccounts: AccountOption[] = coaResponse.data?.data?.flat || [];
      const filtered = flatAccounts
        .filter((account) => account.category === 'ACCOUNT' && account.is_active !== false)
        .sort((a, b) => a.account_code.localeCompare(b.account_code));
      setAccounts(filtered);
    } catch (error) {
      console.error('Failed to load accounting settings:', error);
      toast.error('Gagal memuat pengaturan akuntansi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsService.updateSettings({
        accountingSettings: settings
      } as any);
      toast.success('Pengaturan akuntansi disimpan');
      loadData();
    } catch (error) {
      console.error('Failed to save accounting settings:', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center gap-2 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Memuat pengaturan akuntansi...
      </div>
    );
  }

  const renderAccountOptions = () => (
    <>
      <option value="">Pilih akun</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.account_code} - {account.account_name}
        </option>
      ))}
    </>
  );

  const selectClass = `mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
    isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
  }`;

  return (
    <div className="space-y-6">
      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Akuntansi / <span className={isDark ? 'text-white' : 'text-gray-900'}>Pengaturan</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Pengaturan Akuntansi</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            Atur akun default dan periode buku untuk modul akuntansi.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>

      <div className={`rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
        <div className={`border-b px-6 py-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Periode dan Otomasi</h2>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div>
            <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Awal tahun buku
            </label>
            <select
              value={settings.fiscalYearStartMonth}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, fiscalYearStartMonth: Number(event.target.value) }))
              }
              className={selectClass}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Auto posting jurnal
            </label>
            <div
              className={`mt-1 flex items-center justify-between rounded-lg border px-3 py-2 ${
                isDark ? 'border-slate-600 bg-slate-700 text-gray-200' : 'border-gray-200 bg-gray-50 text-gray-700'
              }`}
            >
              <span className="text-sm">Posting otomatis saat transaksi selesai</span>
              <input
                type="checkbox"
                checked={settings.autoPostJournal}
                onChange={(event) => setSettings((prev) => ({ ...prev, autoPostJournal: event.target.checked }))}
                className="h-4 w-4"
              />
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
        <div className={`border-b px-6 py-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Akun Default</h2>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div>
            <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Kas / Bank
            </label>
            <select
              value={settings.defaultCashAccountId ?? ''}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  defaultCashAccountId: event.target.value ? Number(event.target.value) : null
                }))
              }
              className={selectClass}
            >
              {renderAccountOptions()}
            </select>
          </div>
          <div>
            <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Piutang usaha
            </label>
            <select
              value={settings.defaultReceivableAccountId ?? ''}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  defaultReceivableAccountId: event.target.value ? Number(event.target.value) : null
                }))
              }
              className={selectClass}
            >
              {renderAccountOptions()}
            </select>
          </div>
          <div>
            <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Hutang usaha
            </label>
            <select
              value={settings.defaultPayableAccountId ?? ''}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  defaultPayableAccountId: event.target.value ? Number(event.target.value) : null
                }))
              }
              className={selectClass}
            >
              {renderAccountOptions()}
            </select>
          </div>
          <div>
            <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Persediaan
            </label>
            <select
              value={settings.defaultInventoryAccountId ?? ''}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  defaultInventoryAccountId: event.target.value ? Number(event.target.value) : null
                }))
              }
              className={selectClass}
            >
              {renderAccountOptions()}
            </select>
          </div>
          <div>
            <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Pendapatan
            </label>
            <select
              value={settings.defaultSalesAccountId ?? ''}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  defaultSalesAccountId: event.target.value ? Number(event.target.value) : null
                }))
              }
              className={selectClass}
            >
              {renderAccountOptions()}
            </select>
          </div>
          <div>
            <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Harga pokok penjualan
            </label>
            <select
              value={settings.defaultCogsAccountId ?? ''}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  defaultCogsAccountId: event.target.value ? Number(event.target.value) : null
                }))
              }
              className={selectClass}
            >
              {renderAccountOptions()}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
