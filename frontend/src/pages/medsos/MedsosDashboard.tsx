import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import MyCommerSocialLogo from '../../components/medsos/MyCommerSocialLogo';
import { PlatformBadge } from '../../components/medsos/PlatformBadge';
import {
  getMyCommerSocialIntegrationHub,
  type ManagedIntegrationConnector,
} from '../../services/myCommerSocialIntegrations';
import { getZernioAccounts, type ZernioAccount } from '../../services/medsosPostsService';
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
    title: 'Aktifkan WA + Zernio',
    description: 'WhatsApp menggunakan Customer Service CRM, sedangkan social media dan ads menggunakan Zernio.',
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

  const waReady = useMemo(
    () => isDemo || Boolean(waConnector?.vendorWorkspaceUrl || waConnector?.connectionRefMasked || waConnector?.status === 'connected'),
    [isDemo, waConnector]
  );

  const quickStatus = [
    {
      label: 'WA Inbox',
      value: waReady ? 'Ready' : 'Setup',
      helper: 'Customer Service CRM internal',
      icon: MessageSquareText,
    },
    {
      label: 'Social via Zernio',
      value: String(socialAccounts.length),
      helper: 'Akun sosial tenant yang sudah aktif',
      icon: PlugZap,
    },
    {
      label: 'Ads via Zernio',
      value: String(adsAccounts.length),
      helper: 'Ad account tenant yang sudah aktif',
      icon: Sparkles,
    },
    {
      label: 'Marketplace',
      value: 'Soon',
      helper: 'Akan tersedia segera',
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
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Workspace overview</h1>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Pantau status WA Inbox, koneksi social media, dan ads dari satu ringkasan operasional.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(isDemo ? '/demo/medsos/connections' : '/medsos/connections')}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Buka Connections
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {quickStatus.map((card) => (
          <div key={card.label} className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
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
          <div key={item.title} className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
            <p className="font-semibold text-blue-500">{item.title}</p>
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.description}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <section className={`rounded-3xl border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Yang sudah aktif di workspace ini</h2>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
              <p className="font-semibold">WA Inbox</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {waReady ? 'Workspace CRM sudah siap dipakai dari inbox live.' : 'Belum ada URL/API key CRM yang disimpan.'}
              </p>
            </div>
            <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
              <p className="font-semibold">Social via Zernio</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {socialAccounts.length > 0
                  ? `${socialAccounts.length} akun sosial sudah terhubung ke workspace ini.`
                  : 'Belum ada akun sosial yang dihubungkan.'}
              </p>
            </div>
            <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
              <p className="font-semibold">Ads via Zernio</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {adsAccounts.length > 0
                  ? `${adsAccounts.length} ad account sudah aktif.`
                  : 'Belum ada ad account yang dihubungkan.'}
              </p>
            </div>
          </div>
        </section>

        <section className={`rounded-3xl border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Channel yang terlihat dari workspace ini</h2>
          {accounts.length === 0 ? (
            <div className={`rounded-2xl border p-5 mt-6 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Belum ada channel yang terhubung. Lanjut ke halaman Connections untuk menyalakan WA Inbox atau mulai connect Zernio.
              </p>
            </div>
          ) : (
            <div className="space-y-3 mt-6">
              {accounts.map((account) => (
                <div key={account.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <PlatformBadge label={humanizePlatform(account.platform)} size={40} />
                    <div>
                      <p className="font-semibold">{humanizePlatform(account.platform)}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {account.displayName || account.username || 'Connected account'}
                      </p>
                    </div>
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
