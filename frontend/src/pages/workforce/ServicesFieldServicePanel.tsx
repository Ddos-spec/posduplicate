import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Crosshair, MapPin, RefreshCw, Route, Truck, Wrench, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  arriveMyFieldServiceOrder,
  cancelFieldServiceOrder,
  completeMyFieldServiceOrder,
  createFieldServiceOrder,
  departMyFieldServiceOrder,
  getFieldServiceContext,
  getFieldServiceEvents,
  getFieldServiceOrders,
  getMyFieldServiceOrders,
  scheduleFieldServiceOrder,
  type FieldServiceContext,
  type FieldServiceOrder,
  type ServiceEvent,
} from '../../services/serviceOperationsService';
import { servicesErrorMessage } from '../../services/servicesService';

const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-violet-500';
const dt = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const statusClass = (status: FieldServiceOrder['status']) => status === 'completed' ? 'bg-emerald-950 text-emerald-300' : status === 'cancelled' ? 'bg-rose-950 text-rose-300' : status === 'on_site' ? 'bg-violet-950 text-violet-300' : status === 'en_route' ? 'bg-cyan-950 text-cyan-300' : status === 'scheduled' ? 'bg-amber-950 text-amber-300' : 'bg-slate-800 text-slate-300';

export default function ServicesFieldServicePanel() {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [context, setContext] = useState<FieldServiceContext | null>(null);
  const [orders, setOrders] = useState<FieldServiceOrder[]>([]);
  const [managerRead, setManagerRead] = useState(false);
  const [selfOrders, setSelfOrders] = useState<FieldServiceOrder[]>([]);
  const [selfEmployee, setSelfEmployee] = useState<{ name: string; employee_id: string } | null>(null);
  const [events, setEvents] = useState<ServiceEvent[]>([]);
  const [eventOrder, setEventOrder] = useState<FieldServiceOrder | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<FieldServiceOrder | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [form, setForm] = useState({ code: '', title: '', customerId: '', projectId: '', taskId: '', serviceAddress: '', contactName: '', contactPhone: '', priority: 'normal' as FieldServiceOrder['priority'], description: '' });
  const [schedule, setSchedule] = useState({ employeeId: '', startAt: '', endAt: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [ctx, manager, self] = await Promise.allSettled([getFieldServiceContext(), getFieldServiceOrders(), getMyFieldServiceOrders()]);
    setContext(ctx.status === 'fulfilled' ? ctx.value : null);
    if (manager.status === 'fulfilled') { setOrders(manager.value); setManagerRead(true); } else { setOrders([]); setManagerRead(false); }
    if (self.status === 'fulfilled') { setSelfOrders(self.value.orders); setSelfEmployee(self.value.employee); } else { setSelfOrders([]); setSelfEmployee(null); }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const taskOptions = useMemo(() => context?.tasks.filter((row) => !form.projectId || row.project_id === Number(form.projectId)) || [], [context, form.projectId]);

  const execute = async (key: string, action: () => Promise<unknown>, success: string) => {
    setWorking(key);
    try { await action(); toast.success(success); await load(); }
    catch (error) { toast.error(servicesErrorMessage(error, 'Aksi Field Service gagal')); }
    finally { setWorking(null); }
  };

  const chooseCustomer = (customerId: string) => {
    const customer = context?.customers.find((row) => row.id === Number(customerId));
    setForm((current) => ({ ...current, customerId, serviceAddress: customer?.address || current.serviceAddress, contactName: customer?.name || current.contactName, contactPhone: customer?.phone || current.contactPhone }));
  };

  const submitOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.code.trim() || !form.title.trim() || !form.customerId) return toast.error('Code, title dan customer wajib diisi');
    await execute('create', () => createFieldServiceOrder({ code: form.code, title: form.title, customerId: Number(form.customerId), projectId: form.projectId ? Number(form.projectId) : undefined, taskId: form.taskId ? Number(form.taskId) : undefined, serviceAddress: form.serviceAddress || undefined, contactName: form.contactName || undefined, contactPhone: form.contactPhone || undefined, priority: form.priority, description: form.description || undefined }), 'Work order dibuat');
    setForm({ code: '', title: '', customerId: '', projectId: '', taskId: '', serviceAddress: '', contactName: '', contactPhone: '', priority: 'normal', description: '' });
  };

  const submitSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!scheduleTarget || !schedule.employeeId || !schedule.startAt || !schedule.endAt) return toast.error('Employee dan jadwal wajib diisi');
    await execute(`schedule-${scheduleTarget.id}`, () => scheduleFieldServiceOrder(scheduleTarget.id, { employeeId: Number(schedule.employeeId), startAt: new Date(schedule.startAt).toISOString(), endAt: new Date(schedule.endAt).toISOString(), notes: schedule.notes || undefined }), 'Work order dijadwalkan');
    setScheduleTarget(null);
    setSchedule({ employeeId: '', startAt: '', endAt: '', notes: '' });
  };

  const capturePosition = () => {
    if (!navigator.geolocation) return toast.error('Geolocation tidak tersedia di browser ini');
    navigator.geolocation.getCurrentPosition((position) => {
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      toast.success('Posisi saat ini tersimpan untuk event berikutnya');
    }, () => toast.error('Lokasi tidak dapat diakses'));
  };

  const showEvents = async (order: FieldServiceOrder) => {
    setWorking(`events-${order.id}`);
    try { setEvents(await getFieldServiceEvents(order.id)); setEventOrder(order); }
    catch (error) { toast.error(servicesErrorMessage(error, 'Audit events gagal dimuat')); }
    finally { setWorking(null); }
  };

  if (loading) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Memuat Field Service…</div>;

  return <div className="space-y-6">
    {context && <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={submitOrder} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center gap-3"><Wrench className="text-violet-400" /><div><h2 className="font-black">Create Work Order</h2><p className="text-sm text-slate-400">Customer/employee/project berasal dari tenant-scoped masters.</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Code" /><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" /><select className={`${inputClass} sm:col-span-2`} value={form.customerId} onChange={(e) => chooseCustomer(e.target.value)}><option value="">Pilih customer</option>{context.customers.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.phone || 'no phone'}</option>)}</select><select className={inputClass} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value, taskId: '' })}><option value="">Project opsional</option>{context.projects.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select><select className={inputClass} value={form.taskId} onChange={(e) => setForm({ ...form, taskId: e.target.value })} disabled={!form.projectId}><option value="">Task opsional</option>{taskOptions.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select><select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as FieldServiceOrder['priority'] })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><input className={inputClass} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="Contact phone" /><input className={`${inputClass} sm:col-span-2`} value={form.serviceAddress} onChange={(e) => setForm({ ...form, serviceAddress: e.target.value })} placeholder="Service address" /><textarea className={`${inputClass} sm:col-span-2`} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" /></div><button disabled={working === 'create'} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Create work order</button>
      </form>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between"><div><h2 className="font-black">Dispatch Board</h2><p className="text-sm text-slate-400">Scheduling memakai Planning lock 74001; overlap ditolak backend.</p></div><button onClick={() => void load()} className="rounded-xl border border-slate-700 p-2"><RefreshCw size={17} /></button></div>{managerRead ? <div className="mt-4 space-y-3">{orders.map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold">{row.code} · {row.title}</p><p className="text-sm text-slate-400">{row.customer_name} · {row.employee_name || 'unassigned'} · {row.priority}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${statusClass(row.status)}`}>{row.status}</span></div><p className="mt-2 text-xs text-slate-500">{row.service_address}</p>{row.scheduled_start && <p className="mt-1 text-xs text-amber-300">{dt(row.scheduled_start)} – {dt(row.scheduled_end)}</p>}<div className="mt-3 flex flex-wrap gap-2">{row.status === 'draft' && <button onClick={() => { setScheduleTarget(row); setSchedule((current) => ({ ...current, employeeId: current.employeeId || String(context.employees[0]?.id || '') })); }} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white">Schedule</button>}{!['completed','cancelled'].includes(row.status) && <button onClick={() => { const reason = window.prompt('Alasan cancellation wajib diisi'); if (reason?.trim()) void execute(`cancel-${row.id}`, () => cancelFieldServiceOrder(row.id, reason.trim()), 'Work order dibatalkan'); }} className="rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300">Cancel</button>}<button disabled={working === `events-${row.id}`} onClick={() => void showEvents(row)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300">Audit events</button></div></div>)}{orders.length === 0 && <p className="text-sm text-slate-500">Belum ada work order.</p>}</div> : <p className="mt-4 text-sm text-amber-300">Manage context tersedia, tetapi akun tidak memiliki field-service read.</p>}</div>
    </section>}

    {scheduleTarget && context && <form onSubmit={submitSchedule} className="rounded-2xl border border-cyan-800/60 bg-cyan-950/20 p-5"><div className="flex justify-between gap-3"><div><h2 className="font-black">Schedule {scheduleTarget.code}</h2><p className="text-sm text-slate-400">{scheduleTarget.title}</p></div><button type="button" onClick={() => setScheduleTarget(null)}><XCircle /></button></div><div className="mt-4 grid gap-3 md:grid-cols-3"><select className={inputClass} value={schedule.employeeId} onChange={(e) => setSchedule({ ...schedule, employeeId: e.target.value })}><option value="">Pilih technician</option>{context.employees.map((row) => <option key={row.id} value={row.id}>{row.employee_id} · {row.name}</option>)}</select><input className={inputClass} type="datetime-local" value={schedule.startAt} onChange={(e) => setSchedule({ ...schedule, startAt: e.target.value })} /><input className={inputClass} type="datetime-local" value={schedule.endAt} onChange={(e) => setSchedule({ ...schedule, endAt: e.target.value })} /><input className={`${inputClass} md:col-span-3`} value={schedule.notes} onChange={(e) => setSchedule({ ...schedule, notes: e.target.value })} placeholder="Dispatch notes" /></div><button disabled={working !== null} className="mt-4 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950">Confirm schedule</button></form>}

    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Truck className="text-emerald-400" /><div><h2 className="font-black">Technician Self Board</h2><p className="text-sm text-slate-400">Assignment identity berasal dari login; optional event coordinates dapat dicatat.</p></div></div>{selfEmployee && <button onClick={capturePosition} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm"><Crosshair size={16} /> {coords ? 'Position captured' : 'Capture position'}</button>}</div>{selfEmployee ? <><p className="mt-3 text-sm text-slate-400">{selfEmployee.employee_id} · {selfEmployee.name}{coords && ` · ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`}</p><div className="mt-4 grid gap-3 lg:grid-cols-2">{selfOrders.map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex justify-between gap-2"><div><p className="font-bold">{row.code} · {row.title}</p><p className="text-sm text-slate-400">{row.customer_name} · {row.service_address}</p></div><span className={`h-fit rounded-full px-2 py-1 text-xs font-bold uppercase ${statusClass(row.status)}`}>{row.status}</span></div><div className="mt-3 flex flex-wrap gap-2">{row.status === 'scheduled' && <button disabled={working !== null} onClick={() => void execute(`depart-${row.id}`, () => departMyFieldServiceOrder(row.id, { ...coords || {} }), 'Status: en route')} className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white"><Route size={14} /> Depart</button>}{['scheduled','en_route'].includes(row.status) && <button disabled={working !== null} onClick={() => void execute(`arrive-${row.id}`, () => arriveMyFieldServiceOrder(row.id, { ...coords || {} }), 'Status: on site')} className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white"><MapPin size={14} /> Arrive</button>}{row.status === 'on_site' && <button disabled={working !== null} onClick={() => { const resolution = window.prompt('Resolution note wajib diisi'); if (resolution?.trim()) void execute(`complete-${row.id}`, () => completeMyFieldServiceOrder(row.id, { ...coords || {}, resolution: resolution.trim() }), 'Work order completed'); }} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Complete</button>}</div></div>)}{selfOrders.length === 0 && <p className="text-sm text-slate-500">Tidak ada assignment Field Service.</p>}</div></> : <p className="mt-4 text-sm text-slate-500">Field Service self-service tidak tersedia untuk akun ini.</p>}</section>

    {eventOrder && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex justify-between"><div><h2 className="font-black">Audit Trail · {eventOrder.code}</h2><p className="text-sm text-slate-400">Append-only lifecycle events.</p></div><button onClick={() => setEventOrder(null)}><XCircle /></button></div><div className="mt-4 space-y-3">{events.map((event) => <div key={event.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3"><p className="font-bold">{event.event_type}</p><p className="text-xs text-slate-500">{dt(event.occurred_at || event.created_at)} · {event.actor_name || event.employee_name || 'system'}</p>{event.notes && <p className="mt-1 text-sm text-slate-300">{event.notes}</p>}</div>)}</div></section>}
  </div>;
}
