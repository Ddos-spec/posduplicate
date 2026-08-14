import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, ClipboardCheck, GraduationCap, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getPublicLearnerWorkspace,
  startPublicLearnerAttempt,
  submitPublicLearnerAttempt,
  updatePublicLearnerProgress,
  type LearningAssessment,
  type PublicLearnerWorkspace,
} from '../../services/learningCommunityService';

const consumeToken = () => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = String(params.get('token') || '').trim();
  if (window.location.hash) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  return token;
};

function AssessmentCard({ token, assessment, onDone }: { token: string; assessment: LearningAssessment; onDone: () => Promise<void> }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const attempt = await startPublicLearnerAttempt(token, assessment.id);
      const payload = (assessment.questions || []).map((question) => ({ questionId: question.id, answer: answers[question.id] ?? '' }));
      const result = await submitPublicLearnerAttempt(token, attempt.id, payload);
      toast.success(result.status === 'passed' ? `Passed ${Number(result.percentage || 0).toFixed(0)}%` : `Score ${Number(result.percentage || 0).toFixed(0)}%`);
      await onDone();
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Assessment gagal'); }
    finally { setBusy(false); }
  };
  if (assessment.passed) return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 size={17}/>Passed · {assessment.title}</div></div>;
  return <form onSubmit={submit} className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 font-black"><ClipboardCheck size={17}/>{assessment.title}</div><p className="mt-1 text-xs text-slate-500">Pass {assessment.passing_score}% · attempts {assessment.attempt_count || 0}/{assessment.max_attempts}</p><div className="mt-4 space-y-3">{(assessment.questions || []).map((question) => <label key={question.id} className="block"><span className="text-sm font-semibold">{question.prompt}</span><input required value={answers[question.id] || ''} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Your answer" /></label>)}</div><button disabled={busy} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50">{busy ? 'Submitting…' : 'Submit assessment'}</button></form>;
}

export default function PublicLearnerPage() {
  const [token] = useState(consumeToken);
  const [workspace, setWorkspace] = useState<PublicLearnerWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const progressByLesson = useMemo(() => new Map((workspace?.progress || []).map((item) => [Number(item.lesson_id), item])), [workspace]);

  const load = async () => {
    if (!token) { setError('Learner token tidak tersedia.'); setLoading(false); return; }
    setLoading(true); setError('');
    try { setWorkspace(await getPublicLearnerWorkspace(token)); }
    catch (requestError: any) { setError(requestError?.response?.data?.error?.message || 'Learner access unavailable.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [token]);

  const completeLesson = async (lessonId: number) => {
    try { await updatePublicLearnerProgress(token, lessonId, 100); toast.success('Lesson completed'); await load(); }
    catch (requestError: any) { toast.error(requestError?.response?.data?.error?.message || 'Progress gagal disimpan'); }
  };

  if (loading) return <main className="min-h-screen grid place-items-center bg-slate-50"><Loader2 className="animate-spin" /></main>;
  if (!workspace) return <main className="min-h-screen grid place-items-center bg-slate-50 p-6"><div className="rounded-3xl border bg-white p-7 text-center"><h1 className="font-black">Learner access unavailable</h1><p className="mt-2 text-sm text-slate-600">{error}</p></div></main>;

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900"><div className="mx-auto max-w-4xl space-y-5">
    <header className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex items-center gap-2 text-sm font-bold text-blue-700"><GraduationCap size={18}/>Learner workspace</div><h1 className="mt-2 text-3xl font-black">{workspace.enrollment.course.title}</h1><p className="mt-2 text-sm text-slate-600">{workspace.enrollment.customer_name} · {workspace.enrollment.status}</p></header>
    <section className="space-y-3"><h2 className="text-lg font-black">Lessons</h2>{workspace.lessons.map((lesson) => { const progress = progressByLesson.get(lesson.id); const done = progress?.status === 'completed'; return <article key={lesson.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">{lesson.position + 1}. {lesson.title}</h3><p className="mt-1 text-xs text-slate-500">{lesson.duration_minutes} minutes</p></div>{done ? <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700"><CheckCircle2 size={16}/>Completed</span> : <button onClick={() => void completeLesson(lesson.id)} className="rounded-xl border px-3 py-2 text-sm font-bold">Mark complete</button>}</div><div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{(lesson.content || []).map((block) => block.text).filter(Boolean).join('\n\n')}</div></article>; })}</section>
    {workspace.assessments.length > 0 && <section className="space-y-3"><h2 className="text-lg font-black">Assessments</h2>{workspace.assessments.map((assessment) => <AssessmentCard key={assessment.id} token={token} assessment={assessment} onDone={load} />)}</section>}
    {workspace.certificate && <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6"><div className="flex items-center gap-2 font-black text-amber-900"><Award size={20}/>Certificate issued</div><div className="mt-2 font-mono text-sm">{workspace.certificate.certificate_number}</div><div className="mt-2 break-all font-mono text-[11px] text-amber-800">SHA-256 {workspace.certificate.evidence_sha256}</div></section>}
  </div></main>;
}
