import { useState, useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { MOCK_INVENTORY_ITEMS } from './mockInventoryData';
import { purchaseOrderService } from '../../services/inventoryService';
import type { POSuggestion } from '../../services/inventoryService';
import { Send, Printer, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

interface CartItem {
  id: string | number;
  name: string;
  sku: string;
  supplier: string;
  currentStock: number;
  minStock: number;
  unit: string;
  costPerUnit: number;
  suggestedQty: number;
}

export default function ReorderPage() {
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const location = useLocation();

  const isDemo = location.pathname.startsWith('/demo');

  const [loading, setLoading] = useState(!isDemo);
  const [submitting, setSubmitting] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    if (isDemo) {
      // Demo mode: use mock data
      const lowStockItems = MOCK_INVENTORY_ITEMS.filter(i => i.status !== 'Aman').map(item => ({
        ...item,
        suggestedQty: item.minStock * 2
      }));
      setCart(lowStockItems);
      return;
    }

    // Real mode: fetch suggestions from API
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const response = await purchaseOrderService.getSuggestions(user?.outlet_id);
        if (response.success) {
          const cartItems: CartItem[] = response.data.map((item: POSuggestion) => ({
            id: item.inventoryId,
            name: item.name,
            sku: item.sku || '-',
            supplier: item.supplier?.name || '-',
            currentStock: item.currentStock,
            minStock: item.minStock,
            unit: item.unit,
            costPerUnit: item.costPerUnit,
            suggestedQty: item.suggestedQty
          }));
          setCart(cartItems);
        }
      } catch (error) {
        console.error('Failed to fetch PO suggestions:', error);
        toast.error('Gagal memuat rekomendasi');
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [isDemo, user?.outlet_id]);

  const updateQty = (id: string | number, newQty: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, suggestedQty: newQty } : item));
  };

  const handleCreatePO = async () => {
    if (isDemo) {
      toast.success('Purchase Order berhasil dibuat & dikirim ke Supplier!');
      setCart([]);
      return;
    }

    // Real mode: create PO via API
    try {
      setSubmitting(true);
      const items = cart.map(item => ({
        inventoryId: typeof item.id === 'string' ? parseInt(item.id) : item.id,
        quantity: item.suggestedQty,
        unit: item.unit,
        unitPrice: item.costPerUnit
      }));

      const response = await purchaseOrderService.create({
        outletId: user?.outlet_id!,
        items
      });

      if (response.success) {
        toast.success(`PO ${response.data.po_number} berhasil dibuat!`);
        setCart([]);
      }
    } catch (error) {
      console.error('Failed to create PO:', error);
      toast.error('Gagal membuat PO');
    } finally {
      setSubmitting(false);
    }
  };

  const totalEstimate = cart.reduce((sum, item) => sum + (item.suggestedQty * item.costPerUnit), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Restock / Purchase Order</h1>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Buat PO berdasarkan rekomendasi sistem.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* List Items */}
        <div className={`lg:col-span-2 rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className={`p-4 border-b font-bold ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                Rekomendasi Belanja
            </div>
            {cart.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                    Tidak ada item yang perlu di-restock saat ini. Gudang aman! 👍
                </div>
            ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {cart.map(item => (
                        <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                                <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.name}</h4>
                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Supplier: {item.supplier}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Sisa: {item.currentStock} {item.unit}</span>
                                    <span className="text-xs text-gray-400">Min: {item.minStock}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Estimasi Harga</p>
                                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        Rp {(item.suggestedQty * item.costPerUnit).toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <div className="flex items-center border rounded-lg overflow-hidden">
                                    <input 
                                        type="number" 
                                        value={item.suggestedQty}
                                        onChange={(e) => updateQty(item.id, parseFloat(e.target.value))}
                                        className={`w-20 p-2 text-center outline-none font-bold ${isDark ? 'bg-slate-700 text-white' : 'bg-gray-50 text-gray-900'}`}
                                    />
                                    <span className={`px-3 text-sm ${isDark ? 'bg-slate-600 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>{item.unit}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
            <div className={`p-6 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Ringkasan Order</h3>
                
                <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Total Item</span>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{cart.length} Barang</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Estimasi Total</span>
                        <span className={`font-bold text-lg ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                            Rp {totalEstimate.toLocaleString('id-ID')}
                        </span>
                    </div>
                </div>

                <button
                    onClick={handleCreatePO}
                    disabled={cart.length === 0 || submitting}
                    className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {submitting ? 'Membuat PO...' : 'Kirim PO ke Supplier'}
                </button>
                
                <button className={`w-full mt-3 py-3 rounded-xl border font-medium flex items-center justify-center gap-2 ${isDark ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <Printer size={18} />
                    Cetak Draft
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
