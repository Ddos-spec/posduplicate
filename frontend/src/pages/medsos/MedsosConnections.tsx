import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useThemeStore } from '../../store/themeStore';
import MyCommerSocialLogo from '../../components/medsos/MyCommerSocialLogo';
import { PlatformBadge } from '../../components/medsos/PlatformBadge';
import FieldHelp from '../../components/medsos/FieldHelp';
import {
  completeMyCommerSocialConnect,
  disconnectMyCommerSocialIntegration,
  getMyCommerSocialIntegrationHub,
  syncMyCommerSocialIntegration,
  type ManagedIntegrationConnector,
} from '../../services/myCommerSocialIntegrations';
import {
  getMarketplaceHubStatus,
  disconnectZernioAccount,
  type MarketplaceHubConnectionStatus,
  getWACrmStatus,
  getZernioAccounts,
  getZernioAdsConnectUrl,
  getZernioConnectUrl,
  type WACrmConnectionStatus,
  type ZernioAccount,
} from '../../services/medsosPostsService';
import { isZernioAdsAccount, zernioAdsPlatforms, zernioSocialPlatforms } from '../../data/zernioCatalog';
import {
  BadgeCheck,
  ExternalLink,
  Link2,
  Loader2,
  MessageSquareText,
  PlugZap,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Bot,
  RefreshCcw,
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

type MarketplaceFormState = {
  workspaceName: string;
  notes: string;
};

const demoWaConnector = {
  id: 1,
  slug: 'social-hub',
  integrationType: 'managed_social_hub',
  name: 'WA Inbox',
  workspaceName: 'Tepat Laser Support Desk',
  category: 'social',
  description: 'Workspace chat internal menangani inbox WhatsApp, routing agent, dan lead tracking.',
  providerName: 'In-house Inbox',
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
  vendorPortalLabel: 'Buka inbox',
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

const demoMarketplaceConnector = {
  id: 2,
  slug: 'marketplace-hub',
  integrationType: 'managed_marketplace_hub',
  name: 'Marketplace Chat Hub',
  workspaceName: 'Tepat Laser Marketplace',
  category: 'marketplace',
  description: 'Marketplace chat engine untuk Shopee, Lazada, Tokopedia, dan TikTok Shop.',
  providerName: 'Marketplace Chat Engine',
  providerKey: 'marketplace_chat_engine',
  status: 'connected',
  statusLabel: 'Connected',
  isActive: true,
  healthScore: 94,
  supportedChannels: [
    { brand: 'shopee', label: 'Shopee Chat' },
    { brand: 'lazada', label: 'Lazada Chat' },
    { brand: 'tokopedia', label: 'Tokopedia / TikTok Shop Chat' },
  ],
  capabilities: ['marketplace chat sync', 'AI auto-reply bridge', 'agent handover'],
  billingNote: 'Marketplace chat engine dikelola di belakang layar dan diteruskan ke AI workflow.',
  dashboardFeeNote: 'Dashboard fee terpisah dari biaya operasional engine chat.',
  pricingSummary: null,
  recommendedPlan: 'workspace bundle',
  selectedAssets: [
    { id: 'shopee-chat', label: 'Shopee Chat', kind: 'marketplace_chat', status: 'connected' },
    { id: 'tokopedia-chat', label: 'Tokopedia / TikTok Shop Chat', kind: 'marketplace_chat', status: 'connected' },
  ],
  setupChecklist: [],
  requiredUserActions: [],
  nextActions: [],
  launchMode: 'manual_reference',
  launchUrlConfigured: false,
  vendorPortalUrl: null,
  vendorPortalLabel: null,
  pricingUrl: null,
  docsUrl: null,
  supportUrl: null,
  callbackUrl: '',
  webhookUrl: 'https://api.example.com/api/medsos/integrations/webhook/marketplace-hub?tenant_id=1&token=demo',
  operatorNotes: 'Demo workspace untuk marketplace AI.',
  vendorWorkspaceUrl: null,
  vendorWorkspaceEmail: 'marketplace@tepatlaser.com',
  subscriptionPlan: 'workspace bundle',
  subscriptionStatus: 'active',
  renewalDate: null,
  billingOwnerName: 'Marketplace Team',
  lastSyncAt: new Date().toISOString(),
  connectedAt: new Date().toISOString(),
  connectionRefMasked: 'app_••••demo',
  launchSession: null,
  lastError: null,
  lastWebhookEvent: {
    receivedAt: new Date().toISOString(),
    eventType: 'new_comment',
  },
  updatedAt: new Date().toISOString(),
  customerPaysDirectly: false,
  dashboardFee: {
    currency: 'IDR',
    amount: 300000,
    label: 'Rp300.000 / bulan',
    description: 'Biaya command center.',
  },
} as ManagedIntegrationConnector;

const demoMarketplaceStatus: MarketplaceHubConnectionStatus = {
  configured: true,
  active: true,
  hasAppId: true,
  hasSecretKey: true,
  hasBotSenderEmail: true,
  hasAiWebhook: true,
  reachable: true,
  checkedAt: new Date().toISOString(),
  status: 'reachable',
  message: '3 channel marketplace chat terdeteksi.',
  workspaceName: 'Tepat Laser Marketplace',
  appIdMasked: 'app_••••demo',
  botSenderEmail: 'bot@tepatlaser.id',
  aiWebhookUrl: 'https://automation.example.com/webhook/marketplace-ai',
  webhookUrl: 'https://api.example.com/api/medsos/integrations/webhook/marketplace-hub?tenant_id=1&token=demo',
  channels: [
    { id: '1', name: 'Shopee Chat', source: 'shopee' },
    { id: '2', name: 'Lazada Chat', source: 'lazada' },
    { id: '3', name: 'Tokopedia / TikTok Shop Chat', source: 'tokopedia' },
  ],
};

const emptyCrmForm: CrmFormState = {
  workspaceName: '',
  vendorWorkspaceUrl: '',
  connectionId: '',
  vendorWorkspaceEmail: '',
  notes: '',
};

const emptyMarketplaceForm: MarketplaceFormState = {
  workspaceName: '',
  notes: '',
};

const stepCards = [
  {
    title: '1. Buat workspace',
    description: 'Workspace bisnis dibuat seperti biasa dan siap dipakai untuk WA Inbox, marketplace chat, social media, dan ads.',
  },
  {
    title: '2. Lengkapi WA Inbox',
    description: 'Masukkan API key workspace inbox untuk mengaktifkan operasional WhatsApp.',
  },
  {
    title: '3. Aktifkan marketplace chat',
    description: 'Simpan permintaan aktivasi marketplace chat agar tim onboarding bisa menyalakan AI dan koneksi channel.',
  },
  {
    title: '4. Aktifkan ads',
    description: 'Hubungkan social media dan ads melalui workspace terpusat agar semua channel non-marketplace tetap ada di satu panel.',
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
  const [waStatus, setWaStatus] = useState<WACrmConnectionStatus | null>(null);
  const [savingMarketplace, setSavingMarketplace] = useState(false);
  const [syncingMarketplace, setSyncingMarketplace] = useState(false);
  const [marketplaceConnector, setMarketplaceConnector] = useState<ManagedIntegrationConnector | null>(isDemo ? demoMarketplaceConnector : null);
  const [marketplaceStatus, setMarketplaceStatus] = useState<MarketplaceHubConnectionStatus | null>(isDemo ? demoMarketplaceStatus : null);
  const [crmForm, setCrmForm] = useState<CrmFormState>(() => (
    isDemo
      ? {
          ...emptyCrmForm,
          workspaceName: demoWaConnector.workspaceName || '',
          vendorWorkspaceUrl: demoWaConnector.vendorWorkspaceUrl || '',
          vendorWorkspaceEmail: demoWaConnector.vendorWorkspaceEmail || '',
          notes: demoWaConnector.operatorNotes || '',
        }
      : { ...emptyCrmForm }
  ));
  const [marketplaceForm, setMarketplaceForm] = useState<MarketplaceFormState>(() => (
    isDemo
      ? {
          ...emptyMarketplaceForm,
          workspaceName: demoMarketplaceConnector.workspaceName || '',
          notes: demoMarketplaceConnector.operatorNotes || '',
        }
      : { ...emptyMarketplaceForm }
  ));
  const [zernioAccounts, setZernioAccounts] = useState<ZernioAccount[]>(isDemo ? demoZernioAccounts : []);
  const [zernioLoading, setZernioLoading] = useState(!isDemo);
  const [busyPlatform, setBusyPlatform] = useState<string | null>(null);
  const [showWaKeyEditor, setShowWaKeyEditor] = useState(isDemo);

  const loadLiveData = async () => {
    setLoading(true);
    setZernioLoading(true);
    try {
      const [hub, accounts] = await Promise.all([
        getMyCommerSocialIntegrationHub(),
        getZernioAccounts(),
      ]);
      const socialHub = hub.connectors.find((connector) => connector.slug === 'social-hub') || null;
      const marketplaceHub = hub.connectors.find((connector) => connector.slug === 'marketplace-hub') || null;
      setWaConnector(socialHub);
      setMarketplaceConnector(marketplaceHub);
      setZernioAccounts(accounts);
      try {
        const [status, marketplaceProbe] = await Promise.all([
          getWACrmStatus(),
          getMarketplaceHubStatus(),
        ]);
        setWaStatus(status);
        setMarketplaceStatus(marketplaceProbe);
      } catch (statusError) {
        console.error('Failed to load live connector status', statusError);
        setWaStatus(null);
        setMarketplaceStatus(null);
      }
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
      vendorWorkspaceUrl: current.vendorWorkspaceUrl || waConnector.vendorWorkspaceUrl || waConnector.vendorPortalUrl || '',
      vendorWorkspaceEmail: current.vendorWorkspaceEmail || waConnector.vendorWorkspaceEmail || '',
      notes: current.notes || waConnector.operatorNotes || '',
    }));
  }, [waConnector]);

  useEffect(() => {
    if (!marketplaceConnector && !marketplaceStatus) return;
    setMarketplaceForm((current) => ({
      ...current,
      workspaceName: current.workspaceName || marketplaceConnector?.workspaceName || marketplaceStatus?.workspaceName || '',
      notes: current.notes || marketplaceConnector?.operatorNotes || '',
    }));
  }, [marketplaceConnector, marketplaceStatus]);

  useEffect(() => {
    if (!waConnector) return;
    setShowWaKeyEditor(!waConnector.connectionRefMasked);
  }, [waConnector]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const socialConnected = params.get('channel_connected');
    const adsConnected = params.get('ads_connected');

    if (socialConnected) {
      toast.success(`${humanizePlatform(socialConnected)} berhasil terhubung ke workspace social.`);
      if (!isDemo) void loadLiveData();
    }

    if (adsConnected) {
      toast.success(`${humanizePlatform(adsConnected)} berhasil diaktifkan di workspace ads.`);
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
      || waConnector.vendorPortalUrl
    )
  );
  const waState = useMemo(() => {
    if (isDemo) {
      return { card: 'Ready', label: 'Connected ke workspace inbox', helper: 'Demo workspace aktif' };
    }
    if (waStatus?.reachable) {
      return { card: 'Ready', label: 'Connected ke workspace inbox', helper: 'Workspace inbox merespons dan siap dipakai' };
    }
    if (waStatus?.configured) {
      return { card: 'Check', label: 'Perlu dicek', helper: waStatus.message || 'Konfigurasi WA ada, tetapi layanan inbox belum merespons' };
    }
    if (waReady) {
      return { card: 'Saved', label: 'Tersimpan', helper: 'API key sudah ada, menunggu validasi live' };
    }
    return { card: 'Setup', label: 'Belum dikonfigurasi', helper: 'Simpan API key workspace untuk menyalakan WA Inbox' };
  }, [isDemo, waStatus, waReady]);
  const waOpenUrl = waConnector?.vendorPortalUrl || waConnector?.vendorWorkspaceUrl || null;

  const marketplaceState = useMemo(() => {
    if (isDemo) {
      return { card: 'Ready', label: 'Marketplace AI live', helper: 'Marketplace chat engine aktif' };
    }
    if (marketplaceStatus?.reachable) {
      return {
        card: 'Ready',
        label: 'Marketplace AI live',
        helper: marketplaceStatus.message || 'Marketplace chat engine merespons dan channel terdeteksi',
      };
    }
    if (marketplaceStatus?.configured) {
      return {
        card: 'Check',
        label: 'Perlu validasi',
        helper: marketplaceStatus.message || 'Kredensial tersimpan, tetapi marketplace engine belum merespons',
      };
    }
    if (marketplaceConnector?.connectionRefMasked || marketplaceConnector?.workspaceName) {
      return {
        card: 'Saved',
        label: 'Draft tersimpan',
        helper: 'Konfigurasi marketplace sudah tersimpan, tinggal dilengkapi atau dicek ulang',
      };
    }
    return {
      card: 'Setup',
      label: 'Belum dikonfigurasi',
      helper: 'Simpan permintaan aktivasi untuk marketplace chat dan AI',
    };
  }, [isDemo, marketplaceStatus, marketplaceConnector]);

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
      console.error('Failed to start social connection', error);
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
      console.error('Failed to start ads connection', error);
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
      console.error('Failed to disconnect account', error);
      toast.error('Gagal memutuskan account social atau ads.');
    }
  };

  const handleSaveWa = async () => {
    const workspaceName = crmForm.workspaceName.trim() || waConnector?.workspaceName || 'WA Inbox';
    const connectionId = crmForm.connectionId.trim();
    const vendorWorkspaceUrl = crmForm.vendorWorkspaceUrl.trim() || waConnector?.vendorWorkspaceUrl || waConnector?.vendorPortalUrl || '';
    const hasExistingConnection = Boolean(waConnector?.connectionRefMasked);

    if (!connectionId && !hasExistingConnection) {
      toast.error('API key / connection reference wajib diisi.');
      return;
    }

    if (isDemo) {
      setWaConnector((current) => current ? {
        ...current,
        workspaceName,
        vendorWorkspaceUrl,
        vendorWorkspaceEmail: crmForm.vendorWorkspaceEmail || null,
        operatorNotes: crmForm.notes || null,
        status: 'connected',
        statusLabel: 'Connected',
        connectionRefMasked: 'api_••••demo',
      } : current);
      setCrmForm((current) => ({
        ...current,
        workspaceName,
        vendorWorkspaceUrl,
        connectionId: '',
      }));
      setShowWaKeyEditor(false);
      toast.success('Demo WA Inbox berhasil diperbarui.');
      return;
    }

    try {
      setSavingWa(true);
      const updated = await completeMyCommerSocialConnect('social-hub', {
        connectionId: connectionId || undefined,
        workspaceName,
        vendorWorkspaceUrl: vendorWorkspaceUrl || undefined,
        vendorWorkspaceEmail: crmForm.vendorWorkspaceEmail || undefined,
        notes: crmForm.notes || undefined,
        subscriptionPlan: 'custom',
        subscriptionStatus: 'active',
        selectedAssets: [{ id: 'whatsapp', label: 'WhatsApp Inbox', kind: 'whatsapp', status: 'connected' }],
      });
      setWaConnector(updated);
      setCrmForm((current) => ({
        ...current,
        workspaceName,
        vendorWorkspaceUrl,
        connectionId: '',
      }));
      setShowWaKeyEditor(false);
      toast.success('WA Inbox berhasil disimpan.');
      await loadLiveData();
    } catch (error) {
      console.error('Failed to save WA inbox settings', error);
      toast.error('Gagal menyimpan konfigurasi WA Inbox.');
    } finally {
      setSavingWa(false);
    }
  };

  const handleSaveMarketplace = async () => {
    const workspaceName = marketplaceForm.workspaceName.trim() || marketplaceConnector?.workspaceName || 'Marketplace Chat Hub';
    if (!workspaceName) {
      toast.error('Nama workspace marketplace wajib diisi.');
      return;
    }

    if (isDemo) {
      setMarketplaceConnector((current) => current ? {
        ...current,
        workspaceName,
        operatorNotes: marketplaceForm.notes || null,
        connectionRefMasked: 'app_••••demo',
        status: 'connected',
        statusLabel: 'Connected',
      } : current);
      setMarketplaceStatus((current) => current ? {
        ...current,
        configured: true,
        hasAppId: current.hasAppId,
        hasSecretKey: current.hasSecretKey,
        hasBotSenderEmail: current.hasBotSenderEmail,
        hasAiWebhook: current.hasAiWebhook,
        reachable: true,
        status: 'reachable',
        message: '3 channel marketplace chat terdeteksi.',
        workspaceName,
        botSenderEmail: current.botSenderEmail,
        aiWebhookUrl: current.aiWebhookUrl,
      } : current);
      setMarketplaceForm((current) => ({
        ...current,
        workspaceName,
      }));
      toast.success('Demo marketplace chat berhasil diperbarui.');
      return;
    }

    try {
      setSavingMarketplace(true);
      const updated = await completeMyCommerSocialConnect('marketplace-hub', {
        workspaceName,
        notes: marketplaceForm.notes.trim() || undefined,
        selectedAssets: [
          { id: 'shopee-chat', label: 'Shopee Chat', kind: 'marketplace_chat', status: 'connected' },
          { id: 'lazada-chat', label: 'Lazada Chat', kind: 'marketplace_chat', status: 'connected' },
          { id: 'tokopedia-tiktok-chat', label: 'Tokopedia / TikTok Shop Chat', kind: 'marketplace_chat', status: 'connected' },
        ],
      });
      setMarketplaceConnector(updated);
      setMarketplaceForm((current) => ({
        ...current,
        workspaceName,
      }));
      toast.success('Permintaan aktivasi marketplace chat berhasil disimpan.');
      await loadLiveData();
    } catch (error) {
      console.error('Failed to save marketplace chat settings', error);
      toast.error('Gagal menyimpan konfigurasi marketplace chat.');
    } finally {
      setSavingMarketplace(false);
    }
  };

  const handleSyncMarketplace = async () => {
    if (isDemo) {
      toast.success('Demo marketplace chat sudah sinkron.');
      return;
    }

    try {
      setSyncingMarketplace(true);
      await syncMyCommerSocialIntegration('marketplace-hub');
      await loadLiveData();
      toast.success('Status marketplace chat berhasil diperbarui.');
    } catch (error) {
      console.error('Failed to refresh marketplace chat status', error);
      toast.error('Gagal memperbarui status marketplace chat.');
    } finally {
      setSyncingMarketplace(false);
    }
  };

  const handleDisconnectMarketplace = async () => {
    if (!window.confirm('Putuskan konfigurasi marketplace chat dari workspace ini?')) {
      return;
    }

    if (isDemo) {
      setMarketplaceConnector(null);
      setMarketplaceStatus(null);
      setMarketplaceForm({ ...emptyMarketplaceForm });
      toast.success('Demo marketplace chat diputus.');
      return;
    }

    try {
      setSyncingMarketplace(true);
      await disconnectMyCommerSocialIntegration('marketplace-hub');
      setMarketplaceForm({ ...emptyMarketplaceForm });
      await loadLiveData();
      toast.success('Marketplace chat berhasil diputus.');
    } catch (error) {
      console.error('Failed to disconnect marketplace chat', error);
      toast.error('Gagal memutuskan marketplace chat.');
    } finally {
      setSyncingMarketplace(false);
    }
  };

  const badgeTone = isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-700';

  return (
    <div className="space-y-6">
      <div className={`rounded-[32px] p-6 md:p-8 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'border-blue-100 bg-white shadow-sm'}`}>
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          <div className="max-w-4xl">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4 ${isDark ? 'bg-blue-500/15 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
              <Sparkles size={14} />
              Channel activation
            </div>
            <div className="flex items-center gap-3 mb-3">
              <MyCommerSocialLogo size={46} className="shadow-lg shadow-blue-500/25" />
              <div>
                <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Connections</h1>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Hubungkan WA Inbox, marketplace chat engine, social media, dan ads dari satu workspace operasional.
                </p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 min-w-[280px]">
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>WA Inbox</p>
              <p className="mt-2 text-xl md:text-2xl font-bold tracking-tight">{waState.card}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{waState.helper}</p>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Marketplace AI</p>
              <p className="mt-2 text-xl md:text-2xl font-bold tracking-tight">{marketplaceState.card}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{marketplaceState.helper}</p>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Social connected</p>
              <p className="mt-2 text-xl md:text-2xl font-bold tracking-tight">{zernioLoading ? '...' : socialAccounts.length}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Akun organik yang aktif di workspace ini</p>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ads connected</p>
              <p className="mt-2 text-xl md:text-2xl font-bold tracking-tight">{zernioLoading ? '...' : adsAccounts.length}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Meta, Google, LinkedIn, TikTok, Pinterest, X</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-4 gap-4">
        {stepCards.map((step) => (
          <div key={step.title} className={`rounded-[24px] p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
            <p className="font-semibold text-blue-500">{step.title}</p>
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{step.description}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-[32px] p-6 md:p-8 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3 ${isDark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-100 text-violet-700'}`}>
              <PlugZap size={14} />
              Social + ads workspace
            </div>
            <h2 className={`text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Social + Ads dipusatkan ke satu workspace</h2>
            <p className={`text-sm mt-2 max-w-3xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Semua koneksi social media dan ads dikelola melalui satu workspace terpusat agar reporting, planner, dan aktivasi channel tidak terpecah.
            </p>
          </div>
          <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-blue-50 text-blue-700'}`}>
            <p className="text-xs uppercase tracking-[0.18em]">Workspace</p>
            <p className="text-sm font-semibold mt-1">1 bisnis, 1 pusat koneksi</p>
          </div>
        </div>

        <div className="grid xl:grid-cols-2 gap-6">
          <section className={`rounded-[24px] p-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
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
                  <div key={platform.id} className={`rounded-[24px] p-4 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'border-white bg-white shadow-sm'}`}>
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
                          title={`Putuskan ${platform.label} dari workspace`}
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
                          title={`Hubungkan ${platform.label} ke workspace`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60"
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

          <section className={`rounded-[24px] p-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-bold text-lg">Ads channels</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Semua ad network diarahkan ke workspace ads yang sama agar tim cukup memantau dari satu panel.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone}`}>{adsAccounts.length} connected</span>
            </div>

            <div className="space-y-3">
              {zernioAdsPlatforms.map((platform) => {
                const account = getConnectedAccount(platform.accountPlatforms);
                const busy = busyPlatform === `ads:${platform.connectPlatform}`;

                return (
                  <div key={platform.id} className={`rounded-[24px] p-4 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'border-white bg-white shadow-sm'}`}>
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
                          title={`Putuskan ${platform.label} dari workspace`}
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
                          title={`Hubungkan ${platform.label} ke workspace`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60"
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

        <div className={`rounded-[24px] p-5 mt-6 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-blue-100 bg-blue-50'}`}>
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-blue-500 mt-0.5" size={18} />
            <div>
              <p className="font-semibold">Yang diatur MyCommerSocial untuk user baru</p>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-blue-900'}`}>
                Pengguna cukup memilih channel yang ingin diaktifkan. Setup koneksi dan sinkronisasi ditangani oleh sistem di belakang layar.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <section className={`rounded-[32px] p-6 md:p-8 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3 ${isDark ? 'bg-emerald-500/15 text-emerald-200' : 'bg-emerald-100 text-emerald-700'}`}>
                <MessageSquareText size={14} />
                WA Inbox
              </div>
              <h2 className={`text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>WA Inbox diaktifkan lewat workspace chat internal</h2>
              <p className={`text-sm mt-2 max-w-3xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Masukkan API key workspace agar inbox WhatsApp bisa dipantau dari panel ini. Alamat workspace chat diambil otomatis dari konfigurasi sistem.
              </p>
            </div>
            <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
              <p className="text-xs uppercase tracking-[0.18em]">Status</p>
              <p className="font-semibold text-sm mt-1">{waState.label}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Workspace name
                <FieldHelp title="Workspace name" description="Nama workspace WA yang akan tampil di dashboard. Biasanya mengikuti nama brand atau tim support." />
              </span>
              <input
                value={crmForm.workspaceName}
                onChange={(event) => setCrmForm((current) => ({ ...current, workspaceName: event.target.value }))}
                placeholder="Contoh: Tepat Laser Support Desk"
                className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'bg-white ring-1 ring-slate-900/5 text-gray-900 placeholder:text-gray-400'}`}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Workspace email
                <FieldHelp title="Workspace email" description="Email operasional untuk workspace WA. Gunakan email admin atau PIC yang mengelola inbox." />
              </span>
              <input
                value={crmForm.vendorWorkspaceEmail}
                onChange={(event) => setCrmForm((current) => ({ ...current, vendorWorkspaceEmail: event.target.value }))}
                placeholder="ops@brandanda.com"
                className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'bg-white ring-1 ring-slate-900/5 text-gray-900 placeholder:text-gray-400'}`}
              />
            </label>
            <div className={`md:col-span-2 rounded-[24px] p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-blue-50'}`}>
              <div className="flex items-start gap-3">
                <PlugZap size={18} className="text-blue-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold inline-flex items-center gap-2">
                    Akses inbox otomatis
                    <FieldHelp title="Akses workspace otomatis" description="Alamat workspace chat sudah diatur di sistem, jadi user tidak perlu mengisi URL secara manual." />
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-blue-900'}`}>
                    Cukup simpan API key workspace. Setelah itu tombol <strong>Buka inbox</strong> akan memakai alamat workspace yang sudah dikonfigurasi secara internal.
                  </p>
                </div>
              </div>
            </div>
            {showWaKeyEditor ? (
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold inline-flex items-center gap-2">
                  API key / connection reference
                  <FieldHelp title="API key / connection reference" description="Cukup isi API key atau connection reference workspace chat. Sistem akan memakai URL yang sudah dikonfigurasi." />
                </span>
                <input
                  value={crmForm.connectionId}
                  onChange={(event) => setCrmForm((current) => ({ ...current, connectionId: event.target.value }))}
                  placeholder="API key tenant untuk workspace chat"
                  className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'bg-white ring-1 ring-slate-900/5 text-gray-900 placeholder:text-gray-400'}`}
                />
              </label>
            ) : (
              <div className={`md:col-span-2 rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold inline-flex items-center gap-2">
                      API key tersimpan
                      <FieldHelp title="API key tersimpan" description="Untuk keamanan, nilai API key asli tidak ditampilkan kembali setelah halaman direfresh. Sistem hanya menampilkan reference yang sudah dimasking." />
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {waConnector?.connectionRefMasked || 'API key sudah tersimpan di sistem.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWaKeyEditor(true)}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold ${isDark ? 'bg-[#111318] ring-1 ring-white/10 text-white hover:bg-slate-700' : 'bg-white ring-1 ring-slate-900/5 text-gray-700 hover:bg-gray-50'}`}
                  >
                    Ganti API key
                  </button>
                </div>
              </div>
            )}
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Catatan operator
                <FieldHelp title="Catatan operator" description="Catatan internal seperti PIC, nomor utama, aturan eskalasi, atau informasi teknis lain untuk tim." />
              </span>
              <textarea
                value={crmForm.notes}
                onChange={(event) => setCrmForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Catatan internal untuk operator, misalnya nomor live, PIC, atau rule eskalasi"
                rows={4}
                className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'bg-white ring-1 ring-slate-900/5 text-gray-900 placeholder:text-gray-400'}`}
              />
            </label>
          </div>

          <div className={`rounded-[24px] p-4 mt-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
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
              Billing WA tetap custom sesuai paket operasional yang aktif. Dashboard fee MyCommerSocial terpisah dari biaya workspace chat.
            </div>
            <div className="flex gap-3">
              {waOpenUrl ? (
                <a
                  href={waOpenUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm font-semibold ${isDark ? 'border-slate-700 bg-slate-900 text-white hover:bg-slate-700' : 'bg-white ring-1 ring-slate-900/5 text-gray-700 hover:bg-gray-50'}`}
                >
                  <ExternalLink size={16} />
                  Buka inbox
                </a>
              ) : null}
              <button
                type="button"
                onClick={handleSaveWa}
                disabled={savingWa || loading || (!showWaKeyEditor && !waConnector?.connectionRefMasked)}
                title="Simpan konfigurasi workspace WA"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingWa ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                {showWaKeyEditor ? 'Simpan WA setup' : 'Simpan perubahan'}
              </button>
            </div>
          </div>
        </section>

        <section className={`rounded-[32px] p-6 md:p-8 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3 ${isDark ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-100 text-amber-700'}`}>
                <ShoppingBag size={14} />
                Marketplace chat + AI
              </div>
              <h2 className={`text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Marketplace chat diaktivasi oleh tim onboarding</h2>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Klien cukup memilih workspace dan marketplace yang ingin dipakai. Routing AI dan koneksi engine marketplace dikelola di belakang layar oleh tim aktivasi.
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>{marketplaceState.label}</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Workspace marketplace
                <FieldHelp title="Workspace marketplace" description="Nama workspace untuk operasional chat marketplace. Biasanya mengikuti nama brand utama atau nama bisnis yang mengelola semua toko." />
              </span>
              <input
                value={marketplaceForm.workspaceName}
                onChange={(event) => setMarketplaceForm((current) => ({ ...current, workspaceName: event.target.value }))}
                placeholder="Contoh: Tepat Laser Marketplace"
                className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'bg-white ring-1 ring-slate-900/5 text-gray-900 placeholder:text-gray-400'}`}
              />
            </label>

            <div className={`rounded-[24px] p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-blue-50'}`}>
              <div className="flex items-start gap-3">
                <Bot size={18} className="text-blue-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold inline-flex items-center gap-2">
                    Aktivasi AI dikelola otomatis
                    <FieldHelp title="Aktivasi AI" description="Koneksi chat marketplace, routing pesan ke AI, dan jalur balasan tidak perlu diurus oleh user. Semua aktivasi teknis ditangani oleh tim onboarding." />
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-blue-900'}`}>
                    Setelah workspace ini disimpan, tim aktivasi akan menyelesaikan koneksi marketplace dan AI tanpa meminta user mengisi pengaturan teknis tambahan.
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="text-sm font-semibold inline-flex items-center gap-2 mb-3">
                Channel yang diprioritaskan
                <FieldHelp title="Channel marketplace" description="Pilih marketplace yang ingin disatukan ke dashboard. Bila belum semua toko siap, aktivasi bisa dilakukan bertahap per channel." />
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { key: 'shopee', label: 'Shopee Chat', helper: 'Chat buyer dari toko Shopee yang sudah aktif.' },
                  { key: 'lazada', label: 'Lazada Chat', helper: 'Chat buyer dan pertanyaan order dari Lazada.' },
                  { key: 'tokopedia', label: 'Tokopedia Chat', helper: 'Inbox Tokopedia untuk toko yang sudah berjalan.' },
                  { key: 'tiktok', label: 'TikTok Shop Chat', helper: 'Chat pre-sales dan post-sales dari TikTok Shop.' },
                ].map((channel) => {
                  const isDetected = marketplaceStatus?.channels?.some((item) => item.source.toLowerCase().includes(channel.key));
                  return (
                    <div key={channel.key} className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-start gap-3">
                        <PlatformBadge
                          label={channel.label}
                          brand={channel.key === 'tiktok' ? 'tiktok' : channel.key === 'tokopedia' ? 'tokopedia' : channel.key === 'lazada' ? 'lazada' : 'shopee'}
                          size={42}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{channel.label}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDetected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {isDetected ? 'Aktif' : 'Siap diaktifkan'}
                            </span>
                          </div>
                          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{channel.helper}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Catatan aktivasi
                <FieldHelp title="Catatan aktivasi" description="Gunakan untuk mencatat toko prioritas, PIC, jam operasional, atau detail khusus yang perlu diketahui saat tim onboarding mengaktifkan marketplace chat." />
              </span>
              <textarea
                value={marketplaceForm.notes}
                onChange={(event) => setMarketplaceForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Contoh: prioritaskan Shopee utama dulu, AI hanya aktif di jam kerja, fallback ke human untuk komplain refund."
                rows={4}
                className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'bg-white ring-1 ring-slate-900/5 text-gray-900 placeholder:text-gray-400'}`}
              />
            </label>
          </div>

          <div className={`rounded-[24px] p-4 mt-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Current workspace</p>
                <p className="font-semibold mt-1">{marketplaceConnector?.workspaceName || marketplaceStatus?.workspaceName || 'Belum diset'}</p>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Detected channels</p>
                <p className="font-semibold mt-1">{marketplaceStatus?.channels?.length || 0}</p>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Last updated</p>
                <p className="font-semibold mt-1">{toLocalDate(marketplaceConnector?.updatedAt || marketplaceStatus?.checkedAt)}</p>
              </div>
            </div>
          </div>

          <div className={`rounded-[24px] p-5 mt-5 ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-blue-100 bg-blue-50'}`}>
            <div className="flex items-start gap-3">
              <Workflow size={18} className="text-blue-500 mt-0.5" />
              <div>
                <p className="font-semibold">Alur aktivasi</p>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-blue-900'}`}>
                  Simpan workspace marketplace terlebih dulu. Setelah itu tim onboarding akan menghubungkan toko yang sudah ada, menyalakan AI, lalu mengembalikan status koneksi ke dashboard ini.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mt-6">
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              User tidak perlu mengurus pengaturan teknis connector. Dashboard hanya menampilkan status aktivasi dan channel yang sudah siap dipakai.
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSyncMarketplace}
                disabled={syncingMarketplace}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm font-semibold ${isDark ? 'border-slate-700 bg-slate-900 text-white hover:bg-slate-700' : 'bg-white ring-1 ring-slate-900/5 text-gray-700 hover:bg-gray-50'} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {syncingMarketplace ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                Refresh status
              </button>
              {marketplaceConnector ? (
                <button
                  type="button"
                  onClick={handleDisconnectMarketplace}
                  disabled={syncingMarketplace}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm font-semibold ${isDark ? 'border-slate-700 bg-slate-900 text-rose-300 hover:bg-rose-950/40' : 'bg-white ring-1 ring-slate-900/5 text-rose-600 hover:bg-rose-50'} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <Unplug size={16} />
                  Putuskan setup
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleSaveMarketplace}
                disabled={savingMarketplace}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingMarketplace ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                {marketplaceConnector ? 'Simpan perubahan' : 'Simpan aktivasi'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
