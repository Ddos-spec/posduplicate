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
import { TrendingUp, Users, Building2, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';

// Mock data for tenant growth
const tenantGrowthData = [
  { month: 'Jan', tenants: 5 },
  { month: 'Feb', tenants: 8 },
  { month: 'Mar', tenants: 12 },
  { month: 'Apr', tenants: 15 },
  { month: 'May', tenants: 18 },
  { month: 'Jun', tenants: 22 },
  { month: 'Jul', tenants: 28 },
  { month: 'Aug', tenants: 32 },
  { month: 'Sep', tenants: 35 },
  { month: 'Oct', tenants: 38 },
  { month: 'Nov', tenants: 42 },
];

// Mock data for revenue
const revenueData = [
  { month: 'Jan', revenue: 15000000 },
  { month: 'Feb', revenue: 18000000 },
  { month: 'Mar', revenue: 22000000 },
  { month: 'Apr', revenue: 25000000 },
  { month: 'May', revenue: 28000000 },
  { month: 'Jun', revenue: 32000000 },
  { month: 'Jul', revenue: 35000000 },
  { month: 'Aug', revenue: 38000000 },
  { month: 'Sep', revenue: 42000000 },
  { month: 'Oct', revenue: 45000000 },
  { month: 'Nov', revenue: 48000000 },
];

// Mock data for tenant status
const tenantStatusData = [
  { name: 'Active', value: 35, color: '#10b981' },
  { name: 'Trial', value: 5, color: '#f59e0b' },
  { name: 'Inactive', value: 2, color: '#ef4444' }
];

// Mock data for top tenants
const topTenants = [
  { rank: 1, name: 'Kebuli Utsman', transactions: 2450, revenue: 12500000 },
  { rank: 2, name: 'Toko Elektronik Jaya', transactions: 1820, revenue: 9800000 },
  { rank: 3, name: 'Cafe Kopi Nikmat', transactions: 1650, revenue: 8200000 },
  { rank: 4, name: 'Minimarket Sinar Jaya', transactions: 1430, revenue: 7100000 },
  { rank: 5, name: 'Barbershop Maju Jaya', transactions: 980, revenue: 4900000 },
  { rank: 6, name: 'Warung Sate Pak Eko', transactions: 850, revenue: 4200000 },
  { rank: 7, name: 'Bakery Roti Enak', transactions: 720, revenue: 3600000 },
  { rank: 8, name: 'Pet Shop Hewan Lucu', transactions: 650, revenue: 3200000 },
  { rank: 9, name: 'Warung Makan Sederhana', transactions: 580, revenue: 2900000 },
  { rank: 10, name: 'Laundry Express', transactions: 420, revenue: 2100000 },
];

export default function SystemAnalyticsPage() {
  const [dateRange, setDateRange] = useState('month');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">System Analytics</h1>
            <p className="text-gray-600">System-wide performance and metrics</p>
          </div>
          <div className="mt-4 md:mt-0">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last 12 Months</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <ArrowUp className="w-4 h-4" />
              <span>12%</span>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Total Tenants</p>
          <p className="text-3xl font-bold text-gray-800">42</p>
          <p className="text-xs text-gray-500 mt-2">+5 from last month</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <ArrowUp className="w-4 h-4" />
              <span>8%</span>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Total Users</p>
          <p className="text-3xl font-bold text-gray-800">348</p>
          <p className="text-xs text-gray-500 mt-2">Across all tenants</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <ArrowUp className="w-4 h-4" />
              <span>15%</span>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Total Transactions</p>
          <p className="text-3xl font-bold text-gray-800">12,550</p>
          <p className="text-xs text-gray-500 mt-2">This month</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <ArrowUp className="w-4 h-4" />
              <span>18%</span>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-800">Rp 48M</p>
          <p className="text-xs text-gray-500 mt-2">Subscription revenue</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Tenant Growth Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Tenant Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={tenantGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="tenants"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Total Tenants"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `Rp ${value / 1000000}M`} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenant Status Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Tenant Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={tenantStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) =>
                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {tenantStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Performing Tenants */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 10 Performing Tenants</h3>
          <div className="overflow-y-auto max-h-[300px]">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tenant</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Transactions</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topTenants.map((tenant) => (
                  <tr key={tenant.rank} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{tenant.rank}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{tenant.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {formatNumber(tenant.transactions)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">
                      {formatCurrency(tenant.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
