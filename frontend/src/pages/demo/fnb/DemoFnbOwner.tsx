import { DEMO_STATS, DEMO_CHART_DATA, DEMO_TRANSACTIONS } from '../dummyData';
import DemoLayout from '../DemoLayout';
import { DollarSign, TrendingUp, Users, ShoppingBag } from 'lucide-react';
import { useThemeStore } from '../../../store/themeStore';

export default function DemoFnbOwner() {
  const { isDark } = useThemeStore();
  
  return (
    <DemoLayout variant="owner" title="F&B Owner Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { title: 'Total Pendapatan', value: DEMO_STATS.fnb.revenue, icon: DollarSign, color: 'bg-emerald-500' },
          { title: 'Total Transaksi', value: DEMO_STATS.fnb.transactions, icon: ShoppingBag, color: 'bg-blue-500' },
          { title: 'Rata-rata Order', value: DEMO_STATS.fnb.avgOrder, icon: TrendingUp, color: 'bg-purple-500' },
          { title: 'Item Terlaris', value: DEMO_STATS.fnb.topItem, icon: Users, color: 'bg-orange-500' },
        ].map((stat, idx) => (
          <div key={idx} className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.title}</p>
                <h3 className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-lg ${stat.color} text-white shadow-lg shadow-${stat.color}/30`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Chart Area */}
        <div className={`lg:col-span-2 p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}>
          <h3 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Tren Penjualan</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {DEMO_CHART_DATA.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-t-lg relative h-full flex items-end overflow-hidden">
                  <div 
                    style={{ height: `${(d.income / 1500) * 100}%` }} 
                    className="w-full bg-emerald-500 hover:bg-emerald-400 transition-all duration-300 relative group"
                  ></div>
                </div>
                <span className="text-xs text-gray-400 font-medium">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}>
          <h3 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Pesanan Terbaru</h3>
          <div className="space-y-4">
            {DEMO_TRANSACTIONS.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                <div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{tx.desc}</p>
                  <p className="text-xs text-gray-500">{tx.date}</p>
                </div>
                <span className={`font-bold ${tx.type === 'in' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {tx.type === 'in' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DemoLayout>
  );
}
