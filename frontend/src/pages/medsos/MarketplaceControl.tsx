import { useThemeStore } from '../../store/themeStore';
import { Clock3, Handshake, ShoppingBag, Store } from 'lucide-react';

const roadmap = [
  {
    title: 'Jubelio partnership in progress',
    description: 'Marketplace sengaja diparkir dulu sambil menunggu bentuk kerja sama dengan Jubelio benar-benar jelas.',
    icon: Handshake,
  },
  {
    title: 'Order + buyer chat nanti satu jalur',
    description: 'Begitu partnership siap, order sync, buyer chat, katalog, dan stok akan masuk sebagai phase 2.',
    icon: ShoppingBag,
  },
  {
    title: 'Launch wave pertama tetap fokus',
    description: 'Untuk sekarang user baru cukup menyelesaikan WA Inbox dan Zernio agar onboarding tidak membingungkan.',
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
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Marketplace sengaja belum diaktifkan</h1>
            <p className={`text-sm mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Di fase ini MyCommerSocial difokuskan dulu ke WA Inbox, social media, dan ads. Marketplace tidak dipaksakan ikut launch supaya fondasi produk tetap rapi.
            </p>
          </div>
          <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
            <p className="text-xs uppercase tracking-[0.18em]">Status</p>
            <p className="font-semibold text-sm mt-1">Roadmap phase 2</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {roadmap.map((item) => (
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
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Apa yang nanti masuk saat marketplace dibuka?</h2>
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {[
            'Shopee, Tokopedia, dan buyer chat marketplace masuk lewat jalur partner yang resmi.',
            'Order queue, issue center, dan catalog health baru dihidupkan setelah integrasinya stabil.',
            'Tidak ada setup separuh jadi — begitu modul marketplace dibuka, user langsung dapat flow yang rapi.',
            'Sampai itu tiba, halaman ini sengaja dijaga sederhana agar tidak membingungkan user baru.',
          ].map((line) => (
            <div key={line} className={`rounded-2xl border p-4 text-sm ${isDark ? 'border-slate-700 bg-slate-900/40 text-gray-300' : 'border-gray-100 bg-gray-50 text-gray-600'}`}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
