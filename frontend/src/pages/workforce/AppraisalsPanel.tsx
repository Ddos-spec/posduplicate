import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Plus, RefreshCw, Star, Target, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import {
  cancelAppraisal,
  createAppraisal,
  createAppraisalCycle,
  finalizeAppraisal,
  getAppraisalCycles,
  getAppraisals,
  getMyAppraisals,
  submitMyAppraisal,
  updateAppraisalCycleStatus,
  workforceErrorMessage,
  type Appraisal,
  type AppraisalCycle,
  type AppraisalGoal,
  type MyAppraisalState,
  type WorkforceEmployee,
} from '../../services/workforceService';

interface Props {
  employees: WorkforceEmployee[];
}

type GoalDraft = { score: string; comment: string };
type ReviewDraft = { summary: string; scores: Record<number, GoalDraft> };

const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-cyan-500';
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value)) : '—';

const statusClass = (status: Appraisal['status']) => {
  if (status === 'completed') return 'bg-emerald-950 text-emerald-300';
  if (status === 'cancelled') return 'bg-rose-950 text-rose-300';
  if (status === 'manager_review') return 'bg-violet-950 text-violet-300';
  return 'bg-cyan-950 text-cyan-300';
};

const goalDraftValue = (draft: ReviewDraft | undefined, goal: AppraisalGoal, kind: 'self' | 'reviewer') => {
  const local = draft?.scores[goal.id]?.score;
  if (local !== undefined) return local;
  const stored = kind === 'self' ? goal.self_score : goal.reviewer_score;
  return stored == null ? '' : String(stored);
};

export default function AppraisalsPanel({ employees }: Props) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [mine, setMine] = useState<MyAppraisalState | null>(null);
  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [managerVisible, setManagerVisible] = useState(false);
  const [cycleForm, setCycleForm] = useState({ code: '', name: '', periodStart: '', periodEnd: '', description: '' });
  const [appraisalForm, setAppraisalForm] = useState({ cycleId: '', employeeId: '', reviewerUserId: '', goalsText: 'Kinerja utama | 50\nKolaborasi & disiplin | 50' });
  const [selfDrafts, setSelfDrafts] = useState<Record<number, ReviewDraft>>({});
  const [managerDrafts, setManagerDrafts] = useState<Record<number, ReviewDraft>>({});

  const linkedUsers = useMemo(() => employees.filter((row) => row.users?.id && row.users.is_active !== false), [employees]);
  const openCycles = useMemo(() => cycles.filter((row) => row.status === 'open'), [cycles]);

  const load = useCallback(async () => {
    setLoading(true);
    const [mineResult, cyclesResult, appraisalsResult] = await Promise.allSettled([
      getMyAppraisals(), getAppraisalCycles(), getAppraisals(),
    ]);
    setMine(mineResult.status === 'fulfilled' ? mineResult.value : null);
    if (cyclesResult.status === 'fulfilled' && appraisalsResult.status === 'fulfilled') {
      setCycles(cyclesResult.value);
      setAppraisals(appraisalsResult.value);
      setManagerVisible(true);
    } else {
      setCycles([]);
      setAppraisals([]);
      setManagerVisible(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    setAppraisalForm((current) => ({
      ...current,
      cycleId: current.cycleId || String(openCycles[0]?.id || ''),
      employeeId: current.employeeId || String(employees[0]?.id || ''),
      reviewerUserId: current.reviewerUserId || String(linkedUsers[0]?.users?.id || ''),
    }));
  }, [employees, linkedUsers, openCycles]);

  const execute = async (key: string, work: () => Promise<unknown>, success: string) => {
    setWorking(key);
    try {
      await work();
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(workforceErrorMessage(error, 'Aksi appraisal gagal'));
    } finally {
      setWorking(null);
    }
  };

  const updateGoalDraft = (setter: React.Dispatch<React.SetStateAction<Record<number, ReviewDraft>>>, appraisalId: number, goalId: number, field: keyof GoalDraft, value: string) => {
    setter((current) => ({
      ...current,
      [appraisalId]: {
        summary: current[appraisalId]?.summary || '',
        scores: {
          ...(current[appraisalId]?.scores || {}),
          [goalId]: { score: current[appraisalId]?.scores[goalId]?.score || '', comment: current[appraisalId]?.scores[goalId]?.comment || '', [field]: value },
        },
      },
    }));
  };

  const updateSummary = (setter: React.Dispatch<React.SetStateAction<Record<number, ReviewDraft>>>, appraisalId: number, value: string) => {
    setter((current) => ({ ...current, [appraisalId]: { summary: value, scores: current[appraisalId]?.scores || {} } }));
  };

  const buildScores = (appraisal: Appraisal, draft: ReviewDraft | undefined, kind: 'self' | 'reviewer') => {
    const rows: Array<{ goalId: number; score: number; comment?: string }> = [];
    for (const goal of appraisal.goals) {
      const raw = goalDraftValue(draft, goal, kind);
      const score = Number(raw);
      if (raw === '' || !Number.isFinite(score) || score < 0 || score > 5) {
        toast.error(`Goal “${goal.title}” wajib memiliki score 0–5`);
        return null;
      }
      const localComment = draft?.scores[goal.id]?.comment;
      const storedComment = kind === 'self' ? goal.self_comment : goal.reviewer_comment;
      rows.push({ goalId: goal.id, score, comment: localComment !== undefined ? localComment : storedComment || undefined });
    }
    return rows;
  };

  const submitSelf = async (appraisal: Appraisal) => {
    const draft = selfDrafts[appraisal.id];
    const rows = buildScores(appraisal, draft, 'self');
    if (!rows) return;
    await execute(`self-${appraisal.id}`, () => submitMyAppraisal(appraisal.id, {
      selfSummary: draft?.summary || appraisal.self_summary || undefined,
      goals: rows.map((row) => ({ goalId: row.goalId, selfScore: row.score, selfComment: row.comment })),
    }), 'Self review dikirim');
  };

  const submitManager = async (appraisal: Appraisal) => {
    const draft = managerDrafts[appraisal.id];
    const rows = buildScores(appraisal, draft, 'reviewer');
    if (!rows) return;
    await execute(`manager-${appraisal.id}`, () => finalizeAppraisal(appraisal.id, {
      managerSummary: draft?.summary || appraisal.manager_summary || undefined,
      goals: rows.map((row) => ({ goalId: row.goalId, reviewerScore: row.score, reviewerComment: row.comment })),
    }), 'Appraisal difinalisasi');
  };

  const submitCycle = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cycleForm.code.trim() || !cycleForm.name.trim() || !cycleForm.periodStart || !cycleForm.periodEnd) return toast.error('Code, nama, dan periode cycle wajib diisi');
    await execute('new-cycle', () => createAppraisalCycle({
      code: cycleForm.code,
      name: cycleForm.name,
      periodStart: cycleForm.periodStart,
      periodEnd: cycleForm.periodEnd,
      description: cycleForm.description || undefined,
    }), 'Appraisal cycle dibuat');
    setCycleForm({ code: '', name: '', periodStart: '', periodEnd: '', description: '' });
  };

  const parseGoals = () => {
    const lines = appraisalForm.goalsText.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return toast.error('Minimal satu goal wajib diisi'), null;
    const parsed: Array<{ title: string; weight: number }> = [];
    for (const line of lines) {
      const [titleRaw, weightRaw] = line.split('|').map((part) => part.trim());
      const weight = Number(weightRaw);
      if (!titleRaw || !Number.isFinite(weight) || weight <= 0 || weight > 100) return toast.error(`Format goal tidak valid: ${line}`), null;
      parsed.push({ title: titleRaw, weight });
    }
    if (Math.abs(parsed.reduce((sum, row) => sum + row.weight, 0) - 100) > 0.01) return toast.error('Total weight goals harus 100'), null;
    return parsed;
  };

  const submitAppraisal = async (event: React.FormEvent) => {
    event.preventDefault();
    const goals = parseGoals();
    if (!goals || !appraisalForm.cycleId || !appraisalForm.employeeId || !appraisalForm.reviewerUserId) return;
    await execute('new-appraisal', () => createAppraisal({
      cycleId: Number(appraisalForm.cycleId),
      employeeId: Number(appraisalForm.employeeId),
      reviewerUserId: Number(appraisalForm.reviewerUserId),
      goals,
    }), 'Appraisal dibuat');
  };

  if (loading) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Memuat Appraisals…</div>;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Star className="text-amber-400" /><div><h2 className="font-black">Appraisal Saya</h2><p className="text-sm text-slate-400">Self review terikat employee login; seluruh goal wajib diberi score 0–5.</p></div></div><button onClick={() => void load()} className="rounded-xl border border-slate-700 p-2 hover:bg-slate-800" aria-label="Refresh appraisals"><RefreshCw size={17} /></button></div>
        {mine ? <div className="mt-4 grid gap-4 xl:grid-cols-2">{mine.appraisals.map((appraisal) => <div key={appraisal.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold">{appraisal.cycle_code} · {appraisal.cycle_name}</p><p className="text-sm text-slate-400">Reviewer {appraisal.reviewer_name} · {formatDate(appraisal.period_start)} – {formatDate(appraisal.period_end)}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${statusClass(appraisal.status)}`}>{appraisal.status}</span></div>
          {appraisal.status === 'completed' && <p className="mt-3 text-3xl font-black text-emerald-300">{Number(appraisal.overall_score || 0).toFixed(2)} <span className="text-sm text-slate-500">/ 5</span></p>}
          <div className="mt-4 space-y-3">{appraisal.goals.map((goal) => <div key={goal.id} className="rounded-lg border border-slate-800 p-3"><div className="flex justify-between gap-2"><p className="font-semibold">{goal.title}</p><span className="text-xs text-slate-500">weight {Number(goal.weight)}%</span></div>{appraisal.status === 'self_review' ? <div className="mt-3 grid gap-2 sm:grid-cols-[100px_1fr]"><input className={inputClass} type="number" min="0" max="5" step="0.1" value={goalDraftValue(selfDrafts[appraisal.id], goal, 'self')} onChange={(e) => updateGoalDraft(setSelfDrafts, appraisal.id, goal.id, 'score', e.target.value)} placeholder="0–5" /><input className={inputClass} value={selfDrafts[appraisal.id]?.scores[goal.id]?.comment ?? goal.self_comment ?? ''} onChange={(e) => updateGoalDraft(setSelfDrafts, appraisal.id, goal.id, 'comment', e.target.value)} placeholder="Komentar" /></div> : <p className="mt-2 text-sm text-slate-400">Self {goal.self_score ?? '—'} · Reviewer {goal.reviewer_score ?? '—'}</p>}</div>)}</div>
          {appraisal.status === 'self_review' && <><textarea className={`${inputClass} mt-3`} rows={2} value={selfDrafts[appraisal.id]?.summary ?? appraisal.self_summary ?? ''} onChange={(e) => updateSummary(setSelfDrafts, appraisal.id, e.target.value)} placeholder="Ringkasan self review" /><button disabled={working !== null} onClick={() => void submitSelf(appraisal)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><ClipboardCheck size={16} /> Submit self review</button></>}
        </div>)}{mine.appraisals.length === 0 && <p className="text-sm text-slate-500">Belum ada appraisal yang ditugaskan.</p>}</div> : <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">Self appraisal tidak tersedia atau akun belum terhubung ke employee aktif.</div>}
      </section>

      {managerVisible && <>
        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3"><Target className="text-violet-400" /><div><h2 className="font-black">Cycles</h2><p className="text-sm text-slate-400">Cycle hanya draft → open → closed; close ditolak jika review belum selesai.</p></div></div>
            <div className="mt-4 space-y-3">{cycles.map((cycle) => <div key={cycle.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold">{cycle.code} · {cycle.name}</p><p className="text-sm text-slate-400">{formatDate(cycle.period_start)} – {formatDate(cycle.period_end)} · {cycle.completed_count || 0}/{cycle.appraisal_count || 0} selesai</p></div><span className="text-xs font-bold uppercase text-slate-400">{cycle.status}</span></div><div className="mt-3 flex gap-2">{cycle.status === 'draft' && <button disabled={working !== null} onClick={() => void execute(`cycle-open-${cycle.id}`, () => updateAppraisalCycleStatus(cycle.id, 'open'), 'Cycle dibuka')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Open</button>}{cycle.status === 'open' && <button disabled={working !== null} onClick={() => void execute(`cycle-close-${cycle.id}`, () => updateAppraisalCycleStatus(cycle.id, 'closed'), 'Cycle ditutup')} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300">Close</button>}</div></div>)}{cycles.length === 0 && <p className="text-sm text-slate-500">Belum ada cycle.</p>}</div>
          </div>

          <form onSubmit={submitCycle} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-black">Buat Cycle</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input className={inputClass} value={cycleForm.code} onChange={(e) => setCycleForm({ ...cycleForm, code: e.target.value })} placeholder="Code" /><input className={inputClass} value={cycleForm.name} onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })} placeholder="Nama cycle" /><input className={inputClass} type="date" value={cycleForm.periodStart} onChange={(e) => setCycleForm({ ...cycleForm, periodStart: e.target.value })} /><input className={inputClass} type="date" value={cycleForm.periodEnd} onChange={(e) => setCycleForm({ ...cycleForm, periodEnd: e.target.value })} /><textarea className={`${inputClass} sm:col-span-2`} rows={2} value={cycleForm.description} onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })} placeholder="Deskripsi" /></div><button disabled={working === 'new-cycle'} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Plus size={16} className="mr-1 inline" /> Buat cycle</button>
          </form>
        </section>

        <form onSubmit={submitAppraisal} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-black">Assign Appraisal</h2><p className="text-sm text-slate-400">Satu employee hanya satu appraisal per cycle. Format goal: <code>Judul | weight</code>, total 100.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3"><select className={inputClass} value={appraisalForm.cycleId} onChange={(e) => setAppraisalForm({ ...appraisalForm, cycleId: e.target.value })}><option value="">Cycle open</option>{openCycles.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select><select className={inputClass} value={appraisalForm.employeeId} onChange={(e) => setAppraisalForm({ ...appraisalForm, employeeId: e.target.value })}><option value="">Employee</option>{employees.map((row) => <option key={row.id} value={row.id}>{row.employee_id} · {row.name}</option>)}</select><select className={inputClass} value={appraisalForm.reviewerUserId} onChange={(e) => setAppraisalForm({ ...appraisalForm, reviewerUserId: e.target.value })}><option value="">Reviewer user</option>{linkedUsers.map((row) => <option key={row.users!.id} value={row.users!.id}>{row.users!.name} · {row.users!.email}</option>)}</select><textarea className={`${inputClass} md:col-span-3`} rows={4} value={appraisalForm.goalsText} onChange={(e) => setAppraisalForm({ ...appraisalForm, goalsText: e.target.value })} /></div>
          <button disabled={working === 'new-appraisal' || !openCycles.length || !employees.length || !linkedUsers.length} className="mt-4 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">Assign appraisal</button>
        </form>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-black">Manager Review Queue</h2><p className="text-sm text-slate-400">Final score dihitung server-side dari reviewer score × goal weight. Hanya reviewer yang ditugaskan dapat finalize.</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">{appraisals.map((appraisal) => <div key={appraisal.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold">{appraisal.employee_name} · {appraisal.cycle_code}</p><p className="text-sm text-slate-400">Reviewer {appraisal.reviewer_name} · {appraisal.department || '—'}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${statusClass(appraisal.status)}`}>{appraisal.status}</span></div>
            {appraisal.status === 'completed' && <p className="mt-3 text-2xl font-black text-emerald-300">{Number(appraisal.overall_score || 0).toFixed(2)} / 5</p>}
            {appraisal.status === 'manager_review' && Number(appraisal.reviewer_user_id) === Number(currentUserId) && <div className="mt-4 space-y-3">{appraisal.goals.map((goal) => <div key={goal.id} className="rounded-lg border border-slate-800 p-3"><div className="flex justify-between gap-2"><p className="font-semibold">{goal.title}</p><span className="text-xs text-slate-500">Self {goal.self_score ?? '—'} · weight {Number(goal.weight)}%</span></div><div className="mt-2 grid gap-2 sm:grid-cols-[100px_1fr]"><input className={inputClass} type="number" min="0" max="5" step="0.1" value={goalDraftValue(managerDrafts[appraisal.id], goal, 'reviewer')} onChange={(e) => updateGoalDraft(setManagerDrafts, appraisal.id, goal.id, 'score', e.target.value)} placeholder="0–5" /><input className={inputClass} value={managerDrafts[appraisal.id]?.scores[goal.id]?.comment ?? goal.reviewer_comment ?? ''} onChange={(e) => updateGoalDraft(setManagerDrafts, appraisal.id, goal.id, 'comment', e.target.value)} placeholder="Komentar reviewer" /></div></div>)}<textarea className={inputClass} rows={2} value={managerDrafts[appraisal.id]?.summary ?? appraisal.manager_summary ?? ''} onChange={(e) => updateSummary(setManagerDrafts, appraisal.id, e.target.value)} placeholder="Manager summary" /><button disabled={working !== null} onClick={() => void submitManager(appraisal)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 size={16} /> Finalize</button></div>}
            {appraisal.status === 'manager_review' && Number(appraisal.reviewer_user_id) !== Number(currentUserId) && <p className="mt-3 text-xs text-slate-500">Menunggu reviewer yang ditugaskan.</p>}
            {!['completed', 'cancelled'].includes(appraisal.status) && <button disabled={working !== null} onClick={() => void execute(`cancel-${appraisal.id}`, () => cancelAppraisal(appraisal.id), 'Appraisal dibatalkan')} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300 disabled:opacity-50"><XCircle size={14} /> Cancel</button>}
          </div>)}{appraisals.length === 0 && <p className="text-sm text-slate-500">Belum ada appraisal manager view.</p>}</div>
        </section>
      </>}
    </div>
  );
}
