import { useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { rentalApi } from '../../services/rentalApi';

type RentalItem = {
  id: number; item_id: number; item_name: string; sku?: string | null; stock: number | string; status: string;
  rate_unit: 'hour' | 'day' | 'week'; rate_amount: number | string; deposit_amount: number | string;
  minimum_duration: number; maximum_duration?: number | null; buffer_minutes: number;
};
type Product = { id: number; name: string; sku?: string | null; stock?: number | string; track_stock?: boolean; is_active?: boolean };

const money = (value: number | string) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(Number(value || 0));

export default function RentalItemSettingsPanel({ onChanged }: { onChanged?: () => void }) {
  const [rows, setRows] = useState<RentalItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ itemId: 0, rateUnit: 'day', rateAmount: 0, depositAmount: 0, minimumDuration: 1, maximumDuration: '', bufferMinutes: 0 });

  const reload = async () => {
    setLoading(true); setError('');
    try {
      const [rentalRows, productResponse] = await Promise.all([rentalApi.items(), api.get('/products')]);
      setRows(rentalRows || []);
      setProducts((productResponse.data?.data || []).filter((row: Product) => row.is_active !== false && row.track_stock === true));
    } catch { setError('Konfigurasi item rental belum dapat dimuat.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, []);

  const save = async () => {
    if (!form.itemId || form.rateAmount < 0 || form.minimumDuration < 1) return;
    setBusy(true); setError('');
    try {
      await rentalApi.saveItem({
        itemId: Number(form.itemId), rateUnit: form.rateUnit, rateAmount: Number(form.rateAmount),
        depositAmount: Number(form.depositAmount), minimumDuration: Number(form.minimumDuration),
        maximumDuration: form.maximumDuration ? Number(form.maximumDuration) : null,
        bufferMinutes: Number(form.bufferMinutes), status: 'active',
      });
      await reload(); onChanged?.();
    } catch { setError('Item rental gagal disimpan. Produk harus aktif, tracked-stock, dan memiliki stok positif.'); }
    finally { setBusy(false); }
  };

  return <section className="rounded-2xl border bg-white p-5">
    <div className="flex items-center justify-between gap-3"><div><h2 className="font-black">Rental item settings</h2><p className="text-sm text-slate-600">Projection over existing tracked inventory; no parallel product master.</p></div><button onClick={() => void reload()} className="rounded-lg border p-2" aria-label="Refresh rental items"><RefreshCw size={17} /></button></div>
    {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700">{error}</p>}
    {loading ? <div className="grid min-h-32 place-items-center"><Loader2 className="animate-spin" /></div> : <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <select value={form.itemId} onChange={(e) => setForm((v) => ({ ...v, itemId: Number(e.target.value) }))} className="rounded-lg border p-2 sm:col-span-2"><option value={0}>Choose tracked-stock product</option>{products.map((row) => <option key={row.id} value={row.id}>{row.name}{row.sku ? ` · ${row.sku}` : ''} · stock {Number(row.stock || 0)}</option>)}</select>
        <select value={form.rateUnit} onChange={(e) => setForm((v) => ({ ...v, rateUnit: e.target.value }))} className="rounded-lg border p-2"><option value="hour">Per hour</option><option value="day">Per day</option><option value="week">Per week</option></select>
        <input type="number" min={0} value={form.rateAmount} onChange={(e) => setForm((v) => ({ ...v, rateAmount: Number(e.target.value) }))} placeholder="Rate" className="rounded-lg border p-2" />
        <input type="number" min={0} value={form.depositAmount} onChange={(e) => setForm((v) => ({ ...v, depositAmount: Number(e.target.value) }))} placeholder="Deposit requirement" className="rounded-lg border p-2" />
        <input type="number" min={1} value={form.minimumDuration} onChange={(e) => setForm((v) => ({ ...v, minimumDuration: Number(e.target.value) }))} placeholder="Minimum duration" className="rounded-lg border p-2" />
        <input type="number" min={1} value={form.maximumDuration} onChange={(e) => setForm((v) => ({ ...v, maximumDuration: e.target.value }))} placeholder="Maximum duration (optional)" className="rounded-lg border p-2" />
        <input type="number" min={0} value={form.bufferMinutes} onChange={(e) => setForm((v) => ({ ...v, bufferMinutes: Number(e.target.value) }))} placeholder="Turnaround buffer minutes" className="rounded-lg border p-2" />
      </div>
      <button disabled={busy} onClick={() => void save()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"><Plus size={16} /> Save &amp; activate</button>
      <div className="mt-5 space-y-2">{rows.map((row) => <div key={row.id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-3"><strong>{row.item_name}</strong><span className="text-xs font-black uppercase">{row.status}</span></div><p className="mt-1 text-slate-600">{money(row.rate_amount)} / {row.rate_unit} · deposit {money(row.deposit_amount)} · stock {Number(row.stock || 0)} · buffer {row.buffer_minutes}m</p></div>)}</div>
    </>}
  </section>;
}
