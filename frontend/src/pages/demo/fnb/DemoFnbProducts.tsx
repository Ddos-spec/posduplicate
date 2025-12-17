import { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  ChefHat
} from 'lucide-react';
import toast from 'react-hot-toast';
import DemoLayout from '../DemoLayout';

// --- DUMMY DATA ---
const DUMMY_CATEGORIES = [
  { id: 1, name: 'Makanan Utama' },
  { id: 2, name: 'Minuman' },
  { id: 3, name: 'Snack' },
  { id: 4, name: 'Dessert' }
];

const DUMMY_PRODUCTS = [
  { id: 1, name: 'Nasi Goreng Spesial', price: 35000, categoryId: 1, categories: { id: 1, name: 'Makanan Utama' }, image: 'https://images.unsplash.com/photo-1603133872878-684f208fb74b?auto=format&fit=crop&w=500&q=60' },
  { id: 2, name: 'Ayam Bakar Madu', price: 42000, categoryId: 1, categories: { id: 1, name: 'Makanan Utama' }, image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=500&q=60' },
  { id: 3, name: 'Es Teh Manis', price: 8000, categoryId: 2, categories: { id: 2, name: 'Minuman' }, image: '' },
  { id: 4, name: 'Kopi Susu Gula Aren', price: 18000, categoryId: 2, categories: { id: 2, name: 'Minuman' }, image: '' },
  { id: 5, name: 'Kentang Goreng', price: 15000, categoryId: 3, categories: { id: 3, name: 'Snack' }, image: '' },
  { id: 6, name: 'Pisang Bakar Keju', price: 20000, categoryId: 4, categories: { id: 4, name: 'Dessert' }, image: '' },
];

interface Product {
  id: number;
  name: string;
  price: number;
  priceGofood?: number | null;
  priceGrabfood?: number | null;
  priceShopeefood?: number | null;
  image?: string;
  description?: string;
  categoryId: number;
  categories?: { id: number; name: string };
}

export default function DemoFnbProducts() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'products' | 'ingredients'>('products');
  const [products, setProducts] = useState<Product[]>(DUMMY_PRODUCTS);
  const [categories] = useState(DUMMY_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Simulate loading
  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  const formatCurrency = (value: number): string => {
    const formatted = Math.floor(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Rp ${formatted}`;
  };

  const formatPriceInput = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    return parseInt(numbers).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parsePriceInput = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  const [productForm, setProductForm] = useState({
    name: '',
    categoryId: '',
    price: '',
    priceOnline: '',
    image: '',
    description: ''
  });

  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    const productName = (product.name || '').toLowerCase();
    const categoryName = (
      product.categories?.name || 
      categories.find(c => c.id === product.categoryId)?.name || 
      ''
    ).toLowerCase();

    return productName.includes(searchLower) || categoryName.includes(searchLower);
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFormChange = (field: string, value: string) => {
    setProductForm(prev => ({ ...prev, [field]: value }));
    if (field === 'image') setImagePreview(value);
  };

  const handleOpenProductForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        categoryId: product.categoryId.toString(),
        price: product.price.toString(),
        priceOnline: product.priceGofood?.toString() || '',
        image: product.image || '',
        description: product.description || ''
      });
      setImagePreview(product.image || '');
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', categoryId: '', price: '', priceOnline: '', image: '', description: '' });
      setImagePreview('');
    }
    setShowProductForm(true);
  };

  const handleSaveProduct = () => {
    if (!productForm.name || !productForm.categoryId || !productForm.price) {
      toast.error('Mohon lengkapi semua field wajib');
      return;
    }

    // SIMULATE SAVE
    setLoading(true);
    setTimeout(() => {
        if (editingProduct) {
            setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
                ...p,
                name: productForm.name,
                price: parseFloat(productForm.price),
                categoryId: parseInt(productForm.categoryId),
                image: productForm.image,
                categories: categories.find(c => c.id === parseInt(productForm.categoryId))
            } : p));
            toast.success('Simulasi: Produk berhasil diperbarui');
        } else {
            const newProduct = {
                id: Date.now(),
                name: productForm.name,
                price: parseFloat(productForm.price),
                categoryId: parseInt(productForm.categoryId),
                categories: categories.find(c => c.id === parseInt(productForm.categoryId)),
                image: productForm.image
            };
            setProducts(prev => [...prev, newProduct]);
            toast.success('Simulasi: Produk berhasil dibuat');
        }
        setLoading(false);
        setShowProductForm(false);
    }, 600);
  };

  const handleDeleteProduct = (productId: number) => {
    if(confirm('Simulasi: Apakah Anda yakin ingin menghapus produk ini?')) {
        setProducts(prev => prev.filter(p => p.id !== productId));
        toast.success('Simulasi: Produk dihapus');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProductForm(prev => ({ ...prev, image: result }));
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const closeForm = () => {
    setShowProductForm(false);
    setImagePreview('');
  };

  return (
    <DemoLayout variant="owner" title="Manajemen Produk (Demo)">
        <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Package className="w-6 h-6" />
                Manajemen Stok
            </h1>
            <p className="text-gray-600 mt-1">Kelola produk dan stok bahan baku</p>
            </div>

            <div className="mt-4 sm:mt-0 flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
                onClick={() => setActiveTab('inventory')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'inventory' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                Inventory
            </button>
            <button
                onClick={() => setActiveTab('products')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'products' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                Produk
            </button>
            </div>
        </div>

        {activeTab === 'products' ? (
            <>
            <div className="flex justify-between items-center mb-6">
                <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Cari produk atau kategori..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                <button
                onClick={() => handleOpenProductForm()}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                <Plus className="w-4 h-4" />
                Tambah Produk
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                    {paginatedProducts.map((product) => (
                    <div key={product.id} className="bg-white border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="h-32 bg-gray-50 flex items-center justify-center">
                        {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ImageIcon className="w-8 h-8" />
                            </div>
                        )}
                        </div>
                        <div className="p-4">
                        <h3 className="font-semibold text-gray-800 truncate">{product.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {product.categories?.name || 'Uncategorized'}
                        </p>
                        <p className="text-blue-600 font-bold mt-2">
                            {formatCurrency(product.price)}
                        </p>
                        <div className="grid grid-cols-3 gap-2 mt-4">
                            <button className="flex items-center justify-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm">
                                <ChefHat className="w-4 h-4" />
                            </button>
                            <button
                            onClick={() => handleOpenProductForm(product)}
                            className="flex items-center justify-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                            >
                            <Edit2 className="w-4 h-4" />
                            Edit
                            </button>
                            <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="flex items-center justify-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                            >
                            <Trash2 className="w-4 h-4" />
                            Delete
                            </button>
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
            )}
            </>
        ) : (
            <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">Tab Inventory juga tersedia dalam full version.</p>
                <button onClick={() => setActiveTab('products')} className="text-blue-500 hover:underline mt-2">Kembali ke Produk</button>
            </div>
        )}

        {showProductForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                <h3 className="text-xl font-bold mb-4">
                    {editingProduct ? 'Edit Produk (Simulasi)' : 'Tambah Produk Baru (Simulasi)'}
                </h3>
                
                <div className="space-y-4">
                    <div>
                    <label className="block text-sm font-medium mb-1">Nama Produk *</label>
                    <input
                        type="text"
                        value={productForm.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    </div>
                    
                    <div>
                    <label className="block text-sm font-medium mb-1">Kategori *</label>
                    <select
                        value={productForm.categoryId}
                        onChange={(e) => handleFormChange('categoryId', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Pilih kategori</option>
                        {categories.map(category => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                        ))}
                    </select>
                    </div>
                    
                    <div>
                    <label className="block text-sm font-medium mb-1">Harga (Rp) *</label>
                    <input
                        type="text"
                        value={productForm.price ? formatPriceInput(productForm.price) : ''}
                        onChange={(e) => handleFormChange('price', parsePriceInput(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                    <button onClick={closeForm} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700">Batal</button>
                    <button onClick={handleSaveProduct} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
                    </div>
                </div>
                </div>
            </div>
            </div>
        )}
        </div>
    </DemoLayout>
  );
}
