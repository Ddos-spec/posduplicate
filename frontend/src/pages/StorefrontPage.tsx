import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Minus, Plus, RefreshCw, ShoppingBag } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import PublicEngagementPanel from '../components/marketing/PublicEngagementPanel';
import {
  createPublicStorefrontOrder,
  getPublicStorefront,
  getPublicStorefrontCatalog,
  getPublicStorefrontOrderStatus,
  type PublicCatalogItem,
  type PublicOrderReceipt,
  type PublicOrderStatusRecord,
  type PublicStorefrontMeta,
} from '../services/digitalWebsiteService';

const terminalStatuses = new Set(['completed', 'cancelled']);
const newCheckoutToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
const formatMoney = (value: number | string) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(Number(value || 0));

export default function StorefrontPage() {
  const { publicSlug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const eventSlug = searchParams.get('event');
  const surveySlug = searchParams.get('survey');
  const [store, setStore] = useState<PublicStorefrontMeta | null>(null);
  const [catalog, setCatalog] = useState<PublicCatalogItem[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<PublicOrderReceipt | null>(null);
  const [orderStatus, setOrderStatus] = useState<PublicOrderStatusRecord | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const storageKey = `p3-storefront-order:${publicSlug}`;
  const attemptKey = `p3-storefront-checkout-attempt:${publicSlug}`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getPublicStorefront(publicSlug), getPublicStorefrontCatalog(publicSlug)])
      .then(([meta, items]) => {
        if (!active) return;
        setStore(meta);
        setCatalog(items);
      })
      .catch(() => { if (active) setError('Storefront tidak tersedia atau belum dipublikasikan.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [publicSlug]);

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as PublicOrderReceipt;
      if (parsed.orderNumber && parsed.token) setReceipt(parsed);
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const refreshStatus = async () => {
    if (!receipt) return;
    try {
      const status = await getPublicStorefrontOrderStatus(publicSlug, receipt.orderNumber, receipt.token);
      setOrderStatus(status);
      setError('');
    } catch {
      setError('Status pesanan belum dapat dimuat.');
    }
  };

  useEffect(() => {
    if (!receipt) return;
    let active = true;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const status = await getPublicStorefrontOrderStatus(publicSlug, receipt.orderNumber, receipt.token);
        if (!active) return;
        setOrderStatus(status);
        if (!terminalStatuses.has(status.status)) timer = window.setTimeout(poll, 15000);
      } catch {
        if (active) timer = window.setTimeout(poll, 20000);
      }
    };
    void poll();
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, [publicSlug, receipt]);

  const cartLines = useMemo(() => catalog
    .map((item) => ({ item, quantity: cart[item.item_id] || 0 }))
    .filter((line) => line.quantity > 0), [cart, catalog]);
  const total = useMemo(() => cartLines.reduce((sum, line) => sum + Number(line.item.price || 0) * line.quantity, 0), [cartLines]);

  const setQuantity = (itemId: number, quantity: number) => setCart((current) => {
    const next = { ...current };
    if (quantity <= 0) delete next[itemId];
    else next[itemId] = Math.min(quantity, 99);
    return next;
  });

  const checkout = async (event: FormEvent) => {
    event.preventDefault();
    if (!cartLines.length || !form.name.trim() || !form.phone.trim()) return;
    const payload = {
      customerName: form.name.trim(),
      customerPhone: form.phone.trim(),
      customerEmail: form.email.trim() || undefined,
      deliveryAddress: form.address.trim() ? { address: form.address.trim() } : {},
      notes: form.notes.trim() || undefined,
      items: cartLines.map(({ item, quantity }) => ({ itemId: item.item_id, quantity })),
    };
    const fingerprint = JSON.stringify(payload);
    let checkoutToken = '';
    try {
      const savedAttempt = sessionStorage.getItem(attemptKey);
      if (savedAttempt) {
        const parsed = JSON.parse(savedAttempt) as { token?: string; fingerprint?: string };
        if (parsed.fingerprint === fingerprint && parsed.token) checkoutToken = parsed.token;
      }
    } catch {
      sessionStorage.removeItem(attemptKey);
    }
    if (!checkoutToken) {
      checkoutToken = newCheckoutToken();
      sessionStorage.setItem(attemptKey, JSON.stringify({ token: checkoutToken, fingerprint }));
    }

    setSubmitting(true);
    setError('');
    try {
      const created = await createPublicStorefrontOrder(publicSlug, payload, checkoutToken);
      setReceipt(created);
      setOrderStatus(null);
      sessionStorage.setItem(storageKey, JSON.stringify(created));
      sessionStorage.removeItem(attemptKey);
      setCart({});
    } catch {
      setError('Checkout gagal. Coba lagi untuk attempt yang sama, atau ubah cart untuk membuat attempt baru.');
    } finally {
      setSubmitting(false);
    }
  };

  if (eventSlug || surveySlug) {
    return <PublicEngagementPanel publicSlug={publicSlug} eventSlug={eventSlug} surveySlug={eventSlug ? null : surveySlug} />;
  }
  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-50"><Loader2 className="animate-spin" /></div>;
  if (!store) return <div className="min-h-screen grid place-items-center bg-slate-50 p-6"><div className="rounded-2xl border bg-white p-6 text-center"><h1 className="text-xl font-black">Storefront unavailable</h1><p className="mt-2 text-sm text-slate-600">{error}</p></div></div>;

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Online Store</p><h1 className="text-2xl font-black">{store.site.name}</h1></div><div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-bold"><ShoppingBag size={17} />{cartLines.reduce((sum, line) => sum + line.quantity, 0)} item</div></div></header>
    <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 lg:grid-cols-[1fr_360px]">
      <section>
        {store.navigation.length > 0 && <div className="mb-5 flex flex-wrap gap-2">{store.navigation.map((page) => <span key={page.slug} className="rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">{page.title}</span>)}</div>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{catalog.map((item) => {
          const quantity = cart[item.item_id] || 0;
          return <article key={item.item_id} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex min-h-36 flex-col justify-between"><div><p className="text-xs font-bold uppercase text-blue-600">{item.category || 'Catalog'}</p><h2 className="mt-1 text-lg font-black">{item.name}</h2>{item.description && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{item.description}</p>}</div><div className="mt-5"><p className="text-lg font-black">{formatMoney(item.price)}</p><p className="text-xs text-slate-500">Stock snapshot: {Number(item.stock || 0)}</p></div></div><div className="mt-4 flex items-center gap-2">{quantity > 0 && <button type="button" onClick={() => setQuantity(item.item_id, quantity - 1)} className="rounded-lg border p-2"><Minus size={16} /></button>}<button type="button" onClick={() => setQuantity(item.item_id, quantity + 1)} className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">{quantity ? `${quantity} di cart` : 'Tambah'}</button>{quantity > 0 && <button type="button" onClick={() => setQuantity(item.item_id, quantity + 1)} className="rounded-lg border p-2"><Plus size={16} /></button>}</div></article>;
        })}</div>
        {catalog.length === 0 && <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-600">Belum ada item yang dipublikasikan untuk outlet fulfillment toko ini.</div>}
      </section>
      <aside className="space-y-4">
        {receipt && <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-emerald-700">Pesanan diterima</p><h2 className="mt-1 text-lg font-black">{receipt.orderNumber}</h2></div><button type="button" onClick={() => void refreshStatus()} className="rounded-lg border border-emerald-300 bg-white p-2"><RefreshCw size={16} /></button></div><p className="mt-3 text-sm">Status: <b>{orderStatus?.status || receipt.status}</b></p><p className="mt-1 text-sm">Total: <b>{formatMoney(orderStatus?.total ?? receipt.total)}</b></p><p className="mt-3 text-xs text-emerald-800">Token status disimpan hanya di sesi browser ini.</p></section>}
        <section className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="text-lg font-black">Cart & Checkout</h2><div className="mt-4 space-y-3">{cartLines.map(({ item, quantity }) => <div key={item.item_id} className="flex justify-between gap-3 text-sm"><span>{item.name} × {quantity}</span><b>{formatMoney(Number(item.price) * quantity)}</b></div>)}{!cartLines.length && <p className="text-sm text-slate-500">Cart masih kosong.</p>}</div><div className="my-4 border-t" /><div className="flex justify-between"><span>Total</span><b>{formatMoney(total)}</b></div><form onSubmit={checkout} className="mt-5 space-y-3"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama pelanggan" className="w-full rounded-lg border px-3 py-2 text-sm" /><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Nomor telepon" className="w-full rounded-lg border px-3 py-2 text-sm" /><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (opsional)" className="w-full rounded-lg border px-3 py-2 text-sm" /><textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat / instruksi pengiriman" className="min-h-20 w-full rounded-lg border px-3 py-2 text-sm" /><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Catatan pesanan" className="min-h-16 w-full rounded-lg border px-3 py-2 text-sm" />{error && <p className="rounded-lg bg-rose-50 p-2 text-xs font-medium text-rose-700">{error}</p>}<button disabled={submitting || !cartLines.length} className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Memproses...' : 'Buat pesanan'}</button></form></section>
      </aside>
    </div>
  </main>;
}
