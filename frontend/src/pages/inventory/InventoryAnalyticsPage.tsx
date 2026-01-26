import { useState, useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Calculator, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Star, Target, HelpCircle, Trash2, RefreshCw, DollarSign, PieChart,
  BarChart3, Zap, Package
} from 'lucide-react';

interface RecipeCostItem {
  itemId: number;
  itemName: string;
  category: string;
  sellingPrice: number;
  ingredientCost: number;
  foodCostPercent: number;
  grossProfit: number;
  grossMargin: number;
  costHealth: 'good' | 'warning' | 'critical';
  hasRecipe: boolean;
  ingredientBreakdown: any[];
}

interface VarianceItem {
  ingredientId: number;
  ingredientName: string;
  unit: string;
  theoreticalUsage: number;
  actualUsage: number;
  variance: number;
  variancePercent: number;
  varianceHealth: 'good' | 'warning' | 'critical';
  possibleCause: string;
}

interface MenuEngineeringItem {
  itemId: number;
  itemName: string;
  category: string;
  sellingPrice: number;
  foodCost: number;
  grossProfit: number;
  profitMargin: number;
  quantitySold: number;
  revenue: number;
  totalProfit: number;
  classification: 'star' | 'plowhorse' | 'puzzle' | 'dog' | 'new';
  recommendation: string;
}

export default function InventoryAnalyticsPage() {
  const { isDark } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'recipe' | 'variance' | 'engineering'>('recipe');
  const [loading, setLoading] = useState(false);

  // Recipe Costs state
  const [recipeCosts, setRecipeCosts] = useState<RecipeCostItem[]>([]);
  const [recipeSummary, setRecipeSummary] = useState<any>(null);

  // Variance state
  const [varianceData, setVarianceData] = useState<VarianceItem[]>([]);
  const [varianceSummary, setVarianceSummary] = useState<any>(null);

  // Menu Engineering state
  const [menuItems, setMenuItems] = useState<MenuEngineeringItem[]>([]);
  const [menuSummary, setMenuSummary] = useState<any>(null);

  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchRecipeCosts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/fnb/inventory-analytics/recipe-costs');
      setRecipeCosts(res.data.data);
      setRecipeSummary(res.data.summary);
    } catch (err) {
      toast.error('Gagal memuat data recipe costs');
    } finally {
      setLoading(false);
    }
  };

  const fetchVariance = async () => {
    setLoading(true);
    try {
      const res = await api.get('/fnb/inventory-analytics/variance', {
        params: { start_date: startDate, end_date: endDate }
      });
      setVarianceData(res.data.data);
      setVarianceSummary(res.data.summary);
    } catch (err) {
      toast.error('Gagal memuat data variance');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuEngineering = async () => {
    setLoading(true);
    try {
      const res = await api.get('/fnb/inventory-analytics/menu-engineering', {
        params: { start_date: startDate, end_date: endDate }
      });
      setMenuItems(res.data.data);
      setMenuSummary(res.data.summary);
    } catch (err) {
      toast.error('Gagal memuat data menu engineering');
    } finally {
      setLoading(false);
    }
  };

  const recalculateAllCosts = async () => {
    try {
      const res = await api.post('/fnb/inventory-analytics/recipe-costs/recalculate-all');
      toast.success(res.data.message);
      fetchRecipeCosts();
    } catch (err) {
      toast.error('Gagal recalculate costs');
    }
  };

  useEffect(() => {
    if (activeTab === 'recipe') fetchRecipeCosts();
    else if (activeTab === 'variance') fetchVariance();
    else if (activeTab === 'engineering') fetchMenuEngineering();
  }, [activeTab]);

  const getHealthBadge = (health: string) => {
    if (health === 'critical') return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Critical</span>;
    if (health === 'warning') return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Warning</span>;
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Good</span>;
  };

  const getClassificationBadge = (classification: string) => {
    const badges: Record<string, { bg: string; icon: any; label: string }> = {
      star: { bg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Star, label: 'Star ⭐' },
      plowhorse: { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Target, label: 'Plowhorse 🐴' },
      puzzle: { bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: HelpCircle, label: 'Puzzle 🧩' },
      dog: { bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: Trash2, label: 'Dog 🐕' },
      new: { bg: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400', icon: Package, label: 'New 🆕' }
    };
    const badge = badges[classification] || badges.new;
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.bg}`}>{badge.label}</span>;
  };

  const formatCurrency = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  return (
    <div className={`p-6 ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-purple-500" />
            Inventory Analytics
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Recipe Costing, Variance Analysis & Menu Engineering
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 mb-6 p-1 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
        {[
          { id: 'recipe', label: 'Recipe Costing', icon: Calculator },
          { id: 'variance', label: 'Actual vs Theoretical', icon: TrendingUp },
          { id: 'engineering', label: 'Menu Engineering', icon: PieChart }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Filter for variance and engineering */}
      {(activeTab === 'variance' || activeTab === 'engineering') && (
        <div className={`flex items-center gap-4 mb-6 p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow`}>
          <div>
            <label className="text-sm text-gray-500">Dari</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className={`ml-2 px-3 py-1.5 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}
            />
          </div>
          <div>
            <label className="text-sm text-gray-500">Sampai</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className={`ml-2 px-3 py-1.5 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}
            />
          </div>
          <button
            onClick={() => activeTab === 'variance' ? fetchVariance() : fetchMenuEngineering()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <>
          {/* Recipe Costing Tab */}
          {activeTab === 'recipe' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              {recipeSummary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow`}>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <Package className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Items</p>
                        <p className="text-2xl font-bold">{recipeSummary.totalItems}</p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow`}>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Calculator className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Avg Food Cost</p>
                        <p className="text-2xl font-bold">{recipeSummary.avgFoodCostPercent}%</p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow`}>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Critical Items</p>
                        <p className="text-2xl font-bold text-red-500">{recipeSummary.criticalItems}</p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow`}>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                        <Zap className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Without Recipe</p>
                        <p className="text-2xl font-bold">{recipeSummary.itemsWithoutRecipe}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recalculate Button */}
              <div className="flex justify-end">
                <button
                  onClick={recalculateAllCosts}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recalculate All Costs
                </button>
              </div>

              {/* Recipe Costs Table */}
              <div className={`rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow overflow-hidden`}>
                <table className="w-full">
                  <thead className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Menu Item</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Selling Price</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Food Cost</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Food Cost %</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Gross Profit</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {recipeCosts.map(item => (
                      <tr key={item.itemId} className={isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3 font-medium">{item.itemName}</td>
                        <td className="px-4 py-3 text-gray-500">{item.category}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.sellingPrice)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.ingredientCost)}</td>
                        <td className="px-4 py-3 text-right font-medium">{item.foodCostPercent}%</td>
                        <td className="px-4 py-3 text-right text-green-600">{formatCurrency(item.grossProfit)}</td>
                        <td className="px-4 py-3 text-center">{getHealthBadge(item.costHealth)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Variance Tab */}
          {activeTab === 'variance' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              {varianceSummary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow`}>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <Package className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Ingredients</p>
                        <p className="text-2xl font-bold">{varianceSummary.totalIngredients}</p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${varianceSummary.overallVariancePercent > 5 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                        {varianceSummary.overallVariancePercent > 0 ? <TrendingUp className="w-6 h-6 text-red-600" /> : <TrendingDown className="w-6 h-6 text-green-600" />}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Overall Variance</p>
                        <p className={`text-2xl font-bold ${varianceSummary.overallVariancePercent > 5 ? 'text-red-500' : 'text-green-500'}`}>
                          {varianceSummary.overallVariancePercent > 0 ? '+' : ''}{varianceSummary.overallVariancePercent}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow`}>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Critical Variances</p>
                        <p className="text-2xl font-bold text-red-500">{varianceSummary.criticalVariances}</p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow`}>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                        <DollarSign className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Potential Waste</p>
                        <p className="text-2xl font-bold">{varianceSummary.potentialWasteValue.toFixed(1)} unit</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Variance Table */}
              <div className={`rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow overflow-hidden`}>
                <table className="w-full">
                  <thead className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Ingredient</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Theoretical</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Actual</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Variance</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Variance %</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Possible Cause</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {varianceData.map(item => (
                      <tr key={item.ingredientId} className={isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3 font-medium">{item.ingredientName}</td>
                        <td className="px-4 py-3 text-right">{item.theoreticalUsage} {item.unit}</td>
                        <td className="px-4 py-3 text-right">{item.actualUsage} {item.unit}</td>
                        <td className={`px-4 py-3 text-right font-medium ${item.variance > 0 ? 'text-red-500' : item.variance < 0 ? 'text-blue-500' : ''}`}>
                          {item.variance > 0 ? '+' : ''}{item.variance} {item.unit}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${Math.abs(item.variancePercent) > 10 ? 'text-red-500' : Math.abs(item.variancePercent) > 5 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {item.variancePercent > 0 ? '+' : ''}{item.variancePercent}%
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-sm">{item.possibleCause}</td>
                        <td className="px-4 py-3 text-center">{getHealthBadge(item.varianceHealth)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Menu Engineering Tab */}
          {activeTab === 'engineering' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              {menuSummary && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow`}>
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                          <Star className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Stars ⭐</p>
                          <p className="text-2xl font-bold text-yellow-500">{menuSummary.counts.stars}</p>
                        </div>
                      </div>
                    </div>
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow`}>
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <Target className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Plowhorses 🐴</p>
                          <p className="text-2xl font-bold text-blue-500">{menuSummary.counts.plowhorses}</p>
                        </div>
                      </div>
                    </div>
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow`}>
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                          <HelpCircle className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Puzzles 🧩</p>
                          <p className="text-2xl font-bold text-purple-500">{menuSummary.counts.puzzles}</p>
                        </div>
                      </div>
                    </div>
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow`}>
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                          <Trash2 className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Dogs 🐕</p>
                          <p className="text-2xl font-bold text-red-500">{menuSummary.counts.dogs}</p>
                        </div>
                      </div>
                    </div>
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow`}>
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                          <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Total Profit</p>
                          <p className="text-xl font-bold text-green-500">{formatCurrency(menuSummary.totalProfit)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Overall Stats */}
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow`}>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-500">Total Revenue</p>
                        <p className="text-lg font-bold">{formatCurrency(menuSummary.totalRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Avg Profit Margin</p>
                        <p className="text-lg font-bold">{menuSummary.avgProfitMargin}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Avg Qty Sold</p>
                        <p className="text-lg font-bold">{menuSummary.avgQuantitySold}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Overall Margin</p>
                        <p className="text-lg font-bold">{menuSummary.overallProfitMargin}%</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Menu Engineering Table */}
              <div className={`rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white'} shadow overflow-hidden`}>
                <table className="w-full">
                  <thead className={isDark ? 'bg-slate-700' : 'bg-gray-50'}>
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Menu Item</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Classification</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Qty Sold</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Revenue</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Food Cost</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Margin</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {menuItems.map(item => (
                      <tr key={item.itemId} className={isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{item.itemName}</p>
                          <p className="text-xs text-gray-500">{item.category}</p>
                        </td>
                        <td className="px-4 py-3 text-center">{getClassificationBadge(item.classification)}</td>
                        <td className="px-4 py-3 text-right">{item.quantitySold}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.revenue)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.foodCost)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${item.profitMargin >= 60 ? 'text-green-500' : item.profitMargin >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {item.profitMargin}%
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={item.recommendation}>
                          {item.recommendation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
