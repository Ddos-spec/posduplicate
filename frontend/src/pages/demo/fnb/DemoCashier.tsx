import { useState } from 'react';
import { DEMO_PRODUCTS } from '../dummyData';
import DemoLayout from '../DemoLayout';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import toast from 'react-hot-toast';

export default function DemoCashier() {
  const { isDark } = useThemeStore();
  const [cart, setCart] = useState<any[]>([]);

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  return (
    <DemoLayout variant="cashier" title="POS Terminal">
      <div className="flex h-[calc(100vh-140px)] gap-6">
        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Cari produk..." 
              className={`w-full pl-12 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200'}`}
            />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {DEMO_PRODUCTS.map(product => (
              <button 
                key={product.id}
                onClick={() => addToCart(product)}
                className={`p-4 rounded-xl text-left transition-all hover:-translate-y-1 hover:shadow-lg ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white shadow-sm border border-gray-100 hover:border-blue-200'}`}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full mb-3 flex items-center justify-center text-blue-600 text-lg font-bold">
                  {product.name.charAt(0)}
                </div>
                <h3 className={`font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{product.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                <p className="text-emerald-500 font-bold">Rp {product.price.toLocaleString('id-ID')}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cart Sidebar */}
        <div className={`w-96 rounded-2xl flex flex-col ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg border border-gray-100'}`}>
          <div className="p-6 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Pesanan Saat Ini
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                Keranjang kosong
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-xs text-gray-500">Rp {item.price.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="w-6 h-6 rounded bg-gray-100 dark:bg-slate-700 flex items-center justify-center">-</button>
                    <span className="font-bold w-4 text-center">{item.qty}</span>
                    <button className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center">+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
            <div className="flex justify-between mb-4 text-lg font-bold">
              <span>Total</span>
              <span>Rp {total.toLocaleString('id-ID')}</span>
            </div>
            <button 
              onClick={() => {
                if(total > 0) {
                   toast.success('Pembayaran Berhasil! Struk dicetak.');
                   setCart([]);
                }
              }}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <CreditCard className="w-5 h-5" />
              Bayar Sekarang
            </button>
          </div>
        </div>
      </div>
    </DemoLayout>
  );
}
