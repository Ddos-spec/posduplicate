import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Store,
  Settings,
  BarChart3,
  Loader2
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import type { DashboardSummary, SalesTrendData, TopProduct, CategorySales, RecentTransaction } from '../../services/dashboardService';
import toast from 'react-hot-toast';
import axios from 'axios';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6b7280', '#8b5cf6'];

export default function OwnerDashboardPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('week');
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // State for API data
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const days = dateRange === 'today' ? 1 : dateRange === 'week' ? 7 : 30;
        const outletId = selectedOutlet === 'all' ? undefined : Number(selectedOutlet);

        const [summaryData, trendData, productsData, categoryData, transactionsData] = await Promise.all([
          dashboardService.getSummary({ outletId }),
          dashboardService.getSalesTrend({ days, outletId }),
          dashboardService.getTopProducts({ limit: 5 }),
          dashboardService.getSalesByCategory(),
          dashboardService.getRecentTransactions({ limit: 5 })
        ]);

        setSummary(summaryData);
        setSalesTrend(trendData);
        setTopProducts(productsData);
        setCategorySales(categoryData);
        setRecentTransactions(transactionsData);
      } catch (error: unknown) {
        console.error('Error fetching dashboard data:', error);
        let errorMessage = 'Failed to load dashboard data';
        if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
          errorMessage = error.response.data.error.message;
        }
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateRange, selectedOutlet]);

  const formatCurrency = (value: number) => {
    // Format number with dot as thousand separator (Indonesian format)
    const formatted = Math.floor(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Rp ${formatted}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1).replace('.', ',')}m`; // miliar
    if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.', ',')}jt`; // juta
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace('.', ',')}rb`; // ribu
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Dashboard Overview
            </h1>
            <p className="text-gray-600">Welcome back! Here's your business summary</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Outlets</option>
              <option value="1">Main Store</option>
              <option value="2">Branch Kemang</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <p className="text-blue-100 text-sm mb-1">Total Sales</p>
          <p className="text-3xl font-bold">{formatCurrency(summary?.totalSales || 0)}</p>
          <p className="text-xs text-blue-100 mt-2">
            Avg: {formatCurrency(summary?.averageTransaction || 0)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
          <p className="text-green-100 text-sm mb-1">Total Transactions</p>
          <p className="text-3xl font-bold">{summary?.totalTransactions || 0}</p>
          <p className="text-xs text-green-100 mt-2">Completed transactions</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <p className="text-purple-100 text-sm mb-1">Total Products</p>
          <p className="text-3xl font-bold">{summary?.totalProducts || 0}</p>
          <p className="text-xs text-purple-100 mt-2">Active products</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <p className="text-orange-100 text-sm mb-1">Total Customers</p>
          <p className="text-3xl font-bold">{summary?.totalCustomers || 0}</p>
          <p className="text-xs text-orange-100 mt-2">Registered customers</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales Trend</h3>
          {salesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} />
                <YAxis tickFormatter={(value) => `Rp ${formatNumber(value)}`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Sales"
                  dot={{ fill: '#3b82f6', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No sales data available
            </div>
          )}
        </div>

        {/* Sales by Category */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales by Category</h3>
          {categorySales.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categorySales}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categorySales.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No category data available
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Products</h3>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts.map(p => ({ name: p.name, price: Number(p.price) }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `Rp ${formatNumber(value)}`} />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="price" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No product data available
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((trx) => (
                <div key={trx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{trx.transactionNumber}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(trx.createdAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(Number(trx.total))}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      trx.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {trx.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                No recent transactions
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/cashier')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition flex flex-col items-center gap-2"
          >
            <Store className="w-8 h-8 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Go to POS</span>
          </button>
          <button
            onClick={() => navigate('/owner/products')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition flex flex-col items-center gap-2"
          >
            <Package className="w-8 h-8 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Manage Stok</span>
          </button>
          <button
            onClick={() => navigate('/owner/reports')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition flex flex-col items-center gap-2"
          >
            <BarChart3 className="w-8 h-8 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">View Reports</span>
          </button>
          <button
            onClick={() => navigate('/owner/settings')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition flex flex-col items-center gap-2"
          >
            <Settings className="w-8 h-8 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
