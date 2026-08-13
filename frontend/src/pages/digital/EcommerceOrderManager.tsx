import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getEcommerceOrders,
  progressEcommerceOrder,
  type EcommerceOrder,
  type EcommerceOrderStatus,
} from '../../services/digitalWebsiteService';

const nextStatuses: Record<EcommerceOrderStatus, EcommerceOrderStatus[]> = {
  reserved: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};
const labels: Record<EcommerceOrderStatus, string> = {
  reserved: 'Reserved', confirmed: 'Confirmed', preparing: 'Preparing', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled',
};
const money = (value: number | string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));

export default function EcommerceOrderManager() {
  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    try {
      setOrders(await getEcommerceOrders());
    } catch {
      toast.error('Gagal memuat order eCommerce');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const progress = async (order: EcommerceOrder, status: EcommerceOrderStatus) => {
    setBusyId(order.id);
    try {
      await progressEcommerceOrder(order.id, status);
      await load();
      toast.success(`Order ${order.order_number} → ${labels[status]}`);
    } catch {
      toast.error('Perubahan status order ditolak');
    } finally {
      setBusyId(null);
    }
  };

  return <section className="rounded-2xl border bg-white p-4">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase text-blue-600">eCommerce operations</p><h2 className="text-lg font-black">Order Queue</h2></div><button type="button" onClick={() => void load()} className="rounded-lg border p-2" title="Refresh orders"><RefreshCw size={16} /></button></div>
    {loading ? <div className="grid min-h-28 place-items-center"><Loader2 className="animate-spin" /></div> : <div className="mt-4 space-y-3">
      {orders.map((order) => <article key={order.id} className="rounded-xl border p-3">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><b>{order.order_number}</b><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{labels[order.status]}</span></div><p className="mt-1 text-sm text-slate-600">{order.customer_name} · {order.customer_phone}</p><p className="text-xs text-slate-500">{order.site_name} · {order.outlet_name}</p></div><div className="text-right"><b>{money(order.total)}</b><p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString('id-ID')}</p></div></div>
        {nextStatuses[order.status].length > 0 && <div className="mt-3 flex flex-wrap gap-2">{nextStatuses[order.status].map((status) => <button key={status} disabled={busyId === order.id} onClick={() => void progress(order, status)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${status === 'cancelled' ? 'border border-rose-200 text-rose-700' : 'bg-slate-900 text-white'} disabled:opacity-50`}>{labels[status]}</button>)}</div>}
      </article>)}
      {orders.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Belum ada order storefront.</p>}
    </div>}
  </section>;
}
