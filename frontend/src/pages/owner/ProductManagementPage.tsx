import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  ChefHat
} from 'lucide-react';
import api, { getFullUrl } from '../../services/api';
import toast from 'react-hot-toast';
import useConfirmationStore from '../../store/confirmationStore';
import RecipeModal from '../../components/owner/RecipeModal';
import IngredientManager from '../../components/owner/IngredientManager';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  description?: string;
  categoryId: number;
  categories?: Category;
}

export default function ProductManagementPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'ingredients'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [recipeModalProduct, setRecipeModalProduct] = useState<{ id: number; name: string } | null>(null);

  // Helper function to format currency with dot as thousand separator
  const formatCurrency = (value: number): string => {
    const formatted = Math.floor(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Rp ${formatted}`;
  };

  // Helper function to format number with thousand separator (dot)
  const formatPriceInput = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    return parseInt(numbers).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Helper function to parse formatted price back to number
  const parsePriceInput = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  // State for product form
  const [productForm, setProductForm] = useState({
    name: '',
    categoryId: '',
    price: '',
    image: '',
    description: ''
  });

  const { showConfirmation } = useConfirmationStore();

  // Load products
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/products');
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load categories');
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  // Filter products based on search term
  const filteredProducts = products.filter(product => {
    const categoryName = product.categories?.name || categories.find(c => c.id === product.categoryId)?.name || '';
    return product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    categoryName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Paginate products
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle form changes
  const handleFormChange = (field: string, value: string) => {
    setProductForm(prev => ({ ...prev, [field]: value }));
    
    // Update image preview when image URL changes
    if (field === 'image') {
      setImagePreview(value);
    }
  };

  // Open product form for add/edit
  const handleOpenProductForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      // Get categoryId from either categoryId field or categories.id (use nullish coalescing to handle 0 as valid id)
      const catId = product.categoryId ?? product.categories?.id ?? '';
      setProductForm({
        name: product.name,
        categoryId: catId.toString(),
        price: product.price.toString(),
        image: product.image || '',
        description: product.description || ''
      });
      setImagePreview(product.image || '');
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        categoryId: '',
        price: '',
        image: '',
        description: ''
      });
      setImagePreview('');
    }
    setShowProductForm(true);
  };

  // Save product (create or update)
  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.categoryId || !productForm.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const data = {
        name: productForm.name,
        categoryId: parseInt(productForm.categoryId),
        price: parseFloat(productForm.price),
        image: productForm.image || null,
        description: productForm.description || null,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, data);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', data);
        toast.success('Product created successfully');
      }

      setShowProductForm(false);
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    }
  };

  // Delete product
  const handleDeleteProduct = (productId: number) => {
    showConfirmation(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      async () => {
        try {
          await api.delete(`/products/${productId}`);
          toast.success('Product deleted successfully');
          loadProducts();
        } catch (error) {
          console.error('Error deleting product:', error);
          toast.error('Failed to delete product');
        }
      }
    );
  };

  // Handle image upload
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

  // Close form
  const closeForm = () => {
    setShowProductForm(false);
    setProductForm({
      name: '',
      categoryId: '',
      price: '',
      image: '',
      description: ''
    });
    setImagePreview('');
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-6 h-6" />
            Manajemen Stok
          </h1>
          <p className="text-gray-600 mt-1">Kelola produk dan stok bahan baku</p>
        </div>

        {/* Sub Navbar / Tabs */}
        <div className="mt-4 sm:mt-0 flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'products'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Produk
          </button>
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'ingredients'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Bahan Baku
          </button>
        </div>
      </div>

      {activeTab === 'products' ? (
        <>
          {/* Actions and Search */}
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

          {/* Product Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                <Package className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
              <p className="text-gray-500 mb-4">
                {products.length === 0
                  ? "Get started by adding your first product"
                  : "Try adjusting your search to find what you're looking for"}
              </p>
              {products.length === 0 && (
                <button
                  onClick={() => handleOpenProductForm()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Product
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                {paginatedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="h-32 bg-gray-50 flex items-center justify-center">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-800 truncate">{product.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {product.categories?.name || categories.find(c => c.id === product.categoryId)?.name || 'Uncategorized'}
                      </p>
                      <p className="text-blue-600 font-bold mt-2">
                        {formatCurrency(product.price)}
                      </p>
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <button
                          onClick={() => setRecipeModalProduct({ id: product.id, name: product.name })}
                          className="flex items-center justify-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm"
                          title="Kelola Resep"
                        >
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

              {/* Pagination */}
              {filteredProducts.length > itemsPerPage && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Previous
                  </button>

                  <span className="mx-2">
                    Page {currentPage} of {Math.ceil(filteredProducts.length / itemsPerPage)}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredProducts.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(filteredProducts.length / itemsPerPage)}
                    className={`px-3 py-1 rounded ${currentPage === Math.ceil(filteredProducts.length / itemsPerPage) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <IngredientManager />
      )}

      {/* Recipe Modal */}
      {recipeModalProduct && (
        <RecipeModal
          product={recipeModalProduct}
          onClose={() => setRecipeModalProduct(null)}
        />
      )}

      {/* Recipe Modal */}
      {recipeModalProduct && (
        <RecipeModal
          product={recipeModalProduct}
          onClose={() => setRecipeModalProduct(null)}
        />
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nama Produk *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan nama produk"
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
                    onChange={(e) => {
                      const rawValue = parsePriceInput(e.target.value);
                      handleFormChange('price', rawValue);
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan harga"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Gambar Produk</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    Atau masukkan URL gambar:
                  </div>
                  <input
                    type="text"
                    value={productForm.image}
                    onChange={(e) => handleFormChange('image', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                    placeholder="Masukkan URL gambar"
                  />
                </div>
                
                {imagePreview && (
                  <div className="mt-2">
                    <div className="text-sm font-medium mb-1">Preview:</div>
                    <div className="h-32 bg-gray-50 rounded flex items-center justify-center">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-1">Deskripsi</label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan deskripsi produk"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveProduct}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingProduct ? 'Simpan' : 'Buat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}