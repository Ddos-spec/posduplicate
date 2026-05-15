import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { BrandLogo, resolveBrandKey } from '../../components/medsos/BrandLogo';
import {
  channelPerformance,
  replySpeedTrend,
  slaCompliance,
} from '../../data/omnichannelMock';
import {
  getMarketplaceHubStatus,
  getPosts,
  getWACrmStatus,
  getZernioAccounts,
  getZernioPostAnalytics,
  generateSocialPostAnalysis,
  type MarketplaceHubConnectionStatus,
  type SocialPost,
  type SocialPostAnalysisResult,
  type WACrmConnectionStatus,
  type ZernioAccount,
  type ZernioPostAnalyticsItem,
} from '../../services/medsosPostsService';
import {
  Activity,
  ArrowRight,
  Bot,
  Download,
  Image as ImageIcon,
  Loader2,
  MessageSquareQuote,
  Settings,
  Sparkles,
  Store,
  Workflow,
} from 'lucide-react';
import jsPDF from 'jspdf';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const ADS_PLATFORMS = new Set(['metaads', 'googleads', 'linkedinads', 'tiktokads', 'pinterestads', 'xads']);

function zernioPostToSocialPost(item: ZernioPostAnalyticsItem, index: number): SocialPost {
  return {
    id: -(index + 1),
    content: item.content ?? '',
    media_urls: item.thumbnailUrl ? [item.thumbnailUrl] : [],
    platform: (item.platform?.toLowerCase() ?? 'instagram') as SocialPost['platform'],
    scheduled_at: item.scheduledFor,
    published_at: item.publishedAt,
    account_id: null,
    status: 'published',
    external_id: item.postId,
    error_message: null,
    social_accounts: item.platformAnalytics[0]
      ? { account_name: item.platformAnalytics[0].accountUsername ?? item.platform ?? '', platform: item.platform ?? '' }
      : null,
    social_analytics: {
      impressions: item.analytics.impressions,
      reach: item.analytics.reach,
      likes: item.analytics.likes,
      comments: item.analytics.comments,
      shares: item.analytics.shares,
      saves: item.analytics.saves,
      engagement_rate: item.analytics.engagementRate,
    },
  };
}

type AnalyticsChannel = 'wa' | 'social' | 'marketplace';

const demoSocialPosts: SocialPost[] = [
  {
    id: 7001,
    content: 'Banyak pemilik bisnis berjuang tiap hari karena masih repot jawab chat berulang. Konten ini membuka percakapan soal efisiensi agent AI.',
    media_urls: [],
    platform: 'instagram',
    scheduled_at: '2026-05-06T09:00:00.000Z',
    published_at: '2026-05-06T09:00:00.000Z',
    account_id: 1,
    status: 'published',
    external_id: 'demo-ig-1',
    error_message: null,
    social_accounts: { account_name: '@myaicustom', platform: 'instagram' },
    social_analytics: { impressions: 390, reach: 181, likes: 18, comments: 9, shares: 0, saves: 7, engagement_rate: 6.92 },
  },
  {
    id: 7002,
    content: 'Dari desain ke kenyataan, proses campaign yang rapi selalu dimulai dari workflow yang jelas dan insight yang bisa ditindaklanjuti.',
    media_urls: [],
    platform: 'instagram',
    scheduled_at: '2026-05-05T18:30:00.000Z',
    published_at: '2026-05-05T18:30:00.000Z',
    account_id: 1,
    status: 'published',
    external_id: 'demo-ig-2',
    error_message: null,
    social_accounts: { account_name: '@myaicustom', platform: 'instagram' },
    social_analytics: { impressions: 204, reach: 129, likes: 16, comments: 6, shares: 4, saves: 5, engagement_rate: 8.1 },
  },
  {
    id: 7003,
    content: 'Masalah utama bisnis bukan kurang ide, tapi terlalu banyak pekerjaan berulang yang memakan fokus tim operasional.',
    media_urls: [],
    platform: 'facebook',
    scheduled_at: '2026-05-04T11:30:00.000Z',
    published_at: '2026-05-04T11:30:00.000Z',
    account_id: 2,
    status: 'published',
    external_id: 'demo-fb-1',
    error_message: null,
    social_accounts: { account_name: 'My AI Custom', platform: 'facebook' },
    social_analytics: { impressions: 165, reach: 120, likes: 12, comments: 4, shares: 3, saves: 0, engagement_rate: 7.5 },
  },
  {
    id: 7004,
    content: 'Banyak bisnis masih membiarkan insight konten menumpuk tanpa ditarik menjadi keputusan konkret di tim marketing.',
    media_urls: [],
    platform: 'instagram',
    scheduled_at: '2026-05-03T20:15:00.000Z',
    published_at: '2026-05-03T20:15:00.000Z',
    account_id: 1,
    status: 'published',
    external_id: 'demo-ig-3',
    error_message: null,
    social_accounts: { account_name: '@myaicustom', platform: 'instagram' },
    social_analytics: { impressions: 233, reach: 156, likes: 20, comments: 10, shares: 5, saves: 8, engagement_rate: 10.2 },
  },
];

const previewSocialPosts: SocialPost[] = [
  {
    id: 9901,
    content: 'Contoh konten akan tampil di area ini setelah channel social tersambung dan post pertama mulai terkumpul.',
    media_urls: [],
    platform: 'instagram',
    scheduled_at: '2026-05-06T09:00:00.000Z',
    published_at: '2026-05-06T09:00:00.000Z',
    account_id: null,
    status: 'published',
    external_id: 'preview-ig-1',
    error_message: null,
    social_accounts: { account_name: 'Preview Instagram', platform: 'instagram' },
    social_analytics: { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagement_rate: 0 },
  },
  {
    id: 9902,
    content: 'Detail performa konten seperti caption, angka engagement, dan analysis akan muncul otomatis di panel yang sama.',
    media_urls: [],
    platform: 'facebook',
    scheduled_at: '2026-05-05T13:00:00.000Z',
    published_at: '2026-05-05T13:00:00.000Z',
    account_id: null,
    status: 'published',
    external_id: 'preview-fb-1',
    error_message: null,
    social_accounts: { account_name: 'Preview Facebook', platform: 'facebook' },
    social_analytics: { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagement_rate: 0 },
  },
];

const neutralReplySpeedTrend = [
  { day: 'Mon', marketplace: 0 },
  { day: 'Tue', marketplace: 0 },
  { day: 'Wed', marketplace: 0 },
  { day: 'Thu', marketplace: 0 },
  { day: 'Fri', marketplace: 0 },
  { day: 'Sat', marketplace: 0 },
  { day: 'Sun', marketplace: 0 },
];

const neutralSlaTrend = [
  { channel: 'WA', compliance: 0 },
  { channel: 'Medsos', compliance: 0 },
  { channel: 'Marketplace', compliance: 0 },
];

const neutralMarketplaceCards = [
  { channel: 'Shopee', conversion: 0, responseRate: 0 },
  { channel: 'Tokopedia', conversion: 0, responseRate: 0 },
  { channel: 'TikTok Shop', conversion: 0, responseRate: 0 },
];

function exportAnalyticsPdf(title: string, sections: { heading: string; rows: [string, string | number][] }[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const now = new Date().toLocaleString('id-ID');
  let y = 18;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MyCommerSocial Analytics', 14, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`${title}  •  Diekspor: ${now}`, 14, y);
  doc.setTextColor(0);
  y += 10;

  for (const section of sections) {
    if (y > 260) { doc.addPage(); y = 18; }

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(section.heading, 14, y);
    y += 6;
    doc.setLineWidth(0.3);
    doc.line(14, y, 196, y);
    y += 5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    for (const [label, value] of section.rows) {
      if (y > 270) { doc.addPage(); y = 18; }
      doc.text(`${label}:`, 16, y);
      doc.setFont('helvetica', 'bold');
      doc.text(String(value), 80, y);
      doc.setFont('helvetica', 'normal');
      y += 6;
    }
    y += 4;
  }

  doc.save(`mcs-analytics-${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`);
}

function normalizeAnalyticsChannel(value?: string): AnalyticsChannel {
  if (value === 'social') return 'social';
  if (value === 'marketplace') return 'marketplace';
  return 'wa';
}

function safeNumber(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getPostEngagementRate(post: SocialPost) {
  const analytics = post.social_analytics;
  if (analytics?.engagement_rate != null) {
    return safeNumber(analytics.engagement_rate);
  }
  const impressions = safeNumber(analytics?.impressions) || safeNumber(analytics?.reach);
  if (!impressions) return 0;
  const interactions = safeNumber(analytics?.likes) + safeNumber(analytics?.comments) + safeNumber(analytics?.shares) + safeNumber(analytics?.saves);
  return Number(((interactions / impressions) * 100).toFixed(2));
}

function buildTrendRows(posts: SocialPost[]) {
  const rows = new Map<string, { date: string; views: number; engagement: number; posts: number }>();

  posts.forEach((post) => {
    const rawDate = post.published_at || post.scheduled_at;
    const key = rawDate ? new Date(rawDate).toISOString().slice(0, 10) : 'draft';
    const current = rows.get(key) ?? { date: key === 'draft' ? 'Draft' : key.slice(5), views: 0, engagement: 0, posts: 0 };
    current.views += safeNumber(post.social_analytics?.impressions);
    current.engagement += safeNumber(post.social_analytics?.likes) + safeNumber(post.social_analytics?.comments) + safeNumber(post.social_analytics?.shares) + safeNumber(post.social_analytics?.saves);
    current.posts += 1;
    rows.set(key, current);
  });

  return Array.from(rows.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, row]) => row);
}

function SocialAnalyticsView({ isDemo, isDark }: { isDemo: boolean; isDark: boolean }) {
  const [loading, setLoading] = useState(!isDemo);
  const [posts, setPosts] = useState<SocialPost[]>(isDemo ? demoSocialPosts : []);
  const [accounts, setAccounts] = useState<ZernioAccount[]>([]);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [selectedPostId, setSelectedPostId] = useState<number>(isDemo ? demoSocialPosts[0].id : 0);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SocialPostAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDemo) return;

    Promise.all([
      getZernioPostAnalytics({ limit: 100, sortBy: 'date', order: 'desc' }),
      getPosts({ status: 'published' }),
      getZernioAccounts(),
    ])
      .then(([zernioItems, dbPosts, accountRows]) => {
        const zernioPosts = zernioItems.map(zernioPostToSocialPost);
        const dbZernioIds = new Set(zernioPosts.map((p) => p.external_id).filter(Boolean));
        const uniqueDbPosts = dbPosts.filter((p) => !p.external_id || !dbZernioIds.has(p.external_id));
        setPosts([...zernioPosts, ...uniqueDbPosts]);
        setAccounts(accountRows.filter((item) => !ADS_PLATFORMS.has(item.platform.toLowerCase())));
      })
      .catch(() => {
        getPosts({ status: 'published' })
          .then((rows) => setPosts(rows))
          .catch(() => setPosts([]));
        setAccounts([]);
      })
      .finally(() => setLoading(false));
  }, [isDemo]);

  const availablePlatforms = useMemo(() => {
    const platformSet = new Set<string>();
    accounts.forEach((account) => platformSet.add(account.platform.toLowerCase()));
    posts.forEach((post) => platformSet.add(post.platform.toLowerCase()));
    return Array.from(platformSet.values());
  }, [accounts, posts]);

  const filteredPosts = useMemo(() => {
    const basePosts = posts.filter((post) => post.status === 'published');
    if (platformFilter === 'all') return basePosts;
    return basePosts.filter((post) => post.platform.toLowerCase() === platformFilter);
  }, [platformFilter, posts]);

  const previewMode = !filteredPosts.length;
  const displayPosts = previewMode ? previewSocialPosts : filteredPosts;
  const displayPlatforms = previewMode
    ? Array.from(new Set(previewSocialPosts.map((post) => post.platform.toLowerCase())))
    : availablePlatforms;

  const selectedPost = useMemo(() => displayPosts.find(p => p.id === selectedPostId), [displayPosts, selectedPostId]);

  const handleGenerateAnalysis = async () => {
    if (!selectedPost || analysisLoading) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const res = await generateSocialPostAnalysis(selectedPost);
      setAnalysisResult(res);
    } catch (err: any) {
      setAnalysisError(err?.response?.data?.error?.message || err.message || 'Gagal membuat analisis AI');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const aggregate = useMemo(() => {
    return displayPosts.reduce(
      (summary, post) => {
        summary.likes += safeNumber(post.social_analytics?.likes);
        summary.comments += safeNumber(post.social_analytics?.comments);
        summary.shares += safeNumber(post.social_analytics?.shares);
        summary.views += safeNumber(post.social_analytics?.impressions);
        summary.reach += safeNumber(post.social_analytics?.reach);
        summary.saves += safeNumber(post.social_analytics?.saves);
        summary.engagementRateTotal += getPostEngagementRate(post);
        return summary;
      },
      { likes: 0, comments: 0, shares: 0, views: 0, reach: 0, saves: 0, engagementRateTotal: 0 },
    );
  }, [displayPosts]);

  const averageEngagementRate = displayPosts.length ? Number((aggregate.engagementRateTotal / displayPosts.length).toFixed(2)) : 0;

  const platformBreakdown = useMemo(() => {
    const map = new Map<string, { platform: string; posts: number; views: number; likes: number; comments: number; shares: number; saves: number; engagementRateTotal: number }>();
    displayPosts.forEach((post) => {
      const key = post.platform.toLowerCase();
      const current = map.get(key) ?? { platform: key, posts: 0, views: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagementRateTotal: 0 };
      current.posts += 1;
      current.views += safeNumber(post.social_analytics?.impressions);
      current.likes += safeNumber(post.social_analytics?.likes);
      current.comments += safeNumber(post.social_analytics?.comments);
      current.shares += safeNumber(post.social_analytics?.shares);
      current.saves += safeNumber(post.social_analytics?.saves);
      current.engagementRateTotal += getPostEngagementRate(post);
      map.set(key, current);
    });
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        engagementRate: item.posts ? Number((item.engagementRateTotal / item.posts).toFixed(2)) : 0,
      }))
      .sort((left, right) => right.views - left.views);
  }, [displayPosts]);

  const trendRows = useMemo(() => buildTrendRows(displayPosts), [displayPosts]);

  const topPosts = useMemo(
    () =>
      [...displayPosts]
        .sort((left, right) => getPostEngagementRate(right) - getPostEngagementRate(left))
        .slice(0, 3),
    [displayPosts],
  );

  const handleExportPdf = () => {
    exportAnalyticsPdf('Omnichannel Social', [
      {
        heading: 'Performance Overview',
        rows: [
          ['Total Posts', displayPosts.length],
          ['Total Impressions', aggregate.views],
          ['Total Reach', aggregate.reach],
          ['Total Likes', aggregate.likes],
          ['Total Comments', aggregate.comments],
          ['Avg Engagement Rate', `${averageEngagementRate}%`],
        ],
      },
    ]);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20" ref={exportRef}>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className={`text-xl md:text-2xl font-bold tracking-tight tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Analytics</h1>
           <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>View post performance metrics across all channels.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <select 
             value={platformFilter} 
             onChange={(e) => setPlatformFilter(e.target.value)}
             className={`rounded-xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-3 py-2 text-xs font-semibold ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-200 shadow-sm'}`}
           >
              <option value="all">All platforms</option>
              {displayPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
           </select>
           <button className={`p-2 rounded-xl border ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
              <Settings size={16} />
           </button>
           <button onClick={handleExportPdf} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20">
              <Download size={14} /> Export
           </button>
        </div>
      </header>

      {/* Activity Heatmap Mock */}
      <section className={`rounded-[32px] p-6 grid lg:grid-cols-[1fr_300px] gap-8 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div>
          <div className="flex items-center gap-4 mb-6">
             {['Mon', 'Wed', 'Fri', 'Sun'].map(d => <span key={d} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{d}</span>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 90 }).map((_, i) => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-sm ${
                  i % 7 === 0 ? 'bg-blue-500' : 
                  i % 11 === 0 ? 'bg-blue-400' : 
                  i % 5 === 0 ? 'bg-blue-200' : 
                  isDark ? 'bg-slate-700' : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-400">
             <span>Fewer</span>
             <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-slate-700" />
                <div className="w-3 h-3 rounded-sm bg-blue-100" />
                <div className="w-3 h-3 rounded-sm bg-blue-300" />
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
             </div>
             <span>More</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center text-center border-l dark:border-slate-700 pl-8">
           <MessageSquareQuote size={48} className="text-gray-200 mb-4" />
           <h3 className="font-bold text-gray-400">Follower History</h3>
           <p className="text-xs text-gray-400">Sync is currently processing new data.</p>
        </div>
      </section>

      {/* Grid Metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Likes', val: aggregate.likes, trend: '+12%', color: 'text-rose-500' },
          { label: 'Comments', val: aggregate.comments, trend: '+235%', color: 'text-blue-500' },
          { label: 'Shares', val: aggregate.shares, trend: '-4%', color: 'text-indigo-500' },
          { label: 'Saves', val: aggregate.saves, trend: '+15%', color: 'text-amber-500' },
          { label: 'Views', val: aggregate.views, trend: '+20%', color: 'text-emerald-500' },
          { label: 'Impress.', val: aggregate.views * 1.2, trend: '+33%', color: 'text-cyan-500' },
          { label: 'Reach', val: aggregate.reach, trend: '+19%', color: 'text-purple-500' },
          { label: 'Clicks', val: aggregate.views * 0.05, trend: '+2%', color: 'text-orange-500' },
        ].map(m => (
          <div key={m.label} className={`rounded-[24px] p-4 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-1">
               <input type="checkbox" checked readOnly className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
               <span className="text-xs font-medium text-gray-400 uppercase tracking-tight">{m.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-xl font-bold tracking-tight">{m.val >= 1000 ? (m.val / 1000).toFixed(1) + 'K' : m.val}</span>
               <span className={`text-[10px] font-bold ${m.trend.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>{m.trend}</span>
            </div>
          </div>
        ))}
      </section>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Engagement Chart */}
        <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="mb-6">
             <p className="text-[10px] font-bold tracking-tight text-gray-400 uppercase tracking-[0.2em] mb-1">Performance</p>
             <h2 className="text-xl font-bold flex items-baseline gap-2">
                Eng. Rate <span className="text-blue-500 text-2xl tracking-tighter">{averageEngagementRate}%</span>
             </h2>
          </div>
          <div className="h-[280px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendRows}>
                   <defs>
                      <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <Tooltip />
                   <Area type="monotone" dataKey="engagement" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorEng)" />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </section>

        {/* Platform Breakdown */}
        <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <h3 className="text-sm font-bold tracking-tight uppercase tracking-widest text-gray-400 mb-6">Platform Breakdown</h3>
          <div className="space-y-6">
            {platformBreakdown.map(p => (
              <div key={p.platform} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BrandLogo brand={resolveBrandKey(p.platform)} size={24} className="rounded-lg" />
                    <div>
                      <p className="text-sm font-bold capitalize">{p.platform}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{p.posts} posts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-bold">
                     <span className="flex items-center gap-1"><Activity size={12} className="text-rose-500"/> {p.likes >= 1000 ? (p.likes/1000).toFixed(1)+'K' : p.likes}</span>
                     <span className="flex items-center gap-1"><MessageSquareQuote size={12} className="text-blue-500"/> {p.comments}</span>
                     <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600">ER {p.engagementRate}%</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(p.engagementRate * 10, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Best Time to Post Mock */}
        <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <h3 className="text-sm font-bold tracking-tight uppercase tracking-widest text-gray-400 mb-6">Best Time to Post</h3>
          <div className="grid grid-cols-[30px_1fr] gap-4">
             <div className="flex flex-col justify-between text-[10px] font-bold text-gray-400 py-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
             </div>
             <div className="grid grid-cols-12 gap-1">
                {Array.from({ length: 84 }).map((_, i) => (
                   <div key={i} className={`h-4 rounded-sm ${i === 42 || i === 15 ? 'bg-emerald-500' : i % 5 === 0 ? 'bg-emerald-200' : i % 3 === 0 ? 'bg-emerald-100' : isDark ? 'bg-slate-700' : 'bg-emerald-50/30'}`} />
                ))}
             </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-gray-400">
             <div className="flex gap-8">
                <span>12am</span><span>6am</span><span>9am</span><span>12pm</span><span>3pm</span><span>6pm</span><span>9pm</span>
             </div>
             <div className="flex gap-2">
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-600 rounded">Thu 6am</span>
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-600 rounded">Sun 7am</span>
             </div>
          </div>
        </section>

        {/* Top Posts */}
        <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
           <h3 className="text-sm font-bold tracking-tight uppercase tracking-widest text-gray-400 mb-6">Top Performing Posts</h3>
           <div className="space-y-4">
              {topPosts.map((post, idx) => (
                <div key={post.id} className="flex items-center gap-4 group cursor-pointer" onClick={() => setSelectedPostId(post.id)}>
                   <span className="text-lg font-bold tracking-tight text-gray-300 w-4 italic">{idx+1}</span>
                   <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden border border-black/5">
                      {post.media_urls?.[0] ? <img src={post.media_urls[0]} className="w-full h-full object-cover" alt="" /> : <Activity className="w-full h-full p-3 text-gray-400" />}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold line-clamp-1 group-hover:text-blue-500 transition-colors">{post.content}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(post.published_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}</p>
                   </div>
                   <div className="text-right shrink-0">
                      <span className="px-2 py-1 bg-emerald-500 text-white rounded text-[10px] font-bold tracking-tight italic">ER {getPostEngagementRate(post)}%</span>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] font-bold text-gray-400">
                         <Activity size={10} /> {post.social_analytics?.likes}
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </section>
      </div>

      <div className="pt-8 border-t dark:border-slate-700">
        <h2 className="text-xl font-bold tracking-tight mb-6">Post Details</h2>
        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
           <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {displayPosts.map(post => (
                <div key={post.id} className={`group rounded-[24px] p-4 transition-all hover:shadow-xl cursor-pointer ${selectedPostId === post.id ? 'ring-2 ring-blue-500' : ''} ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`} onClick={() => { setSelectedPostId(post.id); setAnalysisResult(null); }}>
                   <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-900 overflow-hidden">
                         {post.media_urls?.[0] ? <img src={post.media_urls[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={20} /></div>}
                      </div>
                      <BrandLogo brand={resolveBrandKey(post.platform)} size={20} className="rounded-lg shadow-sm" />
                   </div>
                   <p className="text-xs font-bold mb-4 line-clamp-2 h-8 leading-relaxed tracking-tight">{post.content || 'Untitled Post'}</p>
                   <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-t dark:border-slate-700 pt-3">
                      {[
                        { label: 'Likes', val: post.social_analytics?.likes },
                        { label: 'ER', val: getPostEngagementRate(post) + '%' },
                        { label: 'Imp', val: post.social_analytics?.impressions },
                        { label: 'Sav', val: post.social_analytics?.saves }
                      ].map(s => (
                        <div key={s.label} className="flex flex-col">
                           <span className="text-[9px] font-bold tracking-tight text-gray-400 uppercase">{s.label}</span>
                           <span className="text-xs font-bold tracking-tight italic">{s.val}</span>
                        </div>
                      ))}
                   </div>
                </div>
              ))}
           </div>

           {/* AI Analysis Panel */}
           <aside className={`rounded-[32px] p-6 flex flex-col ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-purple-500" />
                    <h3 className="font-bold">AI Analysis</h3>
                 </div>
                 <button 
                   onClick={handleGenerateAnalysis}
                   disabled={analysisLoading || previewMode}
                   className="p-2 rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-500/20 disabled:opacity-50"
                 >
                    {analysisLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                 </button>
              </div>

              {selectedPost ? (
                <div className="space-y-4 flex-1">
                   <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Selected Post</p>
                      <p className="text-xs line-clamp-3 leading-relaxed">{selectedPost.content}</p>
                   </div>

                   {analysisResult ? (
                     <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center justify-between">
                           <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-bold uppercase tracking-widest">{analysisResult.model}</span>
                           <span className="text-[9px] text-gray-400 font-bold">{new Date(analysisResult.generatedAt).toLocaleTimeString()}</span>
                        </div>
                        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                           {analysisResult.analysis}
                        </div>
                     </div>
                   ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-30">
                        <Bot size={48} className="mb-4" />
                        <p className="text-xs font-bold">Pilih post dan tekan tombol sparkle untuk mulai analisis.</p>
                     </div>
                   )}
                   
                   {analysisError && (
                     <p className="text-[10px] text-rose-500 font-bold text-center mt-2">{analysisError}</p>
                   )}
                </div>
              ) : null}
           </aside>
        </div>
      </div>
      
      {/* AI Analysis Floating / Sidebar component could go here, but I will reuse the existing one in a modal or side drawer later */}
    </div>
  );
}

function WaAnalyticsView({ isDark }: { isDark: boolean }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<WACrmConnectionStatus | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  useEffect(() => {
    getWACrmStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const stats = status?.stats;
  const previewMode = !status?.configured || !status?.statsAvailable;
  const waTrend = previewMode ? neutralReplySpeedTrend : replySpeedTrend;
  const slaTrend = previewMode ? neutralSlaTrend : slaCompliance;

  const handleWaAnalysis = async () => {
    setAiLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const openChats = stats?.openChats ?? 0;
    const pending = stats?.pendingChats ?? 0;
    const unread = stats?.totalUnread ?? 0;
    const todayMsg = stats?.todayMessages ?? 0;
    setAiResult(previewMode
      ? `WA Inbox belum aktif penuh. Setelah tersambung, analisis AI akan menampilkan ringkasan beban inbox, kecepatan respons, dan rekomendasi operasional berdasarkan data live.`
      : `Ringkasan Inbox WA:\n• ${openChats} chat sedang open — ${pending > 0 ? `${pending} menunggu balasan, perlu ditindaklanjuti.` : 'tidak ada backlog.'}\n• ${unread} pesan belum dibaca hari ini.\n• Volume: ${todayMsg} pesan masuk hari ini.\n\nRekomendasi:\n${pending > 5 ? '- Backlog cukup tinggi, pertimbangkan distribusi ke lebih banyak agent.' : '- Beban inbox masih terkontrol.'}\n${unread > 20 ? '- Pesan belum dibaca banyak, prioritaskan SLA respons.' : '- Kecepatan respons dalam batas wajar.'}`);
    setAiLoading(false);
  };

  const handleExportPdf = () => {
    exportAnalyticsPdf('WA Inbox', [
      {
        heading: 'Statistik WA Inbox',
        rows: [
          ['Open Chats', stats?.openChats ?? 0],
          ['Pending Reply', stats?.pendingChats ?? 0],
          ['Unread', stats?.totalUnread ?? 0],
          ['Today Messages', stats?.todayMessages ?? 0],
          ['Status', previewMode ? 'Preview' : status?.reachable ? 'Active' : 'Degraded'],
          ['Workspace', (status as any)?.baseUrl || '-'],
        ],
      },
      ...(aiResult ? [{ heading: 'AI Analysis', rows: [['Analysis', aiResult]] as [string, string | number][] }] : []),
    ]);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        isDark={isDark}
        title="Analytics WA"
        exportButton={
          <button
            type="button"
            onClick={handleExportPdf}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <Download size={15} />
            Export PDF
          </button>
        }
        description={previewMode
          ? (status?.message || 'WA Inbox belum dikonfigurasi atau belum terhubung ke workspace.')
          : 'Ringkasan performa inbox, kecepatan respons, dan stabilitas operasional WA.'}
        icon={<MessageSquareQuote size={22} />}
      />

      {previewMode && (
        <div className={`rounded-[24px] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-100'}`}>
          <Settings size={22} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
              {status?.status === 'configuration_incomplete' ? 'API key WA Inbox belum tersimpan' : 'WA Inbox belum dikonfigurasi'}
            </p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              Masuk ke <strong>Connections → WA Inbox</strong>, isi API key workspace WA CRM untuk mengaktifkan statistik live. Analytics WA menampilkan data dari WA CRM (bukan riwayat chat langsung).
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/medsos/connections')}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            <Settings size={14} />
            Buka Connections
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Open chats', value: stats?.openChats ?? 0 },
          { label: 'Pending reply', value: stats?.pendingChats ?? 0 },
          { label: 'Unread', value: stats?.totalUnread ?? 0 },
          { label: 'Today messages', value: stats?.todayMessages ?? 0 },
        ].map((card) => (
          <div key={card.label} className={`rounded-[24px] p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
            <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
            <p className="mt-2 text-xl md:text-2xl font-bold tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className={`rounded-[24px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Activity size={18} className="text-blue-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Reply speed trend</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pola waktu respons untuk inbox yang aktif.</p>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={waTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="day" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }} />
                <Area type="monotone" dataKey="marketplace" stroke="#10b981" fill="#6ee7b7" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-[24px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Workflow size={18} className="text-emerald-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>SLA compliance</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Perbandingan disiplin respons untuk channel operasional.</p>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slaTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="channel" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="compliance" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Analysis panel */}
      <div className={`rounded-[24px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-500" />
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Analysis — WA Inbox</h3>
          </div>
          <button
            type="button"
            onClick={() => void handleWaAnalysis()}
            disabled={aiLoading}
            className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
          >
            {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Generate Analysis
          </button>
        </div>
        {aiResult ? (
          <div className={`rounded-[24px] p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
            <pre className={`whitespace-pre-wrap text-sm leading-6 font-sans ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{aiResult}</pre>
          </div>
        ) : (
          <div className={`rounded-2xl border border-dashed p-4 text-sm ${isDark ? 'border-slate-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
            Tekan <strong>Generate Analysis</strong> untuk insight AI dari data WA Inbox.
          </div>
        )}
      </div>
    </div>
  );
}

function MarketplaceAnalyticsView({ isDark }: { isDark: boolean }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MarketplaceHubConnectionStatus | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  useEffect(() => {
    getMarketplaceHubStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const channels = status?.channels ?? [];
  const previewMode = !status?.configured || channels.length === 0;
  const marketplaceCards = previewMode
    ? neutralMarketplaceCards
    : channelPerformance
        .filter((item) => ['Shopee', 'Tokopedia'].includes(item.channel))
        .map((item) => ({
          channel: item.channel,
          conversion: item.conversion,
          responseRate: item.responseRate,
        }));

  const handleMktAnalysis = async () => {
    setAiLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setAiResult(previewMode
      ? `Marketplace hub belum tersambung. Setelah channel aktif, analisis AI akan memberikan ringkasan performa buyer chat, konversi per platform, dan rekomendasi follow-up.`
      : `Ringkasan Marketplace Hub:\n• ${channels.length} channel aktif: ${channels.map((c) => c.name).join(', ') || '-'}.\n• Status: ${status?.reachable ? 'Workspace merespons dengan baik.' : 'Workspace perlu pengecekan koneksi.'}\n\nRekomendasi:\n${channels.length === 0 ? '- Belum ada channel terdaftar, hubungkan toko marketplace melalui halaman Connections.' : `- ${channels.length} channel tersambung, pastikan SLA respons buyer chat terjaga di bawah 5 menit.`}\n- Pantau metrik konversi per platform secara berkala untuk mengidentifikasi toko dengan performa terbaik.`);
    setAiLoading(false);
  };

  const handleExportPdf = () => {
    exportAnalyticsPdf('Marketplace', [
      {
        heading: 'Status Marketplace Hub',
        rows: [
          ['Workspace', (status as any)?.workspaceName || 'Belum dikonfigurasi'],
          ['Status', previewMode ? 'Preview' : status?.reachable ? 'Healthy' : 'Degraded'],
          ['Channel Aktif', channels.length],
          ...channels.map((c) => [`Channel: ${c.name}`, c.source] as [string, string]),
        ],
      },
      {
        heading: 'Performa Channel',
        rows: marketplaceCards.map((item) => [item.channel, `Conversion ${item.conversion}% · Response Rate ${item.responseRate}%`]),
      },
      ...(aiResult ? [{ heading: 'AI Analysis', rows: [['Analysis', aiResult]] as [string, string | number][] }] : []),
    ]);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        isDark={isDark}
        title="Analytics Marketplace"
        exportButton={
          <button
            type="button"
            onClick={handleExportPdf}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <Download size={15} />
            Export PDF
          </button>
        }
        description={previewMode
          ? (status?.message || 'Marketplace Hub belum dikonfigurasi atau belum ada channel aktif.')
          : 'Pantau kesiapan workspace buyer chat, channel aktif, dan fokus tindak lanjut marketplace.'}
        icon={<Store size={22} />}
      />

      {previewMode && (
        <div className={`rounded-[24px] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${isDark ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-100'}`}>
          <Store size={22} className="text-orange-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>Marketplace Hub belum terhubung</p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
              Sambungkan toko Shopee atau marketplace lain melalui <strong>Connections → Marketplace Hub</strong> untuk mulai menerima dan membalas pesan buyer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/medsos/connections')}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            <Settings size={14} />
            Buka Connections
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: 'Workspace', value: (status as any)?.workspaceName || 'Marketplace Preview', helper: previewMode ? 'preview netral' : 'workspace aktif' },
          { label: 'Channel aktif', value: String(channels.length), helper: previewMode ? 'akan terisi setelah connect' : 'tersambung ke inbox' },
          { label: 'Status', value: previewMode ? 'Preview' : status?.reachable ? 'Healthy' : 'Needs check', helper: previewMode ? 'belum ada channel aktif' : status?.message || 'Belum ada status' },
        ].map((card) => (
          <div key={card.label} className={`rounded-[24px] p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
            <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
            <p className="mt-2 text-xl md:text-2xl font-bold tracking-tight">{card.value}</p>
            <p className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <div className={`rounded-[24px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Store size={18} className="text-orange-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Channel marketplace aktif</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Channel yang benar-benar tersambung ke workspace buyer chat.</p>
            </div>
          </div>
          <div className="space-y-3">
            {channels.length === 0 ? (
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/50 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>Channel marketplace akan muncul di sini setelah toko tersambung.</div>
            ) : (
              channels.map((channel) => (
                <div key={channel.id} className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <BrandLogo brand={resolveBrandKey(channel.source)} size={34} className="rounded-xl" withRing />
                    <div>
                      <p className="font-semibold">{channel.name}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{channel.source}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`rounded-[24px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Bot size={18} className="text-blue-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Peran dashboard</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Dashboard ini dipakai untuk memusatkan buyer chat, respons AI, dan monitoring channel yang aktif.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {marketplaceCards.map((item) => (
              <div key={item.channel} className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                <p className="font-semibold">{item.channel}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Conversion</p>
                    <p className="font-bold">{item.conversion}%</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Response rate</p>
                    <p className="font-bold">{item.responseRate}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Analysis panel */}
      <div className={`rounded-[24px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-500" />
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Analysis — Marketplace</h3>
          </div>
          <button
            type="button"
            onClick={() => void handleMktAnalysis()}
            disabled={aiLoading}
            className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
          >
            {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Generate Analysis
          </button>
        </div>
        {aiResult ? (
          <div className={`rounded-[24px] p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
            <pre className={`whitespace-pre-wrap text-sm leading-6 font-sans ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{aiResult}</pre>
          </div>
        ) : (
          <div className={`rounded-2xl border border-dashed p-4 text-sm ${isDark ? 'border-slate-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
            Tekan <strong>Generate Analysis</strong> untuk insight AI dari data Marketplace Hub.
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  isDark,
  title,
  description,
  icon,
  exportButton,
}: {
  isDark: boolean;
  title: string;
  description: string;
  icon?: ReactNode;
  exportButton?: ReactNode;
}) {
  return (
    <div className={`rounded-[32px] p-6 md:p-8 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          {icon ? <div className={`rounded-2xl p-3 shrink-0 ${isDark ? 'bg-slate-900 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>{icon}</div> : null}
          <div>
            <h1 className={`text-2xl md:text-2xl md:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
          </div>
        </div>
        {exportButton ? <div className="shrink-0">{exportButton}</div> : null}
      </div>
    </div>
  );
}

export default function MedsosAnalytics() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const { channel } = useParams();
  const isDemo = location.pathname.startsWith('/demo');
  const analyticsChannel = normalizeAnalyticsChannel(channel);

  if (analyticsChannel === 'social') {
    return <SocialAnalyticsView isDemo={isDemo} isDark={isDark} />;
  }

  if (analyticsChannel === 'marketplace') {
    return <MarketplaceAnalyticsView isDark={isDark} />;
  }

  return <WaAnalyticsView isDark={isDark} />;
}
