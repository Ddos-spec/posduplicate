import { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import axios from 'axios';

interface Modifier {
  id: number;
  name: string;
  price: number;
  category?: string;
  isActive: boolean;
}

interface Product {
  id: number;
  name: string;
  price: number;
  priceGofood?: number | null;
  priceGrabfood?: number | null;
  priceShopeefood?: number | null;
  image?: string;
  description?: string;
}

interface ProductCustomizeModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, modifiers: { id: number; name: string; price: number }[], notes: string) => void;
}

export default function ProductCustomizeModal({ product, onClose, onAddToCart }: ProductCustomizeModalProps) {
  const [allModifiers, setAllModifiers] = useState<Modifier[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<{ id: number; name: string; price: number }[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModifiers();
  }, []);

  const loadModifiers = async () => {
    try {
      const { data } = await api.get('/modifiers');
      // Filter only active modifiers
      setAllModifiers(data.data.filter((m: Modifier) => m.isActive));
    } catch (error: unknown) {
      console.error('Error loading modifiers:', error);
      let errorMessage = 'Failed to load modifiers';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    const formatted = Math.floor(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Rp ${formatted}`;
  };

  const toggleModifier = (modifier: Modifier) => {
    const existing = selectedModifiers.find(m => m.id === modifier.id);
    if (existing) {
      // Remove modifier
      setSelectedModifiers(selectedModifiers.filter(m => m.id !== modifier.id));
    } else {
      // Add modifier
      setSelectedModifiers([...selectedModifiers, {
        id: modifier.id,
        name: modifier.name,
        price: modifier.price
      }]);
    }
  };

  const isModifierSelected = (modifierId: number) => {
    return selectedModifiers.some(m => m.id === modifierId);
  };

  const getModifiersByCategory = (category: string) => {
    return allModifiers.filter(m => (m.category || 'addon') === category);
  };

  const categories = Array.from(new Set(allModifiers.map(m => m.category || 'addon')));

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      addon: 'Add-ons',
      size: 'Ukuran',
      temperature: 'Suhu',
      spice: 'Level Pedas',
      topping: 'Topping'
    };
    return labels[category] || category;
  };

  const calculateTotal = () => {
    const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + m.price, 0);
    return product.price + modifiersTotal;
  };

  const handleAddToCart = () => {
    onAddToCart(product, selectedModifiers, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              {product.image && (
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{product.name}</h2>
                <p className="text-blue-600 font-bold text-xl mt-1">{formatCurrency(product.price)}</p>
                {product.description && (
                  <p className="text-sm text-gray-600 mt-2">{product.description}</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading modifiers...</p>
            </div>
          ) : allModifiers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No modifiers available for this product</p>
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map(category => {
                const categoryModifiers = getModifiersByCategory(category);
                if (categoryModifiers.length === 0) return null;

                return (
                  <div key={category}>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      {getCategoryLabel(category)}
                      <span className="text-xs text-gray-500 font-normal">
                        ({categoryModifiers.length} options)
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categoryModifiers.map(modifier => (
                        <button
                          key={modifier.id}
                          onClick={() => toggleModifier(modifier)}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            isModifierSelected(modifier.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{modifier.name}</p>
                              <p className="text-sm text-blue-600 font-semibold">
                                {modifier.price > 0 ? `+${formatCurrency(modifier.price)}` : 'Gratis'}
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isModifierSelected(modifier.id)
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {isModifierSelected(modifier.id) && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Notes Section */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Catatan (Optional)</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tambahkan catatan khusus (misal: tanpa gula, extra pedas, dll)"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-6 border-t bg-gray-50">
          {/* Selected Modifiers Summary */}
          {selectedModifiers.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2">Modifier dipilih:</p>
              <div className="flex flex-wrap gap-2">
                {selectedModifiers.map(modifier => (
                  <span key={modifier.id} className="px-2 py-1 bg-white rounded text-xs font-medium text-gray-700 flex items-center gap-1">
                    {modifier.name}
                    <button
                      onClick={() => toggleModifier({ id: modifier.id, name: modifier.name, price: modifier.price, isActive: true })}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Total & Add to Cart Button */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Harga:</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(calculateTotal())}</p>
              {selectedModifiers.length > 0 && (
                <p className="text-xs text-gray-500">
                  {formatCurrency(product.price)} + {formatCurrency(selectedModifiers.reduce((sum, m) => sum + m.price, 0))} modifiers
                </p>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              Tambah ke Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
