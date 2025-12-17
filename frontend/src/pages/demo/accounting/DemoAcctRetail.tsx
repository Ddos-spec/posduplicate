import DemoLayout from '../DemoLayout';
import { Store, ShoppingBag, Users, Tag } from 'lucide-react';

export default function DemoAcctRetail() {
  return (
    <DemoLayout variant="retail" title="Retail Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { title: 'Penjualan Hari Ini', value: 'Rp 8.500.000', icon: Store, color: 'pink' },
          { title: 'Total Transaksi', value: '142', icon: ShoppingBag, color: 'blue' },
          { title: 'Pelanggan Baru', value: '+12', icon: Users, color: 'purple' },
          { title: 'Produk Diskon', value: '5 Item', icon: Tag, color: 'orange' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
             <div className={`w-10 h-10 rounded-lg bg-${stat.color}-100 flex items-center justify-center text-${stat.color}-600 mb-2`}>
                <stat.icon size={20} />
             </div>
             <p className="text-gray-500 text-sm">{stat.title}</p>
             <h3 className="text-2xl font-bold">{stat.value}</h3>
          </div>
        ))}
      </div>
      
       <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="font-bold mb-6">Top Produk Retail</h3>
          <div className="space-y-4">
             {[
               { name: 'Kemeja Flannel', sales: 45, revenue: 'Rp 6.750.000' },
               { name: 'Celana Chino', sales: 32, revenue: 'Rp 5.200.000' },
               { name: 'Kaos Polos Basic', sales: 85, revenue: 'Rp 4.250.000' }
             ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700 last:border-0">
                   <div className="flex items-center gap-4">
                      <span className="text-gray-400 font-bold">#{i+1}</span>
                      <span className="font-medium">{item.name}</span>
                   </div>
                   <div className="text-right">
                      <p className="font-bold">{item.revenue}</p>
                      <p className="text-xs text-gray-500">{item.sales} terjual</p>
                   </div>
                </div>
             ))}
          </div>
       </div>
    </DemoLayout>
  );
}
