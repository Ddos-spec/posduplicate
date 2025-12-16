import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import {
  LayoutDashboard, FileText, BookOpen, BarChart3,
  Users, Settings, LogOut, Bell, Search, Menu, X,
  Sun, Moon, ChevronDown, Calculator, ShoppingCart,
  Package, HelpCircle, Wallet, Building2
} from 'lucide-react';

interface MenuItem {
  name: string;
  icon: React.ElementType;
  path?: string;
  badge?: number | string;
  children?: { name: string; path: string }[];
}

interface AccountingLayoutProps {
  variant?: 'owner' | 'retail' | 'distributor' | 'produsen';
}

export default function AccountingLayout({ variant = 'owner' }: AccountingLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Menu configurations based on variant
  const getMenuItems = (): MenuItem[] => {
    switch (variant) {
      case 'retail':
        return [
          { name: 'Dashboard Retail', icon: LayoutDashboard, path: '/accounting/retail' },
          { name: 'Sales Orders', icon: ShoppingCart, path: '/accounting/retail/sales' },
          { name: 'Customers', icon: Users, path: '/accounting/retail/customers' },
          { name: 'Products', icon: Package, path: '/accounting/retail/products' },
          { name: 'Inventory', icon: Package, path: '/accounting/retail/inventory' },
          { name: 'Reports', icon: BarChart3, path: '/accounting/retail/reports' },
        ];
      case 'distributor':
        return [
          { name: 'Dashboard', icon: LayoutDashboard, path: '/accounting/distributor' },
          { name: 'Pembelian', icon: ShoppingCart, path: '/accounting/distributor/pembelian' },
          { name: 'Supplier', icon: Building2, path: '/accounting/distributor/supplier' },
          { name: 'Stok', icon: Package, path: '/accounting/distributor/stok' },
          { name: 'Keuangan', icon: Wallet, path: '/accounting/distributor/keuangan' },
          { name: 'Laporan', icon: BarChart3, path: '/accounting/distributor/laporan' },
        ];
      case 'produsen':
        return [
          { name: 'Dashboard', icon: LayoutDashboard, path: '/accounting/produsen' },
          { name: 'Produksi', icon: Package, path: '/accounting/produsen/produksi' },
          { name: 'Inventori', icon: Package, path: '/accounting/produsen/inventori' },
          { name: 'Laporan', icon: BarChart3, path: '/accounting/produsen/laporan' },
        ];
      default: // owner
        return [
          { name: 'Dashboard', icon: LayoutDashboard, path: '/accounting/dashboard' },
          {
            name: 'Akuntansi',
            icon: Calculator,
            children: [
              { name: 'Chart of Accounts', path: '/accounting/coa' },
              { name: 'Jurnal Umum', path: '/accounting/journal' },
              { name: 'Buku Besar', path: '/accounting/ledger' },
            ]
          },
          { name: 'Laporan Keuangan', icon: BarChart3, path: '/accounting/reports', badge: 3 },
          { name: 'Kelola Pengguna', icon: Users, path: '/accounting/users', badge: '8 users' },
        ];
    }
  };

  const menuItems = getMenuItems();

  const getVariantTitle = () => {
    switch (variant) {
      case 'retail': return 'Business Manager';
      case 'distributor': return 'Distributor Portal';
      case 'produsen': return 'Produsen Panel';
      default: return 'Owner Dashboard';
    }
  };

  const getVariantColor = () => {
    switch (variant) {
      case 'retail': return 'emerald';
      case 'distributor': return 'blue';
      case 'produsen': return 'purple';
      default: return 'purple';
    }
  };

  const color = getVariantColor();

  const isActivePath = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isActiveParent = (children?: { name: string; path: string }[]) => {
    if (!children) return false;
    return children.some(child => isActivePath(child.path));
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex flex-col ${isDark ? 'bg-slate-800 border-r border-slate-700' : 'bg-white border-r border-gray-200'}`}>
        {/* Logo */}
        <div className={`p-4 flex items-center gap-3 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}-500`}>
            <Calculator className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>MyAkuntan</h1>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{getVariantTitle()}</p>
            </div>
          )}
        </div>

        {/* User Info (for some variants) */}
        {variant === 'distributor' && sidebarOpen && (
          <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name || 'User'}</p>
                <span className="text-xs text-blue-500">● Distributor</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {sidebarOpen && (
            <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              MAIN MENU
            </p>
          )}
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.name}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => setExpandedMenu(expandedMenu === item.name ? null : item.name)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                        isActiveParent(item.children)
                          ? isDark ? `bg-${color}-500/20 text-${color}-400` : `bg-${color}-50 text-${color}-600`
                          : isDark ? 'text-gray-400 hover:text-white hover:bg-slate-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        {sidebarOpen && <span>{item.name}</span>}
                      </div>
                      {sidebarOpen && (
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenu === item.name ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                    {sidebarOpen && expandedMenu === item.name && (
                      <ul className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.path}>
                            <button
                              onClick={() => navigate(child.path)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                isActivePath(child.path)
                                  ? isDark ? `text-${color}-400` : `text-${color}-600 font-medium`
                                  : isDark ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                              }`}
                            >
                              {child.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => item.path && navigate(item.path)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                      isActivePath(item.path)
                        ? isDark ? `bg-${color}-500/20 text-${color}-400` : `bg-${color}-50 text-${color}-600`
                        : isDark ? 'text-gray-400 hover:text-white hover:bg-slate-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      {sidebarOpen && <span>{item.name}</span>}
                    </div>
                    {sidebarOpen && item.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>

          {/* Bottom menu items */}
          {sidebarOpen && (
            <>
              <p className={`text-xs font-semibold uppercase tracking-wider mt-6 mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                SETTINGS
              </p>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => navigate('/accounting/settings')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-slate-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                  >
                    <Settings className="w-5 h-5" />
                    <span>Pengaturan</span>
                  </button>
                </li>
              </ul>
            </>
          )}
        </nav>

        {/* Help & Logout */}
        <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          {sidebarOpen && (
            <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2 transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-slate-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
              <HelpCircle className="w-5 h-5" />
              <span>Bantuan</span>
            </button>
          )}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className={`h-16 flex items-center justify-between px-6 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Search */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Cari akun atau transaksi..."
                className={`pl-10 pr-4 py-2 w-80 rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400 focus:ring-purple-500'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-purple-500'
                }`}
              />
              <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`}>⌘</kbd>
                <kbd className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`}>K</kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className={`text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Live</span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <button className={`relative p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name || 'User'}</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Super Admin</p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium bg-gradient-to-br from-${color}-400 to-${color}-600`}>
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`flex-1 overflow-auto p-6 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
