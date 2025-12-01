import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import useConfirmationStore from '../../store/confirmationStore';

interface Ingredient {
  id: number;
  name: string;
  unit: string;
  stock: number;
  min_stock: number;
  cost_per_unit: number;
  outlet_id: number;
  is_active: boolean;
}

export default function IngredientsManagementPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [currentPage] = useState(1);
  const itemsPerPage = 10;

  // State for form
  const [form, setForm] = useState({
    name: '',
    unit: 'kg',
    stock: '',
    minStock: '',
    cost: ''
  });

  const { showConfirmation } = useConfirmationStore();

  // Load ingredients
  const loadIngredients = useCallback(async () => {
    try {
      setLoading(true);
      // Get user's outlet ID from localStorage (optional)
      const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
      const outletId = user?.outletId || user?.outlet?.id;

      // If outletId exists, filter by it; otherwise get all ingredients for tenant
      const params: any = {};
      if (outletId) {
        params.outlet_id = outletId;
      }

      const response = await api.get('/ingredients', { params });
      setIngredients(response.data.data);
    } catch (error) {
      console.error('Failed to load ingredients:', error);
      toast.error('Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIngredients();
  }, [loadIngredients]);

  // Filter ingredients
  const filteredIngredients = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginate
  const paginatedIngredients = filteredIngredients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenForm = (ingredient?: Ingredient) => {
    if (ingredient) {
      setEditingIngredient(ingredient);
      setForm({
        name: ingredient.name,
        unit: ingredient.unit,
        stock: ingredient.stock.toString(),
        minStock: ingredient.min_stock.toString(),
        cost: ingredient.cost_per_unit.toString()
      });
    } else {
      setEditingIngredient(null);
      setForm({
        name: '',
        unit: 'kg',
        stock: '0',
        minStock: '0',
        cost: '0'
      });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.unit) {
      toast.error('Please fill in required fields');
      return;
    }

    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
    const outletId = user?.outletId || user?.outlet?.id;

    if (!outletId) {
      toast.error('Outlet ID missing');
      return;
    }

    try {
      const data = {
        name: form.name,
        unit: form.unit,
        stock: parseFloat(form.stock || '0'),
        minStock: parseFloat(form.minStock || '0'),
        cost: parseFloat(form.cost || '0'),
        outletId: outletId
      };

      if (editingIngredient) {
        await api.put(`/ingredients/${editingIngredient.id}`, data);
        toast.success('Ingredient updated');
      } else {
        await api.post('/ingredients', data);
        toast.success('Ingredient created');
      }

      setShowForm(false);
      loadIngredients();
    } catch (error) {
      console.error('Error saving ingredient:', error);
      toast.error('Failed to save ingredient');
    }
  };

  const handleDelete = (id: number) => {
    showConfirmation(
      'Delete Ingredient',
      'Are you sure? This might affect recipes.',
      async () => {
        try {
          await api.delete(`/ingredients/${id}`);
          toast.success('Ingredient deleted');
          loadIngredients();
        } catch (error) {
          console.error('Error deleting ingredient:', error);
          toast.error('Failed to delete ingredient');
        }
      }
    );
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-6 h-6" />
            Raw Materials (Bahan Baku)
          </h1>
          <p className="text-gray-600 mt-1">Manage stock for ingredients and raw materials</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Ingredient
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search ingredients..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Unit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">Loading...</td>
                </tr>
              ) : paginatedIngredients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No ingredients found</td>
                </tr>
              ) : (
                paginatedIngredients.map((ing) => (
                  <tr key={ing.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{ing.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ing.stock <= ing.min_stock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {ing.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{ing.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      Rp {ing.cost_per_unit.toLocaleString('id-ID', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleOpenForm(ing)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(ing.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {editingIngredient ? 'Edit Ingredient' : 'Add Ingredient'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.stock}
                    onChange={(e) => handleFormChange('stock', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit *</label>
                  <select
                    value={form.unit}
                    onChange={(e) => handleFormChange('unit', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="kg">kg</option>
                    <option value="gr">gr</option>
                    <option value="l">liter</option>
                    <option value="ml">ml</option>
                    <option value="pcs">pcs</option>
                    <option value="pack">pack</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.minStock}
                    onChange={(e) => handleFormChange('minStock', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cost/Unit</label>
                  <input
                    type="number"
                    value={form.cost}
                    onChange={(e) => handleFormChange('cost', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
