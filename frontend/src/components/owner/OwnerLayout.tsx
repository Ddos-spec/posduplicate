import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Store,
  BarChart3,
  Settings,
  ShoppingCart,
  LogOut,
  Menu,
  X,
  Bell,
  Package
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import NotificationPanel from '../admin/NotificationPanel';

export default function OwnerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount, fetchNotifications, togglePanel } = useNotificationStore();
  const { user, logout } = useAuthStore();

  // Fetch notifications on initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/owner/dashboard' },
    { icon: Package, label: 'Manajemen Stok', path: '/owner/inventory' },
    { icon: UserCircle, label: 'Users', path: '/owner/users' },
    { icon: Store, label: 'Outlets', path: '/owner/outlets' },
    { icon: BarChart3, label: 'Reports', path: '/owner/reports' },
    { icon: Settings, label: 'Settings', path: '/owner/settings' },
    { icon: ShoppingCart, label: 'Go to POS', path: '/cashier' }
  ];

  const isActivePath = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col bg-gray-900 text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-800 shrink-0">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <img src="/logo.webp" alt="POS E2NK Logo" className="w-8 h-8 object-contain" />
              <h1 className="text-xl font-bold">MyPOS</h1>
            </div>
          )}
          {!sidebarOpen && (
            <img src="/logo.webp" alt="POS E2NK Logo" className="w-8 h-8 object-contain mx-auto" />
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded hover:bg-gray-800">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Scrollable Menu Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 p-3 rounded-lg transition ${
                  isActivePath(item.path) ? 'bg-blue-600' : 'hover:bg-gray-800'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>

        {/* Fixed Logout Button */}
        <div className="p-4 border-t border-gray-800 shrink-0">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 p-3 rounded-lg transition hover:bg-red-700 w-full text-left ${
              location.pathname === '/logout' ? 'bg-red-600' : 'text-red-400 hover:text-white'
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="text-red-400">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
          <aside className="bg-gray-900 text-white w-64 h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 flex items-center justify-between border-b border-gray-800 shrink-0">
              <div className="flex items-center gap-2">
                <img src="/logo.webp" alt="POS E2NK Logo" className="w-8 h-8 object-contain" />
                <h1 className="text-xl font-bold">MyPOS</h1>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded hover:bg-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-lg ${isActivePath(item.path) ? 'bg-blue-600' : 'hover:bg-gray-800'}`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className="p-4 border-t border-gray-800 shrink-0">
               <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-700 w-full text-red-400"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-red-400">Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm p-4 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 rounded hover:bg-gray-100">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{user?.tenant?.businessName || 'Owner Dashboard'}</h2>
                <p className="text-sm text-gray-500">Welcome back, {user?.name}!</p>
              </div>
            </div>
            <div className="flex items-center gap-4 relative">
              <select className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Main Store</option>
                <option>Branch Kemang</option>
                <option>All Outlets</option>
              </select>
              <button
                onClick={togglePanel}
                className="p-2 rounded-full hover:bg-gray-100 relative"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>
              <NotificationPanel />
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.name?.[0] || 'O'}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}