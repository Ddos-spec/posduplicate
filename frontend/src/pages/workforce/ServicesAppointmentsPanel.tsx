import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CalendarClock, CheckCircle2, Clock3, RefreshCw, UserRoundCheck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  cancelAppointment,
  checkInAppointment,
  checkInMyAppointment,
  completeAppointment,
  completeMyAppointment,
  confirmAppointment,
  createAppointment,
  createAppointmentType,
  getAppointmentContext,
  getAppointmentEvents,
  getAppointments,
  getAppointmentTypes,
  getMyAppointments,
  noShowAppointment,
  rescheduleAppointment,
  type Appointment,
  type AppointmentContext,
  type AppointmentStatus,
  type AppointmentType,
  type ServiceEvent,
} from '../../services/serviceOperationsService';
import { servicesErrorMessage } from '../../services/servicesService';

const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-violet-500';
const dt = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const statusClass = (status: AppointmentStatus) => status === 'completed' ? 'bg-emerald-950 text-emerald-300' : status === 'cancelled' || status === 'no_show' ? 'bg-rose-950 text-rose-300' : status === 'checked_in' ? 'bg-violet-950 text-violet-300' : status === 'confirmed' ? 'bg-cyan-950 text-cyan-300' : 'bg-amber-950 text-amber-300';

export default function ServicesAppointmentsPanel() {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [context, setContext] = useState<AppointmentContext | null>(null);
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [managerRead, setManagerRead] = useState(false);
  const [selfAppointments, setSelfAppointments] = useState<Appointment[]>([]);
  const [events, setEvents] = useState<ServiceEvent[]>([]);
  const [eventAppointment, setEventAppointment] = useState<Appointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [typeForm, setTypeForm] = useState({ code: '', name: '', outletId: '', description: '', durationMinutes: '60', bufferBeforeMinutes: '0', bufferAfterMinutes: '0' });
  const [form, setForm] = useState({ appointmentTypeId: '', customerId: '', employeeId: '', startAt: '', outletId: '', title: '', notes: '' });
  const [reschedule, setReschedule] = useState({ startAt: '', employeeId: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [ctx, typeResult, manager, self] = await Promise.allSettled([getAppointmentContext(), getAppointmentTypes(), getAppointments(), getMyAppointments()]);
    setContext(ctx.status === 'fulfilled' ? ctx.value : null);
    setTypes(typeResult.status === 'fulfilled' ? typeResult.value : []);
    if (manager.status === 'fulfilled') { setAppointments(manager.value); setManagerRead(true); } else { setAppointments([]); setManagerRead(false); }
    setSelfAppointments(self.status === 'fulfilled' ? self.value : []);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (types[0]) setForm((current) => ({ ...current, appointmentTypeId: current.appointmentTypeId || String(types.find((row) => row.is_active)?.id || '') }));
    if (context?.customers[0]) setForm((current) => ({ ...current, customerId: current.customerId || String(context.customers[0].id) }));
    if (context?.employees[0]) setForm((current) => ({ ...current, employeeId: current.employeeId || String(context.employees[0].id) }));
  }, [context, types]);

  const selectedType = useMemo(() => types.find((row) => row.id === Number(form.appointmentTypeId)), [form.appointmentTypeId, types]);

  const execute = async (key: string, action: () => Promise<unknown>, success: string) => {
    setWorking(key);
    try { await action(); toast.success(success); await load(); }
    catch (error) { toast.error(servicesErrorMessage(error, 'Aksi Appointment gagal')); }
    finally { setWorking(null); }
  };

  const submitType = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!typeForm.code.trim() || !typeForm.name.trim()) return toast.error('Code dan nama appointment type wajib diisi');
    await execute('type', () => createAppointmentType({ code: typeForm.code, name: typeForm.name, outletId: typeForm.outletId ? Number(typeForm.outletId) : undefined, description: typeForm.description || undefined, durationMinutes: Number(typeForm.durationMinutes), bufferBeforeMinutes: Number(typeForm.bufferBeforeMinutes), bufferAfterMinutes: Number(typeForm.bufferAfterMinutes) }), 'Appointment type dibuat');
    setTypeForm({ code: '', name: '', outletId: '', description: '', durationMinutes: '60', bufferBeforeMinutes: '0', bufferAfterMinutes: '0' });
  };

  const submitAppointment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.appointmentTypeId || !form.customerId || !form.employeeId || !form.startAt) return toast.error('Type, customer, employee dan start wajib diisi');
    await execute('appointment', () => createAppointment({ appointmentTypeId: Number(form.appointmentTypeId), customerId: Number(form.customerId), employeeId: Number(form.employeeId), startAt: new Date(form.startAt).toISOString(), outletId: form.outletId ? Number(form.outletId) : undefined, title: form.title || undefined, notes: form.notes || undefined }), 'Appointment booked');
    setForm((current) => ({ ...current, startAt: '', title: '', notes: '' }));
  };

  const submitReschedule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rescheduleTarget || !reschedule.startAt) return toast.error('Start baru wajib diisi');
    await execute(`reschedule-${rescheduleTarget.id}`, () => rescheduleAppointment(rescheduleTarget.id, { startAt: new Date(reschedule.startAt).toISOString(), employeeId: reschedule.employeeId ? Number(reschedule.employeeId) : undefined, notes: reschedule.notes || undefined }), 'Appointment dijadwal ulang');
    setRescheduleTarget(null);
  };

  const showEvents = async (appointment: Appointment) => {
    setWorking(`events-${appointment.id}`);
    try { setEvents(await getAppointmentEvents(appointment.id)); setEventAppointment(appointment); }
    catch (error) { toast.error(servicesErrorMessage(error, 'Appointment events gagal dimuat')); }
    finally { setWorking(null); }
  };

  if (loading) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Memuat Appointments…</div>;

  return <div className="space-y-6">
    {context && <section className="grid gap-4 xl:grid-cols-2">
      <form onSubmit={submitType} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-3"><Clock3 className="text-violet-400" /><div><h2 className="font-black">Appointment Types</h2><p className="text-sm text-slate-400">Duration + pre/post buffer disnapshot ke setiap booking.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><input className={inputClass} value={typeForm.code} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })} placeholder="Code" /><input className={inputClass} value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="Nama type" /><select className={inputClass} value={typeForm.outletId} onChange={(e) => setTypeForm({ ...typeForm, outletId: e.target.value })}><option value="">Semua outlet</option>{context.outlets.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select><input className={inputClass} type="number" min="1" max="1440" value={typeForm.durationMinutes} onChange={(e) => setTypeForm({ ...typeForm, durationMinutes: e.target.value })} placeholder="Duration minutes" /><input className={inputClass} type="number" min="0" value={typeForm.bufferBeforeMinutes} onChange={(e) => setTypeForm({ ...typeForm, bufferBeforeMinutes: e.target.value })} placeholder="Buffer before" /><input className={inputClass} type="number" min="0" value={typeForm.bufferAfterMinutes} onChange={(e) => setTypeForm({ ...typeForm, bufferAfterMinutes: e.target.value })} placeholder="Buffer after" /><textarea className={`${inputClass} sm:col-span-2`} rows={2} value={typeForm.description} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })} placeholder="Description" /></div><button disabled={working === 'type'} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">Create type</button><div className="mt-5 grid gap-2 sm:grid-cols-2">{types.map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm"><p className="font-bold">{row.code} · {row.name}</p><p className="text-slate-500">{row.duration_minutes}m + {row.buffer_before_minutes}/{row.buffer_after_minutes} buffer · {row.outlet_name || 'all outlets'}</p></div>)}</div></form>
      <form onSubmit={submitAppointment} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-3"><CalendarCheck className="text-cyan-400" /><div><h2 className="font-black">Book Appointment</h2><p className="text-sm text-slate-400">Booking membuat Planning block atomically; employee overlap ditolak.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><select className={inputClass} value={form.appointmentTypeId} onChange={(e) => setForm({ ...form, appointmentTypeId: e.target.value, outletId: '' })}><option value="">Pilih type aktif</option>{types.filter((row) => row.is_active).map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select><select className={inputClass} value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}><option value="">Customer</option>{context.customers.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.phone || 'no phone'}</option>)}</select><select className={inputClass} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}><option value="">Employee</option>{context.employees.map((row) => <option key={row.id} value={row.id}>{row.employee_id} · {row.name}</option>)}</select><input className={inputClass} type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} /><select className={inputClass} value={form.outletId} onChange={(e) => setForm({ ...form, outletId: e.target.value })} disabled={Boolean(selectedType?.outlet_id)}><option value="">Auto outlet</option>{context.outlets.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title opsional" /><textarea className={`${inputClass} sm:col-span-2`} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" /></div>{selectedType && <p className="mt-2 text-xs text-slate-500">Slot {selectedType.duration_minutes}m; blocked window termasuk buffer {selectedType.buffer_before_minutes}m sebelum + {selectedType.buffer_after_minutes}m sesudah.</p>}<button disabled={working === 'appointment'} className="mt-4 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950">Book appointment</button></form>
    </section>}

    {managerRead && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between"><div><h2 className="font-black">Appointment Board</h2><p className="text-sm text-slate-400">booked → confirmed → checked_in → completed; no-show/cancel terminal.</p></div><button onClick={() => void load()} className="rounded-xl border border-slate-700 p-2"><RefreshCw size={17} /></button></div><div className="mt-4 grid gap-3 xl:grid-cols-2">{appointments.map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex justify-between gap-2"><div><p className="font-bold">{row.code} · {row.title}</p><p className="text-sm text-slate-400">{row.customer_name} · {row.employee_name} · {row.type_name}</p></div><span className={`h-fit rounded-full px-2 py-1 text-xs font-bold uppercase ${statusClass(row.status)}`}>{row.status}</span></div><p className="mt-2 text-xs text-slate-500">{dt(row.scheduled_start)} – {dt(row.scheduled_end)} · {row.outlet_name || '—'}</p><div className="mt-3 flex flex-wrap gap-2">{row.status === 'booked' && <button disabled={working !== null} onClick={() => void execute(`confirm-${row.id}`, () => confirmAppointment(row.id), 'Appointment confirmed')} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white">Confirm</button>}{['booked','confirmed'].includes(row.status) && <button onClick={() => { setRescheduleTarget(row); setReschedule({ startAt: '', employeeId: String(row.assigned_employee_id), notes: '' }); }} className="rounded-lg border border-violet-700 px-3 py-1.5 text-xs font-bold text-violet-300">Reschedule</button>}{row.status === 'confirmed' && <><button disabled={working !== null} onClick={() => void execute(`checkin-${row.id}`, () => checkInAppointment(row.id), 'Customer checked in')} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white">Check-in</button><button disabled={working !== null} onClick={() => void execute(`noshow-${row.id}`, () => noShowAppointment(row.id), 'Marked no-show')} className="rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300">No-show</button></>}{row.status === 'checked_in' && <button disabled={working !== null} onClick={() => { const note = window.prompt('Completion note (opsional)') || undefined; void execute(`complete-${row.id}`, () => completeAppointment(row.id, note), 'Appointment completed'); }} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Complete</button>}{['booked','confirmed'].includes(row.status) && <button disabled={working !== null} onClick={() => { const reason = window.prompt('Alasan cancellation wajib diisi'); if (reason?.trim()) void execute(`cancel-${row.id}`, () => cancelAppointment(row.id, reason.trim()), 'Appointment cancelled'); }} className="rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300">Cancel</button>}<button onClick={() => void showEvents(row)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300">Events</button></div></div>)}</div></section>}

    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-3"><UserRoundCheck className="text-emerald-400" /><div><h2 className="font-black">Staff Self Appointments</h2><p className="text-sm text-slate-400">Check-in/complete hanya untuk employee yang diassign pada appointment.</p></div></div><div className="mt-4 grid gap-3 xl:grid-cols-2">{selfAppointments.map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex justify-between gap-2"><div><p className="font-bold">{row.code} · {row.title}</p><p className="text-sm text-slate-400">{row.customer_name} · {row.type_name} · {dt(row.scheduled_start)}</p></div><span className={`h-fit rounded-full px-2 py-1 text-xs font-bold uppercase ${statusClass(row.status)}`}>{row.status}</span></div><div className="mt-3 flex gap-2">{row.status === 'confirmed' && <button disabled={working !== null} onClick={() => void execute(`self-checkin-${row.id}`, () => checkInMyAppointment(row.id), 'Appointment checked in')} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white">Check-in</button>}{row.status === 'checked_in' && <button disabled={working !== null} onClick={() => { const note = window.prompt('Completion note (opsional)') || undefined; void execute(`self-complete-${row.id}`, () => completeMyAppointment(row.id, note), 'Appointment completed'); }} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Complete</button>}</div></div>)}{selfAppointments.length === 0 && <p className="text-sm text-slate-500">Tidak ada self appointment atau capability tidak tersedia.</p>}</div></section>

    {rescheduleTarget && context && <form onSubmit={submitReschedule} className="rounded-2xl border border-violet-800/60 bg-violet-950/20 p-5"><div className="flex justify-between"><div><h2 className="font-black">Reschedule · {rescheduleTarget.code}</h2><p className="text-sm text-slate-400">Existing Planning block dikunci dan dipindah atomically.</p></div><button type="button" onClick={() => setRescheduleTarget(null)}><XCircle /></button></div><div className="mt-4 grid gap-3 md:grid-cols-3"><input className={inputClass} type="datetime-local" value={reschedule.startAt} onChange={(e) => setReschedule({ ...reschedule, startAt: e.target.value })} /><select className={inputClass} value={reschedule.employeeId} onChange={(e) => setReschedule({ ...reschedule, employeeId: e.target.value })}><option value="">Keep employee</option>{context.employees.map((row) => <option key={row.id} value={row.id}>{row.employee_id} · {row.name}</option>)}</select><input className={inputClass} value={reschedule.notes} onChange={(e) => setReschedule({ ...reschedule, notes: e.target.value })} placeholder="Notes" /></div><button className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white"><CalendarClock size={16} /> Reschedule</button></form>}

    {eventAppointment && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex justify-between"><div><h2 className="font-black">Appointment Audit · {eventAppointment.code}</h2><p className="text-sm text-slate-400">Append-only lifecycle timeline.</p></div><button onClick={() => setEventAppointment(null)}><XCircle /></button></div><div className="mt-4 space-y-2">{events.map((event) => <div key={event.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3"><p className="font-bold">{event.event_type}</p><p className="text-xs text-slate-500">{dt(event.created_at || event.occurred_at)} · {event.actor_name || event.actor_employee_name || 'system'}</p>{event.notes && <p className="mt-1 text-sm text-slate-300">{event.notes}</p>}</div>)}</div></section>}
  </div>;
}
