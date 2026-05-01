import { useThemeStore } from '../../store/themeStore';
import { BrandLogo, resolveBrandKey } from '../../components/medsos/BrandLogo';
import {
  bestPostingWindows,
  channelPerformance,
  contentTypePerformance,
  replySpeedTrend,
  sentimentTrend,
  slaCompliance,
} from '../../data/omnichannelMock';
import {
  Activity,
  BarChart3,
  Clock3,
  LineChart as LineChartIcon,
  MessageCircleHeart,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function MedsosAnalytics() {
  const { isDark } = useThemeStore();

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Analytics yang menjawab “kenapa”, bukan cuma “apa”</h1>
            <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Best posting time, reply speed, sentiment, conversion, revenue share, dan SLA compliance sudah dibentuk supaya layer insight terasa lebih mahal.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 min-w-[300px]">
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60 text-white' : 'bg-gray-50 text-gray-900'}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-blue-500" />
                <span className="text-sm font-semibold">Best uplift</span>
              </div>
              <p className="text-xl font-bold">Instagram Reels</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>save rate tertinggi jam 11:30 - 12:30</p>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/60 text-white' : 'bg-gray-50 text-gray-900'}`}>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span className="text-sm font-semibold">Best SLA</span>
              </div>
              <p className="text-xl font-bold">Shopee 98%</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>paling stabil di queue buyer chat</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {bestPostingWindows.map((window) => (
          <div key={window.id} className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-3">
              <BrandLogo brand={resolveBrandKey(window.channel)} size={28} className="rounded-xl px-1" withRing />
              <div>
                <p className="font-semibold text-sm">{window.channel}</p>
                <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{window.confidence} confidence</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Clock3 size={14} className="text-blue-500" />
              <p className="font-bold">{window.time}</p>
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{window.note}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <LineChartIcon size={18} className="text-blue-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Reply Speed Trend</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Bandingkan kecepatan respon social vs marketplace.</p>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={replySpeedTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="day" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }} />
                <Legend />
                <Line type="monotone" dataKey="social" stroke="#3b82f6" strokeWidth={3} dot={false} name="Social (mnt)" />
                <Line type="monotone" dataKey="marketplace" stroke="#10b981" strokeWidth={3} dot={false} name="Marketplace (mnt)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <MessageCircleHeart size={18} className="text-purple-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Sentiment Trend</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Lihat arah sentimen supaya tim tahu apakah problem makin parah atau membaik.</p>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sentimentTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="week" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }} />
                <Legend />
                <Area type="monotone" dataKey="positive" stackId="1" stroke="#10b981" fill="#6ee7b7" />
                <Area type="monotone" dataKey="neutral" stackId="1" stroke="#60a5fa" fill="#93c5fd" />
                <Area type="monotone" dataKey="negative" stackId="1" stroke="#f97316" fill="#fdba74" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={18} className="text-emerald-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Channel Comparison</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Engagement, conversion, dan revenue share per channel.</p>
            </div>
          </div>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelPerformance}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="channel" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }} />
                <Legend />
                <Bar dataKey="engagement" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="conversion" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck size={18} className="text-blue-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Response SLA Compliance</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Channel mana yang konsisten menjaga response target.</p>
            </div>
          </div>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slaCompliance} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.12} />
                <XAxis type="number" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis dataKey="channel" type="category" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} width={90} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="compliance" fill="#3b82f6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Activity size={18} className="text-orange-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Content Type Performance</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Mana format konten yang paling kuat dorong engagement dan conversion.</p>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contentTypePerformance}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="type" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }} />
                <Legend />
                <Bar dataKey="engagement" fill="#f97316" radius={[6, 6, 0, 0]} />
                <Bar dataKey="conversion" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-purple-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Revenue vs Engagement Notes</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Insight cepat untuk membantu interpretasi chart.</p>
            </div>
          </div>
          <div className="space-y-3">
            {channelPerformance.map((channel) => (
              <div key={channel.channel} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <BrandLogo brand={resolveBrandKey(channel.channel)} size={34} className="rounded-xl px-1" withRing />
                    <div>
                      <p className="font-semibold text-sm">{channel.channel}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>response {channel.responseRate}% • revenue share {channel.revenue}%</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${channel.conversion >= 5 ? 'bg-emerald-100 text-emerald-600' : channel.engagement >= 5 ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-700'}`}>
                    {channel.conversion >= 5 ? 'conversion driver' : channel.engagement >= 5 ? 'engagement driver' : 'supporting'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Engagement</p>
                    <p className="font-bold">{channel.engagement}%</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Conversion</p>
                    <p className="font-bold">{channel.conversion}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
