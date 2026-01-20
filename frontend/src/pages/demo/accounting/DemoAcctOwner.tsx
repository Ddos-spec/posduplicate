import { DEMO_STATS, DEMO_CHART_DATA } from '../dummyData';
import DemoLayout from '../DemoLayout';
import { DollarSign, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useThemeStore } from '../../../store/themeStore';

export default function DemoAcctOwner() {
  const { isDark } = useThemeStore();

  return (
    <DemoLayout variant="accounting" title="Accounting Owner">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { title: 'Total Aset', value: DEMO_STATS.accounting.assets, icon: Wallet, color: 'blue' },
          { title: 'Pendapatan', value: DEMO_STATS.accounting.revenue, icon: TrendingUp, color: 'emerald' },
          { title: 'Pengeluaran', value: DEMO_STATS.accounting.expense, icon: TrendingDown, color: 'red' },
          { title: 'Laba Bersih', value: DEMO_STATS.accounting.profit, icon: DollarSign, color: 'purple' },
        ].map((stat, idx) => (
          <div key={idx} className={`p-6 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-3 rounded-lg bg-${stat.color}-100 text-${stat.color}-600`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-emerald-500 text-xs font-bold bg-emerald-100 px-2 py-1 rounded-full">+12%</span>
            </div>
            <p className={`text-sm mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.title}</p>
            <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Rp {stat.value.toLocaleString('id-ID')}
            </h3>
          </div>
        ))}
      </div>

      <div className={`p-8 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-gray-100'}`}>
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold">Laporan Laba Rugi (YTD)</h3>
          <button className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium">Download PDF</button>
        </div>
        
        <div className="h-80 w-full flex items-end gap-4">
          {DEMO_CHART_DATA.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end gap-1 h-full group">
               <div className="relative w-full bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden h-full flex items-end">
                 <div style={{ height: `${(d.income / 1500) * 100}%` }} className="w-1/2 bg-emerald-500 rounded-t"></div>
                 <div style={{ height: `${(d.expense / 1500) * 100}%` }} className="w-1/2 bg-red-500 rounded-t"></div>
               </div>
               <p className="text-center text-xs font-medium text-gray-500 mt-2">{d.month}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-6 mt-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-3 h-3 bg-emerald-500 rounded-full"></span> Pendapatan
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span> Pengeluaran
          </div>
        </div>
      </div>
    </DemoLayout>
  );
}
