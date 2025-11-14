import { useState } from 'react';
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
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Eye,
  Store,
  Settings,
  BarChart3
} from 'lucide-react';

// Mock data for sales trend
const salesTrendData = [
  { date: '2025-11-01', sales: 2500000 },
  { date: '2025-11-02', sales: 3200000 },
  { date: '2025-11-03', sales: 2800000 },
  { date: '2025-11-04', sales: 3500000 },
  { date: '2025-11-05', sales: 4200000 },
  { date: '2025-11-06', sales: 3800000 },
  { date: '2025-11-07', sales: 4500000 },
];

// Mock data for sales by category
const salesByCategoryData = [
  { name: 'Makanan', value: 15500000, color: '#3b82f6' },
  { name: 'Minuman', value: 8200000, color: '#10b981' },
  { name: 'Snack', value: 4300000, color: '#f59e0b' },
  { name: 'Lainnya', value: 2000000, color: '#6b7280' }
];

// Mock data for top products
const topProductsData = [
  { name: 'Nasi Kebuli', sales: 4500000 },
  { name: 'Kopi Latte', sales: 3200000 },
  { name: 'Ayam Bakar', sales: 2800000 },
  { name: 'Es Teh Manis', sales: 1900000 },
  { name: 'Nasi Goreng', sales: 1500000 }
];

// Mock data for recent transactions
const recentTransactions = [
  { id: 'TRX-001', date: '2025-11-14 10:30', total: 125000, status: 'Completed' },
  { id: 'TRX-002', date: '2025-11-14 10:25', total: 85000, status: 'Completed' },
  { id: 'TRX-003', date: '2025-11-14 10:20', total: 150000, status: 'Completed' },
  { id: 'TRX-004', date: '2025-11-14 10:15', total: 95000, status: 'Completed' },
  { id: 'TRX-005', date: '2025-11-14 10:10', total: 200000, status: 'Completed' },
];

export default function OwnerDashboardPage() {
  const [dateRange, setDateRange] = useState('week');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

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
              <option value="custom">Custom Range</option>
            </select>
            <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="1">Main Store</option>
              <option value="2">Branch Kemang</option>
              <option value="all">All Outlets</option>
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
            <div className="flex items-center gap-1 text-sm">
              <ArrowUp className="w-4 h-4" />
              <span>18%</span>
            </div>
          </div>
          <p className="text-blue-100 text-sm mb-1">Total Sales</p>
          <p className="text-3xl font-bold">Rp 30M</p>
          <p className="text-xs text-blue-100 mt-2">+Rp 4.5M from last week</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <ArrowUp className="w-4 h-4" />
              <span>12%</span>
            </div>
          </div>
          <p className="text-green-100 text-sm mb-1">Total Transactions</p>
          <p className="text-3xl font-bold">1,245</p>
          <p className="text-xs text-green-100 mt-2">+134 from last week</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <ArrowUp className="w-4 h-4" />
              <span>5%</span>
            </div>
          </div>
          <p className="text-purple-100 text-sm mb-1">Total Products</p>
          <p className="text-3xl font-bold">156</p>
          <p className="text-xs text-purple-100 mt-2">+8 new products</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <ArrowUp className="w-4 h-4" />
              <span>8%</span>
            </div>
          </div>
          <p className="text-orange-100 text-sm mb-1">Total Customers</p>
          <p className="text-3xl font-bold">842</p>
          <p className="text-xs text-orange-100 mt-2">+64 new customers</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(value) => new Date(value).getDate().toString()} />
              <YAxis tickFormatter={(value) => `Rp ${value / 1000000}M`} />
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
        </div>

        {/* Sales by Category */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={salesByCategoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {salesByCategoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProductsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => `Rp ${value / 1000000}M`} />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="sales" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="space-y-3">
            {recentTransactions.map((trx) => (
              <div key={trx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{trx.id}</p>
                  <p className="text-xs text-gray-500">{trx.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(trx.total)}</p>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    {trx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition flex flex-col items-center gap-2">
            <Store className="w-8 h-8 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Go to POS</span>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition flex flex-col items-center gap-2">
            <Package className="w-8 h-8 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Add Product</span>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition flex flex-col items-center gap-2">
            <BarChart3 className="w-8 h-8 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">View Reports</span>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition flex flex-col items-center gap-2">
            <Settings className="w-8 h-8 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
