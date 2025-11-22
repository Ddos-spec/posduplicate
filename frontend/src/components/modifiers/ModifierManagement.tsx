import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import axios from 'axios';
import { X, Plus, Edit, Trash2, Tag } from 'lucide-react';
import useConfirmationStore from '../../store/confirmationStore';

interface Modifier {
  id: number;
  name: string;
  price: number;
  category?: string;
  isActive: boolean;
}

interface ModifierManagementProps {
  onClose: () => void;
}

export default function ModifierManagement({ onClose }: ModifierManagementProps) {
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null);
  const [form, setForm] = useState({ name: '', price: '0', category: 'addon' });
  const [isProcessing, setIsProcessing] = useState(false);
  const { showConfirmation } = useConfirmationStore();

  useEffect(() => {
    loadModifiers();
  }, []);

  const loadModifiers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/modifiers');
      setModifiers(data.data);
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

  const handleOpenForm = (modifier?: Modifier) => {
    if (modifier) {
      setEditingModifier(modifier);
      setForm({
        name: modifier.name,
        price: modifier.price.toString(),
        category: modifier.category || 'addon'
      });
    } else {
      setEditingModifier(null);
      setForm({ name: '', price: '0', category: 'addon' });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Modifier name is required');
      return;
    }

    setIsProcessing(true);
    try {
      const data = {
        name: form.name,
        price: parseFloat(form.price),
        category: form.category
      };

      if (editingModifier) {
        await api.put(`/modifiers/${editingModifier.id}`, data);
        toast.success('Modifier updated successfully');
      } else {
        await api.post('/modifiers', data);
        toast.success('Modifier created successfully');
      }

      setShowForm(false);
      loadModifiers();
    } catch (error: unknown) {
      console.error('Error saving modifier:', error);
      let errorMessage = 'Failed to save modifier';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleStatus = async (modifierId: number, currentStatus: boolean) => {
    try {
      await api.put(`/modifiers/${modifierId}`, { isActive: !currentStatus });
      toast.success(`Modifier ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      loadModifiers();
    } catch (error: unknown) {
      console.error('Error toggling modifier status:', error);
      let errorMessage = 'Failed to update modifier status';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    }
  };

  const handleDelete = (modifierId: number) => {
    showConfirmation(
      'Delete Modifier',
      'Are you sure you want to delete this modifier?',
      async () => {
        try {
          await api.delete(`/modifiers/${modifierId}`);
          toast.success('Modifier deleted successfully');
          loadModifiers();
        } catch (error: unknown) {
          console.error('Error deleting modifier:', error);
          let errorMessage = 'Failed to delete modifier';
          if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
          }
          toast.error(errorMessage);
        }
      }
    );
  };

  const getCategoryBadge = (category?: string) => {
    const colors: Record<string, string> = {
      addon: 'bg-blue-100 text-blue-700',
      size: 'bg-purple-100 text-purple-700',
      temperature: 'bg-orange-100 text-orange-700',
      spice: 'bg-red-100 text-red-700',
      topping: 'bg-green-100 text-green-700'
    };
    return colors[category || 'addon'] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[90vw] max-w-5xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="w-6 h-6" />
            Modifier Management
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenForm()}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Modifier
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : modifiers.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <Tag className="w-16 h-16 mx-auto mb-2 opacity-50" />
              <p>No modifiers yet. Add your first modifier!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Price</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {modifiers.map((modifier) => (
                    <tr key={modifier.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{modifier.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getCategoryBadge(modifier.category)}`}>
                          {modifier.category || 'addon'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-blue-600 font-semibold">
                        {modifier.price > 0 ? `+Rp ${modifier.price.toLocaleString('id-ID')}` : 'Free'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStatus(modifier.id, modifier.isActive)}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                            modifier.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {modifier.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleOpenForm(modifier)}
                            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            title="Edit modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(modifier.id)}
                            className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                            title="Delete modifier"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-600">Total Modifiers: </span>
              <span className="font-semibold">{modifiers.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Active: </span>
              <span className="font-semibold text-green-600">
                {modifiers.filter(m => m.isActive).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingModifier ? 'Edit Modifier' : 'Add New Modifier'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Modifier Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Extra Shot, Large Size"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="addon">Add-on</option>
                  <option value="size">Size</option>
                  <option value="temperature">Temperature</option>
                  <option value="spice">Spice Level</option>
                  <option value="topping">Topping</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Harga Tambahan (Rp) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                  <input
                    type="text"
                    value={form.price ? parseInt(form.price).toLocaleString('id-ID') : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setForm({ ...form, price: value });
                    }}
                    className="w-full pl-12 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Masukkan 0 untuk modifier gratis</p>
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
                  {isProcessing ? 'Saving...' : editingModifier ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
