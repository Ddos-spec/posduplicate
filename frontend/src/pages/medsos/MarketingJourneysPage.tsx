import { type FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  createMarketingJourney,
  getMarketingJourneys,
  setMarketingJourneyStatus,
  type MarketingJourney,
  type MarketingJourneyStepType,
  type MarketingJourneyTriggerType,
} from '../../services/marketingEngagementService';

type StepDraft = { type: MarketingJourneyStepType; config: string };
const newStep = (): StepDraft => ({ type: 'wait', config: '{"minutes":60}' });

const parseObject = (value: string, label: string) => {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`${label} harus JSON object.`);
  return parsed as Record<string, unknown>;
};

export default function MarketingJourneysPage() {
  const [journeys, setJourneys] = useState<MarketingJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', triggerType: 'manual' as MarketingJourneyTriggerType, triggerConfig: '{}', audienceFilter: '{}' });
  const [steps, setSteps] = useState<StepDraft[]>([newStep()]);

  const load = async () => {
    setLoading(true);
    try { setJourneys(await getMarketingJourneys()); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Gagal memuat marketing journeys'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createMarketingJourney({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        triggerType: form.triggerType,
        triggerConfig: parseObject(form.triggerConfig, 'Trigger config'),
        audienceFilter: parseObject(form.audienceFilter, 'Audience filter'),
        steps: steps.map((step) => ({ type: step.type, config: parseObject(step.config, 'Step config') })),
      });
      toast.success('Journey draft dibuat');
      setForm({ name: '', description: '', triggerType: 'manual', triggerConfig: '{}', audienceFilter: '{}' });
      setSteps([newStep()]);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || error?.message || 'Gagal membuat journey');
    } finally { setSaving(false); }
  };

  const transition = async (id: number, status: MarketingJourney['status']) => {
    try {
      await setMarketingJourneyStatus(id, status);
      toast.success(`Journey ${status}`);
      await load();
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Journey transition gagal'); }
  };

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading journeys…</div>;

  return <div className="space-y-5">
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Journey di workspace ini bersifat declarative lifecycle. Status <b>active</b> belum mengeksekusi broadcast/DM eksternal; deployment ke channel messaging harus melalui action eksplisit terpisah.
    </div>
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <form onSubmit={submit} className="space-y-3 rounded-2xl border bg-white p-5">
        <h2 className="text-lg font-bold">Create journey</h2>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Journey name" className="w-full rounded-xl border px-3 py-2.5" />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="min-h-20 w-full rounded-xl border px-3 py-2.5" />
        <select value={form.triggerType} onChange={(e) => setForm({ ...form, triggerType: e.target.value as MarketingJourneyTriggerType })} className="w-full rounded-xl border px-3 py-2.5">
          {['manual','event_registration','survey_submitted','customer_created','scheduled'].map((trigger) => <option key={trigger} value={trigger}>{trigger}</option>)}
        </select>
        <textarea value={form.triggerConfig} onChange={(e) => setForm({ ...form, triggerConfig: e.target.value })} className="min-h-20 w-full rounded-xl border px-3 py-2 font-mono text-xs" placeholder="Trigger config JSON" />
        <textarea value={form.audienceFilter} onChange={(e) => setForm({ ...form, audienceFilter: e.target.value })} className="min-h-20 w-full rounded-xl border px-3 py-2 font-mono text-xs" placeholder="Audience filter JSON" />
        <div className="space-y-3">
          {steps.map((step, index) => <div key={index} className="rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <select value={step.type} onChange={(e) => setSteps((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, type: e.target.value as MarketingJourneyStepType } : item))} className="flex-1 rounded-lg border px-2 py-2">
                {['wait','broadcast','tag','notify'].map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <button type="button" disabled={steps.length === 1} onClick={() => setSteps((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-rose-600 disabled:opacity-30">Remove</button>
            </div>
            <textarea value={step.config} onChange={(e) => setSteps((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, config: e.target.value } : item))} className="mt-2 min-h-20 w-full rounded-lg border px-2 py-2 font-mono text-xs" placeholder="Step config JSON" />
          </div>)}
        </div>
        <button type="button" onClick={() => setSteps((current) => [...current, newStep()])} className="text-sm font-semibold">+ Add step</button>
        <button disabled={saving} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Create draft'}</button>
      </form>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Journey</th><th className="p-3">Trigger</th><th className="p-3">Steps</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
          <tbody>{journeys.map((journey) => <tr key={journey.id} className="border-t">
            <td className="p-3"><div className="font-semibold">{journey.name}</div><div className="text-xs text-slate-500">{journey.description || '—'}</div></td>
            <td className="p-3">{journey.trigger_type}</td>
            <td className="p-3">{journey.step_count ?? 0}</td>
            <td className="p-3">{journey.status}</td>
            <td className="p-3 space-x-2">
              {journey.status === 'draft' && <button onClick={() => void transition(journey.id, 'active')} className="text-xs font-semibold">Activate</button>}
              {journey.status === 'active' && <button onClick={() => void transition(journey.id, 'paused')} className="text-xs font-semibold">Pause</button>}
              {journey.status === 'paused' && <button onClick={() => void transition(journey.id, 'active')} className="text-xs font-semibold">Resume</button>}
              {journey.status !== 'archived' && <button onClick={() => void transition(journey.id, 'archived')} className="text-xs text-rose-600">Archive</button>}
            </td>
          </tr>)}</tbody>
        </table>
        {journeys.length === 0 && <p className="p-6 text-sm text-slate-500">Belum ada journey.</p>}
      </div>
    </div>
  </div>;
}
