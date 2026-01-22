import { useState, useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useInventoryConfig } from './inventoryConfigStore';
import { MOCK_INVENTORY_ITEMS } from './mockInventoryData';
import { MOCK_PHARMACY_ITEMS, MOCK_RETAIL_ITEMS } from './mockVariantsData';
import { inventoryService } from '../../services/inventoryService';
import type { InventoryItem } from '../../services/inventoryService';
import {
  Search, Filter, Edit2, History, AlertCircle, CheckCircle, XCircle, ScanBarcode, Truck, Store, Loader2, Plus
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function StockPage() {
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const { businessType } = useInventoryConfig();
  const location = useLocation();

  const isDemo = location.pathname.startsWith('/demo');

  // Dynamic Data Loading
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isDemo);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  // Fetch data from API or use mock data
  useEffect(() => {
    if (isDemo) {
      // Demo mode: use mock data
      if (businessType === 'pharmacy') {
        setItems(MOCK_PHARMACY_ITEMS);
      } else if (businessType === 'retail') {
        setItems(MOCK_RETAIL_ITEMS);
      } else {
        setItems(MOCK_INVENTORY_ITEMS);
      }
      return;
    }

    // Real mode: fetch from API
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const response = await inventoryService.getAll({
          outlet_id: user?.outlet_id,
          business_type: businessType
        });

        if (response.success) {
          // Transform API data to match component format
          const transformedItems = response.data.map((item: InventoryItem) => ({
            id: item.id,
            name: item.name,
            sku: item.sku || '-',
            category: item.category,
            currentStock: parseFloat(item.current_stock.toString()),
            unit: item.unit,
            minStock: parseFloat(item.min_stock.toString()),
            costPerUnit: parseFloat(item.cost_amount.toString()),
            lastUpdated: new Date().toISOString().split('T')[0],
            status: item.status,
            supplier: item.suppliers?.name || '-',
            source: item.source || 'Supplier Langsung',
            daysCover: item.days_cover ? parseFloat(item.days_cover.toString()) : 0,
            batchNo: item.batch_no,
            expiryDate: item.expiry_date,
            variant: item.variant,
            barcode: item.barcode
          }));
          setItems(transformedItems);
        }
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
        toast.error('Gagal memuat data inventory');
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [isDemo, businessType, user?.outlet_id]);

  const [editItem, setEditItem] = useState<any | null>(null);
  const [adjustQty, setAdjustQty] = useState<string>('');
  const [reason, setReason] = useState('Stock Opname');

  const filteredItems = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || item.status === filter;
    return matchSearch && matchFilter;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Aman': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1 w-fit"><CheckCircle size={12} /> Aman</span>;
      case 'Menipis': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 flex items-center gap-1 w-fit"><AlertCircle size={12} /> Menipis</span>;
      case 'Habis': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1 w-fit"><XCircle size={12} /> Habis</span>;
      default: return null;
    }
  };

  const getSourceBadge = (source: string) => {
    if (source === 'DC') return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 w-fit"><Truck size={10} /> DC PUSAT</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit"><Store size={10} /> VENDOR</span>;
  };

  const handleSaveAdjustment = async () => {
    if (!editItem || !adjustQty) return;

    const newQty = parseFloat(adjustQty);
    if (isNaN(newQty)) {
      toast.error('Jumlah tidak valid');
      return;
    }

    if (isDemo) {
      // Demo mode: update local state only
      setItems(prev => prev.map(i => {
        if (i.id === editItem.id) {
          let status: any = 'Aman';
          if (newQty === 0) status = 'Habis';
          else if (newQty <= i.minStock) status = 'Menipis';
          return { ...i, currentStock: newQty, status, lastUpdated: new Date().toISOString().split('T')[0] };
        }
        return i;
      }));
      toast.success(`Stok ${editItem.name} berhasil diupdate!`);
    } else {
      // Real mode: call API
      try {
        const diff = newQty - editItem.currentStock;
        const type = diff >= 0 ? 'in' : 'out';
        const quantity = Math.abs(diff);

        const response = await inventoryService.adjustStock(editItem.id, {
          quantity,
          type,
          notes: reason
        });

        if (response.success) {
          // Update local state
          setItems(prev => prev.map(i => {
            if (i.id === editItem.id) {
              let status: any = 'Aman';
              if (newQty === 0) status = 'Habis';
              else if (newQty <= i.minStock) status = 'Menipis';
              return { ...i, currentStock: newQty, status, lastUpdated: new Date().toISOString().split('T')[0] };
            }
            return i;
          }));
          toast.success(`Stok ${editItem.name} berhasil diupdate!`);
        }
      } catch (error) {
        console.error('Failed to adjust stock:', error);
        toast.error('Gagal mengupdate stok');
        return;
      }
    }

    setEditItem(null);
    setAdjustQty('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Stok {businessType === 'pharmacy' ? 'Obat' : businessType === 'retail' ? 'Produk' : 'Gudang Outlet'}
          </h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {businessType === 'pharmacy' ? 'Kelola stok obat, expiry date, dan batch number.' : 
             businessType === 'retail' ? 'Kelola varian produk, SKU, dan stok toko.' : 
             'Monitoring stok DC vs Supplier, Days Cover, dan Opname.'}
          </p>
        </div>
        <div className="flex gap-2">
            <button className={`px-4 py-2 rounded-lg font-medium border ${isDark ? 'border-slate-600 text-white hover:bg-slate-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                <History className="w-4 h-4 inline mr-2" /> Riwayat
            </button>
            <button className="px-4 py-2 rounded-lg font-medium bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30">
                + Item Baru
            </button>
        </div>
      </div>

      {/* Controls */}
      <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder="Cari nama barang, SKU, atau supplier..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg outline-none border focus:ring-2 focus:ring-orange-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
            </div>
            <div className="flex items-center gap-2">
                <Filter className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <select 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className={`px-4 py-2 rounded-lg outline-none border focus:ring-2 focus:ring-orange-500 cursor-pointer ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                >
                    <option value="All">Semua Status</option>
                    <option value="Aman">Aman</option>
                    <option value="Menipis">Menipis</option>
                    <option value="Habis">Habis</option>
                </select>
            </div>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className={`border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                        <th className={`p-4 font-semibold text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Item Details</th>
                        <th className={`p-4 font-semibold text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Kategori / Source</th>
                        <th className={`p-4 font-semibold text-sm text-right ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Stok Fisik</th>
                        
                        {/* Dynamic Columns based on Business Type */}
                        {businessType === 'pharmacy' && (
                          <th className={`p-4 font-semibold text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Expiry / Batch</th>
                        )}
                        {businessType === 'retail' && (
                          <th className={`p-4 font-semibold text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Varian</th>
                        )}
                        {/* FnB Specific Column */}
                        {businessType === 'fnb' && (
                          <th className={`p-4 font-semibold text-sm text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Days Cover</th>
                        )}

                        <th className={`p-4 font-semibold text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Status</th>
                        <th className={`p-4 font-semibold text-sm text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Aksi</th>
                    </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-100'}`}>
                    {filteredItems.map(item => (
                        <tr key={item.id} className={`group transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-orange-50/30'}`}>
                            <td className="p-4">
                                <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.name}</p>
                                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                  <ScanBarcode size={12} />
                                  <span>{item.sku}</span>
                                </div>
                            </td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                    {item.category}
                                </span>
                                {item.source && (
                                  <div className="mt-1">
                                    {getSourceBadge(item.source)}
                                  </div>
                                )}
                            </td>
                            <td className="p-4 text-right">
                                <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {item.currentStock} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
                                </p>
                                {/* Stock Level Bar */}
                                <div className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      item.currentStock <= item.minStock ? 'bg-red-500' : 
                                      item.currentStock <= item.minStock * 2 ? 'bg-yellow-500' : 'bg-emerald-500'
                                    }`} 
                                    style={{ width: `${Math.min((item.currentStock / (item.minStock * 3)) * 100, 100)}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Min: {item.minStock}</p>
                            </td>

                            {/* Dynamic Row Data */}
                            {businessType === 'pharmacy' && (
                              <td className="p-4">
                                <p className="text-xs font-mono bg-gray-100 dark:bg-slate-700 px-1 rounded w-fit mb-1">{item.batchNo}</p>
                                <p className={`text-xs font-bold ${item.expiryDate?.includes('2025') ? 'text-red-500' : 'text-green-500'}`}>
                                  Exp: {item.expiryDate}
                                </p>
                              </td>
                            )}
                            {businessType === 'retail' && (
                              <td className="p-4">
                                <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.variant}</p>
                                <p className="text-xs text-gray-400">{item.barcode}</p>
                              </td>
                            )}
                            {businessType === 'fnb' && (
                              <td className="p-4 text-center">
                                <span className={`text-sm font-bold ${
                                  (item.daysCover || 0) < 3 ? 'text-red-500' : 
                                  (item.daysCover || 0) > 7 ? 'text-blue-500' : 'text-green-500'
                                }`}>
                                  {item.daysCover} Hari
                                </span>
                              </td>
                            )}

                            <td className="p-4">{getStatusBadge(item.status)}</td>
                            <td className="p-4 text-center">
                                <button 
                                    onClick={() => {
                                        setEditItem(item);
                                        setAdjustQty(item.currentStock.toString());
                                    }}
                                    className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-orange-600'}`}
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Stock Opname</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Update stok fisik untuk <strong>{editItem.name}</strong></p>
                
                <div className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Stok Fisik ({editItem.unit})</label>
                        <input 
                            type="number" 
                            autoFocus
                            value={adjustQty}
                            onChange={(e) => setAdjustQty(e.target.value)}
                            className={`w-full p-3 rounded-xl border text-lg font-bold outline-none focus:ring-2 focus:ring-orange-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Alasan Perubahan</label>
                        <select 
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className={`w-full p-3 rounded-xl border outline-none ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        >
                            <option value="Stock Opname">Stock Opname Rutin</option>
                            <option value="Waste">Waste (Terbuang)</option>
                            <option value="Spoilage">Spoilage (Basi/Rusak)</option>
                            <option value="Portioning">Selisih Portioning</option>
                            <option value="Hilang">Barang Hilang</option>
                            <option value="Salah Input">Salah Input</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button 
                        onClick={() => setEditItem(null)}
                        className={`flex-1 py-3 rounded-xl font-medium ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        Batal
                    </button>
                    <button 
                        onClick={handleSaveAdjustment}
                        className="flex-1 py-3 rounded-xl font-bold bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30"
                    >
                        Simpan
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
