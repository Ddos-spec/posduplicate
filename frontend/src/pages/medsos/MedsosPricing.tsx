import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { ArrowRight, BadgeDollarSign, BriefcaseBusiness, MessageSquareText, PlugZap, Store } from 'lucide-react';

const cards = [
  {
    title: 'Dashboard fee',
    value: 'Mulai Rp300.000 / bulan',
    description: 'Ini biaya dasar MyCommerSocial sebagai command center. Cocok untuk tenant yang baru mulai.',
    icon: BadgeDollarSign,
  },
  {
    title: 'Social + ads engine',
    value: 'Menyesuaikan kebutuhan workspace',
    description: 'Social media dan ads berjalan lewat Zernio. Biaya detailnya dibungkus sesuai jumlah akun dan kebutuhan tenant.',
    icon: PlugZap,
  },
  {
    title: 'WA Inbox add-on',
    value: 'Custom',
    description: 'WhatsApp tetap lewat Customer Service CRM internal, jadi skemanya bisa dipisah sesuai kebutuhan operasional.',
    icon: MessageSquareText,
  },
  {
    title: 'Marketplace',
    value: 'Coming soon',
    description: 'Marketplace sengaja belum dijual sampai integrasi dan partnership-nya benar-benar matang.',
    icon: Store,
  },
];

const faqs = [
  {
    question: 'Kenapa tidak langsung pakai 3 tier plan seperti SaaS biasa?',
    answer: 'Karena jalur social + ads sekarang dipusatkan ke Zernio, jadi lebih aman bila pricing dibungkus per workspace atau kebutuhan nyata dulu, bukan hardcode tier yang cepat basi.',
  },
  {
    question: 'Apakah user bayar vendor langsung?',
    answer: 'Untuk launch awal, lebih aman bila customer menerima satu penawaran workspace dari MyCommerSocial. Di belakang layar, biaya dashboard dan biaya engine tetap bisa dipisah internal.',
  },
  {
    question: 'Kalau tenant cuma butuh social tanpa WA bagaimana?',
    answer: 'Bisa. WA Inbox bersifat add-on. Tenant bisa mulai dari dashboard + Zernio dulu lalu menambahkan WA belakangan.',
  },
  {
    question: 'Kapan marketplace mulai dijual?',
    answer: 'Setelah bentuk kerja sama marketplace partner benar-benar jelas. Sampai itu siap, marketplace tetap ditahan agar onboarding user baru tetap sederhana.',
  },
];

export default function MedsosPricing() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = location.pathname.startsWith('/demo');
  const basePath = isDemo ? '/demo/medsos' : '/medsos';

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="max-w-3xl">
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-5 ${isDark ? 'bg-blue-500/15 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
            <BriefcaseBusiness size={14} />
            Commercial model v1
          </div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Pricing dibuat sesederhana mungkin dulu</h1>
          <p className={`text-sm mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Fokus awal bukan bikin matrix harga yang ribet, tapi memastikan user baru paham apa yang dibayar: dashboard MyCommerSocial, engine social + ads, dan add-on WA bila dibutuhkan.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.title} className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
            <div className={`inline-flex rounded-2xl p-3 ${isDark ? 'bg-slate-900 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              <card.icon size={18} />
            </div>
            <p className={`text-xs uppercase tracking-[0.18em] mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.title}</p>
            <h2 className="mt-2 text-lg font-bold">{card.value}</h2>
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.description}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
          <div>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Cara baca pricing launch ini</h2>
            <div className="space-y-3 mt-5">
              {[
                'Rp300.000 / bulan dipakai sebagai base fee dashboard MyCommerSocial.',
                'Social + ads dihitung sesuai kebutuhan workspace yang akan dijalankan lewat Zernio.',
                'WA Inbox tetap bisa dijual terpisah sebagai add-on custom.',
                'Marketplace belum ikut dijual agar flow onboarding tidak bercabang ke terlalu banyak vendor.',
              ].map((line) => (
                <div key={line} className={`rounded-2xl border p-4 text-sm ${isDark ? 'border-slate-700 bg-slate-900/40 text-gray-300' : 'border-gray-100 bg-gray-50 text-gray-600'}`}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-blue-100 bg-blue-50'}`}>
            <p className="text-xs uppercase tracking-[0.18em] text-blue-500">Prinsip jualannya</p>
            <h3 className="mt-2 text-xl font-bold">Jual 1 workspace, bukan 1 vendor</h3>
            <p className={`text-sm mt-3 ${isDark ? 'text-gray-300' : 'text-blue-900'}`}>
              Di depan user, yang terlihat adalah paket kerja MyCommerSocial. Di belakang layar, biaya dashboard, biaya Zernio, dan add-on WA bisa dipisah internal tanpa membuat pricing customer membingungkan.
            </p>
            <button
              type="button"
              onClick={() => navigate(`${basePath}/connections`)}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Lanjut setup workspace
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>FAQ singkat</h2>
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {faqs.map((faq) => (
            <div key={faq.question} className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
              <p className="font-semibold">{faq.question}</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
