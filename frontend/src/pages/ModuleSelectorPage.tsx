import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import {
  Monitor, Calculator, Package,
  ArrowRight, LogOut, Clock, Sun, Moon, Star,
  ShoppingCart, Share2
} from 'lucide-react';

export default function ModuleSelectorPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const modules = [
    {
      id: 'pos',
      name: 'MyPOS',
      description: 'Comprehensive point of sale solution for your retail outlets.',
      icon: Monitor,
      color: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-500',
      features: ['POS Terminal', 'Inventory Management', 'Staff Shift'],
      status: 'active',
      path: '/owner/dashboard'
    },
    {
      id: 'accounting',
      name: 'MyAkuntan',
      description: 'Automated bookkeeping and financial reporting.',
      icon: Calculator,
      color: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-500',
      features: ['General Ledger', 'Financial Reports', 'Tax Prep'],
      status: 'new',
      path: '/accounting/dashboard'
    },
    {
      id: 'inventory',
      name: 'MyInventory',
      description: 'Advanced stock control and warehouse management.',
      icon: Package,
      color: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-500',
      features: ['Multi-warehouse', 'Stock Transfer', 'Supplier Portal'],
      status: 'new',
      path: '/inventory/dashboard'
    },
    {
      id: 'medsos',
      name: 'MyMedsos',
      description: 'Manage your social media presence and engagement.',
      icon: Share2,
      color: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-500',
      features: ['Post Scheduling', 'Analytics', 'Auto-Reply'],
      status: 'new',
      path: '/medsos/dashboard'
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-500' : 'bg-emerald-600'}`}>
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>MyPOS</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-white text-gray-600 hover:bg-gray-100 shadow'}`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-3">
              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name || 'User'}</span>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Owner</span>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-medium">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Welcome back, {user?.name || 'User'}
            </h1>
            <div className="flex items-center gap-3">
              <span className="bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                OWNER
              </span>
              <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Choose a module to continue</span>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                <Clock className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Last login: Today at 09:45 AM</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <div className={`px-6 py-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Active Users</p>
              <p className="text-2xl font-bold text-emerald-500">8</p>
            </div>
            <div className={`px-6 py-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Outlets</p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>2</p>
            </div>
          </div>
        </div>

        {/* Module Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {modules.map((module) => (
            <div
              key={module.id}
              className={`rounded-2xl p-6 transition-all hover:scale-[1.02] cursor-pointer ${isDark ? 'bg-slate-800 border border-slate-700 hover:border-slate-600' : 'bg-white shadow-lg hover:shadow-xl'}`}
              onClick={() => navigate(module.path)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${module.iconBg}`}>
                  <module.icon className="w-7 h-7 text-white" />
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  module.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-yellow-500/20 text-yellow-400 flex items-center gap-1'
                }`}>
                  {module.status === 'new' && <Star className="w-3 h-3" />}
                  {module.status === 'active' ? '● ACTIVE' : 'NEW'}
                </span>
              </div>

              <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {module.name}
              </h3>
              <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {module.description}
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-6">
                {module.features.map((feature, idx) => (
                  <span
                    key={idx}
                    className={`text-sm px-3 py-1 rounded-full ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* Access Button */}
              <button className={`w-full py-3 rounded-xl font-medium flex items-center justify-between px-4 transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}>
                Access Module
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Coming Soon Section Removed */}
      </div>

      {/* Footer / Logout */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? 'bg-slate-800 text-gray-300 hover:bg-slate-700' : 'bg-white text-gray-600 hover:bg-gray-100 shadow'}`}
        >
          Logout
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
