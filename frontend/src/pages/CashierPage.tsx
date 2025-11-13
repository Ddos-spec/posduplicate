import { useState, useEffect } from 'react';
import { useCartStore } from '../store/cartStore';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import { ShoppingCart, Search, X, Plus, Minus, Trash2, CreditCard } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
  category?: { name: string };
  image?: string;
}

interface Category {
  id: number;
  name: string;
}

export default function CashierPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { items, addItem, updateQuantity, removeItem, clearCart, getTotal, getSubtotal } = useCartStore();

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [selectedCategory]);

  const loadProducts = async () => {
    try {
      const params: any = {};
      if (selectedCategory) params.category_id = selectedCategory;
      if (search) params.search = search;
      const { data } = await api.get('/products', { params });
      setProducts(data.data);
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data.data);
    } catch (error) {
      console.error('Failed to load categories');
    }
  };

  const handleAddToCart = (product: Product) => {
    addItem({
      itemId: product.id,
      name: product.name,
      price: parseFloat(product.price.toString()),
    });
    toast.success(`${product.name} added to cart`);
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setShowPayment(true);
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const orderData = {
        orderType: 'dine_in',
        items: items.map(item => ({
          itemId: item.itemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          variantId: item.variantId,
          modifiers: item.modifiers?.map(m => m.id) || [],
          notes: item.notes,
        })),
        subtotal: getSubtotal(),
        discountAmount: 0,
        taxAmount: 0,
        serviceCharge: 0,
        total: getTotal(),
        payments: [{
          method: paymentMethod,
          amount: getTotal(),
          changeAmount: paymentMethod === 'cash' ? parseFloat(cashReceived || '0') - getTotal() : 0,
        }],
      };

      await api.post('/transactions', orderData);
      toast.success('Payment successful!');
      clearCart();
      setShowPayment(false);
      setCashReceived('');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const changeAmount = cashReceived ? parseFloat(cashReceived) - getTotal() : 0;

  return (
    <div className="flex h-screen bg-gray-100">
      <Toaster position="top-right" />

      {/* Products Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white p-4 shadow-sm">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && loadProducts()}
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
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
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => handleAddToCart(product)}
                className="bg-white rounded-lg p-4 shadow hover:shadow-lg cursor-pointer transition"
              >
                <div className="aspect-square bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <span className="text-4xl text-gray-400">📦</span>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-1 truncate">{product.name}</h3>
                <p className="text-blue-600 font-bold">Rp {product.price.toLocaleString()}</p>
                {product.category && (
                  <span className="text-xs text-gray-500">{product.category.name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-white border-l flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            Cart ({items.length})
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <ShoppingCart className="w-16 h-16 mx-auto mb-2 opacity-50" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{item.name}</span>
                    <button onClick={() => removeItem(item.id)} className="text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="font-semibold text-blue-600">
                      Rp {(item.price * item.quantity).toLocaleString()}
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
              <span>Rp {getSubtotal().toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span className="text-blue-600">Rp {getTotal().toLocaleString()}</span>
            </div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={items.length === 0}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Checkout
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Payment</h3>
              <button onClick={() => setShowPayment(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-3xl font-bold text-blue-600">Rp {getTotal().toLocaleString()}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {['cash', 'card', 'qris'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 rounded-lg capitalize ${
                      paymentMethod === method
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                {changeAmount >= 0 && cashReceived && (
                  <p className="text-sm text-gray-600 mt-2">
                    Change: <span className="font-semibold">Rp {changeAmount.toLocaleString()}</span>
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={isProcessing || (paymentMethod === 'cash' && changeAmount < 0)}
              className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
