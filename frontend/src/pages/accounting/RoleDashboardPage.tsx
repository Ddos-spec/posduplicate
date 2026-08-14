import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Loader2,
  PackageSearch,
  ReceiptText,
  RefreshCw,
  Users
} from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import {
  dashboardService,
  type DashboardSummary,
  type RecentTransaction,
  type TopProduct
} from '../../services/dashboardService';

type DashboardRole = 'Retail' | 'Distributor' | 'Produsen';

interface RoleDashboardPageProps {
  role: DashboardRole;
  description: string;
}

const emptySummary: DashboardSummary = {
  totalSales: 0,
  totalTransactions: 0,
  totalProducts: 0,
  totalCustomers: 0,
  averageTransaction: 0
};

const currency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

export default function RoleDashboardPage({ role, description }: RoleDashboardPageProps) {
  const { isDark } = useThemeStore();
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setWarning('');

    const [summaryResult, transactionResult, productResult] = await Promise.allSettled([
      dashboardService.getSummary(),
      dashboardService.getRecentTransactions({ limit: 8 }),
      dashboardService.getTopProducts({ limit: 6 })
    ]);

    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
    if (transactionResult.status === 'fulfilled') setTransactions(transactionResult.value);
    if (productResult.status === 'fulfilled') setTopProducts(productResult.value);

    if ([summaryResult, transactionResult, productResult].some(result => result.status === 'rejected')) {
      setWarning('Sebagian data dashboard belum dapat dimuat. Data yang tersedia tetap ditampilkan.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const panelClass = isDark
    ? 'border-slate-700 bg-slate-800 text-white'
    : 'border-gray-200 bg-white text-gray-900';
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const cards = [
    { label: 'Penjualan', value: currency(summary.totalSales), icon: CircleDollarSign },
    { label: 'Transaksi', value: summary.totalTransactions.toLocaleString('id-ID'), icon: ReceiptText },
    { label: 'Produk', value: summary.totalProducts.toLocaleString('id-ID'), icon: Boxes },
    { label: 'Pelanggan', value: summary.totalCustomers.toLocaleString('id-ID'), icon: Users }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedClass}`}>Dashboard {role}</p>
          <h1 className={`mt-1 text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Ringkasan operasional langsung</h1>
          <p className={`mt-1 text-sm ${mutedClass}`}>{description}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Muat ulang
        </button>
      </div>

      {warning ? (
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${isDark ? 'border-amber-700/60 bg-amber-950/30 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">{warning}</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className={`rounded-2xl border p-5 ${panelClass}`}>
            <div className="flex items-center justify-between">
              <p className={`text-sm ${mutedClass}`}>{card.label}</p>
              <card.icon className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-3 text-2xl font-bold">{loading ? '…' : card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className={`overflow-hidden rounded-2xl border ${panelClass}`}>
          <div className="border-b border-inherit px-5 py-4">
            <h2 className="font-semibold">Transaksi terbaru</h2>
            <p className={`mt-1 text-xs ${mutedClass}`}>Bersumber dari transaksi tenant aktif.</p>
          </div>
          {loading ? (
            <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
          ) : transactions.length === 0 ? (
            <div className={`flex min-h-48 flex-col items-center justify-center gap-2 px-6 text-center ${mutedClass}`}>
              <ReceiptText className="h-8 w-8" />
              <p className="text-sm">Belum ada transaksi untuk ditampilkan.</p>
            </div>
          ) : (
            <div className="divide-y divide-inherit">
              {transactions.map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{transaction.transactionNumber}</p>
                    <p className={`text-xs ${mutedClass}`}>{new Date(transaction.createdAt).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{currency(transaction.total)}</p>
                    <p className={`text-xs ${mutedClass}`}>{transaction.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`rounded-2xl border ${panelClass}`}>
          <div className="border-b border-inherit px-5 py-4">
            <h2 className="font-semibold">Produk teratas</h2>
            <p className={`mt-1 text-xs ${mutedClass}`}>Peringkat berdasarkan penjualan aktual.</p>
          </div>
          {loading ? (
            <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
          ) : topProducts.length === 0 ? (
            <div className={`flex min-h-48 flex-col items-center justify-center gap-2 px-6 text-center ${mutedClass}`}>
              <PackageSearch className="h-8 w-8" />
              <p className="text-sm">Belum ada data penjualan produk.</p>
            </div>
          ) : (
            <div className="space-y-3 p-5">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className={`text-xs ${mutedClass}`}>{product.qty.toLocaleString('id-ID')} terjual</p>
                  </div>
                  <p className="text-sm font-semibold">{currency(product.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
