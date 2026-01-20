import { useNavigate } from 'react-router-dom';
import { 
  ChefHat, ShoppingCart, TrendingUp, Truck, Store, Factory, ArrowRight, 
  Package, Share2, Pill, Tag 
} from 'lucide-react';

export default function DemoLandingPage() {
  const navigate = useNavigate();

  const demos = [
    {
      title: "F&B Operations",
      items: [
        { name: "Owner Dashboard", path: "/demo/fnb/owner", icon: ChefHat, desc: "Kelola menu, karyawan, dan laporan restoran.", color: "bg-purple-500" },
        { name: "Cashier (POS)", path: "/demo/fnb/cashier", icon: ShoppingCart, desc: "Antarmuka kasir untuk transaksi cepat.", color: "bg-blue-500" }
      ]
    },
    {
      title: "Finance & ERP",
      items: [
        { name: "Accounting Owner", path: "/demo/accounting/owner", icon: TrendingUp, desc: "Laporan keuangan lengkap & Neraca.", color: "bg-emerald-500" },
        { name: "Distributor Finance", path: "/demo/accounting/distributor", icon: Truck, desc: "Manajemen hutang piutang & stok.", color: "bg-orange-500" },
        { name: "Factory Costing", path: "/demo/accounting/producer", icon: Factory, desc: "Pantau biaya produksi & HPP.", color: "bg-indigo-500" },
        { name: "Retail Finance", path: "/demo/accounting/retail", icon: Store, desc: "Penjualan harian & manajemen toko.", color: "bg-pink-500" }
      ]
    },
    {
      title: "Inventory System",
      items: [
        { name: "FnB Inventory", path: "/demo/inventory?type=fnb", icon: ChefHat, desc: "Stok bahan baku resep & waste.", color: "bg-orange-600" },
        { name: "Pharmacy Inventory", path: "/demo/inventory?type=pharmacy", icon: Pill, desc: "Kelola obat, batch no & expiry date.", color: "bg-green-600" },
        { name: "Retail Inventory", path: "/demo/inventory?type=retail", icon: Tag, desc: "Stok varian produk (size/warna).", color: "bg-blue-600" }
      ]
    },
    {
      title: "Digital Engagement",
      items: [
        { name: "MyMedsos", path: "/demo/medsos", icon: Share2, desc: "Content Calendar & Engagement Dashboard.", color: "bg-sky-500" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Pilih Mode Demo</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Jelajahi fitur lengkap aplikasi tanpa perlu login atau setup database.
            Semua data bersifat simulasi.
          </p>
        </div>

        <div className="grid gap-12">
          {demos.map((section, idx) => (
            <div key={idx}>
              <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-slate-800 rounded-full"></span>
                {section.title}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {section.items.map((item, itemIdx) => (
                  <button
                    key={itemIdx}
                    onClick={() => navigate(item.path)}
                    className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 text-left relative overflow-hidden"
                  >
                    <div className={`absolute top-0 right-0 w-24 h-24 ${item.color} opacity-5 rounded-bl-full transition-transform group-hover:scale-110`}></div>
                    
                    <div className={`w-12 h-12 ${item.color} text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-${item.color}/20`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{item.name}</h3>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                      {item.desc}
                    </p>
                    
                    <div className="flex items-center text-sm font-medium text-blue-600 group-hover:translate-x-1 transition-transform">
                      Buka Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button 
            onClick={() => navigate('/login')}
            className="text-slate-400 hover:text-slate-600 font-medium text-sm"
          >
            ← Kembali ke Halaman Login
          </button>
        </div>
      </div>
    </div>
  );
}
