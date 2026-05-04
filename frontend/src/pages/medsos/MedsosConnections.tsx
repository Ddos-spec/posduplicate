import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useThemeStore } from '../../store/themeStore';
import { BrandLogo } from '../../components/medsos/BrandLogo';
import {
  beginMyCommerSocialConnect,
  completeMyCommerSocialConnect,
  disconnectMyCommerSocialIntegration,
  getMyCommerSocialIntegrationHub,
  syncMyCommerSocialIntegration,
  type ManagedIntegrationAsset,
  type ManagedIntegrationBrand,
  type ManagedIntegrationConnector,
  type ManagedIntegrationHub,
  type ManagedIntegrationStatus,
} from '../../services/myCommerSocialIntegrations';
import {
  BadgeCheck,
  CircleAlert,
  ExternalLink,
  Link2,
  Loader2,
  PlugZap,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Unplug,
  Wallet,
  Workflow,
} from 'lucide-react';

type ModalState = {
  connector: ManagedIntegrationConnector;
  workspaceName: string;
  connectionId: string;
  notes: string;
  vendorWorkspaceUrl: string;
  vendorWorkspaceEmail: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  renewalDate: string;
  billingOwnerName: string;
  selectedBrands: ManagedIntegrationBrand[];
};

type PilotCheckpoint = {
  key: string;
  label: string;
  detail: string;
  done: boolean;
};

const demoHub: ManagedIntegrationHub = {
  billing: {
    dashboardFee: {
      currency: 'IDR',
      amount: 300000,
      label: 'Rp300.000 / bulan',
      description: 'Biaya dashboard orchestration, alert, analytics, dan workflow internal.',
    },
    customerPaysConnectorDirectly: true,
    architecture: 'third_party_orchestrated',
    promise: 'User cukup klik connect, login, pilih aset, lalu MyCommerSocial menjadi command center yang menampilkan semuanya.',
  },
  summary: {
    total: 3,
    connected: 2,
    pending: 1,
    actionRequired: 0,
    providerLinksConfigured: 3,
  },
  connectors: [
    {
      id: 1,
      slug: 'social-hub',
      integrationType: 'managed_social_hub',
      name: 'WA Inbox',
      workspaceName: 'Ares WA Inbox',
      category: 'social',
      description: 'WA CRM menangani inbox WhatsApp, lead tracking, dan blast campaign sehingga tim cukup connect sekali lalu semua chat masuk ke satu dashboard.',
      providerName: 'WA CRM',
      providerKey: 'wa_crm',
      status: 'connected',
      statusLabel: 'Connected',
      isActive: true,
      healthScore: 93,
      supportedChannels: [
        { brand: 'instagram', label: 'Instagram Business' },
        { brand: 'facebook', label: 'Facebook Page' },
        { brand: 'tiktok', label: 'TikTok Business' },
        { brand: 'youtube', label: 'YouTube Channel' },
      ],
      capabilities: ['unified inbox', 'comment + DM sync', 'content publish', 'approval workflow', 'analytics pull'],
      billingNote: 'Biaya hosting CRM ditanggung sendiri. MyCommerSocial hanya menjadi command center dan routing layer.',
      dashboardFeeNote: 'Rp300.000 / bulan untuk dashboard orchestration.',
      pricingSummary: undefined,
      recommendedPlan: undefined,
      selectedAssets: [
        { id: 'wa-1', label: 'WhatsApp Inbox', kind: 'whatsapp', status: 'connected' },
      ],
      setupChecklist: [
        'Pastikan instance Customer Service CRM sudah berjalan.',
        'Salin API key dari Settings → API Key di CRM.',
        'Masukkan URL instance dan API key ke form finalisasi.',
      ],
      requiredUserActions: ['Jalankan instance CRM', 'Salin API key', 'Isi URL + key di form'],
      nextActions: ['Pantau SLA inbox', 'Gunakan Sync Now kalau partner sudah menambahkan aset baru'],
      launchMode: 'manual_reference',
      launchUrlConfigured: false,
      vendorPortalUrl: undefined,
      vendorPortalLabel: 'Buka WA CRM',
      pricingUrl: undefined,
      docsUrl: undefined,
      supportUrl: undefined,
      callbackUrl: 'https://api.example.com/api/medsos/integrations/callback/social-hub',
      webhookUrl: 'https://api.example.com/api/medsos/integrations/webhook/social-hub',
      operatorNotes: 'Dipakai untuk inbox harian dan lead tracking.',
      vendorWorkspaceUrl: 'https://crm.yourdomain.com',
      vendorWorkspaceEmail: 'ops@arescoffee.id',
      subscriptionPlan: 'self-hosted',
      subscriptionStatus: 'active',
      renewalDate: '2026-06-02',
      billingOwnerName: 'Nadia - Ops',
      lastSyncAt: new Date().toISOString(),
      connectedAt: new Date().toISOString(),
      connectionRefMasked: 'soc_••••8341',
      launchSession: null,
      lastError: null,
      lastWebhookEvent: {
        receivedAt: new Date().toISOString(),
        eventType: 'partner.social.sync.completed',
      },
      updatedAt: new Date().toISOString(),
      customerPaysDirectly: true,
      dashboardFee: {
        currency: 'IDR',
        amount: 300000,
        label: 'Rp300.000 / bulan',
        description: 'Biaya dashboard orchestration.',
      },
    },
    {
      id: 2,
      slug: 'marketplace-hub',
      integrationType: 'managed_marketplace_hub',
      name: 'Marketplace Hub',
      workspaceName: 'Ares Commerce Core',
      category: 'marketplace',
      description: 'Jubelio dipakai untuk order, stok, katalog, dan chat marketplace sehingga seller tinggal daftar dan hubungkan toko.',
      providerName: 'Jubelio',
      providerKey: 'jubelio',
      status: 'pending_user_action',
      statusLabel: 'Waiting for user approval',
      isActive: false,
      healthScore: 0,
      supportedChannels: [
        { brand: 'shopee', label: 'Shopee' },
        { brand: 'tokopedia', label: 'Tokopedia' },
      ],
      capabilities: ['buyer chat sync', 'order queue', 'catalog health', 'stock mismatch alert', 'pricing exception'],
      billingNote: 'User membayar Jubelio langsung. MyCommerSocial hanya menjadi command center, alert, dan workflow internal.',
      dashboardFeeNote: 'Rp300.000 / bulan untuk orchestration dan alert.',
      pricingSummary: 'Jubelio mulai Rp150/order untuk order sync, inventory, catalog, dan chat marketplace.',
      recommendedPlan: 'Mulai Rp150/order',
      selectedAssets: [],
      setupChecklist: [
        'Klik connect lalu buka portal Jubelio.',
        'Daftar / login dan hubungkan toko yang ingin diaktifkan.',
        'Order dan buyer chat akan muncul di dashboard setelah callback selesai.',
      ],
      requiredUserActions: ['Daftar / login Jubelio', 'Pilih toko', 'Approve akses marketplace'],
      nextActions: ['Selesaikan aktivasi toko di Jubelio', 'Setelah itu klik Complete setup bila callback belum otomatis'],
      launchMode: 'manual_reference',
      launchUrlConfigured: false,
      vendorPortalUrl: 'https://v2.jubelio.com/auth/register',
      vendorPortalLabel: 'Buka portal Jubelio',
      pricingUrl: 'https://jubelio.com/en/pricing/',
      docsUrl: 'https://docs-wms.jubelio.com/',
      supportUrl: 'https://jubelio.com/en/api-integration/',
      callbackUrl: 'https://api.example.com/api/medsos/integrations/callback/marketplace-hub',
      webhookUrl: 'https://api.example.com/api/medsos/integrations/webhook/marketplace-hub',
      operatorNotes: 'Menunggu seller approve dua toko utama.',
      vendorWorkspaceUrl: 'https://v2.jubelio.com/',
      vendorWorkspaceEmail: 'marketplace@arescoffee.id',
      subscriptionPlan: 'Starter Rp150/order',
      subscriptionStatus: 'pending',
      renewalDate: '2026-05-15',
      billingOwnerName: 'Rafi - Marketplace Lead',
      lastSyncAt: null,
      connectedAt: null,
      connectionRefMasked: null,
      launchSession: {
        state: 'demo-state',
        createdAt: new Date().toISOString(),
        launchUrl: 'https://v2.jubelio.com/auth/register',
        returnPath: '/demo/medsos/connections',
        callbackUrl: 'https://api.example.com/api/medsos/integrations/callback/marketplace-hub',
      },
      lastError: null,
      lastWebhookEvent: null,
      updatedAt: new Date().toISOString(),
      customerPaysDirectly: true,
      dashboardFee: {
        currency: 'IDR',
        amount: 300000,
        label: 'Rp300.000 / bulan',
        description: 'Biaya dashboard orchestration.',
      },
    },
    {
      id: 3,
      slug: 'meta-ads-hub',
      integrationType: 'managed_meta_ads_hub',
      name: 'Meta Ads',
      workspaceName: 'Ares Growth Desk',
      category: 'ads',
      description: 'Hubungkan langsung ke Meta Business — login Facebook, pilih Ad Account, selesai. Campaign stats, spend, dan leads tampil di dashboard tanpa setup manual.',
      providerName: 'Meta',
      providerKey: 'meta',
      status: 'connected',
      statusLabel: 'Connected',
      isActive: true,
      healthScore: 89,
      supportedChannels: [
        { brand: 'facebook', label: 'Facebook Ads' },
        { brand: 'instagram', label: 'Instagram Ads' },
      ],
      capabilities: ['account health', 'campaign snapshot', 'budget pacing', 'lead sync', 'creative workflow'],
      billingNote: 'User membayar spend iklan langsung ke Meta. Tidak ada biaya third-party.',
      dashboardFeeNote: 'Rp300.000 / bulan untuk command center dan workflow.',
      pricingSummary: undefined,
      recommendedPlan: undefined,
      selectedAssets: [
        { id: 'ad-1', label: 'Ares Main Ad Account', kind: 'facebook', status: 'connected' },
      ],
      setupChecklist: [
        'Klik Connect — akan diarahkan ke login Meta.',
        'Login dengan akun Facebook yang punya Business Manager.',
        'Pilih Ad Account yang ingin diintegrasikan lalu klik Continue.',
        'Dashboard otomatis menampilkan data campaign.',
      ],
      requiredUserActions: ['Login Facebook', 'Pilih Ad Account', 'Approve permission'],
      nextActions: ['Pantau budget pacing', 'Gunakan Sync Now saat creative baru sudah tayang di partner'],
      launchMode: 'manual_reference',
      launchUrlConfigured: false,
      vendorPortalUrl: 'https://ads.facebook.com',
      vendorPortalLabel: 'Buka Meta Ads Manager',
      pricingUrl: undefined,
      docsUrl: undefined,
      supportUrl: undefined,
      callbackUrl: 'https://api.example.com/api/medsos/integrations/callback/meta-ads-hub',
      webhookUrl: 'https://api.example.com/api/medsos/integrations/webhook/meta-ads-hub',
      operatorNotes: 'Terhubung via OAuth — read-heavy untuk pacing dan lead handoff.',
      vendorWorkspaceUrl: 'https://ads.facebook.com',
      vendorWorkspaceEmail: 'growth@arescoffee.id',
      subscriptionPlan: undefined,
      subscriptionStatus: 'active',
      renewalDate: '2026-06-08',
      billingOwnerName: 'Diva - Growth',
      lastSyncAt: new Date().toISOString(),
      connectedAt: new Date().toISOString(),
      connectionRefMasked: 'ads_••••5502',
      launchSession: null,
      lastError: null,
      lastWebhookEvent: {
        receivedAt: new Date().toISOString(),
        eventType: 'partner.ads.snapshot.completed',
      },
      updatedAt: new Date().toISOString(),
      customerPaysDirectly: true,
      dashboardFee: {
        currency: 'IDR',
        amount: 300000,
        label: 'Rp300.000 / bulan',
        description: 'Biaya dashboard orchestration.',
      },
    },
  ],
};

const statusStyles: Record<ManagedIntegrationStatus, string> = {
  connected: 'bg-emerald-100 text-emerald-700',
  pending_user_action: 'bg-amber-100 text-amber-700',
  action_required: 'bg-rose-100 text-rose-700',
  syncing: 'bg-blue-100 text-blue-700',
  degraded: 'bg-orange-100 text-orange-700',
  not_connected: 'bg-slate-200 text-slate-700',
};

const subscriptionStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  trial: 'bg-blue-100 text-blue-700',
  overdue: 'bg-rose-100 text-rose-700',
  paused: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-slate-200 text-slate-700',
};

const summaryTone = [
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-violet-500 to-fuchsia-500',
];

function formatRelativeDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateOnly(value: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildDemoSummary(connectors: ManagedIntegrationConnector[]) {
  return {
    total: connectors.length,
    connected: connectors.filter((item) => item.status === 'connected').length,
    pending: connectors.filter((item) => item.status === 'pending_user_action').length,
    actionRequired: connectors.filter((item) => item.status === 'action_required').length,
    providerLinksConfigured: connectors.filter((item) => item.launchUrlConfigured || Boolean(item.vendorPortalUrl)).length,
  };
}

function getConnectorAccessLabel(connector: ManagedIntegrationConnector) {
  if (connector.launchUrlConfigured) {
    return 'Hosted connect ready';
  }

  if (connector.vendorPortalUrl) {
    return 'Vendor portal ready';
  }

  return 'Manual finalize fallback';
}

function getConnectorAccessTone(connector: ManagedIntegrationConnector) {
  if (connector.launchUrlConfigured) {
    return 'bg-blue-100 text-blue-700';
  }

  if (connector.vendorPortalUrl) {
    return 'bg-violet-100 text-violet-700';
  }

  return 'bg-slate-200 text-slate-700';
}

function getConnectButtonLabel(connector: ManagedIntegrationConnector) {
  if (connector.status === 'connected') {
    return 'Reconnect / add assets';
  }

  if (connector.launchUrlConfigured) {
    return 'Connect';
  }

  if (connector.vendorPortalUrl) {
    return `Buka ${connector.providerName}`;
  }

  return 'Connect';
}

function getPilotCheckpoints(connector: ManagedIntegrationConnector): PilotCheckpoint[] {
  return [
    {
      key: 'vendor-route',
      label: 'Vendor route siap',
      detail: connector.launchUrlConfigured ? 'Hosted flow sudah ada' : connector.vendorPortalUrl ? 'Portal vendor siap dipakai' : 'Masih manual',
      done: connector.launchUrlConfigured || Boolean(connector.vendorPortalUrl),
    },
    {
      key: 'workspace-profile',
      label: 'Workspace profile',
      detail: connector.workspaceName && connector.vendorWorkspaceEmail ? `${connector.workspaceName} • ${connector.vendorWorkspaceEmail}` : 'Label / email operasional belum lengkap',
      done: Boolean(connector.workspaceName && connector.vendorWorkspaceEmail),
    },
    {
      key: 'plan-recorded',
      label: 'Plan & billing',
      detail: connector.subscriptionPlan ? `${connector.subscriptionPlan} • ${connector.subscriptionStatus || 'status belum dicatat'}` : 'Plan vendor belum dicatat',
      done: Boolean(connector.subscriptionPlan && connector.subscriptionStatus),
    },
    {
      key: 'assets-selected',
      label: 'Aset aktif',
      detail: connector.selectedAssets.length > 0 ? `${connector.selectedAssets.length} aset aktif` : 'Belum ada aset dipilih',
      done: connector.selectedAssets.length > 0,
    },
    {
      key: 'connection-reference',
      label: 'Reference tersimpan',
      detail: connector.connectionRefMasked || 'Belum ada reference dari vendor',
      done: Boolean(connector.connectionRefMasked),
    },
    {
      key: 'connector-status',
      label: 'Status siap tempur',
      detail: connector.statusLabel,
      done: connector.status === 'connected',
    },
  ];
}

function getPilotSnapshot(connector: ManagedIntegrationConnector) {
  const checkpoints = getPilotCheckpoints(connector);
  const completed = checkpoints.filter((item) => item.done).length;
  const total = checkpoints.length;
  const score = Math.round((completed / total) * 100);

  let label = 'Belum siap';
  if (score >= 100) {
    label = 'Ready to test';
  } else if (score >= 67) {
    label = 'Hampir siap';
  } else if (score >= 34) {
    label = 'Sedang dirapikan';
  }

  return { checkpoints, completed, total, score, label };
}

export default function MedsosConnections() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const isDemo = location.pathname.startsWith('/demo');

  const [hub, setHub] = useState<ManagedIntegrationHub | null>(isDemo ? demoHub : null);
  const [loading, setLoading] = useState(!isDemo);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

  const connectors = hub?.connectors || [];
  const tapchatPilot = connectors.find((item) => item.slug === 'social-hub') || null;

  const summaryCards = useMemo(() => {
    const activeSummary = hub?.summary || buildDemoSummary(connectors);
    return [
      { label: 'Connector Terkoneksi', value: `${activeSummary.connected}/${activeSummary.total}`, helper: 'partner yang sudah hidup', icon: BadgeCheck },
      { label: 'Menunggu Approval', value: String(activeSummary.pending), helper: 'tinggal login / allow', icon: CircleAlert },
      { label: 'Link Provider Siap', value: String(activeSummary.providerLinksConfigured), helper: 'hosted flow atau portal vendor tersedia', icon: PlugZap },
      { label: 'Dashboard Fee', value: hub?.billing.dashboardFee.label || 'Rp300.000 / bulan', helper: 'biaya workspace saja', icon: Wallet },
    ];
  }, [connectors, hub]);

  const stackHighlights = useMemo(() => [
    {
      provider: 'WA CRM',
      role: 'WhatsApp inbox + lead tracking',
      price: 'Self-hosted',
      helper: 'Chat masuk, blast, eskalasi, semua di satu panel',
    },
    {
      provider: 'Jubelio',
      role: 'Marketplace ops backbone',
      price: 'Mulai Rp150/order',
      helper: 'Order, inventory, katalog, multi-channel',
    },
    {
      provider: 'Meta Ads',
      role: 'Facebook & Instagram Ads',
      price: 'OAuth langsung ke Meta',
      helper: 'Login Facebook, pilih Ad Account, selesai',
    },
  ], []);

  useEffect(() => {
    if (!isDemo) {
      void loadHub();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const provider = params.get('provider');
    const source = params.get('source');

    if (source === 'callback' && provider && status) {
      toast.success(`${provider} ${status === 'connected' ? 'berhasil terkoneksi' : 'butuh tindak lanjut'}`);
    }
  }, [location.search]);

  const loadHub = async () => {
    setLoading(true);
    try {
      const response = await getMyCommerSocialIntegrationHub();
      setHub(response);
    } catch (error) {
      console.error('Failed to fetch MyCommerSocial integration hub', error);
      toast.error('Gagal memuat data connector');
    } finally {
      setLoading(false);
    }
  };

  const openFinalizeModal = (connector: ManagedIntegrationConnector) => {
    const selectedBrands = connector.selectedAssets.length > 0
      ? connector.selectedAssets.map((asset) => asset.kind as ManagedIntegrationBrand)
      : connector.supportedChannels.map((channel) => channel.brand);

    setModal({
      connector,
      workspaceName: connector.workspaceName || connector.name,
      connectionId: '',
      notes: connector.operatorNotes || '',
      vendorWorkspaceUrl: connector.vendorWorkspaceUrl || '',
      vendorWorkspaceEmail: connector.vendorWorkspaceEmail || '',
      subscriptionPlan: connector.subscriptionPlan || connector.recommendedPlan || '',
      subscriptionStatus: connector.subscriptionStatus || 'active',
      renewalDate: connector.renewalDate || '',
      billingOwnerName: connector.billingOwnerName || '',
      selectedBrands,
    });
  };

  const handleConnect = async (connector: ManagedIntegrationConnector) => {
    if (isDemo) {
      if (connector.vendorPortalUrl) {
        window.open(connector.vendorPortalUrl, '_blank', 'noopener,noreferrer');
      }

      const nextConnectors = connectors.map((item) =>
        item.slug === connector.slug
          ? {
              ...item,
              status: 'pending_user_action' as ManagedIntegrationStatus,
              statusLabel: 'Waiting for user approval',
              launchSession: {
                state: `demo-${Date.now()}`,
                createdAt: new Date().toISOString(),
                launchUrl: connector.vendorPortalUrl,
                returnPath: '/demo/medsos/connections',
                callbackUrl: item.callbackUrl,
              },
            }
          : item
      );

      setHub((current) => current ? {
        ...current,
        connectors: nextConnectors,
        summary: buildDemoSummary(nextConnectors),
      } : current);
      toast.success(`Demo connect ${connector.providerName} dimulai. Portal vendor dibuka lalu finalisasi disiapkan.`);
      openFinalizeModal({
        ...connector,
        status: 'pending_user_action',
        statusLabel: 'Waiting for user approval',
      });
      return;
    }

    try {
      setBusySlug(connector.slug);
      const result = await beginMyCommerSocialConnect(connector.slug);
      if (result.launchMode === 'redirect' && result.launchUrl) {
        window.open(result.launchUrl, '_blank', 'noopener,noreferrer');
        toast.success('Hosted connector dibuka. User tinggal login dan approve.');
      } else {
        if (connector.vendorPortalUrl) {
          window.open(connector.vendorPortalUrl, '_blank', 'noopener,noreferrer');
          toast.success(`Portal ${connector.providerName} dibuka. Setelah vendor aktif, finalisasi cukup dari dashboard ini.`);
        } else {
          toast.success('Hosted link belum diisi. Hamba buka finalisasi manual yang tetap ramah user.');
        }
        openFinalizeModal(connector);
      }
      await loadHub();
    } catch (error) {
      console.error('Failed to initialize connection', error);
      toast.error('Gagal memulai connect flow');
    } finally {
      setBusySlug(null);
    }
  };

  const handleSync = async (connector: ManagedIntegrationConnector) => {
    if (isDemo) {
      const nextConnectors = connectors.map((item) =>
        item.slug === connector.slug
          ? {
              ...item,
              lastSyncAt: new Date().toISOString(),
              status: item.connectionRefMasked ? 'connected' as ManagedIntegrationStatus : 'action_required' as ManagedIntegrationStatus,
              statusLabel: item.connectionRefMasked ? 'Connected' : 'Action required',
            }
          : item
      );

      setHub((current) => current ? {
        ...current,
        connectors: nextConnectors,
        summary: buildDemoSummary(nextConnectors),
      } : current);
      toast.success('Demo sync selesai.');
      return;
    }

    try {
      setBusySlug(connector.slug);
      await syncMyCommerSocialIntegration(connector.slug);
      toast.success('Sync state diperbarui');
      await loadHub();
    } catch (error) {
      console.error('Failed to sync integration', error);
      toast.error('Gagal refresh sync state');
    } finally {
      setBusySlug(null);
    }
  };

  const handleDisconnect = async (connector: ManagedIntegrationConnector) => {
    if (!window.confirm(`Putuskan ${connector.name}?`)) {
      return;
    }

    if (isDemo) {
      const nextConnectors = connectors.map((item) =>
        item.slug === connector.slug
          ? {
              ...item,
              status: 'not_connected' as ManagedIntegrationStatus,
              statusLabel: 'Not connected',
              isActive: false,
              healthScore: 0,
              selectedAssets: [],
              connectionRefMasked: null,
              lastSyncAt: null,
            }
          : item
      );

      setHub((current) => current ? {
        ...current,
        connectors: nextConnectors,
        summary: buildDemoSummary(nextConnectors),
      } : current);
      toast.success('Demo disconnect berhasil.');
      return;
    }

    try {
      setBusySlug(connector.slug);
      await disconnectMyCommerSocialIntegration(connector.slug);
      toast.success('Connector diputus');
      await loadHub();
    } catch (error) {
      console.error('Failed to disconnect integration', error);
      toast.error('Gagal memutus connector');
    } finally {
      setBusySlug(null);
    }
  };

  const handleFinalizeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal) {
      return;
    }

    const selectedAssets: ManagedIntegrationAsset[] = modal.connector.supportedChannels
      .filter((channel) => modal.selectedBrands.includes(channel.brand))
      .map((channel) => ({
        id: channel.brand,
        label: channel.label,
        kind: channel.brand,
        status: 'connected',
      }));

    if (selectedAssets.length === 0) {
      toast.error('Pilih minimal satu aset/channel');
      return;
    }

    if (isDemo) {
      const nextConnectors = connectors.map((item) =>
        item.slug === modal.connector.slug
          ? {
              ...item,
              workspaceName: modal.workspaceName || item.workspaceName,
              status: 'connected' as ManagedIntegrationStatus,
              statusLabel: 'Connected',
              isActive: true,
              healthScore: item.healthScore || 90,
              connectedAt: new Date().toISOString(),
              lastSyncAt: new Date().toISOString(),
              selectedAssets,
              operatorNotes: modal.notes || item.operatorNotes,
              vendorWorkspaceUrl: modal.vendorWorkspaceUrl || item.vendorWorkspaceUrl,
              vendorWorkspaceEmail: modal.vendorWorkspaceEmail || item.vendorWorkspaceEmail,
              subscriptionPlan: modal.subscriptionPlan || item.subscriptionPlan,
              subscriptionStatus: modal.subscriptionStatus || item.subscriptionStatus,
              renewalDate: modal.renewalDate || item.renewalDate,
              billingOwnerName: modal.billingOwnerName || item.billingOwnerName,
              connectionRefMasked: modal.connectionId ? `${modal.connectionId.slice(0, 4)}••••${modal.connectionId.slice(-2)}` : item.connectionRefMasked || 'demo••••live',
              launchSession: null,
            }
          : item
      );

      setHub((current) => current ? {
        ...current,
        connectors: nextConnectors,
        summary: buildDemoSummary(nextConnectors),
      } : current);
      toast.success('Demo finalisasi berhasil.');
      setModal(null);
      return;
    }

    try {
      setBusySlug(modal.connector.slug);
      await completeMyCommerSocialConnect(modal.connector.slug, {
        connectionId: modal.connectionId || undefined,
        workspaceName: modal.workspaceName || undefined,
        notes: modal.notes || undefined,
        vendorWorkspaceUrl: modal.vendorWorkspaceUrl || undefined,
        vendorWorkspaceEmail: modal.vendorWorkspaceEmail || undefined,
        subscriptionPlan: modal.subscriptionPlan || undefined,
        subscriptionStatus: modal.subscriptionStatus || undefined,
        renewalDate: modal.renewalDate || undefined,
        billingOwnerName: modal.billingOwnerName || undefined,
        selectedAssets,
      });
      toast.success('Connector berhasil difinalisasi');
      setModal(null);
      await loadHub();
    } catch (error) {
      console.error('Failed to finalize connection', error);
      toast.error('Gagal menyimpan finalisasi connector');
    } finally {
      setBusySlug(null);
    }
  };

  const handleToggleBrand = (brand: ManagedIntegrationBrand) => {
    setModal((current) => {
      if (!current) return current;
      const exists = current.selectedBrands.includes(brand);
      return {
        ...current,
        selectedBrands: exists
          ? current.selectedBrands.filter((item) => item !== brand)
          : [...current.selectedBrands, brand],
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-blue-500/10 text-blue-600 mb-4">
              <PlugZap size={14} />
              Third-party orchestrated connectors
            </div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Connections Hub</h1>
            <p className={`mt-2 max-w-3xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Stack MyCommerSocial: <span className="font-semibold">WA CRM + Jubelio + Meta Ads</span>. Semua integrasi dikelola dari satu hub — user cukup connect sekali, dashboard langsung hidup.
            </p>
            <div className="grid md:grid-cols-3 gap-3 mt-5">
              {stackHighlights.map((item) => (
                <div key={item.provider} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{item.provider}</p>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700">{item.price}</span>
                  </div>
                  <p className={`mt-2 text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{item.role}</p>
                  <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.helper}</p>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mt-6">
              {summaryCards.map((card, index) => (
                <div key={card.label} className={`rounded-2xl bg-gradient-to-br ${summaryTone[index % summaryTone.length]} p-[1px]`}>
                  <div className={`rounded-[15px] h-full p-4 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
                        <p className="mt-2 text-2xl font-bold">{card.value}</p>
                        <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.helper}</p>
                      </div>
                      <card.icon className="text-blue-500" size={18} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-3xl border p-5 ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-blue-50 border-blue-100'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={18} className="text-blue-500" />
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Pricing split yang Ainz-sama inginkan</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Dashboard fee</p>
                <p className="mt-2 text-2xl font-bold">{hub?.billing.dashboardFee.label || 'Rp300.000 / bulan'}</p>
                <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{hub?.billing.dashboardFee.description}</p>
              </div>
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <p className="font-semibold">Connector & spend vendor</p>
                <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  WA CRM dihosting sendiri. Jubelio dibayar langsung per order. Meta Ads spend langsung ke Meta. MyCommerSocial hanya menjadi wadah kontrol, workflow, dan analytics.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Workflow size={16} className="text-violet-500" />
                    <p className="font-semibold">User flow</p>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Connect → Login → Approve → Dashboard hidup</p>
                </div>
                <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <p className="font-semibold">Teknis disembunyikan</p>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Tidak ada API key, webhook URL, atau secret yang dipegang user biasa</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.4fr_0.8fr] gap-6">
        <div className="space-y-6">
          {connectors.map((connector) => {
            const pilot = getPilotSnapshot(connector);

            return (
            <div key={connector.slug} className={`rounded-3xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className={`rounded-2xl p-3 ${connector.category === 'social' ? 'bg-pink-100 text-pink-600' : connector.category === 'marketplace' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                      {connector.category === 'social' ? <Sparkles size={18} /> : connector.category === 'marketplace' ? <Workflow size={18} /> : <PlugZap size={18} />}
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{connector.name}</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {connector.providerName}{connector.recommendedPlan ? ` • ${connector.recommendedPlan}` : ''}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[connector.status]}`}>
                      {connector.statusLabel}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getConnectorAccessTone(connector)}`}>
                      {getConnectorAccessLabel(connector)}
                    </span>
                  </div>

                  <p className={`mt-4 text-sm leading-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{connector.description}</p>
                  {connector.pricingSummary ? (
                    <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900/50 text-gray-200' : 'border-blue-100 bg-blue-50 text-blue-700'}`}>
                      {connector.pricingSummary}
                    </div>
                  ) : null}

                  <div className={`mt-5 rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pilot readiness</p>
                        <p className="mt-1 text-lg font-bold">{pilot.label}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{pilot.score}%</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{pilot.completed}/{pilot.total} checkpoint selesai</p>
                      </div>
                    </div>
                    <div className={`mt-4 h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white border border-gray-200'}`}>
                      <div
                        className={`h-full rounded-full ${pilot.score >= 100 ? 'bg-emerald-500' : pilot.score >= 67 ? 'bg-blue-500' : pilot.score >= 34 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${pilot.score}%` }}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-3 mt-4">
                      {pilot.checkpoints.map((checkpoint) => (
                        <div key={`${connector.slug}-${checkpoint.key}`} className={`rounded-xl border px-3 py-3 ${isDark ? 'border-slate-700 bg-slate-800/80' : 'border-gray-200 bg-white'}`}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">{checkpoint.label}</p>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${checkpoint.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                              {checkpoint.done ? 'done' : 'todo'}
                            </span>
                          </div>
                          <p className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{checkpoint.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {connector.supportedChannels.map((channel) => (
                      <div key={`${connector.slug}-${channel.brand}`} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs ${isDark ? 'bg-slate-900 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                        <BrandLogo brand={channel.brand} size={18} className="rounded-md" withRing={channel.brand === 'tokopedia'} />
                        {channel.label}
                      </div>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mt-5">
                    <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                      <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Health</p>
                      <p className="mt-2 text-2xl font-bold">{connector.healthScore}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>score partner connector</p>
                    </div>
                    <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                      <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Last sync</p>
                      <p className="mt-2 text-sm font-semibold">{formatRelativeDate(connector.lastSyncAt)}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>callback / manual refresh</p>
                    </div>
                    <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                      <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Reference</p>
                      <p className="mt-2 text-sm font-semibold">{connector.connectionRefMasked || 'belum ada'}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>disimpan aman di backend</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
                    <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                      <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Workspace</p>
                      <p className="mt-2 text-sm font-semibold">{connector.workspaceName || '-'}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>label workspace vendor</p>
                    </div>
                    <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                      <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Billing owner</p>
                      <p className="mt-2 text-sm font-semibold">{connector.billingOwnerName || '-'}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{connector.vendorWorkspaceEmail || 'belum ada email operasional'}</p>
                    </div>
                    <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                      <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Plan</p>
                      <p className="mt-2 text-sm font-semibold">{connector.subscriptionPlan || connector.recommendedPlan || '-'}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>renewal {formatDateOnly(connector.renewalDate)}</p>
                    </div>
                    <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                      <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Subscription</p>
                      <div className="mt-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${subscriptionStyles[connector.subscriptionStatus || ''] || 'bg-slate-200 text-slate-700'}`}>
                          {connector.subscriptionStatus || 'unknown'}
                        </span>
                      </div>
                      <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>status vendor workspace</p>
                    </div>
                  </div>

                  <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-4 mt-5">
                    <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Settings2 size={16} className="text-blue-500" />
                        <p className="font-semibold text-sm">Capabilities</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {connector.capabilities.map((capability) => (
                          <span key={capability} className={`rounded-full px-3 py-1 text-[11px] ${isDark ? 'bg-slate-800 text-gray-300' : 'bg-white text-gray-700 border border-gray-200'}`}>
                            {capability}
                          </span>
                        ))}
                      </div>
                      <p className={`text-xs mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{connector.billingNote}</p>
                    </div>

                    <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Link2 size={16} className="text-violet-500" />
                        <p className="font-semibold text-sm">Selected assets</p>
                      </div>
                      {connector.selectedAssets.length > 0 ? (
                        <div className="space-y-2">
                          {connector.selectedAssets.map((asset) => (
                            <div key={`${connector.slug}-${asset.id || asset.label}`} className={`rounded-xl px-3 py-2 text-sm flex items-center justify-between ${isDark ? 'bg-slate-800 text-gray-200' : 'bg-white text-gray-700 border border-gray-200'}`}>
                              <span>{asset.label}</span>
                              <span className="text-[10px] uppercase tracking-[0.14em] text-emerald-500">{asset.status || 'connected'}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Belum ada aset aktif. Setelah user approve, aset akan masuk otomatis atau bisa difinalisasi di modal.</p>
                      )}
                      {connector.operatorNotes ? (
                        <div className={`mt-4 rounded-xl px-3 py-3 text-xs ${isDark ? 'bg-slate-800 text-gray-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
                          <span className="font-semibold">Operator note:</span> {connector.operatorNotes}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="lg:w-[300px] space-y-3">
                  <button
                    onClick={() => handleConnect(connector)}
                    disabled={busySlug === connector.slug}
                    className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {busySlug === connector.slug ? <Loader2 size={16} className="animate-spin" /> : <PlugZap size={16} />}
                    {getConnectButtonLabel(connector)}
                  </button>
                  <button
                    onClick={() => openFinalizeModal(connector)}
                    className={`w-full rounded-2xl border px-4 py-3 font-semibold flex items-center justify-center gap-2 ${isDark ? 'border-slate-700 bg-slate-900 hover:bg-slate-800' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                  >
                    <BadgeCheck size={16} />
                    Complete setup
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleSync(connector)}
                      disabled={busySlug === connector.slug}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${isDark ? 'border-slate-700 bg-slate-900 hover:bg-slate-800' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                    >
                      <RefreshCcw size={15} />
                      Sync
                    </button>
                    <button
                      onClick={() => handleDisconnect(connector)}
                      disabled={busySlug === connector.slug}
                      className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <Unplug size={15} />
                      Putus
                    </button>
                  </div>
                  <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                    <p className="font-semibold text-sm mb-2">Next actions</p>
                    <ul className="space-y-2">
                      {connector.nextActions.map((step) => (
                        <li key={step} className={`text-xs flex gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                    <div className={`mt-3 rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-slate-800 text-gray-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
                      Pilot score: <span className="font-semibold">{pilot.score}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {connector.vendorPortalUrl ? (
                      <a
                        href={connector.vendorPortalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${isDark ? 'border-slate-700 bg-slate-900 hover:bg-slate-800' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                      >
                        <ExternalLink size={15} />
                        {connector.providerName}
                      </a>
                    ) : (
                      <div className={`rounded-2xl border px-4 py-3 text-center text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                        Portal unset
                      </div>
                    )}
                    {connector.pricingUrl ? (
                      <a
                        href={connector.pricingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${isDark ? 'border-slate-700 bg-slate-900 hover:bg-slate-800' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                      >
                        <ExternalLink size={15} />
                        Pricing
                      </a>
                    ) : (
                      <div className={`rounded-2xl border px-4 py-3 text-center text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                        Pricing unset
                      </div>
                    )}
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 text-center text-xs ${isDark ? 'border-slate-700 bg-slate-900 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                    Callback & webhook ready
                  </div>
                </div>
              </div>
            </div>
          );
          })}
        </div>

        <div className="space-y-6">
          {tapchatPilot ? (
            <div className={`rounded-3xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center gap-2 mb-4">
                <PlugZap size={18} className="text-blue-500" />
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>WA Inbox — quick setup</h3>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Hubungkan <span className="font-semibold">Customer Service CRM</span> sebagai backbone WA inbox: URL instance + API key, langsung jalan.
              </p>
              <div className="grid gap-3 mt-4">
                {[
                  'Pastikan instance CRM sudah running dan bisa diakses dari internet.',
                  'Masuk ke Settings → API Key di CRM, salin key tenant.',
                  'Klik Complete Setup di card WA Inbox, isi URL instance dan API key.',
                  'Status berubah jadi Connected — stats WA langsung tampil di Inbox tab.',
                ].map((step, index) => (
                  <div key={step} className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                    <span className="font-semibold mr-2">{index + 1}.</span>{step}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => openFinalizeModal(tapchatPilot)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 font-semibold"
                >
                  <BadgeCheck size={16} />
                  Setup WA Inbox
                </button>
              </div>
            </div>
          ) : null}

          <div className={`rounded-3xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Workflow size={18} className="text-blue-500" />
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Onboarding yang dibuat super simpel</h3>
            </div>
            <div className="space-y-4">
              {[
                'User klik Connect dari dashboard.',
                'WA CRM: isi URL + API key. Meta Ads: login Facebook, pilih Ad Account. Jubelio: daftar + hubungkan toko.',
                'User login, memilih aset, lalu vendor menangani billing serta koneksi teknis.',
                'Jika reference belum kembali otomatis, operator cukup finalisasi nama workspace dan channel aktif.',
              ].map((step, index) => (
                <div key={step} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">{index + 1}</div>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-3xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={18} className="text-emerald-500" />
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Apa yang disembunyikan dari user biasa</h3>
            </div>
            <div className="space-y-3">
              {[
                'OAuth client, redirect URI, webhook secret, token refresh',
                'Health monitoring, callback routing, retry sync, masking connection reference',
                'Pricing split: fee dashboard terpisah dari biaya Jubelio / Meta spend',
              ].map((item) => (
                <div key={item} className={`rounded-2xl px-4 py-3 text-sm ${isDark ? 'bg-slate-900 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-3xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-4">
              <CircleAlert size={18} className="text-amber-500" />
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Operator notes</h3>
            </div>
            <div className="space-y-3">
              {connectors.map((connector) => (
                <div key={`note-${connector.slug}`} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-sm">{connector.name}</p>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${statusStyles[connector.status]}`}>
                      {connector.statusLabel}
                    </span>
                  </div>
                  <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{connector.lastError || connector.operatorNotes || connector.pricingSummary || connector.billingNote}</p>
                  <p className={`text-[11px] mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {connector.billingOwnerName || 'Belum ada PIC billing'} • {connector.subscriptionPlan || connector.recommendedPlan || 'plan belum dicatat'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-100 text-gray-900'} shadow-2xl`}>
            <div className="px-6 py-5 border-b border-inherit flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-blue-500">Complete setup</p>
                  <h3 className="text-xl font-bold mt-1">{modal.connector.name}</h3>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm mt-2`}>
                    Form ini tetap ringan untuk user biasa: cukup nama workspace, aset yang ingin diaktifkan, dan optional reference jika {modal.connector.providerName} belum mengirim callback otomatis.
                  </p>
                </div>
                <button onClick={() => setModal(null)} className={`rounded-xl px-3 py-2 ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
                  Tutup
                </button>
              </div>
            </div>

            <form onSubmit={handleFinalizeSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Workspace label</label>
                  <input
                    value={modal.workspaceName}
                    onChange={(event) => setModal((current) => current ? { ...current, workspaceName: event.target.value } : current)}
                    className={`w-full rounded-2xl px-4 py-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
                    placeholder="Contoh: Ares Official Accounts"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    {modal.connector.slug === 'social-hub' ? 'API Key (dari CRM)' : 'Connection reference (opsional)'}
                  </label>
                  <input
                    value={modal.connectionId}
                    onChange={(event) => setModal((current) => current ? { ...current, connectionId: event.target.value } : current)}
                    className={`w-full rounded-2xl px-4 py-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
                    placeholder={modal.connector.slug === 'social-hub' ? 'API key dari Settings → API Key di CRM' : 'conn_..., ref_..., atau id dari partner'}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    {modal.connector.slug === 'social-hub' ? 'URL Instance CRM' : 'Vendor workspace URL'}
                  </label>
                  <input
                    value={modal.vendorWorkspaceUrl}
                    onChange={(event) => setModal((current) => current ? { ...current, vendorWorkspaceUrl: event.target.value } : current)}
                    className={`w-full rounded-2xl px-4 py-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
                    placeholder={modal.connector.slug === 'social-hub' ? 'https://crm.yourdomain.com atau http://localhost:3001' : 'https://v2.jubelio.com/..., dst.'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Vendor workspace email</label>
                  <input
                    value={modal.vendorWorkspaceEmail}
                    onChange={(event) => setModal((current) => current ? { ...current, vendorWorkspaceEmail: event.target.value } : current)}
                    className={`w-full rounded-2xl px-4 py-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
                    placeholder="ops@brand.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Subscription plan</label>
                  <select
                    value={modal.subscriptionPlan}
                    onChange={(event) => setModal((current) => current ? { ...current, subscriptionPlan: event.target.value } : current)}
                    className={`w-full rounded-2xl px-4 py-3 border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                  >
                    <option value="">-- Pilih plan --</option>
                    {(modal.connector.slug === 'social-hub' ? [
                      { value: 'self-hosted', label: 'Self-hosted (gratis)' },
                      { value: 'managed', label: 'Managed (berbayar)' },
                      { value: 'trial', label: 'Trial / Dev' },
                    ] : modal.connector.slug === 'marketplace-hub' ? [
                      { value: 'starter', label: 'Starter – Rp150/order' },
                      { value: 'pro', label: 'Pro (custom)' },
                    ] : [
                      { value: 'starter', label: 'Starter – $29/bln' },
                      { value: 'growth', label: 'Growth – $79/bln' },
                      { value: 'scale', label: 'Scale (custom)' },
                    ]).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Subscription status</label>
                  <select
                    value={modal.subscriptionStatus}
                    onChange={(event) => setModal((current) => current ? { ...current, subscriptionStatus: event.target.value } : current)}
                    className={`w-full rounded-2xl px-4 py-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
                  >
                    {['active', 'pending', 'trial', 'paused', 'overdue', 'cancelled'].map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Renewal date</label>
                  <input
                    type="date"
                    value={modal.renewalDate}
                    onChange={(event) => setModal((current) => current ? { ...current, renewalDate: event.target.value } : current)}
                    className={`w-full rounded-2xl px-4 py-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Billing owner</label>
                <input
                  value={modal.billingOwnerName}
                  onChange={(event) => setModal((current) => current ? { ...current, billingOwnerName: event.target.value } : current)}
                  className={`w-full rounded-2xl px-4 py-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
                  placeholder="Nama PIC yang memegang billing vendor"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Aset yang akan diaktifkan</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {modal.connector.supportedChannels.map((channel) => {
                    const active = modal.selectedBrands.includes(channel.brand);
                    return (
                      <button
                        key={`${modal.connector.slug}-${channel.brand}`}
                        type="button"
                        onClick={() => handleToggleBrand(channel.brand)}
                        className={`rounded-2xl border px-4 py-3 flex items-center gap-3 transition ${active ? 'border-blue-500 bg-blue-500/10' : isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}
                      >
                        <BrandLogo brand={channel.brand} size={26} className="rounded-lg" withRing={channel.brand === 'tokopedia'} />
                        <div className="text-left">
                          <p className="font-semibold text-sm">{channel.label}</p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{active ? 'akan diaktifkan' : 'belum dipilih'}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Catatan operator (opsional)</label>
                <textarea
                  value={modal.notes}
                  onChange={(event) => setModal((current) => current ? { ...current, notes: event.target.value } : current)}
                  rows={2}
                  className={`w-full rounded-2xl px-4 py-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
                  placeholder="Misal: buyer chat diprioritaskan dulu, ads read-only dulu, dst."
                />
              </div>

              {modal.connector.vendorPortalUrl ? (
                <a
                  href={modal.connector.vendorPortalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${isDark ? 'border-slate-700 bg-slate-800 text-white hover:bg-slate-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  <ExternalLink size={15} />
                  {modal.connector.vendorPortalLabel || `Buka ${modal.connector.providerName}`}
                </a>
              ) : null}

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className={`rounded-2xl px-5 py-3 font-semibold ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busySlug === modal.connector.slug}
                  className="rounded-2xl px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {busySlug === modal.connector.slug ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                  Simpan finalisasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
