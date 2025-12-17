import { useMemo } from 'react';
import { useThemeStore } from '../../../store/themeStore';
import DemoLayout from '../DemoLayout';

type Variant = 'retail' | 'distributor' | 'produsen';

type StatCard = {
  label: string;
  value: string;
  tone?: 'emerald' | 'blue' | 'purple' | 'orange';
};

type TableConfig = {
  title: string;
  columns: string[];
  rows: Array<Record<string, string>>;
};

type ReadOnlyConfig = {
  title: string;
  subtitle: string;
  note?: string;
  stats?: StatCard[];
  table?: TableConfig;
};

// ... COPYING CONFIG MAP (HUGE STATIC DATA) ...
// To save context window, I will assume I paste the FULL configMap here.
// I'll reconstruct it based on what I read from the file previously.

const configMap: Record<Variant, Record<string, ReadOnlyConfig>> = {
  retail: {
    sales: {
      title: 'Sales Orders',
      subtitle: 'Ringkasan penjualan terbaru (read-only).',
      stats: [
        { label: 'Penjualan Hari Ini', value: 'Rp 12.5jt', tone: 'emerald' },
        { label: 'Order Pending', value: '8', tone: 'orange' },
        { label: 'Rata-rata Order', value: 'Rp 285rb', tone: 'blue' }
      ],
      table: {
        title: 'Order Terbaru',
        columns: ['Order', 'Customer', 'Total', 'Status'],
        rows: [
          { Order: 'SO-2025-201', Customer: 'Dita R.', Total: 'Rp 1.25jt', Status: 'Lunas' },
          { Order: 'SO-2025-200', Customer: 'Agus P.', Total: 'Rp 980rb', Status: 'Pending' },
          { Order: 'SO-2025-199', Customer: 'Rama T.', Total: 'Rp 540rb', Status: 'Selesai' }
        ]
      }
    },
    customers: {
      title: 'Customers',
      subtitle: 'Daftar pelanggan dan aktivitas terbaru (read-only).',
      stats: [
        { label: 'Total Customers', value: '1.240', tone: 'blue' },
        { label: 'Customer Baru', value: '32', tone: 'emerald' },
        { label: 'Loyal (10+)', value: '85', tone: 'purple' }
      ],
      table: {
        title: 'Customer Aktif',
        columns: ['Nama', 'Kontak', 'Transaksi', 'Terakhir'],
        rows: [
          { Nama: 'Sinta K.', Kontak: 'sinta@email.com', Transaksi: '12', Terakhir: 'Kemarin' },
          { Nama: 'Budi S.', Kontak: 'budi@email.com', Transaksi: '9', Terakhir: '2 hari lalu' },
          { Nama: 'Laras M.', Kontak: 'laras@email.com', Transaksi: '7', Terakhir: '3 hari lalu' }
        ]
      }
    },
    products: {
      title: 'Products',
      subtitle: 'Katalog produk aktif (read-only).',
      stats: [
        { label: 'Produk Aktif', value: '186', tone: 'emerald' },
        { label: 'Low Stock', value: '14', tone: 'orange' },
        { label: 'Best Seller', value: 'Produk A', tone: 'purple' }
      ],
      table: {
        title: 'Produk Terlaris',
        columns: ['Produk', 'Kategori', 'Stok', 'Harga'],
        rows: [
          { Produk: 'Produk A', Kategori: 'Snack', Stok: '120', Harga: 'Rp 25rb' },
          { Produk: 'Produk B', Kategori: 'Minuman', Stok: '60', Harga: 'Rp 18rb' },
          { Produk: 'Produk C', Kategori: 'Makanan', Stok: '45', Harga: 'Rp 32rb' }
        ]
      }
    },
    inventory: {
      title: 'Inventory',
      subtitle: 'Pantau stok dan perputaran (read-only).',
      stats: [
        { label: 'Item Stok', value: '324', tone: 'blue' },
        { label: 'Stok Menipis', value: '22', tone: 'orange' },
        { label: 'Nilai Stok', value: 'Rp 420jt', tone: 'emerald' }
      ],
      table: {
        title: 'Stok Kritis',
        columns: ['Item', 'Stok', 'Reorder', 'Outlet'],
        rows: [
          { Item: 'Bahan A', Stok: '8', Reorder: '20', Outlet: 'Pusat' },
          { Item: 'Bahan B', Stok: '4', Reorder: '15', Outlet: 'Jakarta' },
          { Item: 'Bahan C', Stok: '10', Reorder: '30', Outlet: 'Surabaya' }
        ]
      }
    },
    reports: {
      title: 'Reports',
      subtitle: 'Ringkasan laporan retail (read-only).',
      stats: [
        { label: 'Revenue Bulan Ini', value: 'Rp 920jt', tone: 'emerald' },
        { label: 'COGS', value: 'Rp 410jt', tone: 'blue' },
        { label: 'Margin', value: '22%', tone: 'purple' }
      ],
      table: {
        title: 'Laporan Tersedia',
        columns: ['Laporan', 'Periode', 'Status', 'Catatan'],
        rows: [
          { Laporan: 'Sales Summary', Periode: 'Des 2025', Status: 'Siap', Catatan: 'OK' },
          { Laporan: 'Inventory Movement', Periode: 'Des 2025', Status: 'Siap', Catatan: 'OK' },
          { Laporan: 'Customer Growth', Periode: 'Des 2025', Status: 'Draft', Catatan: 'Review' }
        ]
      }
    },
    settings: {
      title: 'Pengaturan',
      subtitle: 'Akses pengaturan retail (read-only).',
      note: 'Pengaturan detail hanya bisa diubah oleh Owner.'
    }
  },
  distributor: {
    pembelian: {
      title: 'Pembelian',
      subtitle: 'Ringkasan purchase order dan supplier (read-only).',
      stats: [
        { label: 'Total Pembelian', value: 'Rp 410jt', tone: 'blue' },
        { label: 'PO Aktif', value: '6', tone: 'orange' },
        { label: 'Supplier Aktif', value: '18', tone: 'emerald' }
      ],
      table: {
        title: 'PO Terbaru',
        columns: ['PO', 'Supplier', 'Total', 'Status'],
        rows: [
          { PO: 'PO-2025-021', Supplier: 'PT Bina', Total: 'Rp 32jt', Status: 'Pending' },
          { PO: 'PO-2025-020', Supplier: 'CV Maju', Total: 'Rp 18jt', Status: 'Approved' },
          { PO: 'PO-2025-019', Supplier: 'PT Raya', Total: 'Rp 25jt', Status: 'Delivered' }
        ]
      }
    },
    supplier: {
      title: 'Supplier',
      subtitle: 'Data supplier utama (read-only).',
      stats: [
        { label: 'Supplier Aktif', value: '18', tone: 'emerald' },
        { label: 'Hutang Berjalan', value: 'Rp 95jt', tone: 'orange' },
        { label: 'Top Supplier', value: 'PT Bina', tone: 'blue' }
      ],
      table: {
        title: 'Supplier Utama',
        columns: ['Supplier', 'Outstanding', 'Last Order', 'Status'],
        rows: [
          { Supplier: 'PT Bina', Outstanding: 'Rp 40jt', 'Last Order': '3 hari lalu', Status: 'Aktif' },
          { Supplier: 'CV Maju', Outstanding: 'Rp 22jt', 'Last Order': '5 hari lalu', Status: 'Aktif' },
          { Supplier: 'PT Raya', Outstanding: 'Rp 18jt', 'Last Order': '1 minggu lalu', Status: 'Aktif' }
        ]
      }
    },
    stok: {
      title: 'Stok',
      subtitle: 'Status stok gudang (read-only).',
      stats: [
        { label: 'Item Stok', value: '512', tone: 'blue' },
        { label: 'Low Stock', value: '28', tone: 'orange' },
        { label: 'Turnover', value: '4.2x', tone: 'purple' }
      ],
      table: {
        title: 'Stok Kritis',
        columns: ['Item', 'Stok', 'Reorder', 'Gudang'],
        rows: [
          { Item: 'Produk X', Stok: '12', Reorder: '30', Gudang: 'Utama' },
          { Item: 'Produk Y', Stok: '8', Reorder: '25', Gudang: 'Utama' },
          { Item: 'Produk Z', Stok: '15', Reorder: '40', Gudang: 'Cabang' }
        ]
      }
    },
    keuangan: {
      title: 'Keuangan',
      subtitle: 'Ringkasan cashflow dan pembayaran (read-only).',
      stats: [
        { label: 'Hutang Jatuh Tempo', value: 'Rp 95jt', tone: 'orange' },
        { label: 'Pembayaran Mingguan', value: 'Rp 42jt', tone: 'blue' },
        { label: 'Saldo Kas', value: 'Rp 180jt', tone: 'emerald' }
      ],
      table: {
        title: 'Jadwal Pembayaran',
        columns: ['Invoice', 'Supplier', 'Due', 'Amount'],
        rows: [
          { Invoice: 'INV-9921', Supplier: 'PT Bina', Due: '18 Des', Amount: 'Rp 12jt' },
          { Invoice: 'INV-9918', Supplier: 'CV Maju', Due: '20 Des', Amount: 'Rp 9jt' },
          { Invoice: 'INV-9907', Supplier: 'PT Raya', Due: '22 Des', Amount: 'Rp 14jt' }
        ]
      }
    },
    laporan: {
      title: 'Laporan',
      subtitle: 'Ringkasan laporan distributor (read-only).',
      stats: [
        { label: 'Pembelian Bulan Ini', value: 'Rp 410jt', tone: 'blue' },
        { label: 'Biaya Logistik', value: 'Rp 38jt', tone: 'orange' },
        { label: 'Margin Distribusi', value: '12%', tone: 'purple' }
      ],
      table: {
        title: 'Laporan Tersedia',
        columns: ['Laporan', 'Periode', 'Status', 'Catatan'],
        rows: [
          { Laporan: 'Purchase Summary', Periode: 'Des 2025', Status: 'Siap', Catatan: 'OK' },
          { Laporan: 'Supplier Performance', Periode: 'Des 2025', Status: 'Siap', Catatan: 'OK' },
          { Laporan: 'Logistics Cost', Periode: 'Des 2025', Status: 'Draft', Catatan: 'Review' }
        ]
      }
    },
    settings: {
      title: 'Pengaturan',
      subtitle: 'Akses pengaturan distributor (read-only).',
      note: 'Pengaturan detail hanya bisa diubah oleh Owner.'
    }
  },
  produsen: {
    produksi: {
      title: 'Produksi',
      subtitle: 'Ringkasan work order dan output (read-only).',
      stats: [
        { label: 'Output Minggu Ini', value: '1.850 unit', tone: 'purple' },
        { label: 'Batch Aktif', value: '12', tone: 'blue' },
        { label: 'Yield', value: '96%', tone: 'emerald' }
      ],
      table: {
        title: 'Work Order Aktif',
        columns: ['WO', 'Produk', 'Progress', 'Target'],
        rows: [
          { WO: 'WO-2025-045', Produk: 'Produk Alpha', Progress: '75%', Target: '18 Des' },
          { WO: 'WO-2025-046', Produk: 'Snack Pack B', Progress: '40%', Target: '20 Des' },
          { WO: 'WO-2025-047', Produk: 'Mix XL', Progress: '20%', Target: '22 Des' }
        ]
      }
    },
    inventori: {
      title: 'Inventori',
      subtitle: 'Stok bahan baku dan WIP (read-only).',
      stats: [
        { label: 'Bahan Baku', value: '320 item', tone: 'blue' },
        { label: 'Low Material', value: '14', tone: 'orange' },
        { label: 'Stock Days', value: '21 hari', tone: 'emerald' }
      ],
      table: {
        title: 'Bahan Kritis',
        columns: ['Material', 'Stok', 'Reorder', 'Status'],
        rows: [
          { Material: 'Tepung', Stok: '18 kg', Reorder: '40 kg', Status: 'Low' },
          { Material: 'Gula', Stok: '12 kg', Reorder: '30 kg', Status: 'Low' },
          { Material: 'Minyak', Stok: '25 liter', Reorder: '50 liter', Status: 'OK' }
        ]
      }
    },
    laporan: {
      title: 'Laporan',
      subtitle: 'Ringkasan performa produksi (read-only).',
      stats: [
        { label: 'Output Bulan Ini', value: '7.420 unit', tone: 'purple' },
        { label: 'Cost per Unit', value: 'Rp 6.200', tone: 'blue' },
        { label: 'Defect Rate', value: '1.4%', tone: 'orange' }
      ],
      table: {
        title: 'Laporan Tersedia',
        columns: ['Laporan', 'Periode', 'Status', 'Catatan'],
        rows: [
          { Laporan: 'Production Summary', Periode: 'Des 2025', Status: 'Siap', Catatan: 'OK' },
          { Laporan: 'Waste Analysis', Periode: 'Des 2025', Status: 'Draft', Catatan: 'Review' },
          { Laporan: 'Efficiency', Periode: 'Des 2025', Status: 'Siap', Catatan: 'OK' }
        ]
      }
    },
    settings: {
      title: 'Pengaturan',
      subtitle: 'Akses pengaturan produsen (read-only).',
      note: 'Pengaturan detail hanya bisa diubah oleh Owner.'
    }
  }
};

type DemoAccountingReadOnlyPageProps = {
  variant: Variant;
  section: string;
};

const toneStyles: Record<NonNullable<StatCard['tone']>, string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700'
};

export default function DemoAccountingReadOnlyPage({ variant, section }: DemoAccountingReadOnlyPageProps) {
  const { isDark } = useThemeStore();
  const config = useMemo(() => configMap[variant]?.[section], [section, variant]);

  // Map internal data variant to layout variant
  const layoutVariant = variant === 'produsen' ? 'producer' : variant;

  if (!config) {
    return (
      <DemoLayout variant={layoutVariant as any} title="Page Not Found">
        <div className="flex items-center justify-center min-h-[50vh] text-gray-500">
            Data belum tersedia untuk bagian ini.
        </div>
      </DemoLayout>
    );
  }

  return (
    <DemoLayout variant={layoutVariant as any} title={`${variant.charAt(0).toUpperCase() + variant.slice(1)} - ${config.title}`}>
        <div className="space-y-6 p-6">
        <div>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {variant.charAt(0).toUpperCase() + variant.slice(1)} / {config.title}
            </div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {config.title}
            </h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {config.subtitle}
            </p>
        </div>

        {config.note && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-slate-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>
            {config.note}
            </div>
        )}

        {config.stats && config.stats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {config.stats.map((stat) => (
                <div key={stat.label} className={`rounded-xl p-4 ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
                <div className="flex items-center justify-between">
                    <div>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
                    <p className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
                    </div>
                    {stat.tone && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${toneStyles[stat.tone]}`}>
                        {stat.tone.toUpperCase()}
                    </span>
                    )}
                </div>
                </div>
            ))}
            </div>
        )}

        {config.table && (
            <div className={`rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
            <div className={`border-b px-6 py-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {config.table.title}
                </h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                <thead className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                    <tr>
                    {config.table.columns.map((column) => (
                        <th key={column} className="px-6 py-3 text-left font-medium">
                        {column}
                        </th>
                    ))}
                    </tr>
                </thead>
                <tbody className={isDark ? 'divide-y divide-slate-700 text-gray-200' : 'divide-y divide-gray-200 text-gray-700'}>
                    {config.table.rows.map((row, index) => (
                    <tr key={`${config.title}-${index}`}>
                        {config.table.columns.map((column) => (
                        <td key={column} className="px-6 py-3">
                            {row[column] ?? '-'}
                        </td>
                        ))}
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            </div>
        )}
        </div>
    </DemoLayout>
  );
}
