import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Plus, RefreshCw, ShieldCheck, WalletCards, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  cancelMyLeaveRequest,
  createLeaveAllocation,
  createLeaveType,
  decideLeaveRequest,
  getLeaveAllocations,
  getLeaveRequests,
  getLeaveTypes,
  getMyLeave,
  requestLeave,
  workforceErrorMessage,
  type LeaveAllocation,
  type LeaveRequest,
  type LeaveType,
  type MyLeaveState,
  type WorkforceEmployee,
} from '../../services/workforceService';

interface Props {
  employees: WorkforceEmployee[];
}

const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-cyan-500';
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value)) : '—';
const numberValue = (value?: number | string | null) => Number(value || 0);

export default function TimeOffPanel({ employees }: Props) {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [mine, setMine] = useState<MyLeaveState | null>(null);
  const [managerRequests, setManagerRequests] = useState<LeaveRequest[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [managerVisible, setManagerVisible] = useState(false);
  const [requestForm, setRequestForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [typeForm, setTypeForm] = useState({ code: '', name: '', trackBalance: true, allowNegative: false });
  const [allocationForm, setAllocationForm] = useState({ employeeId: '', leaveTypeId: '', allocatedDays: '12', periodStart: '', periodEnd: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [typesResult, mineResult, requestsResult, allocationsResult] = await Promise.allSettled([
      getLeaveTypes(), getMyLeave(), getLeaveRequests(), getLeaveAllocations(),
    ]);

    const nextTypes = typesResult.status === 'fulfilled' ? typesResult.value : [];
    setTypes(nextTypes);
    setRequestForm((current) => ({ ...current, leaveTypeId: current.leaveTypeId || String(nextTypes[0]?.id || '') }));
    setAllocationForm((current) => ({ ...current, leaveTypeId: current.leaveTypeId || String(nextTypes.find((row) => row.track_balance)?.id || '') }));

    if (mineResult.status === 'fulfilled') setMine(mineResult.value); else setMine(null);
    if (requestsResult.status === 'fulfilled' && allocationsResult.status === 'fulfilled') {
      setManagerRequests(requestsResult.value);
      setAllocations(allocationsResult.value);
      setManagerVisible(true);
    } else {
      setManagerRequests([]);
      setAllocations([]);
      setManagerVisible(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pendingMine = useMemo(() => mine?.requests.filter((row) => row.status === 'pending').length || 0, [mine]);
  const pendingManager = useMemo(() => managerRequests.filter((row) => row.status === 'pending'), [managerRequests]);

  const execute = async (key: string, action: () => Promise<unknown>, success: string) => {
    setWorking(key);
    try {
      await action();
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(workforceErrorMessage(error, 'Aksi Time Off gagal'));
    } finally {
      setWorking(null);
    }
  };

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requestForm.leaveTypeId || !requestForm.startDate || !requestForm.endDate) return toast.error('Tipe dan periode cuti wajib diisi');
    await execute('request', () => requestLeave({
      leaveTypeId: Number(requestForm.leaveTypeId),
      startDate: requestForm.startDate,
      endDate: requestForm.endDate,
      reason: requestForm.reason || undefined,
    }), 'Request cuti dibuat');
    setRequestForm((current) => ({ ...current, startDate: '', endDate: '', reason: '' }));
  };

  const submitType = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!typeForm.code.trim() || !typeForm.name.trim()) return toast.error('Code dan nama leave type wajib diisi');
    await execute('type', () => createLeaveType({
      code: typeForm.code,
      name: typeForm.name,
      trackBalance: typeForm.trackBalance,
      allowNegative: typeForm.allowNegative,
    }), 'Leave type dibuat');
    setTypeForm({ code: '', name: '', trackBalance: true, allowNegative: false });
  };

  const submitAllocation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!allocationForm.employeeId || !allocationForm.leaveTypeId || !allocationForm.periodStart || !allocationForm.periodEnd) return toast.error('Employee, leave type, dan periode allocation wajib diisi');
    await execute('allocation', () => createLeaveAllocation({
      employeeId: Number(allocationForm.employeeId),
      leaveTypeId: Number(allocationForm.leaveTypeId),
      allocatedDays: Number(allocationForm.allocatedDays),
      periodStart: allocationForm.periodStart,
      periodEnd: allocationForm.periodEnd,
      notes: allocationForm.notes || undefined,
    }), 'Allocation cuti dibuat');
    setAllocationForm((current) => ({ ...current, employeeId: '', notes: '' }));
  };

  if (loading) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Memuat Time Off…</div>;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3"><CalendarDays className="text-cyan-400" /><div><h2 className="font-black">Time Off Saya</h2><p className="text-sm text-slate-400">Saldo, reservation, approval dan cancellation memakai ledger allocation yang sama.</p></div></div>
            <button onClick={() => void load()} className="rounded-xl border border-slate-700 p-2 hover:bg-slate-800" aria-label="Refresh Time Off"><RefreshCw size={17} /></button>
          </div>

          {mine ? <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {mine.allocations.map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{row.leave_type_code}</p>
                <p className="mt-1 font-bold">{row.leave_type_name}</p>
                <p className="mt-3 text-3xl font-black text-cyan-300">{numberValue(row.available_days)}</p>
                <p className="text-xs text-slate-500">hari tersedia · {formatDate(row.period_end)} berakhir</p>
                <p className="mt-2 text-xs text-slate-500">alokasi {numberValue(row.allocated_days)} · reserved {numberValue(row.reserved_days)} · terpakai {numberValue(row.used_days)}</p>
              </div>)}
              {mine.allocations.length === 0 && <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">Belum ada allocation aktif. Tipe cuti tanpa balance tetap dapat diminta jika tersedia.</div>}
            </div>

            <form onSubmit={submitRequest} className="mt-5 grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-2">
              <div className="md:col-span-2"><p className="font-bold">Ajukan cuti</p><p className="text-xs text-slate-500">Hari dihitung inklusif sesuai backend saat ini.</p></div>
              <select className={inputClass} value={requestForm.leaveTypeId} onChange={(e) => setRequestForm({ ...requestForm, leaveTypeId: e.target.value })}><option value="">Pilih tipe cuti</option>{types.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select>
              <input className={inputClass} type="text" value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} placeholder="Alasan (opsional)" />
              <input className={inputClass} type="date" value={requestForm.startDate} onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })} />
              <input className={inputClass} type="date" value={requestForm.endDate} onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })} />
              <button disabled={working === 'request'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 font-bold text-slate-950 disabled:opacity-50 md:col-span-2"><Plus size={17} /> Kirim request</button>
            </form>
          </> : <div className="mt-5 rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">Self-service Time Off tidak tersedia untuk akun ini atau user belum terhubung ke employee aktif.</div>}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3"><WalletCards className="text-violet-400" /><div><h2 className="font-black">Riwayat Saya</h2><p className="text-sm text-slate-400">{pendingMine} request masih pending.</p></div></div>
          <div className="mt-4 space-y-3">
            {mine?.requests.map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold">{row.leave_type_name || row.leave_type_code}</p><p className="text-sm text-slate-400">{formatDate(row.start_date)} – {formatDate(row.end_date)} · {numberValue(row.requested_days)} hari</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${row.status === 'approved' ? 'bg-emerald-950 text-emerald-300' : row.status === 'pending' ? 'bg-amber-950 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>{row.status}</span></div>
              {row.reason && <p className="mt-2 text-sm text-slate-400">{row.reason}</p>}
              {row.decision_note && <p className="mt-2 text-xs text-slate-500">Catatan: {row.decision_note}</p>}
              {row.status === 'pending' && <button disabled={working === `cancel-${row.id}`} onClick={() => void execute(`cancel-${row.id}`, () => cancelMyLeaveRequest(row.id), 'Request cuti dibatalkan')} className="mt-3 rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-950/40 disabled:opacity-50">Batalkan request</button>}
            </div>)}
            {(!mine || mine.requests.length === 0) && <p className="text-sm text-slate-500">Belum ada riwayat cuti.</p>}
          </div>
        </div>
      </section>

      {managerVisible && <>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3"><ShieldCheck className="text-emerald-400" /><div><h2 className="font-black">Approval Queue</h2><p className="text-sm text-slate-400">{pendingManager.length} request menunggu keputusan HR/manager.</p></div></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {pendingManager.map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="font-bold">{row.employee_name} <span className="text-xs font-normal text-slate-500">{row.employee_code}</span></p>
              <p className="text-sm text-slate-400">{row.leave_type_name} · {formatDate(row.start_date)} – {formatDate(row.end_date)} · {numberValue(row.requested_days)} hari</p>
              {row.reason && <p className="mt-2 text-sm text-slate-300">{row.reason}</p>}
              <div className="mt-3 flex gap-2"><button disabled={working !== null} onClick={() => void execute(`approve-${row.id}`, () => decideLeaveRequest(row.id, 'approved'), 'Cuti disetujui')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 size={14} /> Setujui</button><button disabled={working !== null} onClick={() => { const note = window.prompt('Catatan penolakan (opsional)') || undefined; void execute(`reject-${row.id}`, () => decideLeaveRequest(row.id, 'rejected', note), 'Cuti ditolak'); }} className="inline-flex items-center gap-1 rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300 disabled:opacity-50"><XCircle size={14} /> Tolak</button></div>
            </div>)}
            {pendingManager.length === 0 && <p className="text-sm text-slate-500">Tidak ada approval pending.</p>}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={submitType} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-black">Setup Leave Type</h2><p className="text-sm text-slate-400">Definisi tenant-scoped untuk cuti tracked maupun untracked.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><input className={inputClass} value={typeForm.code} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })} placeholder="Code, mis. ANNUAL" /><input className={inputClass} value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="Nama cuti" /></div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={typeForm.trackBalance} onChange={(e) => setTypeForm({ ...typeForm, trackBalance: e.target.checked })} /> Track balance</label><label className="flex items-center gap-2"><input type="checkbox" checked={typeForm.allowNegative} onChange={(e) => setTypeForm({ ...typeForm, allowNegative: e.target.checked })} /> Allow negative</label></div>
            <button disabled={working === 'type'} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Buat leave type</button>
          </form>

          <form onSubmit={submitAllocation} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-black">Allocate Balance</h2><p className="text-sm text-slate-400">Overlap employee/type/periode ditolak secara transaksional.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><select className={inputClass} value={allocationForm.employeeId} onChange={(e) => setAllocationForm({ ...allocationForm, employeeId: e.target.value })}><option value="">Pilih employee</option>{employees.map((row) => <option key={row.id} value={row.id}>{row.employee_id} · {row.name}</option>)}</select><select className={inputClass} value={allocationForm.leaveTypeId} onChange={(e) => setAllocationForm({ ...allocationForm, leaveTypeId: e.target.value })}><option value="">Pilih leave type</option>{types.filter((row) => row.track_balance).map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select><input className={inputClass} type="number" min="0" step="0.5" value={allocationForm.allocatedDays} onChange={(e) => setAllocationForm({ ...allocationForm, allocatedDays: e.target.value })} placeholder="Hari" /><input className={inputClass} value={allocationForm.notes} onChange={(e) => setAllocationForm({ ...allocationForm, notes: e.target.value })} placeholder="Catatan" /><input className={inputClass} type="date" value={allocationForm.periodStart} onChange={(e) => setAllocationForm({ ...allocationForm, periodStart: e.target.value })} /><input className={inputClass} type="date" value={allocationForm.periodEnd} onChange={(e) => setAllocationForm({ ...allocationForm, periodEnd: e.target.value })} /></div>
            <button disabled={working === 'allocation' || employees.length === 0} className="mt-4 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">Buat allocation</button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-black">Allocation Monitor</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Employee</th><th>Type</th><th>Periode</th><th>Allocated</th><th>Reserved</th><th>Used</th><th>Available</th></tr></thead><tbody>{allocations.map((row) => <tr key={row.id} className="border-t border-slate-800"><td className="py-3 font-semibold">{row.employee_name}<div className="text-xs text-slate-500">{row.employee_code}</div></td><td>{row.leave_type_code}</td><td>{formatDate(row.period_start)} – {formatDate(row.period_end)}</td><td>{numberValue(row.allocated_days)}</td><td>{numberValue(row.reserved_days)}</td><td>{numberValue(row.used_days)}</td><td className="font-bold text-cyan-300">{numberValue(row.available_days)}</td></tr>)}</tbody></table></div>
        </section>
      </>}
    </div>
  );
}
