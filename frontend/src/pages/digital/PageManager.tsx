import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { createWebsitePage, getWebsitePages, updateWebsitePageStatus, type WebsitePage } from '../../services/digitalWebsiteService';

export default function PageManager({ siteId }: { siteId: number }) {
  const [rows, setRows] = useState<WebsitePage[]>([]);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const load = async () => setRows(await getWebsitePages(siteId));
  useEffect(() => { void load().catch(() => toast.error('Gagal memuat page')); }, [siteId]);

  const add = async () => {
    if (!title.trim() || !slug.trim()) return toast.error('Judul dan slug wajib');
    try {
      await createWebsitePage(siteId, { slug: slug.trim().toLowerCase(), title: title.trim(), content: { blocks: [{ type: 'hero', heading: title.trim() }] } });
      setTitle(''); setSlug(''); await load();
    } catch { toast.error('Gagal membuat page'); }
  };

  const status = async (page: WebsitePage, next: 'draft' | 'published' | 'archived') => {
    try { await updateWebsitePageStatus(page.id, next); await load(); } catch { toast.error('Transisi page gagal'); }
  };

  return <section className="rounded-2xl border bg-white p-4">
    <h2 className="font-black">Pages</h2>
    <div className="mt-3 flex gap-2"><input className="min-w-0 flex-1 rounded-lg border px-3 py-2" placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} /><input className="min-w-0 flex-1 rounded-lg border px-3 py-2" placeholder="Judul" value={title} onChange={(e) => setTitle(e.target.value)} /><button onClick={() => void add()} className="rounded-lg bg-blue-600 px-3 py-2 font-bold text-white">Add draft</button></div>
    <div className="mt-4 space-y-2">{rows.map((page) => <div key={page.id} className="rounded-lg border p-3"><b>{page.title}</b><p className="text-xs text-slate-500">/{page.slug} · {page.status}</p><div className="mt-2 flex gap-2">{page.status === 'draft' && <button onClick={() => void status(page, 'published')} className="text-xs font-bold text-emerald-700">Publish</button>}{page.status === 'published' && <button onClick={() => void status(page, 'draft')} className="text-xs font-bold text-amber-700">Draft</button>}{page.status !== 'archived' && <button onClick={() => void status(page, 'archived')} className="text-xs font-bold text-red-600">Archive</button>}</div></div>)}</div>
  </section>;
}
