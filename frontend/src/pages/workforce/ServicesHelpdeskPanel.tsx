import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, MessageSquare, RefreshCw, Send, ShieldCheck, TicketCheck, UserCheck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  addHelpdeskMessage,
  assignHelpdeskTicket,
  createHelpdeskSlaPolicy,
  createHelpdeskTicket,
  getHelpdeskContext,
  getHelpdeskEvents,
  getHelpdeskMessages,
  getHelpdeskSlaPolicies,
  getHelpdeskTickets,
  getMyHelpdeskMessages,
  getMyHelpdeskTickets,
  replyMyHelpdeskTicket,
  updateHelpdeskTicketStatus,
  updateMyHelpdeskTicketStatus,
  type HelpdeskContext,
  type HelpdeskMessage,
  type HelpdeskSla,
  type HelpdeskStatus,
  type HelpdeskTicket,
  type ServiceEvent,
} from '../../services/serviceOperationsService';
import { servicesErrorMessage } from '../../services/servicesService';

const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-violet-500';
const dt = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const statusClass = (status: HelpdeskStatus) => status === 'resolved' || status === 'closed' ? 'bg-emerald-950 text-emerald-300' : status === 'cancelled' ? 'bg-rose-950 text-rose-300' : status === 'customer_wait' ? 'bg-violet-950 text-violet-300' : status === 'pending' ? 'bg-amber-950 text-amber-300' : 'bg-cyan-950 text-cyan-300';
const transitions: Record<HelpdeskStatus, HelpdeskStatus[]> = { new: ['open','cancelled'], open: ['pending','customer_wait','resolved','cancelled'], pending: ['open','customer_wait','resolved','cancelled'], customer_wait: ['open','pending','resolved','cancelled'], resolved: ['open','closed'], closed: [], cancelled: [] };
const selfTransitions: Partial<Record<HelpdeskStatus, HelpdeskStatus[]>> = { open: ['pending','customer_wait','resolved'], pending: ['open','customer_wait','resolved'], customer_wait: ['open','pending','resolved'] };

export default function ServicesHelpdeskPanel() {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [context, setContext] = useState<HelpdeskContext | null>(null);
  const [slas, setSlas] = useState<HelpdeskSla[]>([]);
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [managerRead, setManagerRead] = useState(false);
  const [selfTickets, setSelfTickets] = useState<HelpdeskTicket[]>([]);
  const [selfEmployee, setSelfEmployee] = useState<{ name: string; employee_id: string } | null>(null);
  const [conversation, setConversation] = useState<{ ticket: HelpdeskTicket; self: boolean } | null>(null);
  const [messages, setMessages] = useState<HelpdeskMessage[]>([]);
  const [events, setEvents] = useState<ServiceEvent[]>([]);
  const [messageForm, setMessageForm] = useState({ body: '', visibility: 'public' as HelpdeskMessage['visibility'], direction: 'outbound' as HelpdeskMessage['direction'] });
  const [slaForm, setSlaForm] = useState({ name: '', priority: '' as '' | HelpdeskTicket['priority'], firstResponseMinutes: '60', resolutionMinutes: '480' });
  const [ticketForm, setTicketForm] = useState({ code: '', subject: '', description: '', customerId: '', projectId: '', fieldOrderId: '', slaPolicyId: '', requesterName: '', requesterEmail: '', requesterPhone: '', channel: 'internal' as HelpdeskTicket['channel'], priority: 'normal' as HelpdeskTicket['priority'], initialMessage: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [ctx, sla, manager, self] = await Promise.allSettled([getHelpdeskContext(), getHelpdeskSlaPolicies(), getHelpdeskTickets(), getMyHelpdeskTickets()]);
    setContext(ctx.status === 'fulfilled' ? ctx.value : null);
    setSlas(sla.status === 'fulfilled' ? sla.value : []);
    if (manager.status === 'fulfilled') { setTickets(manager.value); setManagerRead(true); } else { setTickets([]); setManagerRead(false); }
    if (self.status === 'fulfilled') { setSelfTickets(self.value.tickets); setSelfEmployee(self.value.employee); } else { setSelfTickets([]); setSelfEmployee(null); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const fieldOptions = useMemo(() => context?.fieldOrders.filter((row) => !ticketForm.customerId || row.customer_id === Number(ticketForm.customerId)) || [], [context, ticketForm.customerId]);
  const breachCount = useMemo(() => tickets.filter((row) => row.first_response_breached || row.resolution_breached).length, [tickets]);

  const execute = async (key: string, action: () => Promise<unknown>, success: string) => {
    setWorking(key);
    try { await action(); toast.success(success); await load(); }
    catch (error) { toast.error(servicesErrorMessage(error, 'Aksi Helpdesk gagal')); }
    finally { setWorking(null); }
  };

  const submitSla = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slaForm.name.trim()) return toast.error('Nama SLA wajib diisi');
    await execute('sla', () => createHelpdeskSlaPolicy({ name: slaForm.name, priority: slaForm.priority || undefined, firstResponseMinutes: Number(slaForm.firstResponseMinutes), resolutionMinutes: Number(slaForm.resolutionMinutes) }), 'SLA policy dibuat');
    setSlaForm({ name: '', priority: '', firstResponseMinutes: '60', resolutionMinutes: '480' });
  };

  const submitTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ticketForm.code.trim() || !ticketForm.subject.trim()) return toast.error('Code dan subject wajib diisi');
    if (!ticketForm.customerId && (!ticketForm.requesterName.trim() || (!ticketForm.requesterEmail.trim() && !ticketForm.requesterPhone.trim()))) return toast.error('Ticket tanpa customer membutuhkan nama requester + email/phone');
    await execute('ticket', () => createHelpdeskTicket({ code: ticketForm.code, subject: ticketForm.subject, description: ticketForm.description || undefined, customerId: ticketForm.customerId ? Number(ticketForm.customerId) : undefined, projectId: ticketForm.projectId ? Number(ticketForm.projectId) : undefined, fieldOrderId: ticketForm.fieldOrderId ? Number(ticketForm.fieldOrderId) : undefined, slaPolicyId: ticketForm.slaPolicyId ? Number(ticketForm.slaPolicyId) : undefined, requesterName: ticketForm.requesterName || undefined, requesterEmail: ticketForm.requesterEmail || undefined, requesterPhone: ticketForm.requesterPhone || undefined, channel: ticketForm.channel, priority: ticketForm.priority, initialMessage: ticketForm.initialMessage || undefined }), 'Ticket dibuat');
    setTicketForm({ code: '', subject: '', description: '', customerId: '', projectId: '', fieldOrderId: '', slaPolicyId: '', requesterName: '', requesterEmail: '', requesterPhone: '', channel: 'internal', priority: 'normal', initialMessage: '' });
  };

  const changeStatus = (ticket: HelpdeskTicket, target: HelpdeskStatus, self: boolean) => {
    let note: string | undefined;
    if (target === 'resolved') { const raw = window.prompt('Resolution note wajib diisi'); if (!raw?.trim()) return; note = raw.trim(); }
    if (target === 'cancelled') { const raw = window.prompt('Alasan cancellation wajib diisi'); if (!raw?.trim()) return; note = raw.trim(); }
    void execute(`${self ? 'self' : 'mgr'}-${ticket.id}-${target}`, () => self ? updateMyHelpdeskTicketStatus(ticket.id, target, note) : updateHelpdeskTicketStatus(ticket.id, target, note), `Ticket → ${target}`);
  };

  const openConversation = async (ticket: HelpdeskTicket, self: boolean) => {
    setWorking(`conversation-${ticket.id}`);
    try {
      const [msg, ev] = await Promise.allSettled([self ? getMyHelpdeskMessages(ticket.id) : getHelpdeskMessages(ticket.id), self ? Promise.resolve([] as ServiceEvent[]) : getHelpdeskEvents(ticket.id)]);
      if (msg.status !== 'fulfilled') throw msg.reason;
      setMessages(msg.value);
      setEvents(ev.status === 'fulfilled' ? ev.value : []);
      setConversation({ ticket, self });
      setMessageForm({ body: '', visibility: 'public', direction: 'outbound' });
    } catch (error) { toast.error(servicesErrorMessage(error, 'Conversation gagal dimuat')); }
    finally { setWorking(null); }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!conversation || !messageForm.body.trim()) return;
    setWorking('message');
    try {
      if (conversation.self) await replyMyHelpdeskTicket(conversation.ticket.id, { body: messageForm.body.trim(), visibility: messageForm.visibility });
      else await addHelpdeskMessage(conversation.ticket.id, { body: messageForm.body.trim(), direction: messageForm.visibility === 'internal' ? 'internal' : messageForm.direction, visibility: messageForm.visibility });
      setMessageForm((current) => ({ ...current, body: '' }));
      const next = conversation.self ? await getMyHelpdeskMessages(conversation.ticket.id) : await getHelpdeskMessages(conversation.ticket.id);
      setMessages(next);
      toast.success('Message ditambahkan');
      await load();
    } catch (error) { toast.error(servicesErrorMessage(error, 'Message gagal dikirim')); }
    finally { setWorking(null); }
  };

  if (loading) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Memuat Helpdesk…</div>;

  return <div className="space-y-6">
    {context && <section className="grid gap-4 xl:grid-cols-2">
      <form onSubmit={submitTicket} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-3"><TicketCheck className="text-violet-400" /><div><h2 className="font-black">Create Ticket</h2><p className="text-sm text-slate-400">Customer opsional; requester fallback tetap divalidasi backend.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><input className={inputClass} value={ticketForm.code} onChange={(e) => setTicketForm({ ...ticketForm, code: e.target.value })} placeholder="Code" /><input className={inputClass} value={ticketForm.subject} onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })} placeholder="Subject" /><select className={inputClass} value={ticketForm.customerId} onChange={(e) => setTicketForm({ ...ticketForm, customerId: e.target.value, fieldOrderId: '' })}><option value="">Tanpa customer</option>{context.customers.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.phone || 'no phone'}</option>)}</select><select className={inputClass} value={ticketForm.channel} onChange={(e) => setTicketForm({ ...ticketForm, channel: e.target.value as HelpdeskTicket['channel'] })}><option value="internal">Internal</option><option value="web">Web</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="phone">Phone</option><option value="social">Social</option></select><select className={inputClass} value={ticketForm.priority} onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as HelpdeskTicket['priority'] })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><select className={inputClass} value={ticketForm.slaPolicyId} onChange={(e) => setTicketForm({ ...ticketForm, slaPolicyId: e.target.value })}><option value="">Auto SLA by priority</option>{slas.filter((row) => row.is_active).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select><select className={inputClass} value={ticketForm.projectId} onChange={(e) => setTicketForm({ ...ticketForm, projectId: e.target.value })}><option value="">Project opsional</option>{context.projects.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select><select className={inputClass} value={ticketForm.fieldOrderId} onChange={(e) => setTicketForm({ ...ticketForm, fieldOrderId: e.target.value })}><option value="">Field order opsional</option>{fieldOptions.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.title}</option>)}</select>{!ticketForm.customerId && <><input className={inputClass} value={ticketForm.requesterName} onChange={(e) => setTicketForm({ ...ticketForm, requesterName: e.target.value })} placeholder="Requester name" /><input className={inputClass} value={ticketForm.requesterPhone} onChange={(e) => setTicketForm({ ...ticketForm, requesterPhone: e.target.value })} placeholder="Requester phone" /><input className={`${inputClass} sm:col-span-2`} type="email" value={ticketForm.requesterEmail} onChange={(e) => setTicketForm({ ...ticketForm, requesterEmail: e.target.value })} placeholder="Requester email" /></>}<textarea className={`${inputClass} sm:col-span-2`} rows={2} value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} placeholder="Description" /><textarea className={`${inputClass} sm:col-span-2`} rows={2} value={ticketForm.initialMessage} onChange={(e) => setTicketForm({ ...ticketForm, initialMessage: e.target.value })} placeholder="Initial message" /></div><button disabled={working === 'ticket'} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">Create ticket</button></form>
      <form onSubmit={submitSla} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-3"><ShieldCheck className="text-emerald-400" /><div><h2 className="font-black">SLA Policies</h2><p className="text-sm text-slate-400">First-response dan resolution deadline dihitung saat ticket dibuat.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><input className={inputClass} value={slaForm.name} onChange={(e) => setSlaForm({ ...slaForm, name: e.target.value })} placeholder="Nama SLA" /><select className={inputClass} value={slaForm.priority} onChange={(e) => setSlaForm({ ...slaForm, priority: e.target.value as typeof slaForm.priority })}><option value="">Semua priority</option><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><input className={inputClass} type="number" min="1" value={slaForm.firstResponseMinutes} onChange={(e) => setSlaForm({ ...slaForm, firstResponseMinutes: e.target.value })} placeholder="First response min" /><input className={inputClass} type="number" min="1" value={slaForm.resolutionMinutes} onChange={(e) => setSlaForm({ ...slaForm, resolutionMinutes: e.target.value })} placeholder="Resolution min" /></div><button disabled={working === 'sla'} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Create SLA</button><div className="mt-5 space-y-2">{slas.map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm"><p className="font-bold">{row.name} <span className="text-xs font-normal text-slate-500">{row.priority || 'all'}</span></p><p className="text-slate-400">first {row.first_response_minutes}m · resolution {row.resolution_minutes}m</p></div>)}</div></form>
    </section>}

    {managerRead && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between"><div><h2 className="font-black">Manager Ticket Queue</h2><p className="text-sm text-slate-400">{tickets.length} ticket · {breachCount} SLA breach aktif.</p></div><button onClick={() => void load()} className="rounded-xl border border-slate-700 p-2"><RefreshCw size={17} /></button></div><div className="mt-4 grid gap-3 xl:grid-cols-2">{tickets.map((ticket) => <div key={ticket.id} className={`rounded-xl border bg-slate-950 p-4 ${ticket.first_response_breached || ticket.resolution_breached ? 'border-rose-800/70' : 'border-slate-800'}`}><div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold">{ticket.code} · {ticket.subject}</p><p className="text-sm text-slate-400">{ticket.customer_name || ticket.requester_name || 'Requester'} · {ticket.employee_name || 'unassigned'} · {ticket.priority}</p></div><span className={`h-fit rounded-full px-2 py-1 text-xs font-bold uppercase ${statusClass(ticket.status)}`}>{ticket.status}</span></div>{(ticket.first_response_breached || ticket.resolution_breached) && <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-rose-300"><AlertTriangle size={13} /> {ticket.first_response_breached ? 'First response breached' : 'Resolution breached'}</p>}<p className="mt-2 text-xs text-slate-500">SLA {ticket.sla_name || '—'} · messages {ticket.message_count || 0} · resolution due {dt(ticket.resolution_due_at)}</p>{context && !['closed','cancelled'].includes(ticket.status) && <div className="mt-3 flex flex-wrap items-center gap-2"><select className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs" value={ticket.assigned_employee_id || ''} onChange={(e) => { if (e.target.value) void execute(`assign-${ticket.id}`, () => assignHelpdeskTicket(ticket.id, Number(e.target.value)), 'Ticket assigned'); }}><option value="">Assign agent</option>{context.employees.map((row) => <option key={row.id} value={row.id}>{row.employee_id} · {row.name}</option>)}</select>{transitions[ticket.status].map((target) => <button key={target} disabled={working !== null} onClick={() => changeStatus(ticket, target, false)} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-300">{target}</button>)}<button onClick={() => void openConversation(ticket, false)} className="inline-flex items-center gap-1 rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-bold text-white"><MessageSquare size={13} /> Conversation</button></div>}</div>)}</div></section>}

    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-3"><UserCheck className="text-cyan-400" /><div><h2 className="font-black">Agent Self Queue</h2><p className="text-sm text-slate-400">Assigned-only tickets; conversation read/reply tidak membutuhkan manager read.</p></div></div>{selfEmployee ? <><p className="mt-3 text-sm text-slate-500">{selfEmployee.employee_id} · {selfEmployee.name}</p><div className="mt-4 grid gap-3 xl:grid-cols-2">{selfTickets.map((ticket) => <div key={ticket.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex justify-between gap-2"><div><p className="font-bold">{ticket.code} · {ticket.subject}</p><p className="text-sm text-slate-400">{ticket.customer_name || 'Requester'} · {ticket.priority}</p></div><span className={`h-fit rounded-full px-2 py-1 text-xs font-bold uppercase ${statusClass(ticket.status)}`}>{ticket.status}</span></div><div className="mt-3 flex flex-wrap gap-2">{(selfTransitions[ticket.status] || []).map((target) => <button key={target} disabled={working !== null} onClick={() => changeStatus(ticket, target, true)} className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-300">{target}</button>)}{!['resolved','closed','cancelled'].includes(ticket.status) && <button onClick={() => void openConversation(ticket, true)} className="inline-flex items-center gap-1 rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-bold text-white"><MessageSquare size={13} /> Reply</button>}</div></div>)}{selfTickets.length === 0 && <p className="text-sm text-slate-500">Tidak ada ticket assignment.</p>}</div></> : <p className="mt-4 text-sm text-slate-500">Helpdesk self-service tidak tersedia untuk akun ini.</p>}</section>

    {conversation && <section className="rounded-2xl border border-cyan-800/60 bg-slate-900 p-5"><div className="flex justify-between gap-3"><div><h2 className="font-black">Conversation · {conversation.ticket.code}</h2><p className="text-sm text-slate-400">{conversation.ticket.subject}</p></div><button onClick={() => setConversation(null)}><XCircle /></button></div><div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3">{messages.map((msg) => <div key={msg.id} className={`rounded-xl p-3 text-sm ${msg.visibility === 'internal' ? 'bg-amber-950/40 text-amber-100' : msg.direction === 'inbound' ? 'bg-slate-800' : 'bg-cyan-950/50'}`}><div className="flex justify-between gap-2 text-xs text-slate-500"><span>{msg.employee_name || msg.author_name || msg.direction}</span><span>{dt(msg.created_at)}</span></div><p className="mt-1">{msg.body}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">{msg.direction} · {msg.visibility}</p></div>)}{messages.length === 0 && <p className="text-sm text-slate-500">Belum ada message.</p>}</div><form onSubmit={sendMessage} className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]"><input className={inputClass} value={messageForm.body} onChange={(e) => setMessageForm({ ...messageForm, body: e.target.value })} placeholder="Tulis message…" /><select className={inputClass} value={messageForm.visibility} onChange={(e) => setMessageForm({ ...messageForm, visibility: e.target.value as HelpdeskMessage['visibility'] })}><option value="public">Public</option><option value="internal">Internal</option></select><button disabled={working === 'message'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 font-bold text-slate-950"><Send size={16} /> Send</button></form>{!conversation.self && events.length > 0 && <div className="mt-5 border-t border-slate-800 pt-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Lifecycle audit</p><div className="mt-2 flex flex-wrap gap-2">{events.slice(-8).map((event) => <span key={event.id} className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-400">{event.event_type} · {dt(event.occurred_at || event.created_at)}</span>)}</div></div>}</section>}
  </div>;
}
