import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useThemeStore } from '../../store/themeStore';
import MyCommerSocialLogo from '../../components/medsos/MyCommerSocialLogo';
import { PlatformBadge } from '../../components/medsos/PlatformBadge';
import {
  completeMyCommerSocialConnect,
  getMyCommerSocialIntegrationHub,
  type ManagedIntegrationConnector,
} from '../../services/myCommerSocialIntegrations';
import {
  disconnectZernioAccount,
  getZernioAccounts,
  getZernioAdsConnectUrl,
  getZernioConnectUrl,
  type ZernioAccount,
} from '../../services/medsosPostsService';
import { isZernioAdsAccount, zernioAdsPlatforms, zernioSocialPlatforms } from '../../data/zernioCatalog';
import {
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  MessageSquareText,
  PlugZap,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Unplug,
  Workflow,
} from 'lucide-react';

type CrmFormState = {
  workspaceName: string;
  vendorWorkspaceUrl: string;
  connectionId: string;
  vendorWorkspaceEmail: string;
  notes: string;
};

const demoWaConnector = {
  id: 1,
  slug: 'social-hub',
  integrationType: 'managed_social_hub',
  name: 'WA Inbox',
  workspaceName: 'Tepat Laser Support Desk',
  category: 'social',
  description: 'Customer Service CRM menangani inbox WhatsApp, agent routing, dan lead tracking.',
  providerName: 'Customer Service CRM',
  providerKey: 'wa_crm',
  status: 'connected',
  statusLabel: 'Connected',
  isActive: true,
  healthScore: 96,
  supportedChannels: [{ brand: 'whatsapp', label: 'WhatsApp Inbox' }],
  capabilities: ['unified inbox', 'live chat stats', 'agent routing'],
  billingNote: 'Produk internal dengan pricing custom per workspace.',
  dashboardFeeNote: 'Rp300.000 / bulan untuk command center.',
  pricingSummary: null,
  recommendedPlan: null,
  selectedAssets: [{ id: 'wa-1', label: 'WhatsApp Inbox', kind: 'whatsapp', status: 'connected' }],
  setupChecklist: [],
  requiredUserActions: [],
  nextActions: [],
  launchMode: 'manual_reference',
  launchUrlConfigured: false,
  vendorPortalUrl: 'https://crm.example.com',
  vendorPortalLabel: 'Buka CRM',
  pricingUrl: null,
  docsUrl: null,
  supportUrl: null,
  callbackUrl: '',
  webhookUrl: '',
  operatorNotes: 'Demo workspace untuk agent support.',
  vendorWorkspaceUrl: 'https://crm.example.com',
  vendorWorkspaceEmail: 'ops@example.com',
  subscriptionPlan: 'custom',
  subscriptionStatus: 'active',
  renewalDate: null,
  billingOwnerName: 'Ops Team',
  lastSyncAt: new Date().toISOString(),
  connectedAt: new Date().toISOString(),
  connectionRefMasked: 'api_••••8452',
  launchSession: null,
  lastError: null,
  lastWebhookEvent: null,
  updatedAt: new Date().toISOString(),
  customerPaysDirectly: false,
  dashboardFee: {
    currency: 'IDR',
    amount: 300000,
    label: 'Rp300.000 / bulan',
    description: 'Biaya command center.',
  },
} as ManagedIntegrationConnector;

const demoZernioAccounts: ZernioAccount[] = [
  {
    id: 'demo-instagram',
    platform: 'instagram',
    username: 'tepatlaser.id',
    displayName: 'Tepat Laser Instagram',
    profileUrl: null,
    isActive: true,
  },
  {
    id: 'demo-facebook',
    platform: 'facebook',
    username: 'tepatlaser',
    displayName: 'Tepat Laser Facebook',
    profileUrl: null,
    isActive: true,
  },
  {
    id: 'demo-metaads',
    platform: 'metaads',
    username: 'act_2384',
    displayName: 'Meta Ads Main Account',
    profileUrl: null,
    isActive: true,
  },
];

const emptyCrmForm: CrmFormState = {
  workspaceName: '',
  vendorWorkspaceUrl: '',
  connectionId: '',
  vendorWorkspaceEmail: '',
  notes: '',
};

const stepCards = [
  {
    title: '1. Buat workspace',
    description: 'Workspace bisnis dibuat seperti biasa dan siap dipakai untuk menampung channel yang akan dihubungkan.',
  },
  {
    title: '2. Lengkapi WA Inbox',
    description: 'Simpan URL instance dan credential Customer Service CRM untuk mengaktifkan operasional WhatsApp.',
  },
  {
    title: '3. Hubungkan social',
    description: 'Hubungkan Instagram, Facebook, TikTok, LinkedIn, dan channel lain langsung dari workspace Zernio.',
  },
  {
    title: '4. Aktifkan ads',
    description: 'Ad account mengikuti workspace yang sama sehingga social media dan ads bisa dikelola dari satu panel.',
  },
];

function toLocalDate(value?: string | null) {
  if (!value) return 'Belum ada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('id-ID');
}

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
    snapchat: 'Snapchat',
    metaads: 'Meta Ads',
    linkedinads: 'LinkedIn Ads',
    pinterestads: 'Pinterest Ads',
    tiktokads: 'TikTok Ads',
    googleads: 'Google Ads',
    xads: 'X Ads',
  };
  return labels[value] || platform;
}

export default function MedsosConnections() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const isDemo = location.pathname.startsWith('/demo');

  const [loading, setLoading] = useState(!isDemo);
  const [savingWa, setSavingWa] = useState(false);
  const [waConnector, setWaConnector] = useState<ManagedIntegrationConnector | null>(isDemo ? demoWaConnector : null);
  const [crmForm, setCrmForm] = useState<CrmFormState>(() => ({
    ...emptyCrmForm,
    workspaceName: demoWaConnector.workspaceName || '',
    vendorWorkspaceUrl: demoWaConnector.vendorWorkspaceUrl || '',
    vendorWorkspaceEmail: demoWaConnector.vendorWorkspaceEmail || '',
    notes: demoWaConnector.operatorNotes || '',
  }));
  const [zernioAccounts, setZernioAccounts] = useState<ZernioAccount[]>(isDemo ? demoZernioAccounts : []);
  const [zernioLoading, setZernioLoading] = useState(!isDemo);
  const [busyPlatform, setBusyPlatform] = useState<string | null>(null);

  const loadLiveData = async () => {
    setLoading(true);
    setZernioLoading(true);
    try {
      const [hub, accounts] = await Promise.all([
        getMyCommerSocialIntegrationHub(),
        getZernioAccounts(),
      ]);
      const socialHub = hub.connectors.find((connector) => connector.slug === 'social-hub') || null;
      setWaConnector(socialHub);
      setZernioAccounts(accounts);
    } catch (error) {
      console.error('Failed to load MyCommerSocial connections', error);
      toast.error('Gagal memuat konfigurasi connections.');
    } finally {
      setLoading(false);
      setZernioLoading(false);
    }
  };

  useEffect(() => {
    if (isDemo) return;
    void loadLiveData();
  }, [isDemo]);

  useEffect(() => {
    if (!waConnector) return;
    setCrmForm((current) => ({
      ...current,
      workspaceName: current.workspaceName || waConnector.workspaceName || '',
      vendorWorkspaceUrl: current.vendorWorkspaceUrl || waConnector.vendorWorkspaceUrl || '',
      vendorWorkspaceEmail: current.vendorWorkspaceEmail || waConnector.vendorWorkspaceEmail || '',
      notes: current.notes || waConnector.operatorNotes || '',
    }));
  }, [waConnector]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const socialConnected = params.get('zernio_connected');
    const adsConnected = params.get('zernio_ads_connected');

    if (socialConnected) {
      toast.success(`${humanizePlatform(socialConnected)} berhasil terhubung ke workspace Zernio.`);
      if (!isDemo) void loadLiveData();
    }

    if (adsConnected) {
      toast.success(`${humanizePlatform(adsConnected)} berhasil diaktifkan lewat Zernio.`);
      if (!isDemo) void loadLiveData();
    }
  }, [location.search, isDemo]);

  const socialAccounts = useMemo(
    () => zernioAccounts.filter((account) => !isZernioAdsAccount(account.platform)),
    [zernioAccounts]
  );

  const adsAccounts = useMemo(
    () => zernioAccounts.filter((account) => isZernioAdsAccount(account.platform)),
    [zernioAccounts]
  );

  const waReady = Boolean(
    waConnector && (
      waConnector.status === 'connected'
      || waConnector.status === 'syncing'
      || waConnector.connectionRefMasked
      || waConnector.vendorWorkspaceUrl
    )
  );

  const getConnectedAccount = (platforms: string[]) => {
    const lowered = platforms.map((item) => item.toLowerCase());
    return zernioAccounts.find((account) => lowered.includes(account.platform.toLowerCase())) || null;
  };

  const handleSocialConnect = async (platform: string) => {
    setBusyPlatform(`social:${platform}`);
    try {
      const url = await getZernioConnectUrl(platform, '/medsos/connections');
      window.location.href = url;
    } catch (error) {
      console.error('Failed to start Zernio social connection', error);
      toast.error(`Gagal memulai koneksi ${humanizePlatform(platform)}.`);
      setBusyPlatform(null);
    }
  };

  const handleAdsConnect = async (platform: string) => {
    setBusyPlatform(`ads:${platform}`);
    try {
      const url = await getZernioAdsConnectUrl(platform, undefined, '/medsos/connections');
      window.location.href = url;
    } catch (error) {
      console.error('Failed to start Zernio ads connection', error);
      toast.error(`Gagal memulai koneksi ${humanizePlatform(platform)}.`);
      setBusyPlatform(null);
    }
  };

  const handleDisconnect = async (account: ZernioAccount) => {
    if (!window.confirm(`Putuskan ${account.displayName || account.username || account.platform} dari workspace ini?`)) {
      return;
    }

    try {
      await disconnectZernioAccount(account.id);
      toast.success(`${humanizePlatform(account.platform)} diputus dari workspace tenant.`);
      
      if (isDemo) {
        setZernioAccounts((current) => current.filter((item) => item.id !== account.id));
      } else {
        await loadLiveData();
      }
    } catch (error) {
      console.error('Failed to disconnect Zernio account', error);
      toast.error('Gagal memutuskan account Zernio.');
    }
  };

  const handleSaveWa = async () => {
    if (!crmForm.workspaceName.trim() || !crmForm.vendorWorkspaceUrl.trim()) {
      toast.error('Workspace name dan URL CRM wajib diisi.');
      return;
    }

    if (isDemo) {
      setWaConnector((current) => current ? {
        ...current,
        workspaceName: crmForm.workspaceName,
        vendorWorkspaceUrl: crmForm.vendorWorkspaceUrl,
        vendorWorkspaceEmail: crmForm.vendorWorkspaceEmail || null,
        operatorNotes: crmForm.notes || null,
        status: 'connected',
        statusLabel: 'Connected',
        connectionRefMasked: crmForm.connectionId ? 'api_••••demo' : current.connectionRefMasked,
      } : current);
      toast.success('Demo WA Inbox berhasil diperbarui.');
      return;
    }

    try {
      setSavingWa(true);
      const updated = await completeMyCommerSocialConnect('social-hub', {
        connectionId: crmForm.connectionId || undefined,
        workspaceName: crmForm.workspaceName,
        vendorWorkspaceUrl: crmForm.vendorWorkspaceUrl,
        vendorWorkspaceEmail: crmForm.vendorWorkspaceEmail || undefined,
        notes: crmForm.notes || undefined,
        subscriptionPlan: 'custom',
        subscriptionStatus: 'active',
        selectedAssets: [{ id: 'whatsapp', label: 'WhatsApp Inbox', kind: 'whatsapp', status: 'connected' }],
      });
      setWaConnector(updated);
      toast.success('WA Inbox berhasil disimpan.');
      await loadLiveData();
    } catch (error) {
      console.error('Failed to save WA CRM settings', error);
      toast.error('Gagal menyimpan konfigurasi WA Inbox.');
    } finally {
      setSavingWa(false);
    }
  };

  const badgeTone = isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-700';

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-blue-100 bg-white shadow-sm'}`}>
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div className="max-w-4xl">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4 ${isDark ? 'bg-blue-500/15 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
              <Sparkles size={14} />
              Channel activation
            </div>
            <div className="flex items-center gap-3 mb-3">
              <MyCommerSocialLogo size={46} className="shadow-lg shadow-blue-500/25" />
              <div>
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Connections</h1>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Hubungkan WA Inbox, social media, dan ads dari satu workspace operasional.
                </p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 min-w-[280px]">
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>WA Inbox</p>
              <p className="mt-2 text-2xl font-bold">{waReady ? 'Ready' : 'Setup'}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Customer Service CRM untuk WhatsApp</p>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Zernio Profile</p>
              <p className="mt-2 text-2xl font-bold">{zernioLoading ? '...' : 'Ready'}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Workspace social dan ads siap dipakai</p>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Social connected</p>
              <p className="mt-2 text-2xl font-bold">{zernioLoading ? '...' : socialAccounts.length}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Akun organik yang aktif di workspace ini</p>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ads connected</p>
              <p className="mt-2 text-2xl font-bold">{zernioLoading ? '...' : adsAccounts.length}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Meta, Google, LinkedIn, TikTok, Pinterest, X</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-4 gap-4">
        {stepCards.map((step) => (
          <div key={step.title} className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
            <p className="font-semibold text-blue-500">{step.title}</p>
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{step.description}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3 ${isDark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-100 text-violet-700'}`}>
              <PlugZap size={14} />
              Zernio workspace
            </div>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Social + Ads tenant dipusatkan ke Zernio</h2>
            <p className={`text-sm mt-2 max-w-3xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Semua koneksi social media dan ads dikelola melalui workspace Zernio yang terhubung ke akun bisnis ini.
            </p>
          </div>
          <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-blue-50 text-blue-700'}`}>
            <p className="text-xs uppercase tracking-[0.18em]">Workspace</p>
            <p className="text-sm font-semibold mt-1">1 bisnis, 1 pusat koneksi</p>
          </div>
        </div>

        <div className="grid xl:grid-cols-2 gap-6">
          <section className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-bold text-lg">Social channels</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Posting, analytics, dan publishing akun sosial tenant.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone}`}>{socialAccounts.length} connected</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {zernioSocialPlatforms.map((platform) => {
                const account = getConnectedAccount(platform.accountPlatforms);
                const busy = busyPlatform === `social:${platform.connectPlatform}`;

                return (
                  <div key={platform.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-white bg-white shadow-sm'}`}>
                    <div className="flex items-start gap-3">
                      <PlatformBadge label={platform.label} brand={platform.brand} size={42} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{platform.label}</p>
                          {platform.soon ? (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700">Coming soon</span>
                          ) : account ? (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700">Connected</span>
                          ) : (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700">Not connected</span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{platform.hint}</p>
                        {account ? (
                          <p className={`text-xs mt-2 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                            {account.displayName || account.username || humanizePlatform(account.platform)}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {account ? (
                        <button
                          type="button"
                          onClick={() => handleDisconnect(account)}
                          className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isDark ? 'bg-slate-900 text-rose-300 hover:bg-rose-950/40' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
                        >
                          <Unplug size={15} />
                          Disconnect
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!platform.connectPlatform || platform.soon || busy}
                          onClick={() => platform.connectPlatform && handleSocialConnect(platform.connectPlatform)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-bold text-lg">Ads channels</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Semua ad network diarahkan ke Zernio agar tidak ada connector ads lain yang membingungkan.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone}`}>{adsAccounts.length} connected</span>
            </div>

            <div className="space-y-3">
              {zernioAdsPlatforms.map((platform) => {
                const account = getConnectedAccount(platform.accountPlatforms);
                const busy = busyPlatform === `ads:${platform.connectPlatform}`;

                return (
                  <div key={platform.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-white bg-white shadow-sm'}`}>
                    <div className="flex items-start gap-3">
                      <PlatformBadge label={platform.label} brand={platform.brand} size={44} tone="bg-slate-100 text-slate-700" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{platform.label}</p>
                          {account ? (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700">Connected</span>
                          ) : (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700">Needs setup</span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{platform.hint}</p>
                        {platform.requirement ? (
                          <p className={`text-xs mt-2 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{platform.requirement}</p>
                        ) : null}
                        {account ? (
                          <p className={`text-xs mt-2 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                            {account.displayName || account.username || humanizePlatform(account.platform)}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {account ? (
                        <button
                          type="button"
                          onClick={() => handleDisconnect(account)}
                          className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isDark ? 'bg-slate-900 text-rose-300 hover:bg-rose-950/40' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
                        >
                          <Unplug size={15} />
                          Disconnect
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!platform.connectPlatform || busy}
                          onClick={() => platform.connectPlatform && handleAdsConnect(platform.connectPlatform)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
                          Connect ads
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className={`rounded-2xl border p-5 mt-6 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-blue-100 bg-blue-50'}`}>
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-blue-500 mt-0.5" size={18} />
            <div>
              <p className="font-semibold">Yang diatur MyCommerSocial untuk user baru</p>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-blue-900'}`}>
                Pengguna cukup memilih channel yang ingin diaktifkan. Setup koneksi dan sinkronisasi ditangani oleh sistem.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <section className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3 ${isDark ? 'bg-emerald-500/15 text-emerald-200' : 'bg-emerald-100 text-emerald-700'}`}>
                <MessageSquareText size={14} />
                WA Inbox via produk internal
              </div>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>WA Inbox menggunakan Customer Service CRM</h2>
              <p className={`text-sm mt-2 max-w-3xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Simpan URL instance dan credential workspace agar inbox WhatsApp bisa dipantau dari panel ini.
              </p>
            </div>
            <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
              <p className="text-xs uppercase tracking-[0.18em]">Status</p>
              <p className="font-semibold text-sm mt-1">{waReady ? 'Connected ke workspace CRM' : 'Belum dikonfigurasi'}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Workspace name</span>
              <input
                value={crmForm.workspaceName}
                onChange={(event) => setCrmForm((current) => ({ ...current, workspaceName: event.target.value }))}
                placeholder="Contoh: Tepat Laser Support Desk"
                className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'}`}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Workspace email</span>
              <input
                value={crmForm.vendorWorkspaceEmail}
                onChange={(event) => setCrmForm((current) => ({ ...current, vendorWorkspaceEmail: event.target.value }))}
                placeholder="ops@brandanda.com"
                className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'}`}
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold">URL instance CRM</span>
              <input
                value={crmForm.vendorWorkspaceUrl}
                onChange={(event) => setCrmForm((current) => ({ ...current, vendorWorkspaceUrl: event.target.value }))}
                placeholder="https://crm.domainanda.com"
                className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'}`}
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold">API key / connection reference</span>
              <input
                value={crmForm.connectionId}
                onChange={(event) => setCrmForm((current) => ({ ...current, connectionId: event.target.value }))}
                placeholder="API key tenant dari Customer Service CRM"
                className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'}`}
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold">Catatan operator</span>
              <textarea
                value={crmForm.notes}
                onChange={(event) => setCrmForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Catatan internal untuk operator, misalnya nomor live, PIC, atau rule eskalasi"
                rows={4}
                className={`w-full rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'}`}
              />
            </label>
          </div>

          <div className={`rounded-2xl border p-4 mt-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Current workspace</p>
                <p className="font-semibold mt-1">{waConnector?.workspaceName || 'Belum diset'}</p>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Last updated</p>
                <p className="font-semibold mt-1">{toLocalDate(waConnector?.updatedAt)}</p>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Reference</p>
                <p className="font-semibold mt-1">{waConnector?.connectionRefMasked || 'Belum ada'}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mt-6">
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Billing WA tetap custom sesuai produk internal. Dashboard fee MyCommerSocial terpisah dari biaya operasional WA CRM.
            </div>
            <div className="flex gap-3">
              {waConnector?.vendorWorkspaceUrl ? (
                <a
                  href={waConnector.vendorWorkspaceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${isDark ? 'border-slate-700 bg-slate-900 text-white hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  <ExternalLink size={16} />
                  Buka CRM
                </a>
              ) : null}
              <button
                type="button"
                onClick={handleSaveWa}
                disabled={savingWa || loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingWa ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                Simpan WA setup
              </button>
            </div>
          </div>
        </section>

        <section className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3 ${isDark ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-100 text-amber-700'}`}>
                <ShoppingBag size={14} />
                Marketplace
              </div>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Marketplace segera hadir</h2>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Integrasi marketplace sedang disiapkan. Untuk saat ini fokus utama ada pada WA Inbox, social media, dan ads.
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>Coming soon</span>
          </div>

          <div className="space-y-3 mb-6">
            {[
              'Shopee dan Tokopedia akan tersedia di modul marketplace terpisah.',
              'Order queue, buyer chat, katalog, dan sinkronisasi stok akan muncul di halaman ini saat integrasi siap.',
              'Workspace yang sudah aktif sekarang tetap bisa dipakai tanpa menunggu modul marketplace selesai.',
            ].map((item) => (
              <div key={item} className={`rounded-2xl border p-4 text-sm ${isDark ? 'border-slate-700 bg-slate-900/40 text-gray-300' : 'border-gray-100 bg-gray-50 text-gray-600'}`}>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5" />
                  <span>{item}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-blue-100 bg-blue-50'}`}>
            <div className="flex items-start gap-3">
              <Workflow size={18} className="text-blue-500 mt-0.5" />
              <div>
                <p className="font-semibold">Activation checklist</p>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-blue-900'}`}>
                  Lengkapi WA Inbox dan hubungkan workspace Zernio untuk mulai memakai inbox, planner, analytics, dan ads workspace.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
