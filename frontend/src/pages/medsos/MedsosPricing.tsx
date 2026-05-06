import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import {
  BadgeCheck,
  CheckCircle2,
  HelpCircle,
  Loader2,
  PlugZap,
  Rocket,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  badge?: string;
  priceMonthly: number;
  priceAnnual: number;
  description: string;
  maxAccounts: number | 'unlimited';
  features: string[];
  notIncluded?: string[];
  cta: string;
  highlight: boolean;
  color: string;
  icon: typeof Zap;
}

const plans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 299000,
    priceAnnual: 249000,
    description: 'Cocok untuk bisnis yang baru mulai ekspansi digital dan butuh kontrol sosial media dasar.',
    maxAccounts: 3,
    features: [
      'Hingga 3 akun sosial (FB, IG, TikTok, dst.)',
      'Dashboard omnichannel',
      'Content planner & scheduler',
      'WA Inbox integration',
      'Meta Ads monitoring (read-only)',
      'Analytics dasar (7 hari)',
      'Email support',
    ],
    notIncluded: [
      'Multi-platform posting serentak',
      'Marketplace Hub (Jubelio)',
      'Advanced analytics (90 hari)',
      'Priority support',
    ],
    cta: 'Mulai Free Trial 7 Hari',
    highlight: false,
    color: 'blue',
    icon: Zap,
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: 'Paling Populer',
    priceMonthly: 599000,
    priceAnnual: 499000,
    description: 'Untuk bisnis yang sudah aktif di multiple platform dan butuh koordinasi tim.',
    maxAccounts: 10,
    features: [
      'Hingga 10 akun sosial (semua platform)',
      'Semua fitur Starter',
      'Multi-platform posting serentak',
      'Marketplace Hub (Jubelio)',
      'Meta Ads full control',
      'Unified inbox all channels',
      'Analytics 90 hari + export',
      'Team seats (hingga 5 user)',
      'Approval workflow',
      'Priority email & chat support',
    ],
    cta: 'Mulai Free Trial 7 Hari',
    highlight: true,
    color: 'violet',
    icon: Sparkles,
  },
  {
    id: 'business',
    name: 'Business',
    priceMonthly: 1499000,
    priceAnnual: 1249000,
    description: 'Untuk brand besar, agensi, atau multi-outlet yang butuh skalabilitas penuh.',
    maxAccounts: 'unlimited',
    features: [
      'Akun sosial unlimited',
      'Semua fitur Pro',
      'Team seats unlimited',
      'Custom analytics & reporting',
      'Dedicated account manager',
      'Custom integrations on request',
      'SLA 99.9% uptime',
      'Onboarding & training session',
      'White-label ready (on request)',
    ],
    cta: 'Hubungi Sales',
    highlight: false,
    color: 'emerald',
    icon: Rocket,
  },
];

const faqs = [
  {
    q: 'Apakah ada biaya tersembunyi?',
    a: 'Tidak. Harga di atas sudah termasuk semua biaya platform MyCommerSocial. Biaya spend iklan Meta atau Tokopedia/Shopee dibayar langsung ke vendor masing-masing.',
  },
  {
    q: 'Bisakah saya upgrade/downgrade kapan saja?',
    a: 'Ya, upgrade bisa langsung aktif. Downgrade berlaku di awal siklus billing berikutnya.',
  },
  {
    q: 'Apa yang terjadi setelah free trial berakhir?',
    a: 'Akun masuk mode read-only. Data tidak hilang. Anda bisa upgrade kapan saja untuk kembali aktif.',
  },
  {
    q: 'Berapa jumlah akun sosial yang dihitung?',
    a: 'Satu akun = satu profil di satu platform (misal: 1 akun Instagram dihitung 1, bukan per halaman/toko).',
  },
  {
    q: 'Apakah mendukung multi-outlet atau franchise?',
    a: 'Ya, paket Business mendukung setup multi-outlet dengan workspace terpisah per outlet. Hubungi sales untuk pricing khusus.',
  },
];

const colorMap: Record<string, { gradient: string; badge: string; cta: string; icon: string; ring: string }> = {
  blue: {
    gradient: 'from-blue-500 to-cyan-500',
    badge: 'bg-blue-100 text-blue-700',
    cta: 'bg-blue-600 hover:bg-blue-700',
    icon: 'text-blue-500',
    ring: 'ring-blue-200',
  },
  violet: {
    gradient: 'from-violet-500 to-fuchsia-500',
    badge: 'bg-violet-100 text-violet-700',
    cta: 'bg-violet-600 hover:bg-violet-700',
    icon: 'text-violet-500',
    ring: 'ring-violet-300',
  },
  emerald: {
    gradient: 'from-emerald-500 to-teal-500',
    badge: 'bg-emerald-100 text-emerald-700',
    cta: 'bg-emerald-600 hover:bg-emerald-700',
    icon: 'text-emerald-500',
    ring: 'ring-emerald-200',
  },
};

function fmt(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

export default function MedsosPricing() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = location.pathname.startsWith('/demo');
  const basePath = isDemo ? '/demo/medsos' : '/medsos';

  const [annual, setAnnual] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleChoosePlan = async (plan: PricingPlan) => {
    if (plan.id === 'business') {
      window.open('mailto:sales@mycommersocial.com?subject=Business%20Plan%20Inquiry', '_blank');
      return;
    }
    setLoadingPlan(plan.id);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLoadingPlan(null);
    navigate(`${basePath}/connections`);
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className={`rounded-3xl border p-8 md:p-12 text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold mb-5 ${isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'}`}>
          <Star size={13} />
          Harga transparan — tidak ada biaya tersembunyi
        </div>
        <h1 className={`text-3xl md:text-4xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Satu dashboard untuk semua channel.
        </h1>
        <p className={`text-base max-w-xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Pilih plan yang sesuai skala bisnis. Semua plan sudah termasuk koneksi ke Zernio Social API — tidak perlu setup sendiri.
        </p>

        <div className={`inline-flex items-center gap-2 rounded-2xl mt-6 p-1 ${isDark ? 'bg-slate-900' : 'bg-gray-100'}`}>
          <button
            onClick={() => setAnnual(false)}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${!annual ? 'bg-blue-600 text-white shadow' : isDark ? 'text-gray-400' : 'text-gray-600'}`}
          >
            Bulanan
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition flex items-center gap-2 ${annual ? 'bg-blue-600 text-white shadow' : isDark ? 'text-gray-400' : 'text-gray-600'}`}
          >
            Tahunan
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${annual ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
              Hemat ~17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const c = colorMap[plan.color];
          const price = annual ? plan.priceAnnual : plan.priceMonthly;
          const busy = loadingPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl border flex flex-col ${
                plan.highlight
                  ? `ring-2 ${c.ring} ${isDark ? 'bg-slate-800 border-transparent' : 'bg-white border-transparent shadow-xl'}`
                  : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'
              }`}
            >
              {plan.badge && (
                <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold ${c.badge}`}>
                  {plan.badge}
                </div>
              )}

              <div className={`h-1.5 rounded-t-3xl bg-gradient-to-r ${c.gradient}`} />

              <div className="p-7 flex-1 flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className={`rounded-2xl p-2.5 bg-gradient-to-br ${c.gradient}`}>
                    <plan.icon size={20} className="text-white" />
                  </div>
                  <div>
                    <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{plan.name}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {plan.maxAccounts === 'unlimited' ? 'Akun sosial unlimited' : `Hingga ${plan.maxAccounts} akun sosial`}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-end gap-1.5">
                    <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{fmt(price)}</span>
                    <span className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/bulan</span>
                  </div>
                  {annual && (
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Dibayar tahunan • hemat {fmt((plan.priceMonthly - plan.priceAnnual) * 12)}/tahun
                    </p>
                  )}
                  <p className={`text-sm mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{plan.description}</p>
                </div>

                <button
                  onClick={() => handleChoosePlan(plan)}
                  disabled={busy}
                  className={`w-full rounded-2xl py-3 font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition ${c.cta}`}
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <PlugZap size={16} />}
                  {plan.cta}
                </button>

                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${c.icon}`} />
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{f}</span>
                    </li>
                  ))}
                  {plan.notIncluded?.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 opacity-40">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gray-400" />
                      <span className={`text-sm line-through ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center gap-2 mb-6">
          <BadgeCheck size={18} className="text-blue-500" />
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Perbandingan fitur lengkap</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <th className="text-left py-3 pr-4 font-medium w-[40%]">Fitur</th>
                <th className="text-center py-3 px-4 font-semibold text-blue-600">Starter</th>
                <th className="text-center py-3 px-4 font-semibold text-violet-600">Pro</th>
                <th className="text-center py-3 px-4 font-semibold text-emerald-600">Business</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-100'}`}>
              {[
                ['Akun sosial', '3', '10', 'Unlimited'],
                ['Platform sosial', 'FB, IG, TikTok', 'Semua (15+)', 'Semua (15+)'],
                ['Content planner', '✓', '✓', '✓'],
                ['Scheduler post', '✓', '✓', '✓'],
                ['Multi-platform post serentak', '—', '✓', '✓'],
                ['Unified Inbox', 'WA only', 'Semua channel', 'Semua channel'],
                ['WA CRM integration', '✓', '✓', '✓'],
                ['Marketplace Hub (Jubelio)', '—', '✓', '✓'],
                ['Meta Ads monitoring', 'Read only', 'Full control', 'Full control'],
                ['Analytics history', '7 hari', '90 hari', '1 tahun'],
                ['Data export (CSV/Excel)', '—', '✓', '✓'],
                ['Team seats', '1', '5', 'Unlimited'],
                ['Approval workflow', '—', '✓', '✓'],
                ['Custom integrations', '—', '—', 'On request'],
                ['Dedicated account manager', '—', '—', '✓'],
                ['Support', 'Email', 'Email + Chat', 'Dedicated'],
              ].map(([feature, starter, pro, business]) => (
                <tr key={feature} className={`${isDark ? 'hover:bg-slate-700/40' : 'hover:bg-gray-50'}`}>
                  <td className={`py-3 pr-4 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{feature}</td>
                  {[starter, pro, business].map((val, i) => (
                    <td key={i} className={`py-3 px-4 text-center ${
                      val === '✓' ? (i === 0 ? 'text-blue-500' : i === 1 ? 'text-violet-500' : 'text-emerald-500') :
                      val === '—' ? (isDark ? 'text-gray-600' : 'text-gray-300') :
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {val === '✓' ? <CheckCircle2 size={16} className="mx-auto" /> :
                       val === '—' ? <span className="text-lg">—</span> :
                       <span className="text-xs font-medium">{val}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle size={18} className="text-amber-500" />
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Pertanyaan umum</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className={`rounded-2xl border ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
              <button
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                className={`w-full text-left px-5 py-4 flex items-center justify-between gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                <span className="font-semibold text-sm">{faq.q}</span>
                <span className={`text-xs px-2 py-1 rounded-full transition-transform ${activeFaq === i ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>▼</span>
              </button>
              {activeFaq === i && (
                <div className={`px-5 pb-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA bottom */}
      <div className={`rounded-3xl border p-8 text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-br from-blue-50 to-violet-50 border-blue-100'}`}>
        <Sparkles size={32} className="mx-auto text-violet-500 mb-4" />
        <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Coba gratis 7 hari, tanpa kartu kredit</h3>
        <p className={`text-sm mb-6 max-w-md mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Mulai dari plan Starter atau Pro. Upgrade kapan saja setelah melihat hasilnya.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => navigate(`${basePath}/connections`)}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-semibold"
          >
            <PlugZap size={18} />
            Mulai Setup
          </button>
          <button
            onClick={() => window.open('mailto:sales@mycommersocial.com', '_blank')}
            className={`inline-flex items-center gap-2 rounded-2xl border px-6 py-3 font-semibold ${isDark ? 'border-slate-700 bg-slate-900 hover:bg-slate-800' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
          >
            Hubungi Sales
          </button>
        </div>
      </div>
    </div>
  );
}
