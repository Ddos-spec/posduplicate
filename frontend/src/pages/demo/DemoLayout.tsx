import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { 
  LayoutDashboard, ShoppingCart, Users, Settings, 
  LogOut, Menu, X, Sun, Moon, ChefHat, Store, Truck, Factory, Package, Activity, TrendingUp
} from 'lucide-react';

interface DemoLayoutProps {
  children: React.ReactNode;
  variant: 'owner' | 'cashier' | 'accounting' | 'distributor' | 'producer' | 'retail';
  title: string;
}

export default function DemoLayout({ children, variant, title }: DemoLayoutProps) {
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const getMenuItems = () => {
    const baseItems = [
      { icon: Settings, label: 'Pengaturan', path: '#', active: false },
    ];

    if (variant === 'cashier') return [
      { icon: ShoppingCart, label: 'Kasir', path: '/demo/fnb/cashier', active: location.pathname === '/demo/fnb/cashier' },
      { icon: Activity, label: 'Riwayat', path: '#', active: false },
      ...baseItems
    ];

    if (variant === 'owner') return [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/demo/fnb/owner', active: location.pathname === '/demo/fnb/owner' },
      { icon: Package, label: 'Produk', path: '/demo/fnb/owner/products', active: location.pathname.includes('products') },
      { icon: Users, label: 'Karyawan', path: '/demo/fnb/owner/users', active: location.pathname.includes('users') },
      { icon: ShoppingCart, label: 'Laporan', path: '#', active: false },
      ...baseItems
    ];

    // Accounting Roles
    if (variant === 'accounting') return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/demo/accounting/owner', active: location.pathname === '/demo/accounting/owner' },
        { icon: TrendingUp, label: 'Forecast', path: '/demo/accounting/owner/forecast', active: location.pathname.includes('forecast') },
        { icon: Users, label: 'Chart of Accounts', path: '/demo/accounting/owner/coa', active: location.pathname.includes('coa') },
        { icon: Activity, label: 'Jurnal Umum', path: '/demo/accounting/owner/journal', active: location.pathname.includes('journal') },
        { icon: Package, label: 'Buku Besar', path: '/demo/accounting/owner/ledger', active: location.pathname.includes('ledger') },
        { icon: ShoppingCart, label: 'Laporan', path: '/demo/accounting/owner/reports', active: location.pathname.includes('reports') },
        ...baseItems
    ];
    if (variant === 'distributor') return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/demo/accounting/distributor', active: location.pathname === '/demo/accounting/distributor' && !location.pathname.includes('/', 30) },
        { icon: TrendingUp, label: 'Forecast', path: '/demo/accounting/distributor/forecast', active: location.pathname.includes('forecast') },
        { icon: ShoppingCart, label: 'Pembelian', path: '/demo/accounting/distributor/pembelian', active: location.pathname.includes('pembelian') },
        { icon: Users, label: 'Supplier', path: '/demo/accounting/distributor/supplier', active: location.pathname.includes('supplier') },
        { icon: Package, label: 'Stok', path: '/demo/accounting/distributor/stok', active: location.pathname.includes('stok') },
        { icon: Activity, label: 'Keuangan', path: '/demo/accounting/distributor/keuangan', active: location.pathname.includes('keuangan') },
        { icon: ShoppingCart, label: 'Laporan', path: '/demo/accounting/distributor/laporan', active: location.pathname.includes('laporan') },
        ...baseItems
    ];
    if (variant === 'producer') return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/demo/accounting/producer', active: location.pathname === '/demo/accounting/producer' && !location.pathname.includes('/', 28) },
        { icon: TrendingUp, label: 'Forecast', path: '/demo/accounting/producer/forecast', active: location.pathname.includes('forecast') },
        { icon: Factory, label: 'Produksi', path: '/demo/accounting/producer/produksi', active: location.pathname.includes('produksi') },
        { icon: Package, label: 'Inventori', path: '/demo/accounting/producer/inventori', active: location.pathname.includes('inventori') },
        { icon: ShoppingCart, label: 'Laporan', path: '/demo/accounting/producer/laporan', active: location.pathname.includes('laporan') },
        ...baseItems
    ];
    if (variant === 'retail') return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/demo/accounting/retail', active: location.pathname === '/demo/accounting/retail' && !location.pathname.includes('/', 26) },
        { icon: TrendingUp, label: 'Forecast', path: '/demo/accounting/retail/forecast', active: location.pathname.includes('forecast') },
        { icon: ShoppingCart, label: 'Sales', path: '/demo/accounting/retail/sales', active: location.pathname.includes('sales') },
        { icon: Users, label: 'Customers', path: '/demo/accounting/retail/customers', active: location.pathname.includes('customers') },
        { icon: Package, label: 'Products', path: '/demo/accounting/retail/products', active: location.pathname.includes('products') },
        { icon: Package, label: 'Inventory', path: '/demo/accounting/retail/inventory', active: location.pathname.includes('inventory') },
        { icon: ShoppingCart, label: 'Reports', path: '/demo/accounting/retail/reports', active: location.pathname.includes('reports') },
        ...baseItems
    ];

    return baseItems;
  };

  const getVariantColor = () => {
    switch(variant) {
      case 'cashier': return 'blue';
      case 'distributor': return 'orange';
      case 'producer': return 'emerald';
      case 'retail': return 'pink';
      default: return 'purple';
    }
  };

  const color = getVariantColor();

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-64 border-r ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="h-full px-3 py-4 overflow-y-auto">
          <div className="flex items-center gap-2 mb-8 px-2">
            <div className={`p-2 rounded-lg bg-${color}-500 text-white`}>
              {variant === 'producer' ? <Factory size={24} /> : 
               variant === 'distributor' ? <Truck size={24} /> :
               variant === 'retail' ? <Store size={24} /> :
               <ChefHat size={24} />}
            </div>
            <div>
              <h2 className="font-bold text-lg">DEMO MODE</h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
            </div>
          </div>

          <ul className="space-y-2 font-medium">
            {getMenuItems().map((item, idx) => (
              <li key={idx}>
                <button 
                  onClick={() => item.path !== '#' && navigate(item.path)}
                  className={`flex items-center w-full p-3 rounded-lg group transition-colors ${
                  item.active 
                    ? isDark ? `bg-${color}-500/20 text-${color}-400` : `bg-${color}-50 text-${color}-600`
                    : isDark ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                  <item.icon className={`w-5 h-5 transition duration-75 ${item.active ? '' : isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'}`} />
                  <span className="ml-3">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div className={`absolute bottom-0 left-0 w-full p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <button 
            onClick={() => navigate('/demo')}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Keluar Demo
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="p-4 md:ml-64">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2 ml-auto">
             <div className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
               DEMO VERSION
             </div>
             <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-yellow-400' : 'hover:bg-gray-100 text-slate-700'}`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {children}
      </div>
    </div>
  );
}
