import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { BrandLogo, resolveBrandKey } from '../../components/medsos/BrandLogo';
import {
  approvalFlows,
  campaignBriefs,
  plannerCards,
  scheduleEvents,
  teamActivityFeed,
  type CampaignBrief,
} from '../../data/omnichannelMock';
import {
  CalendarRange,
  CheckCircle2,
  CheckCheck,
  Clock3,
  Eye,
  FileStack,
  Loader2,
  MessageSquareMore,
  Plus,
  Sparkles,
  UserRoundCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getPosts, deletePost, publishPost, type SocialPost } from '../../services/medsosPostsService';

const stageConfig = [
  { id: 'idea', label: 'Idea', tone: 'bg-slate-100 text-slate-700' },
  { id: 'draft', label: 'Draft', tone: 'bg-blue-100 text-blue-600' },
  { id: 'design', label: 'Design', tone: 'bg-purple-100 text-purple-600' },
  { id: 'review', label: 'Review', tone: 'bg-amber-100 text-amber-700' },
  { id: 'scheduled', label: 'Scheduled', tone: 'bg-emerald-100 text-emerald-600' },
  { id: 'published', label: 'Published', tone: 'bg-cyan-100 text-cyan-700' },
] as const;

const goalTone = {
  awareness: 'bg-blue-100 text-blue-600',
  conversion: 'bg-emerald-100 text-emerald-600',
  retention: 'bg-purple-100 text-purple-600',
} as const;

function createFallbackBrief(card: typeof plannerCards[number]): CampaignBrief {
  return {
    id: card.id,
    title: card.title,
    objective: `UI placeholder untuk ${card.title}. Brief detail final bisa diikat ke backend nanti.`,
    audience: 'Segment akan ditentukan saat wiring backend dan campaign service.',
    owner: card.owner,
    reviewer: card.reviewer,
    deadline: card.deadline,
    approvalState: card.stage === 'published' ? 'Sudah live' : `Stage ${card.stage}`,
    channels: card.channels,
    assets: ['Key visual', 'Caption / copy', 'CTA / link target'],
    checklist: [
      { label: 'Brief awal dibuat', done: true },
      { label: 'Reviewer ditentukan', done: true },
      { label: 'Asset final lengkap', done: card.stage === 'published' || card.stage === 'scheduled' },
    ],
    comments: [
      { author: card.updatedBy.split('•')[0].trim(), text: 'Versi detail akan mengikuti implementasi backend berikutnya.', time: 'baru saja' },
    ],
    updatedBy: card.updatedBy,
  };
}

const statusToStage: Record<string, string> = {
  draft: 'draft',
  scheduled: 'scheduled',
  published: 'published',
  failed: 'failed',
};

function LiveCalendar({ posts, isDark, navigate, onRefresh }: {
  posts: SocialPost[];
  isDark: boolean;
  navigate: ReturnType<typeof useNavigate>;
  onRefresh: () => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);

  const grouped = useMemo(() => {
    const order = ['draft', 'scheduled', 'published', 'failed'];
    const map: Record<string, SocialPost[]> = {};
    for (const status of order) map[status] = [];
    for (const post of posts) {
      const key = post.status in map ? post.status : 'draft';
      map[key].push(post);
    }
    return order.map((status) => ({ status, posts: map[status] }));
  }, [posts]);

  const handlePublish = async (post: SocialPost) => {
    setBusy(post.id);
    try {
      await publishPost(post.id);
      toast.success('Post dipublish');
      onRefresh();
    } catch {
      toast.error('Gagal publish post');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (post: SocialPost) => {
    if (!window.confirm('Hapus post ini?')) return;
    setBusy(post.id);
    try {
      await deletePost(post.id);
      toast.success('Post dihapus');
      onRefresh();
    } catch {
      toast.error('Gagal hapus post');
    } finally {
      setBusy(null);
    }
  };

  const stageLabel: Record<string, { label: string; tone: string }> = {
    draft: { label: 'Draft', tone: 'bg-slate-100 text-slate-700' },
    scheduled: { label: 'Scheduled', tone: 'bg-emerald-100 text-emerald-600' },
    published: { label: 'Published', tone: 'bg-cyan-100 text-cyan-700' },
    failed: { label: 'Failed', tone: 'bg-red-100 text-red-600' },
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Content Planner</h1>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{posts.length} post tersimpan</p>
          </div>
          <button
            onClick={() => navigate('/medsos/create')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold"
          >
            <Plus size={18} /> New Post
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className={`rounded-3xl border p-10 text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <CalendarRange size={40} className="mx-auto text-blue-500 mb-4" />
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Belum ada post</h2>
          <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Buat post pertama kamu dari menu Create.</p>
          <button onClick={() => navigate('/medsos/create')} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 text-white px-5 py-3 font-semibold">
            <Plus size={16} /> Create Post
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-4 gap-4">
          {grouped.map(({ status, posts: colPosts }) => (
            <div key={status} className={`rounded-2xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${stageLabel[status]?.tone ?? 'bg-slate-100 text-slate-700'}`}>
                  {stageLabel[status]?.label ?? status}
                </span>
                <span className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{colPosts.length}</span>
              </div>
              <div className="space-y-3">
                {colPosts.map((post) => (
                  <div key={post.id} className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                    <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{post.content || '(no caption)'}</p>
                    <p className={`text-xs mt-1 capitalize ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{post.platform}</p>
                    {post.scheduled_at && (
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(post.scheduled_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      {post.status === 'draft' || post.status === 'scheduled' ? (
                        <button
                          onClick={() => handlePublish(post)}
                          disabled={busy === post.id}
                          className="text-xs text-blue-500 font-semibold disabled:opacity-60"
                        >
                          {busy === post.id ? '…' : 'Publish'}
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleDelete(post)}
                        disabled={busy === post.id}
                        className="text-xs text-red-400 font-semibold disabled:opacity-60 ml-auto"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContentCalendar() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = location.pathname.startsWith('/demo');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(!isDemo);
  const [selectedId, setSelectedId] = useState(plannerCards[0].id);
  const selectedCard = plannerCards.find((item) => item.id === selectedId) ?? plannerCards[0];
  const briefMap = campaignBriefs as Record<number, CampaignBrief | undefined>;
  const selectedBrief = briefMap[selectedCard.id] ?? createFallbackBrief(selectedCard);

  const summary = useMemo(() => ({
    review: plannerCards.filter((item) => item.stage === 'review').length,
    scheduled: plannerCards.filter((item) => item.stage === 'scheduled').length,
    published: plannerCards.filter((item) => item.stage === 'published').length,
  }), []);

  const loadPosts = async () => {
    try {
      const data = await getPosts();
      setPosts(data);
    } catch {
      toast.error('Gagal memuat posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isDemo) void loadPosts();
  }, [isDemo]);

  if (!isDemo) {
    if (loading) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      );
    }
    return <LiveCalendar posts={posts} isDark={isDark} navigate={navigate} onRefresh={loadPosts} />;
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-3xl">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3 ${isDark ? 'bg-purple-500/20 text-purple-200' : 'bg-purple-100 text-purple-700'}`}>
              <Sparkles size={14} />
              Content operations workspace
            </div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Planner kampanye yang terasa seperti alat kerja tim sungguhan</h1>
            <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Di sini pipeline, reviewer, asset, preview channel, dan approval chain sudah dibuat hidup dulu sebelum backend dipasang.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className={`px-4 py-2 rounded-xl font-semibold border ${isDark ? 'border-slate-600 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
              Weekly View
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
              <Plus size={18} /> New Campaign
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Review queue</p>
          <p className="mt-2 text-3xl font-bold">{summary.review}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>butuh reviewer atau owner approval</p>
        </div>
        <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Scheduled</p>
          <p className="mt-2 text-3xl font-bold">{summary.scheduled}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>siap publish per channel</p>
        </div>
        <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Published</p>
          <p className="mt-2 text-3xl font-bold">{summary.published}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>sudah live dan siap dipantau</p>
        </div>
        <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Approval lanes</p>
          <p className="mt-2 text-3xl font-bold">{approvalFlows.length}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>publish, voucher, price exception</p>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.3fr_0.95fr] gap-6 items-start">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Kanban Pipeline</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Idea → draft → design → review → scheduled → published.</p>
            </div>
            <CalendarRange size={18} className="text-blue-500" />
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[1180px] grid-cols-6 gap-4">
              {stageConfig.map((stage) => {
                const items = plannerCards.filter((card) => card.stage === stage.id);
                return (
                  <div key={stage.id} className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-sm">{stage.label}</h4>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{items.length} item</p>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-full ${stage.tone}`}>{stage.id}</span>
                    </div>
                    <div className="space-y-3">
                      {items.map((card) => (
                        <button
                          key={card.id}
                          onClick={() => setSelectedId(card.id)}
                          className={`w-full rounded-2xl border p-3 text-left transition ${selectedId === card.id
                            ? 'border-blue-400 ring-2 ring-blue-200 bg-white text-gray-900'
                            : isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700/80' : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`text-[10px] px-2 py-1 rounded-full ${goalTone[card.goal]}`}>{card.goal}</span>
                            <span className={`text-[10px] ${isDark && selectedId !== card.id ? 'text-gray-400' : 'text-gray-500'}`}>{card.deadline}</span>
                          </div>
                          <p className="font-semibold text-sm leading-snug">{card.title}</p>
                          <div className={`mt-2 space-y-1 text-[11px] ${isDark && selectedId !== card.id ? 'text-gray-400' : 'text-gray-500'}`}>
                            <p>PIC {card.owner}</p>
                            <p>Reviewer {card.reviewer}</p>
                            <p>Status {card.stage}</p>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {card.channels.map((channel) => (
                              <span key={channel} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${isDark && selectedId !== card.id ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                <BrandLogo brand={resolveBrandKey(channel)} size={14} className="rounded-md" />
                                {channel}
                              </span>
                            ))}
                          </div>
                          <p className={`mt-3 text-[11px] ${isDark && selectedId !== card.id ? 'text-gray-500' : 'text-gray-400'}`}>Last updated {card.updatedBy}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Campaign Brief Drawer</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Semua detail penting dalam satu panel kanan.</p>
              </div>
              <FileStack size={18} className="text-purple-500" />
            </div>

            <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${goalTone[selectedCard.goal]}`}>{selectedCard.goal}</span>
                  <h4 className="mt-2 text-lg font-bold">{selectedBrief.title}</h4>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedBrief.objective}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full ${selectedCard.stage === 'review' ? 'bg-amber-100 text-amber-700' : selectedCard.stage === 'scheduled' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                  {selectedBrief.approvalState}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>PIC</p>
                  <p className="font-semibold">{selectedBrief.owner}</p>
                </div>
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Reviewer</p>
                  <p className="font-semibold">{selectedBrief.reviewer}</p>
                </div>
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Deadline</p>
                  <p className="font-semibold">{selectedBrief.deadline}</p>
                </div>
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Last updated</p>
                  <p className="font-semibold">{selectedBrief.updatedBy}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Audience</p>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedBrief.audience}</p>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Eye size={16} className="text-blue-500" />
                  <p className="font-semibold text-sm">Preview per channel</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedBrief.channels.map((channel) => (
                    <div key={channel} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <BrandLogo brand={resolveBrandKey(channel)} size={24} className="rounded-lg px-1" withRing />
                        <p className="font-semibold text-sm">{channel}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                        <p className="text-sm font-medium">{selectedBrief.title}</p>
                        <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Goal {selectedCard.goal} • CTA disesuaikan per channel saat backend hidup.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCheck size={16} className="text-emerald-500" />
                    <p className="font-semibold text-sm">Checklist</p>
                  </div>
                  <div className="space-y-2">
                    {selectedBrief.checklist.map((item) => (
                      <div key={item.label} className="flex items-start gap-2 text-sm">
                        <span className={`mt-0.5 rounded-full p-0.5 ${item.done ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-700'}`}>
                          <CheckCircle2 size={13} />
                        </span>
                        <span className={item.done ? '' : 'font-medium'}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <UserRoundCheck size={16} className="text-purple-500" />
                    <p className="font-semibold text-sm">Asset list</p>
                  </div>
                  <div className="space-y-2">
                    {selectedBrief.assets.map((asset) => (
                      <div key={asset} className={`rounded-xl px-3 py-2 text-sm ${isDark ? 'bg-slate-800 text-gray-300' : 'bg-white text-gray-700 border border-gray-100'}`}>
                        {asset}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquareMore size={16} className="text-orange-500" />
                  <p className="font-semibold text-sm">Mention / comment</p>
                </div>
                <div className="space-y-3">
                  {selectedBrief.comments.map((comment) => (
                    <div key={comment.author + comment.time} className={`rounded-xl p-3 ${isDark ? 'bg-slate-800' : 'bg-white border border-gray-100'}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm">{comment.author}</p>
                        <p className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{comment.time}</p>
                      </div>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{comment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-1">
            <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Approval Chain</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Agar reviewer, owner, dan SLA approval terlihat jelas.</p>
                </div>
                <Clock3 size={18} className="text-amber-500" />
              </div>
              <div className="space-y-3">
                {approvalFlows.map((flow) => (
                  <div key={flow.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{flow.name}</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{flow.scope}</p>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-600">{flow.sla}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {flow.steps.map((step) => (
                        <span key={step} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
                          {step}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Weekly Activity</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Campuran schedule dan perubahan tim kreatif.</p>
                </div>
                <CalendarRange size={18} className="text-blue-500" />
              </div>
              <div className="space-y-3 mb-4">
                {scheduleEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className={`rounded-2xl p-3 ${isDark ? 'bg-slate-900/40' : 'bg-gray-50'}`}>
                    <p className="font-semibold text-sm">{event.title}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{event.date} • {event.time} • {event.owner}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {teamActivityFeed.slice(0, 3).map((activity) => (
                  <div key={activity.id} className="relative pl-4">
                    <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-blue-500" />
                    <p className="text-sm font-medium">{activity.actor} • {activity.action}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{activity.target}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
