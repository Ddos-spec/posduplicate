import DemoLayout from '../DemoLayout';
import { Truck, Package, Users, BarChart } from 'lucide-react';

export default function DemoAcctDistributor() {
  return (
    <DemoLayout variant="distributor" title="Distributor Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { title: 'Pengiriman Aktif', value: '12', icon: Truck, color: 'orange' },
          { title: 'Stok Gudang', value: '4,500 Unit', icon: Package, color: 'blue' },
          { title: 'Total Pelanggan', value: '85 Toko', icon: Users, color: 'purple' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div className={`w-12 h-12 rounded-full bg-${stat.color}-100 flex items-center justify-center text-${stat.color}-600 mb-4`}>
              <stat.icon />
            </div>
            <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
            <p className="text-gray-500">{stat.title}</p>
          </div>
        ))}
      </div>
      
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm h-96 flex items-center justify-center text-gray-400 border border-gray-100 dark:border-slate-700 border-dashed">
        <div className="text-center">
          <BarChart className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>Grafik Analisis Distribusi (Simulasi)</p>
        </div>
      </div>
    </DemoLayout>
  );
}
