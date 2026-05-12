import { type ReactNode, useEffect, useMemo, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useThemeStore } from '../../store/themeStore';
import { BrandLogo, resolveBrandKey } from '../../components/medsos/BrandLogo';
import FieldHelp from '../../components/medsos/FieldHelp';
import {
  getMarketplaceHubStatus,
  getWACrmStatus,
  getZernioAccounts,
  getZernioConversations,
  getZernioMessages,
  sendZernioMessage,
  type MarketplaceChatChannel,
  type MarketplaceHubConnectionStatus,
  type WACrmConnectionStatus,
  type WACrmStats,
  type ZernioAccount,
  type ZernioConversation,
  type ZernioMessage,
} from '../../services/medsosPostsService';
import { getMyCommerSocialIntegrationHub, type ManagedIntegrationConnector } from '../../services/myCommerSocialIntegrations';
import {
  conversationMessages,
  inboxFilters,
  priorityThreads,
  replyTemplates,
  teamSeats,
  threadDetails,
  type ConversationMessage,
  type PriorityThread,
  type ThreadDetail,
} from '../../data/omnichannelMock';
import {
  AlertTriangle,
  Bot,
  ExternalLink,
  Loader2,
  MessageSquareQuote,
  NotebookPen,
  Paperclip,
  PlugZap,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Smile,
  Store,
  Tag,
  UserRoundCheck,
  Workflow,
} from 'lucide-react';

const ADS_PLATFORMS = new Set(['metaads', 'googleads', 'linkedinads', 'tiktokads', 'pinterestads', 'xads']);

type InboxChannel = 'wa' | 'social' | 'marketplace';

const demoWaThreads: PriorityThread[] = [
  {
    id: 901,
    customer: 'Aulia Retail',
    channel: 'WhatsApp',
    kind: 'social',
    inboxType: 'dm',
    subject: 'Tanya katalog grosir',
    snippet: 'Kalau ambil 50 pcs masih dapat harga grosir seperti bulan lalu?',
    time: '1 menit lalu',
    unread: 2,
    priority: 'high',
    assignee: 'Nisa',
    tags: ['repeat buyer', 'harga'],
    sla: '05:12',
  },
  {
    id: 902,
    customer: 'Lina Project',
    channel: 'WhatsApp',
    kind: 'social',
    inboxType: 'dm',
    subject: 'Minta update pesanan',
    snippet: 'Boleh cek invoice INV-8821 sudah diproses sampai mana?',
    time: '9 menit lalu',
    unread: 1,
    priority: 'medium',
    assignee: 'Alya',
    tags: ['follow up', 'order'],
    sla: '17:40',
  },
  {
    id: 903,
    customer: 'Bram Service',
    channel: 'WhatsApp',
    kind: 'social',
    inboxType: 'dm',
    subject: 'Butuh panduan instalasi',
    snippet: 'Barang sudah datang, tapi saya butuh panduan versi terbaru.',
    time: '18 menit lalu',
    unread: 1,
    priority: 'low',
    assignee: 'Damar',
    tags: ['support', 'panduan'],
    sla: '28:00',
  },
];

const demoWaDetails: Record<number, ThreadDetail> = {
  901: {
    threadId: 901,
    sentiment: 'positive',
    customerTier: 'Returning',
    preferredChannel: 'WhatsApp',
    lifetimeValue: 'Rp18.400.000',
    summary: 'Pelanggan lama meminta harga grosir untuk repeat order dan butuh respons cepat.',
    recommendedActions: ['Kirim price list grosir', 'Tawarkan bundling pengiriman', 'Tandai lead panas'],
    macros: ['Balasan harga grosir', 'Template follow up katalog'],
    internalNotes: ['Lead bagus untuk campaign repeat order minggu ini.'],
    activities: [
      { time: '09:14', title: 'Thread masuk', description: 'Pelanggan mengirim pertanyaan harga grosir.' },
      { time: '09:16', title: 'Draft siap', description: 'Draft balasan awal sudah disiapkan.' },
    ],
    orderContext: {
      orderId: 'INV-8802',
      amount: 'Rp6.250.000',
      status: 'Repeat inquiry',
      lastUpdate: 'Order terakhir 12 hari lalu',
    },
  },
  902: {
    threadId: 902,
    sentiment: 'neutral',
    customerTier: 'VIP',
    preferredChannel: 'WhatsApp',
    lifetimeValue: 'Rp43.200.000',
    summary: 'Pelanggan meminta update invoice aktif dan perlu kepastian ETA.',
    recommendedActions: ['Cek status invoice', 'Kirim estimasi update', 'Tawarkan jalur prioritas'],
    macros: ['Template update order', 'Template cek invoice'],
    internalNotes: ['Biasanya respon cepat menurunkan follow up ganda.'],
    activities: [{ time: '09:05', title: 'Operator ditugaskan', description: 'Seat Alya mengambil alih thread.' }],
    orderContext: {
      orderId: 'INV-8821',
      amount: 'Rp2.980.000',
      status: 'Diproses',
      lastUpdate: 'Packing dimulai 30 menit lalu',
    },
  },
  903: {
    threadId: 903,
    sentiment: 'neutral',
    customerTier: 'New',
    preferredChannel: 'WhatsApp',
    lifetimeValue: 'Rp1.250.000',
    summary: 'Pelanggan baru butuh panduan pemasangan. Cocok diarahkan ke knowledge base.',
    recommendedActions: ['Kirim panduan PDF', 'Tawarkan bantuan singkat'],
    macros: ['Template kirim panduan', 'Template after-sales'],
    internalNotes: ['Tidak perlu eskalasi.'],
    activities: [{ time: '08:54', title: 'Pesan diterima', description: 'Pelanggan meminta panduan instalasi terbaru.' }],
  },
};

const demoWaMessages: Record<number, ConversationMessage[]> = {
  901: [
    { id: 1, sender: 'user', text: 'Kalau ambil 50 pcs masih dapat harga grosir seperti bulan lalu?', time: '09:14' },
    { id: 2, sender: 'system', text: 'Percakapan ditandai sebagai peluang repeat order.', time: '09:15' },
    { id: 3, sender: 'me', text: 'Bisa. Saya cek price list grosir terbaru dan siapkan opsi pengirimannya ya.', time: '09:17' },
  ],
  902: [
    { id: 1, sender: 'user', text: 'Boleh cek invoice INV-8821 sudah diproses sampai mana?', time: '09:02' },
    { id: 2, sender: 'me', text: 'Siap, saya cek dulu dan update beberapa menit lagi ya.', time: '09:05' },
  ],
  903: [
    { id: 1, sender: 'user', text: 'Barang sudah datang, tapi saya butuh panduan versi terbaru.', time: '08:54' },
    { id: 2, sender: 'me', text: 'Baik, saya kirimkan panduan terbaru dan langkah pemasangannya.', time: '08:58' },
  ],
};

function normalizeInboxChannel(value?: string): InboxChannel {
  if (value === 'social') return 'social';
  if (value === 'marketplace') return 'marketplace';
  return 'wa';
}

function titleByChannel(channel: InboxChannel) {
  if (channel === 'social') return 'Inbox Medsos';
  if (channel === 'marketplace') return 'Inbox Marketplace';
  return 'Inbox WA';
}

function descriptionByChannel(channel: InboxChannel) {
  if (channel === 'social') return 'DM, komentar, dan percakapan social yang sudah tersambung.';
  if (channel === 'marketplace') return 'Buyer chat marketplace yang aktif di workspace AI.';
  return 'Percakapan WhatsApp operasional yang aktif di workspace inbox.';
}

function SectionHeader({
  isDark,
  title,
  description,
  icon,
}: {
  isDark: boolean;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
      <div className="flex items-start gap-4">
        <div className={`rounded-2xl p-3 ${isDark ? 'bg-slate-900 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>{icon}</div>
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
        </div>
      </div>
    </div>
  );
}

function WACrmPanel({ isDark, onSetup }: { isDark: boolean; onSetup: () => void }) {
  const [stats, setStats] = useState<WACrmStats | null>(null);
  const [crmStatus, setCrmStatus] = useState<WACrmConnectionStatus | null>(null);
  const [crmUrl, setCrmUrl] = useState<string | null>(null);
  const [connector, setConnector] = useState<ManagedIntegrationConnector | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError(null);
      try {
        const [statusResult, hubResult] = await Promise.allSettled([
          getWACrmStatus(),
          getMyCommerSocialIntegrationHub(),
        ]);

        if (cancelled) return;

        const hub = hubResult.status === 'fulfilled' ? hubResult.value : null;
        const socialHub = hub?.connectors?.find((item: { slug: string }) => item.slug === 'social-hub');
        setConnector(socialHub ?? null);
        setCrmUrl(socialHub?.vendorPortalUrl ?? socialHub?.vendorWorkspaceUrl ?? null);

        if (statusResult.status === 'fulfilled') {
          setCrmStatus(statusResult.value);
          setStats(statusResult.value.stats);
          if (statusResult.value.configured && !statusResult.value.reachable) {
            setError(statusResult.value.message || 'Workspace inbox belum merespons.');
          }
        } else {
          setError('Gagal memuat status inbox.');
          setStats(null);
          setCrmStatus(null);
        }
      } catch {
        if (!cancelled) {
          setError('Gagal memuat status inbox.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const hasStoredConfig = Boolean(
    crmStatus?.configured ||
      (connector &&
        (connector.status === 'connected' ||
          connector.status === 'syncing' ||
          connector.connectionRefMasked ||
          connector.vendorWorkspaceUrl ||
          connector.vendorPortalUrl ||
          connector.workspaceName)),
  );

  if (error || !stats) {
    const statusCode = crmStatus?.status;
    const statusMsg = crmStatus?.message;
    const isNotConfigured = statusCode === 'not_configured' || !hasStoredConfig;
    const isIncomplete = statusCode === 'configuration_incomplete';
    const isDegraded = statusCode === 'degraded';

    return (
      <div className={`rounded-3xl border p-10 text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className={`mx-auto mb-4 inline-flex rounded-2xl p-4 ${isDark ? 'bg-amber-500/20' : 'bg-amber-50'}`}>
          <AlertTriangle size={36} className="text-amber-500" />
        </div>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {isNotConfigured ? 'Inbox WA belum dikonfigurasi'
            : isIncomplete ? 'Konfigurasi WA Inbox tidak lengkap'
            : isDegraded ? 'Layanan inbox belum merespons'
            : 'Inbox WA belum tersedia'}
        </h2>
        <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {statusMsg
            ? statusMsg
            : isNotConfigured
            ? 'Simpan API key workspace dari halaman Connections untuk mengaktifkan statistik inbox.'
            : 'Konfigurasi sudah ada, namun sistem belum berhasil memuat data live saat ini.'}
        </p>

        {isIncomplete && (
          <div className={`mt-4 rounded-2xl border p-4 text-left text-xs ${isDark ? 'border-slate-700 bg-slate-900/50 text-gray-300' : 'border-amber-100 bg-amber-50/60 text-amber-800'}`}>
            <p className="font-semibold mb-1">Yang perlu dilengkapi:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>API key workspace WA CRM (dari sistem WA yang digunakan)</li>
              <li>Masuk ke <strong>Connections → WA Inbox</strong> → isi field API key / Connection ref</li>
            </ul>
          </div>
        )}

        {isDegraded && (
          <div className={`mt-4 rounded-2xl border p-4 text-left text-xs ${isDark ? 'border-slate-700 bg-slate-900/50 text-gray-300' : 'border-red-50 bg-red-50 text-red-800'}`}>
            <p className="font-semibold mb-1">Info diagnostik:</p>
            <p>Status: <code>{statusCode ?? 'unknown'}</code></p>
            {crmStatus?.baseUrl && <p>URL: <code>{crmStatus.baseUrl}</code></p>}
            <p className="mt-1">Pastikan layanan WA CRM aktif dan API key masih valid.</p>
          </div>
        )}

        <p className={`mt-4 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Catatan: Inbox WA menampilkan statistik dan tombol buka workspace — bukan riwayat chat langsung. Chat tetap diakses melalui portal WA CRM.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setReloadTick((value) => value + 1)}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <Loader2 size={18} />
            Coba lagi
          </button>
          <button
            type="button"
            onClick={onSetup}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            <PlugZap size={18} />
            {hasStoredConfig ? 'Periksa Connections' : 'Lengkapi Setup'}
          </button>
          {crmUrl ? (
            <a
              href={crmUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
            >
              <ExternalLink size={18} />
              Buka inbox
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Chat aktif', value: stats.openChats },
    { label: 'Pending reply', value: stats.pendingChats },
    { label: 'Pesan belum dibaca', value: stats.totalUnread },
    { label: 'Eskalasi terbuka', value: stats.openEscalations },
    { label: 'Chat masuk hari ini', value: stats.todayChats },
    { label: 'Total kontak', value: stats.totalCustomers },
  ];

  const details = [
    { label: 'Workspace', value: connector?.workspaceName || stats.tenant?.company_name || 'Belum diatur' },
    { label: 'Email', value: connector?.vendorWorkspaceEmail || 'Belum diisi' },
    { label: 'Connection ref', value: connector?.connectionRefMasked || 'Belum diisi' },
    { label: 'Workspace URL', value: connector?.vendorPortalUrl || connector?.vendorWorkspaceUrl || 'Otomatis dari konfigurasi sistem' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        isDark={isDark}
        title="Inbox WA"
        description="Status, volume percakapan, dan akses cepat ke workspace inbox yang aktif."
        icon={<MessageSquareQuote size={22} />}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
            <p className="mt-2 text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <div className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <h3 className={`text-base font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Workspace details</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {details.map((item) => (
              <div key={item.label} className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</p>
                <p className="mt-1 text-sm font-semibold break-all">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <h3 className={`text-base font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Operasional workspace</h3>
          <div className="space-y-3 text-sm">
            {[
              `Agent aktif: ${stats.agentCount ?? stats.totalUsers}`,
              `Pesan hari ini: ${stats.todayMessages}`,
              `Session: ${stats.tenant?.session_id || 'belum aktif'}`,
            ].map((line) => (
              <div key={line} className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                {line}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSetup}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Settings size={16} />
              Connections
            </button>
            {crmUrl ? (
              <a href={crmUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                <ExternalLink size={16} />
                Buka inbox
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SocialInboxLiveView({ isDark }: { isDark: boolean }) {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<ZernioAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getZernioAccounts()
      .then((result) => setAccounts(result.filter((item) => !ADS_PLATFORMS.has(item.platform.toLowerCase()))))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  }, []);

  const groupedPlatforms = useMemo(() => {
    const groups = new Map<string, ZernioAccount[]>();
    for (const account of accounts) {
      const key = account.platform.toLowerCase();
      const bucket = groups.get(key) ?? [];
      bucket.push(account);
      groups.set(key, bucket);
    }
    return Array.from(groups.entries());
  }, [accounts]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (groupedPlatforms.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          isDark={isDark}
          title="Inbox Medsos"
          description="Sambungkan akun social untuk melihat percakapan."
          icon={<Workflow size={22} />}
        />
        <div className={`rounded-2xl border p-5 flex items-center gap-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-100'}`}>
          <PlugZap size={22} className="text-blue-500 shrink-0" />
          <p className={`text-sm flex-1 ${isDark ? 'text-gray-300' : 'text-blue-800'}`}>Belum ada akun social terhubung. Sambungkan dari <strong>Connections</strong>.</p>
          <button type="button" onClick={() => navigate('/medsos/connections')} className="shrink-0 rounded-xl bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">Buka Connections</button>
        </div>
        <ZernioConversationPanel isDark={isDark} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        isDark={isDark}
        title="Inbox Medsos"
        description={`${accounts.length} akun terhubung — klik conversation untuk buka riwayat pesan.`}
        icon={<Workflow size={22} />}
      />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 pb-1">
        {groupedPlatforms.map(([platform, platformAccounts]) => (
          <div key={platform} className={`rounded-2xl border p-4 flex items-center gap-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <BrandLogo brand={resolveBrandKey(platform)} size={36} withRing />
            <div className="min-w-0">
              <p className="font-semibold capitalize text-sm">{platform}</p>
              <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{platformAccounts.map((a) => a.username || a.displayName).join(', ')}</p>
            </div>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>Live</span>
          </div>
        ))}
      </div>
      <ZernioConversationPanel isDark={isDark} />
    </div>
  );
}

function ZernioConversationPanel({ isDark }: { isDark: boolean }) {
  const [conversations, setConversations] = useState<ZernioConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ZernioConversation | null>(null);
  const [messages, setMessages] = useState<ZernioMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [platform, setPlatform] = useState('all');
  const [refreshTick, setRefreshTick] = useState(0);

  // Setup Socket.io
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Determine backend URL
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
    socketRef.current = io(backendUrl, { withCredentials: true });

    socketRef.current.on('zernio_event', (payload: any) => {
      console.log('[Socket Event]', payload);
      // Auto-refresh messages and conversations if there's a new message
      if (
        payload.event === 'message.received' ||
        payload.event === 'message.sent' ||
        payload.event === 'comment.received'
      ) {
        setRefreshTick(t => t + 1);
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    getZernioConversations({ limit: 50, status: 'active', refresh: refreshTick > 0 })
      .then((r) => setConversations(r.conversations))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [refreshTick]);

  useEffect(() => {
    if (!selected) return;
    setMsgLoading(true);
    setMessages([]);
    getZernioMessages(selected.id, selected.accountId)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setMsgLoading(false));
  }, [selected]);

  const availablePlatforms = useMemo(() => {
    const set = new Set(conversations.map((c) => c.platform.toLowerCase()));
    return Array.from(set);
  }, [conversations]);

  const filtered = platform === 'all' ? conversations : conversations.filter((c) => c.platform.toLowerCase() === platform);

  const handleSend = async () => {
    if (!selected || !reply.trim() || sending) return;
    setSending(true);
    try {
      await sendZernioMessage(selected.id, selected.accountId, reply.trim());
      setReply('');
      toast.success('Pesan terkirim');
      const fresh = await getZernioMessages(selected.id, selected.accountId);
      setMessages(fresh);
    } catch {
      toast.error('Gagal mengirim pesan');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-gray-100 shadow-sm'}`}>
      {/* Header bar */}
      <div className={`flex items-center gap-3 px-5 py-3 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
        <MessageSquareQuote size={17} className="text-blue-500 shrink-0" />
        <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Percakapan ({filtered.length})</span>
        <div className="flex-1" />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className={`text-xs rounded-xl border px-2 py-1 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-700'}`}
        >
          <option value="all">Semua platform</option>
          {availablePlatforms.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => { setSelected(null); setRefreshTick((t) => t + 1); }}
          className={`rounded-xl p-1.5 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className={`flex h-[520px] ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
        {/* Conversation list */}
        <div className={`w-72 shrink-0 border-r overflow-y-auto ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
          {filtered.length === 0 ? (
            <div className={`p-6 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Belum ada percakapan aktif.
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setSelected(conv)}
                className={`w-full text-left px-4 py-3 border-b flex items-start gap-3 transition ${selected?.id === conv.id
                  ? (isDark ? 'bg-blue-600/20 border-slate-700' : 'bg-blue-50 border-gray-100')
                  : (isDark ? 'hover:bg-slate-700/50 border-slate-700/50' : 'hover:bg-gray-50 border-gray-100/70')
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {conv.participantPicture ? (
                    <img src={conv.participantPicture} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                      {(conv.participantName || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-semibold truncate flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{conv.participantName || conv.participantId}</span>
                    {conv.unreadCount > 0 && (
                      <span className="shrink-0 rounded-full bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">{conv.unreadCount}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <BrandLogo brand={resolveBrandKey(conv.platform)} size={12} />
                    <span className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{conv.lastMessage || '—'}</span>
                  </div>
                  <p className={`text-[10px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(conv.updatedTime).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Message thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selected ? (
            <div className={`flex-1 flex items-center justify-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Pilih percakapan di sebelah kiri
            </div>
          ) : (
            <>
              <div className={`px-5 py-3 border-b flex items-center gap-3 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                <BrandLogo brand={resolveBrandKey(selected.platform)} size={28} withRing />
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selected.participantName || selected.participantId}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>@{selected.accountUsername} · {selected.platform}</p>
                </div>
                {selected.url && (
                  <a href={selected.url} target="_blank" rel="noreferrer" className={`ml-auto shrink-0 rounded-xl p-1.5 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {msgLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
                ) : messages.length === 0 ? (
                  <p className={`text-sm text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Belum ada pesan dimuat.</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.fromParticipant ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                        msg.fromParticipant
                          ? (isDark ? 'bg-slate-700 text-gray-100' : 'bg-gray-100 text-gray-900')
                          : 'bg-blue-600 text-white'
                      }`}>
                        {msg.text || <em className="opacity-60">[media]</em>}
                        <p className={`text-[10px] mt-1 ${msg.fromParticipant ? (isDark ? 'text-gray-500' : 'text-gray-400') : 'text-blue-200'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className={`px-4 py-3 border-t flex items-end gap-2 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                  placeholder="Ketik balasan… (Enter untuk kirim)"
                  rows={2}
                  className={`flex-1 resize-none rounded-2xl border px-3 py-2 text-sm ${isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!reply.trim() || sending}
                  className="shrink-0 rounded-2xl bg-blue-600 p-2.5 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MarketplaceChannelCard({ channel, isDark }: { channel: MarketplaceChatChannel; isDark: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-center gap-3">
        <BrandLogo brand={resolveBrandKey(channel.source)} size={38} className="rounded-2xl" withRing />
        <div>
          <p className="font-semibold">{channel.name}</p>
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{channel.source}</p>
        </div>
      </div>
    </div>
  );
}

function MarketplaceInboxLiveView({ isDark }: { isDark: boolean }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<MarketplaceHubConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMarketplaceHubStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const channels = status?.channels ?? [];

  if (!status?.configured) {
    return (
      <div className="space-y-6">
        <SectionHeader
          isDark={isDark}
          title="Inbox Marketplace"
          description="Buyer chat marketplace yang aktif akan muncul di sini setelah workspace siap."
          icon={<Store size={22} />}
        />
        <div className={`rounded-3xl border p-10 text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className={`mx-auto mb-4 inline-flex rounded-2xl p-4 ${isDark ? 'bg-slate-900 text-orange-300' : 'bg-orange-50 text-orange-600'}`}>
            <Store size={34} />
          </div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Inbox marketplace belum aktif</h2>
          <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Simpan konfigurasi workspace marketplace di halaman Connections dulu.
          </p>
          <button
            type="button"
            onClick={() => navigate('/medsos/connections')}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            <PlugZap size={18} />
            Buka Connections
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        isDark={isDark}
        title="Inbox Marketplace"
        description="Hanya channel marketplace yang benar-benar tersambung yang akan tampil di halaman ini."
        icon={<Store size={22} />}
      />

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: 'Workspace', value: status.workspaceName || 'Marketplace AI', helper: 'workspace aktif' },
          { label: 'Channel aktif', value: String(channels.length), helper: 'buyer chat siap masuk' },
          { label: 'Status', value: status.reachable ? 'Healthy' : 'Needs check', helper: status.message },
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
            <p className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <div className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-4">
            <Store size={16} className="text-orange-500" />
            <h3 className="font-bold text-lg">Channel marketplace yang tampil</h3>
            <FieldHelp title="Channel marketplace" description="Hanya channel yang benar-benar tersambung ke workspace marketplace yang akan tampil di inbox dan analytics marketplace." />
          </div>
          {channels.length === 0 ? (
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/50 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
              Belum ada channel marketplace aktif.
            </div>
          ) : (
            <div className="grid gap-3">
              {channels.map((channel) => (
                <MarketplaceChannelCard key={channel.id} channel={channel} isDark={isDark} />
              ))}
            </div>
          )}
        </div>

        <div className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-4">
            <Bot size={16} className="text-blue-500" />
            <h3 className="font-bold text-lg">Alur operasional</h3>
          </div>
          <div className="space-y-3 text-sm">
            {[
              'Buyer chat yang aktif akan masuk ke dashboard ini setelah koneksi siap.',
              'AI agent bisa menjawab pertanyaan awal sebelum diambil alih operator.',
              'Channel yang belum terhubung tidak akan muncul di inbox maupun analytics marketplace.',
            ].map((item) => (
              <div key={item} className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/50 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoInboxWorkspace({ channel, isDark }: { channel: InboxChannel; isDark: boolean }) {
  const dataThreads = useMemo(() => {
    if (channel === 'social') return priorityThreads.filter((item) => item.kind === 'social');
    if (channel === 'marketplace') return priorityThreads.filter((item) => item.kind === 'marketplace');
    return demoWaThreads;
  }, [channel]);

  const allDetails = useMemo<Record<number, ThreadDetail>>(() => ({ ...threadDetails, ...demoWaDetails }), []);
  const allMessages = useMemo<Record<number, ConversationMessage[]>>(() => ({ ...conversationMessages, ...demoWaMessages }), []);
  const [selectedThreadId, setSelectedThreadId] = useState<number>(dataThreads[0]?.id ?? 0);
  const [reply, setReply] = useState('');
  const [activeFilter, setActiveFilter] = useState(channel === 'marketplace' ? 'marketplace' : channel === 'social' ? 'social' : 'all');

  useEffect(() => {
    setSelectedThreadId(dataThreads[0]?.id ?? 0);
    setReply('');
    setActiveFilter(channel === 'marketplace' ? 'marketplace' : channel === 'social' ? 'social' : 'all');
  }, [channel, dataThreads]);

  const selectedChat = dataThreads.find((item) => item.id === selectedThreadId) ?? dataThreads[0];
  const selectedDetail = selectedChat ? allDetails[selectedChat.id] : null;
  const selectedMessages = selectedChat ? allMessages[selectedChat.id] ?? [] : [];
  const assignedSeat = selectedChat ? teamSeats.find((member) => member.name === selectedChat.assignee) : null;

  const filterTabs = channel === 'marketplace'
    ? [...inboxFilters.filter((item) => ['all', 'urgent'].includes(item.id)), { id: 'marketplace', label: 'Marketplace', count: 12, tone: 'orange' as const }]
    : channel === 'social'
      ? [...inboxFilters.filter((item) => ['all', 'assigned'].includes(item.id)), { id: 'social', label: 'Medsos', count: 14, tone: 'blue' as const }]
      : inboxFilters.filter((item) => ['all', 'assigned', 'urgent'].includes(item.id));

  const toneClasses = {
    high: 'bg-red-100 text-red-600',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-emerald-100 text-emerald-600',
  } as const;

  if (!selectedChat || !selectedDetail) {
    return null;
  }

  const templateMatches = replyTemplates.filter((template) => {
    const templateChannel = template.channel.toLowerCase();
    const selectedChannel = selectedChat.channel.toLowerCase();
    if (channel === 'wa') {
      return templateChannel.includes('whatsapp') || templateChannel.includes('reservation');
    }
    return templateChannel.includes(selectedChannel);
  });

  return (
    <div className={`h-[calc(100vh-100px)] grid lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_320px] rounded-3xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
      <aside className={`border-r flex flex-col ${isDark ? 'border-slate-700 bg-slate-850' : 'border-gray-200 bg-white'}`}>
        <div className="p-4 border-b dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <p className={`text-[11px] uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{titleByChannel(channel)}</p>
                <FieldHelp title={titleByChannel(channel)} description={descriptionByChannel(channel)} />
              </div>
              <h2 className="text-lg font-bold">Queue & Response Desk</h2>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-slate-700 text-gray-200' : 'bg-blue-50 text-blue-600'}`}>
              {channel === 'wa' ? '5 pesan masuk' : channel === 'social' ? '3 percakapan aktif' : '4 buyer chat aktif'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {filterTabs.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  activeFilter === filter.id
                    ? 'bg-blue-600 text-white'
                    : isDark
                      ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari thread / buyer / order..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {dataThreads.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => setSelectedThreadId(chat.id)}
              className={`w-full text-left p-4 border-b transition ${
                selectedThreadId === chat.id
                  ? isDark
                    ? 'bg-slate-700 border-slate-600'
                    : 'bg-blue-50 border-blue-100'
                  : isDark
                    ? 'border-slate-700 hover:bg-slate-700/40'
                    : 'border-gray-100 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <BrandLogo brand={resolveBrandKey(chat.channel)} size={38} className="rounded-2xl px-1" withRing />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{chat.customer}</p>
                      <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{chat.channel} • {chat.subject}</p>
                    </div>
                    <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{chat.time}</span>
                  </div>
                  <p className={`mt-2 text-xs line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{chat.snippet}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`text-[10px] px-2 py-1 rounded-full ${toneClasses[chat.priority]}`}>{chat.priority}</span>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${isDark ? 'bg-slate-800 text-gray-300' : 'bg-white text-gray-600'}`}>{chat.assignee}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className={`flex flex-col min-w-0 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-3">
            <BrandLogo brand={resolveBrandKey(selectedChat.channel)} size={44} className="rounded-2xl px-1" withRing />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedChat.customer}</h3>
                <span className={`text-[10px] px-2 py-1 rounded-full ${toneClasses[selectedChat.priority]}`}>SLA {selectedChat.sla}</span>
                <span className={`text-[10px] px-2 py-1 rounded-full ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{selectedDetail.customerTier}</span>
              </div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Via {selectedChat.channel} • assignee {selectedChat.assignee} • prefer {selectedDetail.preferredChannel}
              </p>
            </div>
          </div>
        </div>

        <div className={`px-6 py-3 border-b flex flex-wrap items-center gap-2 ${isDark ? 'border-slate-700 bg-slate-900/30' : 'border-gray-100 bg-gray-50'}`}>
          {selectedChat.tags.map((tag) => (
            <span key={tag} className={`text-[11px] px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
              <Tag size={12} /> {tag}
            </span>
          ))}
          <span className={`text-[11px] px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
            <ShieldAlert size={12} /> Sentiment {selectedDetail.sentiment}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid md:grid-cols-3 gap-4 mb-5">
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Customer value</p>
              <p className="mt-2 text-xl font-bold">{selectedDetail.lifetimeValue}</p>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Response target</p>
              <p className="mt-2 text-xl font-bold">{selectedChat.sla}</p>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Assigned seat</p>
              <p className="mt-2 text-xl font-bold">{selectedChat.assignee}</p>
            </div>
          </div>

          <div className={`mb-5 rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/70' : 'border-orange-100 bg-orange-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert size={16} className="text-orange-500" />
              <p className="font-semibold text-sm">Thread summary</p>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedDetail.summary}</p>
          </div>

          <div className="space-y-4">
            {selectedMessages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${
                    message.sender === 'me'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : message.sender === 'system'
                        ? isDark
                          ? 'bg-amber-500/10 text-amber-200 border border-amber-500/20'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                        : isDark
                          ? 'bg-slate-700 text-white rounded-tl-sm'
                          : 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100'
                  }`}
                >
                  {message.text}
                  <p className={`mt-2 text-[10px] text-right ${message.sender === 'me' ? 'text-blue-200' : isDark ? 'text-gray-400' : 'text-gray-400'}`}>{message.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-4 border-t ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedDetail.macros.map((macro) => (
              <button key={macro} type="button" className={`px-3 py-1.5 rounded-full text-xs font-medium ${isDark ? 'bg-slate-700 text-gray-200 hover:bg-slate-600' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                {macro}
              </button>
            ))}
          </div>
          <div className={`mb-3 rounded-2xl border p-3 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="mb-2 flex items-center gap-2">
              <NotebookPen size={15} className="text-purple-500" />
              <p className="text-sm font-semibold">Internal note</p>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedDetail.internalNotes[0]}</p>
          </div>
          <div className={`flex items-center gap-2 rounded-2xl border px-2 py-2 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
            <button type="button" title="Lampirkan file" className="p-2 text-gray-400 hover:text-gray-600">
              <Paperclip size={20} />
            </button>
            <input
              type="text"
              placeholder="Ketik balasan..."
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}
            />
            <button type="button" title="Emoji" className="p-2 text-gray-400 hover:text-gray-600">
              <Smile size={20} />
            </button>
            <button type="button" title="Kirim" className="rounded-xl bg-blue-600 p-2 text-white hover:bg-blue-700">
              <Send size={18} />
            </button>
          </div>
        </div>
      </main>

      <aside className={`hidden xl:flex flex-col ${isDark ? 'bg-slate-850' : 'bg-gray-50/70'}`}>
        <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <h3 className="font-bold text-lg">Customer Context</h3>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ringkasan cepat untuk operator sebelum membalas.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className={`rounded-2xl p-4 border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-3 mb-3">
              <BrandLogo brand={resolveBrandKey(selectedChat.channel)} size={42} className="rounded-2xl px-1" withRing />
              <div>
                <p className="font-semibold">{selectedChat.customer}</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{selectedDetail.customerTier} • {selectedDetail.preferredChannel}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Lifetime value</p>
                <p className="font-semibold">{selectedDetail.lifetimeValue}</p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sentiment</p>
                <p className="font-semibold capitalize">{selectedDetail.sentiment}</p>
              </div>
            </div>
          </div>

          {selectedDetail.orderContext ? (
            <div className={`rounded-2xl p-4 border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
              <p className="font-semibold">Order context</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Order</span><span className="font-semibold">{selectedDetail.orderContext.orderId}</span></div>
                <div className="flex justify-between"><span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Amount</span><span className="font-semibold">{selectedDetail.orderContext.amount}</span></div>
                <div className="flex justify-between"><span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</span><span className="font-semibold">{selectedDetail.orderContext.status}</span></div>
              </div>
            </div>
          ) : null}

          <div className={`rounded-2xl p-4 border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-2 mb-3">
              <Bot size={16} className="text-blue-500" />
              <p className="font-semibold">Template reply</p>
            </div>
            <div className="space-y-2">
              {templateMatches.slice(0, 2).map((template) => (
                <div key={template.id} className={`rounded-xl p-3 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                  <p className="text-sm font-semibold">{template.title}</p>
                  <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{template.preview}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl p-4 border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-2 mb-3">
              <UserRoundCheck size={16} className="text-emerald-500" />
              <p className="font-semibold">Assign to staff</p>
            </div>
            {assignedSeat ? (
              <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-900/50' : 'bg-blue-50'}`}>
                <p className="font-semibold text-sm">{assignedSeat.name}</p>
                <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{assignedSeat.role} • {assignedSeat.shift}</p>
                <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Workload: {assignedSeat.workload}</p>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function MedsosInbox() {
  const { isDark } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { channel } = useParams();
  const normalizedChannel = normalizeInboxChannel(channel);
  const isDemo = location.pathname.startsWith('/demo');

  if (!isDemo) {
    return (
      <div className={`rounded-3xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        {normalizedChannel === 'social' ? (
          <SocialInboxLiveView isDark={isDark} />
        ) : normalizedChannel === 'marketplace' ? (
          <MarketplaceInboxLiveView isDark={isDark} />
        ) : (
          <WACrmPanel isDark={isDark} onSetup={() => navigate('/medsos/connections')} />
        )}
      </div>
    );
  }

  return <DemoInboxWorkspace channel={normalizedChannel} isDark={isDark} />;
}
