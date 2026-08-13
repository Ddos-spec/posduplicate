import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getProducts, type ProductLite } from '../../services/supplyChainService';
import { getWebsiteCatalog, upsertWebsiteCatalogItem, type WebsiteCatalogItem } from '../../services/digitalWebsiteService';

export default function CatalogManager({ siteId }: { siteId: number }) {
  const [rows, setRows] = useState<WebsiteCatalogItem[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [itemId, setItemId] = useState('');
  const [price, setPrice] = useState('');
  const load = async () => {
    const [catalog, items] = await Promise.all([getWebsiteCatalog(siteId), getProducts()]);
    setRows(catalog); setProducts(items);
  };
  useEffect(() => { void load().catch(() => toast.error('Gagal memuat katalog')); }, [siteId]);

  const add = async () => {
    const id = Number(itemId); const webPrice = price.trim() ? Number(price) : null;
    if (!Number.isInteger(id) || id <= 0 || (webPrice !== null && (!Number.isFinite(webPrice) || webPrice < 0))) return toast.error('Produk tidak valid');
    try { await upsertWebsiteCatalogItem(siteId, id, { isPublished: false, webPrice, sortOrder: rows.length }); setItemId(''); setPrice(''); await load(); }
    catch { toast.error('Gagal menambah produk'); }
  };

  const toggle = async (row: WebsiteCatalogItem) => {
    try {
      await upsertWebsiteCatalogItem(siteId, row.item_id, { isPublished: !row.is_published, webPrice: row.web_price == null ? null : Number(row.web_price), displayTitle: row.display_title ?? null, sortOrder: row.sort_order });
      await load();
    } catch { toast.error('Gagal mengubah publikasi'); }
  };

  return <section className="rounded-2xl border bg-white p-4">
    <h2 className="font-black">Catalog projection</h2><p className="text-xs text-slate-500">Produk dan stock tetap source-of-truth POS.</p>
    <div className="mt-3 flex gap-2"><select className="min-w-0 flex-1 rounded-lg border px-3 py-2" value={itemId} onChange={(e) => setItemId(e.target.value)}><option value="">Pilih produk</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><input className="w-44 rounded-lg border px-3 py-2" placeholder="Web price" value={price} onChange={(e) => setPrice(e.target.value)} /><button onClick={() => void add()} className="rounded-lg bg-blue-600 px-3 py-2 font-bold text-white">Add draft</button></div>
    <div className="mt-4 space-y-2">{rows.map((row) => <div key={row.id} className="flex items-center justify-between rounded-lg border p-3"><div><b>{row.display_title || row.item_name}</b><p className="text-xs text-slate-500">stock {Number(row.stock || 0)} · IDR {Number(row.effective_price || 0).toLocaleString('id-ID')}</p></div><button onClick={() => void toggle(row)} className="text-xs font-bold text-blue-700">{row.is_published ? 'Unpublish' : 'Publish'}</button></div>)}</div>
  </section>;
}
