import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Ingredient {
  id: number;
  name: string;
  unit: string;
  cost_per_unit: number;
}

interface RecipeItem {
  id?: number;
  ingredient_id: number;
  ingredientName?: string;
  quantity: number;
  unit: string;
}

interface RecipeModalProps {
  product: { id: number; name: string };
  onClose: () => void;
}

export default function RecipeModal({ product, onClose }: RecipeModalProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state for new item
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Fetch available ingredients
        const ingResponse = await api.get('/ingredients');
        setIngredients(ingResponse.data.data);

        // Fetch existing recipe for product
        const recipeResponse = await api.get(`/recipes/product/${product.id}`);

        const formattedRecipe = recipeResponse.data.data.map((item: any) => ({
          id: item.id,
          ingredient_id: item.ingredient_id,
          ingredientName: item.ingredients?.name,
          quantity: parseFloat(item.quantity),
          unit: item.unit || item.ingredients?.unit // Use recipe unit or fallback to ingredient unit
        }));

        setRecipeItems(formattedRecipe);
      } catch (error) {
        console.error('Error loading recipe data:', error);
        toast.error('Failed to load recipe data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [product.id]);

  const handleAddItem = () => {
    if (!selectedIngredientId || !quantity) {
      toast.error('Please select ingredient and quantity');
      return;
    }

    const ingredient = ingredients.find(i => i.id === parseInt(selectedIngredientId));
    if (!ingredient) return;

    // Check if already exists
    if (recipeItems.some(item => item.ingredient_id === ingredient.id)) {
      toast.error('Ingredient already in recipe');
      return;
    }

    const newItem: RecipeItem = {
      ingredient_id: ingredient.id,
      ingredientName: ingredient.name,
      quantity: parseFloat(quantity),
      unit: ingredient.unit
    };

    setRecipeItems([...recipeItems, newItem]);
    setSelectedIngredientId('');
    setQuantity('');
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...recipeItems];
    newItems.splice(index, 1);
    setRecipeItems(newItems);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Transform to expected format
      const payload = {
        ingredients: recipeItems.map(item => ({
          ingredientId: item.ingredient_id,
          quantity: item.quantity,
          unit: item.unit
        }))
      };

      await api.post(`/recipes/product/${product.id}`, payload);
      toast.success('Recipe saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast.error('Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold">Recipe for {product.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-6">
              {/* Add Item Form */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="font-medium mb-3">Add Ingredient</h4>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-sm text-gray-600 mb-1">Ingredient</label>
                    <select
                      value={selectedIngredientId}
                      onChange={(e) => setSelectedIngredientId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">Select Ingredient</option>
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                    <input
                      type="number"
                      step="0.001"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    onClick={handleAddItem}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              {/* Recipe List */}
              <div>
                <h4 className="font-medium mb-3">Current Recipe</h4>
                {recipeItems.length === 0 ? (
                  <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border border-dashed">
                    No ingredients added yet.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingredient</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recipeItems.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.ingredientName}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{item.unit}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleRemoveItem(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </div>
  );
}
