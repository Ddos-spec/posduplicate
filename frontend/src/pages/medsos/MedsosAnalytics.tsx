import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { BrandLogo, resolveBrandKey } from '../../components/medsos/BrandLogo';
import FieldHelp from '../../components/medsos/FieldHelp';
import {
  bestPostingWindows,
  channelPerformance,
  replySpeedTrend,
  slaCompliance,
} from '../../data/omnichannelMock';
import {
  generateSocialPostAnalysis,
  getMarketplaceHubStatus,
  getPosts,
  getWACrmStatus,
  getZernioAccounts,
  getZernioPostAnalytics,
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
  BarChart3,
  Bot,
  Download,
  FileText,
  LineChart as LineChartIcon,
  Loader2,
  MessageSquareQuote,
  PenLine,
  Settings,
  Sparkles,
  Store,
  TrendingUp,
  Workflow,
} from 'lucide-react';
import jsPDF from 'jspdf';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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

function truncateText(value: string, limit = 120) {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit).trim()}…`;
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
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!displayPosts.length) {
      setSelectedPostId(0);
      setAnalysisResult(null);
      setAnalysisError(null);
      return;
    }
    if (!displayPosts.some((post) => post.id === selectedPostId)) {
      setSelectedPostId(displayPosts[0].id);
      setAnalysisResult(null);
      setAnalysisError(null);
    }
  }, [displayPosts, selectedPostId]);

  const selectedPost = displayPosts.find((post) => post.id === selectedPostId) ?? displayPosts[0] ?? null;

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
    const map = new Map<string, { platform: string; posts: number; views: number; likes: number; engagementRateTotal: number }>();
    displayPosts.forEach((post) => {
      const key = post.platform.toLowerCase();
      const current = map.get(key) ?? { platform: key, posts: 0, views: 0, likes: 0, engagementRateTotal: 0 };
      current.posts += 1;
      current.views += safeNumber(post.social_analytics?.impressions);
      current.likes += safeNumber(post.social_analytics?.likes);
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
        .slice(0, 5),
    [displayPosts],
  );

  const filteredWindows = useMemo(() => {
    if (previewMode) {
      return [
        { id: 9001, channel: 'Instagram', time: '09:00 - 10:00', confidence: 'Preview', note: 'Waktu terbaik akan muncul setelah data cukup.' },
        { id: 9002, channel: 'Facebook', time: '12:00 - 13:00', confidence: 'Preview', note: 'Insight jam tayang akan dihitung otomatis.' },
      ];
    }
    if (platformFilter === 'all') return bestPostingWindows;
    return bestPostingWindows.filter((item) => item.channel.toLowerCase().includes(platformFilter));
  }, [platformFilter, previewMode]);

  const handleGenerateAnalysis = async () => {
    if (!selectedPost) return;
    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      if (isDemo) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        setAnalysisResult({
          generatedAt: new Date().toISOString(),
          model: 'Demo Analysis',
          analysis: [
            '1. Ringkasan singkat',
            `Konten ini punya engagement ${getPostEngagementRate(selectedPost)}% dan paling kuat menarik perhatian lewat hook pembuka yang langsung ke masalah utama audiens.`,
            '',
            '2. Yang bekerja',
            '- Kalimat pembuka cukup tajam dan mudah dipahami.',
            '- Interaksi komentar menunjukkan topik ini relevan untuk audiens bisnis.',
            '',
            '3. Yang perlu dibenahi',
            '- CTA masih bisa dibuat lebih spesifik.',
            '- Visual dan caption bisa lebih diarahkan ke aksi berikutnya.',
            '',
            '4. Rekomendasi eksperimen berikutnya',
            '- Uji caption yang lebih pendek dengan CTA langsung.',
            '- Bandingkan format carousel vs single image untuk tema serupa.',
          ].join('\n'),
        });
      } else if (selectedPost.id < 0) {
        // Zernio post — generate analysis from metrics
        const a = selectedPost.social_analytics;
        const er = a?.engagement_rate ?? 0;
        const imp = a?.impressions ?? 0;
        const reach = a?.reach ?? 0;
        const likes = a?.likes ?? 0;
        const comments = a?.comments ?? 0;
        setAnalysisResult({
          generatedAt: new Date().toISOString(),
          model: 'Post Insights',
          analysis: [
            '1. Ringkasan performa',
            `Post ini meraih ${imp.toLocaleString('id-ID')} impressions, ${reach.toLocaleString('id-ID')} reach, dengan engagement rate ${er.toFixed(2)}%.`,
            '',
            '2. Insight',
            `- Likes: ${likes.toLocaleString('id-ID')} | Comments: ${comments.toLocaleString('id-ID')} | Shares: ${(a?.shares ?? 0).toLocaleString('id-ID')} | Saves: ${(a?.saves ?? 0).toLocaleString('id-ID')}`,
            er > 5 ? `- Engagement rate ${er.toFixed(2)}% di atas rata-rata — konten ini bekerja dengan baik.` : er > 2 ? `- Engagement rate ${er.toFixed(2)}% di kisaran rata-rata.` : `- Engagement rate ${er.toFixed(2)}% cukup rendah — pertimbangkan A/B test format atau waktu posting.`,
            '',
            '3. Rekomendasi',
            likes > comments * 3 ? '- Interaksi didominasi likes — tambah CTA (pertanyaan, polling) untuk tingkatkan komentar.' : '- Engagement komentar bagus — balas komentar untuk memperpanjang jangkauan organik.',
            (a?.saves ?? 0) > (likes ?? 0) * 0.1 ? '- Tingkat saves tinggi — konten ini bernilai sebagai referensi, pertimbangkan konten serupa.' : '',
          ].filter((line) => line !== undefined).join('\n'),
        });
      } else {
        const result = await generateSocialPostAnalysis(selectedPost.id);
        setAnalysisResult(result);
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Gagal membuat analysis.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleExportPdf = () => {
    exportAnalyticsPdf('Medsos Social', [
      {
        heading: 'Ringkasan Performa',
        rows: [
          ['Total Posts', displayPosts.length],
          ['Total Views', aggregate.views],
          ['Total Reach', aggregate.reach],
          ['Total Likes', aggregate.likes],
          ['Total Comments', aggregate.comments],
          ['Total Shares', aggregate.shares],
          ['Total Saves', aggregate.saves],
          ['Avg Engagement Rate', `${averageEngagementRate}%`],
        ],
      },
      {
        heading: 'Platform Breakdown',
        rows: platformBreakdown.map((item) => [item.platform.toUpperCase(), `${item.posts} post · ER ${item.engagementRate}%`]),
      },
      ...(analysisResult ? [{
        heading: 'AI Analysis',
        rows: [['Generated', new Date(analysisResult.generatedAt).toLocaleString('id-ID')], ['Model', analysisResult.model], ['Analysis', analysisResult.analysis.substring(0, 800)]] as [string, string | number][],
      }] : []),
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
    <div className="space-y-6" ref={exportRef}>
      <SectionHeader
        isDark={isDark}
        title="Analytics Medsos"
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
          ? 'Belum ada post yang dipublish via platform ini. Analytics hanya tersedia untuk konten yang dijadwalkan lewat Content Scheduler kami.'
          : 'Lihat performa konten per channel, buka detail post, lalu jalankan analysis hanya saat tombol generate ditekan.'}
        icon={<LineChartIcon size={22} />}
      />

      {previewMode && !isDemo && (
        <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-100'}`}>
          <PenLine size={22} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>Cara mendapatkan data analytics</p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              Buat dan jadwalkan post via Content Scheduler. Setelah post dipublish, data analytics akan muncul di sini secara otomatis. Post yang dipublish langsung di aplikasi platform tidak terlacak di sini.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/medsos/content')}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <PenLine size={14} />
            Buka Content Scheduler
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      <div className={`rounded-3xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={platformFilter}
            onChange={(event) => setPlatformFilter(event.target.value)}
            className={`rounded-2xl border px-4 py-2.5 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-gray-200 bg-white text-gray-900'}`}
          >
            <option value="all">All platforms</option>
            {displayPlatforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </option>
            ))}
          </select>
          <div className={`rounded-2xl px-4 py-2.5 text-sm ${isDark ? 'bg-slate-900 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
            {displayPosts.length} post tampil
          </div>
          <div className={`rounded-2xl px-4 py-2.5 text-sm ${isDark ? 'bg-slate-900 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
            Channel aktif: {displayPlatforms.length}
          </div>
          {previewMode ? (
            <div className={`rounded-2xl px-4 py-2.5 text-sm ${isDark ? 'bg-slate-900 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
              Preview netral
            </div>
          ) : null}
        </div>
      </div>

      {previewMode ? (
        <div className={`rounded-2xl border border-dashed p-4 text-sm ${isDark ? 'border-slate-700 text-gray-300 bg-slate-800/60' : 'border-gray-200 text-gray-600 bg-white'}`}>
          Belum ada post yang tersambung. Semua angka dan grafik di bawah ini masih netral agar bentuk dashboard tetap bisa dilihat lebih dulu.
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Likes', value: aggregate.likes },
          { label: 'Comments', value: aggregate.comments },
          { label: 'Shares', value: aggregate.shares },
          { label: 'Views', value: aggregate.views },
          { label: 'Reach', value: aggregate.reach },
          { label: 'Saves', value: aggregate.saves },
          { label: 'Avg ER', value: `${averageEngagementRate}%` },
          { label: 'Published posts', value: displayPosts.length },
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Activity size={18} className="text-blue-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Performance trend</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Views dan engagement per tanggal publish.</p>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendRows}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="date" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none' }} />
                <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="engagement" stroke="#10b981" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-purple-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Platform breakdown</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Performa per channel yang benar-benar aktif.</p>
            </div>
          </div>
          <div className="space-y-3">
            {platformBreakdown.map((item) => (
              <div key={item.platform} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <BrandLogo brand={resolveBrandKey(item.platform)} size={34} className="rounded-xl" withRing />
                    <div>
                      <p className="font-semibold capitalize">{item.platform}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.posts} post</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${isDark ? 'bg-slate-800 text-gray-200' : 'bg-white text-gray-700 border border-gray-200'}`}>
                    ER {item.engagementRate}%
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Views</p>
                    <p className="font-bold">{item.views}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Likes</p>
                    <p className="font-bold">{item.likes}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={18} className="text-emerald-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Best time to post</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Referensi waktu terbaik berdasarkan pola performa konten.</p>
            </div>
          </div>
          <div className="space-y-3">
            {filteredWindows.map((item) => (
              <div key={item.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <BrandLogo brand={resolveBrandKey(item.channel)} size={34} className="rounded-xl" withRing />
                  <div>
                    <p className="font-semibold">{item.channel}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.time} • {item.confidence} confidence</p>
                  </div>
                </div>
                <p className={`mt-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-orange-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Top performing posts</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Konten dengan engagement rate tertinggi pada filter aktif.</p>
            </div>
          </div>
          <div className="space-y-3">
            {topPosts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => {
                  setSelectedPostId(post.id);
                  setAnalysisResult(null);
                  setAnalysisError(null);
                }}
                className={`w-full rounded-2xl border p-4 text-left transition ${selectedPost?.id === post.id ? 'ring-2 ring-blue-500' : ''} ${isDark ? 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/70' : 'border-gray-100 bg-gray-50 hover:bg-white'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <BrandLogo brand={resolveBrandKey(post.platform)} size={34} className="rounded-xl" withRing />
                    <div>
                      <p className="font-semibold">{truncateText(post.content, 54)}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{post.published_at?.slice(0, 10) || 'Draft'} • ER {getPostEngagementRate(post)}%</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
                    {safeNumber(post.social_analytics?.likes)} likes
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              <div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Post details</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Klik salah satu post untuk melihat detail lengkap.</p>
              </div>
            </div>
            <FieldHelp title="Post details" description="Setelah post dipilih, Anda bisa membaca deskripsi konten, metrik, dan menjalankan analysis hanya saat diperlukan." />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
              {displayPosts.map((post) => (
                <button
                key={post.id}
                type="button"
                onClick={() => {
                  setSelectedPostId(post.id);
                  setAnalysisResult(null);
                  setAnalysisError(null);
                }}
                className={`rounded-2xl border p-4 text-left transition ${selectedPost?.id === post.id ? 'ring-2 ring-blue-500' : ''} ${isDark ? 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/70' : 'border-gray-100 bg-gray-50 hover:bg-white'}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <BrandLogo brand={resolveBrandKey(post.platform)} size={34} className="rounded-xl" withRing />
                  <div>
                    <p className="font-semibold capitalize">{post.platform}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{post.social_accounts?.account_name || 'Connected account'}</p>
                  </div>
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{truncateText(post.content, 110)}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Views</p>
                    <p className="font-bold">{safeNumber(post.social_analytics?.impressions)}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ER</p>
                    <p className="font-bold">{getPostEngagementRate(post)}%</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-purple-500" />
              <div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Content analysis</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Insight akan dibuat hanya saat tombol generate ditekan.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleGenerateAnalysis()}
              disabled={!selectedPost || analysisLoading || previewMode}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {analysisLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Generate Analysis
            </button>
          </div>

          {selectedPost ? (
            <div className="space-y-4">
              <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <BrandLogo brand={resolveBrandKey(selectedPost.platform)} size={34} className="rounded-xl" withRing />
                  <div>
                    <p className="font-semibold capitalize">{selectedPost.platform}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{selectedPost.social_accounts?.account_name || 'Connected account'}</p>
                  </div>
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{selectedPost.content}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Views</p>
                    <p className="font-bold">{safeNumber(selectedPost.social_analytics?.impressions)}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Reach</p>
                    <p className="font-bold">{safeNumber(selectedPost.social_analytics?.reach)}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Likes + Comments</p>
                    <p className="font-bold">{safeNumber(selectedPost.social_analytics?.likes) + safeNumber(selectedPost.social_analytics?.comments)}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Engagement rate</p>
                    <p className="font-bold">{getPostEngagementRate(selectedPost)}%</p>
                  </div>
                </div>
              </div>

              {analysisError ? (
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-rose-100 bg-rose-50 text-rose-700'}`}>
                  {analysisError}
                </div>
              ) : null}

              {analysisResult ? (
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold">Analysis generated</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(analysisResult.generatedAt).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${isDark ? 'bg-slate-800 text-gray-200' : 'bg-white text-gray-700 border border-gray-200'}`}>
                      {analysisResult.model}
                    </span>
                  </div>
                  <div className={`whitespace-pre-wrap text-sm leading-6 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{analysisResult.analysis}</div>
                </div>
              ) : (
                <div className={`rounded-2xl border border-dashed p-5 text-sm ${isDark ? 'border-slate-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                  {previewMode
                    ? <>Generate analysis akan aktif setelah channel dan post pertama sudah masuk ke workspace ini.</>
                    : <>Belum ada analysis. Tekan tombol <strong>Generate Analysis</strong> untuk membuat insight AI terhadap post yang sedang dipilih.</>}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
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
        <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-100'}`}>
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
          <div key={card.label} className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
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

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
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
      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
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
          <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
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
        <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${isDark ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-100'}`}>
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
          <div key={card.label} className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
            <p className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
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
                <div key={channel.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
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

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Bot size={18} className="text-blue-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Peran dashboard</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Dashboard ini dipakai untuk memusatkan buyer chat, respons AI, dan monitoring channel yang aktif.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {marketplaceCards.map((item) => (
              <div key={item.channel} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
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
      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
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
          <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
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
    <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          {icon ? <div className={`rounded-2xl p-3 shrink-0 ${isDark ? 'bg-slate-900 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>{icon}</div> : null}
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
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
