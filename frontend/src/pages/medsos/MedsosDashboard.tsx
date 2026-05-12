import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import MyCommerSocialLogo from '../../components/medsos/MyCommerSocialLogo';
import { BrandLogo, resolveBrandKey } from '../../components/medsos/BrandLogo';
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
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  CheckCircle2,
  CircleDot,
  Loader2,
  MessageSquareText,
  Megaphone,
  PlugZap,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';

const demoAccounts: ZernioAccount[] = [
  { id: 'demo-1', platform: 'instagram', username: 'tepatlaser.id', displayName: 'Tepat Laser Instagram', profileUrl: null, isActive: true },
  { id: 'demo-2', platform: 'facebook', username: 'tepatlaser', displayName: 'Tepat Laser Facebook', profileUrl: null, isActive: true },
  { id: 'demo-3', platform: 'metaads', username: 'act_2384', displayName: 'Meta Ads Main', profileUrl: null, isActive: true },
];

const previewAccounts: ZernioAccount[] = [
  { id: 'p-ig', platform: 'instagram', username: 'preview_instagram', displayName: 'Instagram Preview', profileUrl: null, isActive: false },
  { id: 'p-fb', platform: 'facebook', username: 'preview_facebook', displayName: 'Facebook Preview', profileUrl: null, isActive: false },
  { id: 'p-meta', platform: 'metaads', username: 'preview_metaads', displayName: 'Meta Ads Preview', profileUrl: null, isActive: false },
];

type StatusLevel = 'ok' | 'warn' | 'idle' | 'preview';

function StatusDot({ level }: { level: StatusLevel }) {
  const colors: Record<StatusLevel, string> = {
    ok: 'bg-emerald-400',
    warn: 'bg-amber-400',
    idle: 'bg-gray-400',
    preview: 'bg-slate-400',
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${colors[level]} shrink-0`} />;
}

function humanizePlatform(platform: string) {
  const labels: Record<string, string> = {
    facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok',
    youtube: 'YouTube', linkedin: 'LinkedIn', twitter: 'X / Twitter',
    threads: 'Threads', bluesky: 'Bluesky', pinterest: 'Pinterest',
    reddit: 'Reddit', googlebusiness: 'Google Business', metaads: 'Meta Ads',
    linkedinads: 'LinkedIn Ads', pinterestads: 'Pinterest Ads',
    tiktokads: 'TikTok Ads', googleads: 'Google Ads', xads: 'X Ads',
  };
  return labels[platform.toLowerCase()] || platform;
}

export default function MedsosDashboard() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = location.pathname.startsWith('/demo');
  const base = isDemo ? '/demo/medsos' : '/medsos';

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
        const [hub, zernioAccounts] = await Promise.all([getMyCommerSocialIntegrationHub(), getZernioAccounts()]);
        setWaConnector(hub.connectors.find((c) => c.slug === 'social-hub') || null);
        setAccounts(zernioAccounts);
        try {
          const [waSt, mktSt] = await Promise.all([getWACrmStatus(), getMarketplaceHubStatus()]);
          setWaStatus(waSt);
          setMarketplaceStatus(mktSt);
        } catch {
          /* silent — status probe optional */
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isDemo]);

  const socialAccounts = useMemo(() => accounts.filter((a) => !isZernioAdsAccount(a.platform)), [accounts]);
  const adsAccounts = useMemo(() => accounts.filter((a) => isZernioAdsAccount(a.platform)), [accounts]);

  const previewMode = !isDemo && accounts.length === 0 && !waStatus?.configured && !waConnector?.connectionRefMasked && !marketplaceStatus?.configured;
  const displayAccounts = previewMode ? previewAccounts : accounts;

  const waLevel: StatusLevel = isDemo || waStatus?.reachable ? 'ok' : waStatus?.configured ? 'warn' : previewMode ? 'preview' : 'idle';
  const mktLevel: StatusLevel = isDemo ? 'ok' : marketplaceStatus?.reachable ? 'ok' : marketplaceStatus?.configured ? 'warn' : previewMode ? 'preview' : 'idle';
  const socialLevel: StatusLevel = previewMode ? 'preview' : socialAccounts.length > 0 ? 'ok' : 'idle';
  const adsLevel: StatusLevel = previewMode ? 'preview' : adsAccounts.length > 0 ? 'ok' : 'idle';

  const statusCards = [
    {
      level: waLevel,
      label: 'WA Inbox',
      icon: MessageSquareText,
      value: isDemo ? 'Active' : waStatus?.reachable ? 'Active' : waStatus?.configured ? 'Check' : 'Setup',
      helper: isDemo ? 'Social inbox workspace demo aktif' : waStatus?.message || (waStatus?.configured ? 'Konfigurasi ada, koneksi perlu dicek' : 'Belum dikonfigurasi'),
      action: () => navigate(`${base}/inbox/wa`),
      actionLabel: 'Buka Inbox',
    },
    {
      level: socialLevel,
      label: 'Social',
      icon: PlugZap,
      value: previewMode ? '—' : String(socialAccounts.length),
      helper: previewMode ? 'Preview — belum ada channel' : `${socialAccounts.length} channel social aktif`,
      action: () => navigate(`${base}/connections`),
      actionLabel: 'Connections',
    },
    {
      level: adsLevel,
      label: 'Ads',
      icon: Megaphone,
      value: previewMode ? '—' : String(adsAccounts.length),
      helper: previewMode ? 'Preview — belum ada ad account' : `${adsAccounts.length} ad account aktif`,
      action: () => navigate(`${base}/ads`),
      actionLabel: 'Ads Workspace',
    },
    {
      level: mktLevel,
      label: 'Marketplace',
      icon: ShoppingBag,
      value: isDemo ? 'Active' : marketplaceStatus?.reachable ? String(marketplaceStatus.channels.length || 'Active') : marketplaceStatus?.configured ? 'Check' : 'Setup',
      helper: isDemo ? 'Marketplace preview aktif' : marketplaceStatus?.message || 'Marketplace chat belum aktif',
      action: () => navigate(`${base}/marketplace`),
      actionLabel: 'Marketplace Hub',
    },
  ];

  const quickActions = [
    { icon: MessageSquareText, label: 'WA Inbox', helper: 'Buka chat WA', path: `${base}/inbox/wa`, color: 'text-emerald-500' },
    { icon: CircleDot, label: 'Medsos Inbox', helper: 'DM & komentar', path: `${base}/inbox/social`, color: 'text-blue-500' },
    { icon: ShoppingBag, label: 'Marketplace', helper: 'Buyer chat', path: `${base}/inbox/marketplace`, color: 'text-orange-500' },
    { icon: Calendar, label: 'Planner', helper: 'Jadwal konten', path: `${base}/calendar`, color: 'text-purple-500' },
    { icon: BarChart3, label: 'Analytics', helper: 'Lihat performa', path: `${base}/analytics/social`, color: 'text-cyan-500' },
    { icon: Bot, label: 'Ads', helper: 'Kelola iklan', path: `${base}/ads`, color: 'text-pink-500' },
    { icon: Users, label: 'Tim MCS', helper: 'Kelola akses tim', path: `${base}/team`, color: 'text-indigo-500' },
    { icon: Settings, label: 'Settings', helper: 'Konfigurasi workspace', path: `${base}/settings`, color: 'text-slate-500' },
  ];

  if (!isDemo && loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const card = `rounded-2xl border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className={`rounded-3xl border p-5 md:p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-blue-50 bg-white shadow-sm'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <MyCommerSocialLogo size={44} className="shadow-lg shadow-blue-500/20 shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>MyCommerSocial</h1>
                {previewMode ? (
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    Preview
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    Active
                  </span>
                )}
              </div>
              <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Omnichannel — WA · Social · Marketplace · Ads
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate(`${base}/connections`)}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <PlugZap size={15} />
              Connections
            </button>
            <button
              onClick={() => navigate(`${base}/create`)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Zap size={15} />
              Create Post
            </button>
          </div>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {statusCards.map((card_) => (
          <div key={card_.label} className={`${card} p-4 flex flex-col gap-3`}>
            <div className="flex items-start justify-between gap-2">
              <div className={`rounded-xl p-2.5 ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <card_.icon size={17} className={card_.level === 'ok' ? 'text-emerald-500' : card_.level === 'warn' ? 'text-amber-500' : 'text-gray-400'} />
              </div>
              <StatusDot level={card_.level} />
            </div>
            <div>
              <p className={`text-xs uppercase tracking-wide font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card_.label}</p>
              <p className="mt-1 text-2xl font-bold">{card_.value}</p>
              <p className={`mt-1 text-xs leading-snug ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card_.helper}</p>
            </div>
            <button
              onClick={card_.action}
              className={`mt-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-100'}`}
            >
              {card_.actionLabel}
              <ArrowRight size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1fr_320px] gap-5">
        {/* Quick actions */}
        <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-blue-500" />
            <h2 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Quick actions</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition hover:scale-[1.01] ${isDark ? 'border-slate-700 bg-slate-900/50 hover:bg-slate-700' : 'border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm'}`}
              >
                <action.icon size={18} className={action.color} />
                <div>
                  <p className="text-sm font-semibold">{action.label}</p>
                  <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{action.helper}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Workspace health */}
        <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-emerald-500" />
            <h2 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Workspace health</h2>
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'WA Inbox', ok: isDemo || Boolean(waStatus?.reachable), note: isDemo ? 'Live' : waStatus?.reachable ? 'Responding' : waStatus?.configured ? 'Needs check' : 'Not configured' },
              { label: 'Social accounts', ok: isDemo || socialAccounts.length > 0, note: previewMode ? 'None yet' : `${socialAccounts.length} connected` },
              { label: 'Ads accounts', ok: isDemo || adsAccounts.length > 0, note: previewMode ? 'None yet' : `${adsAccounts.length} connected` },
              { label: 'Marketplace hub', ok: isDemo || Boolean(marketplaceStatus?.reachable), note: isDemo ? 'Active' : marketplaceStatus?.reachable ? 'Healthy' : marketplaceStatus?.configured ? 'Needs check' : 'Not configured' },
            ].map((item) => (
              <div key={item.label} className={`flex items-center justify-between rounded-xl p-3 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2.5">
                  {item.ok
                    ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    : <XCircle size={15} className="text-gray-400 shrink-0" />}
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <span className={`text-xs ${item.ok ? 'text-emerald-500' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>{item.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Connected channels */}
      <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PlugZap size={16} className="text-blue-500" />
            <h2 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Channel aktif</h2>
            {previewMode ? (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isDark ? 'bg-slate-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>preview</span>
            ) : (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                {displayAccounts.length} channel
              </span>
            )}
          </div>
          <button
            onClick={() => navigate(`${base}/connections`)}
            className={`text-xs font-semibold ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
          >
            Kelola →
          </button>
        </div>

        {displayAccounts.length === 0 ? (
          <div className={`rounded-xl border border-dashed p-5 text-sm text-center ${isDark ? 'border-slate-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
            Belum ada channel yang terhubung. Klik <strong>Connections</strong> untuk mulai.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {displayAccounts.map((account) => (
              <div key={account.id} className={`flex items-center gap-3 rounded-xl border p-3 ${previewMode ? 'opacity-60' : ''} ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <BrandLogo brand={resolveBrandKey(account.platform)} size={36} withRing />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{humanizePlatform(account.platform)}</p>
                  <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {account.displayName || account.username || 'Connected'}
                  </p>
                </div>
                {!previewMode && (
                  <span className="ml-auto shrink-0 h-2 w-2 rounded-full bg-emerald-400" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
