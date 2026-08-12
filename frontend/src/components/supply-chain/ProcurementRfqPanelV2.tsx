import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  CircleDollarSign,
  FilePlus2,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  ShoppingCart,
  Trash2,
  Trophy,
} from 'lucide-react';
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

type DraftLine = {
  key: string;
  inventoryId: string;
  quantity: string;
  targetUnitPrice: string;
};

const newLine = (): DraftLine => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  inventoryId: '',
  quantity: '1',
  targetUnitPrice: '',
});

const money = (value: unknown) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const qty = (value: unknown) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(Number(value || 0));

export default function ProcurementRfqPanelV2() {
  const { isDark } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [outlets, setOutlets] = useState<OutletLite[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>([]);
  const [balances, setBalances] = useState<WarehouseBalance[]>([]);
  const [rfqs, setRfqs] = useState<PurchaseRfq[]>([]);
  const [outletId, setOutletId] = useState('');
  const [supplierIds, setSupplierIds] = useState<number[]>([]);
  const [requiredDate, setRequiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);

  const card = isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const input = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-500/30 ${isDark ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`;

  const load = async () => {
    setLoading(true);
    try {
      const [outletData, supplierData, balanceData, rfqData] = await Promise.all([
        getOutlets(), getSuppliers(), getBalances(), getPurchaseRfqs(),
      ]);
      setOutlets(outletData);
      setSuppliers(supplierData);
      setBalances(balanceData);
      setRfqs(rfqData);
    } catch (error) {
      console.error(error);
      toast.error('RFQ sourcing gagal dimuat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const scopedSuppliers = useMemo(
    () => suppliers.filter((supplier) => !outletId || supplier.outlet_id === Number(outletId)),
    [outletId, suppliers]
  );

  const scopedInventory = useMemo(() => {
    const unique = new Map<number, WarehouseBalance>();
    balances
      .filter((row) => !outletId || row.outlet_id === Number(outletId))
      .forEach((row) => unique.set(row.inventory_id, row));
    return [...unique.values()].sort((a, b) => a.inventory_name.localeCompare(b.inventory_name));
  }, [balances, outletId]);

  const selectedInventoryIds = useMemo(
    () => new Set(lines.map((line) => Number(line.inventoryId)).filter((id) => id > 0)),
    [lines]
  );

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  };

  const removeLine = (key: string) => {
    setLines((current) => current.length === 1 ? current : current.filter((line) => line.key !== key));
  };

  const toggleSupplier = (supplierId: number) => {
    setSupplierIds((current) => current.includes(supplierId)
      ? current.filter((id) => id !== supplierId)
      : [...current, supplierId]);
  };

  const submitDraft = async () => {
    const parsedOutletId = Number(outletId);
    if (!parsedOutletId || supplierIds.length === 0) {
      toast.error('Pilih outlet dan minimal satu supplier');
      return;
    }

    const parsedLines = lines.map((line) => {
      const inventoryId = Number(line.inventoryId);
      const quantity = Number(line.quantity);
      const targetUnitPrice = line.targetUnitPrice.trim() ? Number(line.targetUnitPrice) : null;
      return { line, inventoryId, quantity, targetUnitPrice };
    });
    if (parsedLines.some(({ inventoryId, quantity, targetUnitPrice }) =>
      !inventoryId || !Number.isFinite(quantity) || quantity <= 0 ||
      (targetUnitPrice !== null && (!Number.isFinite(targetUnitPrice) || targetUnitPrice < 0)))) {
      toast.error('Semua line harus punya inventory, qty > 0, dan target price yang valid');
      return;
    }
    if (new Set(parsedLines.map(({ inventoryId }) => inventoryId)).size !== parsedLines.length) {
      toast.error('Inventory tidak boleh duplikat dalam satu RFQ');
      return;
    }

    setBusyKey('create');
    try {
      await createPurchaseRfq({
        outletId: parsedOutletId,
        supplierIds,
        requiredDate: requiredDate || null,
        notes: notes.trim() || undefined,
        items: parsedLines.map(({ inventoryId, quantity, targetUnitPrice }) => {
          const inventory = scopedInventory.find((row) => row.inventory_id === inventoryId);
          return {
            inventoryId,
            quantity,
            unit: inventory?.unit,
            targetUnitPrice,
          };
        }),
      });
      setSupplierIds([]);
      setRequiredDate('');
      setNotes('');
      setLines([newLine()]);
      await load();
      toast.success('Multi-line RFQ dibuat');
    } catch (error) {
      console.error(error);
      toast.error('Gagal membuat RFQ');
    } finally {
      setBusyKey(null);
    }
  };

  const markSent = async (rfq: PurchaseRfq) => {
    setBusyKey(`send-${rfq.id}`);
    try {
      await sendPurchaseRfq(rfq.id);
      await load();
      toast.success(`${rfq.rfq_number} sent`);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengirim RFQ');
    } finally {
      setBusyKey(null);
    }
  };

  const recordQuote = async (rfq: PurchaseRfq, supplierId: number, supplierName: string) => {
    const quoteItems: Array<{ rfqItemId: number; unitPrice: number; availableQuantity: number }> = [];
    for (const item of rfq.items) {
      const unitPriceRaw = window.prompt(
        `${supplierName}\n${item.inventoryName} · kebutuhan ${qty(item.quantity)} ${item.unit}\nUnit price`,
        item.targetUnitPrice == null ? '' : String(item.targetUnitPrice)
      );
      if (unitPriceRaw === null) return;
      const unitPrice = Number(unitPriceRaw);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) return void toast.error('Unit price tidak valid');

      const capacityRaw = window.prompt(
        `${supplierName}\n${item.inventoryName}\nAvailable quantity`,
        String(item.quantity)
      );
      if (capacityRaw === null) return;
      const availableQuantity = Number(capacityRaw);
      if (!Number.isFinite(availableQuantity) || availableQuantity < 0) return void toast.error('Available quantity tidak valid');
      quoteItems.push({ rfqItemId: item.id, unitPrice, availableQuantity });
    }

    const leadRaw = window.prompt(`${supplierName} · lead time hari`, '3');
    if (leadRaw === null) return;
    const leadTimeDays = Number(leadRaw);
    if (!Number.isFinite(leadTimeDays) || leadTimeDays < 0) return void toast.error('Lead time tidak valid');

    setBusyKey(`quote-${rfq.id}-${supplierId}`);
    try {
      await submitPurchaseRfqSupplierQuote(rfq.id, supplierId, { leadTimeDays, items: quoteItems });
      await load();
      toast.success(`Quote ${supplierName} disimpan`);
    } catch (error) {
      console.error(error);
      toast.error('Supplier quote ditolak');
    } finally {
      setBusyKey(null);
    }
  };

  const selectSupplier = async (rfq: PurchaseRfq, supplierId: number, supplierName: string) => {
    if (!window.confirm(`Pilih ${supplierName} untuk ${rfq.rfq_number}?`)) return;
    setBusyKey(`select-${rfq.id}`);
    try {
      await selectPurchaseRfqSupplier(rfq.id, supplierId);
      await load();
      toast.success(`${supplierName} selected`);
    } catch (error: any) {
      console.error(error);
      const code = error?.response?.data?.error?.code;
      toast.error(code === 'SUPPLIER_CAPACITY_INSUFFICIENT' ? 'Kapasitas supplier kurang dari kebutuhan RFQ' : 'Supplier gagal dipilih');
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
      toast.success(`${po.po_number} dibuat`);
    } catch (error) {
      console.error(error);
      toast.error('Conversion ke PO gagal');
    } finally {
      setBusyKey(null);
    }
  };

  const quoteRank = (rfq: PurchaseRfq) => [...rfq.suppliers]
    .filter((supplier) => supplier.status === 'responded' || supplier.status === 'selected')
    .sort((a, b) => Number(a.quotedTotal ?? Number.MAX_SAFE_INTEGER) - Number(b.quotedTotal ?? Number.MAX_SAFE_INTEGER) || Number(a.leadTimeDays ?? Number.MAX_SAFE_INTEGER) - Number(b.leadTimeDays ?? Number.MAX_SAFE_INTEGER));

  if (loading) return <div className={`flex min-h-56 items-center justify-center rounded-2xl border ${card}`}><Loader2 className="h-7 w-7 animate-spin text-cyan-500" /></div>;

  return (
    <div className="space-y-5">
      <section className={`rounded-2xl border p-4 ${card}`}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><FilePlus2 size={18} className="text-cyan-500" /><h2 className="font-black">Multi-supplier RFQ</h2></div>
            <p className={`mt-1 text-xs ${muted}`}>Satu RFQ dapat berisi banyak material/SKU dan dikirim ke beberapa supplier untuk dibandingkan.</p>
          </div>
          <button type="button" onClick={() => void load()} className={`rounded-xl border p-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}><RefreshCw size={15} /></button>
        </div>

        <div className="grid gap-2 lg:grid-cols-[1fr_1fr_2fr]">
          <select className={input} value={outletId} onChange={(event) => { setOutletId(event.target.value); setSupplierIds([]); setLines([newLine()]); }}>
            <option value="">Outlet</option>
            {outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}
          </select>
          <input className={input} type="date" value={requiredDate} onChange={(event) => setRequiredDate(event.target.value)} />
          <input className={input} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Requirement / notes" />
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3"><p className={`text-xs font-black uppercase tracking-[0.12em] ${muted}`}>RFQ lines</p><button type="button" onClick={() => setLines((current) => [...current, newLine()])} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white"><Plus size={13} className="mr-1 inline" />Add line</button></div>
          {lines.map((line, index) => (
            <div key={line.key} className={`grid gap-2 rounded-xl border p-3 lg:grid-cols-[40px_2fr_1fr_1fr_40px] ${isDark ? 'border-slate-700 bg-slate-950/30' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-center text-sm font-black">{index + 1}</div>
              <select className={input} value={line.inventoryId} onChange={(event) => updateLine(line.key, { inventoryId: event.target.value })}>
                <option value="">Inventory / material</option>
                {scopedInventory.map((item) => {
                  const usedElsewhere = selectedInventoryIds.has(item.inventory_id) && Number(line.inventoryId) !== item.inventory_id;
                  return <option key={item.inventory_id} value={item.inventory_id} disabled={usedElsewhere}>{item.inventory_name} · stock {qty(item.aggregate_stock)} {item.unit}</option>;
                })}
              </select>
              <input className={input} type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} placeholder="Qty" />
              <input className={input} type="number" min="0" value={line.targetUnitPrice} onChange={(event) => updateLine(line.key, { targetUnitPrice: event.target.value })} placeholder="Target price" />
              <button type="button" disabled={lines.length === 1} onClick={() => removeLine(line.key)} className={`rounded-xl border ${lines.length === 1 ? 'cursor-not-allowed opacity-30' : 'text-rose-500'} ${isDark ? 'border-slate-700' : 'border-slate-200 bg-white'}`}><Trash2 size={15} className="mx-auto" /></button>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <p className={`mb-2 text-xs font-black uppercase tracking-[0.12em] ${muted}`}>Invite suppliers</p>
          <div className="flex flex-wrap gap-2">
            {scopedSuppliers.length === 0 ? <span className={`text-sm ${muted}`}>Pilih outlet yang memiliki supplier aktif.</span> : scopedSuppliers.map((supplier) => {
              const selected = supplierIds.includes(supplier.id);
              return <button type="button" key={supplier.id} onClick={() => toggleSupplier(supplier.id)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${selected ? 'border-cyan-500 bg-cyan-500/10 text-cyan-500' : isDark ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}`}>{selected && <CheckCircle2 size={13} className="mr-1 inline" />}{supplier.name}</button>;
            })}
          </div>
        </div>

        <button type="button" disabled={busyKey === 'create'} onClick={() => void submitDraft()} className="mt-4 w-full rounded-xl bg-cyan-600 py-2.5 text-sm font-black text-white hover:bg-cyan-700 disabled:opacity-60">
          {busyKey === 'create' ? <Loader2 size={15} className="mr-2 inline animate-spin" /> : <FilePlus2 size={15} className="mr-2 inline" />}Create RFQ · {lines.length} line · {supplierIds.length} supplier
        </button>
      </section>

      <section className={`rounded-2xl border ${card}`}>
        <div className="border-b border-inherit p-4"><h2 className="font-black">Supplier sourcing board</h2><p className={`mt-1 text-xs ${muted}`}>Ranking awal: total quote terendah, lalu lead time. Selection backend tetap memvalidasi kapasitas semua line.</p></div>
        <div className="divide-y divide-inherit">
          {rfqs.length === 0 ? <p className={`p-6 text-sm ${muted}`}>Belum ada RFQ.</p> : rfqs.map((rfq) => {
            const ranked = quoteRank(rfq);
            const rankMap = new Map(ranked.map((supplier, index) => [supplier.supplierId, index + 1]));
            return <article key={rfq.id} className="p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div><div className="flex flex-wrap items-center gap-2"><p className="font-black">{rfq.rfq_number}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${rfq.status === 'converted' ? 'bg-emerald-500/15 text-emerald-500' : rfq.status === 'selected' ? 'bg-cyan-500/15 text-cyan-500' : rfq.status === 'quoted' ? 'bg-blue-500/15 text-blue-500' : 'bg-amber-500/15 text-amber-500'}`}>{rfq.status}</span></div><p className={`mt-1 text-xs ${muted}`}>{rfq.outlet_name || `Outlet ${rfq.outlet_id}`} · {rfq.items.length} line · {rfq.suppliers.length} supplier</p>{rfq.selected_supplier_name && <p className="mt-2 text-xs font-black text-cyan-500"><Trophy size={13} className="mr-1 inline" />{rfq.selected_supplier_name}</p>}{rfq.converted_po_number && <p className="mt-1 text-xs font-black text-emerald-500"><ShoppingCart size={13} className="mr-1 inline" />{rfq.converted_po_number}</p>}</div>
                <div className="flex flex-wrap gap-2">{rfq.status === 'draft' && <button type="button" disabled={busyKey === `send-${rfq.id}`} onClick={() => void markSent(rfq)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white"><Send size={13} className="mr-1 inline" />Send</button>}{rfq.status === 'selected' && <button type="button" disabled={busyKey === `convert-${rfq.id}`} onClick={() => void convertToPo(rfq)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"><ShoppingCart size={13} className="mr-1 inline" />Convert PO</button>}</div>
              </div>

              <div className={`mt-3 overflow-x-auto rounded-xl border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}><table className="w-full min-w-[650px] text-xs"><thead><tr className={muted}>{['Item', 'Qty', 'Target'].map((header) => <th key={header} className="px-3 py-2 text-left">{header}</th>)}</tr></thead><tbody className="divide-y divide-inherit">{rfq.items.map((item) => <tr key={item.id}><td className="px-3 py-2 font-bold">{item.inventoryName}<div className={`font-normal ${muted}`}>{item.sku || 'no SKU'}</div></td><td className="px-3 py-2">{qty(item.quantity)} {item.unit}</td><td className="px-3 py-2">{item.targetUnitPrice == null ? '—' : money(item.targetUnitPrice)}</td></tr>)}</tbody></table></div>

              <div className="mt-3 grid gap-3 2xl:grid-cols-2">{rfq.suppliers.map((supplier) => {
                const rank = rankMap.get(supplier.supplierId);
                return <div key={supplier.id} className={`rounded-xl border p-3 ${supplier.status === 'selected' ? isDark ? 'border-emerald-800 bg-emerald-950/20' : 'border-emerald-200 bg-emerald-50' : isDark ? 'border-slate-700 bg-slate-950/30' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><p className="font-black">{supplier.supplierName}</p>{rank && <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${rank === 1 ? 'bg-amber-500/15 text-amber-500' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>#{rank}</span>}</div><p className={`mt-1 ${muted}`}>{supplier.status}{supplier.leadTimeDays != null ? ` · ${supplier.leadTimeDays} hari` : ''}</p></div><div className="text-right"><CircleDollarSign size={15} className="ml-auto mb-1 text-cyan-500" /><p className="font-black">{supplier.quotedTotal == null ? '—' : money(supplier.quotedTotal)}</p></div></div>
                  <div className="mt-3 flex flex-wrap gap-2">{['sent', 'quoted'].includes(rfq.status) && supplier.status !== 'selected' && <button type="button" disabled={busyKey === `quote-${rfq.id}-${supplier.supplierId}`} onClick={() => void recordQuote(rfq, supplier.supplierId, supplier.supplierName)} className={`rounded-lg border px-2.5 py-1.5 font-bold ${isDark ? 'border-slate-700' : 'border-slate-200 bg-white'}`}>{supplier.status === 'responded' ? 'Update quote' : 'Record quote'}</button>}{rfq.status === 'quoted' && supplier.status === 'responded' && <button type="button" disabled={busyKey === `select-${rfq.id}`} onClick={() => void selectSupplier(rfq, supplier.supplierId, supplier.supplierName)} className="rounded-lg bg-cyan-600 px-2.5 py-1.5 font-bold text-white"><Trophy size={13} className="mr-1 inline" />Select supplier</button>}{supplier.status === 'selected' && <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1.5 font-black text-emerald-500"><CheckCircle2 size={13} className="mr-1 inline" />Winner</span>}</div>
                </div>;
              })}</div>
            </article>;
          })}
        </div>
      </section>
    </div>
  );
}
