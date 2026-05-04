import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { BrandLogo, resolveBrandKey, type BrandKey } from '../../components/medsos/BrandLogo';
import MyMedsosLogo from '../../components/medsos/MyMedsosLogo';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarClock,
  CircleAlert,
  HeartHandshake,
  Layers3,
  Loader2,
  MessageCircleMore,
  PackageSearch,
  PlugZap,
  Radar,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  UsersRound,
  Zap,
} from 'lucide-react';
import {
  attentionItems,
  campaignPipeline,
  channelConnections,
  dashboardAlerts,
  marketIssues,
  marketplaceOrders,
  omniStats,
  plannerCards,
  quickActions,
  scheduleEvents,
  teamActivityFeed,
  teamSeats,
  weeklyReach,
  workspaceHealth,
} from '../../data/omnichannelMock';
import {
  getMyCommerSocialIntegrationHub,
  type ManagedIntegrationHub,
} from '../../services/myCommerSocialIntegrations';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';

const statusStyles: Record<string, string> = {
  connected: 'bg-emerald-100 text-emerald-700',
  pending_user_action: 'bg-amber-100 text-amber-700',
  action_required: 'bg-rose-100 text-rose-700',
  syncing: 'bg-blue-100 text-blue-700',
  degraded: 'bg-orange-100 text-orange-700',
  not_connected: 'bg-slate-200 text-slate-700',
};

function LiveDashboard({ hub, isDark, navigate }: { hub: ManagedIntegrationHub; isDark: boolean; navigate: ReturnType<typeof useNavigate> }) {
  const connectedCount = hub.summary.connected;
  const totalCount = hub.summary.total;

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-blue-100 bg-white shadow-sm'}`}>
        <div className="flex items-center gap-3 mb-4">
          <MyMedsosLogo size={36} className="rounded-xl" />
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>MyCommerSocial</h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Omnichannel command center</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
            <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Connected</p>
            <p className="mt-2 text-3xl font-bold">{connectedCount}<span className={`text-base font-normal ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/{totalCount}</span></p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>integration aktif</p>
          </div>
          <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
            <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pending</p>
            <p className="mt-2 text-3xl font-bold">{hub.summary.pending}</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>menunggu approval</p>
          </div>
          <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}>
            <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Dashboard fee</p>
            <p className="mt-2 text-xl font-bold">{hub.billing.dashboardFee.label}</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>biaya workspace saja</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {hub.connectors.map((connector) => (
          <div key={connector.slug} className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-bold">{connector.name}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{connector.providerName}</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${statusStyles[connector.status] ?? statusStyles.not_connected}`}>
                {connector.statusLabel}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {connector.supportedChannels.map((ch) => (
                <BrandLogo key={ch.brand} brand={ch.brand} size={22} className="rounded-md" withRing={ch.brand === 'tokopedia'} />
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Health: <span className="font-semibold">{connector.isActive ? `${connector.healthScore}` : '—'}</span></p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Aset: <span className="font-semibold">{connector.selectedAssets.length > 0 ? connector.selectedAssets.length : '—'}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {connectedCount === 0 && (
        <div className={`rounded-3xl border p-8 text-center ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <PlugZap size={40} className="mx-auto text-blue-500 mb-4" />
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Belum ada integrasi aktif</h2>
          <p className={`text-sm mb-6 max-w-md mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Hubungkan WA CRM, Jubelio, atau Meta Ads untuk mulai mengelola inbox, marketplace, dan iklan dari satu dashboard.
          </p>
          <button
            onClick={() => navigate('/medsos/connections')}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-semibold"
          >
            <PlugZap size={18} />
            Setup Connections
          </button>
        </div>
      )}

      {connectedCount > 0 && (
        <div className={`rounded-3xl border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-blue-50 bg-white shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Radar size={18} className="text-blue-500" />
            <p className="font-semibold">Data real-time</p>
          </div>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Dashboard metrics (inbox, GMV, campaign) akan tersedia setelah partner mengirimkan data via webhook. Gunakan menu Connections untuk memantau status sync.
          </p>
        </div>
      )}
    </div>
  );
}

export default function MedsosDashboard() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = location.pathname.startsWith('/demo');
  const [hub, setHub] = useState<ManagedIntegrationHub | null>(null);
  const [loading, setLoading] = useState(!isDemo);
  const featuredBrands: BrandKey[] = ['instagram', 'tiktok', 'facebook', 'shopee', 'tokopedia'];

  useEffect(() => {
    if (!isDemo) {
      getMyCommerSocialIntegrationHub()
        .then((data) => setHub(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isDemo]);

  const toneClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  } as const;

  const stageSummary = useMemo(() => {
    const count = (stage: string) => plannerCards.filter((item) => item.stage === stage).length;
    return [
      { label: 'Need review', value: count('review'), helper: 'konten menunggu reviewer / owner', icon: ShieldAlert },
      { label: 'Scheduled', value: count('scheduled'), helper: 'siap publish lintas channel', icon: CalendarClock },
      { label: 'Published', value: count('published'), helper: 'campaign live & butuh monitoring', icon: Zap },
    ];
  }, []);

  const workloadMeter = (input: string) => {
    const amount = Number(input.match(/\d+/)?.[0] ?? '0');
    return Math.min(100, 26 + amount * 5);
  };

  const topRisk = marketIssues[0];

  if (!isDemo) {
    if (loading) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      );
    }
    if (hub) {
      return <LiveDashboard hub={hub} isDark={isDark} navigate={navigate} />;
    }
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-blue-100 bg-white shadow-sm'}`}>
        <div className={`p-6 md:p-8 ${isDark ? 'bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_40%),linear-gradient(135deg,_rgba(15,23,42,0.95),_rgba(30,41,59,0.95))]' : 'bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.15),_transparent_40%),linear-gradient(135deg,_rgba(239,246,255,1),_rgba(255,255,255,1))]'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-3xl">
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4 ${isDark ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
                <Sparkles size={14} />
                Executive + operational frontend prototype
              </div>
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4 ml-2 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-white/90 text-gray-700 shadow-sm'}`}>
                <MyMedsosLogo size={18} className="rounded-md" />
                original mark
              </div>
              <h1 className={`text-3xl md:text-4xl font-bold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Omnichannel war room yang langsung memberi tahu <span className="text-blue-500">apa yang harus dikerjakan sekarang</span>.
              </h1>
              <p className={`mt-3 text-sm md:text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Fokus tampilan dulu, Ainz-sama: alert center, queue prioritas, team workload, campaign pipeline, dan marketplace exception dibuat terasa seperti command center sungguhan.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 min-w-[320px]">
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60 text-white' : 'bg-white/90 text-gray-900 shadow-sm'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <HeartHandshake className="text-blue-500" size={18} />
                  <span className="text-sm font-semibold">Inbox SLA</span>
                </div>
                <p className="text-2xl font-bold">94%</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>5 thread butuh respon cepat &lt; 15 menit</p>
              </div>
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60 text-white' : 'bg-white/90 text-gray-900 shadow-sm'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <ShoppingBag className="text-emerald-500" size={18} />
                  <span className="text-sm font-semibold">Marketplace Risk</span>
                </div>
                <p className="text-2xl font-bold">3 hotspot</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>refund risk, late shipment, price mismatch</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            {featuredBrands.map((brand) => (
              <div
                key={brand}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-white/90 text-gray-700 shadow-sm'}`}
              >
                <BrandLogo brand={brand} size={22} className="rounded-lg px-1" withRing />
                <span className="text-xs font-semibold capitalize">{brand}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {omniStats.map((stat, idx) => (
          <div key={idx} className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-lg ${toneClasses[stat.tone]}`}>
                {idx === 0 && <MessageCircleMore size={20} />}
                {idx === 1 && <Layers3 size={20} />}
                {idx === 2 && <ShoppingBag size={20} />}
                {idx === 3 && <CircleAlert size={20} />}
              </div>
              <span className="text-xs font-bold text-green-500 bg-green-100 px-2 py-1 rounded-full">{stat.delta}</span>
            </div>
            <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</h3>
            <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{stat.label}</p>
            <p className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {workspaceHealth.map((item) => (
          <div key={item.label} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
            <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</p>
            <p className={`mt-2 text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.value}</p>
            <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.15fr_0.95fr_0.9fr] gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Alert Center</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Bottleneck, channel warning, dan item yang bisa merusak performa hari ini.</p>
            </div>
            <BellRing size={18} className="text-orange-500" />
          </div>

          <div className="space-y-3">
            {dashboardAlerts.map((alert) => (
              <div key={alert.id} className={`rounded-2xl border p-4 ${
                alert.severity === 'critical'
                  ? isDark ? 'border-red-500/20 bg-red-500/10' : 'border-red-100 bg-red-50'
                  : alert.severity === 'warning'
                    ? isDark ? 'border-amber-500/20 bg-amber-500/10' : 'border-amber-100 bg-amber-50'
                    : isDark ? 'border-blue-500/20 bg-blue-500/10' : 'border-blue-100 bg-blue-50'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                        alert.severity === 'critical'
                          ? 'bg-red-100 text-red-600'
                          : alert.severity === 'warning'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-600'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>owner {alert.owner}</span>
                    </div>
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{alert.title}</p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{alert.description}</p>
                  </div>
                  <button className="text-blue-500 text-sm font-semibold shrink-0">Open</button>
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-5 rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-500" />
              <p className="font-semibold text-sm">Top risk today</p>
            </div>
            <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{topRisk.title}</p>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{topRisk.reason}</p>
            <p className={`mt-2 text-xs ${isDark ? 'text-red-300' : 'text-red-600'}`}>{topRisk.impact}</p>
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>What Needs Attention Now</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Urutan tindakan prioritas agar tim tahu harus bergerak ke mana.</p>
            </div>
            <ShieldAlert size={18} className="text-blue-500" />
          </div>
          <div className="space-y-3">
            {attentionItems.map((item) => (
              <div key={item.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.type} • owner {item.owner}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${item.status.includes('approval') ? 'bg-amber-100 text-amber-700' : item.status.includes('unhandled') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    {item.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>due {item.due}</span>
                  <button className="inline-flex items-center gap-1 text-xs font-semibold text-blue-500">
                    Take action <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Shortcut untuk workflow yang paling sering dipakai supervisor.</p>
            </div>
            <Zap size={18} className="text-purple-500" />
          </div>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${isDark ? 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/80' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
              >
                <p className="font-semibold text-sm">{action.label}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{action.detail}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Executive Pulse</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Reach, inbox pressure, dan order marketplace untuk memantau dampak harian campaign.</p>
            </div>
            <Radar size={18} className="text-blue-500" />
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyReach}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }}
                />
                <Area type="monotone" dataKey="reach" stroke="#3b82f6" fill="#93c5fd" strokeWidth={3} name="Reach" />
                <Area type="monotone" dataKey="orders" stroke="#10b981" fill="#a7f3d0" strokeWidth={2} name="Orders" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Team Workload</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Biar terasa sistem dipakai tim sungguhan, bukan sekadar dashboard cantik.</p>
            </div>
            <UsersRound size={18} className="text-emerald-500" />
          </div>
          <div className="space-y-4">
            {teamSeats.map((seat) => (
              <div key={seat.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-sm">{seat.name}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{seat.role} • {seat.shift}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
                    {seat.workload}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {seat.channels.map((channel) => (
                    <span key={channel} className={`text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1 ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
                      <BrandLogo brand={resolveBrandKey(channel)} size={16} className="rounded-md" />
                      {channel}
                    </span>
                  ))}
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${workloadMeter(seat.workload)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Campaign Performance Snapshot</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Planner, approval, dan live campaign dilihat dalam satu panel.</p>
            </div>
            <Layers3 size={18} className="text-purple-500" />
          </div>

          <div className="grid md:grid-cols-3 gap-3 mb-5">
            {stageSummary.map((stage) => (
              <div key={stage.label} className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <stage.icon size={16} className="text-blue-500" />
                  <p className="text-sm font-semibold">{stage.label}</p>
                </div>
                <p className="text-2xl font-bold">{stage.value}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stage.helper}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {campaignPipeline.map((campaign) => (
              <div key={campaign.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{campaign.title}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{campaign.channel} • owner {campaign.owner}</p>
                    <p className={`text-xs mt-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{campaign.objective}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${campaign.stage === 'live' ? 'bg-emerald-100 text-emerald-600' : campaign.stage === 'approval' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-600'}`}>
                    {campaign.stage}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>publish {campaign.publishAt}</span>
                  <button className="text-xs font-semibold text-blue-500">Open brief</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Channel Health</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Performa akun sosial dan toko yang sedang aktif.</p>
              </div>
              <Radar size={18} className="text-blue-500" />
            </div>
            <div className="space-y-3">
              {channelConnections.map((channel) => (
                <div key={channel.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <BrandLogo brand={resolveBrandKey(channel.name)} size={42} className="rounded-2xl px-1" withRing />
                      <div>
                        <p className="font-semibold text-sm">{channel.name}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{channel.handle}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${
                      channel.status === 'healthy'
                        ? 'bg-emerald-100 text-emerald-600'
                        : channel.status === 'warning'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-600'
                    }`}>
                      {channel.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Health</p>
                      <p className="font-bold">{channel.healthScore}/100</p>
                    </div>
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Unread</p>
                      <p className="font-bold">{channel.unread}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Resp.</p>
                      <p className="font-bold">{channel.responseTime}</p>
                    </div>
                  </div>
                  <p className={`mt-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {channel.kind === 'social' ? `Followers ${channel.followers}` : channel.syncStatus}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Marketplace Exception List</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Fokus ke risiko yang bisa bocor ke revenue atau rating.</p>
              </div>
              <PackageSearch size={18} className="text-orange-500" />
            </div>
            <div className="space-y-3">
              {marketIssues.map((issue) => (
                <div key={issue.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{issue.title}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{issue.channel} • {issue.reason}</p>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-600">watch</span>
                  </div>
                  <p className={`text-xs mt-3 ${isDark ? 'text-red-300' : 'text-red-600'}`}>{issue.impact}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_1fr_0.9fr] gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Activity Feed</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Jejak kerja tim, assign, escalate, dan note internal.</p>
            </div>
            <UsersRound size={18} className="text-blue-500" />
          </div>
          <div className="space-y-4">
            {teamActivityFeed.map((activity) => (
              <div key={activity.id} className="relative pl-5">
                <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
                <p className="font-semibold text-sm">{activity.actor} • {activity.action}</p>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{activity.target}</p>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{activity.time}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Next Queue & Schedule</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Meeting point antara planner, CS, dan launch calendar.</p>
            </div>
            <CalendarClock size={18} className="text-purple-500" />
          </div>
          <div className="space-y-3 mb-5">
            {scheduleEvents.slice(0, 4).map((event) => (
              <div key={event.id} className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/40' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{event.title}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{event.date} • {event.time} • {event.owner}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${event.status === 'review' ? 'bg-amber-100 text-amber-700' : event.status === 'ready' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    {event.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className={`rounded-2xl p-4 border ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
            <p className="font-semibold text-sm mb-2">Open marketplace orders</p>
            <div className="space-y-2">
              {marketplaceOrders.slice(0, 2).map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <BrandLogo brand={resolveBrandKey(order.channel)} size={20} className="rounded-md px-1" withRing />
                    <span className="truncate">{order.id} • {order.customer}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${order.status === 'late' || order.status === 'refund_risk' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Volume Inbox Harian</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Komparasi tekanan queue terhadap ritme konten.</p>
            </div>
            <MessageCircleMore size={18} className="text-purple-500" />
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyReach}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="inbox" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
