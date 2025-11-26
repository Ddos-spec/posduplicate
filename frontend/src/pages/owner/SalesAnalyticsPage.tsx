import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

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

export default function SalesAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null;
      const outletId = user?.outletId || user?.outlet?.id;

      const params: any = {};
      if (outletId) params.outlet_id = outletId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (categoryFilter) params.category = categoryFilter;

      // Load transactions
      const txResponse = await api.get('/sales-analytics/transactions', {
        params: { ...params, limit: 100 }
      });
      setTransactions(txResponse.data.data || []);

      // Load trend data
      const trendResponse = await api.get('/sales-analytics/trend', { params });
      setTrendData(trendResponse.data.data || []);

      // Load summary
      const summaryResponse = await api.get('/sales-analytics/summary', { params });
      setSummary(summaryResponse.data.data || null);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Gagal memuat data analytics');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get unique categories
  const categories = Array.from(new Set(transactions.map(t => t.category))).filter(Boolean);

  // Paginate transactions
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(transactions.length / itemsPerPage);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Custom line segments with dynamic colors (green for up, red for down)
  const renderColorfulLine = () => {
    if (trendData.length < 2) return null;

    const segments: JSX.Element[] = [];

    for (let i = 0; i < trendData.length - 1; i++) {
      const current = trendData[i];
      const next = trendData[i + 1];

      // Determine color based on trend
      const isUp = next.netSales >= current.netSales;
      const color = isUp ? '#22c55e' : '#ef4444'; // green-500 : red-500

      segments.push(
        <Line
          key={`segment-${i}`}
          type="monotone"
          dataKey="netSales"
          data={[current, next]}
          stroke={color}
          strokeWidth={3}
          dot={{
            fill: color,
            r: 4,
            strokeWidth: 2,
            stroke: '#fff'
          }}
          activeDot={{ r: 6 }}
          connectNulls
        />
      );
    }

    return segments;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-green-600" />
          Sales Analytics & Reports
        </h1>
        <p className="text-gray-600 mt-1">Analisis penjualan dan performa bisnis Anda</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Semua Kategori</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button
            onClick={loadData}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Apply Filter
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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

      {/* Net Sales Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Net Sales Trend</h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-600">Higher High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-gray-600">Lower Low</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-80 flex items-center justify-center text-gray-500">
            Loading chart...
          </div>
        ) : trendData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-gray-500">
            Tidak ada data untuk ditampilkan
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(date) => {
                  const d = new Date(date);
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
                labelFormatter={(label) => formatDate(label)}
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
          <button
            onClick={() => toast.success('Export feature coming soon!')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : paginatedTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Tidak ada data transaksi</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date/Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Receipt #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Item
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Gross Sales
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Discounts
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Net Sales
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Payment
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedTransactions.map((tx) => (
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
                        <div className="text-xs">
                          <div className="font-medium text-gray-900">{tx.itemName}</div>
                          {tx.variant && (
                            <div className="text-gray-500">{tx.variant}</div>
                          )}
                          {tx.brand !== 'Unbranded' && (
                            <div className="text-gray-500">{tx.brand}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="text-xs font-semibold text-gray-900">{tx.quantity}</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="text-xs text-gray-900">{formatCurrency(tx.grossSales)}</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {tx.discounts > 0 ? (
                          <span className="text-xs text-red-600">-{formatCurrency(tx.discounts)}</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="text-xs font-bold text-green-600">{formatCurrency(tx.netSales)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-700">{tx.salesType}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          {tx.paymentMethod}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, transactions.length)} of {transactions.length} transactions
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
}
