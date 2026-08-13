import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Banknote, CalendarDays, Clock3, FolderKanban, LogIn, LogOut, RefreshCw, Star, UserSearch, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  clockIn,
  clockOut,
  getAttendanceSessions,
  getEmployeeDirectory,
  getMyAttendance,
  getWorkforceOutlets,
  workforceErrorMessage,
  type AttendanceSession,
  type WorkforceEmployee,
  type WorkforceOutlet,
} from '../services/workforceService';
import TimeOffPanel from './workforce/TimeOffPanel';
import RecruitmentPanel from './workforce/RecruitmentPanel';
import AppraisalsPanel from './workforce/AppraisalsPanel';
import ServicesProjectPanel from './workforce/ServicesProjectPanel';
import PayrollCurrentPanel from './workforce/PayrollCurrentPanel';

type WorkforceTab = 'attendance' | 'leave' | 'recruitment' | 'appraisals' | 'services' | 'payroll';

const dt = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const duration = (minutes?: number | null) => minutes === null || minutes === undefined ? 'Sedang bekerja' : `${Math.floor(minutes / 60)}j ${minutes % 60}m`;

export default function WorkforceWorkspacePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<WorkforceTab>('attendance');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [me, setMe] = useState<{ employee: WorkforceEmployee; sessions: AttendanceSession[]; openSession: AttendanceSession | null } | null>(null);
  const [outlets, setOutlets] = useState<WorkforceOutlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<number>(0);
  const [employees, setEmployees] = useState<WorkforceEmployee[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [managerView, setManagerView] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [myResult, outletResult, employeeResult, attendanceResult] = await Promise.allSettled([
      getMyAttendance(), getWorkforceOutlets(), getEmployeeDirectory(), getAttendanceSessions(),
    ]);
    if (myResult.status === 'fulfilled') setMe(myResult.value); else setMe(null);
    if (outletResult.status === 'fulfilled') {
      setOutlets(outletResult.value);
      setSelectedOutlet((current) => current || outletResult.value[0]?.id || 0);
    }
    if (employeeResult.status === 'fulfilled') setEmployees(employeeResult.value); else setEmployees([]);
    if (employeeResult.status === 'fulfilled' && attendanceResult.status === 'fulfilled') {
      setSessions(attendanceResult.value);
      setManagerView(true);
    } else {
      setSessions([]);
      setManagerView(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const todaySessions = useMemo(() => {
    const todayDate = new Date().toDateString();
    return sessions.filter((row) => new Date(row.clock_in_at).toDateString() === todayDate);
  }, [sessions]);

  const activeToday = useMemo(() => todaySessions.filter((row) => row.status === 'open' && !row.clock_out_at).length, [todaySessions]);

  const handleClockIn = async () => {
    if (!selectedOutlet) return toast.error('Pilih outlet untuk clock-in');
    setWorking(true);
    try {
      await clockIn(selectedOutlet);
      toast.success('Clock-in berhasil');
      await load();
    } catch (error) {
      toast.error(workforceErrorMessage(error, 'Clock-in gagal'));
    } finally { setWorking(false); }
  };

  const handleClockOut = async () => {
    setWorking(true);
    try {
      await clockOut();
      toast.success('Clock-out berhasil');
      await load();
    } catch (error) {
      toast.error(workforceErrorMessage(error, 'Clock-out gagal'));
    } finally { setWorking(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95 px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/module-selector')} className="rounded-xl border border-slate-700 p-2 hover:bg-slate-800" aria-label="Back"><ArrowLeft size={18} /></button>
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">P2 Workforce & Services</p><h1 className="text-xl font-black">People, Service & Payroll Operations</h1><p className="hidden text-xs text-slate-500 md:block">Attendance · Time Off · Recruitment · Appraisals · Services · Current-law Payroll</p></div>
          </div>
          {tab === 'attendance' && <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-slate-700 p-2 hover:bg-slate-800"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2 md:grid-cols-3 xl:grid-cols-6" aria-label="Workforce, Services and Payroll sections">
          <button onClick={() => setTab('attendance')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${tab === 'attendance' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Clock3 size={17} /> Attendance</button>
          <button onClick={() => setTab('leave')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${tab === 'leave' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><CalendarDays size={17} /> Time Off</button>
          <button onClick={() => setTab('recruitment')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${tab === 'recruitment' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><UserSearch size={17} /> Recruitment</button>
          <button onClick={() => setTab('appraisals')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${tab === 'appraisals' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Star size={17} /> Appraisals</button>
          <button onClick={() => setTab('services')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${tab === 'services' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><FolderKanban size={17} /> Services</button>
          <button onClick={() => setTab('payroll')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${tab === 'payroll' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Banknote size={17} /> Payroll</button>
        </nav>

        {tab === 'attendance' && <>
          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center gap-3"><Clock3 className="text-cyan-400" /><div><h2 className="font-black">Absensi Saya</h2><p className="text-sm text-slate-400">Satu sesi aktif per employee. Clock-out dikunci transaksional.</p></div></div>
              {loading ? <p className="mt-6 text-slate-400">Memuat attendance…</p> : me ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="font-bold">{me.employee.name}</p><p className="text-sm text-slate-400">{me.employee.employee_id} · {me.employee.department || 'Tanpa departemen'} · {me.employee.position || 'Tanpa posisi'}</p></div>
                  {me.openSession ? (
                    <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4"><p className="text-sm font-bold text-emerald-300">SEDANG CLOCK-IN</p><p className="mt-1 text-sm">{me.openSession.outlet_name || `Outlet ${me.openSession.outlet_id}`} · sejak {dt(me.openSession.clock_in_at)}</p><button disabled={working} onClick={handleClockOut} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 font-bold text-white disabled:opacity-50"><LogOut size={17} /> Clock-out</button></div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row"><select value={selectedOutlet} onChange={(e) => setSelectedOutlet(Number(e.target.value))} className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"><option value={0}>Pilih outlet</option>{outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}</select><button disabled={working || !selectedOutlet} onClick={handleClockIn} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 font-bold text-slate-950 disabled:opacity-50"><LogIn size={17} /> Clock-in</button></div>
                  )}
                  <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Riwayat terakhir</p>{me.sessions.slice(0, 5).map((row) => <div key={row.id} className="flex justify-between border-t border-slate-800 py-2 text-sm"><span>{row.outlet_name || `Outlet ${row.outlet_id}`} · {dt(row.clock_in_at)}</span><span className="text-slate-400">{duration(row.duration_minutes)}</span></div>)}</div>
                </div>
              ) : <div className="mt-5 rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">Akun login belum terhubung ke employee aktif atau tidak memiliki attendance self-service.</div>}
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><Users className="text-violet-400" /><p className="mt-4 text-3xl font-black">{managerView ? employees.length : '—'}</p><p className="text-sm text-slate-400">Employee terlihat</p></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><LogIn className="text-emerald-400" /><p className="mt-4 text-3xl font-black">{managerView ? activeToday : '—'}</p><p className="text-sm text-slate-400">Aktif hari ini</p></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><Clock3 className="text-cyan-400" /><p className="mt-4 text-3xl font-black">{managerView ? todaySessions.length : '—'}</p><p className="text-sm text-slate-400">Sesi hari ini</p></div>
            </div>
          </section>

          {managerView && <>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-black">Employee Directory</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Employee</th><th>Department</th><th>Position</th><th>User</th><th>Status</th></tr></thead><tbody>{employees.map((row) => <tr key={row.id} className="border-t border-slate-800"><td className="py-3 font-semibold">{row.name}<div className="text-xs text-slate-500">{row.employee_id}</div></td><td>{row.department || '—'}</td><td>{row.position || '—'}</td><td>{row.users?.email || 'Belum linked'}</td><td>{row.status || '—'}</td></tr>)}</tbody></table></div></section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-black">Attendance Monitor</h2><div className="mt-4 space-y-2">{sessions.slice(0, 30).map((row) => <div key={row.id} className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm sm:grid-cols-[1.2fr_1fr_1fr_auto]"><div><p className="font-bold">{row.employee_name || row.employee_code}</p><p className="text-xs text-slate-500">{row.department || '—'}</p></div><div>{row.outlet_name || `Outlet ${row.outlet_id}`}</div><div><p>{dt(row.clock_in_at)}</p><p className="text-xs text-slate-500">{row.clock_out_at ? `out ${dt(row.clock_out_at)}` : 'belum clock-out'}</p></div><span className={row.status === 'open' ? 'font-bold text-emerald-400' : 'text-slate-400'}>{duration(row.duration_minutes)}</span></div>)}</div></section>
          </>}
        </>}

        {tab === 'leave' && <TimeOffPanel employees={employees} />}
        {tab === 'recruitment' && <RecruitmentPanel employees={employees} />}
        {tab === 'appraisals' && <AppraisalsPanel employees={employees} />}
        {tab === 'services' && <ServicesProjectPanel employees={employees} />}
        {tab === 'payroll' && <PayrollCurrentPanel />}
      </main>
    </div>
  );
}
