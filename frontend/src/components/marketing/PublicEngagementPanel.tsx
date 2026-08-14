import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Loader2, MapPin } from 'lucide-react';
import {
  getPublicMarketingEvent,
  getPublicMarketingSurvey,
  registerPublicMarketingEvent,
  submitPublicMarketingSurvey,
  type MarketingSurveyQuestion,
  type PublicMarketingEvent,
  type PublicMarketingSurvey,
} from '../../services/marketingEngagementService';

type Props = { publicSlug: string; eventSlug?: string | null; surveySlug?: string | null };
type AnswerState = Record<number, unknown>;

type SavedAttempt = { token?: string; fingerprint?: string };
const formatDate = (value: string) => new Date(value).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');

const attemptToken = (key: string, fingerprint: string) => {
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved) as SavedAttempt;
      if (parsed.fingerprint === fingerprint && parsed.token) return parsed.token;
    }
  } catch {
    sessionStorage.removeItem(key);
  }
  const token = newToken();
  sessionStorage.setItem(key, JSON.stringify({ token, fingerprint }));
  return token;
};

export default function PublicEngagementPanel({ publicSlug, eventSlug, surveySlug }: Props) {
  const mode = eventSlug ? 'event' : surveySlug ? 'survey' : null;
  const [loading, setLoading] = useState(Boolean(mode));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [eventData, setEventData] = useState<PublicMarketingEvent | null>(null);
  const [surveyData, setSurveyData] = useState<PublicMarketingSurvey | null>(null);
  const [registration, setRegistration] = useState({ name: '', email: '', phone: '', seats: '1' });
  const [respondent, setRespondent] = useState({ name: '', email: '' });
  const [answers, setAnswers] = useState<AnswerState>({});

  useEffect(() => {
    let active = true;
    if (!mode) return;
    setLoading(true);
    setError('');
    setSuccess('');
    const request = eventSlug
      ? getPublicMarketingEvent(publicSlug, eventSlug).then((data) => { if (active) setEventData(data); })
      : getPublicMarketingSurvey(publicSlug, surveySlug as string).then((data) => { if (active) setSurveyData(data); });
    request
      .catch((requestError: any) => {
        if (!active) return;
        setError(requestError?.response?.data?.error?.message || 'Form publik tidak tersedia.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [eventSlug, mode, publicSlug, surveySlug]);

  const questions = useMemo(() => surveyData?.survey.questions || [], [surveyData]);

  if (!mode) return null;
  if (loading) return <main className="min-h-screen grid place-items-center bg-slate-50"><Loader2 className="animate-spin" /></main>;
  if (error && !eventData && !surveyData) return <main className="min-h-screen grid place-items-center bg-slate-50 p-6"><div className="max-w-lg rounded-2xl border bg-white p-6 text-center"><h1 className="text-xl font-black">Form tidak tersedia</h1><p className="mt-2 text-sm text-slate-600">{error}</p></div></main>;

  const submitEvent = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!eventSlug || !registration.name.trim()) return;
    const payload = {
      attendeeName: registration.name.trim(),
      attendeeEmail: registration.email.trim() || undefined,
      attendeePhone: registration.phone.trim() || undefined,
      seats: Number(registration.seats || 1),
    };
    const key = `p3-engagement-event-attempt:${publicSlug}:${eventSlug}`;
    const token = attemptToken(key, JSON.stringify(payload));
    setSubmitting(true); setError('');
    try {
      const result = await registerPublicMarketingEvent(publicSlug, eventSlug, token, payload);
      sessionStorage.removeItem(key);
      setSuccess(`Registrasi berhasil. ${result.attendee_name} terdaftar untuk ${result.seats} kursi.`);
      setRegistration({ name: '', email: '', phone: '', seats: '1' });
      setEventData(await getPublicMarketingEvent(publicSlug, eventSlug));
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error?.message || 'Registrasi gagal. Retry akan memakai attempt yang sama.');
    } finally { setSubmitting(false); }
  };

  const submitSurvey = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!surveySlug) return;
    const payload = {
      respondentName: respondent.name.trim() || undefined,
      respondentEmail: respondent.email.trim() || undefined,
      answers: questions
        .filter((question) => question.id != null && answers[Number(question.id)] !== undefined)
        .map((question) => ({ questionId: Number(question.id), answer: answers[Number(question.id)] })),
    };
    const key = `p3-engagement-survey-attempt:${publicSlug}:${surveySlug}`;
    const token = attemptToken(key, JSON.stringify(payload));
    setSubmitting(true); setError('');
    try {
      await submitPublicMarketingSurvey(publicSlug, surveySlug, token, payload);
      sessionStorage.removeItem(key);
      setSuccess('Jawaban survei berhasil dikirim. Terima kasih.');
      setAnswers({});
      setRespondent({ name: '', email: '' });
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error?.message || 'Jawaban survei gagal. Retry akan memakai attempt yang sama.');
    } finally { setSubmitting(false); }
  };

  if (eventData) {
    const event = eventData.event;
    return <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{eventData.siteName} · Event</p>
          <h1 className="mt-2 text-3xl font-black">{event.name}</h1>
          {event.description && <p className="mt-3 text-slate-600">{event.description}</p>}
          <div className="mt-5 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <div className="flex items-center gap-2"><CalendarDays size={16} />{formatDate(event.starts_at)}</div>
            {event.venue && <div className="flex items-center gap-2"><MapPin size={16} />{event.venue}</div>}
          </div>
          <p className="mt-4 text-sm font-semibold">Kursi tersedia: {event.available_seats == null ? 'tanpa batas' : event.available_seats}</p>
        </header>
        <form onSubmit={submitEvent} className="space-y-3 rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">Daftar event</h2>
          <input required value={registration.name} onChange={(e) => setRegistration({ ...registration, name: e.target.value })} placeholder="Nama peserta" className="w-full rounded-xl border px-3 py-2.5" />
          <input type="email" value={registration.email} onChange={(e) => setRegistration({ ...registration, email: e.target.value })} placeholder="Email (opsional)" className="w-full rounded-xl border px-3 py-2.5" />
          <input value={registration.phone} onChange={(e) => setRegistration({ ...registration, phone: e.target.value })} placeholder="Nomor telepon (opsional)" className="w-full rounded-xl border px-3 py-2.5" />
          <input type="number" min="1" max="100" required value={registration.seats} onChange={(e) => setRegistration({ ...registration, seats: e.target.value })} className="w-full rounded-xl border px-3 py-2.5" />
          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {success && <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={18} />{success}</p>}
          <button disabled={submitting || event.registration_open !== true || event.available_seats === 0} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">{submitting ? 'Mendaftarkan…' : 'Daftar'}</button>
        </form>
      </div>
    </main>;
  }

  if (surveyData) {
    return <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <form onSubmit={submitSurvey} className="mx-auto max-w-2xl space-y-5">
        <header className="rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{surveyData.siteName} · Survey</p>
          <h1 className="mt-2 text-3xl font-black">{surveyData.survey.title}</h1>
          {surveyData.survey.description && <p className="mt-3 text-slate-600">{surveyData.survey.description}</p>}
        </header>
        <section className="grid gap-3 rounded-3xl border bg-white p-6 shadow-sm sm:grid-cols-2">
          <input value={respondent.name} onChange={(e) => setRespondent({ ...respondent, name: e.target.value })} placeholder="Nama (opsional)" className="rounded-xl border px-3 py-2.5" />
          <input type="email" value={respondent.email} onChange={(e) => setRespondent({ ...respondent, email: e.target.value })} placeholder="Email (opsional)" className="rounded-xl border px-3 py-2.5" />
        </section>
        {questions.map((question, index) => <QuestionField key={question.id ?? index} question={question} value={question.id == null ? undefined : answers[Number(question.id)]} onChange={(value) => question.id != null && setAnswers((current) => ({ ...current, [Number(question.id)]: value }))} />)}
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {success && <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={18} />{success}</p>}
        <button disabled={submitting || Boolean(success)} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">{submitting ? 'Mengirim…' : 'Kirim jawaban'}</button>
      </form>
    </main>;
  }

  return null;
}

function QuestionField({ question, value, onChange }: { question: MarketingSurveyQuestion; value: unknown; onChange: (value: unknown) => void }) {
  const type = question.question_type || question.type || 'short_text';
  const options = Array.isArray(question.options) ? question.options : [];
  return <section className="rounded-3xl border bg-white p-6 shadow-sm">
    <label className="block font-bold">{question.prompt}{question.required && <span className="text-rose-600"> *</span>}</label>
    <div className="mt-3">
      {type === 'short_text' && <input required={question.required} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2.5" />}
      {type === 'long_text' && <textarea required={question.required} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className="min-h-28 w-full rounded-xl border px-3 py-2.5" />}
      {type === 'single_choice' && <div className="space-y-2">{options.map((option) => <label key={option} className="flex items-center gap-2"><input required={question.required} type="radio" name={`question-${question.id}`} checked={value === option} onChange={() => onChange(option)} />{option}</label>)}</div>}
      {type === 'multiple_choice' && <div className="space-y-2">{options.map((option) => { const selected = Array.isArray(value) ? value.map(String) : []; return <label key={option} className="flex items-center gap-2"><input type="checkbox" checked={selected.includes(option)} onChange={(e) => onChange(e.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} />{option}</label>; })}</div>}
      {type === 'rating' && <select required={question.required} value={value == null ? '' : String(value)} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-xl border px-3 py-2.5"><option value="">Pilih rating</option>{[1,2,3,4,5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}</select>}
      {type === 'nps' && <select required={question.required} value={value == null ? '' : String(value)} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-xl border px-3 py-2.5"><option value="">Pilih skor</option>{Array.from({ length: 11 }, (_, score) => <option key={score} value={score}>{score}</option>)}</select>}
    </div>
  </section>;
}
