import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import MyCommerSocialLogo from '../../components/medsos/MyCommerSocialLogo';
import FieldHelp from '../../components/medsos/FieldHelp';
import { PlatformBadge } from '../../components/medsos/PlatformBadge';
import {
  getMyCommerSocialIntegrationHub,
  type ManagedIntegrationConnector,
} from '../../services/myCommerSocialIntegrations';
import {
  getMarketplaceHubStatus,
  getWACrmStatus,
  getZernioAccounts,
  type MarketplaceHubConnectionStatus,
  type WACrmConnectionStatus,
  type ZernioAccount,
} from '../../services/medsosPostsService';
import { isZernioAdsAccount } from '../../data/zernioCatalog';
import {
  ArrowRight,
  LayoutDashboard,
  Loader2,
  MessageSquareText,
  PlugZap,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

const demoAccounts: ZernioAccount[] = [
  {
    id: 'demo-1',
    platform: 'instagram',
    username: 'tepatlaser.id',
    displayName: 'Tepat Laser Instagram',
    profileUrl: null,
    isActive: true,
  },
  {
    id: 'demo-2',
    platform: 'facebook',
    username: 'tepatlaser',
    displayName: 'Tepat Laser Facebook',
    profileUrl: null,
    isActive: true,
  },
  {
    id: 'demo-3',
    platform: 'metaads',
    username: 'act_2384',
    displayName: 'Meta Ads Main',
    profileUrl: null,
    isActive: true,
  },
];

const previewAccounts: ZernioAccount[] = [
  {
    id: 'preview-social-instagram',
    platform: 'instagram',
    username: 'preview_instagram',
    displayName: 'Instagram Preview',
    profileUrl: null,
    isActive: false,
  },
  {
    id: 'preview-social-facebook',
    platform: 'facebook',
    username: 'preview_facebook',
    displayName: 'Facebook Preview',
    profileUrl: null,
    isActive: false,
  },
  {
    id: 'preview-ads-meta',
    platform: 'metaads',
    username: 'preview_metaads',
    displayName: 'Meta Ads Preview',
    profileUrl: null,
    isActive: false,
  },
];

const liveFlow = [
  {
    title: 'Buat workspace',
    description: 'Workspace bisnis siap dipakai untuk menampung inbox, channel social media, dan ads.',
  },
  {
    title: 'Buka menu Connections',
    description: 'Lengkapi WA Inbox dan hubungkan channel yang dibutuhkan dari panel Connections.',
  },
  {
    title: 'Aktifkan inbox + social workspace',
    description: 'WhatsApp menggunakan workspace inbox internal, sedangkan social media dan ads menggunakan workspace sosial yang sama.',
  },
  {
    title: 'Mulai operasional',
    description: 'Begitu channel terhubung, planner, inbox, analytics, dan ads workspace siap digunakan.',
  },
];

function humanizePlatform(platform: string) {
  const value = platform.toLowerCase();
  const labels: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    linkedin: 'LinkedIn',
    twitter: 'X / Twitter',
    threads: 'Threads',
    bluesky: 'Bluesky',
    pinterest: 'Pinterest',
    reddit: 'Reddit',
    googlebusiness: 'Google Business',
    metaads: 'Meta Ads',
    linkedinads: 'LinkedIn Ads',
    pinterestads: 'Pinterest Ads',
    tiktokads: 'TikTok Ads',
    googleads: 'Google Ads',
    xads: 'X Ads',
  };
  return labels[value] || platform;
}

export default function MedsosDashboard() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = location.pathname.startsWith('/demo');

  const [loading, setLoading] = useState(!isDemo);
  const [waConnector, setWaConnector] = useState<ManagedIntegrationConnector | null>(null);
  const [waStatus, setWaStatus] = useState<WACrmConnectionStatus | null>(null);
  const [marketplaceStatus, setMarketplaceStatus] = useState<MarketplaceHubConnectionStatus | null>(null);
  const [accounts, setAccounts] = useState<ZernioAccount[]>(isDemo ? demoAccounts : []);

  useEffect(() => {
    if (isDemo) return;
    const load = async () => {
      setLoading(true);
      try {
        const [hub, zernioAccounts] = await Promise.all([
          getMyCommerSocialIntegrationHub(),
          getZernioAccounts(),
        ]);
        setWaConnector(hub.connectors.find((item) => item.slug === 'social-hub') || null);
        setAccounts(zernioAccounts);
        try {
          const [status, marketplaceProbe] = await Promise.all([
            getWACrmStatus(),
            getMarketplaceHubStatus(),
          ]);
          setWaStatus(status);
          setMarketplaceStatus(marketplaceProbe);
        } catch (statusError) {
          console.error('Failed to load WA inbox status', statusError);
          setWaStatus(null);
          setMarketplaceStatus(null);
        }
      } catch (error) {
        console.error('Failed to load dashboard workspace summary', error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isDemo]);

  const socialAccounts = useMemo(
    () => accounts.filter((account) => !isZernioAdsAccount(account.platform)),
    [accounts]
  );

  const adsAccounts = useMemo(
    () => accounts.filter((account) => isZernioAdsAccount(account.platform)),
    [accounts]
  );

  const previewMode = !isDemo
    && accounts.length === 0
    && !waStatus?.configured
    && !waConnector?.connectionRefMasked
    && !marketplaceStatus?.configured;

  const displayAccounts = previewMode ? previewAccounts : accounts;

  const waState = useMemo(
    () => {
      if (isDemo) {
        return { label: 'Ready', helper: 'Workspace inbox internal' };
      }
      if (waStatus?.reachable) {
        return { label: 'Ready', helper: 'Workspace inbox merespons dan stats live aktif' };
      }
      if (waStatus?.configured) {
        return { label: 'Check', helper: waStatus.message || 'Konfigurasi ada, tetapi koneksi perlu dicek' };
      }
      if (waConnector?.connectionRefMasked || waConnector?.status === 'connected') {
        return { label: 'Check', helper: 'Konfigurasi tersimpan, menunggu validasi layanan inbox' };
      }
      return { label: 'Setup', helper: 'Workspace inbox untuk WhatsApp' };
    },
    [isDemo, waStatus, waConnector]
  );

  const quickStatus = [
    {
      label: 'WA Inbox',
      value: previewMode ? 'Preview' : waState.label,
      helper: previewMode ? 'Akan aktif setelah API key inbox disimpan.' : waState.helper,
      icon: MessageSquareText,
    },
    {
      label: 'Social workspace',
      value: previewMode ? '0' : String(socialAccounts.length),
      helper: previewMode ? 'Preview netral channel social.' : 'Akun sosial tenant yang sudah aktif',
      icon: PlugZap,
    },
    {
      label: 'Ads workspace',
      value: previewMode ? '0' : String(adsAccounts.length),
      helper: previewMode ? 'Preview netral account ads.' : 'Ad account tenant yang sudah aktif',
      icon: Sparkles,
    },
    {
      label: 'Marketplace',
      value: previewMode
        ? 'Preview'
        : marketplaceStatus?.reachable ? String(marketplaceStatus.channels.length) : marketplaceStatus?.configured ? 'Check' : 'Setup',
      helper: previewMode
        ? 'Marketplace chat akan muncul setelah workspace aktif.'
        : marketplaceStatus?.reachable
          ? `${marketplaceStatus.channels.length} channel marketplace chat aktif`
          : marketplaceStatus?.message || 'Marketplace chat belum diaktifkan',
      icon: ShoppingBag,
    },
  ];

  if (!isDemo && loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-blue-100 bg-white shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="max-w-3xl">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4 ${isDark ? 'bg-blue-500/15 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
              <LayoutDashboard size={14} />
              Workspace overview
            </div>
            <div className="flex items-center gap-3 mb-3">
              <MyCommerSocialLogo size={46} className="shadow-lg shadow-blue-500/25" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Workspace overview</h1>
                  <FieldHelp title="Workspace overview" description="Ringkasan ini menunjukkan apakah WA Inbox, akun social, dan ads tenant sudah siap dipakai tanpa harus buka semua halaman satu per satu." />
                </div>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Pantau status WA Inbox, koneksi social media, marketplace chat, dan ads dari satu ringkasan operasional.
                </p>
                {previewMode ? (
                  <div className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-900 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                    Preview netral • channel belum tersambung
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(isDemo ? '/demo/medsos/connections' : '/medsos/connections')}
            title="Buka halaman Connections untuk mengatur WA, marketplace chat, social media, dan ads"
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Buka Connections
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {quickStatus.map((card) => (
          <div key={card.label} title={`${card.label}: ${card.helper}`} className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
            <div className={`inline-flex rounded-2xl p-3 ${isDark ? 'bg-slate-900 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              <card.icon size={18} />
            </div>
            <p className={`text-xs uppercase tracking-[0.18em] mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-4 gap-4">
        {liveFlow.map((item) => (
          <div key={item.title} title={item.description} className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
            <p className="font-semibold text-blue-500">{item.title}</p>
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.description}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <section className={`rounded-3xl border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <div className="flex items-center gap-2">
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Yang sudah aktif di workspace ini</h2>
            <FieldHelp title="Status aktif" description="Bagian ini membedakan mana koneksi yang sudah live, mana yang baru tersimpan, dan mana yang belum dihubungkan." />
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <p className="font-semibold">WA Inbox</p>
                  <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {previewMode
                  ? 'Preview netral. Status inbox live akan muncul setelah API key tersimpan.'
                  : waStatus?.reachable
                    ? 'Workspace inbox sudah siap dipakai dari inbox live.'
                    : waStatus?.configured
                      ? waStatus.message || 'Konfigurasi WA ada, tetapi koneksi live perlu dicek.'
                      : 'Belum ada API key inbox yang disimpan.'}
              </p>
            </div>
            <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
              <p className="font-semibold">Social workspace</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {previewMode
                  ? 'Preview netral untuk akun social yang nanti akan tampil di workspace ini.'
                  : socialAccounts.length > 0
                  ? `${socialAccounts.length} akun sosial sudah terhubung ke workspace ini.`
                  : 'Belum ada akun sosial yang dihubungkan.'}
              </p>
            </div>
            <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
              <p className="font-semibold">Ads workspace</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {previewMode
                  ? 'Preview netral untuk ad account yang nanti masuk ke dashboard.'
                  : adsAccounts.length > 0
                  ? `${adsAccounts.length} ad account sudah aktif.`
                  : 'Belum ada ad account yang dihubungkan.'}
              </p>
            </div>
          </div>
        </section>

        <section className={`rounded-3xl border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <div className="flex items-center gap-2">
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Channel yang terlihat dari workspace ini</h2>
            <FieldHelp title="Daftar channel" description="Semua channel di sini diambil dari data live tenant. Jika sebuah akun belum muncul, cek lagi halaman Connections atau status sinkronisasinya." />
          </div>
          {displayAccounts.length === 0 ? (
            <div className={`rounded-2xl border p-5 mt-6 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Belum ada channel yang terhubung. Lanjut ke halaman Connections untuk menyalakan WA Inbox, marketplace chat, atau mulai menghubungkan social workspace.
              </p>
            </div>
          ) : (
            <div className="space-y-3 mt-6">
              {displayAccounts.map((account) => (
                <div key={account.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-3">
                    <PlatformBadge label={humanizePlatform(account.platform)} size={40} />
                    <div>
                      <p className="font-semibold">{humanizePlatform(account.platform)}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {account.displayName || account.username || 'Connected account'}
                      </p>
                    </div>
                    </div>
                    {previewMode ? (
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${isDark ? 'bg-slate-800 text-gray-200' : 'border border-gray-200 bg-white text-gray-600'}`}>
                        Preview
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
