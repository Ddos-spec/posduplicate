import { useEffect, useState } from 'react';
import { DollarSign, ShoppingBag, Users, Package } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayTransactions: 0,
    totalProducts: 0,
    totalCustomers: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Mock stats for now - you can implement real endpoints later
      setStats({
        todaySales: 15420000,
        todayTransactions: 87,
        totalProducts: 156,
        totalCustomers: 342,
      });
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const statCards = [
    {
      title: 'Today Sales',
      value: `Rp ${stats.todaySales.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Transactions',
      value: stats.todayTransactions,
      icon: ShoppingBag,
      color: 'bg-blue-500',
    },
    {
      title: 'Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-purple-500',
    },
    {
      title: 'Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="font-medium">Transaction #{1000 + i}</p>
                  <p className="text-sm text-gray-600">Just now</p>
                </div>
                <span className="font-semibold text-green-600">
                  Rp {(Math.random() * 500000 + 100000).toFixed(0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Products</h3>
          <div className="space-y-3">
            {['Nasi Goreng', 'Ayam Bakar', 'Es Teh', 'Kentang Goreng', 'Burger'].map(
              (product, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <p className="font-medium">{product}</p>
                    <p className="text-sm text-gray-600">{Math.floor(Math.random() * 50 + 10)} sold</p>
                  </div>
                  <span className="text-blue-600 font-semibold">
                    Rp {(Math.random() * 50000 + 10000).toFixed(0).toLocaleString()}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
