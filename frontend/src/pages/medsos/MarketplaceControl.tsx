import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import FieldHelp from '../../components/medsos/FieldHelp';
import { PlatformBadge } from '../../components/medsos/PlatformBadge';
import { getMyCommerSocialIntegrationHub, type ManagedIntegrationConnector } from '../../services/myCommerSocialIntegrations';
import { getMarketplaceHubStatus, type MarketplaceHubConnectionStatus } from '../../services/medsosPostsService';
import { ArrowRight, Bot, Loader2, MessageCircleMore, ShoppingBag, ShieldCheck, Workflow } from 'lucide-react';

const demoStatus: MarketplaceHubConnectionStatus = {
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
  appIdMasked: null,
  botSenderEmail: null,
  aiWebhookUrl: null,
  webhookUrl: null,
  channels: [
    { id: '1', name: 'Shopee Chat', source: 'shopee' },
    { id: '2', name: 'Lazada Chat', source: 'lazada' },
    { id: '3', name: 'Tokopedia / TikTok Shop Chat', source: 'tokopedia' },
  ],
};

const previewMarketplaceChannels = [
  { id: 'preview-shopee', name: 'Shopee Chat Preview', source: 'shopee' },
  { id: 'preview-lazada', name: 'Lazada Chat Preview', source: 'lazada' },
  { id: 'preview-tokopedia', name: 'Tokopedia Preview', source: 'tokopedia' },
];

function toLocalDate(value?: string | null) {
  if (!value) return 'Belum ada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('id-ID');
}

function brandFromSource(source: string) {
  const value = source.toLowerCase();
  if (value.includes('shopee')) return 'shopee' as const;
  if (value.includes('lazada')) return 'lazada' as const;
  if (value.includes('tokopedia')) return 'tokopedia' as const;
  if (value.includes('tiktok')) return 'tiktok' as const;
  return undefined;
}

export default function MarketplaceControl() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = location.pathname.startsWith('/demo');
  const [loading, setLoading] = useState(!isDemo);
  const [connector, setConnector] = useState<ManagedIntegrationConnector | null>(null);
  const [status, setStatus] = useState<MarketplaceHubConnectionStatus | null>(isDemo ? demoStatus : null);

  useEffect(() => {
    if (isDemo) return;
    const load = async () => {
      setLoading(true);
      try {
        const [hub, marketplaceStatus] = await Promise.all([
          getMyCommerSocialIntegrationHub(),
          getMarketplaceHubStatus(),
        ]);
        setConnector(hub.connectors.find((item) => item.slug === 'marketplace-hub') || null);
        setStatus(marketplaceStatus);
      } catch (error) {
        console.error('Failed to load marketplace chat workspace', error);
        setConnector(null);
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isDemo]);

  const summaryCards = useMemo(() => ([
    {
      title: 'Status aktivasi',
      value: status?.reachable ? 'Live' : status?.configured ? 'Check' : 'Setup',
      description: status?.message || 'Marketplace chat belum diaktifkan.',
      icon: ShoppingBag,
    },
    {
      title: 'Channel aktif',
      value: String(status?.channels.length || 0),
      description: 'Marketplace chat yang sudah terbaca di workspace ini.',
      icon: MessageCircleMore,
    },
    {
      title: 'AI routing',
      value: status?.reachable ? 'On' : 'Pending',
      description: status?.reachable
        ? 'Pesan marketplace siap diarahkan ke AI lalu diteruskan kembali ke inbox.'
        : 'AI akan diaktifkan setelah workspace marketplace selesai diproses.',
      icon: Bot,
    },
    {
      title: 'Fallback human',
      value: 'Ready',
      description: 'Jika AI butuh eskalasi, percakapan tetap bisa diteruskan ke agent manusia.',
      icon: ShieldCheck,
    },
  ]), [status]);

  const previewMode = !isDemo && !status?.configured;
  const displayChannels = previewMode ? previewMarketplaceChannels : (status?.channels ?? []);

  if (!isDemo && loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => navigate(isDemo ? '/demo/medsos/connections' : '/medsos/connections')}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all"
        >
          Buka Connections
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.title} className={`rounded-[24px] p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
            <div className={`inline-flex rounded-2xl p-3 ${isDark ? 'bg-slate-900 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
              <card.icon size={18} />
            </div>
            <p className={`text-xs uppercase tracking-[0.18em] mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.title}</p>
            <h2 className="mt-2 text-xl md:text-2xl font-bold tracking-tight">{card.value}</h2>
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.description}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
          <div className="flex items-center gap-2">
            <h2 className={`text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Ringkasan workspace</h2>
            <FieldHelp title="Ringkasan workspace" description="Bagian ini menunjukkan nama workspace aktif, status sinkronisasi terakhir, dan apakah jalur marketplace chat sudah siap masuk ke AI." />
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className={`rounded-[24px] p-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
              <p className="font-semibold">Workspace</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{connector?.workspaceName || status?.workspaceName || (previewMode ? 'Marketplace Preview' : 'Belum diatur')}</p>
            </div>
            <div className={`rounded-[24px] p-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
              <p className="font-semibold">Status live</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {previewMode
                  ? 'Preview netral. Setelah workspace aktif, status live dan AI routing akan muncul di sini.'
                  : status?.reachable ? 'Marketplace chat sudah live dan siap diarahkan ke AI.' : status?.message || 'Masih menunggu aktivasi.'}
              </p>
            </div>
            <div className={`rounded-[24px] p-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
              <p className="font-semibold">Update terakhir</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{previewMode ? 'Menunggu aktivasi pertama' : toLocalDate(connector?.updatedAt || status?.checkedAt)}</p>
            </div>
          </div>

          <div className={`rounded-[24px] p-5 mt-6 ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-blue-100 bg-blue-50'}`}>
            <div className="flex items-start gap-3">
              <Workflow size={18} className="text-blue-500 mt-0.5" />
              <div>
                <p className="font-semibold">Cara kerja operasional</p>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-blue-900'}`}>
                  Toko yang sudah ada tetap dipakai seperti biasa. Chat dari marketplace dialirkan ke workspace ini, lalu AI menjawab pesan berulang lebih dulu. Jika butuh keputusan manusia, percakapan diteruskan ke agent.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
          <div className="flex items-center gap-2">
            <h2 className={`text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Channel yang terbaca</h2>
            <FieldHelp title="Channel marketplace" description="Daftar ini menunjukkan marketplace mana saja yang sudah aktif di workspace. Bila sebuah channel belum muncul, cek lagi halaman Connections untuk melanjutkan aktivasi." />
          </div>

          {displayChannels.length ? (
            <div className="space-y-3 mt-6">
              {displayChannels.map((channel) => (
                <div key={channel.id} className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                    <PlatformBadge label={channel.name} brand={brandFromSource(channel.source)} size={40} />
                    <div>
                      <p className="font-semibold">{channel.name}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{channel.source}</p>
                    </div>
                    </div>
                    {previewMode ? (
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${isDark ? 'bg-slate-800 text-gray-200' : 'border bg-white ring-1 ring-slate-900/5 text-gray-600'}`}>
                        Preview
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`rounded-[24px] p-5 mt-6 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Belum ada channel marketplace yang terbaca. Lanjut ke halaman Connections untuk menyimpan aktivasi workspace marketplace terlebih dulu.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
