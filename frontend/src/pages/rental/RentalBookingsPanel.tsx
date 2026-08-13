import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, PackageCheck, RefreshCw, Undo2, XCircle } from 'lucide-react';
import { rentalApi } from '../../services/rentalApi';

type Booking = {
  id: number;
  booking_number: string;
  customer_name?: string;
  status: 'reserved' | 'confirmed' | 'picked_up' | 'returned' | 'cancelled';
  starts_at: string;
  ends_at: string;
  subtotal: number | string;
  deposit_amount: number | string;
  deposit_status: string;
  items?: Array<{ item_name: string; quantity: number | string }>;
};

const money = (value: number | string) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(Number(value || 0));

export default function RentalBookingsPanel() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reload = async () => {
    setLoading(true); setError('');
    try { setRows((await rentalApi.bookings()) || []); }
    catch { setError('Booking rental belum dapat dimuat.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void reload(); }, []);

  const change = async (id: number, status: Booking['status']) => {
    setBusy(true); setError('');
    try { await rentalApi.setBookingStatus(id, status); await reload(); }
    catch { setError('Status booking gagal diperbarui.'); }
    finally { setBusy(false); }
  };

  return <section className="rounded-2xl border bg-white p-5">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="font-black">Bookings</h2><p className="text-sm text-slate-600">Reservation → confirmation → pickup → return.</p></div>
      <button onClick={() => void reload()} className="rounded-lg border p-2" aria-label="Refresh bookings"><RefreshCw size={17} /></button>
    </div>
    {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700">{error}</p>}
    {loading ? <div className="grid min-h-40 place-items-center"><Loader2 className="animate-spin" /></div> :
      <div className="mt-4 space-y-3">{rows.map((row) => <div key={row.id} className="rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><strong>{row.booking_number}</strong><p className="text-sm text-slate-600">{row.customer_name || 'Customer'} · {new Date(row.starts_at).toLocaleString('id-ID')} → {new Date(row.ends_at).toLocaleString('id-ID')}</p></div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase">{row.status}</span>
        </div>
        <p className="mt-2 text-sm">{row.items?.map((item) => `${item.item_name} × ${Number(item.quantity)}`).join(', ') || 'Rental items'} · {money(row.subtotal)} · deposit {money(row.deposit_amount)} ({row.deposit_status})</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {row.status === 'reserved' && <>
            <button disabled={busy} onClick={() => void change(row.id, 'confirmed')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-bold"><CheckCircle2 size={15} /> Confirm</button>
            <button disabled={busy} onClick={() => void change(row.id, 'cancelled')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-bold"><XCircle size={15} /> Cancel</button>
          </>}
          {row.status === 'confirmed' && <>
            <button disabled={busy} onClick={() => void change(row.id, 'picked_up')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-bold"><PackageCheck size={15} /> Pickup</button>
            <button disabled={busy} onClick={() => void change(row.id, 'cancelled')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-bold"><XCircle size={15} /> Cancel</button>
          </>}
          {row.status === 'picked_up' && <button disabled={busy} onClick={() => void change(row.id, 'returned')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-bold"><Undo2 size={15} /> Return</button>}
        </div>
      </div>)}</div>}
  </section>;
}
