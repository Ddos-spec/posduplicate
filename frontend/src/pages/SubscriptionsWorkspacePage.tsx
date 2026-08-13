import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Pause, Play, Plus, RefreshCw, Repeat2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SubscriptionAutomationPanel from './subscriptions/SubscriptionAutomationPanel';
import {
  createCustomerSubscription,
  createSubscriptionPlan,
  getCustomerSubscriptions,
  getSubscriptionCustomers,
  getSubscriptionItems,
  getSubscriptionPlans,
  getSubscriptionSummary,
  renewCustomerSubscription,
  setCustomerSubscriptionStatus,
  setSubscriptionPlanStatus,
  type CustomerOption,
  type CustomerSubscription,
  type ItemOption,
  type SubscriptionIntervalUnit,
  type SubscriptionPlan,
  type SubscriptionSummary,
} from '../services/subscriptionService';

const money = (value: number | string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
const today = () => new Date().toISOString().slice(0, 10);

export default function SubscriptionsWorkspacePage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<SubscriptionSummary>({ active_plans: 0, active_contracts: 0, monthly_recurring_revenue: 0, billed_total: 0 });
  const [tab, setTab] = useState<'contracts' | 'plans'>('contracts');
  const [planForm, setPlanForm] = useState({ code: '', name: '', intervalUnit: 'month' as SubscriptionIntervalUnit, intervalCount: 1, itemId: 0, quantity: 1, unitPrice: 0 });
  const [contractForm, setContractForm] = useState({ planId: 0, customerId: 0, startsOn: today(), notes: '' });

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const [planRows, subscriptionRows, customerRows, itemRows, summaryRow] = await Promise.all([
        getSubscriptionPlans(), getCustomerSubscriptions(), getSubscriptionCustomers(), getSubscriptionItems(), getSubscriptionSummary(),
      ]);
      setPlans(planRows);
      setSubscriptions(subscriptionRows);
      setCustomers(customerRows);
      setItems(itemRows.filter((item) => item.is_active !== false));
      setSummary(summaryRow);
    } catch {
      setError('Subscription data belum dapat dimuat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);

  const activePlans = useMemo(() => plans.filter((plan) => plan.status === 'active'), [plans]);
  const activeSubscriptions = useMemo(() => subscriptions.filter((row) => row.status === 'active'), [subscriptions]);

  const submitPlan = async () => {
    if (!planForm.code.trim() || !planForm.name.trim() || !planForm.itemId || planForm.quantity <= 0) return;
    setBusy(true); setError('');
    try {
      await createSubscriptionPlan({
        code: planForm.code.trim(), name: planForm.name.trim(), intervalUnit: planForm.intervalUnit,
        intervalCount: Number(planForm.intervalCount), currency: 'IDR',
        items: [{ itemId: Number(planForm.itemId), quantity: Number(planForm.quantity), ...(planForm.unitPrice > 0 ? { unitPrice: Number(planForm.unitPrice) } : {}) }],
      });
      setPlanForm({ code: '', name: '', intervalUnit: 'month', intervalCount: 1, itemId: 0, quantity: 1, unitPrice: 0 });
      await reload();
    } catch {
      setError('Plan gagal dibuat. Pastikan kode unik dan item berasal dari tenant ini.');
    } finally { setBusy(false); }
  };

  const submitContract = async () => {
    if (!contractForm.planId || !contractForm.customerId || !contractForm.startsOn) return;
    setBusy(true); setError('');
    try {
      await createCustomerSubscription({ planId: Number(contractForm.planId), customerId: Number(contractForm.customerId), startsOn: contractForm.startsOn, notes: contractForm.notes || undefined });
      setContractForm({ planId: 0, customerId: 0, startsOn: today(), notes: '' });
      await reload();
    } catch {
      setError('Kontrak gagal dibuat. Customer dan seluruh item plan harus berada pada outlet yang sama.');
    } finally { setBusy(false); }
  };

  const changePlan = async (id: number, status: 'active' | 'archived') => {
    setBusy(true); setError('');
    try { await setSubscriptionPlanStatus(id, status); await reload(); } catch { setError('Status plan gagal diperbarui.'); } finally { setBusy(false); }
  };

  const changeContract = async (id: number, status: 'active' | 'paused' | 'cancelled') => {
    setBusy(true); setError('');
    try { await setCustomerSubscriptionStatus(id, status); await reload(); } catch { setError('Status subscription gagal diperbarui.'); } finally { setBusy(false); }
  };

  const renew = async (id: number, expectedRenewalAt: string) => {
    setBusy(true); setError('');
    try { await renewCustomerSubscription(id, expectedRenewalAt); await reload(); } catch { setError('Renewal gagal. Kontrak harus aktif dan downstream sales/receivable harus valid.'); } finally { setBusy(false); }
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin" /></div>;

  return <main className="min-h-screen bg-slate-50 p-5 text-slate-900">
    <div className="mx-auto max-w-7xl">
      <button onClick={() => navigate('/module-selector')} className="mb-4 inline-flex items-center gap-2 text-sm font-bold"><ArrowLeft size={16} /> Suite</button>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-widest text-violet-600">P3 DIGITAL REVENUE</p><h1 className="text-3xl font-black">Subscriptions</h1><p className="mt-2 text-sm text-slate-600">Recurring contracts materialize into the existing sales-order and receivable sources of truth.</p></div>
        <button onClick={() => void reload()} className="rounded-lg border bg-white p-2" aria-label="Refresh"><RefreshCw size={18} /></button>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">Active contracts</p><p className="mt-1 text-2xl font-black">{summary.active_contracts || activeSubscriptions.length}</p></div>
        <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">Active plans</p><p className="mt-1 text-2xl font-black">{summary.active_plans || activePlans.length}</p></div>
        <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">Normalized MRR</p><p className="mt-1 text-2xl font-black">{money(summary.monthly_recurring_revenue)}</p></div>
        <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">Materialized billing</p><p className="mt-1 text-2xl font-black">{money(summary.billed_total)}</p></div>
      </section>

      {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
      <div className="mt-5"><SubscriptionAutomationPanel /></div>
      <div className="mt-6 flex gap-2"><button onClick={() => setTab('contracts')} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === 'contracts' ? 'bg-slate-900 text-white' : 'border bg-white'}`}>Contracts</button><button onClick={() => setTab('plans')} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === 'plans' ? 'bg-slate-900 text-white' : 'border bg-white'}`}>Plans</button></div>

      {tab === 'plans' ? <div className="mt-4 grid gap-5 lg:grid-cols-[380px_1fr]">
        <section className="rounded-2xl border bg-white p-4"><h2 className="font-black">Create recurring plan</h2><div className="mt-4 space-y-3">
          <input value={planForm.code} onChange={(e) => setPlanForm({ ...planForm, code: e.target.value })} placeholder="plan-code" className="w-full rounded-lg border px-3 py-2 text-sm" />
          <input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="Plan name" className="w-full rounded-lg border px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2"><input type="number" min={1} max={120} value={planForm.intervalCount} onChange={(e) => setPlanForm({ ...planForm, intervalCount: Number(e.target.value) })} className="rounded-lg border px-3 py-2 text-sm" /><select value={planForm.intervalUnit} onChange={(e) => setPlanForm({ ...planForm, intervalUnit: e.target.value as SubscriptionIntervalUnit })} className="rounded-lg border px-3 py-2 text-sm"><option value="day">day</option><option value="week">week</option><option value="month">month</option><option value="year">year</option></select></div>
          <select value={planForm.itemId} onChange={(e) => { const itemId = Number(e.target.value); const item = items.find((row) => row.id === itemId); setPlanForm({ ...planForm, itemId, unitPrice: Number(item?.price || 0) }); }} className="w-full rounded-lg border px-3 py-2 text-sm"><option value={0}>Select item</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <div className="grid grid-cols-2 gap-2"><input type="number" min={0.001} step={0.001} value={planForm.quantity} onChange={(e) => setPlanForm({ ...planForm, quantity: Number(e.target.value) })} placeholder="Qty" className="rounded-lg border px-3 py-2 text-sm" /><input type="number" min={0} value={planForm.unitPrice} onChange={(e) => setPlanForm({ ...planForm, unitPrice: Number(e.target.value) })} placeholder="Unit price" className="rounded-lg border px-3 py-2 text-sm" /></div>
          <button disabled={busy} onClick={() => void submitPlan()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"><Plus size={16} /> Create draft plan</button>
        </div></section>
        <section className="space-y-3">{plans.map((plan) => <article key={plan.id} className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold uppercase text-violet-600">{plan.code}</p><h3 className="text-lg font-black">{plan.name}</h3><p className="text-sm text-slate-500">Every {plan.interval_count} {plan.interval_unit}{plan.interval_count > 1 ? 's' : ''} · {plan.items.length} item(s)</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{plan.status}</span>{plan.status === 'draft' && <button disabled={busy} onClick={() => void changePlan(plan.id, 'active')} className="rounded-lg border px-3 py-2 text-xs font-bold">Activate</button>}{plan.status !== 'archived' && <button disabled={busy} onClick={() => void changePlan(plan.id, 'archived')} className="rounded-lg border px-3 py-2 text-xs font-bold">Archive</button>}</div></div><div className="mt-3 space-y-1">{plan.items.map((line) => <div key={`${plan.id}-${line.item_id}`} className="flex justify-between text-sm"><span>{line.item_name || `Item ${line.item_id}`} × {Number(line.quantity)}</span><b>{money(Number(line.unit_price) * Number(line.quantity))}</b></div>)}</div></article>)}{plans.length === 0 && <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">No plans yet.</div>}</section>
      </div> : <div className="mt-4 grid gap-5 lg:grid-cols-[380px_1fr]">
        <section className="rounded-2xl border bg-white p-4"><h2 className="font-black">Create customer contract</h2><div className="mt-4 space-y-3"><select value={contractForm.planId} onChange={(e) => setContractForm({ ...contractForm, planId: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm"><option value={0}>Active plan</option>{activePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select><select value={contractForm.customerId} onChange={(e) => setContractForm({ ...contractForm, customerId: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2 text-sm"><option value={0}>Customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</option>)}</select><input type="date" value={contractForm.startsOn} onChange={(e) => setContractForm({ ...contractForm, startsOn: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" /><textarea value={contractForm.notes} onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })} placeholder="Contract notes" className="min-h-20 w-full rounded-lg border px-3 py-2 text-sm" /><button disabled={busy} onClick={() => void submitContract()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"><Repeat2 size={16} /> Create draft contract</button></div></section>
        <section className="space-y-3">{subscriptions.map((row) => <article key={row.id} className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold uppercase text-violet-600">{row.subscription_number}</p><h3 className="text-lg font-black">{row.customer_name}</h3><p className="text-sm text-slate-500">{row.plan_name || 'Plan snapshot'} · {row.outlet_name} · next {String(row.next_renewal_at).slice(0, 10)}</p></div><span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{row.status}</span></div><div className="mt-4 flex flex-wrap items-center gap-2"><span className="mr-auto text-sm text-slate-600">{row.renewal_count} renewal(s) · {money(row.billed_total)}</span>{row.status === 'draft' && <button disabled={busy} onClick={() => void changeContract(row.id, 'active')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"><Play size={14} /> Activate</button>}{row.status === 'active' && <><button disabled={busy} onClick={() => void renew(row.id, String(row.next_renewal_at).slice(0, 10))} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"><RefreshCw size={14} /> Renew</button><button disabled={busy} onClick={() => void changeContract(row.id, 'paused')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"><Pause size={14} /> Pause</button></>}{row.status === 'paused' && <button disabled={busy} onClick={() => void changeContract(row.id, 'active')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"><Play size={14} /> Resume</button>}{row.status !== 'cancelled' && <button disabled={busy} onClick={() => void changeContract(row.id, 'cancelled')} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700"><XCircle size={14} /> Cancel</button>}</div></article>)}{subscriptions.length === 0 && <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">No customer subscriptions yet.</div>}</section>
      </div>}
    </div>
  </main>;
}
