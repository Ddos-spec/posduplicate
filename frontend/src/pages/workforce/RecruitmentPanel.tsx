import { useCallback, useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarClock, CheckCircle2, RefreshCw, Send, UserPlus, UsersRound, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  cancelRecruitmentInterview,
  completeRecruitmentInterview,
  createRecruitmentApplicant,
  createRecruitmentOffer,
  createRecruitmentVacancy,
  getRecruitmentApplicants,
  getRecruitmentInterviews,
  getRecruitmentOffers,
  getRecruitmentVacancies,
  hireRecruitmentApplicant,
  moveRecruitmentApplicantStage,
  scheduleRecruitmentInterview,
  updateRecruitmentOfferStatus,
  updateRecruitmentVacancyStatus,
  workforceErrorMessage,
  type RecruitmentApplicant,
  type RecruitmentInterview,
  type RecruitmentOffer,
  type RecruitmentVacancy,
  type WorkforceEmployee,
} from '../../services/workforceService';

interface Props {
  employees: WorkforceEmployee[];
}

type ApplicantAction = { kind: 'interview' | 'offer' | 'hire'; applicant: RecruitmentApplicant };

const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-cyan-500';
const money = (value?: number | string | null) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
const dt = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const today = () => new Date().toISOString().slice(0, 10);

const stageClass = (stage: RecruitmentApplicant['stage']) => {
  if (stage === 'hired') return 'bg-emerald-950 text-emerald-300';
  if (stage === 'rejected' || stage === 'withdrawn') return 'bg-rose-950 text-rose-300';
  if (stage === 'offer') return 'bg-violet-950 text-violet-300';
  if (stage === 'interview') return 'bg-cyan-950 text-cyan-300';
  return 'bg-amber-950 text-amber-300';
};

export default function RecruitmentPanel({ employees }: Props) {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(true);
  const [vacancies, setVacancies] = useState<RecruitmentVacancy[]>([]);
  const [applicants, setApplicants] = useState<RecruitmentApplicant[]>([]);
  const [interviews, setInterviews] = useState<RecruitmentInterview[]>([]);
  const [offers, setOffers] = useState<RecruitmentOffer[]>([]);
  const [vacancyForm, setVacancyForm] = useState({ code: '', title: '', department: '', employmentType: 'full_time', headcount: '1', description: '', targetStartDate: '' });
  const [applicantForm, setApplicantForm] = useState({ vacancyId: '', name: '', email: '', phone: '', source: '', expectedSalary: '' });
  const [action, setAction] = useState<ApplicantAction | null>(null);
  const [actionForm, setActionForm] = useState({ scheduledAt: '', durationMinutes: '60', interviewerUserId: '', offeredSalary: '', startDate: '', notes: '', employeeId: '', userId: '', basicSalary: '', joinDate: today(), department: '', position: '' });

  const linkedUsers = useMemo(() => employees.filter((row) => row.users?.id && row.users.is_active !== false), [employees]);
  const openVacancies = useMemo(() => vacancies.filter((row) => row.status === 'open'), [vacancies]);
  const latestOfferByApplicant = useMemo(() => {
    const map = new Map<number, RecruitmentOffer>();
    for (const offer of offers) if (!map.has(offer.applicant_id)) map.set(offer.applicant_id, offer);
    return map;
  }, [offers]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await Promise.allSettled([
      getRecruitmentVacancies(), getRecruitmentApplicants(), getRecruitmentInterviews(), getRecruitmentOffers(),
    ]);
    const allAllowed = result.every((row) => row.status === 'fulfilled');
    setAuthorized(allAllowed);
    setVacancies(result[0].status === 'fulfilled' ? result[0].value : []);
    setApplicants(result[1].status === 'fulfilled' ? result[1].value : []);
    setInterviews(result[2].status === 'fulfilled' ? result[2].value : []);
    setOffers(result[3].status === 'fulfilled' ? result[3].value : []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (openVacancies.length) setApplicantForm((current) => ({ ...current, vacancyId: current.vacancyId || String(openVacancies[0].id) }));
  }, [openVacancies]);

  const execute = async (key: string, work: () => Promise<unknown>, success: string) => {
    setWorking(key);
    try {
      await work();
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(workforceErrorMessage(error, 'Aksi recruitment gagal'));
    } finally {
      setWorking(null);
    }
  };

  const submitVacancy = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!vacancyForm.code.trim() || !vacancyForm.title.trim()) return toast.error('Code dan title vacancy wajib diisi');
    await execute('new-vacancy', () => createRecruitmentVacancy({
      code: vacancyForm.code,
      title: vacancyForm.title,
      department: vacancyForm.department || undefined,
      employmentType: vacancyForm.employmentType,
      headcount: Number(vacancyForm.headcount),
      description: vacancyForm.description || undefined,
      targetStartDate: vacancyForm.targetStartDate || undefined,
    }), 'Vacancy dibuat');
    setVacancyForm({ code: '', title: '', department: '', employmentType: 'full_time', headcount: '1', description: '', targetStartDate: '' });
  };

  const submitApplicant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!applicantForm.vacancyId || !applicantForm.name.trim()) return toast.error('Vacancy dan nama kandidat wajib diisi');
    await execute('new-applicant', () => createRecruitmentApplicant({
      vacancyId: Number(applicantForm.vacancyId),
      name: applicantForm.name,
      email: applicantForm.email || undefined,
      phone: applicantForm.phone || undefined,
      source: applicantForm.source || undefined,
      expectedSalary: applicantForm.expectedSalary ? Number(applicantForm.expectedSalary) : undefined,
    }), 'Kandidat ditambahkan');
    setApplicantForm((current) => ({ ...current, name: '', email: '', phone: '', source: '', expectedSalary: '' }));
  };

  const openApplicantAction = (kind: ApplicantAction['kind'], applicant: RecruitmentApplicant) => {
    const latestOffer = latestOfferByApplicant.get(applicant.id);
    setAction({ kind, applicant });
    setActionForm({
      scheduledAt: '', durationMinutes: '60', interviewerUserId: '',
      offeredSalary: String(latestOffer?.offered_salary || applicant.expected_salary || ''), startDate: '', notes: '',
      employeeId: '', userId: '', basicSalary: String(latestOffer?.offered_salary || applicant.expected_salary || ''), joinDate: today(),
      department: applicant.department || '', position: applicant.vacancy_title || '',
    });
  };

  const submitApplicantAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!action) return;
    const applicant = action.applicant;
    if (action.kind === 'interview') {
      if (!actionForm.scheduledAt) return toast.error('Waktu interview wajib diisi');
      await execute(`interview-${applicant.id}`, () => scheduleRecruitmentInterview(applicant.id, {
        scheduledAt: new Date(actionForm.scheduledAt).toISOString(),
        durationMinutes: Number(actionForm.durationMinutes),
        interviewerUserId: actionForm.interviewerUserId ? Number(actionForm.interviewerUserId) : undefined,
      }), 'Interview dijadwalkan');
    }
    if (action.kind === 'offer') {
      if (!actionForm.offeredSalary) return toast.error('Nilai offer wajib diisi');
      await execute(`offer-${applicant.id}`, () => createRecruitmentOffer(applicant.id, {
        offeredSalary: Number(actionForm.offeredSalary), startDate: actionForm.startDate || undefined, notes: actionForm.notes || undefined,
      }), 'Draft offer dibuat');
    }
    if (action.kind === 'hire') {
      if (!actionForm.employeeId.trim()) return toast.error('Employee ID wajib diisi');
      await execute(`hire-${applicant.id}`, () => hireRecruitmentApplicant(applicant.id, {
        employeeId: actionForm.employeeId,
        userId: actionForm.userId ? Number(actionForm.userId) : undefined,
        basicSalary: actionForm.basicSalary ? Number(actionForm.basicSalary) : undefined,
        joinDate: actionForm.joinDate || undefined,
        department: actionForm.department || undefined,
        position: actionForm.position || undefined,
      }), 'Kandidat di-hire menjadi employee');
    }
    setAction(null);
  };

  if (loading) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Memuat Recruitment…</div>;
  if (!authorized) return <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-5 text-sm text-amber-200">Akun ini tidak memiliki capability Recruitment. Self-service employee tetap tersedia pada tab Workforce lain.</div>;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><BriefcaseBusiness className="text-cyan-400" /><div><h2 className="font-black">Vacancies</h2><p className="text-sm text-slate-400">Draft → open → paused/closed dengan row-locked lifecycle.</p></div></div><button onClick={() => void load()} className="rounded-xl border border-slate-700 p-2 hover:bg-slate-800" aria-label="Refresh recruitment"><RefreshCw size={17} /></button></div>
          <div className="mt-4 space-y-3">{vacancies.map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold">{row.code} · {row.title}</p><p className="text-sm text-slate-400">{row.department || 'Tanpa departemen'} · {row.employment_type} · target {row.headcount}</p></div><span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-bold uppercase">{row.status}</span></div>
            <p className="mt-2 text-xs text-slate-500">Applicant {row.applicant_count || 0} · hired {row.hired_count || 0}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {row.status === 'draft' && <button disabled={working !== null} onClick={() => void execute(`vac-open-${row.id}`, () => updateRecruitmentVacancyStatus(row.id, 'open'), 'Vacancy dibuka')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Open</button>}
              {row.status === 'open' && <button disabled={working !== null} onClick={() => void execute(`vac-pause-${row.id}`, () => updateRecruitmentVacancyStatus(row.id, 'paused'), 'Vacancy dipause')} className="rounded-lg border border-amber-700 px-3 py-1.5 text-xs font-bold text-amber-300">Pause</button>}
              {row.status === 'paused' && <button disabled={working !== null} onClick={() => void execute(`vac-reopen-${row.id}`, () => updateRecruitmentVacancyStatus(row.id, 'open'), 'Vacancy dibuka kembali')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Re-open</button>}
              {row.status !== 'closed' && <button disabled={working !== null} onClick={() => void execute(`vac-close-${row.id}`, () => updateRecruitmentVacancyStatus(row.id, 'closed'), 'Vacancy ditutup')} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300">Close</button>}
            </div>
          </div>)}{vacancies.length === 0 && <p className="text-sm text-slate-500">Belum ada vacancy.</p>}</div>
        </div>

        <form onSubmit={submitVacancy} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3"><UserPlus className="text-violet-400" /><div><h2 className="font-black">Buat Vacancy</h2><p className="text-sm text-slate-400">Mulai sebagai draft, lalu open saat siap menerima kandidat.</p></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><input className={inputClass} value={vacancyForm.code} onChange={(e) => setVacancyForm({ ...vacancyForm, code: e.target.value })} placeholder="Code" /><input className={inputClass} value={vacancyForm.title} onChange={(e) => setVacancyForm({ ...vacancyForm, title: e.target.value })} placeholder="Posisi" /><input className={inputClass} value={vacancyForm.department} onChange={(e) => setVacancyForm({ ...vacancyForm, department: e.target.value })} placeholder="Departemen" /><select className={inputClass} value={vacancyForm.employmentType} onChange={(e) => setVacancyForm({ ...vacancyForm, employmentType: e.target.value })}><option value="full_time">Full time</option><option value="part_time">Part time</option><option value="contract">Contract</option><option value="internship">Internship</option><option value="temporary">Temporary</option></select><input className={inputClass} type="number" min="1" value={vacancyForm.headcount} onChange={(e) => setVacancyForm({ ...vacancyForm, headcount: e.target.value })} placeholder="Headcount" /><input className={inputClass} type="date" value={vacancyForm.targetStartDate} onChange={(e) => setVacancyForm({ ...vacancyForm, targetStartDate: e.target.value })} /><textarea className={`${inputClass} sm:col-span-2`} rows={3} value={vacancyForm.description} onChange={(e) => setVacancyForm({ ...vacancyForm, description: e.target.value })} placeholder="Deskripsi" /></div>
          <button disabled={working === 'new-vacancy'} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Buat vacancy</button>
        </form>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={submitApplicant} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3"><UsersRound className="text-cyan-400" /><div><h2 className="font-black">Tambah Kandidat</h2><p className="text-sm text-slate-400">Hanya vacancy open yang menerima applicant baru.</p></div></div>
          <div className="mt-4 grid gap-3"><select className={inputClass} value={applicantForm.vacancyId} onChange={(e) => setApplicantForm({ ...applicantForm, vacancyId: e.target.value })}><option value="">Pilih vacancy open</option>{openVacancies.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.title}</option>)}</select><input className={inputClass} value={applicantForm.name} onChange={(e) => setApplicantForm({ ...applicantForm, name: e.target.value })} placeholder="Nama kandidat" /><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} type="email" value={applicantForm.email} onChange={(e) => setApplicantForm({ ...applicantForm, email: e.target.value })} placeholder="Email" /><input className={inputClass} value={applicantForm.phone} onChange={(e) => setApplicantForm({ ...applicantForm, phone: e.target.value })} placeholder="Telepon" /><input className={inputClass} value={applicantForm.source} onChange={(e) => setApplicantForm({ ...applicantForm, source: e.target.value })} placeholder="Source" /><input className={inputClass} type="number" min="0" value={applicantForm.expectedSalary} onChange={(e) => setApplicantForm({ ...applicantForm, expectedSalary: e.target.value })} placeholder="Expected salary" /></div></div>
          <button disabled={working === 'new-applicant' || openVacancies.length === 0} className="mt-4 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">Tambah kandidat</button>
        </form>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-black">Applicant Pipeline</h2><p className="text-sm text-slate-400">Interview, offer, dan hire hanya lewat dedicated action.</p>
          <div className="mt-4 space-y-3">{applicants.map((row) => {
            const latestOffer = latestOfferByApplicant.get(row.id);
            return <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold">{row.applicant_name}</p><p className="text-sm text-slate-400">{row.vacancy_code} · {row.vacancy_title} · {row.email || row.phone || 'tanpa kontak'}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${stageClass(row.stage)}`}>{row.stage}</span></div>
              {row.expected_salary != null && <p className="mt-2 text-xs text-slate-500">Expected {money(row.expected_salary)}</p>}
              {latestOffer && <p className="mt-1 text-xs text-violet-300">Latest offer v{latestOffer.version}: {money(latestOffer.offered_salary)} · {latestOffer.status}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {row.stage === 'applied' && <button disabled={working !== null} onClick={() => void execute(`screen-${row.id}`, () => moveRecruitmentApplicantStage(row.id, 'screening'), 'Kandidat masuk screening')} className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-bold text-white">Screening</button>}
                {['screening', 'interview'].includes(row.stage) && <button onClick={() => openApplicantAction('interview', row)} className="rounded-lg border border-cyan-700 px-3 py-1.5 text-xs font-bold text-cyan-300">Jadwalkan interview</button>}
                {['interview', 'offer'].includes(row.stage) && <button onClick={() => openApplicantAction('offer', row)} className="rounded-lg border border-violet-700 px-3 py-1.5 text-xs font-bold text-violet-300">Buat offer</button>}
                {row.stage === 'offer' && latestOffer?.status === 'accepted' && <button onClick={() => openApplicantAction('hire', row)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Hire</button>}
                {['applied', 'screening', 'interview', 'offer'].includes(row.stage) && <button disabled={working !== null} onClick={() => void execute(`reject-${row.id}`, () => moveRecruitmentApplicantStage(row.id, 'rejected'), 'Kandidat ditolak')} className="rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300">Reject</button>}
                {['applied', 'screening', 'interview', 'offer'].includes(row.stage) && <button disabled={working !== null} onClick={() => void execute(`withdraw-${row.id}`, () => moveRecruitmentApplicantStage(row.id, 'withdrawn'), 'Kandidat withdrawn')} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-400">Withdraw</button>}
              </div>
            </div>;
          })}{applicants.length === 0 && <p className="text-sm text-slate-500">Belum ada kandidat.</p>}</div>
        </div>
      </section>

      {action && <form onSubmit={submitApplicantAction} className="rounded-2xl border border-cyan-800/60 bg-cyan-950/20 p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-cyan-400">Dedicated action · {action.kind}</p><h2 className="font-black">{action.applicant.applicant_name} — {action.applicant.vacancy_title}</h2></div><button type="button" onClick={() => setAction(null)} className="rounded-lg border border-slate-700 p-2"><XCircle size={17} /></button></div>
        {action.kind === 'interview' && <div className="mt-4 grid gap-3 sm:grid-cols-3"><input className={inputClass} type="datetime-local" value={actionForm.scheduledAt} onChange={(e) => setActionForm({ ...actionForm, scheduledAt: e.target.value })} /><input className={inputClass} type="number" min="1" max="480" value={actionForm.durationMinutes} onChange={(e) => setActionForm({ ...actionForm, durationMinutes: e.target.value })} placeholder="Durasi menit" /><select className={inputClass} value={actionForm.interviewerUserId} onChange={(e) => setActionForm({ ...actionForm, interviewerUserId: e.target.value })}><option value="">Interviewer opsional</option>{linkedUsers.map((row) => <option key={row.users!.id} value={row.users!.id}>{row.users!.name} · {row.users!.email}</option>)}</select></div>}
        {action.kind === 'offer' && <div className="mt-4 grid gap-3 sm:grid-cols-2"><input className={inputClass} type="number" min="0" value={actionForm.offeredSalary} onChange={(e) => setActionForm({ ...actionForm, offeredSalary: e.target.value })} placeholder="Offered salary" /><input className={inputClass} type="date" value={actionForm.startDate} onChange={(e) => setActionForm({ ...actionForm, startDate: e.target.value })} /><textarea className={`${inputClass} sm:col-span-2`} rows={2} value={actionForm.notes} onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })} placeholder="Catatan offer" /></div>}
        {action.kind === 'hire' && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><input className={inputClass} value={actionForm.employeeId} onChange={(e) => setActionForm({ ...actionForm, employeeId: e.target.value })} placeholder="Employee ID baru" /><input className={inputClass} type="number" min="0" value={actionForm.basicSalary} onChange={(e) => setActionForm({ ...actionForm, basicSalary: e.target.value })} placeholder="Basic salary" /><input className={inputClass} type="date" value={actionForm.joinDate} onChange={(e) => setActionForm({ ...actionForm, joinDate: e.target.value })} /><input className={inputClass} value={actionForm.department} onChange={(e) => setActionForm({ ...actionForm, department: e.target.value })} placeholder="Department" /><input className={inputClass} value={actionForm.position} onChange={(e) => setActionForm({ ...actionForm, position: e.target.value })} placeholder="Position" /><input className={inputClass} type="number" min="1" value={actionForm.userId} onChange={(e) => setActionForm({ ...actionForm, userId: e.target.value })} placeholder="Existing user ID (opsional)" /></div>}
        <button disabled={working !== null} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Send size={16} /> Jalankan {action.kind}</button>
      </form>}

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3"><CalendarClock className="text-cyan-400" /><div><h2 className="font-black">Interviews</h2><p className="text-sm text-slate-400">Scheduled interview dapat completed atau cancelled satu kali.</p></div></div>
          <div className="mt-4 space-y-3">{interviews.slice(0, 30).map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold">{row.applicant_name}</p><p className="text-sm text-slate-400">{row.vacancy_title} · {dt(row.scheduled_at)} · {row.duration_minutes} menit</p><p className="text-xs text-slate-500">Interviewer: {row.interviewer_name || 'belum ditentukan'}</p></div><span className="text-xs font-bold uppercase text-slate-400">{row.status}</span></div>{row.status === 'scheduled' && <div className="mt-3 flex gap-2"><button disabled={working !== null} onClick={() => { const raw = window.prompt('Score interview 0–100 (kosongkan jika tidak ada)', ''); if (raw === null) return; const feedback = window.prompt('Feedback interview (opsional)', '') || undefined; const score = raw.trim() ? Number(raw) : undefined; void execute(`int-complete-${row.id}`, () => completeRecruitmentInterview(row.id, { score, feedback }), 'Interview completed'); }} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"><CheckCircle2 size={14} /> Complete</button><button disabled={working !== null} onClick={() => { const reason = window.prompt('Alasan cancel interview (opsional)', '') || undefined; void execute(`int-cancel-${row.id}`, () => cancelRecruitmentInterview(row.id, reason), 'Interview cancelled'); }} className="inline-flex items-center gap-1 rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300"><XCircle size={14} /> Cancel</button></div>}{row.status === 'completed' && row.score != null && <p className="mt-2 text-sm text-emerald-300">Score {Number(row.score)}</p>}</div>)}{interviews.length === 0 && <p className="text-sm text-slate-500">Belum ada interview.</p>}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-black">Offers</h2><p className="text-sm text-slate-400">Draft → sent → accepted/declined. Accepted offer menjadi syarat hire.</p>
          <div className="mt-4 space-y-3">{offers.slice(0, 30).map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold">{row.applicant_name} · v{row.version}</p><p className="text-sm text-slate-400">{row.vacancy_title} · {money(row.offered_salary)}</p></div><span className="rounded-full bg-violet-950 px-2 py-1 text-xs font-bold uppercase text-violet-300">{row.status}</span></div><div className="mt-3 flex flex-wrap gap-2">{row.status === 'draft' && <button disabled={working !== null} onClick={() => void execute(`offer-send-${row.id}`, () => updateRecruitmentOfferStatus(row.id, 'sent'), 'Offer dikirim')} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white">Send</button>}{row.status === 'sent' && <><button disabled={working !== null} onClick={() => void execute(`offer-accept-${row.id}`, () => updateRecruitmentOfferStatus(row.id, 'accepted'), 'Offer accepted')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Accept</button><button disabled={working !== null} onClick={() => void execute(`offer-decline-${row.id}`, () => updateRecruitmentOfferStatus(row.id, 'declined'), 'Offer declined')} className="rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300">Decline</button></>}{['draft', 'sent', 'accepted'].includes(row.status) && <button disabled={working !== null} onClick={() => void execute(`offer-withdraw-${row.id}`, () => updateRecruitmentOfferStatus(row.id, 'withdrawn'), 'Offer withdrawn')} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-400">Withdraw</button>}</div></div>)}{offers.length === 0 && <p className="text-sm text-slate-500">Belum ada offer.</p>}</div>
        </div>
      </section>
    </div>
  );
}
