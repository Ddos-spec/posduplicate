import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useTenantProfileStore } from '../store/tenantProfileStore';
import MyCommerSocialLogo from '../components/medsos/MyCommerSocialLogo';
import { normalizeTenantModules } from '../utils/tenantModules';
import {
  Calculator, Package,
  ArrowRight, LogOut, Clock, Sun, Moon, Star,
  Share2, Loader2, Store, ReceiptText
} from 'lucide-react';

function MyPosBrandMark({
  size = 44,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const storeSize = Math.max(18, Math.round(size * 0.46));
  const receiptSize = Math.max(10, Math.round(size * 0.22));

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white shadow-[0_18px_38px_rgba(16,185,129,0.28)] ring-1 ring-white/20 ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.4),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.18),transparent_36%)]" />
      <div className="absolute inset-[1px] rounded-[15px] border border-white/12" />
      <Store
        size={storeSize}
        strokeWidth={2.15}
        className="drop-shadow-[0_4px_10px_rgba(15,23,42,0.22)]"
      />
      <div className="absolute bottom-[12%] right-[10%] rounded-full bg-slate-950/22 p-1 ring-2 ring-white/30 backdrop-blur-sm">
        <ReceiptText size={receiptSize} strokeWidth={2.3} />
      </div>
    </div>
  );
}

export default function ModuleSelectorPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { tenant, loading, fetchMyTenant, loadedTenantId } = useTenantProfileStore();
  const roleName = (user?.roles?.name || user?.role?.name || '').toLowerCase();
  const isSuperAdmin = roleName === 'super admin' || roleName === 'super_admin' || roleName === 'admin';
  const tenantId = user?.tenant?.id ?? user?.tenant_id ?? null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (!isSuperAdmin && tenantId && loadedTenantId !== tenantId) {
      void fetchMyTenant();
    }
  }, [fetchMyTenant, isSuperAdmin, loadedTenantId, tenantId]);

  const enabledModules = useMemo(() => {
    if (isSuperAdmin) {
      return normalizeTenantModules(null);
    }

    return normalizeTenantModules(tenant?.features ?? null);
  }, [isSuperAdmin, tenant?.features]);

  const modules = [
    {
      id: 'pos',
      name: 'MyPOS',
      description: 'Comprehensive point of sale solution for your retail outlets.',
      icon: Store,
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
      name: 'MyCommerSocial',
      description: 'Workspace untuk WA Inbox, social media, dan ads yang dikelola dari satu command center.',
      icon: Share2,
      customLogo: true,
      color: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-500',
      features: ['WA Inbox', 'Social Workspace', 'Ads Workspace'],
      status: 'new',
      path: '/medsos/dashboard'
    }
  ].filter((module) => {
    if (isSuperAdmin) return true;
    if (module.id === 'pos') return enabledModules.pos;
    if (module.id === 'accounting') return enabledModules.accounting;
    if (module.id === 'inventory') return enabledModules.inventory;
    if (module.id === 'medsos') return enabledModules.commerSocial;
    return true;
  });

  if (!isSuperAdmin && tenantId && loading && loadedTenantId !== tenantId) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-500" />
          <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Menyiapkan akses modul tenant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <MyPosBrandMark size={46} />
            <div>
              <span className={`block text-xl font-bold leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>MyPOS</span>
              <span className={`mt-1 block text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? 'text-emerald-300/85' : 'text-emerald-600'}`}>
                Retail Command
              </span>
            </div>
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
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{isSuperAdmin ? 'Super Admin' : 'Owner'}</span>
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
                {isSuperAdmin ? 'SUPER ADMIN' : 'OWNER'}
              </span>
              <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {isSuperAdmin ? 'Akses semua modul aktif untuk tenant ini' : 'Choose a module to continue'}
              </span>
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
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden ${module.id === 'medsos' || module.id === 'pos' ? '' : module.iconBg}`}>
                  {module.id === 'medsos'
                    ? <MyCommerSocialLogo size={56} />
                    : module.id === 'pos'
                      ? <MyPosBrandMark size={56} />
                      : <module.icon className="w-7 h-7 text-white" />}
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

        {!modules.length && (
          <div className={`rounded-2xl p-8 text-center ${isDark ? 'bg-slate-800 border border-slate-700 text-gray-300' : 'bg-white shadow text-gray-600'}`}>
            Tenant ini belum memiliki modul aktif. Minta super admin mengaktifkan produk dari Tenant Management.
          </div>
        )}

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

