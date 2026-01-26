import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useNotificationStore } from '../../store/notificationStore';
import NotificationPanel from './NotificationPanel';
import {
  LayoutDashboard, BarChart3,
  Users, Settings, LogOut, Bell, Search, Menu, X,
  Sun, Moon, ChevronDown, Calculator, ShoppingCart,
  Package, Wallet, Building2, CreditCard, Receipt, Landmark, PiggyBank
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

const AiBadgeIcon = ({ className = '' }: { className?: string }) => (
  <span
    className={`inline-flex items-center justify-center rounded-md border border-current text-[10px] font-bold leading-none ${className}`}
  >
    AI
  </span>
);

const WhatsappIcon = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="currentColor"
      d="M16 3C9.383 3 4 8.383 4 15c0 2.238.62 4.41 1.79 6.308L4 29l7.905-1.744A12.934 12.934 0 0 0 16 27c6.617 0 12-5.383 12-12S22.617 3 16 3zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10a10.94 10.94 0 0 1-3.73-.65l-.65-.243-4.687 1.034 1.02-4.524-.288-.702A10 10 0 0 1 6 15c0-5.514 4.486-10 10-10zm-3.13 5.5c-.31-.64-.636-.653-.93-.665-.24-.01-.52-.01-.8-.01-.28 0-.73.105-1.11.525-.38.42-1.45 1.42-1.45 3.465s1.48 4.02 1.69 4.305c.21.285 2.86 4.59 7.02 6.255 3.46 1.385 4.16 1.11 4.92 1.04.76-.07 2.45-.99 2.8-1.95.35-.96.35-1.78.24-1.95-.11-.17-.38-.27-.8-.48-.42-.21-2.45-1.21-2.83-1.35-.38-.14-.66-.21-.94.21-.28.42-1.08 1.35-1.32 1.62-.24.27-.48.31-.9.105-.42-.21-1.77-.65-3.37-2.07-1.24-1.105-2.07-2.47-2.31-2.89-.24-.42-.025-.65.18-.86.185-.184.42-.48.63-.72.21-.24.28-.42.42-.7.14-.28.07-.52-.035-.73-.105-.21-.92-2.285-1.28-3.03z"
    />
  </svg>
);

export default function AccountingLayout({ variant = 'owner' }: AccountingLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [helpError, setHelpError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { unreadCount, fetchNotifications, togglePanel } = useNotificationStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const roleLabel = (user?.roles?.name || user?.role?.name || '').toString();
  const tenantName =
    user?.tenant?.businessName ||
    (user as any)?.tenants_users_tenant_idTotenants?.business_name ||
    '';
  const headerRoleLabel =
    roleLabel ||
    (variant === 'retail'
      ? 'Retail'
      : variant === 'distributor'
        ? 'Distributor'
        : variant === 'produsen'
          ? 'Produsen'
          : 'Owner');
  const settingsPath =
    variant === 'retail'
      ? '/accounting/retail/settings'
      : variant === 'distributor'
        ? '/accounting/distributor/settings'
        : variant === 'produsen'
          ? '/accounting/produsen/settings'
          : '/accounting/settings';

  const buildHelpMessage = () => {
    const lines = [
      'Halo, saya butuh bantuan.',
      `Nama: ${user?.name || '-'}`,
      `Email: ${user?.email || '-'}`,
      `Role: ${roleLabel || '-'}`,
      `Tenant: ${tenantName || '-'}`,
      `Halaman: ${location.pathname}`,
      `Masalah: ${helpMessage || '-'}`
    ];
    return lines.join('\n');
  };

  const handleSendHelp = () => {
    if (!helpMessage.trim()) {
      setHelpError('Mohon isi masalah terlebih dahulu.');
      return;
    }
    setHelpError('');
    const message = encodeURIComponent(buildHelpMessage());
    const phoneNumber = '6285771518231';
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setHelpMessage('');
    setIsHelpOpen(false);
  };

  // Menu configurations based on variant
  const getMenuItems = (): MenuItem[] => {
    switch (variant) {
      case 'retail':
        return [
          { name: 'Dashboard Retail', icon: LayoutDashboard, path: '/accounting/retail' },
          { name: 'Forecast', icon: AiBadgeIcon, path: '/accounting/retail/forecast' },
          { name: 'Sales Orders', icon: ShoppingCart, path: '/accounting/retail/sales' },
          { name: 'Customers', icon: Users, path: '/accounting/retail/customers' },
          { name: 'Products', icon: Package, path: '/accounting/retail/products' },
          { name: 'Inventory', icon: Package, path: '/accounting/retail/inventory' },
          { name: 'Reports', icon: BarChart3, path: '/accounting/retail/reports' },
        ];
      case 'distributor':
        return [
          { name: 'Dashboard', icon: LayoutDashboard, path: '/accounting/distributor' },
          { name: 'Forecast', icon: AiBadgeIcon, path: '/accounting/distributor/forecast' },
          { name: 'Pembelian', icon: ShoppingCart, path: '/accounting/distributor/pembelian' },
          { name: 'Supplier', icon: Building2, path: '/accounting/distributor/supplier' },
          { name: 'Stok', icon: Package, path: '/accounting/distributor/stok' },
          { name: 'Keuangan', icon: Wallet, path: '/accounting/distributor/keuangan' },
          { name: 'Laporan', icon: BarChart3, path: '/accounting/distributor/laporan' },
        ];
      case 'produsen':
        return [
          { name: 'Dashboard', icon: LayoutDashboard, path: '/accounting/produsen' },
          { name: 'Forecast', icon: AiBadgeIcon, path: '/accounting/produsen/forecast' },
          { name: 'Produksi', icon: Package, path: '/accounting/produsen/produksi' },
          { name: 'Inventori', icon: Package, path: '/accounting/produsen/inventori' },
          { name: 'Laporan', icon: BarChart3, path: '/accounting/produsen/laporan' },
        ];
      default: // owner
        return [
          { name: 'Dashboard', icon: LayoutDashboard, path: '/accounting/dashboard' },
          { name: 'Forecast', icon: AiBadgeIcon, path: '/accounting/forecast' },
          {
            name: 'Akuntansi',
            icon: Calculator,
            children: [
              { name: 'Chart of Accounts', path: '/accounting/coa' },
              { name: 'Jurnal Umum', path: '/accounting/journal' },
              { name: 'Buku Besar', path: '/accounting/ledger' },
            ]
          },
          { name: 'Laporan Keuangan', icon: BarChart3, path: '/accounting/reports', badge: 4 },
          {
            name: 'Keuangan',
            icon: Wallet,
            children: [
              { name: 'Hutang (AP)', path: '/accounting/ap' },
              { name: 'Piutang (AR)', path: '/accounting/ar' },
              { name: 'Aset Tetap', path: '/accounting/assets' },
              { name: 'Anggaran', path: '/accounting/budget' },
            ]
          },
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
                    onClick={() => navigate(settingsPath)}
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
            <button
              onClick={() => setIsHelpOpen(true)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2 transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-slate-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
            >
              <WhatsappIcon className="w-5 h-5 text-emerald-500" />
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

          <div className="flex items-center gap-4 relative">
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
            <button
              onClick={togglePanel}
              className={`relative p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <NotificationPanel />

            {/* User */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name || 'User'}</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{headerRoleLabel}</p>
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

      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-lg rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white shadow-xl'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                <WhatsappIcon className={`${isDark ? 'text-emerald-300' : 'text-emerald-600'} w-6 h-6`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Bantuan WhatsApp</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Kirim masalah kamu ke tim support.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Masalah *
              </label>
              <textarea
                rows={4}
                value={helpMessage}
                onChange={(event) => {
                  setHelpMessage(event.target.value);
                  if (helpError) {
                    setHelpError('');
                  }
                }}
                placeholder="Jelaskan masalah yang kamu alami..."
                className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
              />
              {helpError && (
                <p className="mt-2 text-sm text-red-400">{helpError}</p>
              )}
            </div>

            <div className={`mt-4 rounded-xl border p-4 text-sm ${isDark ? 'border-slate-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>
              <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Informasi tambahan
              </p>
              <div className="mt-2 space-y-1">
                <p>Nama: {user?.name || '-'}</p>
                <p>Email: {user?.email || '-'}</p>
                <p>Role: {roleLabel || '-'}</p>
                <p>Tenant: {tenantName || '-'}</p>
                <p>Halaman: {location.pathname}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setIsHelpOpen(false);
                  setHelpError('');
                }}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium ${
                  isDark ? 'bg-slate-700 text-gray-200 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Batal
              </button>
              <button
                onClick={handleSendHelp}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Kirim ke WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
