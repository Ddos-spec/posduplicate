import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { FileDown, Printer, Filter, Loader2, TrendingUp, Calendar, Download, ShoppingCart, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { dashboardService } from '../../services/dashboardService';
import api from '../../services/api';
import { exportSalesPDF, exportProductsPDF, exportSalesExcel, exportProductsExcel, exportExpensesExcel, exportExpensesPDF, exportTransactionsExcel, exportTransactionsPDF } from '../../utils/exportUtils';

interface SalesDataPoint {
  date: string;
  sales: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

interface Statistics {
  totalSales: number;
  totalTransactions: number;
  avgPerTransaction: number;
}

interface CashierPerformance {
  cashierId: number;
  cashierName: string;
  totalTransactions: number;
  totalSales: number;
  avgTransactionValue: number;
}

// Types from SalesAnalyticsPage
interface SalesTransaction {
  id: number;
  outlet: string;
  receiptNumber: string;
  date: string;
  time: string;
  category: string;
  brand: string;
  itemName: string;
  variant: string | null;
  sku: string | null;
  quantity: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  tax: number;
  gratuity: number;
  salesType: string;
  paymentMethod: string;
  servedBy: string;
  collectedBy: string;
}

interface TrendData {
  date: string;
  netSales: number;
  netSalesFormatted: string;
}

interface AnalyticsSummary {
  totalTransactions: number;
  totalQuantity: number;
  totalGrossSales: number;
  totalDiscounts: number;
  totalRefunds: number;
  totalNetSales: number;
  totalTax: number;
  totalGratuity: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportsPage() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as 'sales' | 'products' | 'cashier' | 'transactions' | 'expenses' | null;
  const [activeTab, setActiveTab] = useState<'sales' | 'products' | 'cashier' | 'transactions' | 'expenses'>(tabFromUrl || 'sales');
  const [loading, setLoading] = useState(true);
  
  // General Report State
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [stats, setStats] = useState<Statistics>({
    totalSales: 0,
    totalTransactions: 0,
    avgPerTransaction: 0
  });
  const [cashierPerformance, setCashierPerformance] = useState<CashierPerformance[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Analytics/Transactions State
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    // Set default date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    setDateRange({
      startDate: startStr,
      endDate: endStr
    });

    fetchReportData(startStr, endStr);
  }, []);

  // Fetch data when tab changes to 'transactions'
  useEffect(() => {
    if (activeTab === 'transactions') {
      loadAnalyticsData();
    }
  }, [activeTab, dateRange, categoryFilter]);

  const fetchReportData = async (start = dateRange.startDate, end = dateRange.endDate) => {
    try {
      setLoading(true);

      const [summary, salesTrend, products, categories, cashiers] = await Promise.all([
        dashboardService.getSummary({ startDate: start, endDate: end }),
        dashboardService.getSalesTrend({ startDate: start, endDate: end }),
        dashboardService.getTopProducts({ limit: 10 }),
        dashboardService.getSalesByCategory(),
        dashboardService.getCashierPerformance({ days: 30 })
      ]);

      setStats({
        totalSales: summary.totalSales,
        totalTransactions: summary.totalTransactions,
        avgPerTransaction: summary.averageTransaction
      });

      setSalesData(salesTrend.map((item: { date: string; sales: number }) => ({
        date: new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }),
        sales: item.sales
      })));

      setTopProducts(products);

      setCategoryData((categories as any[]).map((item, index) => ({
        name: item.name,
        value: item.totalSales,
        color: COLORS[index % COLORS.length]
      })));

      setCashierPerformance(cashiers);
    } catch (error: unknown) {
      console.error('Error fetching report data:', error);
      let errorMessage = 'Failed to load report data';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
      const outletId = user?.outletId || user?.outlet?.id;

      const params: any = {};
      if (outletId) params.outlet_id = outletId;
      if (dateRange.startDate) params.date_from = dateRange.startDate;
      if (dateRange.endDate) params.date_to = dateRange.endDate;
      if (categoryFilter) params.category = categoryFilter;

      // Load transactions from actual POS transactions
      const txResponse = await api.get('/dashboard/transaction-analytics', {
        params: { ...params, limit: 100 }
      });
      setTransactions(txResponse.data.data || []);

      // Load trend data from actual POS transactions
      const trendResponse = await api.get('/dashboard/transaction-analytics/trend', { params });
      setTrendData(trendResponse.data.data || []);

      // Load summary from actual POS transactions
      const summaryResponse = await api.get('/dashboard/transaction-analytics/summary', { params });
      setSummary(summaryResponse.data.data || null);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Gagal memuat data analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange, categoryFilter]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000000) return `Rp ${(num / 1000000000).toFixed(1)}m`;
    if (num >= 1000000) return `Rp ${(num / 1000000).toFixed(1)}jt`;
    if (num >= 1000) return `Rp ${(num / 1000).toFixed(1)}rb`;
    return formatCurrency(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleApplyFilter = () => {
    if (activeTab === 'transactions') {
      loadAnalyticsData();
    } else {
      fetchReportData();
    }
  };

  // Helper for analytics chart
  const renderColorfulLine = () => {
    if (trendData.length < 2) return null;
    const segments: any[] = [];
    for (let i = 0; i < trendData.length - 1; i++) {
      const current = trendData[i];
      const next = trendData[i + 1];
      const isUp = next.netSales >= current.netSales;
      const color = isUp ? '#22c55e' : '#ef4444';
      segments.push(
        <Line
          key={`segment-${i}`}
          type="monotone"
          dataKey="netSales"
          data={[current, next]}
          stroke={color}
          strokeWidth={3}
          dot={{ fill: color, r: 4, strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 6 }}
          connectNulls
        />
      );
    }
    return segments;
  };

  // Get unique categories for filter
  const txCategories = Array.from(new Set(transactions.map(t => t.category))).filter(Boolean);
  
  // Pagination
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(transactions.length / itemsPerPage);

  if (loading && !salesData.length && !transactions.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading data...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-gray-600">Business performance insights and transaction details</p>
        </div>
        <div className="flex gap-2">
          {activeTab !== 'transactions' && (
             <>
              <button
                onClick={() => {
                  if (activeTab === 'sales') exportSalesPDF(salesData, stats);
                  else if (activeTab === 'products') exportProductsPDF(topProducts);
                  toast.success('Exported to PDF!');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={() => {
                  if (activeTab === 'sales') exportSalesExcel(salesData, stats, topProducts, categoryData);
                  else if (activeTab === 'products') exportProductsExcel(topProducts);
                  toast.success('Exported to Excel!');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Export Excel
              </button>
             </>
          )}
          <button
            onClick={() => window.print()}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {activeTab === 'transactions' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {txCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleApplyFilter}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Apply Filter
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {['sales', 'products', 'cashier', 'transactions', 'expenses'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 font-medium border-b-2 transition whitespace-nowrap ${
                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              {tab === 'transactions' ? 'Detailed Transactions' :
               tab === 'products' ? 'Product Analytics' :
               tab === 'expenses' ? 'Tracking Pengeluaran' :
               tab.charAt(0).toUpperCase() + tab.slice(1) + ' Report'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-3xl font-bold text-gray-800">{formatNumber(stats.totalSales)}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-3xl font-bold text-green-600">{stats.totalTransactions.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Avg/Transaction</p>
              <p className="text-3xl font-bold text-purple-600">{formatNumber(stats.avgPerTransaction)}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold mb-4">Sales Trend (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(v) => `Rp ${v / 1000000}jt`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Top Products Table */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold mb-4">Top Products</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Product</th>
                    <th className="px-4 py-2 text-right">Sold</th>
                    <th className="px-4 py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-3">{p.name}</td>
                      <td className="px-4 py-3 text-right">{p.qty}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sales by Category */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold mb-4">Sales by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData as any[]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'cashier' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Cashier Performance</h3>
          <div className="overflow-x-auto">
            {cashierPerformance.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No cashier data available</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cashier</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Transactions</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Sales</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg/Transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cashierPerformance.map((cashier) => (
                    <tr key={cashier.cashierId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{cashier.cashierName}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{cashier.totalTransactions}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                        {formatCurrency(cashier.totalSales)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {formatCurrency(cashier.avgTransactionValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Analytics Summary */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Transaksi</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summary.totalTransactions.toLocaleString()}
                    </p>
                  </div>
                  <ShoppingCart className="w-10 h-10 text-blue-500 opacity-50" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Gross Sales</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(summary.totalGrossSales)}
                    </p>
                  </div>
                  <DollarSign className="w-10 h-10 text-green-500 opacity-50" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Net Sales</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(summary.totalNetSales)}
                    </p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-500 opacity-50" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Quantity</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {summary.totalQuantity.toLocaleString()}
                    </p>
                  </div>
                  <ShoppingCart className="w-10 h-10 text-purple-500 opacity-50" />
                </div>
              </div>
            </div>
          )}

          {/* Trend Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Net Sales Trend</h2>
            {loading ? (
              <div className="h-80 flex items-center justify-center text-gray-500">Loading...</div>
            ) : trendData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-500">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (value.includes(':')) return value; // Time format HH:00
                      const d = new Date(value);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                      return value.toString();
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    labelFormatter={(label) => {
                      if (label.includes(':')) return `Time: ${label}`;
                      return formatDate(label);
                    }}
                    formatter={(value: any) => [formatCurrency(value), 'Net Sales']}
                  />
                  {renderColorfulLine()}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Detail Transaksi</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    exportTransactionsPDF(transactions);
                    toast.success('Exported to PDF!');
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Export PDF
                </button>
                <button
                  onClick={() => {
                    exportTransactionsExcel(transactions);
                    toast.success('Exported to Excel!');
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Export Excel
                </button>
              </div>
            </div>

            {loading && transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Loading transactions...</div>
            ) : paginatedTransactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Tidak ada data transaksi</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items Summary</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashier</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedTransactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-xs">
                              <div className="font-medium text-gray-900">{formatDate(tx.date)}</div>
                              <div className="text-gray-500">{tx.time}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs font-mono text-gray-700">{tx.receiptNumber}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-600 max-w-xs truncate" title={tx.itemsSummary}>
                              {tx.itemsSummary}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className="text-xs font-bold text-green-600">{formatCurrency(tx.amount)}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                tx.paymentMethod === 'qris' ? 'bg-blue-100 text-blue-800' : 
                                tx.paymentMethod === 'cash' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {tx.paymentMethod.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs text-gray-700">{tx.servedBy}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, transactions.length)} of {transactions.length}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <ExpenseTrackingTab />
      )}
    </div>
  );
}

// Expense Tracking Component
function ExpenseTrackingTab() {
  const [movements, setMovements] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadMovements = async () => {
    try {
      setLoading(true);
      const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
      const outletId = user?.outletId || user?.outlets?.id;
      const params: any = {};
      if (outletId) params.outlet_id = outletId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (typeFilter) params.type = typeFilter;

      const response = await api.get('/stock-movements', { params });
      setMovements(response.data.data || []);
    } catch (error) {
      console.error('Failed to load stock movements:', error);
      toast.error('Gagal memuat data pergerakan stok');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
      const outletId = user?.outletId || user?.outlets?.id;
      const params: any = {};
      if (outletId) params.outlet_id = outletId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await api.get('/stock-movements/summary', { params });
      setSummary(response.data.data);
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  useEffect(() => {
    loadMovements();
    loadSummary();
  }, [dateFrom, dateTo, typeFilter]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'IN': return 'bg-green-100 text-green-800';
      case 'OUT': return 'bg-red-100 text-red-800';
      case 'ADJUST': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary.totalExpense || 0)}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Stok Masuk</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.stockIn?.totalCost || 0)}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Transaksi</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(summary.stockIn?.count || 0) + (summary.stockOut?.count || 0)}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipe
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Semua</option>
              <option value="IN">Stok Masuk</option>
              <option value="OUT">Stok Keluar</option>
              <option value="ADJUST">Penyesuaian</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setTypeFilter('');
              }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Riwayat Pergerakan Stok</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                exportExpensesPDF(movements, summary);
                toast.success('Exported to PDF!');
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <FileDown className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={() => {
                exportExpensesExcel(movements, summary);
                toast.success('Exported to Excel!');
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <FileDown className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Tidak ada data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipe
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga/Unit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Biaya
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.map((movement: any) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(movement.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {movement.ingredient?.name || movement.inventory?.name}
                      <span className="text-gray-500 ml-1">
                        ({movement.ingredient?.unit || movement.inventory?.unit})
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(movement.type)}`}>
                        {movement.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {movement.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(movement.unitPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatCurrency(movement.totalCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {movement.supplier || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {movement.user?.name || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
