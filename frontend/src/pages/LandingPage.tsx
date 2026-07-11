import { useEffect, useRef, useState } from 'react';
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
  Star,
  Clock,
  Globe,
  Award,
  BarChart3,
  Layers,
  Twitter,
  Instagram,
  Linkedin,
} from 'lucide-react';

/* ─── DATA ──────────────────────────────────────────────────── */

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

const STATS = [
  { icon: Users, value: 500, suffix: '+', label: 'Bisnis Aktif', color: 'indigo' },
  { icon: BarChart3, value: 2500000, suffix: '+', label: 'Transaksi Diproses', color: 'emerald', format: 'compact' },
  { icon: Clock, value: 99.9, suffix: '%', label: 'Uptime Terjamin', color: 'sky', decimal: true },
  { icon: Globe, value: 5, suffix: ' mnt', label: 'Rata-rata Setup Awal', color: 'orange' },
];

const HOW_STEPS = [
  {
    number: '01',
    icon: Layers,
    title: 'Buat Akun & Pilih Modul',
    desc: 'Daftar dalam hitungan menit. Pilih modul yang bisnis kamu butuhkan sekarang — tambah modul lain kapan saja tanpa bayar ulang.',
    color: 'indigo',
  },
  {
    number: '02',
    icon: Zap,
    title: 'Import Data & Konfigurasi',
    desc: 'Import menu, produk, staf, dan struktur cabang kamu lewat wizard onboarding yang guided. Tidak perlu tim IT.',
    color: 'sky',
  },
  {
    number: '03',
    icon: BarChart3,
    title: 'Jalankan & Monitor Real-Time',
    desc: 'Kasir langsung berjalan, laporan otomatis terisi. Pantau semua cabang dan performa tim dari satu dashboard kapanpun.',
    color: 'emerald',
  },
];

const TESTIMONIALS = [
  {
    name: 'Rizky Firmansyah',
    role: 'Owner, Kopi Nusantara',
    detail: '3 Cabang • F&B',
    avatar: 'RF',
    color: 'indigo',
    text: 'Sebelumnya kami pakai 4 aplikasi berbeda untuk kasir, stok, dan laporan. Sekarang semuanya masuk OmniPilot. Rekap bulanan yang dulu butuh 3 jam, sekarang tinggal klik satu tombol.',
    rating: 5,
  },
  {
    name: 'Siti Rahayu',
    role: 'Finance Manager',
    detail: 'Apotek Sehat Sejahtera',
    avatar: 'SR',
    color: 'emerald',
    text: 'Fitur batch number dan expiry date di modul inventory sangat membantu. Dulu kami catat manual di Excel dan sering kecolongan stok kadaluarsa. Sekarang sistem yang ingatkan otomatis.',
    rating: 5,
  },
  {
    name: 'Budi Santoso',
    role: 'Direktur Operasional',
    detail: 'CV Mitra Distribusi • 8 Gudang',
    avatar: 'BS',
    color: 'orange',
    text: 'Dashboard multi-cabang-nya luar biasa. Saya bisa pantau performa 8 gudang dari HP kapanpun. Laporan yang dulu makan waktu 2 hari sekarang real-time dan bisa langsung di-export.',
    rating: 5,
  },
];

const colorMap: Record<string, { bg: string; text: string; ring: string; light: string; bgDim: string; borderDim: string }> = {
  indigo: {
    bg: 'bg-indigo-500',
    text: 'text-indigo-600 dark:text-indigo-400',
    ring: 'shadow-indigo-500/20',
    light: 'bg-indigo-50 dark:bg-indigo-950/30',
    bgDim: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    borderDim: 'border-indigo-500/20 dark:border-indigo-500/25',
  },
  emerald: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'shadow-emerald-500/20',
    light: 'bg-emerald-50 dark:bg-emerald-950/30',
    bgDim: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    borderDim: 'border-emerald-500/20 dark:border-emerald-500/25',
  },
  orange: {
    bg: 'bg-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    ring: 'shadow-orange-500/20',
    light: 'bg-orange-50 dark:bg-orange-950/30',
    bgDim: 'bg-orange-500/10 dark:bg-orange-500/15',
    borderDim: 'border-orange-500/20 dark:border-orange-500/25',
  },
  blue: {
    bg: 'bg-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    ring: 'shadow-blue-500/20',
    light: 'bg-blue-50 dark:bg-blue-950/30',
    bgDim: 'bg-blue-500/10 dark:bg-blue-500/15',
    borderDim: 'border-blue-500/20 dark:border-blue-500/25',
  },
  sky: {
    bg: 'bg-sky-500',
    text: 'text-sky-600 dark:text-sky-400',
    ring: 'shadow-sky-500/20',
    light: 'bg-sky-50 dark:bg-sky-950/30',
    bgDim: 'bg-sky-500/10 dark:bg-sky-500/15',
    borderDim: 'border-sky-500/20 dark:border-sky-500/25',
  },
  amber: {
    bg: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'shadow-amber-500/20',
    light: 'bg-amber-50 dark:bg-amber-950/30',
    bgDim: 'bg-amber-500/10 dark:bg-amber-500/15',
    borderDim: 'border-amber-500/20 dark:border-amber-500/25',
  },
};

/* ─── HELPERS ────────────────────────────────────────────────── */

function formatStat(value: number, fmt?: string, decimal?: boolean): string {
  if (fmt === 'compact') {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K';
  }
  return decimal ? value.toFixed(1) : String(Math.round(value));
}

/* ─── COMPONENT ─────────────────────────────────────────────── */

export default function LandingPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useThemeStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [statValues, setStatValues] = useState(STATS.map(() => 0));
  const statsRef = useRef<HTMLDivElement>(null);

  // ── Fix: undo POS app's fixed viewport styles while landing page is mounted
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      rootOverflow: root?.style.overflow ?? '',
      rootHeight: root?.style.height ?? '',
    };
    html.style.overflow = 'auto';
    body.style.overflow = 'auto';
    body.style.position = 'static';
    body.style.width = 'auto';
    body.style.height = 'auto';
    if (root) { root.style.overflow = 'visible'; root.style.height = 'auto'; }
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.width = prev.bodyWidth;
      body.style.height = prev.bodyHeight;
      if (root) { root.style.overflow = prev.rootOverflow; root.style.height = prev.rootHeight; }
    };
  }, []);

  // ── Scroll-reveal using IntersectionObserver
  useEffect(() => {
    const els = document.querySelectorAll('.op-reveal');
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('op-revealed'); }),
      { threshold: 0.08 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // ── Animated stat counters
  useEffect(() => {
    if (!statsRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStatsVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!statsVisible) return;
    const targets = STATS.map((s) => s.value);
    const duration = 1600;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setStatValues(targets.map((t) => parseFloat((eased * t).toFixed(1))));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [statsVisible]);

  /* ── Theme shortcuts */
  const surface  = isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900';
  const subtext  = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg   = isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100';
  const sectionAlt = isDark ? 'bg-slate-900/60' : 'bg-slate-50';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${surface}`}>

      {/* ── Keyframe & reveal CSS ── */}
      <style>{`
        @keyframes op-float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes op-bar {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
        .op-float { animation: op-float 4.5s ease-in-out infinite; }
        .op-reveal {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .op-reveal.op-revealed {
          opacity: 1;
          transform: translateY(0);
        }
        .op-delay-1 { transition-delay: 0.1s; }
        .op-delay-2 { transition-delay: 0.2s; }
        .op-delay-3 { transition-delay: 0.3s; }
        .op-delay-4 { transition-delay: 0.4s; }
        .op-bar-animate {
          transform-origin: bottom;
          animation: op-bar 0.7s ease-out both;
        }
      `}</style>

      {/* ══════════════════════ NAVBAR ══════════════════════ */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-100'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="branding/omnipilot-mark.svg" alt="" className="w-8 h-8" />
            <span className="font-bold text-lg tracking-tight">OmniPilot AI</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#modules"  className={`${subtext} hover:text-indigo-500 transition-colors`}>Modul</a>
            <a href="#how"      className={`${subtext} hover:text-indigo-500 transition-colors`}>Cara Kerja</a>
            <a href="#business" className={`${subtext} hover:text-indigo-500 transition-colors`}>Untuk Bisnis Apa</a>
            <Link to="/demo"    className={`${subtext} hover:text-indigo-500 transition-colors`}>Demo</Link>
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
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all hover:-translate-y-0.5"
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
            <a href="#modules"  onClick={() => setMenuOpen(false)} className={subtext}>Modul</a>
            <a href="#how"      onClick={() => setMenuOpen(false)} className={subtext}>Cara Kerja</a>
            <a href="#business" onClick={() => setMenuOpen(false)} className={subtext}>Untuk Bisnis Apa</a>
            <Link to="/demo"    onClick={() => setMenuOpen(false)} className={subtext}>Demo</Link>
            <button onClick={() => navigate('/login')} className="text-left font-semibold">Masuk</button>
          </div>
        )}
      </header>

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="relative overflow-hidden">
        <div
          className={`absolute inset-0 -z-10 ${
            isDark
              ? 'bg-[radial-gradient(circle_at_20%_-10%,rgba(99,102,241,0.28),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.18),transparent_40%)]'
              : 'bg-[radial-gradient(circle_at_20%_-10%,rgba(99,102,241,0.10),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.10),transparent_40%)]'
          }`}
        />

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="op-reveal">
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
                  isDark ? 'border-slate-700 text-white hover:bg-slate-800' : 'border-slate-200 text-slate-900 hover:bg-slate-50'
                }`}
              >
                Sudah Punya Akun
              </button>
            </div>

            <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 mt-10 text-sm ${subtext}`}>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Setup dalam 5 menit
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Multi-tenant siap pakai
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Offline-ready POS
              </div>
            </div>
          </div>

          {/* Right — Dashboard Bento Mockup */}
          <div className="relative hidden lg:block op-reveal op-delay-2 op-float">
            <div className={`rounded-3xl p-5 shadow-2xl ${cardBg}`}>
              {/* Top — revenue */}
              <div className={`rounded-2xl p-5 mb-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold ${subtext}`}>Pendapatan Hari Ini</span>
                  <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">↑ 18.2%</span>
                </div>
                <div className="text-3xl font-bold mb-1">Rp 12.480.000</div>
                <div className={`text-xs mb-4 ${subtext}`}>vs Rp 10.557.000 kemarin</div>
                <div className="flex items-end gap-1.5 h-14">
                  {[40, 65, 45, 80, 60, 95, 70].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-500 to-sky-400 op-bar-animate"
                      style={{ height: `${h}%`, opacity: 0.35 + i * 0.09, animationDelay: `${i * 0.07}s` }}
                    />
                  ))}
                </div>
              </div>

              {/* Bottom row */}
              <div className="grid grid-cols-3 gap-3">
                <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <Box className="w-4 h-4 text-orange-500 mb-2" />
                  <div className="text-lg font-bold">248</div>
                  <div className={`text-xs ${subtext}`}>Stok Aman</div>
                </div>
                <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <Users className="w-4 h-4 text-sky-500 mb-2" />
                  <div className="text-lg font-bold">1.204</div>
                  <div className={`text-xs ${subtext}`}>Chat WA</div>
                </div>
                <div className={`rounded-2xl p-4 col-span-1 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <TrendingUp className="w-4 h-4 text-emerald-500 mb-2" />
                  <div className="text-lg font-bold">94%</div>
                  <div className={`text-xs ${subtext}`}>Target Bulan</div>
                </div>
              </div>
            </div>

            {/* Decorative accent shapes */}
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-2xl rotate-12 -z-10 ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-100'}`} />
            <div className={`absolute -bottom-8 -left-8 w-32 h-32 rounded-full -z-10 ${isDark ? 'bg-sky-500/10' : 'bg-sky-100'}`} />
          </div>
        </div>
      </section>

      {/* ══════════════════════ STATS STRIP ══════════════════════ */}
      <section ref={statsRef} className={`py-14 border-y ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((s, i) => {
              const c = colorMap[s.color] || colorMap.indigo;
              return (
                <div key={s.label} className={`text-center op-reveal op-delay-${i + 1}`}>
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${
                    isDark ? c.bgDim : c.light
                  }`}>
                    <s.icon className={`w-5 h-5 ${c.text}`} />
                  </div>
                  <div className="text-3xl font-bold tracking-tight mb-1">
                    {formatStat(statValues[i], s.format, s.decimal)}
                    <span className={c.text}>{s.suffix}</span>
                  </div>
                  <div className={`text-sm font-medium ${subtext}`}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ MODULES ══════════════════════ */}
      <section id="modules" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14 op-reveal">
          <div className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-4 px-3 py-1.5 rounded-full ${
            isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
          }`}>
            <Layers className="w-3.5 h-3.5" />
            Modul Platform
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-4">5 Modul, Satu Dashboard</h2>
          <p className={`max-w-xl mx-auto ${subtext}`}>
            Tiap modul jalan sendiri-sendiri kalau perlu, tapi datanya selalu tersambung satu sama lain secara real-time.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODULES.map((m, i) => {
            const c = colorMap[m.color];
            return (
              <div
                key={m.name}
                className={`group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl op-reveal op-delay-${Math.min(i + 1, 4)} ${cardBg}`}
              >
                <div className={`w-11 h-11 ${c.bg} rounded-xl flex items-center justify-center mb-4 shadow-lg ${c.ring}`}>
                  <m.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{m.name}</h3>
                <p className={`text-sm leading-relaxed mb-4 ${subtext}`}>{m.desc}</p>
                <ul className="space-y-2">
                  {m.points.map((p) => (
                    <li key={p} className={`flex items-center gap-2 text-xs ${subtext}`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${c.text} flex-shrink-0`} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* CTA card */}
          <div
            className={`rounded-2xl p-6 flex flex-col justify-center items-start bg-gradient-to-br op-reveal op-delay-3 ${
              isDark ? 'from-indigo-600 to-sky-600' : 'from-indigo-500 to-sky-500'
            } text-white`}
          >
            <Zap className="w-8 h-8 mb-4 opacity-90" />
            <h3 className="font-bold text-lg mb-2">Lihat Semuanya Jalan</h3>
            <p className="text-sm text-white/75 mb-6">
              Coba tiap modul langsung di browser, tanpa perlu bikin akun dulu. No credit card.
            </p>
            <button
              onClick={() => navigate('/demo')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl bg-white text-indigo-600 hover:bg-white/90 transition-colors"
            >
              Mulai Demo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
      <section id="how" className={`py-24 ${sectionAlt}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14 op-reveal">
            <div className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-4 px-3 py-1.5 rounded-full ${
              isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Cara Kerja
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-4">Mulai dalam 3 Langkah</h2>
            <p className={`max-w-xl mx-auto ${subtext}`}>
              Tidak perlu tim IT, tidak perlu migrasi data yang rumit. Setup guided dari awal sampai kasir pertama berjalan.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div className={`hidden md:block absolute top-12 left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

            {HOW_STEPS.map((step, i) => {
              const c = colorMap[step.color] || colorMap.indigo;
              return (
                <div key={step.number} className={`relative op-reveal op-delay-${i + 1}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 relative z-10 ${
                    isDark ? `${c.bgDim} border ${c.borderDim}` : c.light
                  }`}>
                    <step.icon className={`w-6 h-6 ${c.text}`} />
                    <span className={`absolute -top-2 -right-2 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${c.bg} text-white`}>
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg mb-3">{step.title}</h3>
                  <p className={`text-sm leading-relaxed ${subtext}`}>{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ BUSINESS TYPES ══════════════════════ */}
      <section id="business" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12 op-reveal">
          <div className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-4 px-3 py-1.5 rounded-full ${
            isDark ? 'bg-sky-500/10 text-sky-400' : 'bg-sky-50 text-sky-600'
          }`}>
            <Award className="w-3.5 h-3.5" />
            Cocok Untuk
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-4">Dipakai di Berbagai Jenis Bisnis</h2>
          <p className={`max-w-xl mx-auto ${subtext}`}>
            Alur kerja & laporan menyesuaikan otomatis sesuai tipe bisnis yang kamu pilih saat onboarding.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {BUSINESS_TYPES.map((b, i) => (
            <div
              key={b.label}
              className={`rounded-2xl p-6 flex flex-col items-center gap-3 text-center transition-all hover:-translate-y-1 hover:shadow-lg op-reveal op-delay-${i + 1} ${cardBg}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-indigo-50'}`}>
                <b.icon className={`w-5 h-5 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`} />
              </div>
              <span className="text-sm font-semibold">{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════ TESTIMONIALS ══════════════════════ */}
      <section className={`py-24 ${sectionAlt}`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14 op-reveal">
            <div className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-4 px-3 py-1.5 rounded-full ${
              isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
            }`}>
              <Star className="w-3.5 h-3.5" />
              Testimonial
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-4">Dipercaya Ratusan Pemilik Bisnis</h2>
            <p className={`max-w-xl mx-auto ${subtext}`}>
              Dari warung kopi satu cabang sampai distributor dengan 8 gudang. Ini kata mereka.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => {
              const c = colorMap[t.color];
              return (
                <div key={t.name} className={`rounded-2xl p-6 flex flex-col gap-5 op-reveal op-delay-${i + 1} ${cardBg}`}>
                  {/* Stars */}
                  <div className="flex gap-1">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  {/* Quote */}
                  <p className={`text-sm leading-relaxed flex-1 ${subtext}`}>"{t.text}"</p>
                  {/* Author */}
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                      {t.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{t.name}</div>
                      <div className={`text-xs ${subtext}`}>{t.role}</div>
                      <div className={`text-xs font-medium ${c.text}`}>{t.detail}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ FINAL CTA ══════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className={`rounded-3xl p-12 sm:p-16 text-center relative overflow-hidden op-reveal ${
          isDark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-900'
        }`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.28),transparent_60%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_100%,rgba(56,189,248,0.15),transparent_50%)] pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-6 px-3 py-1.5 rounded-full bg-white/10 text-white/70">
              <Sparkles className="w-3.5 h-3.5" />
              Mulai Sekarang
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Siap Rapikan Operasional Bisnismu?
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
              Mulai dari mode demo tanpa daftar, atau langsung masuk kalau tim kamu sudah punya akun.
              Tidak perlu kartu kredit, tidak ada ikatan kontrak.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/demo')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
              >
                Coba Demo Gratis
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold border border-slate-700 text-white hover:bg-slate-800 transition-all"
              >
                Masuk ke Akun
              </button>
            </div>
            <p className={`mt-8 text-xs text-slate-500`}>Setup &lt; 5 menit • Offline-ready • No credit card</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className={`border-t ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}>
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
            {/* Brand col */}
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="branding/omnipilot-mark.svg" alt="" className="w-7 h-7" />
                <span className="font-bold text-base tracking-tight">OmniPilot AI</span>
              </div>
              <p className={`text-sm leading-relaxed max-w-xs ${subtext}`}>
                Platform bisnis all-in-one berbasis AI untuk UMKM dan enterprise Indonesia. Kasir, akuntansi, stok, dan sosial media dalam satu atap.
              </p>
              <div className="flex gap-3 mt-5">
                <a href="#" aria-label="Twitter" className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200'}`}>
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="#" aria-label="Instagram" className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200'}`}>
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="#" aria-label="LinkedIn" className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200'}`}>
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-bold text-sm mb-4">Produk</h4>
              <ul className={`space-y-3 text-sm ${subtext}`}>
                <li><a href="#modules" className="hover:text-indigo-500 transition-colors">Point of Sale</a></li>
                <li><a href="#modules" className="hover:text-indigo-500 transition-colors">Accounting</a></li>
                <li><a href="#modules" className="hover:text-indigo-500 transition-colors">Inventory</a></li>
                <li><a href="#modules" className="hover:text-indigo-500 transition-colors">Admin & Analytics</a></li>
                <li><a href="#modules" className="hover:text-indigo-500 transition-colors">Social Media</a></li>
              </ul>
            </div>

            {/* Solutions */}
            <div>
              <h4 className="font-bold text-sm mb-4">Solusi</h4>
              <ul className={`space-y-3 text-sm ${subtext}`}>
                <li><a href="#business" className="hover:text-indigo-500 transition-colors">F&B & Restoran</a></li>
                <li><a href="#business" className="hover:text-indigo-500 transition-colors">Retail</a></li>
                <li><a href="#business" className="hover:text-indigo-500 transition-colors">Distribusi</a></li>
                <li><a href="#business" className="hover:text-indigo-500 transition-colors">Manufaktur</a></li>
                <li><a href="#business" className="hover:text-indigo-500 transition-colors">Apotek</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-bold text-sm mb-4">Lainnya</h4>
              <ul className={`space-y-3 text-sm ${subtext}`}>
                <li><Link to="/demo" className="hover:text-indigo-500 transition-colors">Coba Demo</Link></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-indigo-500 transition-colors">Login</button></li>
                <li><a href="mailto:hello@omnipilot.ai" className="hover:text-indigo-500 transition-colors">Kontak</a></li>
                <li><a href="#" className="hover:text-indigo-500 transition-colors">Kebijakan Privasi</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 border-t text-xs ${subtext} ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <p>© 2026 OmniPilot AI Platform. All rights reserved.</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
