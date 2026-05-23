import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import MyCommerSocialLogo from '../../components/medsos/MyCommerSocialLogo';
import { BrandLogo, resolveBrandKey } from '../../components/medsos/BrandLogo';
import {
  McsAdsIcon,
  McsAnalyticsIcon,
  McsConnectionsIcon,
  McsIconBadge,
  McsInboxIcon,
  McsMarketplaceIcon,
  McsPlannerIcon,
  McsSettingsIcon,
  McsSocialIcon,
  McsTeamIcon,
} from '../../components/medsos/MyCommerSocialIcons';
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
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
  XCircle,
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

function getDashboardTone(label: string) {
  if (label.includes('WA')) return 'emerald';
  if (label.includes('Social')) return 'blue';
  if (label.includes('Ads')) return 'amber';
  if (label.includes('Marketplace')) return 'violet';
  if (label.includes('Analytics')) return 'cyan';
  if (label.includes('Settings')) return 'slate';
  if (label.includes('Tim')) return 'cyan';
  if (label.includes('Planner')) return 'violet';
  return 'blue';
}

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
      icon: McsInboxIcon,
      value: isDemo ? 'Active' : waStatus?.reachable ? 'Active' : waStatus?.configured ? 'Check' : 'Setup',
      helper: isDemo ? 'Social inbox workspace demo aktif' : waStatus?.message || (waStatus?.configured ? 'Konfigurasi ada, koneksi perlu dicek' : 'Belum dikonfigurasi'),
      action: () => navigate(`${base}/inbox/wa`),
      actionLabel: 'Buka Inbox',
    },
    {
      level: socialLevel,
      label: 'Social',
      icon: McsSocialIcon,
      value: previewMode ? '—' : String(socialAccounts.length),
      helper: previewMode ? 'Preview — belum ada channel' : `${socialAccounts.length} channel social aktif`,
      action: () => navigate(`${base}/connections`),
      actionLabel: 'Connections',
    },
    {
      level: adsLevel,
      label: 'Ads',
      icon: McsAdsIcon,
      value: previewMode ? '—' : String(adsAccounts.length),
      helper: previewMode ? 'Preview — belum ada ad account' : `${adsAccounts.length} ad account aktif`,
      action: () => navigate(`${base}/ads`),
      actionLabel: 'Ads Workspace',
    },
    {
      level: mktLevel,
      label: 'Marketplace',
      icon: McsMarketplaceIcon,
      value: isDemo ? 'Active' : marketplaceStatus?.reachable ? String(marketplaceStatus.channels.length || 'Active') : marketplaceStatus?.configured ? 'Check' : 'Setup',
      helper: isDemo ? 'Marketplace preview aktif' : marketplaceStatus?.message || 'Marketplace chat belum aktif',
      action: () => navigate(`${base}/marketplace`),
      actionLabel: 'Marketplace Hub',
    },
  ];

  const quickActions = [
    { icon: McsInboxIcon, label: 'WA Inbox', helper: 'Buka chat WA', path: `${base}/inbox/wa` },
    { icon: McsSocialIcon, label: 'Medsos Inbox', helper: 'DM & komentar', path: `${base}/inbox/social` },
    { icon: McsMarketplaceIcon, label: 'Marketplace', helper: 'Buyer chat', path: `${base}/inbox/marketplace` },
    { icon: McsPlannerIcon, label: 'Planner', helper: 'Lane campaign & approval', path: `${base}/crm/planner` },
    { icon: McsAnalyticsIcon, label: 'Analytics', helper: 'Lihat performa', path: `${base}/analytics/social` },
    { icon: McsAdsIcon, label: 'Ads', helper: 'Kelola iklan', path: `${base}/ads` },
    { icon: McsTeamIcon, label: 'Tim MCS', helper: 'Kelola akses tim', path: `${base}/team` },
    { icon: McsSettingsIcon, label: 'Settings', helper: 'Konfigurasi workspace', path: `${base}/settings` },
  ];

  const cardBase = `relative overflow-hidden rounded-[24px] transition-all duration-300 ${
    isDark 
      ? 'bg-[#111318] ring-1 ring-white/10 hover:ring-white/20' 
      : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 hover:shadow-[0_8px_16px_rgb(0,0,0,0.06)] hover:ring-slate-900/10'
  }`;

  if (!isDemo && loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Section */}
      <div className={`relative overflow-hidden rounded-[32px] p-6 md:p-8 ${
        isDark ? 'bg-gradient-to-br from-blue-900/20 to-[#111318] ring-1 ring-white/10' : 'bg-gradient-to-br from-blue-50 to-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'
      }`}>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <MyCommerSocialLogo size={48} className="shadow-2xl shadow-blue-500/30 shrink-0 rounded-2xl" />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className={`text-2xl md:text-2xl md:text-3xl font-bold tracking-tight tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>MyCommerSocial</h1>
                {previewMode ? (
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    Preview Mode
                  </span>
                ) : (
                  <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Live Active
                  </span>
                )}
              </div>
              <p className={`text-sm mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Omnichannel Workspace — WA · Social · Marketplace · Ads
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate(`${base}/connections`)}
              className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition-all active:scale-95 ${
                isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
              }`}
            >
              <McsConnectionsIcon size={16} />
              Connections
            </button>
            <button
              onClick={() => navigate(`${base}/crm/content/photo`)}
              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95 transition-all hover:shadow-lg hover:shadow-blue-600/30 active:scale-95"
            >
              <Plus size={16} />
              Create Content
            </button>
          </div>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statusCards.map((card_) => (
          <div key={card_.label} className={`${cardBase} p-5 flex flex-col gap-4 group cursor-pointer`} onClick={card_.action}>
            <div className="flex items-start justify-between gap-2">
              <div className={`rounded-2xl p-3 transition-colors ${
                isDark ? 'bg-white/5 group-hover:bg-white/10' : 'bg-slate-50 group-hover:bg-slate-100'
              }`}>
                <McsIconBadge icon={card_.icon} size={42} iconSize={18} tone={getDashboardTone(card_.label)} />
              </div>
              <StatusDot level={card_.level} />
            </div>
            <div>
              <p className={`text-[10px] uppercase tracking-widest font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{card_.label}</p>
              <p className="mt-1 text-2xl md:text-3xl font-bold tracking-tight tracking-tight tracking-tight">{card_.value}</p>
              <p className={`mt-2 text-xs font-medium leading-relaxed line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{card_.helper}</p>
            </div>
            <div className={`mt-auto flex items-center gap-1.5 text-xs font-bold transition-transform group-hover:translate-x-1 ${
              isDark ? 'text-blue-400' : 'text-blue-600'
            }`}>
              {card_.actionLabel}
              <ArrowRight size={14} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1fr_360px] gap-6">
        {/* Quick actions */}
        <div className={`${cardBase} p-6`}>
          <div className="flex items-center gap-2 mb-6">
            <Sparkles size={18} className="text-blue-500" />
            <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`flex flex-col items-start gap-3 rounded-2xl p-4 text-left transition-all duration-200 active:scale-95 ${
                  isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <McsIconBadge icon={action.icon} size={42} iconSize={18} tone={getDashboardTone(action.label)} />
                <div>
                  <p className="text-sm font-bold tracking-tight">{action.label}</p>
                  <p className={`text-[11px] font-medium mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{action.helper}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Workspace health */}
        <div className={`${cardBase} p-6`}>
          <div className="flex items-center gap-2 mb-6">
            <Activity size={18} className="text-emerald-500" />
            <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Workspace Health</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: 'WA Inbox', ok: isDemo || Boolean(waStatus?.reachable), note: isDemo ? 'Live' : waStatus?.reachable ? 'Responding' : waStatus?.configured ? 'Needs check' : 'Not configured' },
              { label: 'Social accounts', ok: isDemo || socialAccounts.length > 0, note: previewMode ? 'None yet' : `${socialAccounts.length} connected` },
              { label: 'Ads accounts', ok: isDemo || adsAccounts.length > 0, note: previewMode ? 'None yet' : `${adsAccounts.length} connected` },
              { label: 'Marketplace hub', ok: isDemo || Boolean(marketplaceStatus?.reachable), note: isDemo ? 'Active' : marketplaceStatus?.reachable ? 'Healthy' : marketplaceStatus?.configured ? 'Needs check' : 'Not configured' },
            ].map((item) => (
              <div key={item.label} className={`flex items-center justify-between rounded-2xl p-3.5 transition-colors ${
                isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'
              }`}>
                <div className="flex items-center gap-3">
                  {item.ok
                    ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    : <XCircle size={16} className="text-slate-400 shrink-0" />}
                  <span className="text-sm font-bold tracking-tight">{item.label}</span>
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${item.ok ? 'text-emerald-500' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Connected channels */}
      <div className={`${cardBase} p-6`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
               <McsConnectionsIcon size={18} />
            </div>
            <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Active Channels</h2>
            {previewMode ? (
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Preview</span>
            ) : (
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                {displayAccounts.length} Connected
              </span>
            )}
          </div>
          <button
            onClick={() => navigate(`${base}/connections`)}
            className={`text-xs font-bold tracking-wide flex items-center gap-1 transition-transform hover:translate-x-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
          >
            Manage <ArrowRight size={12} />
          </button>
        </div>

        {displayAccounts.length === 0 ? (
          <div className={`rounded-2xl border-2 border-dashed p-8 text-sm text-center font-medium ${isDark ? 'border-slate-700 text-slate-400 bg-white/5' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>
            Belum ada channel yang terhubung. Klik <strong className={isDark ? 'text-white' : 'text-slate-900'}>Connections</strong> untuk mulai sinkronisasi.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayAccounts.map((account) => (
              <div key={account.id} className={`flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02] ${previewMode ? 'opacity-60' : ''} ${
                isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-white hover:shadow-md hover:ring-1 hover:ring-slate-900/5'
              }`}>
                <BrandLogo brand={resolveBrandKey(account.platform)} size={40} className="shadow-sm" withRing />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold tracking-tight truncate">{humanizePlatform(account.platform)}</p>
                  <p className={`text-[11px] font-medium truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    @{account.username || account.displayName || 'Connected'}
                  </p>
                </div>
                {!previewMode && (
                  <span className="shrink-0 h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
