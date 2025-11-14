import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Tag, Plus, Edit, Trash2, X, Percent, DollarSign, Calendar, TrendingUp, LogOut, Activity, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface Promotion {
  id: number;
  name: string;
  description?: string;
  discountType: string;
  discountValue: number;
  minPurchase: number;
  maxDiscount?: number;
  applicableTo: string;
  applicableIds?: any;
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  outlets?: { name: string };
}

export default function PromotionsPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minPurchase: '0',
    maxDiscount: '',
    applicableTo: 'all',
    startDate: '',
    endDate: '',
    usageLimit: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/promotions');
      setPromotions(data.data);
    } catch (error: any) {
      toast.error('Failed to load promotions');
      console.error('Load promotions error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (promotion?: Promotion) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setForm({
        name: promotion.name,
        description: promotion.description || '',
        discountType: promotion.discountType,
        discountValue: promotion.discountValue.toString(),
        minPurchase: promotion.minPurchase.toString(),
        maxDiscount: promotion.maxDiscount?.toString() || '',
        applicableTo: promotion.applicableTo,
        startDate: promotion.startDate ? promotion.startDate.split('T')[0] : '',
        endDate: promotion.endDate ? promotion.endDate.split('T')[0] : '',
        usageLimit: promotion.usageLimit?.toString() || ''
      });
    } else {
      setEditingPromotion(null);
      setForm({
        name: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        minPurchase: '0',
        maxDiscount: '',
        applicableTo: 'all',
        startDate: '',
        endDate: '',
        usageLimit: ''
      });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.discountValue) {
      toast.error('Name and discount value are required');
      return;
    }

    setIsProcessing(true);
    try {
      const data: any = {
        name: form.name,
        description: form.description,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        minPurchase: parseFloat(form.minPurchase) || 0,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        applicableTo: form.applicableTo,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null
      };

      if (editingPromotion) {
        await api.put(`/promotions/${editingPromotion.id}`, data);
        toast.success('Promotion updated successfully');
      } else {
        await api.post('/promotions', data);
        toast.success('Promotion created successfully');
      }

      setShowForm(false);
      loadPromotions();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to save promotion');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (promotionId: number) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      await api.delete(`/promotions/${promotionId}`);
      toast.success('Promotion deleted successfully');
      loadPromotions();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete promotion');
    }
  };

  const handleToggleStatus = async (promotionId: number, currentStatus: boolean) => {
    try {
      await api.put(`/promotions/${promotionId}`, { isActive: !currentStatus });
      toast.success(`Promotion ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadPromotions();
    } catch (error: any) {
      toast.error('Failed to update promotion status');
    }
  };

  const getDiscountDisplay = (promo: Promotion) => {
    if (promo.discountType === 'percentage') {
      return `${promo.discountValue}%`;
    } else {
      return `Rp ${promo.discountValue.toLocaleString()}`;
    }
  };

  const isPromotionActive = (promo: Promotion) => {
    if (!promo.isActive) return false;
    const now = new Date();
    if (promo.endDate && new Date(promo.endDate) < now) return false;
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) return false;
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h2 className="text-xl font-bold text-gray-800">MyPOS</h2>
              <nav className="flex gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/employees')}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Employees
                </button>
                <button
                  onClick={() => navigate('/promotions')}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg"
                >
                  Promotions
                </button>
              </nav>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Tag className="w-8 h-8 text-blue-500" />
            Promotions & Discounts
          </h1>
          <p className="text-gray-600 mt-1">Manage your promotional offers and discounts</p>
        </div>

        {/* Add Promotion Button */}
        <div className="mb-6">
          <button
            onClick={() => handleOpenForm()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Promotion
          </button>
        </div>

        {/* Promotions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <div className="text-center">
                <Activity className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
                <p className="text-gray-600">Loading promotions...</p>
              </div>
            </div>
          ) : promotions.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Tag className="w-16 h-16 mx-auto mb-2 opacity-50 text-gray-400" />
              <p className="text-gray-400">No promotions yet. Create your first promotion!</p>
            </div>
          ) : (
            promotions.map((promo) => (
              <div
                key={promo.id}
                className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                  isPromotionActive(promo) ? 'border-green-500' : 'border-gray-300'
                }`}
              >
                {/* Promotion Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{promo.name}</h3>
                    {promo.description && (
                      <p className="text-sm text-gray-600 mt-1">{promo.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleStatus(promo.id, promo.isActive)}
                    className={`px-2 py-1 text-xs font-semibold rounded ${
                      promo.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {promo.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>

                {/* Discount Info */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {promo.discountType === 'percentage' ? (
                      <Percent className="w-5 h-5 text-blue-500" />
                    ) : (
                      <DollarSign className="w-5 h-5 text-green-500" />
                    )}
                    <span className="text-2xl font-bold text-blue-600">
                      {getDiscountDisplay(promo)}
                    </span>
                  </div>

                  {promo.minPurchase > 0 && (
                    <p className="text-sm text-gray-600">
                      Min. Purchase: Rp {promo.minPurchase.toLocaleString()}
                    </p>
                  )}

                  {promo.maxDiscount && promo.discountType === 'percentage' && (
                    <p className="text-sm text-gray-600">
                      Max Discount: Rp {promo.maxDiscount.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Date Range */}
                {(promo.startDate || promo.endDate) && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {promo.startDate && new Date(promo.startDate).toLocaleDateString()}
                      {promo.startDate && promo.endDate && ' - '}
                      {promo.endDate && new Date(promo.endDate).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Usage Stats */}
                {promo.usageLimit && (
                  <div className="mb-4 flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-600">
                      Used: {promo.usageCount} / {promo.usageLimit}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 ml-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min((promo.usageCount / promo.usageLimit) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => handleOpenForm(promo)}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="flex-1 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {!loading && promotions.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-4">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-gray-600">Total Promotions: </span>
                <span className="font-semibold">{promotions.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Active: </span>
                <span className="font-semibold text-green-600">
                  {promotions.filter(p => isPromotionActive(p)).length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Inactive: </span>
                <span className="font-semibold text-gray-600">
                  {promotions.filter(p => !isPromotionActive(p)).length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {editingPromotion ? 'Edit Promotion' : 'Add New Promotion'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Promotion Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Weekend Special"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Promotion description"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Discount Type *</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Discount Value * {form.discountType === 'percentage' ? '(%)' : '(Rp)'}
                  </label>
                  <input
                    type="number"
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={form.discountType === 'percentage' ? '10' : '50000'}
                    min="0"
                    step={form.discountType === 'percentage' ? '1' : '1000'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Min. Purchase (Rp)</label>
                  <input
                    type="number"
                    value={form.minPurchase}
                    onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                    step="1000"
                  />
                </div>

                {form.discountType === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Discount (Rp)</label>
                    <input
                      type="number"
                      value={form.maxDiscount}
                      onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional"
                      min="0"
                      step="1000"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Usage Limit</label>
                <input
                  type="number"
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Applicable To</label>
                <select
                  value={form.applicableTo}
                  onChange={(e) => setForm({ ...form, applicableTo: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Products</option>
                  <option value="category">Specific Category</option>
                  <option value="item">Specific Items</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300"
                >
                  {isProcessing ? 'Saving...' : editingPromotion ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
