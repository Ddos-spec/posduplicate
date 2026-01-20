import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { ShoppingCart, Search, X, Plus, Minus, Trash2, CreditCard, Settings, Receipt, UtensilsCrossed, Tag, Menu, UserCircle2 } from 'lucide-react';
import RunningLogo from '../../../components/RunningLogo';
// Mock Components (Since we can't import real connected components easily if they depend on API)
// Ideally we should refactor real components to be presentational, but for now we inline simple versions or use dummy behaviors.

// --- DUMMY DATA FOR DEMO ---
const DUMMY_PRODUCTS = [
  { id: 1, name: 'Nasi Goreng Spesial', price: 35000, categoryId: 1, image: 'https://images.unsplash.com/photo-1603133872878-684f208fb74b?auto=format&fit=crop&w=500&q=60', description: 'Nasi goreng dengan telur dan ayam' },
  { id: 2, name: 'Ayam Bakar Madu', price: 42000, categoryId: 1, image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=500&q=60', description: 'Ayam bakar bumbu madu' },
  { id: 3, name: 'Es Teh Manis', price: 8000, categoryId: 2, image: '', description: 'Teh manis dingin segar' },
  { id: 4, name: 'Kopi Susu Gula Aren', price: 18000, categoryId: 2, image: '', description: 'Kopi susu kekinian' },
  { id: 5, name: 'Kentang Goreng', price: 15000, categoryId: 3, image: '', description: 'French fries original' },
  { id: 6, name: 'Pisang Bakar Keju', price: 20000, categoryId: 4, image: '', description: 'Pisang bakar topping keju' },
];

const DUMMY_CATEGORIES = [
  { id: 1, name: 'Makanan Utama' },
  { id: 2, name: 'Minuman' },
  { id: 3, name: 'Snack' },
  { id: 4, name: 'Dessert' }
];

interface CartItem {
  itemId: string; // unique id for cart item (product id + modifiers)
  id: number; // product id
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export default function DemoCashier() {
  const [products] = useState<any[]>(DUMMY_PRODUCTS);
  const [categories] = useState<any[]>(DUMMY_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Local Cart State for Demo
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // UI States
  const [managementMode, setManagementMode] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory ? p.categoryId === selectedCategory : true;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Cart Functions
  const addToCart = (product: any) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { itemId: `${product.id}-${Date.now()}`, id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
    toast.success(`${product.name} added to cart`);
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty < 1) {
      setCartItems(prev => prev.filter(item => item.itemId !== itemId));
    } else {
      setCartItems(prev => prev.map(item => item.itemId === itemId ? { ...item, quantity: qty } : item));
    }
  };

  const removeItem = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.itemId !== itemId));
  };

  const getTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const formatCurrency = (value: number) => `Rp ${Math.floor(value).toLocaleString('id-ID').replace(/,/g, '.')}`;

  const handleCheckout = () => {
    if (cartItems.length === 0) return toast.error('Cart is empty');
    setShowPayment(true);
  };

  const handlePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowPayment(false);
      setCartItems([]);
      setCashReceived('');
      toast.success('Payment successful (Demo)!');
    }, 1500);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Toaster position="top-right" />

      {/* Products Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white p-4 shadow-sm">
          <div className="flex gap-2 md:gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Platform Switcher */}
            <div className="flex gap-2 items-center overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setSelectedPlatform(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition border whitespace-nowrap ${
                    selectedPlatform === null 
                      ? 'bg-gray-800 text-white border-gray-800' 
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  🏠 Dine In
                </button>
                <button
                  onClick={() => setSelectedPlatform('gofood')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition border whitespace-nowrap ${
                    selectedPlatform === 'gofood' 
                      ? 'bg-green-600 text-white border-green-600' 
                      : 'bg-white text-green-600 border-green-200 hover:bg-green-50'
                  }`}
                >
                  GoFood
                </button>
            </div>

            {/* Desktop Buttons (Dummy) */}
            <div className="hidden md:flex gap-2">
              <button className="px-4 py-2 rounded-lg bg-indigo-500 text-white flex items-center gap-2 hover:bg-indigo-600">
                <UtensilsCrossed className="w-5 h-5" /> Tables
              </button>
              <button className="px-4 py-2 rounded-lg bg-pink-500 text-white flex items-center gap-2 hover:bg-pink-600">
                <Tag className="w-5 h-5" /> Modifiers
              </button>
              <button className="px-4 py-2 rounded-lg bg-purple-500 text-white flex items-center gap-2 hover:bg-purple-600">
                <Receipt className="w-5 h-5" /> Transactions
              </button>
              <button
                onClick={() => setManagementMode(!managementMode)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  managementMode ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                <Settings className="w-5 h-5" /> {managementMode ? 'Exit' : 'Manage'}
              </button>
              <button className="px-4 py-2 rounded-lg bg-blue-500 text-white flex items-center gap-2 hover:bg-blue-600">
                <UserCircle2 className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden px-4 py-2 rounded-lg bg-blue-500 text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Cart Button */}
            <button
              onClick={() => setShowMobileCart(true)}
              className="md:hidden px-4 py-2 rounded-lg bg-blue-500 text-white flex items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="font-semibold">{cartItems.length}</span>
            </button>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                !selectedCategory ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  selectedCategory === cat.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white rounded-lg p-4 shadow hover:shadow-lg transition relative min-h-[180px] touch-manipulation cursor-pointer active:scale-95"
              >
                <div className="aspect-square bg-gray-200 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span className="text-4xl text-gray-400">📦</span>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-1 truncate">{product.name}</h3>
                <p className="font-bold text-blue-600">{formatCurrency(product.price)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section - Desktop */}
      <div className="hidden md:flex w-96 bg-white border-l flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            Cart ({cartItems.length})
          </h2>
        </div>
        <RunningLogo />

        <div className="flex-1 overflow-y-auto p-4">
          {cartItems.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <ShoppingCart className="w-16 h-16 mx-auto mb-2 opacity-50" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.itemId} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{item.name}</span>
                    <button onClick={() => removeItem(item.itemId)} className="text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                        className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(getTotal())}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span className="text-blue-600">{formatCurrency(getTotal())}</span>
            </div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cartItems.length === 0}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Checkout
          </button>
        </div>
      </div>

      {/* Mobile Cart Drawer */}
      {showMobileCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                Cart ({cartItems.length})
              </h2>
              <button onClick={() => setShowMobileCart(false)} className="text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <RunningLogo />

            <div className="flex-1 overflow-y-auto p-4">
              {cartItems.length === 0 ? (
                <div className="text-center text-gray-400 mt-8">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <p>Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.itemId} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">{item.name}</span>
                        <button onClick={() => removeItem(item.itemId)} className="text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                            className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t p-4">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-blue-600">{formatCurrency(getTotal())}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMobileCart(false);
                  handleCheckout();
                }}
                disabled={cartItems.length === 0}
                className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal (Simplified for Demo) */}
      {showPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] max-w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Payment</h3>
              <button onClick={() => setShowPayment(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 pb-4 border-b">
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(getTotal())}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {['cash', 'card', 'qris'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-3 px-2 rounded-lg text-sm font-medium capitalize ${
                      paymentMethod === method
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'cash' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Cash Received</label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="0"
                />
                {Number(cashReceived) > getTotal() && (
                  <p className="text-sm text-green-600 mt-2">
                    Change: {formatCurrency(Number(cashReceived) - getTotal())}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600"
            >
              {isProcessing ? 'Processing...' : 'Complete Transaction'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
