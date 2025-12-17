import DemoLayout from '../DemoLayout';
import { Factory, Zap, Box, DollarSign } from 'lucide-react';

export default function DemoAcctProducer() {
  return (
    <DemoLayout variant="producer" title="Producer Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { title: 'Biaya Produksi', value: 'Rp 450jt', icon: Factory, color: 'emerald' },
          { title: 'Output Harian', value: '1.200 Pcs', icon: Box, color: 'blue' },
          { title: 'Efisiensi', value: '94%', icon: Zap, color: 'yellow' },
          { title: 'HPP Rata-rata', value: 'Rp 15.000', icon: DollarSign, color: 'red' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
             <div className="flex justify-between">
                <div>
                   <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                   <h3 className="text-2xl font-bold">{stat.value}</h3>
                </div>
                <stat.icon className={`text-${stat.color}-500`} />
             </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="font-bold mb-4">Jadwal Produksi</h3>
            <div className="space-y-4">
               {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                     <div className="w-2 h-12 bg-emerald-500 rounded-full"></div>
                     <div>
                        <h4 className="font-bold">Batch Production #{202400+i}</h4>
                        <p className="text-xs text-gray-500">Status: Running • Target: 500 unit</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <h3 className="font-bold mb-4">Peringatan Stok Bahan Baku</h3>
            <div className="space-y-4">
               <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
                  <span>Tepung Terigu Premium</span>
                  <span className="font-bold">Sisa 15kg (Low)</span>
               </div>
            </div>
         </div>
      </div>
    </DemoLayout>
  );
}
