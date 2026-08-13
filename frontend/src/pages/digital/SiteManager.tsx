import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { createWebsiteSite, updateWebsiteSite, updateWebsiteSiteStatus, type WebsiteSite } from '../../services/digitalWebsiteService';
import { outletService, type Outlet } from '../../services/outletService';

export default function SiteManager({ sites, selectedId, onSelect, reload }: {
  sites: WebsiteSite[]; selectedId: number | null; onSelect: (id: number) => void; reload: () => Promise<void>;
}) {
  const [form, setForm] = useState({ code: '', name: '', slug: '' });
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = sites.find((site) => site.id === selectedId) ?? null;

  useEffect(() => {
    const loadOutlets = async () => {
      try {
        const result = await outletService.getAll({ is_active: true });
        setOutlets(result.data || []);
        if (selected?.fulfillment_outlet_id) setSelectedOutlet(selected.fulfillment_outlet_id);
      } catch { toast.error('Failed to load outlets'); }
    };
    loadOutlets();
  }, [selected?.fulfillment_outlet_id]);

  const task = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch { toast.error('Operasi website gagal'); } finally { setBusy(false); } };

  const create = () => task(async () => {
    if (!form.code.trim() || !form.name.trim() || !form.slug.trim()) throw new Error();
    const row = await createWebsiteSite({ code: form.code.trim(), name: form.name.trim(), publicSlug: form.slug.trim().toLowerCase() });
    setForm({ code: '', name: '', slug: '' }); await reload(); onSelect(row.id); toast.success('Website draft dibuat');
  });

  const status = (next: 'draft' | 'published' | 'archived') => task(async () => {
    if (!selected) return; await updateWebsiteSiteStatus(selected.id, next); await reload();
  });

  const saveOutlet = () => task(async () => {
    if (!selected || !selectedOutlet || selectedOutlet === selected.fulfillment_outlet_id) return;
    await updateWebsiteSite(selected.id, { name: selected.name, fulfillmentOutletId: selectedOutlet });
    await reload(); toast.success('Fulfillment outlet updated');
  });

  return <section className="rounded-2xl border bg-white p-4">
    <h2 className="font-black">Site lifecycle</h2>
    <div className="mt-3 flex flex-wrap gap-2">{sites.map((site) => <button key={site.id} onClick={() => onSelect(site.id)} className={`rounded-lg border px-3 py-2 text-sm ${selectedId === site.id ? 'border-blue-600 text-blue-600' : ''}`}>{site.name} · {site.status}</button>)}</div>
    <div className="mt-3 grid gap-2 md:grid-cols-4"><input className="rounded-lg border px-3 py-2" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /><input className="rounded-lg border px-3 py-2" placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input className="rounded-lg border px-3 py-2" placeholder="public-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /><button disabled={busy} onClick={() => void create()} className="rounded-lg bg-blue-600 px-3 py-2 font-bold text-white">Create draft</button></div>
    {selected && <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2"><b>{selected.name}</b><span className="text-sm text-slate-500">/{selected.public_slug}</span>{selected.status === 'draft' && <button disabled={busy} onClick={() => void status('published')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white">Publish</button>}{selected.status === 'published' && <button disabled={busy} onClick={() => void status('draft')} className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-bold text-white">Draft</button>}{selected.status !== 'archived' && <button disabled={busy} onClick={() => void status('archived')} className="rounded-lg border px-3 py-1.5 text-sm">Archive</button>}</div>
      {selected.status !== 'archived' && <div className="flex flex-col gap-2"><label className="text-sm font-medium">Fulfillment Outlet</label><p className="text-xs text-slate-500">Determines inventory scope for storefront catalog</p><select value={selectedOutlet || ''} onChange={(e) => setSelectedOutlet(e.target.value ? Number(e.target.value) : null)} className="rounded-lg border px-3 py-2"><option value="">-- Select outlet --</option>{outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}</select>{selectedOutlet && selectedOutlet !== selected.fulfillment_outlet_id && <button disabled={busy} onClick={() => void saveOutlet()} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-bold text-white">Save Outlet</button>}</div>}
    </div>}
  </section>;
}
