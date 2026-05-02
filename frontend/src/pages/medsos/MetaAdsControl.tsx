import { useMemo, useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { BrandLogo } from '../../components/medsos/BrandLogo';
import {
  metaAdsAccountHealth,
  metaAdsAlerts,
  metaAdsApprovalQueue,
  metaAdsAutomationBridge,
  metaAdsCampaigns,
  metaAdsCreatives,
  metaAdsFunnel,
  metaAdsKpis,
  metaAdsTrend,
  metaAudienceClusters,
  metaBudgetPacing,
  metaLeadDestinations,
  metaPlacementPulse,
} from '../../data/omnichannelMock';
import {
  ArrowUpRight,
  BarChart3,
  Images,
  LineChart as LineChartIcon,
  Megaphone,
  Radar,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TriangleAlert,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function MetaAdsControl() {
  const { isDark } = useThemeStore();
  const [focusView, setFocusView] = useState<'all' | 'lead' | 'sales' | 'retarget'>('all');

  const focusOptions = [
    { id: 'all', label: 'All funnel' },
    { id: 'lead', label: 'Lead gen' },
    { id: 'sales', label: 'Sales' },
    { id: 'retarget', label: 'Retargeting' },
  ] as const;

  const chartData = useMemo(
    () =>
      metaAdsTrend.map((item) => ({
        ...item,
        spendM: Number((item.spend / 1_000_000).toFixed(2)),
        revenueM: Number((item.revenue / 1_000_000).toFixed(2)),
      })),
    []
  );

  const visibleCampaigns = useMemo(() => {
    if (focusView === 'all') return metaAdsCampaigns;
    if (focusView === 'lead') {
      return metaAdsCampaigns.filter((item) => item.objective === 'Leads' || item.objective === 'Messages');
    }
    if (focusView === 'sales') {
      return metaAdsCampaigns.filter((item) => item.objective === 'Sales' || item.objective === 'Conversions');
    }
    return metaAdsCampaigns.filter((item) => item.campaign.toLowerCase().includes('retarget'));
  }, [focusView]);

  const visibleCampaignNames = useMemo(
    () => new Set(visibleCampaigns.map((item) => item.campaign)),
    [visibleCampaigns]
  );

  const visibleBudgetPacing = useMemo(() => {
    if (focusView === 'all') return metaBudgetPacing;
    return metaBudgetPacing.filter((item) => visibleCampaignNames.has(item.campaign));
  }, [focusView, visibleCampaignNames]);

  const focusNarrative = {
    all: 'Lihat blended performance social commerce secara penuh.',
    lead: 'Fokus ke lead capture, routing, dan kualitas closing.',
    sales: 'Prioritaskan ROAS, spend efficiency, dan purchase flow.',
    retarget: 'Pantau audience hangat, fatigue, dan scale opportunity.',
  } as const;

  const summary = useMemo(
    () => ({
      scaling: metaAdsCampaigns.filter((item) => item.status === 'active' || item.status === 'scaling').length,
      winningCreatives: metaAdsCreatives.filter((item) => item.winner).length,
      highQualityAudiences: metaAudienceClusters.filter((item) => item.quality === 'high').length,
      alerts: metaAdsAlerts.filter((item) => item.severity !== 'info').length,
    }),
    []
  );

  const severityTone = {
    critical: 'bg-red-100 text-red-600',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-600',
  } as const;

  const pacingTone = {
    'under pacing': 'bg-amber-100 text-amber-700',
    'on track': 'bg-emerald-100 text-emerald-600',
    'over pacing': 'bg-red-100 text-red-600',
  } as const;

  const campaignTone = {
    active: 'bg-emerald-100 text-emerald-600',
    learning: 'bg-amber-100 text-amber-700',
    review: 'bg-red-100 text-red-600',
    scaling: 'bg-blue-100 text-blue-600',
  } as const;

  const audienceTone = {
    high: 'bg-emerald-100 text-emerald-600',
    medium: 'bg-blue-100 text-blue-600',
    watch: 'bg-amber-100 text-amber-700',
  } as const;

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-3xl">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4 ${isDark ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
              <Megaphone size={14} />
              Meta Ads command layer untuk MyCommerSocial
            </div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Paid traffic dari Instagram & Facebook kini bisa dikelola dalam <span className="text-blue-500">satu command center</span>.
            </h1>
            <p className={`mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Campaign flight, budget pacing, creative winner, audience cluster, sampai alert fatigue dibuat terasa seperti ads manager operasional — tetap frontend-only dulu, sesuai kehendak Ainz-sama.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-5">
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
                <BrandLogo brand="instagram" size={22} className="rounded-lg" />
                <span className="text-xs font-semibold">Instagram placements</span>
              </div>
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
                <BrandLogo brand="facebook" size={22} className="rounded-lg" />
                <span className="text-xs font-semibold">Facebook placements</span>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 min-w-[300px]">
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60 text-white' : 'bg-gray-50 text-gray-900'}`}>
              <div className="flex items-center gap-2 mb-2">
                <WalletCards size={16} className="text-blue-500" />
                <span className="text-sm font-semibold">Blended ROAS</span>
              </div>
              <p className="text-2xl font-bold">4.7x</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>di atas target gabungan social + commerce</p>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60 text-white' : 'bg-gray-50 text-gray-900'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-emerald-500" />
                <span className="text-sm font-semibold">Ready to scale</span>
              </div>
              <p className="text-2xl font-bold">{summary.scaling} campaign</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>winner sudah kelihatan, tinggal gas budget</p>
            </div>
          </div>
        </div>

        <div className={`mt-6 rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SlidersHorizontal size={16} className="text-blue-500" />
                <p className="font-semibold text-sm">Ads focus lens</p>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{focusNarrative[focusView]}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {focusOptions.map((option) => {
                const active = focusView === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setFocusView(option.id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : isDark
                          ? 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metaAdsKpis.map((item, index) => (
          <div key={item.label} className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl ${index === 0 ? 'bg-blue-100 text-blue-600' : index === 1 ? 'bg-emerald-100 text-emerald-600' : index === 2 ? 'bg-purple-100 text-purple-600' : 'bg-amber-100 text-amber-700'}`}>
                {index === 0 && <WalletCards size={18} />}
                {index === 1 && <ShieldCheck size={18} />}
                {index === 2 && <UsersRound size={18} />}
                {index === 3 && <Target size={18} />}
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-100 px-2 py-1 rounded-full">{item.delta}</span>
            </div>
            <p className="text-2xl font-bold">{item.value}</p>
            <p className={`text-sm font-semibold mt-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{item.label}</p>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr_0.85fr] gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Ads Alert Center</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Fatigue, overlap, dan campaign yang perlu intervensi cepat.</p>
            </div>
            <TriangleAlert size={18} className="text-orange-500" />
          </div>
          <div className="space-y-3">
            {metaAdsAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-2xl border p-4 ${
                  alert.severity === 'critical'
                    ? isDark ? 'border-red-500/20 bg-red-500/10' : 'border-red-100 bg-red-50'
                    : alert.severity === 'warning'
                      ? isDark ? 'border-amber-500/20 bg-amber-500/10' : 'border-amber-100 bg-amber-50'
                      : isDark ? 'border-blue-500/20 bg-blue-500/10' : 'border-blue-100 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${severityTone[alert.severity]}`}>
                      {alert.severity}
                    </span>
                    <p className="font-semibold text-sm mt-3">{alert.title}</p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{alert.description}</p>
                  </div>
                  <button className="text-blue-500 text-sm font-semibold shrink-0">Inspect</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Budget Pacing</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pantau spend rate sebelum budget bocor atau terlalu pelan.</p>
            </div>
            <Radar size={18} className="text-blue-500" />
          </div>
          <div className="space-y-4">
            {visibleBudgetPacing.map((item) => {
              const width = Math.min(100, Number(item.spendRate.replace('%', '')));
              return (
                <div key={item.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-sm">{item.campaign}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.cap}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${pacingTone[item.status]}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-full rounded-full ${item.status === 'over pacing' ? 'bg-red-500' : item.status === 'under pacing' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>spend rate</span>
                    <span className="font-semibold">{item.spendRate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Operator Snapshot</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ringkasan cepat untuk orang yang pegang ads harian.</p>
            </div>
            <BarChart3 size={18} className="text-purple-500" />
          </div>
          <div className="space-y-3">
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Alerts to handle</p>
              <p className="mt-2 text-2xl font-bold">{summary.alerts}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>campaign berstatus warning / critical</p>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Winning creatives</p>
              <p className="mt-2 text-2xl font-bold">{summary.winningCreatives}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>siap diduplikasi ke placement lain</p>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
              <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>High-quality audience</p>
              <p className="mt-2 text-2xl font-bold">{summary.highQualityAudiences}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>seed dan retargeting yang paling sehat</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Performance Trend</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Spend, revenue, dan leads dalam ritme mingguan.</p>
            </div>
            <LineChartIcon size={18} className="text-blue-500" />
          </div>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="day" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis yAxisId="left" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Leads') return [value, name];
                    return [`Rp${Number(value).toFixed(2)}jt`, name];
                  }}
                />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="spendM" stroke="#3b82f6" fill="#93c5fd" strokeWidth={3} name="Spend" />
                <Area yAxisId="left" type="monotone" dataKey="revenueM" stroke="#10b981" fill="#86efac" strokeWidth={3} name="Revenue" />
                <Line yAxisId="right" type="monotone" dataKey="leads" stroke="#8b5cf6" strokeWidth={3} dot={false} name="Leads" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Campaign Flight Control</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status aktif, learning, scaling, dan campaign yang perlu creative refresh.</p>
            </div>
            <Megaphone size={18} className="text-emerald-500" />
          </div>
          <div className="space-y-3">
            {visibleCampaigns.map((campaign) => (
              <div key={campaign.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{campaign.campaign}</p>
                      <span className={`text-[10px] px-2 py-1 rounded-full ${campaignTone[campaign.status]}`}>
                        {campaign.status}
                      </span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{campaign.objective} • owner {campaign.owner}</p>
                  </div>
                  <button className="text-blue-500 text-sm font-semibold shrink-0">Open</button>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Spend</p>
                    <p className="font-semibold">{campaign.spend}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ROAS</p>
                    <p className="font-semibold">{campaign.roas}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CPL</p>
                    <p className="font-semibold">{campaign.cpl}</p>
                  </div>
                </div>
                <div className={`mt-3 rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-slate-800 text-gray-300' : 'bg-white text-gray-600 border border-gray-100'}`}>
                  Approval note: {campaign.approval}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr_0.9fr] gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Lead Destination Mix</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Biar jelas lead dari ads larinya ke mana dan mana yang paling bernilai.</p>
            </div>
            <UsersRound size={18} className="text-emerald-500" />
          </div>
          <div className="h-[260px] mb-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metaLeadDestinations}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="destination" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }} />
                <Legend />
                <Bar dataKey="leads" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="qualified" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {metaLeadDestinations.map((destination) => (
              <div key={destination.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{destination.destination}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{destination.note}</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-600">
                    response {destination.response}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Leads</p>
                    <p className="font-semibold">{destination.leads}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Qualified</p>
                    <p className="font-semibold">{destination.qualified}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Placement Pulse</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Bandingkan kualitas placement tanpa perlu lompat panel.</p>
            </div>
            <BarChart3 size={18} className="text-blue-500" />
          </div>
          <div className="space-y-3">
            {metaPlacementPulse.map((placement) => (
              <div key={placement.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{placement.placement}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{placement.note}</p>
                  </div>
                  <button className="text-blue-500 text-sm font-semibold shrink-0">Boost</button>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CTR</p>
                    <p className="font-semibold">{placement.ctr}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CPC</p>
                    <p className="font-semibold">{placement.cpc}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ROAS</p>
                    <p className="font-semibold">{placement.roas}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Creative Approval Queue</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Supaya ads manager, creative, dan reviewer terasa nyambung.</p>
              </div>
              <ShieldCheck size={18} className="text-purple-500" />
            </div>
            <div className="space-y-3">
              {metaAdsApprovalQueue.map((item) => (
                <div key={item.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{item.title}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.asset} • {item.owner} → {item.reviewer}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${item.status === 'ready' ? 'bg-emerald-100 text-emerald-600' : item.status === 'review' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className={`text-sm mt-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.note}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>due {item.due}</span>
                    <button className="font-semibold text-blue-500">Open brief</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Radar size={18} className="text-emerald-500" />
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Account Health</h3>
            </div>
            <div className="space-y-3">
              {metaAdsAccountHealth.map((item) => (
                <div key={item.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{item.label}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.helper}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${item.status === 'healthy' ? 'bg-emerald-100 text-emerald-600' : item.status === 'watch' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                      {item.value}
                    </span>
                  </div>
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
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Creative Lab</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Cari visual dan angle yang paling layak didorong budget.</p>
            </div>
            <Images size={18} className="text-purple-500" />
          </div>
          <div className="space-y-3">
            {metaAdsCreatives.map((creative) => (
              <div key={creative.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{creative.name}</p>
                      {creative.winner && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-600">
                          winner
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{creative.format}</p>
                  </div>
                  <button className="text-blue-500 text-sm font-semibold shrink-0">Duplicate</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {creative.placements.map((placement) => (
                    <span key={placement} className={`text-[10px] px-2 py-1 rounded-full ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
                      {placement}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CTR</p>
                    <p className="font-semibold">{creative.ctr}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Hook rate</p>
                    <p className="font-semibold">{creative.hookRate}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Audience Clusters</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Lihat seed mana yang kualitasnya paling waras untuk scale.</p>
            </div>
            <UsersRound size={18} className="text-blue-500" />
          </div>
          <div className="space-y-3">
            {metaAudienceClusters.map((audience) => (
              <div key={audience.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{audience.name}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{audience.source}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${audienceTone[audience.quality]}`}>
                    {audience.quality}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Audience size</p>
                    <p className="font-semibold">{audience.size}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CPA</p>
                    <p className="font-semibold">{audience.cpa}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Funnel Health</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Impression sampai purchase dalam bentuk visual cepat.</p>
              </div>
              <Target size={18} className="text-emerald-500" />
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metaAdsFunnel} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.12} />
                  <XAxis type="number" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                  <YAxis dataKey="stage" type="category" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} width={88} />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Megaphone size={18} className="text-blue-500" />
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Automation Bridge</h3>
            </div>
            <div className="space-y-3">
              {metaAdsAutomationBridge.map((bridge) => (
                <div key={bridge.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{bridge.title}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{bridge.description}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${bridge.status === 'live' ? 'bg-emerald-100 text-emerald-600' : bridge.status === 'watch' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                      {bridge.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-purple-500" />
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Operator Plays</h3>
            </div>
            <div className="space-y-3">
              {[
                'Duplicate creative winner ke Reels placement',
                'Refresh audience overlap Mother’s Day bundle',
                'Turunkan budget campaign over pacing',
                'Kirim request creative refresh ke tim desain',
              ].map((item) => (
                <button
                  key={item}
                  className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${isDark ? 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/80' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
                >
                  {item}
                  <ArrowUpRight size={16} className="text-blue-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
