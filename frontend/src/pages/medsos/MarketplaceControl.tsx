import { useThemeStore } from '../../store/themeStore';
import { Clock3, MessageCircleMore, ShoppingBag, Store } from 'lucide-react';

const highlights = [
  {
    title: 'Marketplace sedang disiapkan',
    description: 'Integrasi marketplace akan hadir sebagai modul terpisah dengan alur order, katalog, dan buyer chat yang rapi.',
    icon: Store,
  },
  {
    title: 'Buyer chat & order ops',
    description: 'Halaman ini nantinya menampung order queue, buyer chat, issue center, dan pemantauan katalog.',
    icon: MessageCircleMore,
  },
  {
    title: 'Status peluncuran',
    description: 'Sambil modul marketplace disiapkan, operasional utama tetap berjalan di WA Inbox, social media, dan ads.',
    icon: Clock3,
  },
];

export default function MarketplaceControl() {
  const { isDark } = useThemeStore();

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="max-w-3xl">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4 ${isDark ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-100 text-amber-700'}`}>
              <Store size={14} />
              Marketplace • coming soon
            </div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Marketplace akan hadir di modul ini</h1>
            <p className={`text-sm mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Halaman marketplace akan dipakai untuk mengelola order, buyer chat, sinkronisasi katalog, dan pengecekan issue operasional.
            </p>
          </div>
          <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
            <p className="text-xs uppercase tracking-[0.18em]">Status</p>
            <p className="font-semibold text-sm mt-1">Coming soon</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {highlights.map((item) => (
          <div key={item.title} className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
            <div className={`inline-flex rounded-2xl p-3 ${isDark ? 'bg-slate-900 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
              <item.icon size={18} />
            </div>
            <h2 className="mt-4 font-bold text-lg">{item.title}</h2>
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.description}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Yang akan tersedia</h2>
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {[
            'Buyer chat dan order queue dalam satu panel operasional.',
            'Pemantauan katalog, stok, dan issue listing per channel.',
            'Status pengiriman, pembatalan, dan refund dalam tampilan yang ringkas.',
            'Sinkronisasi marketplace akan mengikuti alur aktivasi resmi saat modul dibuka.',
          ].map((line) => (
            <div key={line} className={`rounded-2xl border p-4 text-sm ${isDark ? 'border-slate-700 bg-slate-900/40 text-gray-300' : 'border-gray-100 bg-gray-50 text-gray-600'}`}>
              <div className="flex items-start gap-3">
                <ShoppingBag size={16} className="text-amber-500 mt-0.5" />
                <span>{line}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
