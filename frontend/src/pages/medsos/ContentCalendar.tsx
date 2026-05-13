import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { BrandLogo, resolveBrandKey } from '../../components/medsos/BrandLogo';
import FieldHelp from '../../components/medsos/FieldHelp';
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
import { getPosts, type SocialPost } from '../../services/medsosPostsService';

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
    objective: `Ringkasan kerja untuk ${card.title}. Brief dapat disesuaikan lagi sebelum tayang.`,
    audience: 'Segment utama dapat dilengkapi sesuai target campaign.',
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
      { author: card.updatedBy.split('•')[0].trim(), text: 'Brief siap dilengkapi sebelum campaign dipublikasikan.', time: 'baru saja' },
    ],
    updatedBy: card.updatedBy,
  };
}

import { updatePost } from '../../services/medsosPostsService';

function LiveCalendar({ posts, isDark, navigate, onRefresh }: {
  posts: SocialPost[];
  isDark: boolean;
  navigate: ReturnType<typeof useNavigate>;
  onRefresh: () => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);

  // Generate current month days
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const startPadding = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = lastDay.getDate();

  const handleDragStart = (e: React.DragEvent, post: SocialPost) => {
    e.dataTransfer.setData('text/plain', post.id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dayNumber: number) => {
    e.preventDefault();
    const postIdStr = e.dataTransfer.getData('text/plain');
    if (!postIdStr) return;
    const postId = parseInt(postIdStr, 10);
    const post = posts.find(p => p.id === postId);
    
    if (!post || post.status === 'published') {
      toast.error('Post yang sudah tayang tidak bisa digeser jadwalnya.');
      return;
    }

    setBusy(postId);
    try {
      // Create new date for the target day at the same time, or default 12:00
      const targetDate = new Date(year, month, dayNumber, 12, 0, 0);
      await updatePost(postId, {
        scheduledAt: targetDate.toISOString(),
        status: 'scheduled'
      });
      toast.success(`Jadwal dipindah ke tgl ${dayNumber}`);
      onRefresh();
    } catch {
      toast.error('Gagal memindah jadwal post');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-[32px] p-6 md:p-8 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-2xl md:text-2xl md:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Content Planner</h1>
              <FieldHelp title="Content Planner live" description="Tarik (drag) post draft/scheduled ke tanggal lain untuk mengubah jadwal. Post yang sudah published tidak bisa digeser." />
            </div>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{posts.length} post bulan ini</p>
          </div>
          <button
            onClick={() => navigate('/medsos/create')}
            title="Buka composer untuk membuat post baru"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all font-semibold"
          >
            <Plus size={18} /> New Post
          </button>
        </div>
      </div>

      <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-200'}`}>
        <div className="grid grid-cols-7 border-b dark:border-slate-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={`py-3 text-center text-xs font-bold uppercase tracking-widest ${isDark ? 'text-gray-400 bg-slate-900/50' : 'text-gray-500 bg-gray-50'}`}>
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr">
          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`empty-${i}`} className={`min-h-[120px] p-2 border-r border-b ${isDark ? 'border-slate-700 bg-slate-900/20' : 'border-gray-100 bg-gray-50/50'}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isToday = dayNum === today.getDate();
            // Find posts for this day
            const dayPosts = posts.filter(p => {
              const d = p.scheduled_at ? new Date(p.scheduled_at) : (p.published_at ? new Date(p.published_at) : new Date());
              return d.getDate() === dayNum && d.getMonth() === month && d.getFullYear() === year;
            });

            return (
              <div 
                key={dayNum} 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, dayNum)}
                className={`min-h-[120px] p-2 border-r border-b transition-colors relative group ${isDark ? 'border-slate-700 hover:bg-slate-700/30' : 'border-gray-100 hover:bg-blue-50/30'} ${isToday ? (isDark ? 'bg-blue-900/20' : 'bg-blue-50/50') : ''}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-500 text-white' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {dayNum}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {dayPosts.map(post => (
                    <div 
                      key={post.id}
                      draggable={post.status !== 'published'}
                      onDragStart={(e) => handleDragStart(e, post)}
                      className={`p-2 rounded-lg text-xs border cursor-grab active:cursor-grabbing ${
                        post.status === 'published' ? (isDark ? 'bg-cyan-900/30 border-cyan-800 text-cyan-200' : 'bg-cyan-50 border-cyan-200 text-cyan-700') :
                        post.status === 'scheduled' ? (isDark ? 'bg-emerald-900/30 border-emerald-800 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-700') :
                        post.status === 'failed' ? (isDark ? 'bg-rose-900/30 border-rose-800 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-700') :
                        (isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-gray-200 text-gray-700 shadow-sm')
                      } ${busy === post.id ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <BrandLogo brand={resolveBrandKey(post.platform)} size={12} />
                        <span className="font-bold truncate">{post.status}</span>
                      </div>
                      <p className="truncate font-medium">{post.content || '(no text)'}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
      <div className={`rounded-[32px] p-6 md:p-8 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-3xl">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3 ${isDark ? 'bg-purple-500/20 text-purple-200' : 'bg-purple-100 text-purple-700'}`}>
              <Sparkles size={14} />
              Content operations workspace
            </div>
            <div className="flex items-center gap-2">
              <h1 className={`text-2xl md:text-2xl md:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Planner kampanye yang terasa seperti alat kerja tim sungguhan</h1>
              <FieldHelp title="Planner campaign" description="Planner dipakai untuk memindahkan campaign dari ide sampai published. Semua kartu, brief, reviewer, asset, dan approval chain bisa dibaca dari satu halaman ini." />
            </div>
            <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Kelola pipeline, reviewer, asset, preview channel, dan approval campaign dari satu workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button title="Ubah tampilan planner menjadi ringkasan mingguan" className={`px-4 py-2 rounded-xl font-semibold border ${isDark ? 'border-slate-600 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
              Weekly View
            </button>
            <button title="Buka composer untuk menyiapkan campaign baru" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all">
              <Plus size={18} /> New Campaign
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div title="Jumlah item yang menunggu reviewer atau owner sebelum tayang." className={`rounded-[24px] p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
            <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Review queue</p>
          <p className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">{summary.review}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>butuh reviewer atau owner approval</p>
        </div>
          <div title="Jumlah campaign yang sudah punya jadwal publish." className={`rounded-[24px] p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
          <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Scheduled</p>
          <p className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">{summary.scheduled}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>siap publish per channel</p>
        </div>
          <div title="Jumlah campaign yang sudah live." className={`rounded-[24px] p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
          <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Published</p>
          <p className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">{summary.published}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>sudah live dan siap dipantau</p>
        </div>
          <div title="Jumlah jalur approval yang aktif untuk workflow campaign." className={`rounded-[24px] p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
          <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Approval lanes</p>
          <p className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">{approvalFlows.length}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>publish, voucher, price exception</p>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.3fr_0.95fr] gap-6 items-start">
          <div className={`rounded-[24px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Kanban Pipeline</h3>
                  <FieldHelp title="Kanban pipeline" description="Klik salah satu kartu untuk membuka brief lengkap di panel kanan. Setiap kolom mewakili tahapan kerja tim sampai konten benar-benar tayang." />
                </div>
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
                          className={`w-full rounded-[24px] p-3 text-left transition ${selectedId === card.id
                            ? 'border-blue-400 ring-2 ring-blue-200 bg-white text-gray-900'
                            : isDark ? 'bg-[#111318] ring-1 ring-white/10 hover:bg-slate-700/80' : 'bg-white ring-1 ring-slate-900/5 hover:border-blue-200 hover:bg-blue-50/60'
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
          <div className={`rounded-[24px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Campaign Brief Drawer</h3>
                  <FieldHelp title="Campaign brief drawer" description="Panel kanan merangkum objective, target audience, PIC, reviewer, checklist, asset, dan komentar untuk campaign yang sedang dipilih." />
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Semua detail penting dalam satu panel kanan.</p>
              </div>
              <FileStack size={18} className="text-purple-500" />
            </div>

            <div className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
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
                    <div key={channel} className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <BrandLogo brand={resolveBrandKey(channel)} size={24} className="rounded-lg px-1" withRing />
                        <p className="font-semibold text-sm">{channel}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                        <p className="text-sm font-medium">{selectedBrief.title}</p>
                        <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Goal {selectedCard.goal} • CTA dapat disesuaikan untuk tiap channel.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
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

                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
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

              <div className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
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
            <div className={`rounded-[24px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Approval Chain</h3>
                    <FieldHelp title="Approval chain" description="Bagian ini menjelaskan siapa saja yang harus menyetujui jenis campaign tertentu dan target SLA untuk setiap jalur approval." />
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Agar reviewer, owner, dan SLA approval terlihat jelas.</p>
                </div>
                <Clock3 size={18} className="text-amber-500" />
              </div>
              <div className="space-y-3">
                {approvalFlows.map((flow) => (
                  <div key={flow.id} className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
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

            <div className={`rounded-[24px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Weekly Activity</h3>
                    <FieldHelp title="Weekly activity" description="Feed ini dipakai untuk membaca aktivitas terbaru tim kreatif, jadwal campaign, dan perubahan penting tanpa membuka kartu satu per satu." />
                  </div>
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
