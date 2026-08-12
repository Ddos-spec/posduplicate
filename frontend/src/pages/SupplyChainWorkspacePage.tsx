import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRightLeft,
  Barcode,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Factory,
  Loader2,
  PackageCheck,
  RefreshCw,
  ScanLine,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Wrench,
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import {
  bootstrapWarehouse,
  completeManufacturingOrder,
  createBarcode,
  createEquipment,
  createMaintenanceRequest,
  createManufacturingOrder,
  createStockCount,
  createTransfer,
  executeTransfer,
  finalizeStockCount,
  getBalances,
  getEquipment,
  getLocations,
  getMaintenanceRequests,
  getManufacturingOrders,
  getOutlets,
  getProducts,
  getPurchaseOrders,
  getQualityChecks,
  getStockCounts,
  getSupplySummary,
  getTransfers,
  receivePurchaseOrder,
  resolveBarcode,
  resolveQualityCheck,
  transitionManufacturingOrder,
  updateMaintenanceRequest,
  updatePurchaseOrderStatus,
  type Equipment,
  type MaintenanceRequest,
  type ManufacturingOrder,
  type OutletLite,
  type ProductLite,
  type PurchaseOrder,
  type QualityCheck,
  type StockCount,
  type StockTransfer,
  type SupplyChainTab,
  type WarehouseBalance,
  type WarehouseLocation,
} from '../services/supplyChainService';
import ProcurementRfqPanelV2 from '../components/supply-chain/ProcurementRfqPanelV2';

const money = (value: unknown) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
const number = (value: unknown) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(Number(value || 0));
const dateText = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value)) : '—';

export default function SupplyChainWorkspacePage() {
  const navigate = useNavigate();
  const { isDark } = useThemeStore();
  const [tab, setTab] = useState<SupplyChainTab>('procurement');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [outlets, setOutlets] = useState<OutletLite[]>([]);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [balances, setBalances] = useState<WarehouseBalance[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [counts, setCounts] = useState<StockCount[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [manufacturingOrders, setManufacturingOrders] = useState<ManufacturingOrder[]>([]);
  const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [barcodeResult, setBarcodeResult] = useState<any>(null);

  const [transferForm, setTransferForm] = useState({ outletId: '', sourceLocationId: '', destinationLocationId: '', inventoryId: '', quantity: '' });
  const [barcodeForm, setBarcodeForm] = useState({ outletId: '', inventoryId: '', barcode: '', lookup: '' });
  const [moForm, setMoForm] = useState({ outletId: '', itemId: '', quantityPlanned: '1' });
  const [equipmentForm, setEquipmentForm] = useState({ outletId: '', code: '', name: '', category: '' });
  const [maintenanceForm, setMaintenanceForm] = useState({ equipmentId: '', title: '', priority: 'normal' });

  const card = isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const input = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 ${isDark ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`;

  const load = async () => {
    setLoading(true);
    try {
      const [summaryData, outletData, locationData, balanceData, transferData, countData, poData, productData, moData, qcData, equipmentData, maintenanceData] = await Promise.all([
        getSupplySummary(),
        getOutlets(),
        getLocations(),
        getBalances(),
        getTransfers(),
        getStockCounts(),
        getPurchaseOrders(),
        getProducts(),
        getManufacturingOrders(),
        getQualityChecks(),
        getEquipment(),
        getMaintenanceRequests(),
      ]);
      setSummary(summaryData);
      setOutlets(outletData);
      setLocations(locationData);
      setBalances(balanceData);
      setTransfers(transferData);
      setCounts(countData);
      setPurchaseOrders(poData);
      setProducts(productData);
      setManufacturingOrders(moData);
      setQualityChecks(qcData);
      setEquipment(equipmentData);
      setMaintenanceRequests(maintenanceData);
    } catch (error) {
      console.error(error);
      toast.error('Supply-chain workspace gagal dimuat. Pastikan migration P1 sudah diterapkan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const transferLocations = useMemo(() => locations.filter((location) => !transferForm.outletId || location.outlet_id === Number(transferForm.outletId)), [locations, transferForm.outletId]);
  const transferableBalances = useMemo(() => balances.filter((balance) => (!transferForm.outletId || balance.outlet_id === Number(transferForm.outletId)) && (!transferForm.sourceLocationId || balance.location_id === Number(transferForm.sourceLocationId)) && Number(balance.quantity) > 0), [balances, transferForm.outletId, transferForm.sourceLocationId]);
  const uniqueInventory = useMemo(() => {
    const map = new Map<number, WarehouseBalance>();
    balances.forEach((balance) => map.set(balance.inventory_id, balance));
    return [...map.values()];
  }, [balances]);

  const doBootstrap = async () => {
    setBusy(true);
    try {
      const result = await bootstrapWarehouse();
      toast.success(`Warehouse ready · ${result.seededBalances || 0} balance seeded`);
      await load();
    } catch (error) {
      console.error(error);
      toast.error('Warehouse bootstrap gagal');
    } finally {
      setBusy(false);
    }
  };

  const submitTransfer = async () => {
    const payload = {
      outletId: Number(transferForm.outletId),
      sourceLocationId: Number(transferForm.sourceLocationId),
      destinationLocationId: Number(transferForm.destinationLocationId),
      inventoryId: Number(transferForm.inventoryId),
      quantity: Number(transferForm.quantity),
    };
    if (Object.values(payload).some((value) => !Number.isFinite(value) || value <= 0) || payload.sourceLocationId === payload.destinationLocationId) return toast.error('Lengkapi transfer dengan lokasi berbeda dan qty > 0');
    setBusy(true);
    try {
      await createTransfer(payload);
      setTransferForm({ ...transferForm, inventoryId: '', quantity: '' });
      await load();
      toast.success('Transfer dibuat dan menunggu execute');
    } catch (error) {
      console.error(error);
      toast.error('Gagal membuat transfer');
    } finally { setBusy(false); }
  };

  const runTransfer = async (transfer: StockTransfer) => {
    try {
      await executeTransfer(transfer.id);
      await load();
      toast.success(`${transfer.transfer_number} selesai`);
    } catch (error) {
      console.error(error);
      toast.error('Transfer gagal; cek stock lokasi sumber');
    }
  };

  const startCount = async (location: WarehouseLocation) => {
    try {
      await createStockCount(location.id, `Cycle count ${location.code}`);
      await load();
      toast.success(`Stock count ${location.code} dibuat`);
    } catch (error) {
      console.error(error);
      toast.error('Gagal membuat stock count');
    }
  };

  const finalizeCount = async (count: StockCount) => {
    const lines: Array<{ inventoryId: number; countedQuantity: number }> = [];
    for (const line of count.lines) {
      const answer = window.prompt(`Count ${line.inventoryName}\nExpected: ${number(line.expectedQuantity)}`, String(line.expectedQuantity));
      if (answer === null) return;
      const countedQuantity = Number(answer);
      if (!Number.isFinite(countedQuantity) || countedQuantity < 0) return toast.error('Counted quantity tidak valid');
      lines.push({ inventoryId: line.inventoryId, countedQuantity });
    }
    try {
      await finalizeStockCount(count.id, lines);
      await load();
      toast.success('Stock count finalized + aggregate reconciled');
    } catch (error) {
      console.error(error);
      toast.error('Stock count gagal difinalisasi');
    }
  };

  const submitBarcode = async () => {
    if (!barcodeForm.outletId || !barcodeForm.inventoryId || !barcodeForm.barcode.trim()) return toast.error('Outlet, inventory dan barcode wajib');
    try {
      await createBarcode({ outletId: Number(barcodeForm.outletId), inventoryId: Number(barcodeForm.inventoryId), barcode: barcodeForm.barcode.trim() });
      setBarcodeForm({ ...barcodeForm, barcode: '' });
      toast.success('Barcode alias tersimpan');
      await load();
    } catch (error) {
      console.error(error);
      toast.error('Barcode gagal disimpan / sudah dipakai');
    }
  };

  const lookupBarcode = async () => {
    if (!barcodeForm.lookup.trim()) return;
    setBarcodeResult(null);
    try {
      setBarcodeResult(await resolveBarcode(barcodeForm.lookup.trim()));
    } catch (error) {
      console.error(error);
      toast.error('Barcode tidak ditemukan');
    }
  };

  const submitMO = async () => {
    if (!moForm.outletId || !moForm.itemId || Number(moForm.quantityPlanned) <= 0) return toast.error('Outlet, product dan qty wajib');
    try {
      await createManufacturingOrder({ outletId: Number(moForm.outletId), itemId: Number(moForm.itemId), quantityPlanned: Number(moForm.quantityPlanned) });
      await load();
      toast.success('Manufacturing order dibuat dari recipe/BOM');
    } catch (error) {
      console.error(error);
      toast.error('MO gagal dibuat. Pastikan product punya recipe/BOM.');
    }
  };

  const moAction = async (mo: ManufacturingOrder, action: 'confirm' | 'start' | 'cancel') => {
    try {
      await transitionManufacturingOrder(mo.id, action);
      await load();
    } catch (error) {
      console.error(error);
      toast.error('Transisi MO tidak valid');
    }
  };

  const completeMO = async (mo: ManufacturingOrder) => {
    const answer = window.prompt(`Produced quantity untuk ${mo.mo_number}`, String(mo.quantity_planned));
    if (answer === null) return;
    try {
      await completeManufacturingOrder(mo.id, Number(answer));
      await load();
      toast.success('Production posted dan QC otomatis dibuat');
    } catch (error) {
      console.error(error);
      toast.error('Completion gagal; cek material stock');
    }
  };

  const resolveQC = async (qc: QualityCheck, status: 'pass' | 'fail' | 'waived') => {
    const notes = window.prompt(`Catatan QC (${status})`, qc.notes || '') || undefined;
    try {
      await resolveQualityCheck(qc.id, status, notes);
      await load();
      toast.success(`QC ${status}`);
    } catch (error) {
      console.error(error);
      toast.error('QC gagal diupdate');
    }
  };

  const submitEquipment = async () => {
    if (!equipmentForm.outletId || !equipmentForm.code.trim() || !equipmentForm.name.trim()) return toast.error('Outlet, code dan equipment wajib');
    try {
      await createEquipment({ outletId: Number(equipmentForm.outletId), code: equipmentForm.code.trim(), name: equipmentForm.name.trim(), category: equipmentForm.category.trim() || undefined });
      setEquipmentForm({ ...equipmentForm, code: '', name: '', category: '' });
      await load();
      toast.success('Equipment registered');
    } catch (error) {
      console.error(error);
      toast.error('Equipment gagal dibuat');
    }
  };

  const submitMaintenance = async () => {
    if (!maintenanceForm.equipmentId || !maintenanceForm.title.trim()) return toast.error('Equipment dan issue title wajib');
    try {
      await createMaintenanceRequest({ equipmentId: Number(maintenanceForm.equipmentId), title: maintenanceForm.title.trim(), priority: maintenanceForm.priority });
      setMaintenanceForm({ ...maintenanceForm, title: '' });
      await load();
      toast.success('Maintenance request opened');
    } catch (error) {
      console.error(error);
      toast.error('Maintenance request gagal');
    }
  };

  const maintenanceAction = async (request: MaintenanceRequest, status: string) => {
    try {
      await updateMaintenanceRequest(request.id, status);
      await load();
    } catch (error) {
      console.error(error);
      toast.error('Maintenance status gagal');
    }
  };

  const poAction = async (po: PurchaseOrder, status: string) => {
    try {
      await updatePurchaseOrderStatus(po.id, status);
      await load();
      toast.success(`${po.po_number} → ${status}`);
    } catch (error) {
      console.error(error);
      toast.error('Status PO tidak valid');
    }
  };

  const receiveAllPO = async (po: PurchaseOrder) => {
    const remaining = po.purchase_order_items.map((item) => ({ itemId: item.id, receivedQty: Number(item.quantity) }));
    if (!window.confirm(`Terima seluruh sisa barang ${po.po_number}? Stock akan diposting ke lokasi RECEIVE.`)) return;
    try {
      await receivePurchaseOrder(po.id, remaining);
      await load();
      toast.success(`${po.po_number} received`);
    } catch (error) {
      console.error(error);
      toast.error('Receiving gagal');
    }
  };

  if (loading) return <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50'}`}><Loader2 className="h-9 w-9 animate-spin text-blue-500" /></div>;

  const tabs: Array<[SupplyChainTab, string, typeof ShoppingCart]> = [
    ['procurement', 'Procurement', ShoppingCart],
    ['warehouse', 'Warehouse', Boxes],
    ['barcode', 'Barcode', Barcode],
    ['manufacturing', 'Manufacturing', Factory],
    ['quality', 'Quality', ShieldCheck],
    ['maintenance', 'Maintenance', Wrench],
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`sticky top-0 z-40 border-b ${isDark ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-white/95'} backdrop-blur-xl`}>
        <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/module-selector')} className={`rounded-xl border p-2 ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'}`}><ArrowLeft size={18} /></button>
            <div><div className="flex items-center gap-2"><Boxes className="text-cyan-500" size={20} /><h1 className="font-black">Supply Chain Operations</h1></div><p className={`text-xs ${muted}`}>Procure → Receive → Locate → Transfer → Count → Produce → Quality → Maintain</p></div>
          </div>
          <div className="flex gap-2"><button disabled={busy} onClick={() => void doBootstrap()} className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-bold text-white hover:bg-cyan-700 disabled:opacity-60"><Settings2 size={15} className="mr-2 inline" />Bootstrap warehouse</button><button onClick={() => void load()} className={`rounded-xl border p-2.5 ${isDark ? 'border-slate-700' : 'border-slate-200 bg-white'}`}><RefreshCw size={16} /></button></div>
        </div>
      </header>

      <main className="mx-auto max-w-[1700px] space-y-6 px-4 py-6 sm:px-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ['Locations', summary?.locations || locations.length, Boxes],
            ['Open PO', purchaseOrders.filter((po) => !['received', 'cancelled'].includes(po.status)).length, ShoppingCart],
            ['Transfers ready', transfers.filter((transfer) => transfer.status === 'ready').length, ArrowRightLeft],
            ['MO active', manufacturingOrders.filter((mo) => !['done', 'cancelled'].includes(mo.status)).length, Factory],
            ['QC pending', qualityChecks.filter((qc) => qc.status === 'pending').length, ShieldCheck],
            ['Maintenance open', maintenanceRequests.filter((r) => !['done', 'cancelled'].includes(r.status)).length, Wrench],
          ].map(([label, value, Icon]) => { const MetricIcon = Icon as typeof Boxes; return <div key={String(label)} className={`rounded-2xl border p-4 ${card}`}><MetricIcon size={18} className="mb-3 text-cyan-500" /><p className="text-2xl font-black">{String(value)}</p><p className={`text-xs ${muted}`}>{String(label)}</p></div>; })}
        </section>

        <nav className={`flex gap-2 overflow-x-auto rounded-2xl border p-2 ${card}`}>{tabs.map(([value, label, Icon]) => <button key={value} onClick={() => setTab(value)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${tab === value ? 'bg-cyan-600 text-white' : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}><Icon size={16} />{label}</button>)}</nav>

        {tab === 'procurement' && <div className="space-y-5"><ProcurementRfqPanelV2 onPoConverted={load} /><section className={`rounded-2xl border ${card}`}>
          <div className="border-b border-inherit p-4"><h2 className="font-black">Purchase order control</h2><p className={`mt-1 text-xs ${muted}`}>Tenant-gated state machine. Receiving is atomic and posts aggregate stock + warehouse RECEIVE ledger together.</p></div>
          <div className="divide-y divide-inherit">{purchaseOrders.length === 0 ? <p className={`p-6 text-sm ${muted}`}>Belum ada PO.</p> : purchaseOrders.map((po) => <article key={po.id} className="p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div><div className="flex items-center gap-2"><p className="font-black">{po.po_number}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>{po.status}</span></div><p className={`mt-1 text-xs ${muted}`}>{po.suppliers?.name || 'No supplier'} · expected {dateText(po.expected_date)} · {po.purchase_order_items.length} lines</p></div><p className="text-xl font-black">{money(po.total)}</p></div>
            <div className="mt-3 flex flex-wrap gap-2">{po.status === 'draft' && <button onClick={() => void poAction(po, 'pending')} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white">Submit</button>}{po.status === 'pending' && <button onClick={() => void poAction(po, 'approved')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Approve</button>}{po.status === 'approved' && <button onClick={() => void poAction(po, 'ordered')} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">Mark ordered</button>}{['approved', 'ordered', 'partial'].includes(po.status) && <button onClick={() => void receiveAllPO(po)} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white"><PackageCheck size={13} className="mr-1 inline" />Receive all remaining</button>}</div>
          </article>)}</div>
        </section></div>}

        {tab === 'warehouse' && <div className="space-y-5">
          <section className={`rounded-2xl border p-4 ${card}`}><div className="mb-3"><h2 className="font-black">Create internal transfer</h2><p className={`text-xs ${muted}`}>Transfer antar lokasi tidak mengubah aggregate stock; hanya location ledger.</p></div><div className="grid gap-2 lg:grid-cols-6"><select className={input} value={transferForm.outletId} onChange={(e) => setTransferForm({ outletId: e.target.value, sourceLocationId: '', destinationLocationId: '', inventoryId: '', quantity: '' })}><option value="">Outlet</option>{outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select><select className={input} value={transferForm.sourceLocationId} onChange={(e) => setTransferForm({ ...transferForm, sourceLocationId: e.target.value, inventoryId: '' })}><option value="">From location</option>{transferLocations.map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}</select><select className={input} value={transferForm.destinationLocationId} onChange={(e) => setTransferForm({ ...transferForm, destinationLocationId: e.target.value })}><option value="">To location</option>{transferLocations.filter((l) => String(l.id) !== transferForm.sourceLocationId).map((l) => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}</select><select className={input} value={transferForm.inventoryId} onChange={(e) => setTransferForm({ ...transferForm, inventoryId: e.target.value })}><option value="">Inventory</option>{transferableBalances.map((b) => <option key={b.id} value={b.inventory_id}>{b.inventory_name} · available {number(b.quantity)}</option>)}</select><input className={input} type="number" min="0.001" step="0.001" placeholder="Qty" value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })} /><button disabled={busy} onClick={() => void submitTransfer()} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white">Create transfer</button></div></section>

          <div className="grid gap-5 2xl:grid-cols-[1.25fr_0.75fr]">
            <section className={`rounded-2xl border ${card}`}><div className="border-b border-inherit p-4"><h2 className="font-black">Location balances</h2></div><div className="max-h-[600px] overflow-auto"><table className="w-full min-w-[780px] text-sm"><thead><tr className={muted}>{['Inventory', 'Outlet', 'Location', 'Location Qty', 'Aggregate', 'Unit'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs">{h}</th>)}</tr></thead><tbody className="divide-y divide-inherit">{balances.map((b) => <tr key={b.id}><td className="px-4 py-3 font-bold">{b.inventory_name}<div className={`text-[11px] font-normal ${muted}`}>{b.sku || 'no SKU'}</div></td><td className="px-4 py-3">{b.outlet_name || b.outlet_id}</td><td className="px-4 py-3"><span className="font-bold">{b.location_code}</span> · {b.location_name}</td><td className="px-4 py-3 font-black">{number(b.quantity)}</td><td className="px-4 py-3">{number(b.aggregate_stock)}</td><td className="px-4 py-3">{b.unit}</td></tr>)}</tbody></table></div></section>
            <section className={`rounded-2xl border p-4 ${card}`}><h2 className="mb-3 font-black">Locations & cycle count</h2><div className="space-y-2">{locations.map((location) => <div key={location.id} className={`flex items-center justify-between rounded-xl border p-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}><div><p className="font-bold">{location.code} · {location.name}</p><p className={`text-xs ${muted}`}>{location.outlet_name || `Outlet ${location.outlet_id}`} · {location.location_type}</p></div><button onClick={() => void startCount(location)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>Count</button></div>)}</div></section>
          </div>

          <div className="grid gap-5 xl:grid-cols-2"><section className={`rounded-2xl border ${card}`}><div className="border-b border-inherit p-4"><h2 className="font-black">Transfers</h2></div><div className="divide-y divide-inherit">{transfers.slice(0, 12).map((t) => <div key={t.id} className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-bold">{t.transfer_number}</p><p className={`text-xs ${muted}`}>{t.source_code} → {t.destination_code} · {t.lines.length} lines</p></div><div className="flex items-center gap-2"><span className={`text-xs font-bold ${muted}`}>{t.status}</span>{t.status === 'ready' && <button onClick={() => void runTransfer(t)} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white">Execute</button>}</div></div></div>)}</div></section><section className={`rounded-2xl border ${card}`}><div className="border-b border-inherit p-4"><h2 className="font-black">Stock counts</h2></div><div className="divide-y divide-inherit">{counts.slice(0, 12).map((c) => <div key={c.id} className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-bold">{c.count_number}</p><p className={`text-xs ${muted}`}>{c.location_code} · {c.lines.length} lines · {c.status}</p></div>{c.status === 'counting' && <button onClick={() => void finalizeCount(c)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Finalize</button>}</div></div>)}</div></section></div>
        </div>}

        {tab === 'barcode' && <div className="grid gap-5 xl:grid-cols-2"><section className={`rounded-2xl border p-4 ${card}`}><div className="mb-4 flex items-center gap-2"><Barcode className="text-cyan-500" /><h2 className="font-black">Register barcode alias</h2></div><div className="space-y-3"><select className={input} value={barcodeForm.outletId} onChange={(e) => setBarcodeForm({ ...barcodeForm, outletId: e.target.value, inventoryId: '' })}><option value="">Outlet</option>{outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select><select className={input} value={barcodeForm.inventoryId} onChange={(e) => setBarcodeForm({ ...barcodeForm, inventoryId: e.target.value })}><option value="">Inventory</option>{uniqueInventory.filter((b) => !barcodeForm.outletId || b.outlet_id === Number(barcodeForm.outletId)).map((b) => <option key={b.inventory_id} value={b.inventory_id}>{b.inventory_name} · {b.sku || 'no SKU'}</option>)}</select><input className={input} value={barcodeForm.barcode} onChange={(e) => setBarcodeForm({ ...barcodeForm, barcode: e.target.value })} placeholder="Scan / type barcode" /><button onClick={() => void submitBarcode()} className="w-full rounded-xl bg-cyan-600 py-2.5 text-sm font-bold text-white">Save barcode</button></div></section><section className={`rounded-2xl border p-4 ${card}`}><div className="mb-4 flex items-center gap-2"><ScanLine className="text-blue-500" /><h2 className="font-black">Barcode lookup</h2></div><div className="flex gap-2"><input className={input} value={barcodeForm.lookup} onChange={(e) => setBarcodeForm({ ...barcodeForm, lookup: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') void lookupBarcode(); }} placeholder="Scan barcode" /><button onClick={() => void lookupBarcode()} className="rounded-xl bg-blue-600 px-4 text-sm font-bold text-white">Lookup</button></div>{barcodeResult && <div className={`mt-4 rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}><p className="text-xl font-black">{barcodeResult.name}</p><p className={`mt-1 text-sm ${muted}`}>{barcodeResult.sku || 'no SKU'} · {barcodeResult.unit}</p><p className="mt-3 text-2xl font-black text-cyan-500">{number(barcodeResult.current_stock)} aggregate stock</p></div>}</section></div>}

        {tab === 'manufacturing' && <div className="space-y-5"><section className={`rounded-2xl border p-4 ${card}`}><div className="mb-4"><h2 className="font-black">Create manufacturing order</h2><p className={`text-xs ${muted}`}>Recipe/BOM disnapshot saat MO dibuat supaya perubahan recipe berikutnya tidak mengubah histori produksi.</p></div><div className="grid gap-2 lg:grid-cols-4"><select className={input} value={moForm.outletId} onChange={(e) => setMoForm({ ...moForm, outletId: e.target.value, itemId: '' })}><option value="">Outlet</option>{outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select><select className={input} value={moForm.itemId} onChange={(e) => setMoForm({ ...moForm, itemId: e.target.value })}><option value="">Finished product</option>{products.filter((p) => !moForm.outletId || p.outlet_id === Number(moForm.outletId)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input className={input} type="number" min="0.001" step="0.001" value={moForm.quantityPlanned} onChange={(e) => setMoForm({ ...moForm, quantityPlanned: e.target.value })} placeholder="Planned qty" /><button onClick={() => void submitMO()} className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white">Create MO</button></div></section><section className={`rounded-2xl border ${card}`}><div className="border-b border-inherit p-4"><h2 className="font-black">Manufacturing orders</h2></div><div className="divide-y divide-inherit">{manufacturingOrders.map((mo) => <article key={mo.id} className="p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex gap-2"><p className="font-black">{mo.mo_number}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>{mo.status}</span></div><p className={`mt-1 text-xs ${muted}`}>{mo.item_name || `Item ${mo.item_id}`} · plan {number(mo.quantity_planned)} · produced {number(mo.quantity_produced)} · {mo.consumptions.length} BOM lines</p></div><div className="flex flex-wrap gap-2">{mo.status === 'draft' && <button onClick={() => void moAction(mo, 'confirm')} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">Confirm</button>}{mo.status === 'confirmed' && <button onClick={() => void moAction(mo, 'start')} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">Start</button>}{mo.status === 'in_progress' && <button onClick={() => void completeMO(mo)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Complete</button>}{['draft', 'confirmed'].includes(mo.status) && <button onClick={() => void moAction(mo, 'cancel')} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>Cancel</button>}</div></div></article>)}</div></section></div>}

        {tab === 'quality' && <section className={`rounded-2xl border ${card}`}><div className="border-b border-inherit p-4"><h2 className="font-black">Quality control queue</h2><p className={`mt-1 text-xs ${muted}`}>MO completion automatically creates a pending production-output QC record.</p></div><div className="divide-y divide-inherit">{qualityChecks.length === 0 ? <p className={`p-6 ${muted}`}>Belum ada QC.</p> : qualityChecks.map((qc) => <article key={qc.id} className="p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex gap-2"><p className="font-bold">{qc.check_type}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${qc.status === 'pass' ? 'bg-emerald-500/15 text-emerald-500' : qc.status === 'fail' ? 'bg-rose-500/15 text-rose-500' : 'bg-amber-500/15 text-amber-500'}`}>{qc.status}</span></div><p className={`mt-1 text-xs ${muted}`}>{qc.item_name || qc.inventory_name || 'General check'} · {qc.reference_type || 'manual'} {qc.reference_id || ''}</p></div>{qc.status === 'pending' && <div className="flex gap-2"><button onClick={() => void resolveQC(qc, 'pass')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Pass</button><button onClick={() => void resolveQC(qc, 'fail')} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white">Fail</button><button onClick={() => void resolveQC(qc, 'waived')} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>Waive</button></div>}</div></article>)}</div></section>}

        {tab === 'maintenance' && <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-2"><section className={`rounded-2xl border p-4 ${card}`}><h2 className="mb-4 font-black">Register equipment</h2><div className="grid gap-2 sm:grid-cols-2"><select className={input} value={equipmentForm.outletId} onChange={(e) => setEquipmentForm({ ...equipmentForm, outletId: e.target.value })}><option value="">Outlet</option>{outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select><input className={input} placeholder="Code" value={equipmentForm.code} onChange={(e) => setEquipmentForm({ ...equipmentForm, code: e.target.value })} /><input className={input} placeholder="Equipment name" value={equipmentForm.name} onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })} /><input className={input} placeholder="Category" value={equipmentForm.category} onChange={(e) => setEquipmentForm({ ...equipmentForm, category: e.target.value })} /></div><button onClick={() => void submitEquipment()} className="mt-3 w-full rounded-xl bg-cyan-600 py-2.5 text-sm font-bold text-white">Register equipment</button></section><section className={`rounded-2xl border p-4 ${card}`}><h2 className="mb-4 font-black">Open maintenance request</h2><div className="space-y-2"><select className={input} value={maintenanceForm.equipmentId} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, equipmentId: e.target.value })}><option value="">Equipment</option>{equipment.map((e) => <option key={e.id} value={e.id}>{e.code} · {e.name}</option>)}</select><input className={input} placeholder="Issue / work title" value={maintenanceForm.title} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })} /><select className={input} value={maintenanceForm.priority} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, priority: e.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select><button onClick={() => void submitMaintenance()} className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white">Open request</button></div></section></div><div className="grid gap-5 xl:grid-cols-2"><section className={`rounded-2xl border ${card}`}><div className="border-b border-inherit p-4"><h2 className="font-black">Equipment register</h2></div><div className="divide-y divide-inherit">{equipment.map((e) => <div key={e.id} className="flex items-center justify-between p-4"><div><p className="font-bold">{e.code} · {e.name}</p><p className={`text-xs ${muted}`}>{e.category || 'Uncategorized'} · next {dateText(e.next_maintenance_at)}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${e.status === 'down' ? 'bg-rose-500/15 text-rose-500' : e.status === 'maintenance' ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'}`}>{e.status}</span></div>)}</div></section><section className={`rounded-2xl border ${card}`}><div className="border-b border-inherit p-4"><h2 className="font-black">Maintenance queue</h2></div><div className="divide-y divide-inherit">{maintenanceRequests.map((r) => <div key={r.id} className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-bold">{r.title}</p><p className={`text-xs ${muted}`}>{r.equipment_code} · {r.priority} · {r.status}</p></div><div className="flex gap-1">{r.status === 'open' && <button onClick={() => void maintenanceAction(r, 'planned')} className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white">Plan</button>}{r.status === 'planned' && <button onClick={() => void maintenanceAction(r, 'in_progress')} className="rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-white">Start</button>}{r.status === 'in_progress' && <button onClick={() => void maintenanceAction(r, 'done')} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white">Done</button>}</div></div></div>)}</div></section></div></div>}

        <section className={`rounded-2xl border p-4 ${card}`}><div className="flex items-start gap-3"><ClipboardCheck className="mt-0.5 text-cyan-500" size={18} /><div><p className="font-black">P1 supply-chain contract</p><p className={`mt-1 text-sm ${muted}`}>Aggregate inventory remains canonical. Warehouse location ledger is append-only. Internal transfer preserves aggregate stock. Receiving and count variance update aggregate + audit ledger atomically. Manufacturing consumes the BOM snapshot and emits a QC record.</p></div></div></section>
      </main>
    </div>
  );
}
