import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
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
import { TrendingUp, Users, Building2, DollarSign, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { adminAnalyticsService } from '../../services/adminAnalyticsService';
import type { TenantGrowthData, RevenueData, TenantStatusData, TopTenant } from '../../services/adminAnalyticsService';

export default function SystemAnalyticsPage() {
  const [dateRange, setDateRange] = useState('month');
  const [loading, setLoading] = useState(true);

  // State for API data
  const [tenantGrowthData, setTenantGrowthData] = useState<TenantGrowthData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [tenantStatusData, setTenantStatusData] = useState<TenantStatusData[]>([]);
  const [topTenants, setTopTenants] = useState<TopTenant[]>([]);
  const [summary, setSummary] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalTransactions: 0,
    totalRevenue: 0
  });

  // Fetch all analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const months = dateRange === 'month' ? 11 : dateRange === 'quarter' ? 3 : 12;

        const [growth, revenue, status, tenants, summaryData] = await Promise.all([
          adminAnalyticsService.getTenantGrowth(months),
          adminAnalyticsService.getRevenue(months),
          adminAnalyticsService.getTenantStatus(),
          adminAnalyticsService.getTopTenants(10),
          adminAnalyticsService.getSummary()
        ]);

        setTenantGrowthData(growth.data);
        setRevenueData(revenue.data);
        setTenantStatusData(status.data);
        setTopTenants(tenants.data);
        setSummary(summaryData.data);
      } catch (error: unknown) {
        console.error('Error fetching analytics:', error);
        let errorMessage = 'Failed to load analytics data';
        if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
          errorMessage = error.response.data.error.message;
        }
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [dateRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}jt`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981'; // green
      case 'trial': return '#f59e0b'; // yellow
      case 'expired': return '#ef4444'; // red
      case 'pending': return '#3b82f6'; // blue
      default: return '#6b7280'; // gray
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">System Analytics</h1>
          <p className="text-gray-600">Monitor overall system performance</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="month">Last 12 Months</option>
          <option value="quarter">Last Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Tenants</p>
          <p className="text-2xl font-bold text-gray-800">{summary.totalTenants}</p>
          <p className="text-xs text-green-600 mt-2">
            {summary.activeTenants} active
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Active Subscriptions</p>
          <p className="text-2xl font-bold text-gray-800">{summary.activeTenants}</p>
          <p className="text-xs text-gray-500 mt-2">
            {Math.round((summary.activeTenants / summary.totalTenants) * 100)}% of total
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-800">{formatNumber(summary.totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-2">All time</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
          <p className="text-2xl font-bold text-gray-800">{formatNumber(summary.totalTransactions)}</p>
          <p className="text-xs text-gray-500 mt-2">Across all tenants</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Tenant Growth Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Tenant Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={tenantGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="tenants" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">System Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenant Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Tenant Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                          <Pie
                            data={tenantStatusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.name}: ${entry.value}`}
                            outerRadius={80}
                            dataKey="value"
                          >                {tenantStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Tenants */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Top Performing Tenants</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topTenants.map((tenant) => (
                  <tr key={tenant.rank} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      #{tenant.rank}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{tenant.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatNumber(tenant.transactions)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">
                      {formatCurrency(tenant.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topTenants.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
