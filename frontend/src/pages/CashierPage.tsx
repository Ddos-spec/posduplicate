import { useState, useEffect, useCallback } from 'react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import api, { getFullUrl } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { ShoppingCart, Search, X, Plus, Minus, Trash2, CreditCard, Edit, Settings, Receipt, UtensilsCrossed, Tag, Menu, UserCircle2 } from 'lucide-react';
import TransactionHistory from '../components/transaction/TransactionHistory';
import TableManagement from '../components/table/TableManagement';
import ModifierManagement from '../components/modifiers/ModifierManagement';
import ProductCustomizeModal from '../components/cashier/ProductCustomizeModal';
import ProfileMenu from '../components/cashier/ProfileMenu';
import RunningLogo from '../components/RunningLogo';
import { printReceipt } from '../utils/exportUtils';
import { settingsService } from '../services/settingsService';
import type { TenantSettings } from '../services/settingsService';
import useConfirmationStore from '../store/confirmationStore';
import { formatCurrency } from '../utils/format';

interface Product {
  id: number;
  name: string;
  price: number;
  priceGofood?: number | null;
  priceGrabfood?: number | null;
  priceShopeefood?: number | null;
  category?: { id: number; name: string };
  categories?: { id: number; name: string };
  image?: string;
  description?: string;
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
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [orderType, setOrderType] = useState('dine_in');

  // Helper function to format currency with dot as thousand separator
  const formatCurrencyDisplay = (value: number): string => {
    const formatted = Math.floor(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Rp ${formatted}`;
  };

  // Helper function to format number with thousand separator (dot)
  const formatPriceInput = (value: string): string => {
    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    // Format with dot as thousand separator
    return parseInt(numbers).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Helper function to parse formatted price back to number
  const parsePriceInput = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  // Split bill states
  const [splitBillMode, setSplitBillMode] = useState(false);
  const [payments, setPayments] = useState<Array<{ method: string; amount: string; cashReceived?: string }>>([]);
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');

  // Product management states
  const [managementMode, setManagementMode] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    categoryId: '',
    price: '',
    image: '',
    description: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Category management states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'item'
  });

  // Transaction history state
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);

  // Table & Modifier states
  const [showTableManagement, setShowTableManagement] = useState(false);
  const [showModifierManagement, setShowModifierManagement] = useState(false);

  // Product customize modal state
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);

  // Profile menu state
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Mobile menu state
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Integrations state
  const [qrisImage, setQrisImage] = useState<string | null>(null);
  const [activeIntegrations, setActiveIntegrations] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const { items, addItem, updateQuantity, removeItem, clearCart, getTotal, getSubtotal } = useCartStore();
  const { showConfirmation } = useConfirmationStore();

  const loadIntegrations = async () => {
    try {
      const { data } = await api.get('/integrations');
      const active = data.data
        .filter((i: any) => i.status === 'active')
        .map((i: any) => i.integrationType);
      
      setActiveIntegrations(active);

      if (active.includes('qris')) {
        // In a real scenario, this would be qris.configuration.imageUrl
        // For now, we use a placeholder or the static asset if configured
        setQrisImage('/assets/integrations/qris.svg'); 
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const result = await settingsService.getSettings();
      setSettings(result.data);
    } catch (error: unknown) {
      console.error('Failed to load settings:', error);
      let errorMessage = 'Failed to load settings';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    }
  };

  const loadProducts = useCallback(async () => {
    try {
      const params: Record<string, string | number> = {};
      if (selectedCategory) params.category_id = selectedCategory;
      if (search) params.search = search;
      const { data } = await api.get('/products', { params });
      setProducts(data.data);
    } catch (error: unknown) {
      console.error('Failed to load products:', error);
      let errorMessage = 'Failed to load products';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    }
  }, [selectedCategory, search]);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data.data);
    } catch (error: unknown) {
      console.error('Failed to load categories:', error);
      let errorMessage = 'Failed to load categories';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadSettings();
    loadIntegrations();
  }, [loadProducts, loadCategories]);

  const handleProductClick = (product: Product) => {
    if (managementMode) return;
    // Show customize modal
    setCustomizingProduct(product);
  };

  const handleAddToCart = (
    product: Product,
    modifiers: { id: number; name: string; price: number }[] = [],
    notes: string = ''
  ) => {
    addItem({
      itemId: product.id,
      name: product.name,
      price: parseFloat(product.price.toString()),
      priceGofood: product.priceGofood ? parseFloat(product.priceGofood.toString()) : null,
      priceGrabfood: product.priceGrabfood ? parseFloat(product.priceGrabfood.toString()) : null,
      priceShopeefood: product.priceShopeefood ? parseFloat(product.priceShopeefood.toString()) : null,
      modifiers: modifiers.length > 0 ? modifiers : undefined,
      notes: notes || undefined,
    });
    const modifierText = modifiers.length > 0 ? ` with ${modifiers.length} modifier(s)` : '';
    toast.success(`${product.name}${modifierText} added to cart`);
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    
    // Auto-select payment method based on current platform mode
    if (selectedPlatform) {
      setPaymentMethod(selectedPlatform);
    } else {
      setPaymentMethod('cash');
    }

    setShowPayment(true);
    setSplitBillMode(false);
    setPayments([]);
    setCurrentPaymentAmount('');
  };

  const handleAddPayment = () => {
    if (!currentPaymentAmount || parseFloat(currentPaymentAmount) <= 0) {
      toast.error('Please enter valid amount');
      return;
    }

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const remaining = getTotal(paymentMethod) - totalPaid;
    const amount = parseFloat(currentPaymentAmount);

    if (amount > remaining) {
      toast.error(`Amount exceeds remaining balance (${formatCurrencyDisplay(remaining)})`);
      return;
    }

    setPayments([...payments, {
      method: paymentMethod,
      amount: currentPaymentAmount,
      cashReceived: paymentMethod === 'cash' ? cashReceived : undefined
    }]);

    setCurrentPaymentAmount('');
    setCashReceived('');
    toast.success('Payment added');
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const getTotalPaid = () => {
    return payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  };

  const getRemainingAmount = () => {
    return getTotal(paymentMethod) - getTotalPaid();
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      let finalPayments;

      if (splitBillMode) {
        if (getRemainingAmount() > 0) {
          toast.error('Please complete all payments');
          setIsProcessing(false);
          return;
        }
        finalPayments = payments.map(p => ({
          method: p.method,
          amount: parseFloat(p.amount),
          changeAmount: p.method === 'cash' && p.cashReceived
            ? parseFloat(p.cashReceived) - parseFloat(p.amount)
            : 0
        }));
      } else {
        finalPayments = [{
          method: paymentMethod,
          amount: getTotal(paymentMethod),
          changeAmount: paymentMethod === 'cash' ? parseFloat(cashReceived || '0') - getTotal(paymentMethod) : 0,
        }];
      }

      // Get user's outlet ID from auth store
      const user = useAuthStore.getState().user;
      const outletId = user?.outletId || user?.outlets?.id || null;

      // Calculate tax and service charge based on settings (use payment method pricing)
      const subtotal = getSubtotal(splitBillMode ? undefined : paymentMethod);
      const taxAmount = settings?.enableTax && settings?.taxRate ? (subtotal * settings.taxRate) / 100 : 0;
      const serviceChargeAmount = settings?.enableServiceCharge && settings?.serviceCharge ? (subtotal * settings.serviceCharge) / 100 : 0;

      const orderData = {
        orderType: orderType,
        outletId: outletId,
        items: items.map(item => ({
          itemId: item.itemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          variantId: item.variantId,
          modifiers: item.modifiers?.map(m => m.id) || [],
          notes: item.notes,
        })),
        subtotal: subtotal,
        discountAmount: 0,
        taxAmount: taxAmount,
        serviceCharge: serviceChargeAmount,
        total: subtotal + taxAmount + serviceChargeAmount,
        payments: finalPayments,
      };

      console.log('Creating transaction with data:', orderData);
      const response = await api.post('/transactions', orderData);
      const transactionData = response.data.data;
      console.log('Transaction created successfully:', transactionData);

      toast.success('Payment successful!');

      // Generate and print receipt
      printReceipt(
        {
          transactionNumber: transactionData?.transactionNumber,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            modifiers: item.modifiers,
            notes: item.notes
          })),
          subtotal: subtotal,
          discountAmount: 0,
          taxAmount: taxAmount,
          serviceCharge: serviceChargeAmount,
          total: subtotal + taxAmount + serviceChargeAmount,
          payments: finalPayments,
          cashierName: useAuthStore.getState().user?.name,
          outletName: undefined
        },
        settings ? {
          businessName: settings.businessName,
          address: settings.address || undefined,
          phone: settings.phone || undefined,
          receiptHeader: settings.receiptHeader || undefined,
          receiptFooter: settings.receiptFooter || undefined,
          printerWidth: settings.printerWidth || undefined,
          logo: settings.logo ? getFullUrl(settings.logo) : undefined,
          showLogoOnReceipt: settings.showLogoOnReceipt || false,
          taxName: settings.taxName || undefined
        } : undefined
      );

      clearCart();
      setShowPayment(false);
      setCashReceived('');
      setPayments([]);
      setSplitBillMode(false);
    } catch (error: unknown) {
      console.error('Payment failed:', error);
      console.error('Error details:', axios.isAxiosError(error) ? error.response?.data : error);
      let errorMessage = 'Payment failed';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const changeAmount = cashReceived ? parseFloat(cashReceived) - getTotal(paymentMethod) : 0;

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const imageUrl = getFullUrl(response.data.data.url);
      setProductForm({ ...productForm, image: imageUrl });
      setImagePreview(imageUrl);
      toast.success('Image uploaded successfully');
    } catch (error: unknown) {
      console.error('Error uploading image:', error);
      let errorMessage = 'Failed to upload image';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  // Product management handlers
  const handleOpenProductForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      // Ensure categoryId is preserved when editing
      const catId = product.category?.id?.toString() || '';
      setProductForm({
        name: product.name,
        categoryId: catId,
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

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.categoryId || !productForm.price) {
      toast.error('Please fill all required fields');
      return;
    }

    // Get user's outlet ID from auth store
    const user = useAuthStore.getState().user;
    const outletId = user?.outletId || user?.outlets?.id || null;

    if (!outletId) {
      toast.error('Outlet ID is required. Please ensure you are logged in properly.');
      return;
    }

    setIsProcessing(true);
    try {
      const data = {
        name: productForm.name,
        categoryId: parseInt(productForm.categoryId),
        price: parseFloat(productForm.price),
        image: productForm.image || null,
        description: productForm.description || null,
        isActive: true,
        outletId: outletId
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
    } catch (error: unknown) {
      console.error('Error saving product:', error);
      let errorMessage = 'Failed to save product';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteProduct = (productId: number) => {
    showConfirmation(
      'Delete Product',
      'Are you sure you want to delete this product?',
      async () => {
        try {
          await api.delete(`/products/${productId}`);
          toast.success('Product deleted successfully');
          loadProducts();
        } catch (error: unknown) {
          console.error('Error deleting product:', error);
          let errorMessage = 'Failed to delete product';
          if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
          }
          toast.error(errorMessage);
        }
      }
    );
  };

  // Category management handlers
  const handleOpenCategoryForm = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        type: 'item'
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        type: 'item'
      });
    }
    setShowCategoryForm(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name) {
      toast.error('Category name is required');
      return;
    }

    // Get user's outlet ID from auth store
    const user = useAuthStore.getState().user;
    const outletId = user?.outletId || user?.outlets?.id || null;

    if (!outletId) {
      toast.error('Outlet ID is required. Please ensure you are logged in properly.');
      return;
    }

    setIsProcessing(true);
    try {
      const data = {
        name: categoryForm.name,
        type: categoryForm.type,
        outletId: outletId
      };

      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, data);
        toast.success('Category updated successfully');
      } else {
        await api.post('/categories', data);
        toast.success('Category created successfully');
      }

      setShowCategoryForm(false);
      loadCategories();
    } catch (error: unknown) {
      console.error('Error saving category:', error);
      let errorMessage = 'Failed to save category';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCategory = (categoryId: number) => {
    showConfirmation(
      'Delete Category',
      'Are you sure you want to delete this category?',
      async () => {
        try {
          await api.delete(`/categories/${categoryId}`);
          toast.success('Category deleted successfully');
          loadCategories();
          if (selectedCategory === categoryId) {
            setSelectedCategory(null);
          }
        } catch (error: unknown) {
          console.error('Error deleting category:', error);
          let errorMessage = 'Failed to delete category';
          if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
          }
          toast.error(errorMessage);
        }
      }
    );
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
                onKeyUp={(e) => e.key === 'Enter' && loadProducts()}
              />
            </div>

            {/* Platform Switcher */}
            {(activeIntegrations.includes('gofood') || activeIntegrations.includes('grabfood') || activeIntegrations.includes('shopeefood')) && (
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
                
                {activeIntegrations.includes('gofood') && (
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
                )}

                {activeIntegrations.includes('grabfood') && (
                  <button
                    onClick={() => setSelectedPlatform('grabfood')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition border whitespace-nowrap ${
                      selectedPlatform === 'grabfood' 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    GrabFood
                  </button>
                )}

                {activeIntegrations.includes('shopeefood') && (
                  <button
                    onClick={() => setSelectedPlatform('shopeefood')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition border whitespace-nowrap ${
                      selectedPlatform === 'shopeefood' 
                        ? 'bg-orange-500 text-white border-orange-500' 
                        : 'bg-white text-orange-500 border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    ShopeeFood
                  </button>
                )}
              </div>
            )}

            {/* Desktop Buttons */}
            <div className="hidden md:flex gap-2">
              <button
                onClick={() => setShowTableManagement(true)}
                className="px-4 py-2 rounded-lg bg-indigo-500 text-white flex items-center gap-2 hover:bg-indigo-600"
              >
                <UtensilsCrossed className="w-5 h-5" />
                Tables
              </button>
              <button
                onClick={() => setShowModifierManagement(true)}
                className="px-4 py-2 rounded-lg bg-pink-500 text-white flex items-center gap-2 hover:bg-pink-600"
              >
                <Tag className="w-5 h-5" />
                Modifiers
              </button>
              <button
                onClick={() => setShowTransactionHistory(true)}
                className="px-4 py-2 rounded-lg bg-purple-500 text-white flex items-center gap-2 hover:bg-purple-600"
              >
                <Receipt className="w-5 h-5" />
                Transactions
              </button>
              <button
                onClick={() => setManagementMode(!managementMode)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  managementMode ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                <Settings className="w-5 h-5" />
                {managementMode ? 'Exit' : 'Manage'}
              </button>
              <button
                onClick={() => setShowProfileMenu(true)}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white flex items-center gap-2 hover:bg-blue-600"
              >
                <UserCircle2 className="w-5 h-5" />
              </button>
              {managementMode && (
                <button
                  onClick={() => handleOpenProductForm()}
                  className="px-4 py-2 rounded-lg bg-green-500 text-white flex items-center gap-2 hover:bg-green-600"
                >
                  <Plus className="w-5 h-5" />
                  Add
                </button>
              )}
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
              <span className="font-semibold">{items.length}</span>
            </button>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                !selectedCategory ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              }`}
              disabled={managementMode}
            >
              All
            </button>
            {categories.map((cat) => (
              <div key={cat.id} className="relative inline-block">
                <button
                  onClick={() => !managementMode && setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                    selectedCategory === cat.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                  } ${managementMode ? 'pr-20' : ''}`}
                >
                  {cat.name}
                </button>
                {managementMode && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      onClick={() => handleOpenCategoryForm(cat)}
                      className="bg-blue-500 text-white p-1.5 rounded hover:bg-blue-600"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="bg-red-500 text-white p-1.5 rounded hover:bg-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {managementMode && (
              <button
                onClick={() => handleOpenCategoryForm()}
                className="px-4 py-2 rounded-lg bg-green-500 text-white flex items-center gap-2 hover:bg-green-600 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            )}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {products.map((product) => {
              // Calculate Dynamic Price based on Selected Platform
              let displayPrice = product.price;
              let isMarkup = false;

              if (selectedPlatform === 'gofood' && product.priceGofood) {
                displayPrice = product.priceGofood;
                isMarkup = true;
              } else if (selectedPlatform === 'grabfood' && product.priceGrabfood) {
                displayPrice = product.priceGrabfood;
                isMarkup = true;
              } else if (selectedPlatform === 'shopeefood' && product.priceShopeefood) {
                displayPrice = product.priceShopeefood;
                isMarkup = true;
              }

              // Create a proxy product with the updated price for the cart/modal
              const platformProduct = { ...product, price: displayPrice };

              return (
              <div
                key={product.id}
                onClick={() => handleProductClick(platformProduct)}
                className={`bg-white rounded-lg p-4 shadow hover:shadow-lg transition relative min-h-[180px] touch-manipulation ${
                  !managementMode ? 'cursor-pointer active:scale-95' : ''
                } ${isMarkup ? 'ring-2 ring-blue-100' : ''}`}
              >
                {managementMode && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenProductForm(product); }}
                      className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 touch-manipulation min-h-[48px] min-w-[48px] flex items-center justify-center"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
                      className="bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 touch-manipulation min-h-[48px] min-w-[48px] flex items-center justify-center"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <div className="aspect-square bg-gray-200 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                  {isMarkup && (
                    <span className="absolute top-1 right-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                      {selectedPlatform === 'gofood' ? 'GO' : selectedPlatform === 'grabfood' ? 'GRAB' : 'SHOPEE'}
                    </span>
                  )}
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
                        (e.target as HTMLImageElement).onerror = null; // Prevent infinite loop
                      }}
                    />
                  ) : (
                    <span className="text-4xl text-gray-400">📦</span>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-1 truncate">{product.name}</h3>
                <p className={`font-bold ${isMarkup ? 'text-orange-600' : 'text-blue-600'}`}>
                  {formatCurrency(displayPrice)}
                </p>
                <span className="text-xs text-gray-500">
                  {product.categories?.name || product.category?.name || categories.find(c => c.id === (product as any).categoryId)?.name || ''}
                </span>
              </div>
            );
            })}
          </div>
        </div>
      </div>

      {/* Cart Section - Desktop */}
      <div className="hidden md:flex w-96 bg-white border-l flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            Cart ({items.length})
          </h2>
        </div>
        <RunningLogo />

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
                    <div className="flex-1">
                      <span className="font-medium">{item.name}</span>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.modifiers.map((mod, idx) => (
                            <div key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                              <span>{mod.name}</span>
                              {mod.price > 0 && (
                                <span className="text-blue-600">+{formatCurrencyDisplay(mod.price)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {item.notes && (
                        <p className="text-xs text-gray-500 italic mt-1">Note: {item.notes}</p>
                      )}
                    </div>
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
                      {formatCurrencyDisplay((item.price + (item.modifiers?.reduce((sum, m) => sum + m.price, 0) || 0)) * item.quantity)}
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
              <span>{formatCurrencyDisplay(getSubtotal())}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span className="text-blue-600">{formatCurrencyDisplay(getTotal())}</span>
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
          <div className="bg-white rounded-lg p-6 w-[500px] max-w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Payment</h3>
              <button onClick={() => setShowPayment(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 pb-4 border-b">
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-3xl font-bold text-blue-600">{formatCurrencyDisplay(getTotal(paymentMethod))}</p>
              {paymentMethod !== 'cash' && paymentMethod !== 'card' && paymentMethod !== 'qris' && (
                <p className="text-xs text-gray-500 mt-1">Platform-specific pricing applied</p>
              )}
            </div>

            {/* Split Bill Toggle */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setSplitBillMode(!splitBillMode);
                  if (!splitBillMode) {
                    setPayments([]);
                    setCurrentPaymentAmount('');
                  }
                }}
                className={`w-full py-2 rounded-lg font-semibold ${
                  splitBillMode
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {splitBillMode ? '✓ Split Bill Mode' : 'Enable Split Bill'}
              </button>
            </div>

            {splitBillMode ? (
              <>
                {/* Split Bill UI */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Total Paid:</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrencyDisplay(getTotalPaid())}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Remaining:</span>
                    <span className="text-lg font-bold text-red-600">{formatCurrencyDisplay(getRemainingAmount())}</span>
                  </div>
                </div>

                {/* Payment List */}
                {payments.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {payments.map((payment, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <div>
                          <span className="font-semibold capitalize">{payment.method}</span>
                          <p className="text-sm text-gray-600">{formatCurrencyDisplay(parseFloat(payment.amount))}</p>
                        </div>
                        <button
                          onClick={() => handleRemovePayment(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Payment Form */}
                {getRemainingAmount() > 0 && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">Payment Method</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'cash', label: 'Cash', color: 'bg-blue-500' },
                          { id: 'card', label: 'Card', color: 'bg-purple-500' },
                          { id: 'qris', label: 'QRIS', color: 'bg-indigo-500' },
                          { id: 'gofood', label: 'GoFood', color: 'bg-green-600' },
                          { id: 'grabfood', label: 'GrabFood', color: 'bg-red-600' },
                          { id: 'shopeefood', label: 'ShopeeFood', color: 'bg-orange-600' }
                        ].map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id)}
                            className={`py-3 px-2 rounded-lg text-sm font-medium transition-all md:py-3 md:px-4 ${
                              paymentMethod === method.id
                                ? `${method.color} text-white shadow-lg scale-105`
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {method.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">Amount</label>
                      <input
                        type="number"
                        value={currentPaymentAmount}
                        onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter amount"
                      />
                      <button
                        onClick={() => setCurrentPaymentAmount(getRemainingAmount().toString())}
                        className="text-xs text-blue-600 hover:underline mt-1"
                      >
                        Pay Remaining ({formatCurrencyDisplay(getRemainingAmount())})
                      </button>
                    </div>

                    {paymentMethod === 'cash' && currentPaymentAmount && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Cash Received</label>
                        <input
                          type="number"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Cash received"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleAddPayment}
                      className="w-full bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 mb-4"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Add Payment
                    </button>
                  </>
                )}

                <button
                  onClick={handlePayment}
                  disabled={isProcessing || getRemainingAmount() > 0}
                  className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Complete Transaction'}
                </button>
              </>
            ) : (
              <>
                {/* Order Type Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Order Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'dine_in', label: 'Dine In', color: 'bg-blue-500' },
                      { id: 'takeaway', label: 'Takeaway', color: 'bg-purple-500' },
                      { id: 'delivery', label: 'Pesan WA', color: 'bg-green-500' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setOrderType(type.id)}
                        className={`py-3 px-2 rounded-lg text-sm font-medium transition-all md:py-4 md:px-4 touch-manipulation ${
                          orderType === type.id
                            ? `${type.color} text-white shadow-lg scale-105`
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cash', label: 'Cash', color: 'bg-blue-500' },
                      { id: 'card', label: 'Card', color: 'bg-purple-500' },
                      { id: 'qris', label: 'QRIS', color: 'bg-indigo-500' },
                      { id: 'gofood', label: 'GoFood', color: 'bg-green-600' },
                      { id: 'grabfood', label: 'GrabFood', color: 'bg-red-600' },
                      { id: 'shopeefood', label: 'ShopeeFood', color: 'bg-orange-600' }
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`py-3 px-2 rounded-lg text-sm font-medium transition-all md:py-4 md:px-4 touch-manipulation ${
                          paymentMethod === method.id
                            ? `${method.color} text-white shadow-lg scale-105`
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'qris' && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg text-center">
                    {qrisImage ? (
                      <div className="flex flex-col items-center">
                        <p className="text-sm font-medium text-gray-700 mb-2">Scan QRIS</p>
                        <div className="bg-white p-2 rounded-lg shadow-sm border">
                          <img 
                            src={qrisImage} 
                            alt="QRIS Code" 
                            className="w-48 h-48 object-contain" 
                            onError={(e) => {
                              // Fallback if image fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                              setQrisImage(null); 
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Tunjukkan ke pelanggan</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-500">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-2">
                          <CreditCard className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium">QRIS Digital Belum Aktif</p>
                        <p className="text-xs mt-1">Silakan gunakan QRIS Fisik / Stand Acrylic</p>
                      </div>
                    )}
                  </div>
                )}

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
                        Change: <span className="font-semibold">{formatCurrencyDisplay(changeAmount)}</span>
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
              </>
            )}
          </div>
        </div>
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
              <button onClick={() => setShowCategoryForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter category name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category Type</label>
                <select
                  value={categoryForm.type}
                  onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="item">Item</option>
                  <option value="ingredient">Ingredient</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowCategoryForm(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategory}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] max-w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setShowProductForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Product Name *</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <select
                  value={productForm.categoryId}
                  onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Price * (Rp)</label>
                <input
                  type="text"
                  value={productForm.price ? formatPriceInput(productForm.price) : ''}
                  onChange={(e) => {
                    const rawValue = parsePriceInput(e.target.value);
                    setProductForm({ ...productForm, price: rawValue });
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Product Image</label>
                <div className="space-y-3">
                  {imagePreview && (
                    <div className="relative w-32 h-32 mx-auto">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview('');
                          setProductForm({ ...productForm, image: '' });
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <label className={`flex-1 px-4 py-2 border-2 border-dashed rounded-lg text-center cursor-pointer transition ${
                      uploadingImage ? 'bg-gray-100 cursor-wait' : 'hover:border-blue-500 hover:bg-blue-50'
                    }`}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                      <span className="text-sm text-gray-600">
                        {uploadingImage ? 'Uploading...' : imagePreview ? 'Change Image' : '📷 Upload Image'}
                      </span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={productForm.image}
                    onChange={(e) => {
                      setProductForm({ ...productForm, image: e.target.value });
                      setImagePreview(e.target.value);
                    }}
                    className="w-full px-4 py-2 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Or paste image URL"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowProductForm(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProduct}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Cart Drawer */}
      {showMobileCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                Cart ({items.length})
              </h2>
              <button onClick={() => setShowMobileCart(false)} className="text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <RunningLogo />

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
                        <div className="flex-1">
                          <span className="font-medium">{item.name}</span>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {item.modifiers.map((mod, idx) => (
                                <div key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                  <span>{mod.name}</span>
                                  {mod.price > 0 && (
                                    <span className="text-blue-600">+{formatCurrencyDisplay(mod.price)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {item.notes && (
                            <p className="text-xs text-gray-500 italic mt-1">Note: {item.notes}</p>
                          )}
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-semibold text-blue-600">
                          {formatCurrencyDisplay((item.price + (item.modifiers?.reduce((sum, m) => sum + m.price, 0) || 0)) * item.quantity)}
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
                  <span className="text-blue-600">{formatCurrencyDisplay(getTotal())}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMobileCart(false);
                  handleCheckout();
                }}
                disabled={items.length === 0}
                className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="absolute left-0 top-0 bottom-0 w-full max-w-xs bg-white p-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Menu</h2>
              <button onClick={() => setShowMobileMenu(false)} className="text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowProfileMenu(true);
                  setShowMobileMenu(false);
                }}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg flex items-center gap-2"
              >
                <UserCircle2 className="w-5 h-5" />
                Profil Kasir
              </button>
              <button
                onClick={() => {
                  setShowTableManagement(true);
                  setShowMobileMenu(false);
                }}
                className="w-full px-4 py-3 bg-indigo-500 text-white rounded-lg flex items-center gap-2"
              >
                <UtensilsCrossed className="w-5 h-5" />
                Tables
              </button>
              <button
                onClick={() => {
                  setShowModifierManagement(true);
                  setShowMobileMenu(false);
                }}
                className="w-full px-4 py-3 bg-pink-500 text-white rounded-lg flex items-center gap-2"
              >
                <Tag className="w-5 h-5" />
                Modifiers
              </button>
              <button
                onClick={() => {
                  setShowTransactionHistory(true);
                  setShowMobileMenu(false);
                }}
                className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg flex items-center gap-2"
              >
                <Receipt className="w-5 h-5" />
                Transactions
              </button>
              <button
                onClick={() => {
                  setManagementMode(!managementMode);
                  setShowMobileMenu(false);
                }}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg flex items-center gap-2"
              >
                <Settings className="w-5 h-5" />
                {managementMode ? 'Exit Manage' : 'Manage Products'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {showTransactionHistory && (
        <TransactionHistory onClose={() => setShowTransactionHistory(false)} />
      )}

      {/* Table Management Modal */}
      {showTableManagement && (
        <TableManagement onClose={() => setShowTableManagement(false)} />
      )}

      {/* Modifier Management Modal */}
      {showModifierManagement && (
        <ModifierManagement onClose={() => setShowModifierManagement(false)} />
      )}

      {/* Product Customize Modal */}
      {customizingProduct && (
        <ProductCustomizeModal
          product={customizingProduct}
          onClose={() => setCustomizingProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Profile Menu Modal */}
      <ProfileMenu
        isOpen={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
      />
    </div>
  );
}
