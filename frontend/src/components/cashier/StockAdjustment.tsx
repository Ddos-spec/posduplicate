import React, { useState, useEffect } from 'react';
import { X, Package, Plus, Minus, AlertCircle } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  stock: number;
  trackStock: boolean;
  minStock: number;
}

interface StockAdjustmentProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const StockAdjustment: React.FC<StockAdjustmentProps> = ({ isOpen, onClose, onSuccess }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'in' | 'out'>('in');
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/products', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter only products that track stock
        setProducts(data.data.filter((p: Product) => p.trackStock));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProduct) {
      alert('Pilih produk terlebih dahulu');
      return;
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      alert('Masukkan jumlah yang valid');
      return;
    }

    if (!reason.trim()) {
      alert('Alasan penyesuaian stok wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/inventory/adjust-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          itemId: selectedProduct.id,
          quantity: parseFloat(quantity),
          type: adjustmentType,
          reason: reason.trim(),
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Stok berhasil disesuaikan!');
        // Reset form
        setSelectedProduct(null);
        setQuantity('');
        setReason('');
        setNotes('');
        fetchProducts(); // Refresh product list
        if (onSuccess) onSuccess();
      } else {
        alert(data.error?.message || 'Gagal menyesuaikan stok');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Terjadi kesalahan saat menyesuaikan stok');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getNewStock = () => {
    if (!selectedProduct || !quantity) return selectedProduct?.stock || 0;
    const qty = parseFloat(quantity);
    return adjustmentType === 'in'
      ? (selectedProduct.stock || 0) + qty
      : (selectedProduct.stock || 0) - qty;
  };

  const isStockValid = () => {
    const newStock = getNewStock();
    return newStock >= 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Package className="mr-2" size={24} />
            Penyesuaian Stok
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cari Produk *
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ketik nama produk..."
            />
          </div>

          {/* Product List */}
          {searchTerm && (
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="p-4 text-gray-500 text-center">Produk tidak ditemukan</p>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product);
                      setSearchTerm('');
                    }}
                    className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedProduct?.id === product.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">
                          Stok saat ini: {product.stock}
                          {product.stock <= product.minStock && (
                            <span className="ml-2 text-red-500">(Stok rendah)</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Selected Product */}
          {selectedProduct && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-600">
                    Stok saat ini: <span className="font-medium">{selectedProduct.stock}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}

          {selectedProduct && (
            <>
              {/* Adjustment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Penyesuaian *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setAdjustmentType('in')}
                    className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-colors ${
                      adjustmentType === 'in'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <Plus className="mr-2" size={20} />
                    Tambah Stok
                  </button>
                  <button
                    onClick={() => setAdjustmentType('out')}
                    className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-colors ${
                      adjustmentType === 'out'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <Minus className="mr-2" size={20} />
                    Kurangi Stok
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah *
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                />
                {quantity && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Stok setelah penyesuaian:{' '}
                      <span
                        className={`font-semibold ${
                          !isStockValid() ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {getNewStock()}
                      </span>
                    </p>
                    {!isStockValid() && (
                      <p className="text-sm text-red-600 mt-1 flex items-center">
                        <AlertCircle size={16} className="mr-1" />
                        Stok tidak boleh negatif
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alasan * <span className="text-red-500">(Wajib diisi)</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Stok masuk dari supplier, Produk rusak, dll"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Alasan akan dicatat dalam log aktivitas untuk audit
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan Tambahan (opsional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Tambahkan catatan detail jika diperlukan"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !isStockValid() || !reason.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 font-semibold"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Penyesuaian'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockAdjustment;
