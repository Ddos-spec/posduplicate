import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { 
  LayoutDashboard, ShoppingCart, Users, Settings, 
  LogOut, Menu, X, Sun, Moon, ChefHat, Store, Truck, Factory
} from 'lucide-react';

interface DemoLayoutProps {
  children: React.ReactNode;
  variant: 'owner' | 'cashier' | 'accounting' | 'distributor' | 'producer' | 'retail';
  title: string;
}

export default function DemoLayout({ children, variant, title }: DemoLayoutProps) {
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const getMenuItems = () => {
    const baseItems = [
      { icon: LayoutDashboard, label: 'Dashboard', active: true },
      { icon: Settings, label: 'Pengaturan', active: false },
    ];

    if (variant === 'cashier') return [
      { icon: ShoppingCart, label: 'Kasir', active: true },
      { icon: Activity, label: 'Riwayat', active: false },
      ...baseItems
    ];

    if (variant === 'owner') return [
      { icon: LayoutDashboard, label: 'Dashboard', active: true },
      { icon: Users, label: 'Karyawan', active: false },
      { icon: ShoppingCart, label: 'Laporan', active: false },
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
                <button className={`flex items-center w-full p-3 rounded-lg group ${
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
