import { type FormEvent, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  createMarketingEvent,
  createMarketingEventRegistration,
  createMarketingSurvey,
  getMarketingEventRegistrations,
  getMarketingEvents,
  getMarketingSurveyResponses,
  getMarketingSurveys,
  setMarketingEventStatus,
  setMarketingRegistrationStatus,
  setMarketingSurveyStatus,
  type MarketingEvent,
  type MarketingEventRegistration,
  type MarketingSurvey,
  type MarketingSurveyQuestionType,
  type MarketingSurveyResponse,
} from '../../services/marketingEngagementService';

type Tab = 'events' | 'surveys';
type DraftQuestion = { type: MarketingSurveyQuestionType; prompt: string; required: boolean; options: string };

const emptyQuestion = (): DraftQuestion => ({ type: 'short_text', prompt: '', required: false, options: '' });

const localDateTime = (offsetHours: number) => {
  const date = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : '—';

export default function MarketingEngagementPage() {
  const [tab, setTab] = useState<Tab>('events');
  const [events, setEvents] = useState<MarketingEvent[]>([]);
  const [surveys, setSurveys] = useState<MarketingSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [registrations, setRegistrations] = useState<MarketingEventRegistration[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);
  const [responses, setResponses] = useState<MarketingSurveyResponse[]>([]);

  const [eventForm, setEventForm] = useState({
    slug: '', name: '', description: '', startsAt: localDateTime(24), endsAt: localDateTime(26), venue: '', capacity: '50',
  });
  const [registrationForm, setRegistrationForm] = useState({ attendeeName: '', attendeeEmail: '', attendeePhone: '', seats: '1' });
  const [surveyForm, setSurveyForm] = useState({ slug: '', title: '', description: '' });
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);
  const selectedSurvey = useMemo(() => surveys.find((survey) => survey.id === selectedSurveyId) || null, [surveys, selectedSurveyId]);

  const load = async () => {
    setLoading(true);
    try {
      const [eventRows, surveyRows] = await Promise.all([getMarketingEvents(), getMarketingSurveys()]);
      setEvents(eventRows);
      setSurveys(surveyRows);
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || error?.message || 'Failed to load engagement workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const loadRegistrations = async (eventId: number) => {
    setSelectedEventId(eventId);
    try { setRegistrations(await getMarketingEventRegistrations(eventId)); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Failed to load registrations'); }
  };

  const loadResponses = async (surveyId: number) => {
    setSelectedSurveyId(surveyId);
    try { setResponses(await getMarketingSurveyResponses(surveyId)); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Failed to load survey responses'); }
  };

  const submitEvent = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createMarketingEvent({
        slug: eventForm.slug,
        name: eventForm.name,
        description: eventForm.description || undefined,
        startsAt: new Date(eventForm.startsAt).toISOString(),
        endsAt: new Date(eventForm.endsAt).toISOString(),
        venue: eventForm.venue || undefined,
        capacity: eventForm.capacity ? Number(eventForm.capacity) : null,
      });
      toast.success('Event created');
      setEventForm({ slug: '', name: '', description: '', startsAt: localDateTime(24), endsAt: localDateTime(26), venue: '', capacity: '50' });
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || error?.message || 'Failed to create event');
    } finally { setSaving(false); }
  };

  const transitionEvent = async (id: number, status: MarketingEvent['status']) => {
    try { await setMarketingEventStatus(id, status); toast.success(`Event ${status}`); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Event transition failed'); }
  };

  const submitRegistration = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedEventId) return;
    setSaving(true);
    try {
      await createMarketingEventRegistration(selectedEventId, {
        attendeeName: registrationForm.attendeeName,
        attendeeEmail: registrationForm.attendeeEmail || undefined,
        attendeePhone: registrationForm.attendeePhone || undefined,
        seats: Number(registrationForm.seats || 1),
      });
      toast.success('Registration added');
      setRegistrationForm({ attendeeName: '', attendeeEmail: '', attendeePhone: '', seats: '1' });
      await Promise.all([load(), loadRegistrations(selectedEventId)]);
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Registration failed'); }
    finally { setSaving(false); }
  };

  const transitionRegistration = async (id: number, status: MarketingEventRegistration['status']) => {
    if (!selectedEventId) return;
    try { await setMarketingRegistrationStatus(id, status); toast.success(`Registration ${status}`); await loadRegistrations(selectedEventId); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Registration transition failed'); }
  };

  const updateQuestion = (index: number, patch: Partial<DraftQuestion>) => {
    setQuestions((current) => current.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question));
  };

  const submitSurvey = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createMarketingSurvey({
        slug: surveyForm.slug,
        title: surveyForm.title,
        description: surveyForm.description || undefined,
        questions: questions.map((question) => ({
          type: question.type,
          prompt: question.prompt,
          required: question.required,
          options: ['single_choice', 'multiple_choice'].includes(question.type)
            ? question.options.split(',').map((option) => option.trim()).filter(Boolean)
            : undefined,
        })),
      });
      toast.success('Survey created');
      setSurveyForm({ slug: '', title: '', description: '' });
      setQuestions([emptyQuestion()]);
      await load();
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || error?.message || 'Failed to create survey'); }
    finally { setSaving(false); }
  };

  const transitionSurvey = async (id: number, status: MarketingSurvey['status']) => {
    try { await setMarketingSurveyStatus(id, status); toast.success(`Survey ${status}`); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Survey transition failed'); }
  };

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading marketing engagement…</div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Marketing Engagement</h1>
        <p className="mt-1 text-sm text-slate-500">Events, registrations, surveys, and response operations. Customer identities stay on the existing customer master.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {(['events', 'surveys'] as Tab[]).map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`px-4 py-2 text-sm font-medium ${tab === item ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500'}`}>
            {item === 'events' ? 'Events' : 'Surveys'}
          </button>
        ))}
      </div>

      {tab === 'events' ? (
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <form onSubmit={submitEvent} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Create event</h2>
            <input className="w-full rounded border p-2" placeholder="event-slug" value={eventForm.slug} onChange={(e) => setEventForm({ ...eventForm, slug: e.target.value })} required />
            <input className="w-full rounded border p-2" placeholder="Event name" value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} required />
            <textarea className="w-full rounded border p-2" placeholder="Description" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input type="datetime-local" className="rounded border p-2" value={eventForm.startsAt} onChange={(e) => setEventForm({ ...eventForm, startsAt: e.target.value })} required />
              <input type="datetime-local" className="rounded border p-2" value={eventForm.endsAt} onChange={(e) => setEventForm({ ...eventForm, endsAt: e.target.value })} required />
            </div>
            <input className="w-full rounded border p-2" placeholder="Venue" value={eventForm.venue} onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })} />
            <input type="number" min="1" className="w-full rounded border p-2" placeholder="Capacity" value={eventForm.capacity} onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })} />
            <button disabled={saving} className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Create draft</button>
          </form>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Event</th><th className="p-3">Schedule</th><th className="p-3">Capacity</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                <tbody>{events.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="p-3"><button onClick={() => void loadRegistrations(item.id)} className="font-medium text-slate-900 underline-offset-2 hover:underline">{item.name}</button><div className="text-xs text-slate-500">{item.venue || item.slug}</div></td>
                    <td className="p-3 text-slate-600">{formatDate(item.starts_at)}</td>
                    <td className="p-3">{item.occupied_seats}/{item.capacity ?? '∞'} <span className="text-xs text-slate-500">({item.registration_count} regs)</span></td>
                    <td className="p-3">{item.status}</td>
                    <td className="p-3 space-x-2">
                      {item.status === 'draft' && <button onClick={() => void transitionEvent(item.id, 'published')} className="text-xs font-medium">Publish</button>}
                      {item.status === 'published' && <button onClick={() => void transitionEvent(item.id, 'closed')} className="text-xs font-medium">Close</button>}
                      {['draft','published'].includes(item.status) && <button onClick={() => void transitionEvent(item.id, 'cancelled')} className="text-xs text-rose-600">Cancel</button>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            {selectedEvent && (
              <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                <form onSubmit={submitRegistration} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="font-semibold">Register — {selectedEvent.name}</h3>
                  <input className="w-full rounded border p-2" placeholder="Attendee name" value={registrationForm.attendeeName} onChange={(e) => setRegistrationForm({ ...registrationForm, attendeeName: e.target.value })} required />
                  <input type="email" className="w-full rounded border p-2" placeholder="Email" value={registrationForm.attendeeEmail} onChange={(e) => setRegistrationForm({ ...registrationForm, attendeeEmail: e.target.value })} />
                  <input className="w-full rounded border p-2" placeholder="Phone" value={registrationForm.attendeePhone} onChange={(e) => setRegistrationForm({ ...registrationForm, attendeePhone: e.target.value })} />
                  <input type="number" min="1" max="100" className="w-full rounded border p-2" value={registrationForm.seats} onChange={(e) => setRegistrationForm({ ...registrationForm, seats: e.target.value })} />
                  <button disabled={saving || selectedEvent.status !== 'published'} className="w-full rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50">Add registration</button>
                </form>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Attendee</th><th className="p-3">Seats</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                    <tbody>{registrations.map((registration) => <tr key={registration.id} className="border-t"><td className="p-3">{registration.attendee_name}<div className="text-xs text-slate-500">{registration.attendee_email || registration.attendee_phone || ''}</div></td><td className="p-3">{registration.seats}</td><td className="p-3">{registration.status}</td><td className="p-3 space-x-2">{registration.status === 'registered' && <><button onClick={() => void transitionRegistration(registration.id, 'checked_in')} className="text-xs font-medium">Check in</button><button onClick={() => void transitionRegistration(registration.id, 'cancelled')} className="text-xs text-rose-600">Cancel</button></>}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form onSubmit={submitSurvey} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">Create survey</h2>
            <input className="w-full rounded border p-2" placeholder="survey-slug" value={surveyForm.slug} onChange={(e) => setSurveyForm({ ...surveyForm, slug: e.target.value })} required />
            <input className="w-full rounded border p-2" placeholder="Survey title" value={surveyForm.title} onChange={(e) => setSurveyForm({ ...surveyForm, title: e.target.value })} required />
            <textarea className="w-full rounded border p-2" placeholder="Description" value={surveyForm.description} onChange={(e) => setSurveyForm({ ...surveyForm, description: e.target.value })} />
            <div className="space-y-3">{questions.map((question, index) => (
              <div key={index} className="space-y-2 rounded-lg border border-slate-200 p-3">
                <div className="flex gap-2"><select className="flex-1 rounded border p-2" value={question.type} onChange={(e) => updateQuestion(index, { type: e.target.value as MarketingSurveyQuestionType })}>{['short_text','long_text','single_choice','multiple_choice','rating','nps'].map((type) => <option key={type} value={type}>{type}</option>)}</select><button type="button" disabled={questions.length === 1} onClick={() => setQuestions((current) => current.filter((_, questionIndex) => questionIndex !== index))} className="text-xs text-rose-600 disabled:opacity-30">Remove</button></div>
                <input className="w-full rounded border p-2" placeholder={`Question ${index + 1}`} value={question.prompt} onChange={(e) => updateQuestion(index, { prompt: e.target.value })} required />
                {['single_choice','multiple_choice'].includes(question.type) && <input className="w-full rounded border p-2" placeholder="Options, comma separated" value={question.options} onChange={(e) => updateQuestion(index, { options: e.target.value })} required />}
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={question.required} onChange={(e) => updateQuestion(index, { required: e.target.checked })} />Required</label>
              </div>
            ))}</div>
            <button type="button" onClick={() => setQuestions((current) => [...current, emptyQuestion()])} className="text-sm font-medium">+ Add question</button>
            <button disabled={saving} className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Create draft survey</button>
          </form>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Survey</th><th className="p-3">Questions</th><th className="p-3">Responses</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                <tbody>{surveys.map((survey) => <tr key={survey.id} className="border-t"><td className="p-3"><button onClick={() => void loadResponses(survey.id)} className="font-medium hover:underline">{survey.title}</button><div className="text-xs text-slate-500">{survey.slug}</div></td><td className="p-3">{survey.question_count ?? 0}</td><td className="p-3">{survey.response_count ?? 0}</td><td className="p-3">{survey.status}</td><td className="p-3 space-x-2">{survey.status === 'draft' && <button onClick={() => void transitionSurvey(survey.id, 'published')} className="text-xs font-medium">Publish</button>}{survey.status === 'published' && <button onClick={() => void transitionSurvey(survey.id, 'closed')} className="text-xs font-medium">Close</button>}{survey.status !== 'archived' && <button onClick={() => void transitionSurvey(survey.id, 'archived')} className="text-xs text-rose-600">Archive</button>}</td></tr>)}</tbody>
              </table>
            </div>
            {selectedSurvey && <div className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-semibold">Responses — {selectedSurvey.title}</h3><div className="mt-3 space-y-2">{responses.length === 0 ? <p className="text-sm text-slate-500">No submitted responses yet.</p> : responses.map((response) => <div key={response.id} className="rounded border p-3 text-sm"><div className="font-medium">{response.customer_name || response.respondent_name || response.respondent_email || `Response #${response.id}`}</div><div className="mt-1 text-xs text-slate-500">{formatDate(response.submitted_at)} · {response.answers.length} answers</div></div>)}</div></div>}
          </div>
        </div>
      )}
    </div>
  );
}
