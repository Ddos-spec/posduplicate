import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  CreditCard,
  LogOut,
  Menu,
  X,
  Bell,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNotificationStore } from '../../store/notificationStore';
import NotificationPanel from './NotificationPanel';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount, fetchNotifications, togglePanel } = useNotificationStore();

  // Fetch notifications on initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Get admin user from localStorage (mock)
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Building2, label: 'Tenant Management', path: '/admin/tenants' },
    { icon: TrendingUp, label: 'System Analytics', path: '/admin/analytics' },
    { icon: CreditCard, label: 'Billing', path: '/admin/billing' },
  ];

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block relative bg-gray-900 text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <img src="/logo.webp" alt="POS E2NK Logo" className="w-8 h-8 object-contain" />
              <h1 className="text-xl font-bold">MyPOS Admin</h1>
            </div>
          )}
          {!sidebarOpen && (
            <img src="/logo.webp" alt="POS E2NK Logo" className="w-8 h-8 object-contain mx-auto" />
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded hover:bg-gray-800 transition"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 p-3 rounded-lg transition ${
                isActivePath(item.path)
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-700 w-full transition text-red-400 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="text-red-400">Logout</span>}
          </button>
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
          <aside className="bg-gray-900 text-white w-64 h-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-2">
                <img src="/logo.webp" alt="POS E2NK Logo" className="w-8 h-8 object-contain" />
                <h1 className="text-xl font-bold">MyPOS Admin</h1>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="p-4 space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition ${
                    isActivePath(item.path)
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-700 w-full transition text-red-400 hover:text-white"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-red-400">Logout</span>
              </button>
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm p-4 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded hover:bg-gray-100"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-semibold text-gray-800">
                MyPOS System Administration
              </h2>
            </div>
            <div className="flex items-center gap-4 relative">
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
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-700">{user.name || 'Admin'}</p>
                  <p className="text-xs text-gray-500">{user.email || 'admin@mypos.com'}</p>
                </div>
                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
