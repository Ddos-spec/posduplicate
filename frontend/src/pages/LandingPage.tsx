import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore';
import {
  ArrowRight,
  ShoppingCart,
  TrendingUp,
  Box,
  ShieldCheck,
  Share2,
  ChefHat,
  Truck,
  Store,
  Factory,
  Pill,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
  CheckCircle2,
  Zap,
  Users,
} from 'lucide-react';

const MODULES = [
  {
    icon: ShoppingCart,
    color: 'indigo',
    name: 'Point of Sale',
    desc: 'Kasir cepat untuk resto, kafe, dan retail — offline-ready, cetak struk, split bill.',
    points: ['Transaksi kasir real-time', 'Manajemen menu & meja', 'Cetak struk Bluetooth'],
  },
  {
    icon: TrendingUp,
    color: 'emerald',
    name: 'Accounting & Finance',
    desc: 'Laporan keuangan otomatis dari tiap transaksi — neraca, jurnal, sampai forecast.',
    points: ['Neraca & buku besar otomatis', 'Hutang piutang terpantau', 'Forecast arus kas AI'],
  },
  {
    icon: Box,
    color: 'orange',
    name: 'Inventory Management',
    desc: 'Stok akurat untuk semua tipe bisnis, dari bahan baku dapur sampai obat apotek.',
    points: ['Stok bahan baku & waste', 'Batch number & expiry date', 'Reorder point otomatis'],
  },
  {
    icon: ShieldCheck,
    color: 'blue',
    name: 'Admin & Analytics',
    desc: 'Satu dashboard untuk mantau semua cabang, tenant, dan performa tim.',
    points: ['Multi-tenant & multi-cabang', 'Kontrol akses berbasis peran', 'Analitik performa real-time'],
  },
  {
    icon: Share2,
    color: 'sky',
    name: 'Social Media Management',
    desc: 'MyCommerSocial — kelola WhatsApp inbox, jadwal konten, dan iklan dalam satu tempat.',
    points: ['Inbox WhatsApp terpusat', 'Content planner & analytics', 'Ads workspace terintegrasi'],
  },
];

const BUSINESS_TYPES = [
  { icon: ChefHat, label: 'F&B / Restoran' },
  { icon: Store, label: 'Retail' },
  { icon: Truck, label: 'Distributor' },
  { icon: Factory, label: 'Manufaktur' },
  { icon: Pill, label: 'Apotek' },
];

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', ring: 'shadow-indigo-500/20' },
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', ring: 'shadow-emerald-500/20' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-600', ring: 'shadow-orange-500/20' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-600', ring: 'shadow-blue-500/20' },
  sky: { bg: 'bg-sky-500', text: 'text-sky-600', ring: 'shadow-sky-500/20' },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useThemeStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const surface = isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900';
  const subtext = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${surface}`}>
      {/* Navbar */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-100'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/branding/omnipilot-mark.svg" alt="" className="w-8 h-8" />
            <span className="font-bold text-lg tracking-tight">OmniPilot AI</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#modules" className={`${subtext} hover:${isDark ? 'text-white' : 'text-slate-900'} transition-colors`}>
              Modul
            </a>
            <a href="#business" className={`${subtext} hover:${isDark ? 'text-white' : 'text-slate-900'} transition-colors`}>
              Untuk Bisnis Apa
            </a>
            <Link to="/demo" className={`${subtext} hover:${isDark ? 'text-white' : 'text-slate-900'} transition-colors`}>
              Demo
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => navigate('/login')}
              className={`hidden sm:inline-flex text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                isDark ? 'text-white hover:bg-slate-800' : 'text-slate-900 hover:bg-slate-100'
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => navigate('/demo')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all"
            >
              Coba Gratis
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={`md:hidden p-2 rounded-lg ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
              aria-label="Menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className={`md:hidden border-t px-6 py-4 flex flex-col gap-4 text-sm font-medium ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <a href="#modules" onClick={() => setMenuOpen(false)} className={subtext}>Modul</a>
            <a href="#business" onClick={() => setMenuOpen(false)} className={subtext}>Untuk Bisnis Apa</a>
            <Link to="/demo" onClick={() => setMenuOpen(false)} className={subtext}>Demo</Link>
            <button onClick={() => navigate('/login')} className="text-left font-semibold">Masuk</button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className={`absolute inset-0 -z-10 ${
            isDark
              ? 'bg-[radial-gradient(circle_at_20%_-10%,rgba(99,102,241,0.25),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.15),transparent_40%)]'
              : 'bg-[radial-gradient(circle_at_20%_-10%,rgba(99,102,241,0.10),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.10),transparent_40%)]'
          }`}
        />

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-6 text-xs font-semibold ${
                isDark ? 'bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/20' : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered Business Platform
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-6">
              Satu Platform,
              <br />
              <span className="bg-gradient-to-r from-indigo-500 to-sky-500 bg-clip-text text-transparent">
                Semua Operasional Bisnis
              </span>
            </h1>

            <p className={`text-lg leading-relaxed mb-8 max-w-lg ${subtext}`}>
              Kasir, akuntansi, stok, admin multi-cabang, dan media sosial — semua tersambung
              real-time dalam satu dashboard. Ganti 5 aplikasi terpisah dengan satu OmniPilot AI.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/demo')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
              >
                Coba Demo Tanpa Daftar
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold border transition-all ${
                  isDark
                    ? 'border-slate-700 text-white hover:bg-slate-800'
                    : 'border-slate-200 text-slate-900 hover:bg-slate-50'
                }`}
              >
                Sudah Punya Akun
              </button>
            </div>

            <div className={`flex items-center gap-6 mt-10 text-sm ${subtext}`}>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Setup dalam 5 menit
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Multi-tenant siap pakai
              </div>
            </div>
          </div>

          {/* Bento mockup */}
          <div className="relative hidden lg:block">
            <div className={`rounded-3xl p-5 shadow-2xl ${cardBg}`}>
              <div className="grid grid-cols-2 gap-4">
                <div className={`col-span-2 rounded-2xl p-5 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-semibold ${subtext}`}>Pendapatan Hari Ini</span>
                    <span className="text-xs font-semibold text-emerald-500">+18.2%</span>
                  </div>
                  <div className="text-3xl font-bold mb-3">Rp 12.480.000</div>
                  <div className="flex items-end gap-1.5 h-14">
                    {[40, 65, 45, 80, 60, 95, 70].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-500 to-sky-400"
                        style={{ height: `${h}%`, opacity: 0.4 + i * 0.08 }}
                      />
                    ))}
                  </div>
                </div>

                <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <Box className="w-5 h-5 text-orange-500 mb-3" />
                  <div className="text-xl font-bold">248</div>
                  <div className={`text-xs ${subtext}`}>Item Stok Aman</div>
                </div>

                <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <Users className="w-5 h-5 text-sky-500 mb-3" />
                  <div className="text-xl font-bold">1.204</div>
                  <div className={`text-xs ${subtext}`}>Chat WA Terjawab</div>
                </div>
              </div>
            </div>

            {/* floating accent shapes */}
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-2xl rotate-12 -z-10 ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-100'}`} />
            <div className={`absolute -bottom-8 -left-8 w-32 h-32 rounded-full -z-10 ${isDark ? 'bg-sky-500/10' : 'bg-sky-100'}`} />
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight mb-4">5 Modul, Satu Dashboard</h2>
          <p className={`max-w-xl mx-auto ${subtext}`}>
            Tiap modul jalan sendiri-sendiri kalau perlu, tapi datanya selalu tersambung satu sama lain.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODULES.map((m) => {
            const c = colorMap[m.color];
            return (
              <div
                key={m.name}
                className={`group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${cardBg}`}
              >
                <div className={`w-11 h-11 ${c.bg} rounded-xl flex items-center justify-center mb-4 shadow-lg ${c.ring}`}>
                  <m.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{m.name}</h3>
                <p className={`text-sm leading-relaxed mb-4 ${subtext}`}>{m.desc}</p>
                <ul className="space-y-1.5">
                  {m.points.map((p) => (
                    <li key={p} className={`flex items-center gap-2 text-xs ${subtext}`}>
                      <span className={`w-1 h-1 rounded-full ${c.bg}`} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <div
            className={`rounded-2xl p-6 flex flex-col justify-center items-start bg-gradient-to-br ${
              isDark ? 'from-indigo-600 to-sky-600' : 'from-indigo-500 to-sky-500'
            } text-white`}
          >
            <Zap className="w-8 h-8 mb-4" />
            <h3 className="font-bold text-lg mb-2">Lihat Semuanya Jalan</h3>
            <p className="text-sm text-white/80 mb-5">
              Coba tiap modul langsung di browser, tanpa perlu bikin akun dulu.
            </p>
            <button
              onClick={() => navigate('/demo')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-white text-indigo-600 hover:bg-white/90 transition-colors"
            >
              Mulai Demo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Business types */}
      <section id="business" className={`py-24 ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Dipakai di Berbagai Jenis Bisnis</h2>
            <p className={`max-w-xl mx-auto ${subtext}`}>
              Alur kerja & laporan menyesuaikan otomatis sesuai tipe bisnis yang kamu pilih.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {BUSINESS_TYPES.map((b) => (
              <div
                key={b.label}
                className={`rounded-2xl p-6 flex flex-col items-center gap-3 text-center transition-all hover:-translate-y-1 ${cardBg}`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-indigo-50'}`}>
                  <b.icon className={`w-5 h-5 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`} />
                </div>
                <span className="text-sm font-semibold">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div
          className={`rounded-3xl p-12 sm:p-16 text-center relative overflow-hidden ${
            isDark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-900'
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.25),transparent_60%)]" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Siap Rapikan Operasional Bisnismu?</h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-8">
              Mulai dari mode demo tanpa daftar, atau langsung masuk kalau tim kamu sudah punya akun.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/demo')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all"
              >
                Coba Demo Gratis
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold border border-slate-700 text-white hover:bg-slate-800 transition-all"
              >
                Masuk ke Akun
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t py-10 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/branding/omnipilot-mark.svg" alt="" className="w-5 h-5" />
            <span className="font-semibold text-sm">OmniPilot AI</span>
          </div>
          <p className={`text-xs ${subtext}`}>© 2026 OmniPilot AI Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
