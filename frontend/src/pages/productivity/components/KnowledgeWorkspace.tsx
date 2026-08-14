import { type FormEvent, useEffect, useState } from 'react';
import { BookOpen, Loader2, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createKnowledgeArticle,
  createKnowledgeSpace,
  getKnowledgeArticle,
  getKnowledgeArticles,
  getKnowledgeSpaces,
  reviseKnowledgeArticle,
  setKnowledgeArticleStatus,
  type KnowledgeArticle,
  type KnowledgeBlock,
  type KnowledgeSpace,
} from '../../../services/productivityService';

const blocksFromText = (value: string): KnowledgeBlock[] => value
  .split(/\n{2,}/)
  .map((text) => text.trim())
  .filter(Boolean)
  .map((text) => ({ type: 'paragraph' as const, text }));

const textFromBlocks = (blocks?: KnowledgeBlock[]) => (blocks || []).map((block) => {
  if (block.type === 'checklist') return (block.items || []).map((item) => `${item.checked ? '[x]' : '[ ]'} ${item.text}`).join('\n');
  if (block.type === 'link') return `${block.text || block.href || ''}${block.href ? ` (${block.href})` : ''}`;
  return block.text || '';
}).filter(Boolean).join('\n\n');

export default function KnowledgeWorkspace() {
  const [spaces, setSpaces] = useState<KnowledgeSpace[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [spaceId, setSpaceId] = useState<number | null>(null);
  const [selected, setSelected] = useState<KnowledgeArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [form, setForm] = useState({ slug: '', title: '', summary: '', body: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [spaceRows, articleRows] = await Promise.all([getKnowledgeSpaces(), getKnowledgeArticles(spaceId)]);
      setSpaces(spaceRows); setArticles(articleRows);
      if (!spaceId && spaceRows[0]) setSpaceId(spaceRows[0].id);
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Gagal memuat Knowledge'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [spaceId]);

  const createSpace = async (event: FormEvent) => {
    event.preventDefault(); if (!spaceName.trim()) return;
    try { const created = await createKnowledgeSpace({ name: spaceName.trim() }); setSpaceName(''); setSpaceId(created.id); toast.success('Knowledge space dibuat'); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Gagal membuat space'); }
  };

  const submitArticle = async (event: FormEvent) => {
    event.preventDefault(); if (!spaceId || !form.title.trim() || !form.slug.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      await createKnowledgeArticle({ spaceId, slug: form.slug.trim(), title: form.title.trim(), summary: form.summary.trim() || undefined, content: blocksFromText(form.body) });
      setForm({ slug: '', title: '', summary: '', body: '' }); toast.success('Draft article dibuat'); await load();
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Gagal membuat artikel'); }
    finally { setSaving(false); }
  };

  const open = async (id: number) => {
    try {
      const article = await getKnowledgeArticle(id); setSelected(article);
      setForm({ slug: article.slug, title: article.title, summary: article.summary || '', body: textFromBlocks(article.content) });
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Gagal membuka artikel'); }
  };

  const revise = async () => {
    if (!selected || !form.body.trim()) return;
    setSaving(true);
    try {
      const article = await reviseKnowledgeArticle(selected.id, { title: form.title.trim(), summary: form.summary.trim() || undefined, content: blocksFromText(form.body) });
      setSelected(article); toast.success(`Revision v${article.current_version} dibuat`); await load();
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Revision gagal'); }
    finally { setSaving(false); }
  };

  const transition = async (status: KnowledgeArticle['status']) => {
    if (!selected) return;
    try { const article = await setKnowledgeArticleStatus(selected.id, status); setSelected({ ...selected, ...article }); toast.success(`Artikel ${status}`); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Status update gagal'); }
  };

  if (loading && !spaces.length) return <div className="grid min-h-56 place-items-center"><Loader2 className="animate-spin" /></div>;

  return <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_420px]">
    <aside className="space-y-3 rounded-2xl border bg-white p-4">
      <h2 className="font-bold">Spaces</h2>
      {spaces.map((space) => <button type="button" key={space.id} onClick={() => { setSpaceId(space.id); setSelected(null); setForm({ slug: '', title: '', summary: '', body: '' }); }} className={`flex w-full justify-between rounded-xl px-3 py-2 text-left text-sm ${spaceId === space.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}><span>{space.name}</span><span className="text-xs opacity-60">{space.article_count ?? 0}</span></button>)}
      <form onSubmit={createSpace} className="flex gap-2"><input value={spaceName} onChange={(e) => setSpaceName(e.target.value)} placeholder="New space" className="min-w-0 flex-1 rounded-lg border p-2 text-sm" /><button className="rounded-lg border p-2"><Plus size={16} /></button></form>
    </aside>

    <section className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="font-bold">Articles</h2><button onClick={() => void load()} className="rounded-lg border p-2"><RefreshCw size={15} /></button></div>
      <div className="overflow-hidden rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Article</th><th className="p-3">Version</th><th className="p-3">Status</th></tr></thead><tbody>{articles.map((article) => <tr key={article.id} onClick={() => void open(article.id)} className="cursor-pointer border-t hover:bg-slate-50"><td className="p-3"><div className="font-semibold">{article.title}</div><div className="text-xs text-slate-500">/{article.slug}</div></td><td className="p-3">v{article.current_version}</td><td className="p-3">{article.status}</td></tr>)}</tbody></table>{articles.length === 0 && <p className="p-6 text-sm text-slate-500">Belum ada artikel.</p>}</div>
    </section>

    <aside className="rounded-2xl border bg-white p-4">
      <form onSubmit={selected ? (event) => { event.preventDefault(); void revise(); } : submitArticle} className="space-y-3">
        <div className="flex items-center gap-2"><BookOpen size={17} /><h2 className="font-bold">{selected ? `Edit v${selected.current_version}` : 'New article'}</h2></div>
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full rounded-xl border px-3 py-2.5" />
        <input required disabled={Boolean(selected)} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="article-slug" className="w-full rounded-xl border px-3 py-2.5 disabled:bg-slate-50" />
        <input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Summary" className="w-full rounded-xl border px-3 py-2.5" />
        <textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write paragraphs. Blank line = new declarative paragraph block." className="min-h-72 w-full rounded-xl border px-3 py-2.5" />
        <button disabled={saving || !spaceId} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">{selected ? 'Create revision' : 'Create draft'}</button>
      </form>
      {selected && <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">{selected.status === 'draft' && <button onClick={() => void transition('published')} className="rounded-lg border px-3 py-2 text-sm font-semibold">Publish</button>}{selected.status === 'published' && <button onClick={() => void transition('draft')} className="rounded-lg border px-3 py-2 text-sm font-semibold">Unpublish</button>}{selected.status !== 'archived' && <button onClick={() => void transition('archived')} className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">Archive</button>}<button onClick={() => { setSelected(null); setForm({ slug: '', title: '', summary: '', body: '' }); }} className="rounded-lg border px-3 py-2 text-sm">New article</button></div>}
    </aside>
  </div>;
}
