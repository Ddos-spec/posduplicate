import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useThemeStore } from '../../store/themeStore';

type AccountOption = {
  id: number;
  account_code: string;
  account_name: string;
  category?: string | null;
  is_active?: boolean | null;
};

type LedgerEntry = {
  id: number;
  accountId: number;
  accountCode?: string | null;
  accountName?: string | null;
  journalNumber?: string | null;
  journalType?: string | null;
  transactionDate: string;
  description?: string | null;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  balanceType?: string | null;
  outlet?: { id: number; name: string } | null;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(value);

const formatDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export default function LedgerPage() {
  const { isDark } = useThemeStore();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({
    accountId: '',
    startDate: '',
    endDate: ''
  });

  const fetchAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true);
      const response = await api.get('/accounting/coa');
      const flatAccounts: AccountOption[] = response.data?.data?.flat || [];
      const filtered = flatAccounts
        .filter((account) => account.category === 'ACCOUNT' && account.is_active !== false)
        .sort((a, b) => a.account_code.localeCompare(b.account_code));
      setAccounts(filtered);
    } catch (error) {
      console.error('Failed to load chart of accounts:', error);
      toast.error('Gagal memuat daftar akun');
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  const fetchEntries = useCallback(
    async (pageValue: number) => {
      try {
        setLoading(true);
        const params: Record<string, string | number> = {
          page: pageValue,
          limit: pageSize
        };

        if (filters.accountId) {
          params.accountId = filters.accountId;
        }
        if (filters.startDate) {
          params.startDate = filters.startDate;
        }
        if (filters.endDate) {
          params.endDate = filters.endDate;
        }

        const response = await api.get('/accounting/ledger', { params });
        const payload = response.data?.data;
        setEntries(payload?.entries || []);
        setPage(payload?.pagination?.page || pageValue);
        setTotalPages(payload?.pagination?.totalPages || 1);
        setTotalItems(payload?.pagination?.total || 0);
      } catch (error) {
        console.error('Failed to load ledger entries:', error);
        toast.error('Gagal memuat buku besar');
      } finally {
        setLoading(false);
      }
    },
    [filters.accountId, filters.endDate, filters.startDate, pageSize]
  );

  useEffect(() => {
    fetchAccounts();
    fetchEntries(1);
  }, [fetchAccounts, fetchEntries]);

  const handleApplyFilter = () => {
    fetchEntries(1);
  };

  const handleResetFilter = () => {
    setFilters({ accountId: '', startDate: '', endDate: '' });
    fetchEntries(1);
  };

  const totalDebit = useMemo(
    () => entries.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0),
    [entries]
  );
  const totalCredit = useMemo(
    () => entries.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0),
    [entries]
  );

  return (
    <div className="space-y-6">
      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Akuntansi / <span className={isDark ? 'text-white' : 'text-gray-900'}>Buku Besar</span>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Buku Besar</h1>
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
          Riwayat transaksi per akun dengan saldo berjalan.
        </p>
      </div>

      <div className={`rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
        <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Akun
              </label>
              <select
                value={filters.accountId}
                onChange={(event) => setFilters((prev) => ({ ...prev, accountId: event.target.value }))}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
                disabled={loadingAccounts}
              >
                <option value="">Semua akun</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_code} - {account.account_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Dari tanggal
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Sampai tanggal
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleApplyFilter}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Terapkan
              </button>
              <button
                type="button"
                onClick={handleResetFilter}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium ${
                  isDark
                    ? 'border-slate-600 text-gray-200 hover:bg-slate-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className={isDark ? 'bg-slate-700/50 text-gray-300' : 'bg-gray-50 text-gray-500'}>
              <tr>
                <th className="px-4 py-3 text-left font-medium">Tanggal</th>
                <th className="px-4 py-3 text-left font-medium">Akun</th>
                <th className="px-4 py-3 text-left font-medium">Jurnal</th>
                <th className="px-4 py-3 text-left font-medium">Keterangan</th>
                <th className="px-4 py-3 text-right font-medium">Debit</th>
                <th className="px-4 py-3 text-right font-medium">Kredit</th>
                <th className="px-4 py-3 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-slate-700 text-gray-200' : 'divide-y divide-gray-200'}>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memuat data buku besar...
                    </div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada transaksi untuk filter ini.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className={isDark ? 'hover:bg-slate-700/40' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3">{formatDate(entry.transactionDate)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{entry.accountName || '-'}</div>
                      <div className={isDark ? 'text-xs text-gray-400' : 'text-xs text-gray-500'}>
                        {entry.accountCode || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{entry.journalNumber || '-'}</div>
                      <div className={isDark ? 'text-xs text-gray-400' : 'text-xs text-gray-500'}>
                        {entry.journalType || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">{entry.description || '-'}</td>
                    <td className="px-4 py-3 text-right">Rp {formatNumber(entry.debitAmount)}</td>
                    <td className="px-4 py-3 text-right">Rp {formatNumber(entry.creditAmount)}</td>
                    <td className="px-4 py-3 text-right">
                      Rp {formatNumber(entry.balance)}{' '}
                      <span className={isDark ? 'text-xs text-gray-400' : 'text-xs text-gray-500'}>
                        {entry.balanceType === 'CREDIT' ? 'Cr' : entry.balanceType === 'DEBIT' ? 'Dr' : ''}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={`flex flex-col gap-4 border-t px-4 py-4 md:flex-row md:items-center md:justify-between ${
          isDark ? 'border-slate-700 text-gray-300' : 'border-gray-200 text-gray-600'
        }`}
        >
          <div className="flex flex-col gap-1 text-sm">
            <span>Total debit: Rp {formatNumber(totalDebit)}</span>
            <span>Total kredit: Rp {formatNumber(totalCredit)}</span>
            <span>Total transaksi: {totalItems}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchEntries(Math.max(page - 1, 1))}
              disabled={page <= 1 || loading}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                isDark
                  ? 'border-slate-600 text-gray-200 hover:bg-slate-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              } ${page <= 1 || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Sebelumnya
            </button>
            <span className="text-sm">
              Halaman {page} dari {totalPages}
            </span>
            <button
              type="button"
              onClick={() => fetchEntries(Math.min(page + 1, totalPages))}
              disabled={page >= totalPages || loading}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                isDark
                  ? 'border-slate-600 text-gray-200 hover:bg-slate-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              } ${page >= totalPages || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
