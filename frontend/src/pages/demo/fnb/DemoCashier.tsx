import { useState } from 'react';
import { 
  Search, ShoppingCart, CreditCard, 
  X, UserCircle2, Settings, Loader2
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import DemoLayout from '../DemoLayout';

// --- DUMMY DATA ---
const DUMMY_CATEGORIES = [
  { id: 1, name: 'Makanan Utama' },
  { id: 2, name: 'Minuman' },
  { id: 3, name: 'Snack' },
  { id: 4, name: 'Dessert' }
];

const DUMMY_PRODUCTS = [
  { id: 1, name: 'Nasi Goreng Spesial', price: 35000, categoryId: 1, image: 'https://images.unsplash.com/photo-1603133872878-684f208fb74b?auto=format&fit=crop&w=500&q=60' },
  { id: 2, name: 'Ayam Bakar Madu', price: 42000, categoryId: 1, image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=500&q=60' },
  { id: 3, name: 'Es Teh Manis', price: 8000, categoryId: 2, image: '' },
  { id: 4, name: 'Kopi Susu Gula Aren', price: 18000, categoryId: 2, image: '' },
  { id: 5, name: 'Kentang Goreng', price: 15000, categoryId: 3, image: '' },
  { id: 6, name: 'Pisang Bakar Keju', price: 20000, categoryId: 4, image: '' },
];

export default function DemoCashier() {
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderType, setOrderType] = useState('dine_in');

  const filteredProducts = DUMMY_PRODUCTS.filter(p => {
    const matchCat = selectedCategory ? p.categoryId === selectedCategory : true;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const getDisplayPrice = (price: number) => {
    if (selectedPlatform === 'gofood') return price * 1.2;
    if (selectedPlatform === 'grabfood') return price * 1.25;
    if (selectedPlatform === 'shopeefood') return price * 1.15;
    return price;
  };

  const addToCart = (product: any) => {
    const price = getDisplayPrice(product.price);
    const existing = cart.find(item => item.id === product.id && item.price === price);
    if (existing) {
      setCart(cart.map(item => item.id === product.id && item.price === price ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1, price }]);
    }
    toast.success(`${product.name} added`);
  };

  const updateQuantity = (id: number, qty: number) => {
    if (qty < 1) return;
    setCart(cart.map(item => item.id === id ? { ...item, qty } : item));
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowPayment(true);
  };

  const handlePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
        setIsProcessing(false);
        setShowPayment(false);
        setCart([]);
        setCashReceived('');
        toast.success('Pembayaran Berhasil! (Simulasi)');
    }, 1500);
  };

  const formatCurrency = (val: number) => `Rp ${Math.floor(val).toLocaleString('id-ID')}`;

  return (
    <DemoLayout variant="cashier" title="POS Terminal (Demo)">
      <div className="flex h-[calc(100vh-140px)] gap-0 md:gap-6 bg-gray-100 dark:bg-slate-900">
        <Toaster position="top-right" />
        
        {/* LEFT: Products */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-slate-800/50 rounded-xl">
            {/* Header Controls */}
            <div className="p-4 bg-white dark:bg-slate-800 shadow-sm z-10">
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Cari menu..." 
                            className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {/* Platform Switcher */}
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setSelectedPlatform(null)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${!selectedPlatform ? 'bg-gray-800 text-white' : 'bg-white text-gray-600'}`}
                        >
                            Dine In
                        </button>
                        <button 
                            onClick={() => setSelectedPlatform('gofood')}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${selectedPlatform === 'gofood' ? 'bg-green-600 text-white' : 'bg-white text-green-600'}`}
                        >
                            GoFood
                        </button>
                    </div>
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <button 
                        onClick={() => setSelectedCategory(null)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${!selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300'}`}
                    >
                        Semua
                    </button>
                    {DUMMY_CATEGORIES.map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map(product => {
                        const displayPrice = getDisplayPrice(product.price);
                        return (
                            <div 
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden border border-gray-100 dark:border-slate-700 active:scale-95 touch-manipulation"
                            >
                                <div className="h-32 bg-gray-200 dark:bg-slate-700 relative">
                                    {product.image ? (
                                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl">🥘</div>
                                    )}
                                    {selectedPlatform && (
                                        <span className="absolute top-2 right-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded-full shadow">
                                            +Markup
                                        </span>
                                    )}
                                </div>
                                <div className="p-3">
                                    <h3 className="font-bold text-gray-800 dark:text-white truncate">{product.name}</h3>
                                    <p className={`text-sm font-bold mt-1 ${selectedPlatform ? 'text-orange-500' : 'text-blue-600'}`}>
                                        {formatCurrency(displayPrice)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* RIGHT: Cart Sidebar */}
        <div className="w-96 bg-white dark:bg-slate-800 border-l dark:border-slate-700 flex flex-col shadow-xl z-20">
            <div className="p-4 border-b dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                        <ShoppingCart className="w-5 h-5" /> Pesanan
                    </h2>
                    <div className="flex gap-1">
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"><UserCircle2 className="w-5 h-5 text-gray-500" /></button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"><Settings className="w-5 h-5 text-gray-500" /></button>
                    </div>
                </div>
                
                {/* Order Type */}
                <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
                    {['dine_in', 'takeaway', 'delivery'].map(type => (
                        <button 
                            key={type}
                            onClick={() => setOrderType(type)}
                            className={`py-1.5 text-xs font-bold rounded-md capitalize ${orderType === type ? 'bg-white dark:bg-slate-600 shadow text-blue-600' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            {type.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                        <p>Keranjang kosong</p>
                    </div>
                ) : (
                    cart.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                            <div className="flex-1">
                                <p className="font-medium text-gray-800 dark:text-white">{item.name}</p>
                                <p className="text-xs text-blue-600 font-bold">{formatCurrency(item.price)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => updateQuantity(item.id, item.qty - 1)} className="w-6 h-6 bg-gray-100 dark:bg-slate-700 rounded flex items-center justify-center text-gray-600 dark:text-white">-</button>
                                <span className="text-sm font-bold w-4 text-center dark:text-white">{item.qty}</span>
                                <button onClick={() => updateQuantity(item.id, item.qty + 1)} className="w-6 h-6 bg-blue-100 text-blue-600 rounded flex items-center justify-center">+</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Total & Action */}
            <div className="p-4 bg-gray-50 dark:bg-slate-800 border-t dark:border-slate-700">
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>Subtotal</span>
                        <span>{formatCurrency(getTotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>Tax (10%)</span>
                        <span>{formatCurrency(getTotal() * 0.1)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white border-t border-dashed border-gray-300 pt-2">
                        <span>Total</span>
                        <span>{formatCurrency(getTotal() * 1.1)}</span>
                    </div>
                </div>
                <button 
                    onClick={handleCheckout}
                    disabled={cart.length === 0}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 disabled:bg-gray-300 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <CreditCard className="w-5 h-5" />
                    Bayar Sekarang
                </button>
            </div>
        </div>

        {/* Payment Modal */}
        {showPayment && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold dark:text-white">Pembayaran</h2>
                        <button onClick={() => setShowPayment(false)}><X className="w-6 h-6 text-gray-400" /></button>
                    </div>
                    
                    <div className="p-6">
                        <div className="text-center mb-8">
                            <p className="text-gray-500 text-sm">Total Tagihan</p>
                            <h1 className="text-4xl font-bold text-blue-600 mt-1">{formatCurrency(getTotal() * 1.1)}</h1>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {['cash', 'qris', 'card'].map(method => (
                                <button 
                                    key={method}
                                    onClick={() => setPaymentMethod(method)}
                                    className={`py-3 rounded-xl border-2 font-bold capitalize transition ${
                                        paymentMethod === method 
                                        ? 'border-blue-500 bg-blue-50 text-blue-600' 
                                        : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                    }`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>

                        {paymentMethod === 'cash' && (
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Uang Diterima</label>
                                <input 
                                    type="number" 
                                    className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    placeholder="0"
                                    value={cashReceived}
                                    onChange={e => setCashReceived(e.target.value)}
                                    autoFocus
                                />
                                {Number(cashReceived) > 0 && (
                                    <div className="flex justify-between mt-2 text-sm">
                                        <span className="text-gray-500">Kembalian:</span>
                                        <span className="font-bold text-green-600">{formatCurrency(Number(cashReceived) - (getTotal() * 1.1))}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <button 
                            onClick={handlePayment}
                            disabled={isProcessing}
                            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Konfirmasi Bayar'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </DemoLayout>
  );
}