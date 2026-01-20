import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { useInventoryConfig } from '../../pages/inventory/inventoryConfigStore';
import { useDemoUser } from '../../pages/demo/demoRoleStore';
import {
  LayoutDashboard, Package, TrendingUp, ShoppingCart, Settings,
  Menu, Sun, Moon, ArrowLeft, Boxes, ChevronDown, ChefHat
} from 'lucide-react';

export default function InventoryLayout() {
  const { isDark, toggleTheme } = useThemeStore();
  const { businessType, setBusinessType } = useInventoryConfig();
  const { currentRole } = useDemoUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auto-switch mode based on URL param (e.g. ?type=pharmacy)
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam && ['fnb', 'pharmacy', 'retail'].includes(typeParam)) {
      setBusinessType(typeParam as any);
    }
  }, [searchParams, setBusinessType]);

  // Detect if we are in demo mode
  const isDemo = location.pathname.startsWith('/demo');
  const basePath = isDemo ? '/demo/inventory' : '/inventory';

  // Define All Menus
  const allMenus = [
    { icon: LayoutDashboard, label: 'Dashboard', path: `${basePath}/dashboard`, roles: ['all'] },
    { icon: Boxes, label: 'Stok Barang', path: `${basePath}/stock`, roles: ['all'] },
    { icon: ChefHat, label: 'Recipe & Costing', path: `${basePath}/recipe`, roles: ['inventory_manager', 'kitchen'] },
    { icon: TrendingUp, label: 'Smart Forecast', path: `${basePath}/forecast`, roles: ['inventory_manager'] },
    { icon: ShoppingCart, label: 'Belanja (PO)', path: `${basePath}/reorder`, roles: ['inventory_manager', 'purchasing'] },
    { icon: Settings, label: 'Pengaturan', path: `${basePath}/settings`, roles: ['inventory_manager'] },
  ];

  // Filter Menus based on Role
  const menuItems = allMenus.filter(item => {
    if (currentRole === 'super_admin') return true; // Default fallback
    if (item.roles.includes('all')) return true;
    return item.roles.includes(currentRole);
  });

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-64 border-r ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="h-full px-3 py-4 overflow-y-auto">
          {/* Logo / Header */}
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <Package size={24} />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">MyInventory</h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {currentRole === 'inventory_manager' ? 'Manager View' : 
                 currentRole === 'stock_keeper' ? 'Stock Keeper' : 
                 currentRole === 'purchasing' ? 'Purchasing' : 'Admin View'}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <ul className="space-y-2 font-medium">
            {menuItems.map((item, idx) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={idx}>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`flex items-center w-full p-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                        : isDark ? 'text-gray-400 hover:bg-slate-700 hover:text-white' : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                    <span className="ml-3">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer Sidebar */}
        <div className={`absolute bottom-0 left-0 w-full p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            onClick={() => navigate(isDemo ? '/demo' : '/module-selector')}
            className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
              isDark ? 'text-gray-400 hover:bg-slate-700 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {isDemo ? 'Kembali ke Demo' : 'Ganti Modul'}
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="p-4 md:ml-64">
        {/* Topbar Mobile & Theme Toggle */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {/* Business Type Switcher (Demo Feature) */}
            <div className="relative group">
              <button className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-800'
              }`}>
                {businessType === 'fnb' ? '🍔 FnB Mode' : businessType === 'pharmacy' ? '💊 Pharmacy' : '👕 Retail'}
                <ChevronDown className="w-3 h-3" />
              </button>
              
              <div className={`absolute right-0 mt-2 w-40 py-2 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 ${
                isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100'
              }`}>
                <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Switch Type
                </div>
                {[
                  { id: 'fnb', label: 'FnB (Restoran)' },
                  { id: 'pharmacy', label: 'Pharmacy (Apotek)' },
                  { id: 'retail', label: 'Retail (Toko)' }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setBusinessType(type.id as any)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-orange-50 hover:text-orange-600 transition-colors ${
                      businessType === type.id ? 'text-orange-500 font-bold' : isDark ? 'text-gray-300' : 'text-gray-600'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-gray-100 border border-gray-200 shadow-sm'}`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold shadow-md">
              O
            </div>
          </div>
        </div>

        {/* Page Content Rendered Here */}
        <Outlet />
      </div>
    </div>
  );
}
