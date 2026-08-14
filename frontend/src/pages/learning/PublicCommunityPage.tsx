import { type FormEvent, useEffect, useState } from 'react';
import { Loader2, MessageSquareText, Plus, Reply } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  createPublicCommunityReply,
  createPublicCommunityTopic,
  getPublicCommunityForums,
  getPublicCommunityTopic,
  getPublicCommunityTopics,
  type CommunityForum,
  type CommunityReply,
  type CommunityTopic,
} from '../../services/learningCommunityService';

const paragraph = (text: string) => [{ type: 'paragraph' as const, text: text.trim() }];
const blockText = (blocks: Array<{ text?: string }> = []) => blocks.map((block) => block.text).filter(Boolean).join('\n\n');
const retryKey = (scope: string, payload: string) => {
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) hash = Math.imul(hash ^ payload.charCodeAt(index), 16777619);
  return `community:${scope}:${(hash >>> 0).toString(16)}`;
};
const getRetryToken = (key: string) => {
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  sessionStorage.setItem(key, token);
  return token;
};

export default function PublicCommunityPage() {
  const { publicSlug = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const forumSlug = params.get('forum');
  const topicSlug = params.get('topic');
  const [siteName, setSiteName] = useState('Community');
  const [forums, setForums] = useState<CommunityForum[]>([]);
  const [forum, setForum] = useState<CommunityForum | null>(null);
  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [topic, setTopic] = useState<CommunityTopic | null>(null);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [topicForm, setTopicForm] = useState({ authorName: '', authorEmail: '', title: '', body: '' });
  const [replyForm, setReplyForm] = useState({ authorName: '', authorEmail: '', body: '' });

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    const load = async () => {
      const root = await getPublicCommunityForums(publicSlug);
      if (!active) return;
      setSiteName(root.site.name || 'Community'); setForums(root.forums);
      if (!forumSlug) { setForum(null); setTopics([]); setTopic(null); setReplies([]); return; }
      const forumData = await getPublicCommunityTopics(publicSlug, forumSlug);
      if (!active) return;
      setForum(forumData.forum); setTopics(forumData.topics);
      if (!topicSlug) { setTopic(null); setReplies([]); return; }
      const topicData = await getPublicCommunityTopic(publicSlug, forumSlug, topicSlug);
      if (!active) return;
      setTopic(topicData.topic); setReplies(topicData.replies);
    };
    load().catch((requestError: any) => { if (active) setError(requestError?.response?.data?.error?.message || 'Community unavailable.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [forumSlug, publicSlug, topicSlug]);

  const createTopic = async (event: FormEvent) => {
    event.preventDefault(); if (!forumSlug) return;
    const payloadKey = retryKey(`topic:${publicSlug}:${forumSlug}`, JSON.stringify(topicForm));
    const token = getRetryToken(payloadKey);
    try {
      const created = await createPublicCommunityTopic(publicSlug, forumSlug, token, { authorName: topicForm.authorName, authorEmail: topicForm.authorEmail || undefined, title: topicForm.title, content: paragraph(topicForm.body) });
      sessionStorage.removeItem(payloadKey); setTopicForm({ authorName: '', authorEmail: '', title: '', body: '' });
      toast.success('Topic created'); setParams({ forum: forumSlug, topic: created.slug });
    } catch (requestError: any) { toast.error(requestError?.response?.data?.error?.message || 'Topic gagal dibuat. Retry akan memakai token yang sama.'); }
  };

  const createReply = async (event: FormEvent) => {
    event.preventDefault(); if (!forumSlug || !topicSlug) return;
    const payloadKey = retryKey(`reply:${publicSlug}:${forumSlug}:${topicSlug}`, JSON.stringify(replyForm));
    const token = getRetryToken(payloadKey);
    try {
      await createPublicCommunityReply(publicSlug, forumSlug, topicSlug, token, { authorName: replyForm.authorName, authorEmail: replyForm.authorEmail || undefined, content: paragraph(replyForm.body) });
      sessionStorage.removeItem(payloadKey); setReplyForm({ authorName: '', authorEmail: '', body: '' }); toast.success('Reply created');
      const refreshed = await getPublicCommunityTopic(publicSlug, forumSlug, topicSlug); setTopic(refreshed.topic); setReplies(refreshed.replies);
    } catch (requestError: any) { toast.error(requestError?.response?.data?.error?.message || 'Reply gagal dibuat. Retry akan memakai token yang sama.'); }
  };

  if (loading) return <main className="min-h-screen grid place-items-center bg-slate-50"><Loader2 className="animate-spin" /></main>;

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900"><div className="mx-auto max-w-6xl space-y-5">
    <header className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex items-center gap-2 text-sm font-bold text-blue-700"><MessageSquareText size={18}/>Community</div><h1 className="mt-2 text-3xl font-black">{siteName}</h1><p className="mt-2 text-sm text-slate-600">Public questions and replies. Submissions are declarative-safe, rate-limited and retry-idempotent.</p></header>
    {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

    {!forumSlug ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{forums.map((item) => <button key={item.id} onClick={() => setParams({ forum: item.slug })} className="rounded-2xl border bg-white p-5 text-left"><MessageSquareText size={20} className="text-blue-600"/><h2 className="mt-3 text-lg font-black">{item.name}</h2><p className="mt-2 text-sm text-slate-600">{item.description}</p><div className="mt-4 text-xs font-semibold text-slate-500">{item.topic_count || 0} topics</div></button>)}</div> : topicSlug && topic ? <div className="space-y-4"><button onClick={() => setParams({ forum: forumSlug })} className="text-sm font-bold text-blue-700">← {topic.forum_name || forum?.name || 'Forum'}</button><article className="rounded-3xl border bg-white p-6"><h2 className="text-2xl font-black">{topic.title}</h2><p className="mt-1 text-xs text-slate-500">by {topic.author_name} · {topic.status} · score {topic.score || 0}</p><div className="mt-5 whitespace-pre-wrap text-sm leading-7">{blockText(topic.content)}</div></article><section className="space-y-3"><h3 className="font-black">Replies</h3>{replies.map((item) => <article key={item.id} className="rounded-2xl border bg-white p-4"><div className="text-xs font-bold text-slate-500">{item.author_name} · score {item.score || 0}</div><div className="mt-2 whitespace-pre-wrap text-sm leading-6">{blockText(item.content)}</div></article>)}</section>{topic.status === 'open' && <form onSubmit={createReply} className="space-y-3 rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 font-black"><Reply size={17}/>Reply</div><div className="grid gap-2 md:grid-cols-2"><input required value={replyForm.authorName} onChange={(e) => setReplyForm({ ...replyForm, authorName: e.target.value })} placeholder="Your name" className="rounded-xl border px-3 py-2"/><input type="email" value={replyForm.authorEmail} onChange={(e) => setReplyForm({ ...replyForm, authorEmail: e.target.value })} placeholder="Email (optional)" className="rounded-xl border px-3 py-2"/></div><textarea required value={replyForm.body} onChange={(e) => setReplyForm({ ...replyForm, body: e.target.value })} placeholder="Reply" className="min-h-28 w-full rounded-xl border px-3 py-2"/><button className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">Post reply</button></form>}</div> : <div className="space-y-4"><button onClick={() => setParams({})} className="text-sm font-bold text-blue-700">← All forums</button><section className="rounded-2xl border bg-white p-5"><h2 className="text-2xl font-black">{forum?.name || forumSlug}</h2><p className="mt-2 text-sm text-slate-600">{forum?.description}</p></section><div className="grid gap-3">{topics.map((item) => <button key={item.id} onClick={() => setParams({ forum: forumSlug, topic: item.slug })} className="rounded-2xl border bg-white p-4 text-left"><div className="font-black">{item.pinned ? '📌 ' : ''}{item.title}</div><div className="mt-1 text-xs text-slate-500">{item.author_name} · {item.status} · {item.reply_count || 0} replies · score {item.score || 0}</div></button>)}</div><form onSubmit={createTopic} className="space-y-3 rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 font-black"><Plus size={17}/>Start a topic</div><div className="grid gap-2 md:grid-cols-2"><input required value={topicForm.authorName} onChange={(e) => setTopicForm({ ...topicForm, authorName: e.target.value })} placeholder="Your name" className="rounded-xl border px-3 py-2"/><input type="email" value={topicForm.authorEmail} onChange={(e) => setTopicForm({ ...topicForm, authorEmail: e.target.value })} placeholder="Email (optional)" className="rounded-xl border px-3 py-2"/></div><input required value={topicForm.title} onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })} placeholder="Topic title" className="w-full rounded-xl border px-3 py-2"/><textarea required value={topicForm.body} onChange={(e) => setTopicForm({ ...topicForm, body: e.target.value })} placeholder="Question or discussion" className="min-h-28 w-full rounded-xl border px-3 py-2"/><button className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">Post topic</button></form></div>}
  </div></main>;
}
