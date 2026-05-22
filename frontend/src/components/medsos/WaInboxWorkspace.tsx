import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  ExternalLink,
  Loader2,
  MessageSquareQuote,
  Paperclip,
  Phone,
  PlugZap,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Smile,
  Sparkles,
  UserRoundCheck,
  Wifi,
} from 'lucide-react';
import {
  generateAiReply,
  getWACrmConversations,
  getWACrmMessages,
  getWACrmStatus,
  sendWACrmMessage,
  type WACrmConnectionStatus,
  type WACrmConversation,
  type WACrmMessage,
  type WACrmStats,
} from '../../services/medsosPostsService';
import { getMyCommerSocialIntegrationHub, type ManagedIntegrationConnector } from '../../services/myCommerSocialIntegrations';
import { replyTemplates } from '../../data/omnichannelMock';
import { BrandLogo } from './BrandLogo';

type FilterTab = 'all' | 'unread' | 'pending' | 'escalation';

function formatRelativeTime(value?: string | null) {
  if (!value) return 'Baru saja';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Baru saja';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function compactPhone(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  if (raw.length <= 8) return raw;
  return `${raw.slice(0, 4)} ${raw.slice(4, 8)}${raw.length > 8 ? ` ${raw.slice(8)}` : ''}`;
}

function statusLabel(status?: string | null) {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return 'Aktif';
    case 'pending':
      return 'Pending';
    case 'escalation':
      return 'Eskalasi';
    case 'inactive':
      return 'Closed';
    default:
      return 'Unknown';
  }
}

function statusTone(status: string, isDark: boolean) {
  switch (status) {
    case 'active':
      return isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700';
    case 'pending':
      return isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700';
    case 'escalation':
      return isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-700';
    case 'inactive':
      return isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600';
    default:
      return isDark ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600';
  }
}

function messageLooksLikePlaceholder(message: WACrmMessage) {
  return /^\[[A-Z_]+\]$/.test((message.body || '').trim());
}

function messagePreview(message: WACrmMessage) {
  if (message.media_url && message.message_type === 'image') return 'Gambar';
  if (message.media_url && message.message_type === 'video') return 'Video';
  if (message.media_url && message.message_type === 'document') return 'Dokumen';
  if (message.media_url && message.message_type === 'audio') return 'Audio';
  return message.body || 'Pesan';
}

function SetupState({
  isDark,
  title,
  description,
  status,
  crmUrl,
  onReload,
  onSetup,
}: {
  isDark: boolean;
  title: string;
  description: string;
  status: WACrmConnectionStatus | null;
  crmUrl: string | null;
  onReload: () => void;
  onSetup: () => void;
}) {
  return (
    <div className={`rounded-[32px] p-10 text-center ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
      <div className={`mx-auto mb-4 inline-flex rounded-2xl p-4 ${isDark ? 'bg-amber-500/20' : 'bg-amber-50'}`}>
        <AlertTriangle size={36} className="text-amber-500" />
      </div>
      <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
      <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>

      {status ? (
        <div className={`mt-4 rounded-[24px] p-4 text-left text-xs ${isDark ? 'border-slate-700 bg-slate-900/50 text-gray-300' : 'border-red-50 bg-red-50 text-red-800'}`}>
          <p className="font-semibold mb-1">Info diagnostik:</p>
          <p>Status: <code>{status.status}</code></p>
          {status.baseUrl ? <p>URL: <code>{status.baseUrl}</code></p> : null}
          <p className="mt-1">Masuk ke <strong>Connections → WA Inbox</strong> untuk cek API key dan workspace.</p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onReload}
          className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          <RefreshCw size={18} />
          Coba lagi
        </button>
        <button
          type="button"
          onClick={onSetup}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all"
        >
          <PlugZap size={18} />
          Buka Connections
        </button>
        {crmUrl ? (
          <a
            href={crmUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
          >
            <ExternalLink size={18} />
            Buka workspace lama
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function WaInboxWorkspace({
  isDark,
  onSetup,
}: {
  isDark: boolean;
  onSetup: () => void;
}) {
  const [stats, setStats] = useState<WACrmStats | null>(null);
  const [crmStatus, setCrmStatus] = useState<WACrmConnectionStatus | null>(null);
  const [connector, setConnector] = useState<ManagedIntegrationConnector | null>(null);
  const [crmUrl, setCrmUrl] = useState<string | null>(null);
  const [conversations, setConversations] = useState<WACrmConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [messages, setMessages] = useState<WACrmMessage[]>([]);
  const [reply, setReply] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list');
  const [metaLoading, setMetaLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(true);
  const [conversationRefreshing, setConversationRefreshing] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageRefreshing, setMessageRefreshing] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [messageCursor, setMessageCursor] = useState<string | null>(null);
  const activeChatIdRef = useRef<string>('');

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = window.setInterval(() => setReloadTick((value) => value + 1), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMetaLoading(true);

    (async () => {
      try {
        const [statusResult, hubResult] = await Promise.allSettled([
          getWACrmStatus(),
          getMyCommerSocialIntegrationHub(),
        ]);

        if (cancelled) return;

        if (statusResult.status === 'fulfilled') {
          setCrmStatus(statusResult.value);
          setStats(statusResult.value.stats);
          setWarning(statusResult.value.status === 'degraded' ? (statusResult.value.message || null) : null);
        } else {
          setCrmStatus(null);
          setStats(null);
          setWarning('Gagal memuat status WA Inbox.');
        }

        if (hubResult.status === 'fulfilled') {
          const socialHub = hubResult.value.connectors.find((item) => item.slug === 'social-hub') || null;
          setConnector(socialHub);
          setCrmUrl(socialHub?.vendorPortalUrl ?? socialHub?.vendorWorkspaceUrl ?? null);
        } else {
          setConnector(null);
          setCrmUrl(null);
        }
      } finally {
        if (!cancelled) {
          setMetaLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  useEffect(() => {
    let cancelled = false;
    const shouldShowConversationLoader = conversations.length === 0;
    if (shouldShowConversationLoader) {
      setConversationLoading(true);
    } else {
      setConversationRefreshing(true);
    }

    getWACrmConversations({
      limit: 150,
      offset: 0,
      search: searchTerm || undefined,
    })
      .then((result) => {
        if (cancelled) return;
        setConversations(result.conversations);
        setSelectedConversationId((current) => {
          if (current && result.conversations.some((item) => item.id === current)) {
            return current;
          }
          return result.conversations[0]?.id || '';
        });
      })
      .catch((error: any) => {
        if (cancelled) return;
        setConversations([]);
        setSelectedConversationId('');
        setWarning(error?.response?.data?.error?.message || error?.message || 'Gagal memuat daftar percakapan WA.');
      })
      .finally(() => {
        if (!cancelled) {
          setConversationLoading(false);
          setConversationRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadTick, searchTerm]);

  const visibleConversations = useMemo(() => {
    return conversations.filter((item) => {
      if (filterTab === 'unread' && item.unread_count <= 0) return false;
      if (filterTab === 'pending' && item.status !== 'pending') return false;
      if (filterTab === 'escalation' && item.status !== 'escalation') return false;
      return true;
    });
  }, [conversations, filterTab]);

  const selectedConversation = useMemo(() => {
    return conversations.find((item) => item.id === selectedConversationId) || visibleConversations[0] || null;
  }, [conversations, selectedConversationId, visibleConversations]);

  useEffect(() => {
    if (!selectedConversation?.chat_id) {
      setMessages([]);
      setMessageCursor(null);
      setMessageLoading(false);
      setMessageRefreshing(false);
      setLoadingOlderMessages(false);
      activeChatIdRef.current = '';
      return;
    }

    let cancelled = false;
    const isSameChat = activeChatIdRef.current === selectedConversation.chat_id;
    const shouldShowMessageLoader = !isSameChat || messages.length === 0;

    if (shouldShowMessageLoader) {
      setMessageLoading(true);
    } else {
      setMessageRefreshing(true);
    }

    getWACrmMessages(selectedConversation.chat_id, { limit: 80 })
      .then((result) => {
        if (!cancelled) {
          setMessages(result.messages);
          setMessageCursor(result.meta.before);
          activeChatIdRef.current = selectedConversation.chat_id || '';
        }
      })
      .catch((error: any) => {
        if (!cancelled) {
          setMessages([]);
          setMessageCursor(null);
          setWarning(error?.response?.data?.error?.message || error?.message || 'Gagal memuat isi percakapan WA.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMessageLoading(false);
          setMessageRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedConversation?.chat_id, reloadTick]);

  const hasOlderMessages = Boolean(messageCursor);

  const handleLoadOlderMessages = async () => {
    if (!selectedConversation?.chat_id || !messageCursor || loadingOlderMessages) return;

    setLoadingOlderMessages(true);
    try {
      const result = await getWACrmMessages(selectedConversation.chat_id, {
        limit: 80,
        before: messageCursor,
      });

      setMessages((current) => {
        const seen = new Set(current.map((item) => item.id));
        const older = result.messages.filter((item) => !seen.has(item.id));
        return older.concat(current);
      });
      setMessageCursor(result.meta.before);
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || error?.message || 'Gagal memuat pesan lama.');
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  const filterTabs = useMemo(() => ([
    { id: 'all' as const, label: 'Semua', count: conversations.length },
    { id: 'unread' as const, label: 'Unread', count: conversations.filter((item) => item.unread_count > 0).length },
    { id: 'pending' as const, label: 'Pending', count: conversations.filter((item) => item.status === 'pending').length },
    { id: 'escalation' as const, label: 'Eskalasi', count: conversations.filter((item) => item.status === 'escalation').length },
  ]), [conversations]);

  const topStats = useMemo(() => ([
    {
      label: 'Chat aktif',
      value: stats?.openChats ?? conversations.filter((item) => item.status === 'active').length,
      helper: 'Percakapan yang masih hidup',
      tone: isDark ? 'from-emerald-500/15 to-transparent text-emerald-300' : 'from-emerald-50 to-white text-emerald-700',
      icon: MessageSquareQuote,
    },
    {
      label: 'Pending reply',
      value: stats?.pendingChats ?? conversations.filter((item) => item.status === 'pending').length,
      helper: 'Butuh balasan cepat',
      tone: isDark ? 'from-amber-500/15 to-transparent text-amber-300' : 'from-amber-50 to-white text-amber-700',
      icon: Bot,
    },
    {
      label: 'Belum dibaca',
      value: stats?.totalUnread ?? conversations.reduce((total, item) => total + item.unread_count, 0),
      helper: 'Beban inbox saat ini',
      tone: isDark ? 'from-blue-500/15 to-transparent text-blue-300' : 'from-blue-50 to-white text-blue-700',
      icon: Sparkles,
    },
    {
      label: 'Eskalasi',
      value: stats?.openEscalations ?? conversations.filter((item) => item.status === 'escalation').length,
      helper: 'Kasus yang perlu perhatian',
      tone: isDark ? 'from-rose-500/15 to-transparent text-rose-300' : 'from-rose-50 to-white text-rose-700',
      icon: ShieldAlert,
    },
  ]), [stats, conversations, isDark]);

  const selectedHighlights = useMemo(() => {
    if (!selectedConversation) return [];
    return [
      {
        label: 'Status',
        value: statusLabel(selectedConversation.status),
        helper: selectedConversation.is_group ? 'Thread group WA' : 'Thread direct WA',
        icon: ShieldAlert,
      },
      {
        label: 'Unread',
        value: selectedConversation.unread_count,
        helper: 'Belum dijawab penuh',
        icon: Sparkles,
      },
      {
        label: 'Update terakhir',
        value: formatRelativeTime(selectedConversation.last_message_at),
        helper: 'Aktivitas terakhir customer',
        icon: RefreshCw,
      },
    ];
  }, [selectedConversation]);

  const templateMatches = useMemo(() => {
    return replyTemplates.filter((template) => {
      const channel = template.channel.toLowerCase();
      return channel.includes('whatsapp') || channel.includes('reservation');
    });
  }, []);

  const handleSelectConversation = (conversation: WACrmConversation) => {
    setSelectedConversationId(conversation.id);
    setMobilePane('chat');
  };

  const handleAiReply = async () => {
    if (!selectedConversation || messages.length === 0) return;
    setSending(true);
    try {
      const context = messages
        .slice(-6)
        .map((message) => `${message.is_from_me ? 'Agent' : 'Customer'}: ${messagePreview(message)}`)
        .join('\n');
      const suggestion = await generateAiReply(context);
      setReply(suggestion);
      toast.success('Draft AI siap dipakai.');
    } catch (error: any) {
      toast.error(error?.message || 'Gagal membuat draft balasan AI.');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!selectedConversation || !reply.trim() || sending) return;

    const receiver = selectedConversation.jid || selectedConversation.phone;
    if (!receiver) {
      toast.error('Nomor tujuan belum tersedia di percakapan ini.');
      return;
    }

    setSending(true);
    try {
      const result = await sendWACrmMessage({
        receiver,
        phone: selectedConversation.phone,
        message: reply.trim(),
      });

      const sentAt = result.sentAt || new Date().toISOString();
      const chatId = result.chatId || selectedConversation.chat_id;
      setReply('');

      setConversations((current) => current.map((item) => (
        item.id === selectedConversation.id
          ? {
              ...item,
              chat_id: chatId || item.chat_id,
              last_message: reply.trim(),
              last_message_at: sentAt,
            }
          : item
      )));

      if (chatId) {
        const fresh = await getWACrmMessages(chatId, { limit: 80 });
        setMessages(fresh.messages);
        setMessageCursor(fresh.meta.before);
        activeChatIdRef.current = chatId;
      } else {
        setMessages((current) => current.concat({
          id: `local-${Date.now()}`,
          chat_id: chatId || selectedConversation.chat_id || '',
          sender_type: 'agent',
          sender_id: null,
          sender_name: 'OmniPilot AI',
          message_type: 'text',
          body: reply.trim(),
          media_url: null,
          wa_message_id: null,
          is_from_me: true,
          status: 'sent',
          created_at: sentAt,
        }));
      }

      toast.success('Pesan WA terkirim dari dashboard ini.');
      setReloadTick((value) => value + 1);
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || error?.message || 'Gagal mengirim pesan WA.');
    } finally {
      setSending(false);
    }
  };

  const hasStoredConfig = Boolean(
    crmStatus?.configured ||
    (connector && (
      connector.status === 'connected'
      || connector.status === 'syncing'
      || connector.connectionRefMasked
      || connector.vendorPortalUrl
      || connector.vendorWorkspaceUrl
      || connector.workspaceName
    )),
  );

  if (metaLoading && conversationLoading) {
    return (
      <div className="min-h-[45vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!hasStoredConfig || crmStatus?.status === 'not_configured') {
    return (
      <SetupState
        isDark={isDark}
        title="Inbox WA belum dikonfigurasi"
        description="Simpan API key workspace di Connections agar semua percakapan WA tampil langsung di dashboard OmniPilot AI."
        status={crmStatus}
        crmUrl={crmUrl}
        onReload={() => setReloadTick((value) => value + 1)}
        onSetup={onSetup}
      />
    );
  }

  if (crmStatus?.status === 'configuration_incomplete') {
    return (
      <SetupState
        isDark={isDark}
        title="Konfigurasi WA Inbox belum lengkap"
        description={crmStatus.message || 'Lengkapi API key dan backend workspace supaya percakapan WA bisa ditarik ke dashboard ini.'}
        status={crmStatus}
        crmUrl={crmUrl}
        onReload={() => setReloadTick((value) => value + 1)}
        onSetup={onSetup}
      />
    );
  }

  if (!conversationLoading && conversations.length === 0) {
    return (
      <SetupState
        isDark={isDark}
        title="Belum ada percakapan WA yang bisa ditarik"
        description={warning || 'Workspace sudah tersambung, tetapi belum ada chat aktif yang tersedia untuk ditampilkan di dashboard ini.'}
        status={crmStatus}
        crmUrl={crmUrl}
        onReload={() => setReloadTick((value) => value + 1)}
        onSetup={onSetup}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-[30px] px-4 py-4 md:px-5 md:py-4 ${isDark ? 'bg-[#111318] ring-1 ring-white/10 shadow-[0_20px_50px_rgba(15,23,42,0.26)]' : 'bg-white border border-gray-100 shadow-[0_18px_50px_rgba(15,23,42,0.08)]'}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex items-start gap-3">
            <div className={`rounded-2xl p-3 ${isDark ? 'bg-slate-900 text-emerald-300 ring-1 ring-white/10' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'}`}>
              <MessageSquareQuote size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Inbox WA</h1>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${crmStatus?.reachable ? (isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700') : (isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700')}`}>
                  <Wifi size={11} />
                  {crmStatus?.reachable ? 'Tersambung' : 'Perlu cek'}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                  {connector?.workspaceName || stats?.tenant?.company_name || 'WA Inbox'}
                </span>
              </div>
              <p className={`mt-1.5 text-xs md:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Fokuskan kerja ke antrean, metrik, dan balasan chat — tanpa pindah portal.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-gray-50 text-slate-600 border border-slate-200'}`}>
                  Session {stats?.tenant?.session_id || 'belum aktif'}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-gray-50 text-slate-600 border border-slate-200'}`}>
                  Queue {conversations.length}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-gray-50 text-slate-600 border border-slate-200'}`}>
                  AI Ready
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button
              type="button"
              onClick={() => setReloadTick((value) => value + 1)}
              className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <RefreshCw size={15} className={conversationLoading || conversationRefreshing || messageRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={onSetup}
              className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <Settings size={15} />
              Connections
            </button>
            {crmUrl ? (
              <a
                href={crmUrl}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold ${isDark ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
              >
                <ExternalLink size={15} />
                Portal lama
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {warning ? (
        <div className={`rounded-[24px] px-4 py-3 text-sm ${isDark ? 'bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/20' : 'bg-amber-50 text-amber-800 border border-amber-100'}`}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{warning}</span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {topStats.map((card) => (
          <div key={card.label} className={`rounded-[22px] p-3.5 md:p-4 bg-gradient-to-br ${card.tone} ${isDark ? 'ring-1 ring-white/10 shadow-[0_16px_30px_rgba(15,23,42,0.18)]' : 'border border-gray-100 shadow-[0_12px_32px_rgba(15,23,42,0.05)]'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-[11px] uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
                <p className="mt-2 text-xl md:text-2xl font-bold tracking-tight">{card.value}</p>
              </div>
              <div className={`rounded-2xl p-2 ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                <card.icon size={16} />
              </div>
            </div>
            <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="lg:hidden flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobilePane('list')}
          className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold ${mobilePane === 'list' ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-gray-300' : 'bg-white text-gray-700 border border-gray-200'}`}
        >
          Daftar chat
        </button>
        <button
          type="button"
          onClick={() => setMobilePane('chat')}
          disabled={!selectedConversation}
          className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold ${mobilePane === 'chat' ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-gray-300' : 'bg-white text-gray-700 border border-gray-200'} disabled:opacity-50`}
        >
          Percakapan
        </button>
      </div>

      <div className={`h-[calc(100dvh-220px)] min-h-[720px] grid lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_320px] rounded-[36px] border overflow-hidden ${isDark ? 'bg-[#111318] ring-1 ring-white/10 shadow-[0_32px_100px_rgba(15,23,42,0.32)]' : 'bg-white border-gray-200 shadow-[0_26px_90px_rgba(15,23,42,0.10)]'}`}>
        <aside className={`${mobilePane === 'chat' ? 'hidden lg:flex' : 'flex'} relative flex-col border-r ${isDark ? 'border-slate-700 bg-slate-950/55' : 'bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] border-gray-100'}`}>
          {!isDark ? <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_70%)]" /> : null}
          <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={`text-[11px] uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>WA Inbox</p>
                <h2 className="text-lg font-bold">Queue & Response Desk</h2>
              </div>
              <div className="flex items-center gap-2">
                {conversationRefreshing ? (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                    Syncing
                  </span>
                ) : null}
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-slate-800 text-gray-200' : 'bg-blue-50 text-blue-600'}`}>
                  {visibleConversations.length} aktif
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    filterTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : isDark
                        ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Cari nama, nomor, atau chat..."
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {conversationLoading ? (
              <div className="py-14 flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
              </div>
            ) : visibleConversations.length === 0 ? (
              <div className="py-14 px-4 text-center">
                <MessageSquareQuote size={36} className="mx-auto mb-3 opacity-20" />
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tidak ada percakapan untuk filter ini.</p>
              </div>
            ) : (
              visibleConversations.map((conversation) => {
                const active = selectedConversation?.id === conversation.id;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => handleSelectConversation(conversation)}
                    className={`group relative w-full text-left p-4 rounded-[24px] border transition ${
                      active
                        ? isDark
                          ? 'bg-slate-800 border-blue-500/30 shadow-[0_18px_50px_rgba(37,99,235,0.15)]'
                          : 'bg-blue-50/80 border-blue-200 shadow-[0_18px_40px_rgba(37,99,235,0.10)]'
                        : isDark
                          ? 'border-slate-800 hover:bg-slate-800/70'
                          : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    {active ? <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-blue-500" /> : null}
                    <div className="flex items-start gap-3">
                      {conversation.profile_pic_url ? (
                        <img src={conversation.profile_pic_url} alt={conversation.name} className="w-11 h-11 rounded-2xl object-cover" />
                      ) : (
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold ${isDark ? 'bg-slate-700 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                          {(conversation.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{conversation.name}</p>
                              {conversation.is_group ? (
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-500 border border-slate-200'}`}>
                                  Group
                                </span>
                              ) : null}
                            </div>
                            <p className={`text-[11px] truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{compactPhone(conversation.phone)}{conversation.is_group ? ' • Group' : ''}</p>
                          </div>
                          <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatRelativeTime(conversation.last_message_at)}</span>
                        </div>
                        <p className={`mt-2 text-xs line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{conversation.last_message || 'Belum ada preview pesan'}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={`text-[10px] px-2 py-1 rounded-full ${statusTone(conversation.status, isDark)}`}>{statusLabel(conversation.status)}</span>
                          {conversation.unread_count > 0 ? (
                            <span className={`text-[10px] px-2 py-1 rounded-full ${isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                              {conversation.unread_count} unread
                            </span>
                          ) : null}
                          {conversation.assigned_agent ? (
                            <span className={`text-[10px] px-2 py-1 rounded-full ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
                              {conversation.assigned_agent}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className={`${mobilePane === 'list' ? 'hidden lg:flex' : 'flex'} relative flex-col min-w-0 ${isDark ? 'bg-slate-900' : 'bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_42%),linear-gradient(180deg,#f8fafc_0%,#f3f6fb_100%)]'}`}>
          {!isDark ? <div className="pointer-events-none absolute inset-x-0 top-0 h-60 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_58%)]" /> : null}
          {!selectedConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className={`mb-6 rounded-full p-6 ${isDark ? 'bg-slate-800' : 'bg-gray-50'}`}>
                <MessageSquareQuote size={48} className="text-blue-500 opacity-20" />
              </div>
              <h3 className="text-lg font-bold mb-2">Pilih percakapan WA</h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">Semua reply WA sekarang bisa dikirim langsung dari dashboard ini.</p>
            </div>
          ) : (
            <>
              <div className={`relative z-[1] px-4 md:px-6 py-4 border-b backdrop-blur-sm ${isDark ? 'border-slate-700 bg-[#111318]/95' : 'bg-white/90 border-gray-100'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setMobilePane('list')}
                      className={`lg:hidden inline-flex items-center justify-center rounded-xl p-2 ${isDark ? 'bg-slate-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    {selectedConversation.profile_pic_url ? (
                      <img src={selectedConversation.profile_pic_url} alt={selectedConversation.name} className="w-11 h-11 rounded-2xl object-cover" />
                    ) : (
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold ${isDark ? 'bg-slate-700 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                        {(selectedConversation.name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedConversation.name}</h3>
                        <span className={`text-[10px] px-2 py-1 rounded-full ${statusTone(selectedConversation.status, isDark)}`}>{statusLabel(selectedConversation.status)}</span>
                        {selectedConversation.unread_count > 0 ? (
                          <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                            {selectedConversation.unread_count} unread
                          </span>
                        ) : null}
                      </div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {compactPhone(selectedConversation.phone)} • {selectedConversation.assigned_agent || 'Belum di-assign'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedConversation.jid ? (
                      <span className={`hidden md:inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${isDark ? 'bg-slate-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                        <BrandLogo brand="whatsapp" size={12} />
                        Live WA
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="relative z-[1] flex-1 overflow-y-auto px-4 md:px-6 py-5 pb-24">
                <div className="grid md:grid-cols-3 gap-3 mb-5">
                  {selectedHighlights.map((item) => (
                    <div key={item.label} className={`rounded-[24px] p-4 ${isDark ? 'bg-slate-800/90 border border-slate-700' : 'bg-white/90 border border-white shadow-sm'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-[11px] uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</p>
                          <p className="mt-2 text-lg font-bold">{item.value}</p>
                        </div>
                        <div className={`rounded-2xl p-2 ${isDark ? 'bg-slate-900/80 text-slate-200' : 'bg-slate-50 text-slate-600'}`}>
                          <item.icon size={16} />
                        </div>
                      </div>
                      <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.helper}</p>
                    </div>
                  ))}
                </div>

                <div className={`mb-5 rounded-[28px] p-4 md:p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10/70 shadow-[0_16px_40px_rgba(15,23,42,0.24)]' : 'border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50/80 shadow-sm'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert size={16} className="text-blue-500" />
                    <p className="font-semibold text-sm">Ringkasan thread</p>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {selectedConversation.last_message || 'Percakapan ini belum punya preview pesan. Kirim balasan pertama dari dashboard ini bila perlu.'}
                  </p>
                </div>

                {hasOlderMessages ? (
                  <div className="mb-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => void handleLoadOlderMessages()}
                      disabled={loadingOlderMessages}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm'} disabled:opacity-60`}
                    >
                      {loadingOlderMessages ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Muat pesan lama
                    </button>
                  </div>
                ) : null}

                {messageLoading ? (
                  <div className="py-14 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className={`rounded-[24px] border border-dashed p-8 text-center ${isDark ? 'border-slate-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                    <Bot size={34} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">Belum ada histori yang bisa ditampilkan</p>
                    <p className="mt-1 text-sm">Kalau nomor ini belum punya chat aktif, balasan pertama tetap bisa dikirim dari panel bawah.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messageRefreshing ? (
                      <div className="sticky top-0 z-[1] flex justify-center">
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold backdrop-blur ${isDark ? 'bg-slate-800/90 text-slate-300 ring-1 ring-white/10' : 'bg-white/90 text-slate-500 border border-slate-200 shadow-sm'}`}>
                          <Loader2 size={12} className="animate-spin" />
                          Sinkron chat terbaru
                        </div>
                      </div>
                    ) : null}
                    {messages.map((message) => {
                      const mine = message.is_from_me;
                      const body = message.body || '';
                      const hideBody = messageLooksLikePlaceholder(message) && Boolean(message.media_url);

                      return (
                        <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[90%] md:max-w-[74%] rounded-3xl px-4 py-3 text-sm shadow-sm ${
                            mine
                              ? 'bg-blue-600 text-white rounded-tr-sm shadow-[0_16px_36px_rgba(37,99,235,0.26)]'
                              : isDark
                                ? 'bg-slate-800 text-white rounded-tl-sm border border-slate-700'
                                : 'bg-white/95 text-gray-800 rounded-tl-sm border border-gray-100'
                          }`}>
                            {message.media_url ? (
                              <div className="space-y-3">
                                {message.message_type === 'image' ? (
                                  <img src={message.media_url} alt="Lampiran" className="max-h-72 rounded-xl border border-black/10" />
                                ) : (
                                  <a
                                    href={message.media_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                                      mine ? 'bg-white/15 text-white' : isDark ? 'bg-slate-700 text-gray-100' : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    <ExternalLink size={14} />
                                    Buka lampiran {message.message_type !== 'text' ? `(${message.message_type})` : ''}
                                  </a>
                                )}
                                {!hideBody && body ? <p>{body}</p> : null}
                              </div>
                            ) : (
                              <p>{body}</p>
                            )}
                            <div className={`mt-2 flex items-center ${mine ? 'justify-end' : 'justify-between'} gap-2`}>
                              {!mine ? (
                                <span className={`text-[10px] font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                  {message.message_type !== 'text' ? messagePreview(message) : 'Pesan'}
                                </span>
                              ) : null}
                              <p className={`text-[10px] text-right ${mine ? 'text-blue-100' : isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                                {formatRelativeTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={`sticky bottom-0 z-[2] p-4 border-t backdrop-blur-sm ${isDark ? 'bg-[#111318]/96 border-slate-700' : 'bg-white/95 border-gray-100'}`}>
                <div className="mb-3 flex flex-wrap gap-2">
                  {templateMatches.slice(0, 3).map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setReply(template.preview)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium ${isDark ? 'bg-slate-700 text-gray-200 hover:bg-slate-600' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                    >
                      {template.title}
                    </button>
                  ))}
                </div>
                <div className={`flex items-center gap-2 rounded-[22px] border px-2 py-2 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50/90 border-gray-200'}`}>
                  <button type="button" title="Lampirkan file (coming soon)" className="p-2 text-gray-400 hover:text-gray-600" disabled>
                    <Paperclip size={20} />
                  </button>
                  <input
                    type="text"
                    placeholder="Ketik balasan WhatsApp..."
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                    className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}
                  />
                  <button type="button" title="Emoji (coming soon)" className="p-2 text-gray-400 hover:text-gray-600" disabled>
                    <Smile size={20} />
                  </button>
                  <button
                    type="button"
                    title="Draft AI"
                    onClick={() => void handleAiReply()}
                    disabled={sending || messages.length === 0}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isDark ? 'bg-slate-700 text-purple-300 hover:bg-slate-600' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'} disabled:opacity-50`}
                  >
                    <Sparkles size={18} />
                    <span className="hidden md:inline">AI Draft</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={!reply.trim() || sending}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    <span className="hidden md:inline">Kirim</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </main>

        <aside className={`hidden xl:flex flex-col ${isDark ? 'bg-slate-950/30 border-l border-slate-800' : 'bg-[linear-gradient(180deg,#fbfdff_0%,#f7faff_100%)] border-l border-gray-100'}`}>
          <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <h3 className="font-bold text-lg">Customer Context</h3>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ringkasan cepat sebelum membalas chat WhatsApp.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {selectedConversation ? (
              <>
                <div className={`rounded-[28px] p-4 border ${isDark ? 'bg-[#111318] ring-1 ring-white/10 shadow-[0_16px_40px_rgba(15,23,42,0.20)]' : 'bg-white shadow-sm border-gray-100'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    {selectedConversation.profile_pic_url ? (
                      <img src={selectedConversation.profile_pic_url} alt={selectedConversation.name} className="w-11 h-11 rounded-2xl object-cover" />
                    ) : (
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold ${isDark ? 'bg-slate-700 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                        {(selectedConversation.name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{selectedConversation.name}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{statusLabel(selectedConversation.status)} • {selectedConversation.is_group ? 'Group' : 'Direct'}</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Phone</span>
                      <span className="font-semibold text-right">{compactPhone(selectedConversation.phone)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Assigned</span>
                      <span className="font-semibold text-right">{selectedConversation.assigned_agent || 'Belum ada'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Unread</span>
                      <span className="font-semibold text-right">{selectedConversation.unread_count}</span>
                    </div>
                  </div>
                </div>

                <div className={`rounded-[28px] p-4 border ${isDark ? 'bg-[#111318] ring-1 ring-white/10 shadow-[0_16px_40px_rgba(15,23,42,0.20)]' : 'bg-white shadow-sm border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Phone size={16} className="text-emerald-500" />
                    <p className="font-semibold">Workspace details</p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Workspace</p>
                      <p className="mt-1 font-semibold">{connector?.workspaceName || stats?.tenant?.company_name || 'WA Inbox'}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Connection ref</p>
                      <p className="mt-1 font-semibold">{connector?.connectionRefMasked || crmStatus?.connectionRefMasked || '-'}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Session</p>
                      <p className="mt-1 font-semibold">{stats?.tenant?.session_id || 'Belum aktif'}</p>
                    </div>
                  </div>
                </div>

                <div className={`rounded-[28px] p-4 border ${isDark ? 'bg-[#111318] ring-1 ring-white/10 shadow-[0_16px_40px_rgba(15,23,42,0.20)]' : 'bg-white shadow-sm border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <UserRoundCheck size={16} className="text-blue-500" />
                    <p className="font-semibold">Saran aksi</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className={`rounded-2xl p-3 ${isDark ? 'bg-slate-900/60 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                      Balas dari dashboard ini untuk menjaga semua WA tetap di satu workspace operasional.
                    </div>
                    <div className={`rounded-2xl p-3 ${isDark ? 'bg-slate-900/60 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                      Gunakan draft AI untuk jawaban awal, lalu revisi seperlunya sebelum kirim.
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-[#111318] ring-1 ring-white/10 text-gray-400' : 'bg-white border border-gray-100 text-gray-500'}`}>
                Pilih percakapan dulu untuk melihat konteks customer.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
