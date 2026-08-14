import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Bot,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Gauge,
  Loader2,
  PackagePlus,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import {
  approveAgentAction,
  askIntelligenceCopilot,
  executeAgentAction,
  getIntelligenceDashboard,
  rejectAgentAction,
  requestReplenishmentAction,
  runIntelligenceAnalysis,
  type AgentAction,
  type CopilotResponse,
  type IntelligenceDashboard,
  type ReplenishmentRecommendation,
} from '../services/intelligenceService';

type Tab = 'overview' | 'findings' | 'actions' | 'copilot';

const money = (value: unknown) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const dateTime = (value: unknown) => value
  ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(String(value)))
  : '—';

const severityStyle: Record<string, string> = {
  critical: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-300',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  low: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  info: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
};

const actionStyle: Record<AgentAction['status'], string> = {
  pending_approval: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  approved: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  rejected: 'bg-slate-500/10 text-slate-500',
  executing: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  failed: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  cancelled: 'bg-slate-500/10 text-slate-500',
};

export default function IntelligenceWorkspacePage() {
  const navigate = useNavigate();
  const { isDark } = useThemeStore();
  const [dashboard, setDashboard] = useState<IntelligenceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [question, setQuestion] = useState('Apa risiko stok dan rekomendasi replenishment saat ini?');
  const [copilot, setCopilot] = useState<CopilotResponse | null>(null);
  const pendingRequestKeys = useRef<Record<number, string>>({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setDashboard(await getIntelligenceDashboard());
    } catch (cause) {
      console.error(cause);
      setError('Intelligence workspace gagal dimuat. Pastikan migrasi P4 sudah diterapkan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const findings = useMemo(
    () => dashboard?.latestRun ? dashboard.findings : dashboard?.snapshot.findings || [],
    [dashboard],
  );
  const findingForInventory = (inventoryId: number) => findings.find((finding) =>
    String(finding.entity_id || finding.entityId || '') === String(inventoryId)
      && String(finding.finding_type || finding.findingType || '') === 'replenishment');

  const summary = useMemo(() => ({
    critical: findings.filter((finding) => finding.severity === 'critical').length,
    high: findings.filter((finding) => finding.severity === 'high').length,
    awaiting: dashboard?.actions.filter((action) => action.status === 'pending_approval').length || 0,
    completed: dashboard?.actions.filter((action) => action.status === 'completed').length || 0,
  }), [dashboard?.actions, findings]);

  const runAnalysis = async () => {
    setBusy('run');
    try {
      await runIntelligenceAnalysis();
      await load();
      toast.success('Evidence run disimpan');
    } catch (cause) {
      console.error(cause);
      toast.error('Analysis run gagal');
    } finally { setBusy(''); }
  };

  const requestAction = async (recommendation: ReplenishmentRecommendation) => {
    if (!recommendation.supplierId) return toast.error('Hubungkan supplier aktif sebelum meminta RFQ');
    const finding = findingForInventory(recommendation.inventoryId);
    setBusy(`request:${recommendation.inventoryId}`);
    try {
      const idempotencyKey = pendingRequestKeys.current[recommendation.inventoryId]
        || `replenishment:${recommendation.inventoryId}:${crypto.randomUUID()}`;
      pendingRequestKeys.current[recommendation.inventoryId] = idempotencyKey;
      await requestReplenishmentAction(recommendation.inventoryId, finding?.id, idempotencyKey);
      delete pendingRequestKeys.current[recommendation.inventoryId];
      await load();
      setTab('actions');
      toast.success('Action menunggu approval eksplisit');
    } catch (cause) {
      console.error(cause);
      toast.error('Action request gagal atau evidence sudah berubah');
    } finally { setBusy(''); }
  };

  const review = async (action: AgentAction, decision: 'approve' | 'reject') => {
    const note = (reviewNotes[String(action.id)] || '').trim();
    if (note.length < 4) return toast.error('Tulis review note minimal 4 karakter');
    setBusy(`${decision}:${action.id}`);
    try {
      if (decision === 'approve') await approveAgentAction(action.id, note);
      else await rejectAgentAction(action.id, note);
      await load();
      toast.success(decision === 'approve' ? 'Approved; execution tetap terpisah' : 'Action ditolak');
    } catch (cause) {
      console.error(cause);
      toast.error('Review action gagal');
    } finally { setBusy(''); }
  };

  const execute = async (action: AgentAction) => {
    setBusy(`execute:${action.id}`);
    try {
      await executeAgentAction(action.id);
      await load();
      toast.success('Draft RFQ tercipta dari payload yang disetujui');
    } catch (cause) {
      console.error(cause);
      await load();
      toast.error('Eksekusi ditahan: evidence berubah atau operasi gagal');
    } finally { setBusy(''); }
  };

  const ask = async () => {
    if (question.trim().length < 3) return toast.error('Pertanyaan terlalu pendek');
    setBusy('copilot');
    try {
      setCopilot(await askIntelligenceCopilot(question.trim()));
    } catch (cause) {
      console.error(cause);
      toast.error('Evidence Copilot gagal menjawab');
    } finally { setBusy(''); }
  };

  const surface = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-950';
  const card = isDark ? 'border-white/10 bg-slate-900/80' : 'border-slate-200 bg-white shadow-sm';
  const inset = isDark ? 'border-white/10 bg-slate-950' : 'border-slate-200 bg-slate-50';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const input = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 ${isDark ? 'border-white/10 bg-slate-950 text-white placeholder:text-slate-600' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'}`;

  if (loading && !dashboard) return <div className={`flex min-h-screen items-center justify-center ${surface}`}><Loader2 className="h-8 w-8 animate-spin text-cyan-500" aria-label="Loading Intelligence" /></div>;

  const snapshot = dashboard?.snapshot;
  return (
    <div className={`min-h-screen ${surface}`}>
      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${isDark ? 'border-white/10 bg-slate-950/90' : 'border-slate-200 bg-white/90'}`}>
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><button onClick={() => navigate('/module-selector')} className={`rounded-xl border p-2.5 transition focus:outline-none focus:ring-4 focus:ring-cyan-500/20 ${inset}`} aria-label="Back to app selector"><ArrowLeft size={18} /></button><div className="min-w-0"><h1 className="truncate text-xl font-black tracking-tight">Decision Intelligence</h1><p className={`truncate text-xs ${muted}`}>Observe → Explain → Approve → Execute → Audit</p></div></div>
          <div className="flex gap-2"><button disabled={loading} onClick={() => void load()} className={`rounded-xl border p-2.5 transition focus:outline-none focus:ring-4 focus:ring-cyan-500/20 disabled:opacity-50 ${inset}`} aria-label="Refresh intelligence"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button><button disabled={busy !== ''} onClick={() => void runAnalysis()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-3 py-2.5 text-sm font-black text-white transition hover:bg-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/25 disabled:opacity-50">{busy === 'run' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}Run evidence</button></div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 sm:px-6">
        <section className={`overflow-hidden rounded-3xl border ${card}`}><div className="grid gap-6 p-5 lg:grid-cols-[1.25fr_0.75fr] lg:p-7"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-300"><BadgeCheck size={14} />P4 evidence contract</div><h2 className="max-w-3xl text-2xl font-black tracking-tight sm:text-3xl">Decisions grounded in source data—not AI theater.</h2><p className={`mt-3 max-w-3xl text-sm leading-6 ${muted}`}>Observed records and derived calculations remain separate. Unknown bank balances stay Unavailable. Operational RFQs require a persisted request, explicit review, separate execution, and immutable receipts.</p></div><div className="grid grid-cols-2 gap-2">{([
            ['Critical', summary.critical, AlertTriangle, 'text-rose-500'],
            ['High', summary.high, TrendingDown, 'text-orange-500'],
            ['Awaiting', summary.awaiting, ClipboardCheck, 'text-amber-500'],
            ['Completed', summary.completed, Check, 'text-emerald-500'],
          ] as Array<[string, string | number, LucideIcon, string]>).map(([title, value, Icon, color]) => <div key={title} className={`rounded-2xl border p-3 ${inset}`}><Icon size={17} className={`mb-3 ${color}`} /><p className="text-2xl font-black">{String(value)}</p><p className={`mt-1 text-[11px] ${muted}`}>{title}</p></div>)}</div></div></section>

        {error && <section role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">{error}</section>}

        <section className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-3 ${card}`}><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">Observed</p><p className={`mt-2 text-xs leading-5 ${muted}`}>{snapshot?.provenance.observed.join(' · ') || '—'}</p></div><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Derived</p><p className={`mt-2 text-xs leading-5 ${muted}`}>{snapshot?.provenance.derived.join(' · ') || '—'}</p></div><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Unavailable</p><p className={`mt-2 text-xs leading-5 ${muted}`}>{snapshot?.provenance.unavailable.join(' · ') || '—'}</p></div></section>

        <nav className={`flex gap-2 overflow-x-auto rounded-2xl border p-2 ${card}`} aria-label="Intelligence sections">{([
          ['overview', 'Overview', Gauge],
          ['findings', 'Findings', AlertTriangle],
          ['actions', 'Controlled actions', ShieldCheck],
          ['copilot', 'Evidence Copilot', Bot],
        ] as Array<[Tab, string, typeof Gauge]>).map(([value, title, Icon]) => <button key={value} onClick={() => setTab(value)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-cyan-500/20 ${tab === value ? 'bg-cyan-600 text-white' : isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}><Icon size={16} />{title}</button>)}</nav>

        {tab === 'overview' && snapshot && <div className="space-y-5">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
            ['Sales · 30 days', money(snapshot.sales.last30Days), snapshot.sales.changeRate !== null && snapshot.sales.changeRate >= 0 ? TrendingUp : TrendingDown, 'Observed completed transactions'],
            ['Scheduled net · 30d', money(snapshot.cashflow.scheduledNet30), CircleDollarSign, 'Derived AR due minus AP due'],
            ['Margin leakage', String(snapshot.margin.leakageCount), AlertTriangle, `${snapshot.margin.assessedItems} item masters assessed`],
            ['Replenishment', String(snapshot.demand.replenishment.length), PackagePlus, `${snapshot.demand.assessedInventory} inventory records assessed`],
          ].map(([title, value, Icon, caption]) => <article key={String(title)} className={`rounded-2xl border p-4 ${card}`}><div className="flex items-center justify-between"><Icon size={18} className="text-cyan-500" /><span className={`text-[10px] font-black uppercase tracking-[0.12em] ${muted}`}>As of {dateTime(snapshot.dataCutoff)}</span></div><p className="mt-5 text-2xl font-black">{String(value)}</p><p className={`mt-1 text-xs font-bold ${muted}`}>{String(title)}</p><p className={`mt-3 border-t pt-3 text-[11px] ${isDark ? 'border-white/10 text-slate-500' : 'border-slate-100 text-slate-400'}`}>{String(caption)}</p></article>)}</section>

          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <section className={`rounded-2xl border p-5 ${card}`}><div className="flex items-center gap-2"><CircleDollarSign size={18} className="text-cyan-500" /><h2 className="font-black">Cashflow evidence</h2></div><div className="mt-5 space-y-3">{[
              ['Receivable due ≤30d', snapshot.cashflow.receivableDue30],
              ['Payable due ≤30d', snapshot.cashflow.payableDue30],
              ['Receivable overdue', snapshot.cashflow.receivableOverdue],
              ['Payable overdue', snapshot.cashflow.payableOverdue],
            ].map(([title, value]) => <div key={String(title)} className={`flex items-center justify-between rounded-xl border p-3 ${inset}`}><span className={`text-xs ${muted}`}>{String(title)}</span><span className="font-black">{money(value)}</span></div>)}</div><p className={`mt-4 rounded-xl border p-3 text-xs leading-5 ${inset} ${muted}`}>{snapshot.cashflow.interpretation}</p></section>

            <section className={`rounded-2xl border ${card}`}><div className="border-b border-inherit p-5"><h2 className="font-black">Replenishment recommendations</h2><p className={`mt-1 text-xs ${muted}`}>Target = max(minimum stock, 14 days × average daily usage).</p></div><div className="divide-y divide-inherit">{snapshot.demand.replenishment.length ? snapshot.demand.replenishment.slice(0, 12).map((recommendation) => <article key={recommendation.inventoryId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{recommendation.inventoryName}</p><p className={`mt-1 text-xs ${muted}`}>{recommendation.outletName} · {recommendation.currentStock} → {recommendation.targetStock} {recommendation.unit} · supplier {recommendation.supplierName || 'unavailable'}</p></div><div className="flex items-center gap-3"><div className="text-right"><p className="font-black text-cyan-600 dark:text-cyan-300">+{recommendation.recommendedQuantity} {recommendation.unit}</p><p className={`text-[10px] ${muted}`}>confidence {recommendation.averageDailyUsage > 0 ? '0.80' : '0.99'}</p></div><button disabled={busy !== '' || !recommendation.supplierId} onClick={() => void requestAction(recommendation)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-black text-white transition hover:bg-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40">{busy === `request:${recommendation.inventoryId}` ? <Loader2 size={14} className="animate-spin" /> : <PackagePlus size={14} />}Request RFQ</button></div></article>) : <p className={`p-8 text-center text-sm ${muted}`}>Tidak ada replenishment gap positif.</p>}</div></section>
          </div>
        </div>}

        {tab === 'findings' && <section className={`rounded-2xl border ${card}`}><div className="border-b border-inherit p-5"><h2 className="font-black">Latest persisted findings</h2><p className={`mt-1 text-xs ${muted}`}>{dashboard?.latestRun ? `Immutable run #${String(dashboard.latestRun.id)} · cutoff ${dateTime(dashboard.latestRun.data_cutoff)}` : 'No persisted run yet; showing current derived preview.'}</p></div><div className="divide-y divide-inherit">{findings.length ? findings.map((finding, index) => <article key={String(finding.id || `${finding.title}-${index}`)} className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${severityStyle[finding.severity] || severityStyle.info}`}>{finding.severity}</span><span className={`text-[10px] font-black uppercase tracking-[0.12em] ${muted}`}>{finding.finding_type || finding.findingType}</span></div><p className="mt-2 font-black">{finding.title}</p><p className={`mt-1 max-w-4xl text-xs leading-5 ${muted}`}>{finding.explanation}</p></div><div className={`shrink-0 rounded-xl border px-3 py-2 text-right ${inset}`}><p className="text-sm font-black">{(Number(finding.confidence) * 100).toFixed(0)}%</p><p className={`text-[10px] ${muted}`}>confidence</p></div></div><div className="mt-3 grid gap-2 lg:grid-cols-2"><code className={`overflow-auto rounded-xl border p-3 text-[11px] ${inset}`}>Observed {JSON.stringify(finding.observed)}</code><code className={`overflow-auto rounded-xl border p-3 text-[11px] ${inset}`}>Derived {JSON.stringify(finding.derived)}</code></div></article>) : <p className={`p-8 text-center text-sm ${muted}`}>Belum ada finding. Jalankan evidence run.</p>}</div></section>}

        {tab === 'actions' && <section className={`rounded-2xl border ${card}`}><div className="border-b border-inherit p-5"><h2 className="font-black">Approval-gated action ledger</h2><p className={`mt-1 text-xs ${muted}`}>Payload disnapshot saat request dan immutable. Evidence drift menghentikan execution.</p></div><div className="divide-y divide-inherit">{dashboard?.actions.length ? dashboard.actions.map((action) => <article key={String(action.id)} className="p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-black">Action #{String(action.id)} · Replenishment RFQ</p><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${actionStyle[action.status]}`}>{action.status}</span></div><p className={`mt-1 text-xs ${muted}`}>{String(action.payload.inventoryName || `Inventory ${action.payload.inventoryId}`)} · +{String(action.payload.recommendedQuantity || '—')} {String(action.payload.unit || '')} · cutoff {dateTime(action.payload.dataCutoff)}</p>{action.last_error && <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{action.last_error}</p>}{action.result && <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-300">Created {String(action.result.rfqNumber)} · quantity {String(action.result.quantity)}</p>}</div><p className={`shrink-0 text-[10px] ${muted}`}>{dateTime(action.requested_at)}</p></div>
            {(action.status === 'pending_approval' || action.status === 'failed') && <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_auto_auto]"><input className={input} placeholder="Review note (required)" value={reviewNotes[String(action.id)] || ''} onChange={(event) => setReviewNotes({ ...reviewNotes, [String(action.id)]: event.target.value })} /><button disabled={busy !== ''} onClick={() => void review(action, 'approve')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50"><Check size={14} />Approve</button>{action.status === 'pending_approval' && <button disabled={busy !== ''} onClick={() => void review(action, 'reject')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/20 disabled:opacity-50"><X size={14} />Reject</button>}</div>}
            {action.status === 'approved' && <button disabled={busy !== ''} onClick={() => void execute(action)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-50">{busy === `execute:${action.id}` ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}Execute approved payload</button>}
            <details className={`mt-4 rounded-xl border p-3 ${inset}`}><summary className="cursor-pointer text-xs font-bold focus:outline-none">Audit events ({action.events?.length || 0})</summary><pre className={`mt-3 overflow-auto whitespace-pre-wrap text-[10px] leading-5 ${muted}`}>{JSON.stringify(action.events || [], null, 2)}</pre></details>
          </article>) : <p className={`p-8 text-center text-sm ${muted}`}>Belum ada controlled action request.</p>}</div></section>}

        {tab === 'copilot' && <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <section className={`rounded-2xl border p-5 ${card}`}><div className="mb-4 flex items-center gap-2"><Bot size={19} className="text-cyan-500" /><h2 className="font-black">Ask evidence</h2></div><p className={`mb-4 text-xs leading-5 ${muted}`}>Keyword-routed deterministic answers only. No LLM claim, no hidden action, no instruction execution.</p><textarea rows={6} className={input} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Tanya sales, cashflow, margin, atau stock..." /><button disabled={busy !== ''} onClick={() => void ask()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-black text-white transition hover:bg-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/25 disabled:opacity-50">{busy === 'copilot' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}Ask Evidence Copilot</button><div className="mt-4 grid grid-cols-2 gap-2">{['Bagaimana posisi arus kas 30 hari?','Produk mana margin-nya bocor?','Berapa sales 30 hari?','Apa rekomendasi stok?'].map((prompt) => <button key={prompt} onClick={() => setQuestion(prompt)} className={`rounded-xl border p-3 text-left text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-cyan-500/20 ${inset}`}>{prompt}</button>)}</div></section>
          <section className={`rounded-2xl border p-5 ${card}`}>{copilot ? <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-300">{copilot.mode}</span><span className={`text-[10px] font-black uppercase ${muted}`}>{copilot.intent} · confidence {(copilot.confidence * 100).toFixed(0)}%</span></div><p className="mt-5 text-lg font-black leading-7">{copilot.answer}</p><div className="mt-5"><p className={`mb-2 text-[10px] font-black uppercase tracking-[0.14em] ${muted}`}>Evidence receipt</p><pre className={`max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border p-3 text-[11px] leading-5 ${inset}`}>{JSON.stringify(copilot.evidence, null, 2)}</pre></div><div className={`mt-4 rounded-xl border p-3 text-xs leading-5 ${inset} ${muted}`}><p className="font-black text-slate-700 dark:text-slate-200">Unavailable context</p><p className="mt-1">{copilot.limitations.join(' · ')}</p><p className="mt-2">Data cutoff {dateTime(copilot.dataCutoff)}</p></div></div> : <div className={`flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center ${inset}`}><Sparkles className={`mb-3 ${muted}`} /><p className="font-black">No answer yet</p><p className={`mt-1 max-w-md text-xs leading-5 ${muted}`}>Every answer identifies its source and limitations. Questions never trigger an operational mutation.</p></div>}</section>
        </div>}
      </main>
    </div>
  );
}
