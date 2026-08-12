import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Construction,
  Layers,
  Loader2,
  Lock,
  LogOut,
  Moon,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useTenantProfileStore } from '../store/tenantProfileStore';
import OmnipilotBrand, { OmnipilotMark } from '../components/branding/OmnipilotBrand';
import { normalizeTenantModules } from '../utils/tenantModules';
import {
  LIVE_SUITE_APP_COUNT,
  PARTIAL_SUITE_APP_COUNT,
  SUITE_APPS,
  SUITE_APP_COUNT,
  SUITE_CATEGORIES,
} from '../config/suiteCatalog';
import type { SuiteCategoryId, SuiteImplementationStatus } from '../config/suiteCatalog';

const statusStyles: Record<SuiteImplementationStatus, string> = {
  live: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  blueprint: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const statusLabels: Record<SuiteImplementationStatus, string> = {
  live: 'LIVE',
  partial: 'IN PROGRESS',
  blueprint: 'BLUEPRINT',
};

const ROUTE_ALIASES: Record<string, string> = {
  '/medsos/customers': '/medsos/crm',
  '/medsos/broadcast': '/medsos/broadcasts',
  '/medsos/auto-reply': '/medsos/automations',
  '/inventory/recipe-simulation': '/inventory/recipe',
};

export default function ModuleSelectorPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { tenant, loading, fetchMyTenant, loadedTenantId } = useTenantProfileStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | SuiteCategoryId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | SuiteImplementationStatus>('all');

  const roleName = (user?.roles?.name || user?.role?.name || '').toLowerCase();
  const isSuperAdmin = roleName === 'super admin' || roleName === 'super_admin' || roleName === 'admin';
  const tenantId = user?.tenant?.id ?? user?.tenant_id ?? null;

  useEffect(() => {
    if (!isSuperAdmin && tenantId && loadedTenantId !== tenantId) {
      void fetchMyTenant();
    }
  }, [fetchMyTenant, isSuperAdmin, loadedTenantId, tenantId]);

  const enabledModules = useMemo(() => {
    if (isSuperAdmin) return normalizeTenantModules(null);
    return normalizeTenantModules(tenant?.features ?? null);
  }, [isSuperAdmin, tenant?.features]);

  const accessibleApps = useMemo(
    () => SUITE_APPS.filter((app) => isSuperAdmin || enabledModules[app.bundle]),
    [enabledModules, isSuperAdmin]
  );

  const filteredApps = useMemo(() => {
    const query = search.trim().toLowerCase();
    return accessibleApps.filter((app) => {
      if (activeCategory !== 'all' && app.category !== activeCategory) return false;
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      if (!query) return true;
      return [app.name, app.shortName, app.description, ...app.capabilities]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [accessibleApps, activeCategory, search, statusFilter]);

  const visibleGroups = useMemo(
    () => SUITE_CATEGORIES.map((category) => ({
      ...category,
      apps: filteredApps.filter((app) => app.category === category.id),
    })).filter((category) => category.apps.length > 0),
    [filteredApps]
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const resetFilters = () => {
    setSearch('');
    setActiveCategory('all');
    setStatusFilter('all');
  };

  if (!isSuperAdmin && tenantId && loading && loadedTenantId !== tenantId) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-500" />
          <p className={`mt-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Menyiapkan suite bisnis tenant...</p>
        </div>
      </div>
    );
  }

  const accessibleLiveCount = accessibleApps.filter((app) => app.status === 'live').length;
  const accessiblePartialCount = accessibleApps.filter((app) => app.status === 'partial').length;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${isDark ? 'border-slate-800 bg-slate-950/90' : 'border-slate-200 bg-white/90'}`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <OmnipilotBrand
              markSize={42}
              titleClassName={isDark ? 'text-white text-xl' : 'text-slate-900 text-xl'}
              subtitleClassName={isDark ? 'text-cyan-300/80' : 'text-cyan-600'}
              subtitle="Business Operating Suite"
            />
            <div className={`hidden lg:flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${isDark ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
              <Layers className="w-3.5 h-3.5" />
              {SUITE_APP_COUNT} apps · {SUITE_CATEGORIES.length} categories
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition ${isDark ? 'border-slate-700 bg-slate-900 text-amber-300 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold truncate max-w-40">{user?.name || 'User'}</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isSuperAdmin ? 'Super Admin' : 'Owner'}</p>
            </div>
            <button
              onClick={handleLogout}
              className={`p-2.5 rounded-xl border transition ${isDark ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className={`relative overflow-hidden rounded-3xl border p-6 lg:p-8 mb-6 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'}`}>
          <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute right-32 -bottom-32 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative grid xl:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <OmnipilotMark size={38} />
                <span className={`text-xs font-bold tracking-[0.18em] uppercase ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>OmniPilot Suite 2.0</span>
              </div>
              <h1 className="text-3xl lg:text-5xl font-black tracking-tight max-w-4xl">
                Satu operating system untuk seluruh proses bisnis.
              </h1>
              <p className={`mt-4 max-w-3xl text-base lg:text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Taxonomy aplikasi diperluas mengikuti breadth Odoo, lalu dipadukan dengan kekuatan lokal OmniPilot: POS, akuntansi, inventory, marketplace, WhatsApp, social commerce, dan AI.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 px-3 py-1.5 text-xs font-semibold">{LIVE_SUITE_APP_COUNT} live core</span>
                <span className="rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-1.5 text-xs font-semibold">{PARTIAL_SUITE_APP_COUNT} in progress</span>
                <span className="rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1.5 text-xs font-semibold">Indonesia-first commerce</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ['Accessible Apps', accessibleApps.length, Sparkles],
                ['Live Now', accessibleLiveCount, CheckCircle2],
                ['In Progress', accessiblePartialCount, Construction],
                ['Categories', SUITE_CATEGORIES.length, Layers],
              ].map(([label, value, Icon]) => {
                const MetricIcon = Icon as typeof Sparkles;
                return (
                  <div key={String(label)} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
                    <MetricIcon className={`w-5 h-5 mb-3 ${isDark ? 'text-cyan-300' : 'text-blue-600'}`} />
                    <p className="text-2xl lg:text-3xl font-black">{String(value)}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{String(label)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className={`sticky top-[77px] z-30 rounded-2xl border p-3 mb-8 backdrop-blur-xl ${isDark ? 'border-slate-800 bg-slate-950/92' : 'border-slate-200 bg-white/92 shadow-sm'}`}>
          <div className="flex flex-col xl:flex-row gap-3">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari CRM, payroll, quality, WhatsApp, forecast..."
                className={`w-full rounded-xl border py-2.5 pl-10 pr-10 outline-none transition focus:ring-2 focus:ring-blue-500/30 ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400'}`}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>

            <select
              value={activeCategory}
              onChange={(event) => setActiveCategory(event.target.value as 'all' | SuiteCategoryId)}
              className={`rounded-xl border px-3 py-2.5 text-sm outline-none ${isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
            >
              <option value="all">All categories</option>
              {SUITE_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | SuiteImplementationStatus)}
              className={`rounded-xl border px-3 py-2.5 text-sm outline-none ${isDark ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
            >
              <option value="all">All statuses</option>
              <option value="live">Live</option>
              <option value="partial">In progress</option>
              <option value="blueprint">Blueprint</option>
            </select>
          </div>
        </section>

        {visibleGroups.length === 0 ? (
          <div className={`rounded-3xl border py-20 text-center ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <Search className="w-10 h-10 mx-auto text-slate-400 mb-4" />
            <h2 className="text-xl font-bold">App tidak ditemukan</h2>
            <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ubah pencarian atau filter kategori.</p>
            <button onClick={resetFilters} className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Reset filter</button>
          </div>
        ) : (
          <div className="space-y-10">
            {visibleGroups.map((category) => (
              <section key={category.id}>
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl lg:text-2xl font-black">{category.name}</h2>
                      <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{category.apps.length}</span>
                    </div>
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{category.description}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {category.apps.map((app) => {
                    const Icon = app.icon;
                    const resolvedPath = app.path ? (ROUTE_ALIASES[app.path] || app.path) : undefined;
                    const requiresAdmin = resolvedPath?.startsWith('/admin/') === true;
                    const canOpen = Boolean(resolvedPath && (!requiresAdmin || isSuperAdmin));

                    return (
                      <article key={app.id} className={`group rounded-2xl border p-5 transition-all ${isDark ? 'border-slate-800 bg-slate-900 hover:border-slate-700' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-lg'}`}>
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <Icon className={`w-5 h-5 ${isDark ? 'text-cyan-300' : 'text-blue-600'}`} />
                          </div>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {app.localFirst && <span className="rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-600 dark:text-red-300">ID LOCAL</span>}
                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusStyles[app.status]}`}>{statusLabels[app.status]}</span>
                          </div>
                        </div>

                        <h3 className="text-base font-bold">{app.name}</h3>
                        <p className={`mt-2 text-sm leading-relaxed min-h-[60px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{app.description}</p>

                        <div className="mt-4 flex flex-wrap gap-1.5 min-h-[54px] content-start">
                          {app.capabilities.slice(0, 4).map((capability) => (
                            <span key={capability} className={`rounded-lg px-2 py-1 text-[11px] ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{capability}</span>
                          ))}
                        </div>

                        <button
                          onClick={() => canOpen && resolvedPath && navigate(resolvedPath)}
                          disabled={!canOpen}
                          className={`mt-5 w-full rounded-xl px-3 py-2.5 text-sm font-semibold flex items-center justify-between transition ${
                            canOpen
                              ? isDark
                                ? 'bg-slate-800 text-white hover:bg-slate-700'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                              : isDark
                                ? 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                                : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {canOpen ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            {canOpen ? 'Open workspace' : requiresAdmin ? 'Admin only' : 'Architecture queued'}
                          </span>
                          {canOpen ? <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /> : <Construction className="w-4 h-4" />}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <footer className={`mt-12 border-t py-8 text-xs flex flex-col md:flex-row gap-3 justify-between ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
          <span>OmniPilot Business Operating Suite · branch feat/odoo-complete-suite</span>
          <span>Live features remain tenant-gated. Blueprint apps are intentionally not presented as production-ready.</span>
        </footer>
      </main>
    </div>
  );
}
