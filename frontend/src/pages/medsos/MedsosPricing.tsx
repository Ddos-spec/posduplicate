import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import FieldHelp from '../../components/medsos/FieldHelp';
import { ArrowRight, BadgeDollarSign, MessageSquareText, PlugZap, Store } from 'lucide-react';

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
    description: 'Social media dan ads berjalan lewat workspace engine yang dikelola di belakang layar. Biaya detailnya dibungkus sesuai jumlah akun dan kebutuhan tenant.',
    icon: PlugZap,
  },
  {
    title: 'WA Inbox add-on',
    value: 'Custom',
    description: 'WhatsApp tetap lewat workspace inbox internal, jadi skemanya bisa dipisah sesuai kebutuhan operasional.',
    icon: MessageSquareText,
  },
  {
    title: 'Marketplace',
    value: 'Coming soon',
    description: 'Marketplace akan tersedia sebagai modul tambahan setelah integrasinya siap dipakai.',
    icon: Store,
  },
];

const faqs = [
  {
    question: 'Kenapa tidak langsung pakai 3 tier plan seperti SaaS biasa?',
    answer: 'Karena kebutuhan setiap workspace berbeda, paket awal dibuat fleksibel agar social media, ads, dan add-on lain bisa disesuaikan tanpa mengganggu operasional.',
  },
  {
    question: 'Apakah user bayar engine operasional langsung?',
    answer: 'Penawaran ke customer dapat dibungkus sebagai satu workspace, sementara pengelolaan biaya internal tetap bisa dipisahkan sesuai kebutuhan bisnis.',
  },
  {
    question: 'Kalau tenant cuma butuh social tanpa WA bagaimana?',
    answer: 'Bisa. WA Inbox bersifat add-on. Tenant bisa mulai dari dashboard + social workspace dulu lalu menambahkan WA belakangan.',
  },
  {
    question: 'Kapan marketplace mulai dijual?',
    answer: 'Marketplace akan diumumkan begitu modul integrasinya siap dipakai di workflow operasional harian.',
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
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.title} title={card.description} className={`rounded-[24px] p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
            <div className={`inline-flex rounded-2xl p-3 ${isDark ? 'bg-slate-900 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              <card.icon size={18} />
            </div>
            <p className={`text-xs uppercase tracking-[0.18em] mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.title}</p>
            <h2 className="mt-2 text-lg font-bold">{card.value}</h2>
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.description}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-[32px] p-6 md:p-8 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Komponen harga</h2>
              <FieldHelp title="Komponen harga" description="Bagian ini dipakai untuk menjelaskan apa yang termasuk biaya dashboard, kapan biaya engine sosial dihitung, dan kapan add-on lain ditagihkan." />
            </div>
            <div className="space-y-3 mt-5">
              {[
                'Rp300.000 / bulan dipakai sebagai base fee dashboard MyCommerSocial.',
                'Social + ads dihitung sesuai kebutuhan workspace yang akan dijalankan lewat engine sosial.',
                'WA Inbox tetap bisa dijual terpisah sebagai add-on custom.',
                'Marketplace akan tersedia sebagai add-on saat modul integrasinya dibuka.',
              ].map((line) => (
                <div key={line} className={`rounded-[24px] p-4 text-sm ${isDark ? 'bg-white/5 ring-1 ring-white/10 text-gray-300' : 'border-gray-100 bg-gray-50 text-gray-600'}`}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-[24px] p-5 ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-blue-100 bg-blue-50'}`}>
            <p className="text-xs uppercase tracking-[0.18em] text-blue-500">Prinsip jualannya</p>
            <h3 className="mt-2 text-xl font-bold">Jual 1 workspace, bukan banyak tools terpisah</h3>
            <p className={`text-sm mt-3 ${isDark ? 'text-gray-300' : 'text-blue-900'}`}>
              Customer cukup melihat satu paket workspace yang siap dipakai. Komponen internal tetap bisa diatur sesuai kebutuhan operasional dan margin bisnis.
            </p>
            <button
              type="button"
              onClick={() => navigate(`${basePath}/connections`)}
              title="Lanjut ke halaman Connections untuk menyalakan WA Inbox, social media, dan ads"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all"
            >
              Lanjut setup workspace
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className={`rounded-[32px] p-6 md:p-8 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center gap-2">
          <h2 className={`text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>FAQ singkat</h2>
          <FieldHelp title="FAQ singkat" description="Jawaban cepat ini membantu user memahami model jualan workspace tanpa harus bertanya ke tim implementasi lebih dulu." />
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {faqs.map((faq) => (
            <div key={faq.question} className={`rounded-[24px] p-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
              <p className="font-semibold">{faq.question}</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
