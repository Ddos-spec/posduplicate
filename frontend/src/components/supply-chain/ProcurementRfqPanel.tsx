import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight, CheckCircle2, FilePlus2, Loader2, RefreshCw, Send, ShoppingCart, Trophy } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import {
  convertPurchaseRfqToPo,
  createPurchaseRfq,
  getBalances,
  getOutlets,
  getPurchaseRfqs,
  getSuppliers,
  selectPurchaseRfqSupplier,
  sendPurchaseRfq,
  submitPurchaseRfqSupplierQuote,
  type OutletLite,
  type PurchaseRfq,
  type SupplierLite,
  type WarehouseBalance,
} from '../../services/supplyChainService';

const money = (value: unknown) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const number = (value: unknown) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(Number(value || 0));

export default function ProcurementRfqPanel() {
  const { isDark } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [outlets, setOutlets] = useState<OutletLite[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>([]);
  const [balances, setBalances] = useState<WarehouseBalance[]>([]);
  const [rfqs, setRfqs] = useState<PurchaseRfq[]>([]);
  const [form, setForm] = useState({
    outletId: '',
    inventoryId: '',
    quantity: '1',
    targetUnitPrice: '',
    requiredDate: '',
    notes: '',
  });
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<number[]>([]);

  const card = isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const input = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500/30 ${isDark ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`;

  const load = async () => {
    setLoading(true);
    try {
      const [outletData, supplierData, balanceData, rfqData] = await Promise.all([
        getOutlets(),
        getSuppliers(),
        getBalances(),
        getPurchaseRfqs(),
      ]);
      setOutlets(outletData);
      setSuppliers(supplierData);
      setBalances(balanceData);
      setRfqs(rfqData);
    } catch (error) {
      console.error(error);
      toast.error('RFQ workspace gagal dimuat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const scopedSuppliers = useMemo(
    () => suppliers.filter((supplier) => !form.outletId || supplier.outlet_id === Number(form.outletId)),
    [form.outletId, suppliers]
  );

  const scopedInventory = useMemo(() => {
    const map = new Map<number, WarehouseBalance>();
    balances
      .filter((row) => !form.outletId || row.outlet_id === Number(form.outletId))
      .forEach((row) => map.set(row.inventory_id, row));
    return [...map.values()].sort((a, b) => a.inventory_name.localeCompare(b.inventory_name));
  }, [balances, form.outletId]);

  const toggleSupplier = (supplierId: number) => {
    setSelectedSupplierIds((current) => current.includes(supplierId)
      ? current.filter((id) => id !== supplierId)
      : [...current, supplierId]);
  };

  const createRfq = async () => {
    const outletId = Number(form.outletId);
    const inventoryId = Number(form.inventoryId);
    const quantity = Number(form.quantity);
    const targetUnitPrice = form.targetUnitPrice.trim() ? Number(form.targetUnitPrice) : null;
    if (!outletId || !inventoryId || !Number.isFinite(quantity) || quantity <= 0 || selectedSupplierIds.length === 0) {
      toast.error('Pilih outlet, inventory, minimal satu supplier, dan quantity > 0');
      return;
    }
    if (targetUnitPrice !== null && (!Number.isFinite(targetUnitPrice) || targetUnitPrice < 0)) {
      toast.error('Target unit price tidak valid');
      return;
    }

    const inventory = scopedInventory.find((row) => row.inventory_id === inventoryId);
    setBusyKey('create');
    try {
      await createPurchaseRfq({
        outletId,
        supplierIds: selectedSupplierIds,
        requiredDate: form.requiredDate || null,
        notes: form.notes.trim() || undefined,
        items: [{
          inventoryId,
          quantity,
          unit: inventory?.unit,
          targetUnitPrice,
        }],
      });
      setForm((current) => ({ ...current, inventoryId: '', quantity: '1', targetUnitPrice: '', notes: '' }));
      setSelectedSupplierIds([]);
      await load();
      toast.success('RFQ berhasil dibuat');
    } catch (error) {
      console.error(error);
      toast.error('Gagal membuat RFQ');
    } finally {
      setBusyKey(null);
    }
  };

  const sendRfq = async (rfq: PurchaseRfq) => {
    setBusyKey(`send-${rfq.id}`);
    try {
      await sendPurchaseRfq(rfq.id);
      await load();
      toast.success(`${rfq.rfq_number} ditandai sent`);
    } catch (error) {
      console.error(error);
      toast.error('RFQ gagal dikirim');
    } finally {
      setBusyKey(null);
    }
  };

  const recordSupplierQuote = async (rfq: PurchaseRfq, supplierId: number, supplierName: string) => {
    const quoteItems: Array<{ rfqItemId: number; unitPrice: number; availableQuantity?: number | null }> = [];
    for (const item of rfq.items) {
      const answer = window.prompt(
        `${supplierName} · ${item.inventoryName}\nRFQ qty: ${number(item.quantity)} ${item.unit}\nMasukkan unit price`,
        item.targetUnitPrice == null ? '' : String(item.targetUnitPrice)
      );
      if (answer === null) return;
      const unitPrice = Number(answer);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        toast.error('Unit price tidak valid');
        return;
      }
      const availableAnswer = window.prompt(
        `${supplierName} · available quantity untuk ${item.inventoryName}`,
        String(item.quantity)
      );
      if (availableAnswer === null) return;
      const availableQuantity = Number(availableAnswer);
      if (!Number.isFinite(availableQuantity) || availableQuantity < 0) {
        toast.error('Available quantity tidak valid');
        return;
      }
      quoteItems.push({ rfqItemId: item.id, unitPrice, availableQuantity });
    }
    const leadAnswer = window.prompt(`${supplierName} · lead time (hari)`, '3');
    if (leadAnswer === null) return;
    const leadTimeDays = Number(leadAnswer);
    if (!Number.isFinite(leadTimeDays) || leadTimeDays < 0) {
      toast.error('Lead time tidak valid');
      return;
    }

    setBusyKey(`quote-${rfq.id}-${supplierId}`);
    try {
      await submitPurchaseRfqSupplierQuote(rfq.id, supplierId, {
        leadTimeDays,
        items: quoteItems,
      });
      await load();
      toast.success(`Quote ${supplierName} tersimpan`);
    } catch (error) {
      console.error(error);
      toast.error('Supplier quote gagal disimpan');
    } finally {
      setBusyKey(null);
    }
  };

  const chooseSupplier = async (rfq: PurchaseRfq, supplierId: number, supplierName: string) => {
    if (!window.confirm(`Pilih ${supplierName} sebagai pemenang ${rfq.rfq_number}?`)) return;
    setBusyKey(`select-${rfq.id}`);
    try {
      await selectPurchaseRfqSupplier(rfq.id, supplierId);
      await load();
      toast.success(`${supplierName} dipilih`);
    } catch (error) {
      console.error(error);
      toast.error('Supplier gagal dipilih');
    } finally {
      setBusyKey(null);
    }
  };

  const convertToPo = async (rfq: PurchaseRfq) => {
    if (!window.confirm(`Convert ${rfq.rfq_number} menjadi draft PO?`)) return;
    setBusyKey(`convert-${rfq.id}`);
    try {
      const po = await convertPurchaseRfqToPo(rfq.id);
      await load();
      toast.success(`PO ${po.po_number} dibuat`);
    } catch (error) {
      console.error(error);
      toast.error('RFQ gagal dikonversi ke PO');
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return <div className={`flex min-h-56 items-center justify-center rounded-2xl border ${card}`}><Loader2 className="h-7 w-7 animate-spin text-cyan-500" /></div>;
  }

  return (
    <div className="space-y-5">
      <section className={`rounded-2xl border p-4 ${card}`}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><FilePlus2 size={18} className="text-cyan-500" /><h2 className="font-black">Create multi-supplier RFQ</h2></div>
            <p className={`mt-1 text-xs ${muted}`}>Satu kebutuhan dikirim ke beberapa supplier, lalu harga dan lead time dibandingkan sebelum PO dibuat.</p>
          </div>
          <button onClick={() => void load()} className={`rounded-xl border p-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}><RefreshCw size={15} /></button>
        </div>

        <div className="grid gap-2 lg:grid-cols-4">
          <select className={input} value={form.outletId} onChange={(event) => { setForm({ ...form, outletId: event.target.value, inventoryId: '' }); setSelectedSupplierIds([]); }}>
            <option value="">Outlet</option>
            {outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}
          </select>
          <select className={input} value={form.inventoryId} onChange={(event) => setForm({ ...form, inventoryId: event.target.value })}>
            <option value="">Inventory need</option>
            {scopedInventory.map((item) => <option key={item.inventory_id} value={item.inventory_id}>{item.inventory_name} · stock {number(item.aggregate_stock)}</option>)}
          </select>
          <input className={input} type="number" min="0.001" step="0.001" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="Qty" />
          <input className={input} type="number" min="0" value={form.targetUnitPrice} onChange={(event) => setForm({ ...form, targetUnitPrice: event.target.value })} placeholder="Target unit price (optional)" />
          <input className={input} type="date" value={form.requiredDate} onChange={(event) => setForm({ ...form, requiredDate: event.target.value })} />
          <input className={`${input} lg:col-span-2`} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="RFQ notes / requirement" />
          <button disabled={busyKey === 'create'} onClick={() => void createRfq()} className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-700 disabled:opacity-60">
            {busyKey === 'create' ? <Loader2 size={15} className="mr-2 inline animate-spin" /> : <FilePlus2 size={15} className="mr-2 inline" />}Create RFQ
          </button>
        </div>

        <div className="mt-4">
          <p className={`mb-2 text-xs font-bold uppercase tracking-[0.12em] ${muted}`}>Invite suppliers</p>
          {scopedSuppliers.length === 0 ? <p className={`text-sm ${muted}`}>Pilih outlet yang punya supplier aktif.</p> : <div className="flex flex-wrap gap-2">{scopedSuppliers.map((supplier) => {
            const active = selectedSupplierIds.includes(supplier.id);
            return <button key={supplier.id} onClick={() => toggleSupplier(supplier.id)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${active ? 'border-cyan-500 bg-cyan-500/10 text-cyan-500' : isDark ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}`}>{active && <CheckCircle2 size={13} className="mr-1 inline" />}{supplier.name}</button>;
          })}</div>}
        </div>
      </section>

      <section className={`rounded-2xl border ${card}`}>
        <div className="border-b border-inherit p-4"><h2 className="font-black">RFQ sourcing board</h2><p className={`mt-1 text-xs ${muted}`}>Supplier quote harus lengkap untuk seluruh line sebelum bisa dibandingkan dan dipilih.</p></div>
        <div className="divide-y divide-inherit">
          {rfqs.length === 0 ? <p className={`p-6 text-sm ${muted}`}>Belum ada RFQ.</p> : rfqs.map((rfq) => (
            <article key={rfq.id} className="p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><p className="font-black">{rfq.rfq_number}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${rfq.status === 'converted' ? 'bg-emerald-500/15 text-emerald-500' : rfq.status === 'selected' ? 'bg-cyan-500/15 text-cyan-500' : rfq.status === 'quoted' ? 'bg-blue-500/15 text-blue-500' : 'bg-amber-500/15 text-amber-500'}`}>{rfq.status}</span></div>
                  <p className={`mt-1 text-xs ${muted}`}>{rfq.outlet_name || `Outlet ${rfq.outlet_id}`} · {rfq.items.length} item · {rfq.suppliers.length} supplier{rfq.required_date ? ` · required ${rfq.required_date}` : ''}</p>
                  {rfq.selected_supplier_name && <p className="mt-2 text-xs font-bold text-cyan-500"><Trophy size={13} className="mr-1 inline" />Selected: {rfq.selected_supplier_name}</p>}
                  {rfq.converted_po_number && <p className="mt-1 text-xs font-bold text-emerald-500"><ShoppingCart size={13} className="mr-1 inline" />PO: {rfq.converted_po_number}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {rfq.status === 'draft' && <button disabled={busyKey === `send-${rfq.id}`} onClick={() => void sendRfq(rfq)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white"><Send size={13} className="mr-1 inline" />Send RFQ</button>}
                  {rfq.status === 'selected' && <button disabled={busyKey === `convert-${rfq.id}`} onClick={() => void convertToPo(rfq)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"><ShoppingCart size={13} className="mr-1 inline" />Convert PO</button>}
                </div>
              </div>

              <div className="mt-4 grid gap-3 2xl:grid-cols-2">
                {rfq.suppliers.map((supplier) => (
                  <div key={supplier.id} className={`rounded-xl border p-3 ${isDark ? 'border-slate-700 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-bold">{supplier.supplierName}</p><p className={`text-xs ${muted}`}>{supplier.status}{supplier.leadTimeDays != null ? ` · ${supplier.leadTimeDays} hari` : ''}</p></div>
                      <p className="font-black">{supplier.quotedTotal == null ? '—' : money(supplier.quotedTotal)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['sent', 'quoted'].includes(rfq.status) && supplier.status !== 'selected' && <button disabled={busyKey === `quote-${rfq.id}-${supplier.supplierId}`} onClick={() => void recordSupplierQuote(rfq, supplier.supplierId, supplier.supplierName)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${isDark ? 'border-slate-700' : 'border-slate-200 bg-white'}`}>{supplier.status === 'responded' ? 'Update quote' : 'Record quote'}</button>}
                      {rfq.status === 'quoted' && supplier.status === 'responded' && <button disabled={busyKey === `select-${rfq.id}`} onClick={() => void chooseSupplier(rfq, supplier.supplierId, supplier.supplierName)} className="rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-bold text-white"><Trophy size={13} className="mr-1 inline" />Select</button>}
                      {supplier.status === 'selected' && <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-xs font-bold text-emerald-500"><CheckCircle2 size={13} className="mr-1 inline" />Winner</span>}
                    </div>
                  </div>
                ))}
              </div>

              {rfq.status === 'converted' && rfq.converted_po_number && <div className={`mt-3 flex items-center gap-2 rounded-xl border p-3 text-xs font-bold ${isDark ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-300' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}><CheckCircle2 size={15} />RFQ sudah menjadi {rfq.converted_po_number}. Conversion idempotent: request ulang tidak membuat PO duplikat.<ArrowRight size={14} /></div>}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
