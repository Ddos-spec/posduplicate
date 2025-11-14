import { useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileDown, Printer, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const salesData = [
  { date: '11/08', sales: 2500000 },
  { date: '11/09', sales: 3200000 },
  { date: '11/10', sales: 2800000 },
  { date: '11/11', sales: 3500000 },
  { date: '11/12', sales: 4200000 },
  { date: '11/13', sales: 3800000 },
  { date: '11/14', sales: 4500000 }
];

const categoryData = [
  { name: 'Makanan', value: 15500000, color: '#3b82f6' },
  { name: 'Minuman', value: 8200000, color: '#10b981' },
  { name: 'Snack', value: 4300000, color: '#f59e0b' }
];

const topProducts = [
  { name: 'Nasi Kebuli', qty: 245, revenue: 4500000 },
  { name: 'Kopi Latte', qty: 320, revenue: 3200000 },
  { name: 'Ayam Bakar', qty: 180, revenue: 2800000 }
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'products' | 'category' | 'cashier'>('sales');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-gray-600">Business performance insights</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Export PDF (Mock)')} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            PDF
          </button>
          <button onClick={() => toast.success('Print (Mock)')} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="date" defaultValue="2025-11-08" className="px-4 py-2 border rounded-lg" />
          <input type="date" defaultValue="2025-11-14" className="px-4 py-2 border rounded-lg" />
          <select className="px-4 py-2 border rounded-lg">
            <option>Main Store</option>
            <option>Branch Kemang</option>
            <option>All Outlets</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">
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
              <p className="text-3xl font-bold text-gray-800">Rp 30M</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-3xl font-bold text-green-600">1,245</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Avg/Transaction</p>
              <p className="text-3xl font-bold text-purple-600">Rp 24K</p>
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
          <h3 className="font-semibold mb-4">Cashier Performance</h3>
          <p className="text-gray-500">Cashier performance report will be displayed here (Mock)</p>
        </div>
      )}
    </div>
  );
}
