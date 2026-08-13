import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { rentalApi } from '../../services/rentalApi';

type RentalItem = { item_id: number; item_name: string; status: string; rate_unit: string; rate_amount: number | string; deposit_amount: number | string };
type Customer = { id: number; name: string };

const localDateTimeValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};
const defaultStart = () => { const date = new Date(Date.now() + 3600000); date.setMinutes(0, 0, 0); return localDateTimeValue(date); };
const defaultEnd = () => { const date = new Date(Date.now() + 25 * 3600000); date.setMinutes(0, 0, 0); return localDateTimeValue(date); };
const money = (value: number | string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));

export default function RentalCreateBookingPanel({ refreshKey = 0, onCreated }: { refreshKey?: number; onCreated?: () => void }) {
  const [items, setItems] = useState<RentalItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availability, setAvailability] = useState<{ totalStock: number; reserved: number; available: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ customerId: 0, itemId: 0, quantity: 1, startsAt: defaultStart(), endsAt: defaultEnd(), notes: '' });

  const reloadOptions = async () => {
    try {
      const [rentalRows, customerResponse] = await Promise.all([rentalApi.items(), api.get('/customers')]);
      setItems((rentalRows || []).filter((row: RentalItem) => row.status === 'active'));
      setCustomers(customerResponse.data?.data || []);
    } catch { setError('Pilihan customer/item rental belum dapat dimuat.'); }
  };
  useEffect(() => { void reloadOptions(); }, [refreshKey]);

  const selected = useMemo(() => items.find((row) => row.item_id === Number(form.itemId)), [items, form.itemId]);

  const check = async () => {
    if (!form.itemId || !form.startsAt || !form.endsAt) return;
    setBusy(true); setError('');
    try {
      const data = await rentalApi.availability(Number(form.itemId), new Date(form.startsAt).toISOString(), new Date(form.endsAt).toISOString());
      setAvailability(data);
    } catch { setAvailability(null); setError('Availability gagal dihitung.'); }
    finally { setBusy(false); }
  };

  const create = async () => {
    if (!form.customerId || !form.itemId || form.quantity < 1 || !availability || form.quantity > availability.available) return;
    setBusy(true); setError('');
    try {
      await rentalApi.createBooking({
        customerId: Number(form.customerId), startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(),
        notes: form.notes || undefined, items: [{ itemId: Number(form.itemId), quantity: Number(form.quantity) }],
      });
      setForm({ customerId: 0, itemId: 0, quantity: 1, startsAt: defaultStart(), endsAt: defaultEnd(), notes: '' });
      setAvailability(null); onCreated?.();
    } catch { setError('Booking gagal. Availability mungkin sudah berubah atau customer/item berbeda outlet.'); }
    finally { setBusy(false); }
  };

  return <section className="rounded-2xl border bg-white p-5">
    <h2 className="font-black">New booking</h2><p className="text-sm text-slate-600">Availability dihitung server-side terhadap booking overlap; harga dan deposit juga server-derived.</p>
    {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700">{error}</p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <select value={form.customerId} onChange={(e) => setForm((v) => ({ ...v, customerId: Number(e.target.value) }))} className="rounded-lg border p-2 sm:col-span-2"><option value={0}>Choose customer</option>{customers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
      <select value={form.itemId} onChange={(e) => { setForm((v) => ({ ...v, itemId: Number(e.target.value) })); setAvailability(null); }} className="rounded-lg border p-2"><option value={0}>Choose rental item</option>{items.map((row) => <option key={row.item_id} value={row.item_id}>{row.item_name}</option>)}</select>
      <input type="number" min={1} value={form.quantity} onChange={(e) => setForm((v) => ({ ...v, quantity: Number(e.target.value) }))} className="rounded-lg border p-2" />
      <input type="datetime-local" value={form.startsAt} onChange={(e) => { setForm((v) => ({ ...v, startsAt: e.target.value })); setAvailability(null); }} className="rounded-lg border p-2" />
      <input type="datetime-local" value={form.endsAt} onChange={(e) => { setForm((v) => ({ ...v, endsAt: e.target.value })); setAvailability(null); }} className="rounded-lg border p-2" />
      <input value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} placeholder="Notes" className="rounded-lg border p-2 sm:col-span-2" />
    </div>
    {selected && <p className="mt-3 text-sm text-slate-600">Rate {money(selected.rate_amount)} / {selected.rate_unit}; deposit requirement {money(selected.deposit_amount)}.</p>}
    {availability && <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Available {availability.available} / total {availability.totalStock}; already reserved {availability.reserved}.</div>}
    <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} onClick={() => void check()} className="rounded-lg border px-4 py-2 text-sm font-bold">Check availability</button><button disabled={busy || !availability || form.quantity > availability.available} onClick={() => void create()} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white">Create booking</button></div>
  </section>;
}
