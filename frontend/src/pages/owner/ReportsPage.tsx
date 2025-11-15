import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileDown, Printer, Filter, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { dashboardService } from '../../services/dashboardService';
import { exportSalesPDF, exportProductsPDF, exportSalesExcel, exportProductsExcel } from '../../utils/exportUtils';

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'products' | 'category' | 'cashier'>('sales');
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [stats, setStats] = useState<Statistics>({
    totalSales: 0,
    totalTransactions: 0,
    avgPerTransaction: 0
  });
  const [cashierPerformance, setCashierPerformance] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    // Set default date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });

    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [statisticsRes, salesRes, productsRes, categoryRes, cashierRes] = await Promise.all([
        dashboardService.getStatistics(),
        dashboardService.getSalesData(7),
        dashboardService.getTopProducts(10),
        dashboardService.getCategoryDistribution(),
        dashboardService.getCashierPerformance(30)
      ]);

      // Set statistics
      const statistics = statisticsRes.data;
      setStats({
        totalSales: statistics.totalSales,
        totalTransactions: statistics.totalTransactions,
        avgPerTransaction: statistics.totalTransactions > 0
          ? statistics.totalSales / statistics.totalTransactions
          : 0
      });

      // Set sales data
      setSalesData(salesRes.data.map(item => ({
        date: new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }),
        sales: item.total
      })));

      // Set top products
      setTopProducts(productsRes.data.map(item => ({
        name: item.name,
        qty: item.totalSold,
        revenue: item.totalRevenue
      })));

      // Set category data with colors
      setCategoryData(categoryRes.data.map((item, index) => ({
        name: item.category,
        value: item.totalSales,
        color: COLORS[index % COLORS.length]
      })));

      // Set cashier performance
      setCashierPerformance(cashierRes.data);
    } catch (error: any) {
      console.error('Error fetching report data:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `Rp ${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `Rp ${(num / 1000).toFixed(1)}K`;
    return formatCurrency(num);
  };

  const handleApplyFilter = () => {
    fetchReportData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading reports...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-gray-600">Business performance insights</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (activeTab === 'sales') {
                exportSalesPDF(salesData, stats);
                toast.success('Sales report exported to PDF!');
              } else if (activeTab === 'products') {
                exportProductsPDF(topProducts);
                toast.success('Products report exported to PDF!');
              }
            }}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={() => {
              if (activeTab === 'sales') {
                exportSalesExcel(salesData, stats, topProducts, categoryData);
                toast.success('Complete report exported to Excel!');
              } else if (activeTab === 'products') {
                exportProductsExcel(topProducts);
                toast.success('Products report exported to Excel!');
              }
            }}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={() => {
              window.print();
              toast.success('Print dialog opened!');
            }}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleApplyFilter}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply Filter
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-4">
          {['sales', 'products', 'category', 'cashier'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 font-medium border-b-2 transition ${
                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} Report
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
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
            <h3 className="font-semibold mb-4">Sales Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(v) => `Rp ${v / 1000000}M`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="sales" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Top Products</h3>
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
      )}

      {activeTab === 'category' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
      )}

      {activeTab === 'cashier' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Cashier Performance (Last 30 Days)</h3>
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
                {cashierPerformance.map((cashier, index) => (
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
      )}
    </div>
  );
}
