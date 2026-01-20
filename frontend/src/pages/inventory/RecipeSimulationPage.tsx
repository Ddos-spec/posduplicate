import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { 
  ChefHat, TrendingUp, DollarSign, Scale, ArrowRight, Save, Plus, Trash2, AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function RecipeSimulationPage() {
  const { isDark } = useThemeStore();

  // Mock Data: Satu Produk
  const [product, setProduct] = useState({
    name: 'Nasi Goreng Spesial',
    price: 35000,
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb74b?auto=format&fit=crop&w=500&q=60'
  });

  // Mock Data: Bahan Baku Resep
  const [ingredients, setIngredients] = useState([
    { id: 1, name: 'Beras Yaman Rice', qty: 0.15, unit: 'Kg', cost: 12500 }, // cost per unit
    { id: 2, name: 'Telur Ayam', qty: 1, unit: 'Butir', cost: 2000 },
    { id: 3, name: 'Bumbu Nasi Goreng', qty: 0.02, unit: 'Pack', cost: 25000 },
    { id: 4, name: 'Minyak Goreng', qty: 0.02, unit: 'Liter', cost: 14000 },
    { id: 5, name: 'Kecap Manis', qty: 0.01, unit: 'Botol', cost: 22000 },
  ]);

  // Kalkulasi Real-time
  const totalCost = ingredients.reduce((sum, item) => sum + (item.qty * item.cost), 0);
  const profit = product.price - totalCost;
  const margin = (profit / product.price) * 100;

  const handleQtyChange = (id: number, newQty: number) => {
    setIngredients(prev => prev.map(item => item.id === id ? { ...item, qty: newQty } : item));
  };

  const handleSave = () => {
    toast.success('Resep berhasil disimpan! HPP otomatis terupdate.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <ChefHat className="text-orange-500" /> Simulasi Resep & HPP
          </h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Atur takaran bahan baku untuk mengoptimalkan profit margin.
          </p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 transition-all"
        >
          <Save size={18} /> Simpan Resep
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Produk Info & Calculator */}
        <div className="space-y-6">
          {/* Product Card */}
          <div className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="h-48 overflow-hidden relative">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-4">
                <h3 className="text-white font-bold text-xl">{product.name}</h3>
              </div>
            </div>
            <div className="p-6">
              <label className={`text-xs font-bold uppercase tracking-wider mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Harga Jual (Menu)</label>
              <div className={`flex items-center border rounded-xl px-4 py-2 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                <span className="text-gray-500 font-bold mr-2">Rp</span>
                <input 
                  type="number" 
                  value={product.price}
                  onChange={(e) => setProduct({...product, price: Number(e.target.value)})}
                  className={`bg-transparent outline-none font-bold text-lg w-full ${isDark ? 'text-white' : 'text-gray-900'}`}
                />
              </div>
            </div>
          </div>

          {/* Profit Summary Card */}
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <TrendingUp className="text-blue-500" /> Analisis Profit
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Harga Jual</span>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Rp {product.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-red-500">
                <span>Total HPP (Cost)</span>
                <span className="font-medium">- Rp {totalCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
              </div>
              <div className="h-px bg-gray-200 dark:bg-slate-700 my-2"></div>
              <div className="flex justify-between items-center">
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Estimasi Profit</span>
                <span className={`font-bold text-xl ${profit > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  Rp {profit.toLocaleString(undefined, {maximumFractionDigits: 0})}
                </span>
              </div>
            </div>

            {/* Margin Indicator */}
            <div className="mt-6">
              <div className="flex justify-between text-xs mb-1">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Margin (%)</span>
                <span className={`font-bold ${margin >= 50 ? 'text-green-500' : margin >= 30 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {margin.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${margin >= 50 ? 'bg-green-500' : margin >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(margin, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <AlertCircle size={12} /> Target margin FnB ideal: 50-70%
              </p>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Tabel Bahan */}
        <div className={`lg:col-span-2 p-6 rounded-2xl border flex flex-col ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Komposisi Bahan (Recipe)</h3>
            <button className="text-sm font-medium text-blue-500 hover:text-blue-600 flex items-center gap-1">
              <Plus size={16} /> Tambah Bahan
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className={`border-b text-sm ${isDark ? 'border-slate-700 text-gray-400' : 'border-gray-100 text-gray-500'}`}>
                  <th className="pb-3 pl-2">Nama Bahan</th>
                  <th className="pb-3 text-right">Harga Beli</th>
                  <th className="pb-3 text-center">Takaran (Qty)</th>
                  <th className="pb-3 text-right">Cost / Porsi</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {ingredients.map((item) => (
                  <tr key={item.id} className="group">
                    <td className="py-3 pl-2">
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>{item.name}</p>
                      <p className="text-xs text-gray-400">per {item.unit}</p>
                    </td>
                    <td className={`py-3 text-right text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Rp {item.cost.toLocaleString()}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleQtyChange(item.id, Math.max(0, item.qty - 0.01))}
                          className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200"
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          value={item.qty}
                          onChange={(e) => handleQtyChange(item.id, parseFloat(e.target.value))}
                          className={`w-16 text-center text-sm font-bold bg-transparent outline-none border-b border-dashed ${isDark ? 'border-gray-600 text-white' : 'border-gray-300 text-gray-900'}`}
                          step="0.01"
                        />
                        <button 
                          onClick={() => handleQtyChange(item.id, item.qty + 0.01)}
                          className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className={`py-3 text-right font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Rp {(item.qty * item.cost).toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </td>
                    <td className="py-3 text-right pr-2">
                      <button className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                  <td colSpan={3} className={`pt-4 text-right font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Total HPP:</td>
                  <td className={`pt-4 text-right font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Rp {totalCost.toLocaleString(undefined, {maximumFractionDigits: 0})}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
