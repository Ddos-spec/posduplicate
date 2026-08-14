import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Archive,
  ArrowLeft,
  Braces,
  CheckCircle2,
  Database,
  Eye,
  FileJson,
  Flag,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings2,
  Sparkles,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import {
  applyStudioRules,
  createStudioField,
  createStudioRule,
  getStudioWorkspace,
  previewStudioRules,
  saveStudioValue,
  updateStudioFieldStatus,
  updateStudioRuleStatus,
  type StudioActionType,
  type StudioDataType,
  type StudioEntityType,
  type StudioRuleOperator,
  type StudioWorkspace,
} from '../services/studioService';

type Tab = 'fields' | 'rules' | 'evaluate' | 'audit';

const ENTITY_OPTIONS: Array<{ value: StudioEntityType; label: string }> = [
  { value: 'customer', label: 'Customer' },
  { value: 'crm_opportunity', label: 'CRM Opportunity' },
  { value: 'sales_order', label: 'Sales Order' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'equipment', label: 'Equipment' },
];

const jsonValue = (value: string) => {
  const normalized = value.trim();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  if (normalized !== '' && Number.isFinite(Number(normalized))) return Number(normalized);
  return normalized;
};

export default function StudioWorkspacePage() {
  const navigate = useNavigate();
  const { isDark } = useThemeStore();
  const [workspace, setWorkspace] = useState<StudioWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('fields');
  const [fieldForm, setFieldForm] = useState({
    entityType: 'customer' as StudioEntityType,
    fieldKey: '',
    label: '',
    dataType: 'text' as StudioDataType,
    isRequired: false,
    options: '',
  });
  const [valueForm, setValueForm] = useState({ fieldId: '', recordKey: '', value: '' });
  const [ruleForm, setRuleForm] = useState({
    entityType: 'customer' as StudioEntityType,
    name: '',
    triggerEvent: 'manual' as 'created' | 'updated' | 'status_changed' | 'manual',
    conditionField: '',
    operator: 'eq' as StudioRuleOperator,
    conditionValue: '',
    actionType: 'flag' as StudioActionType,
    actionField: '',
    actionValue: '',
    message: '',
  });
  const [evaluation, setEvaluation] = useState({
    entityType: 'customer' as StudioEntityType,
    triggerEvent: 'manual' as 'created' | 'updated' | 'status_changed' | 'manual',
    recordKey: 'customer:acceptance',
    data: '{\n  "segment": "priority",\n  "lifetime_value": 1500000\n}',
  });
  const [evaluationResult, setEvaluationResult] = useState<Record<string, unknown> | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setWorkspace(await getStudioWorkspace());
    } catch (cause) {
      console.error(cause);
      setError('Studio workspace gagal dimuat. Pastikan migrasi P3.8 sudah diterapkan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const activeFields = useMemo(
    () => workspace?.fields.filter((field) => field.status === 'active') || [],
    [workspace],
  );
  const selectedValueField = activeFields.find((field) => String(field.id) === valueForm.fieldId);

  const submitField = async () => {
    if (!fieldForm.fieldKey.trim() || !fieldForm.label.trim()) return toast.error('Field key dan label wajib diisi');
    setBusy(true);
    try {
      await createStudioField({
        ...fieldForm,
        fieldKey: fieldForm.fieldKey.trim(),
        label: fieldForm.label.trim(),
        options: fieldForm.options.split(',').map((option) => option.trim()).filter(Boolean),
      });
      setFieldForm((current) => ({ ...current, fieldKey: '', label: '', options: '', isRequired: false }));
      await load();
      toast.success('Custom field dibuat');
    } catch (cause) {
      console.error(cause);
      toast.error('Custom field gagal dibuat');
    } finally {
      setBusy(false);
    }
  };

  const submitValue = async () => {
    if (!selectedValueField || !valueForm.recordKey.trim()) return toast.error('Field dan record key wajib dipilih');
    let value: unknown = valueForm.value;
    if (selectedValueField.data_type === 'number') value = Number(valueForm.value);
    if (selectedValueField.data_type === 'boolean') value = valueForm.value === 'true';
    setBusy(true);
    try {
      await saveStudioValue({ fieldId: selectedValueField.id, recordKey: valueForm.recordKey.trim(), value });
      setValueForm((current) => ({ ...current, value: '' }));
      await load();
      toast.success('Record value tersimpan');
    } catch (cause) {
      console.error(cause);
      toast.error('Record value tidak valid atau gagal disimpan');
    } finally {
      setBusy(false);
    }
  };

  const submitRule = async () => {
    if (!ruleForm.name.trim() || !ruleForm.conditionField.trim()) return toast.error('Nama dan condition field wajib diisi');
    if (ruleForm.actionType === 'set_field' && !ruleForm.actionField.trim()) return toast.error('Target field wajib untuk set_field');
    if (ruleForm.actionType !== 'set_field' && !ruleForm.message.trim()) return toast.error('Pesan wajib untuk flag/approval');
    const condition = {
      field: ruleForm.conditionField.trim(),
      operator: ruleForm.operator,
      ...(ruleForm.operator === 'exists' ? {} : { value: jsonValue(ruleForm.conditionValue) }),
    };
    const action = ruleForm.actionType === 'set_field'
      ? { type: ruleForm.actionType, field: ruleForm.actionField.trim(), value: jsonValue(ruleForm.actionValue) }
      : { type: ruleForm.actionType, message: ruleForm.message.trim() };
    setBusy(true);
    try {
      await createStudioRule({
        entityType: ruleForm.entityType,
        name: ruleForm.name.trim(),
        triggerEvent: ruleForm.triggerEvent,
        condition,
        action,
      });
      setRuleForm((current) => ({ ...current, name: '', conditionField: '', conditionValue: '', actionField: '', actionValue: '', message: '' }));
      await load();
      toast.success('Rule dibuat sebagai draft');
    } catch (cause) {
      console.error(cause);
      toast.error('Rule gagal dibuat');
    } finally {
      setBusy(false);
    }
  };

  const evaluateRules = async (apply: boolean) => {
    let data: Record<string, unknown>;
    try {
      const parsed = JSON.parse(evaluation.data) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('object required');
      data = parsed as Record<string, unknown>;
    } catch {
      return toast.error('Evaluation data harus JSON object yang valid');
    }
    if (apply && !evaluation.recordKey.trim()) return toast.error('Record key wajib untuk apply');
    setBusy(true);
    try {
      const result = apply
        ? await applyStudioRules({ ...evaluation, recordKey: evaluation.recordKey.trim(), data })
        : await previewStudioRules({ entityType: evaluation.entityType, triggerEvent: evaluation.triggerEvent, data });
      setEvaluationResult(result as unknown as Record<string, unknown>);
      if (apply) await load();
      toast.success(apply ? 'Rule diterapkan dan diaudit' : 'Preview selesai tanpa mutasi');
    } catch (cause) {
      console.error(cause);
      toast.error('Evaluasi rule gagal');
    } finally {
      setBusy(false);
    }
  };

  const fieldStatus = async (id: string | number, status: 'active' | 'archived') => {
    setBusy(true);
    try {
      await updateStudioFieldStatus(id, status);
      await load();
    } catch (cause) {
      console.error(cause);
      toast.error('Status field gagal diperbarui');
    } finally { setBusy(false); }
  };

  const ruleStatus = async (id: string | number, status: 'draft' | 'active' | 'archived') => {
    setBusy(true);
    try {
      await updateStudioRuleStatus(id, status);
      await load();
    } catch (cause) {
      console.error(cause);
      toast.error('Status rule gagal diperbarui');
    } finally { setBusy(false); }
  };

  const surface = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-950';
  const card = isDark ? 'border-white/10 bg-slate-900/80' : 'border-slate-200 bg-white shadow-sm';
  const inset = isDark ? 'border-white/10 bg-slate-950' : 'border-slate-200 bg-slate-50';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const input = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 ${isDark ? 'border-white/10 bg-slate-950 text-white placeholder:text-slate-600' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'}`;
  const label = `mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] ${muted}`;

  if (loading && !workspace) return <div className={`flex min-h-screen items-center justify-center ${surface}`}><Loader2 className="h-8 w-8 animate-spin text-violet-500" aria-label="Loading Studio" /></div>;

  return (
    <div className={`min-h-screen ${surface}`}>
      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${isDark ? 'border-white/10 bg-slate-950/90' : 'border-slate-200 bg-white/90'}`}>
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => navigate('/module-selector')} className={`rounded-xl border p-2.5 transition focus:outline-none focus:ring-4 focus:ring-violet-500/20 ${inset}`} aria-label="Back to app selector"><ArrowLeft size={18} /></button>
            <div className="min-w-0"><h1 className="truncate text-xl font-black tracking-tight">Studio Configuration</h1><p className={`truncate text-xs ${muted}`}>Fields → Values → Rules → Audited execution</p></div>
          </div>
          <button disabled={loading} onClick={() => void load()} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-violet-500/20 disabled:opacity-50 ${inset}`}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh</button>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 sm:px-6">
        <section className={`overflow-hidden rounded-3xl border ${card}`}>
          <div className="grid gap-6 p-5 lg:grid-cols-[1.25fr_0.75fr] lg:p-7">
            <div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300"><Sparkles size={14} />P3.8 accepted model</div><h2 className="max-w-3xl text-2xl font-black tracking-tight sm:text-3xl">Customization without executable code.</h2><p className={`mt-3 max-w-3xl text-sm leading-6 ${muted}`}>Tenant-scoped fields and a whitelisted rule DSL. Preview never mutates records; Apply persists controlled outputs and immutable execution evidence.</p></div>
            <div className="grid grid-cols-3 gap-2">{([
              ['Active fields', workspace?.summary.activeFields || 0, Database],
              ['Active rules', workspace?.summary.activeRules || 0, Workflow],
              ['Needs review', workspace?.summary.reviewRequired || 0, Flag],
            ] as Array<[string, number, LucideIcon]>).map(([title, value, Icon]) => <div key={title} className={`rounded-2xl border p-3 ${inset}`}><Icon size={17} className="mb-3 text-violet-500" /><p className="text-2xl font-black">{String(value)}</p><p className={`mt-1 text-[11px] ${muted}`}>{title}</p></div>)}</div>
          </div>
        </section>

        {error && <section role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">{error}</section>}

        <nav className={`flex gap-2 overflow-x-auto rounded-2xl border p-2 ${card}`} aria-label="Studio sections">{([
          ['fields', 'Fields & values', Settings2],
          ['rules', 'Workflow rules', Workflow],
          ['evaluate', 'Preview & apply', Play],
          ['audit', 'Audit trail', FileJson],
        ] as Array<[Tab, string, typeof Settings2]>).map(([value, title, Icon]) => <button key={value} onClick={() => setTab(value)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-violet-500/20 ${tab === value ? 'bg-violet-600 text-white' : isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}><Icon size={16} />{title}</button>)}</nav>

        {tab === 'fields' && <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
          <div className="space-y-5">
            <section className={`rounded-2xl border p-5 ${card}`}><div className="mb-5 flex items-center gap-2"><Plus size={18} className="text-violet-500" /><h2 className="font-black">Create custom field</h2></div><div className="grid gap-4 sm:grid-cols-2">
              <label><span className={label}>Entity</span><select className={input} value={fieldForm.entityType} onChange={(event) => setFieldForm({ ...fieldForm, entityType: event.target.value as StudioEntityType })}>{ENTITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label><span className={label}>Data type</span><select className={input} value={fieldForm.dataType} onChange={(event) => setFieldForm({ ...fieldForm, dataType: event.target.value as StudioDataType })}>{['text','number','boolean','date','select'].map((value) => <option key={value}>{value}</option>)}</select></label>
              <label><span className={label}>Field key</span><input className={input} placeholder="priority_segment" value={fieldForm.fieldKey} onChange={(event) => setFieldForm({ ...fieldForm, fieldKey: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} /></label>
              <label><span className={label}>Label</span><input className={input} placeholder="Priority segment" value={fieldForm.label} onChange={(event) => setFieldForm({ ...fieldForm, label: event.target.value })} /></label>
              {fieldForm.dataType === 'select' && <label className="sm:col-span-2"><span className={label}>Options, comma separated</span><input className={input} placeholder="standard, priority, strategic" value={fieldForm.options} onChange={(event) => setFieldForm({ ...fieldForm, options: event.target.value })} /></label>}
              <label className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold sm:col-span-2 ${inset}`}><input type="checkbox" checked={fieldForm.isRequired} onChange={(event) => setFieldForm({ ...fieldForm, isRequired: event.target.checked })} className="h-4 w-4 accent-violet-600" />Required value</label>
            </div><button disabled={busy} onClick={() => void submitField()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/25 disabled:opacity-50"><Plus size={16} />Create field</button></section>

            <section className={`rounded-2xl border p-5 ${card}`}><div className="mb-5 flex items-center gap-2"><Database size={18} className="text-cyan-500" /><h2 className="font-black">Set record value</h2></div><div className="space-y-4">
              <label><span className={label}>Active field</span><select className={input} value={valueForm.fieldId} onChange={(event) => setValueForm({ ...valueForm, fieldId: event.target.value, value: '' })}><option value="">Select field</option>{activeFields.map((field) => <option key={String(field.id)} value={String(field.id)}>{field.entity_type} · {field.label}</option>)}</select></label>
              <label><span className={label}>Record key</span><input className={input} placeholder="customer:123" value={valueForm.recordKey} onChange={(event) => setValueForm({ ...valueForm, recordKey: event.target.value })} /></label>
              <label><span className={label}>Value</span>{selectedValueField?.data_type === 'boolean' ? <select className={input} value={valueForm.value} onChange={(event) => setValueForm({ ...valueForm, value: event.target.value })}><option value="">Select boolean</option><option value="true">true</option><option value="false">false</option></select> : selectedValueField?.data_type === 'select' ? <select className={input} value={valueForm.value} onChange={(event) => setValueForm({ ...valueForm, value: event.target.value })}><option value="">Select option</option>{selectedValueField.options.map((option) => <option key={option}>{option}</option>)}</select> : <input className={input} type={selectedValueField?.data_type === 'number' ? 'number' : selectedValueField?.data_type === 'date' ? 'date' : 'text'} value={valueForm.value} onChange={(event) => setValueForm({ ...valueForm, value: event.target.value })} />}</label>
            </div><button disabled={busy || !selectedValueField} onClick={() => void submitValue()} className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-cyan-500/20 disabled:opacity-50 ${inset}`}><CheckCircle2 size={16} />Save typed value</button></section>
          </div>

          <section className={`rounded-2xl border ${card}`}><div className="border-b border-inherit p-5"><h2 className="font-black">Field registry</h2><p className={`mt-1 text-xs ${muted}`}>Archived fields retain existing values and audit history.</p></div><div className="divide-y divide-inherit">{workspace?.fields.length ? workspace.fields.map((field) => <article key={String(field.id)} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-black">{field.label}</p><code className={`rounded-lg border px-2 py-1 text-[11px] ${inset}`}>{field.field_key}</code><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${field.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : 'bg-slate-500/10 text-slate-500'}`}>{field.status}</span></div><p className={`mt-1 text-xs ${muted}`}>{field.entity_type} · {field.data_type}{field.is_required ? ' · required' : ''}{field.options.length ? ` · ${field.options.join(', ')}` : ''}</p></div><button disabled={busy} onClick={() => void fieldStatus(field.id, field.status === 'active' ? 'archived' : 'active')} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-violet-500/20 disabled:opacity-50 ${inset}`}>{field.status === 'active' ? <Archive size={14} /> : <RotateCcw size={14} />}{field.status === 'active' ? 'Archive' : 'Restore'}</button></article>) : <p className={`p-8 text-center text-sm ${muted}`}>Belum ada custom field.</p>}</div></section>
        </div>}

        {tab === 'rules' && <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <section className={`rounded-2xl border p-5 ${card}`}><div className="mb-5 flex items-center gap-2"><Workflow size={18} className="text-violet-500" /><h2 className="font-black">Create deterministic rule</h2></div><div className="grid gap-4 sm:grid-cols-2">
            <label><span className={label}>Entity</span><select className={input} value={ruleForm.entityType} onChange={(event) => setRuleForm({ ...ruleForm, entityType: event.target.value as StudioEntityType })}>{ENTITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label><span className={label}>Trigger</span><select className={input} value={ruleForm.triggerEvent} onChange={(event) => setRuleForm({ ...ruleForm, triggerEvent: event.target.value as typeof ruleForm.triggerEvent })}>{['manual','created','updated','status_changed'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="sm:col-span-2"><span className={label}>Rule name</span><input className={input} placeholder="High-value customer review" value={ruleForm.name} onChange={(event) => setRuleForm({ ...ruleForm, name: event.target.value })} /></label>
            <label><span className={label}>Condition field</span><input className={input} placeholder="lifetime_value" value={ruleForm.conditionField} onChange={(event) => setRuleForm({ ...ruleForm, conditionField: event.target.value })} /></label>
            <label><span className={label}>Operator</span><select className={input} value={ruleForm.operator} onChange={(event) => setRuleForm({ ...ruleForm, operator: event.target.value as StudioRuleOperator })}>{['eq','neq','gt','gte','lt','lte','contains','exists'].map((value) => <option key={value}>{value}</option>)}</select></label>
            {ruleForm.operator !== 'exists' && <label className="sm:col-span-2"><span className={label}>Comparison value</span><input className={input} placeholder="1000000" value={ruleForm.conditionValue} onChange={(event) => setRuleForm({ ...ruleForm, conditionValue: event.target.value })} /></label>}
            <label><span className={label}>Action</span><select className={input} value={ruleForm.actionType} onChange={(event) => setRuleForm({ ...ruleForm, actionType: event.target.value as StudioActionType })}>{['flag','require_approval','set_field'].map((value) => <option key={value}>{value}</option>)}</select></label>
            {ruleForm.actionType === 'set_field' ? <><label><span className={label}>Target field</span><input className={input} placeholder="priority_segment" value={ruleForm.actionField} onChange={(event) => setRuleForm({ ...ruleForm, actionField: event.target.value })} /></label><label className="sm:col-span-2"><span className={label}>Target value</span><input className={input} placeholder="priority" value={ruleForm.actionValue} onChange={(event) => setRuleForm({ ...ruleForm, actionValue: event.target.value })} /></label></> : <label className="sm:col-span-2"><span className={label}>Review message</span><input className={input} placeholder="Owner review required" value={ruleForm.message} onChange={(event) => setRuleForm({ ...ruleForm, message: event.target.value })} /></label>}
          </div><button disabled={busy} onClick={() => void submitRule()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/25 disabled:opacity-50"><Plus size={16} />Create draft rule</button></section>

          <section className={`rounded-2xl border ${card}`}><div className="border-b border-inherit p-5"><h2 className="font-black">Rule registry</h2><p className={`mt-1 text-xs ${muted}`}>Only active rules participate in preview/apply.</p></div><div className="divide-y divide-inherit">{workspace?.rules.length ? workspace.rules.map((rule) => <article key={String(rule.id)} className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-black">{rule.name}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${rule.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : rule.status === 'draft' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300' : 'bg-slate-500/10 text-slate-500'}`}>{rule.status}</span></div><p className={`mt-1 text-xs ${muted}`}>{rule.entity_type} · {rule.trigger_event}</p><div className={`mt-3 rounded-xl border p-3 font-mono text-xs ${inset}`}><p>IF {rule.condition.field} {rule.condition.operator} {rule.condition.value === undefined ? '—' : JSON.stringify(rule.condition.value)}</p><p className="mt-1 text-violet-600 dark:text-violet-300">THEN {rule.action.type} {rule.action.field || rule.action.message || ''}</p></div></div><div className="flex shrink-0 gap-2">{rule.status !== 'active' && <button disabled={busy || rule.status === 'archived'} onClick={() => void ruleStatus(rule.id, 'active')} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-40">Activate</button>}{rule.status !== 'archived' && <button disabled={busy} onClick={() => void ruleStatus(rule.id, 'archived')} className={`rounded-xl border px-3 py-2 text-xs font-black transition focus:outline-none focus:ring-4 focus:ring-violet-500/20 ${inset}`}>Archive</button>}</div></div></article>) : <p className={`p-8 text-center text-sm ${muted}`}>Belum ada workflow rule.</p>}</div></section>
        </div>}

        {tab === 'evaluate' && <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <section className={`rounded-2xl border p-5 ${card}`}><div className="mb-5 flex items-center gap-2"><Braces size={18} className="text-cyan-500" /><h2 className="font-black">Evaluate active rules</h2></div><div className="grid gap-4 sm:grid-cols-2"><label><span className={label}>Entity</span><select className={input} value={evaluation.entityType} onChange={(event) => setEvaluation({ ...evaluation, entityType: event.target.value as StudioEntityType })}>{ENTITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label><span className={label}>Trigger</span><select className={input} value={evaluation.triggerEvent} onChange={(event) => setEvaluation({ ...evaluation, triggerEvent: event.target.value as typeof evaluation.triggerEvent })}>{['manual','created','updated','status_changed'].map((value) => <option key={value}>{value}</option>)}</select></label><label className="sm:col-span-2"><span className={label}>Record key</span><input className={input} value={evaluation.recordKey} onChange={(event) => setEvaluation({ ...evaluation, recordKey: event.target.value })} /></label><label className="sm:col-span-2"><span className={label}>Input JSON</span><textarea rows={10} className={`${input} font-mono`} value={evaluation.data} onChange={(event) => setEvaluation({ ...evaluation, data: event.target.value })} /></label></div><div className="mt-4 grid grid-cols-2 gap-3"><button disabled={busy} onClick={() => void evaluateRules(false)} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-cyan-500/20 disabled:opacity-50 ${inset}`}><Eye size={16} />Preview only</button><button disabled={busy} onClick={() => void evaluateRules(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/25 disabled:opacity-50"><Play size={16} />Apply + audit</button></div></section>
          <section className={`rounded-2xl border p-5 ${card}`}><div className="mb-4 flex items-center gap-2"><FileJson size={18} className="text-violet-500" /><h2 className="font-black">Evaluation receipt</h2></div>{evaluationResult ? <pre className={`max-h-[620px] overflow-auto whitespace-pre-wrap rounded-2xl border p-4 text-xs leading-6 ${inset}`}>{JSON.stringify(evaluationResult, null, 2)}</pre> : <div className={`flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center ${inset}`}><Eye className={`mb-3 ${muted}`} /><p className="font-black">No evaluation yet</p><p className={`mt-1 max-w-sm text-xs ${muted}`}>Preview proves which rules match. Apply additionally stores immutable execution evidence and typed field mutations.</p></div>}</section>
        </div>}

        {tab === 'audit' && <section className={`rounded-2xl border ${card}`}><div className="border-b border-inherit p-5"><h2 className="font-black">Immutable execution receipts</h2><p className={`mt-1 text-xs ${muted}`}>Latest 50 executions; update/delete is blocked by the database.</p></div><div className="divide-y divide-inherit">{workspace?.executions.length ? workspace.executions.map((execution) => <article key={String(execution.id)} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="font-black">{execution.rule_name || execution.ruleName || `Rule ${execution.rule_id}`}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${execution.execution_status === 'review_required' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300' : execution.execution_status === 'applied' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : 'bg-slate-500/10 text-slate-500'}`}>{execution.execution_status}</span></div><p className={`mt-1 text-xs ${muted}`}>{execution.entity_type} · {execution.record_key}</p></div><code className={`max-w-lg truncate rounded-xl border px-3 py-2 text-[11px] ${inset}`}>{JSON.stringify(execution.output)}</code></article>) : <p className={`p-8 text-center text-sm ${muted}`}>Belum ada rule execution.</p>}</div></section>}
      </main>
    </div>
  );
}
