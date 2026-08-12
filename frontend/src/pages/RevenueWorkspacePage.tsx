import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import {
  adjustLoyalty,
  convertQuotation,
  createCrmActivity,
  createCrmOpportunity,
  createQuotation,
  getCrmOpportunities,
  getCustomer360,
  getQuotations,
  getRevenueCustomers,
  getRevenueSummary,
  getSalesOrders,
  moveCrmOpportunity,
  updateQuotationStatus,
  type CrmOpportunity,
  type CrmStage,
  type Customer360,
  type CustomerLite,
  type RevenueSummary,
  type SalesOrder,
  type SalesQuotation,
} from '../services/revenueService';

type Tab = 'pipeline' | 'quotations' | 'orders' | 'customers';

const STAGES: Array<{ id: CrmStage; label: string; probability: string }> = [
  { id: 'new', label: 'New', probability: '10%' },
  { id: 'qualified', label: 'Qualified', probability: '30%' },
  { id: 'proposal', label: 'Proposal', probability: '50%' },
  { id: 'negotiation', label: 'Negotiation', probability: '75%' },
  { id: 'won', label: 'Won', probability: '100%' },
  { id: 'lost', label: 'Lost', probability: '0%' },
];

const money = (value: unknown) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const dateText = (value?: string | null) => value
  ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
  : '—';

export default function RevenueWorkspacePage() {
  const navigate = useNavigate();
  const { isDark } = useThemeStore();
  const [tab, setTab] = useState<Tab>('pipeline');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [quotations, setQuotations] = useState<SalesQuotation[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLite | null>(null);
  const [customer360, setCustomer360] = useState<Customer360 | null>(null);
  const [customer360Loading, setCustomer360Loading] = useState(false);

  const [oppForm, setOppForm] = useState({ title: '', customerId: '', expectedRevenue: '', source: 'Manual', notes: '' });
  const [quoteForm, setQuoteForm] = useState({ customerId: '', validUntil: '', notes: '', description: '', quantity: '1', unitPrice: '', taxRate: '0' });
  const [loyaltyForm, setLoyaltyForm] = useState({ points: '', amount: '', reason: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [summaryData, oppData, quoteData, orderData, customerData] = await Promise.all([
        getRevenueSummary(),
        getCrmOpportunities(),
        getQuotations(),
        getSalesOrders(),
        getRevenueCustomers(),
      ]);
      setSummary(summaryData);
      setOpportunities(oppData);
      setQuotations(quoteData);
      setOrders(orderData);
      setCustomers(customerData);
    } catch (error) {
      console.error(error);
      toast.error('Revenue workspace gagal dimuat. Pastikan migrasi P1 sudah diterapkan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customers.slice(0, 40);
    return customers.filter((customer) => [customer.name, customer.phone, customer.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))).slice(0, 40);
  }, [customerSearch, customers]);

  const openCustomer360 = async (customer: CustomerLite) => {
    setSelectedCustomer(customer);
    setCustomer360Loading(true);
    setCustomer360(null);
    try {
      setCustomer360(await getCustomer360(customer.id));
    } catch (error) {
      console.error(error);
      toast.error('Customer 360 gagal dimuat');
    } finally {
      setCustomer360Loading(false);
    }
  };

  const submitOpportunity = async () => {
    if (!oppForm.title.trim()) return toast.error('Judul opportunity wajib diisi');
    setBusy(true);
    try {
      await createCrmOpportunity({
        title: oppForm.title.trim(),
        customerId: oppForm.customerId ? Number(oppForm.customerId) : null,
        expectedRevenue: Number(oppForm.expectedRevenue || 0),
        source: oppForm.source,
        notes: oppForm.notes,
      });
      setOppForm({ title: '', customerId: '', expectedRevenue: '', source: 'Manual', notes: '' });
      await load();
      toast.success('Opportunity dibuat');
    } catch (error) {
      console.error(error);
      toast.error('Gagal membuat opportunity');
    } finally {
      setBusy(false);
    }
  };

  const changeStage = async (opportunity: CrmOpportunity, stage: CrmStage) => {
    if (opportunity.stage === stage) return;
    try {
      const updated = await moveCrmOpportunity(opportunity.id, stage);
      setOpportunities((current) => current.map((item) => item.id === opportunity.id ? { ...item, ...updated } : item));
      setSummary(await getRevenueSummary());
    } catch (error) {
      console.error(error);
      toast.error('Stage gagal dipindah');
    }
  };

  const addFollowUp = async (opportunity: CrmOpportunity) => {
    const summaryText = window.prompt(`Follow-up untuk ${opportunity.title}`);
    if (!summaryText?.trim()) return;
    try {
      await createCrmActivity(opportunity.id, { summary: summaryText.trim() });
      toast.success('Follow-up dicatat');
      setOpportunities(await getCrmOpportunities());
    } catch (error) {
      console.error(error);
      toast.error('Gagal mencatat follow-up');
    }
  };

  const submitQuotation = async () => {
    if (!quoteForm.description.trim()) return toast.error('Deskripsi item wajib diisi');
    if (Number(quoteForm.quantity) <= 0 || Number(quoteForm.unitPrice) < 0) return toast.error('Qty/harga quotation tidak valid');
    setBusy(true);
    try {
      await createQuotation({
        customerId: quoteForm.customerId ? Number(quoteForm.customerId) : null,
        validUntil: quoteForm.validUntil || null,
        notes: quoteForm.notes,
        items: [{
          description: quoteForm.description.trim(),
          quantity: Number(quoteForm.quantity),
          unitPrice: Number(quoteForm.unitPrice || 0),
          taxRate: Number(quoteForm.taxRate || 0),
        }],
      });
      setQuoteForm({ customerId: '', validUntil: '', notes: '', description: '', quantity: '1', unitPrice: '', taxRate: '0' });
      await load();
      toast.success('Quotation dibuat');
    } catch (error) {
      console.error(error);
      toast.error('Gagal membuat quotation');
    } finally {
      setBusy(false);
    }
  };

  const setQuoteStatus = async (quote: SalesQuotation, status: string) => {
    try {
      await updateQuotationStatus(quote.id, status);
      setQuotations(await getQuotations());
      setSummary(await getRevenueSummary());
    } catch (error) {
      console.error(error);
      toast.error('Status quotation gagal diubah');
    }
  };

  const convertQuote = async (quote: SalesQuotation) => {
    try {
      await convertQuotation(quote.id);
      await load();
      setTab('orders');
      toast.success('Quotation dikonversi menjadi sales order');
    } catch (error) {
      console.error(error);
      toast.error('Quotation gagal dikonversi');
    }
  };

  const postLoyalty = async () => {
    if (!selectedCustomer || !loyaltyForm.reason.trim()) return toast.error('Customer dan alasan wajib diisi');
    const points = Number(loyaltyForm.points || 0);
    const amount = Number(loyaltyForm.amount || 0);
    if (points === 0 && amount === 0) return toast.error('Isi perubahan poin atau wallet');
    try {
      await adjustLoyalty(selectedCustomer.id, {
        entryType: points >= 0 && amount >= 0 ? 'earn' : 'redeem',
        pointsDelta: points,
        monetaryDelta: amount,
        reason: loyaltyForm.reason.trim(),
      });
      setLoyaltyForm({ points: '', amount: '', reason: '' });
      await openCustomer360(selectedCustomer);
      toast.success('Loyalty ledger diposting');
    } catch (error) {
      console.error(error);
      toast.error('Loyalty adjustment gagal');
    }
  };

  const card = isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const input = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 ${isDark ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`;

  if (loading) {
    return <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50'}`}><Loader2 className="h-9 w-9 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`sticky top-0 z-40 border-b ${isDark ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-white/95'} backdrop-blur-xl`}>
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/module-selector')} className={`rounded-xl border p-2 ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'}`}><ArrowLeft size={18} /></button>
            <div>
              <div className="flex items-center gap-2"><BadgeDollarSign className="text-blue-500" size={20} /><h1 className="font-black">Revenue Operations</h1></div>
              <p className={`text-xs ${muted}`}>CRM → Quotation → Sales Order → Customer 360 → Loyalty</p>
            </div>
          </div>
          <button onClick={() => void load()} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-100'}`}><RefreshCw size={15} /> Refresh</button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Open Pipeline', money(summary?.pipelineValue), Target],
            ['Won Revenue', money(summary?.wonValue), CheckCircle2],
            ['Quotations', quotations.length, ClipboardList],
            ['Sales Orders', orders.length, CircleDollarSign],
          ].map(([label, value, Icon]) => {
            const MetricIcon = Icon as typeof Target;
            return <div key={String(label)} className={`rounded-2xl border p-4 ${card}`}><MetricIcon size={19} className="mb-3 text-blue-500" /><p className="text-2xl font-black">{String(value)}</p><p className={`mt-1 text-xs ${muted}`}>{String(label)}</p></div>;
          })}
        </section>

        <nav className={`flex gap-2 overflow-x-auto rounded-2xl border p-2 ${card}`}>
          {([
            ['pipeline', 'CRM Pipeline', Target],
            ['quotations', 'Quotations', ClipboardList],
            ['orders', 'Sales Orders', CircleDollarSign],
            ['customers', 'Customer 360', UserRound],
          ] as Array<[Tab, string, typeof Target]>).map(([value, label, Icon]) => (
            <button key={value} onClick={() => setTab(value)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${tab === value ? 'bg-blue-600 text-white' : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}><Icon size={16} />{label}</button>
          ))}
        </nav>

        {tab === 'pipeline' && (
          <div className="space-y-5">
            <section className={`rounded-2xl border p-4 ${card}`}>
              <div className="mb-4 flex items-center gap-2"><Plus size={18} className="text-blue-500" /><h2 className="font-black">New opportunity</h2></div>
              <div className="grid gap-3 lg:grid-cols-5">
                <input className={input} placeholder="Opportunity title" value={oppForm.title} onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })} />
                <select className={input} value={oppForm.customerId} onChange={(e) => setOppForm({ ...oppForm, customerId: e.target.value })}><option value="">Tanpa customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select>
                <input className={input} type="number" min="0" placeholder="Expected revenue" value={oppForm.expectedRevenue} onChange={(e) => setOppForm({ ...oppForm, expectedRevenue: e.target.value })} />
                <input className={input} placeholder="Source" value={oppForm.source} onChange={(e) => setOppForm({ ...oppForm, source: e.target.value })} />
                <button disabled={busy} onClick={() => void submitOpportunity()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">Create opportunity</button>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
              {STAGES.map((stage) => {
                const rows = opportunities.filter((item) => item.stage === stage.id);
                return <div key={stage.id} className={`min-h-[260px] rounded-2xl border p-3 ${card}`}>
                  <div className="mb-3 flex items-center justify-between gap-2"><div><p className="font-black">{stage.label}</p><p className={`text-xs ${muted}`}>{stage.probability} default</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>{rows.length}</span></div>
                  <div className="space-y-2">
                    {rows.map((opportunity) => <article key={String(opportunity.id)} className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                      <p className="font-bold leading-tight">{opportunity.title}</p>
                      <p className={`mt-1 text-xs ${muted}`}>{opportunity.customer_name || 'No customer'} · {opportunity.source || 'No source'}</p>
                      <p className="mt-3 font-black text-blue-500">{money(opportunity.expected_revenue)}</p>
                      <div className="mt-3 flex gap-2">
                        <select value={opportunity.stage} onChange={(e) => void changeStage(opportunity, e.target.value as CrmStage)} className={`min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>{STAGES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
                        <button onClick={() => void addFollowUp(opportunity)} title="Add follow-up" className={`rounded-lg border p-2 ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-100'}`}><CalendarClock size={14} /></button>
                      </div>
                    </article>)}
                  </div>
                </div>;
              })}
            </section>
          </div>
        )}

        {tab === 'quotations' && (
          <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <section className={`rounded-2xl border p-4 ${card}`}>
              <div className="mb-4"><h2 className="font-black">Create quotation</h2><p className={`text-xs ${muted}`}>Item snapshot disimpan terpisah agar histori harga tidak berubah saat master product berubah.</p></div>
              <div className="space-y-3">
                <select className={input} value={quoteForm.customerId} onChange={(e) => setQuoteForm({ ...quoteForm, customerId: e.target.value })}><option value="">Tanpa customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select>
                <input className={input} type="date" value={quoteForm.validUntil} onChange={(e) => setQuoteForm({ ...quoteForm, validUntil: e.target.value })} />
                <input className={input} placeholder="Item / service description" value={quoteForm.description} onChange={(e) => setQuoteForm({ ...quoteForm, description: e.target.value })} />
                <div className="grid grid-cols-3 gap-2"><input className={input} type="number" min="0.001" step="0.001" placeholder="Qty" value={quoteForm.quantity} onChange={(e) => setQuoteForm({ ...quoteForm, quantity: e.target.value })} /><input className={input} type="number" min="0" placeholder="Unit price" value={quoteForm.unitPrice} onChange={(e) => setQuoteForm({ ...quoteForm, unitPrice: e.target.value })} /><input className={input} type="number" min="0" placeholder="Tax %" value={quoteForm.taxRate} onChange={(e) => setQuoteForm({ ...quoteForm, taxRate: e.target.value })} /></div>
                <textarea className={input} rows={3} placeholder="Notes" value={quoteForm.notes} onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })} />
                <button disabled={busy} onClick={() => void submitQuotation()} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">Create quotation</button>
              </div>
            </section>

            <section className={`rounded-2xl border ${card}`}>
              <div className="border-b border-inherit p-4"><h2 className="font-black">Quotation register</h2></div>
              <div className="divide-y divide-inherit">
                {quotations.length === 0 ? <p className={`p-6 text-sm ${muted}`}>Belum ada quotation.</p> : quotations.map((quote) => <div key={String(quote.id)} className="p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div><div className="flex items-center gap-2"><p className="font-black">{quote.quotation_number}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>{quote.status}</span></div><p className={`mt-1 text-xs ${muted}`}>{quote.customer_name || 'No customer'} · valid {dateText(quote.valid_until)}</p></div>
                    <div className="text-left lg:text-right"><p className="text-xl font-black">{money(quote.total)}</p><p className={`text-xs ${muted}`}>{quote.items?.length || 0} item</p></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quote.status === 'draft' && <button onClick={() => void setQuoteStatus(quote, 'sent')} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>Mark sent</button>}
                    {['draft', 'sent'].includes(quote.status) && <button onClick={() => void setQuoteStatus(quote, 'accepted')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Accept</button>}
                    {quote.status === 'accepted' && <button onClick={() => void convertQuote(quote)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">Convert to SO <ArrowRight size={13} /></button>}
                  </div>
                </div>)}
              </div>
            </section>
          </div>
        )}

        {tab === 'orders' && (
          <section className={`rounded-2xl border ${card}`}>
            <div className="border-b border-inherit p-4"><h2 className="font-black">Sales orders</h2><p className={`text-xs ${muted}`}>Confirmed sales commitment. Fulfillment/stock reservation masuk tranche supply-chain berikutnya.</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className={muted}>{['Sales Order', 'Customer', 'Status', 'Created', 'Total'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-bold">{h}</th>)}</tr></thead><tbody className="divide-y divide-inherit">{orders.map((order) => <tr key={String(order.id)}><td className="px-4 py-3 font-bold">{order.sales_order_number}</td><td className="px-4 py-3">{order.customer_name || '—'}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>{order.status}</span></td><td className="px-4 py-3">{dateText(order.created_at)}</td><td className="px-4 py-3 font-black">{money(order.total)}</td></tr>)}</tbody></table></div>
          </section>
        )}

        {tab === 'customers' && (
          <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
            <section className={`rounded-2xl border p-4 ${card}`}>
              <div className="relative mb-3"><Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} size={15} /><input className={`${input} pl-9`} value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Cari nama, telepon, email" /></div>
              <div className="max-h-[650px] space-y-2 overflow-y-auto">{filteredCustomers.map((customer) => <button key={customer.id} onClick={() => void openCustomer360(customer)} className={`w-full rounded-xl border p-3 text-left transition ${selectedCustomer?.id === customer.id ? 'border-blue-500 bg-blue-500/10' : isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-50'}`}><p className="font-bold">{customer.name}</p><p className={`text-xs ${muted}`}>{customer.phone} {customer.email ? `· ${customer.email}` : ''}</p></button>)}</div>
            </section>

            <section className={`rounded-2xl border p-4 ${card}`}>
              {!selectedCustomer ? <div className={`flex min-h-[420px] flex-col items-center justify-center text-center ${muted}`}><UserRound size={36} className="mb-3" /><p className="font-bold">Pilih customer untuk membuka 360° profile.</p></div> : customer360Loading ? <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div> : customer360 ? <div className="space-y-5">
                <div className="flex items-start justify-between gap-4"><div><p className="text-2xl font-black">{customer360.customer.name}</p><p className={`text-sm ${muted}`}>{customer360.customer.phone} · {customer360.customer.email || 'no email'}</p></div><Building2 className="text-blue-500" /></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
                  ['Lifetime value', money(customer360.metrics.lifetimeValue)],
                  ['Transactions', customer360.metrics.transactionCount],
                  ['Average order', money(customer360.metrics.averageOrderValue)],
                  ['Outstanding AR', money(customer360.metrics.outstandingReceivable)],
                  ['Open pipeline', money(customer360.metrics.openPipelineValue)],
                  ['Won pipeline', money(customer360.metrics.wonPipelineValue)],
                ].map(([label, value]) => <div key={String(label)} className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}><p className="font-black">{String(value)}</p><p className={`text-xs ${muted}`}>{String(label)}</p></div>)}</div>

                <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="mb-3 flex items-center gap-2"><WalletCards size={17} className="text-purple-500" /><p className="font-black">Loyalty wallet</p></div>
                  <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-2xl font-black">{Number(customer360.loyalty.wallet?.points_balance || 0).toLocaleString('id-ID')} pts</p><p className={`text-xs ${muted}`}>Points balance</p></div><div><p className="text-2xl font-black">{money(customer360.loyalty.wallet?.monetary_balance || 0)}</p><p className={`text-xs ${muted}`}>Wallet balance</p></div></div>
                  <div className="mt-4 grid gap-2 lg:grid-cols-4"><input className={input} type="number" placeholder="Points +/-" value={loyaltyForm.points} onChange={(e) => setLoyaltyForm({ ...loyaltyForm, points: e.target.value })} /><input className={input} type="number" placeholder="Wallet Rp +/-" value={loyaltyForm.amount} onChange={(e) => setLoyaltyForm({ ...loyaltyForm, amount: e.target.value })} /><input className={input} placeholder="Reason wajib" value={loyaltyForm.reason} onChange={(e) => setLoyaltyForm({ ...loyaltyForm, reason: e.target.value })} /><button onClick={() => void postLoyalty()} className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white">Post ledger</button></div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div><p className="mb-2 font-black">Recent transactions</p><div className="space-y-2">{customer360.recentTransactions.slice(0, 6).map((trx) => <div key={trx.id} className={`flex items-center justify-between rounded-xl border p-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}><div><p className="text-sm font-bold">{trx.transaction_number}</p><p className={`text-xs ${muted}`}>{dateText(trx.created_at)}</p></div><p className="font-black">{money(trx.total)}</p></div>)}</div></div>
                  <div><p className="mb-2 font-black">Receivables</p><div className="space-y-2">{customer360.receivables.slice(0, 6).map((ar) => <div key={ar.id} className={`flex items-center justify-between rounded-xl border p-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}><div><p className="text-sm font-bold">{ar.invoice_number}</p><p className={`text-xs ${muted}`}>Due {dateText(ar.due_date)} · {ar.status}</p></div><p className="font-black text-amber-500">{money(ar.balance)}</p></div>)}</div></div>
                </div>
              </div> : null}
            </section>
          </div>
        )}

        <section className={`rounded-2xl border p-4 ${card}`}>
          <div className="flex items-start gap-3"><Sparkles className="mt-0.5 text-cyan-500" size={18} /><div><p className="font-black">P1 status</p><p className={`mt-1 text-sm ${muted}`}>Revenue core aktif: CRM pipeline, activities, quotation, sales order conversion, Customer 360, dan loyalty ledger. Berikutnya: RFQ/PO receiving hardening, warehouse location/transfer/count, barcode, MRP production/yield, quality dan maintenance.</p></div></div>
        </section>
      </main>
    </div>
  );
}
