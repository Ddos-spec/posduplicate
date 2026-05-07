import { Link, useLocation } from 'react-router-dom';
import { Building2, Calculator, LayoutDashboard, Package, Share2, ShieldCheck, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSuperAdminTenantStore } from '../../store/superAdminTenantStore';

export default function SuperAdminTenantBar() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { selectedTenant, clearSelectedTenant } = useSuperAdminTenantStore();

  const roleName = (user?.roles?.name || user?.role?.name || '').toLowerCase();
  const isSuperAdmin = roleName === 'super admin' || roleName === 'super_admin';

  if (!isSuperAdmin) {
    return null;
  }

  if (['/login', '/admin/login'].includes(location.pathname) || location.pathname.startsWith('/demo')) {
    return null;
  }

  if (!selectedTenant) {
    return (
      <div className="fixed bottom-4 left-1/2 z-[60] w-[min(96vw,760px)] -translate-x-1/2 rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">Tenant context belum dipilih</p>
              <p className="text-sm text-amber-800">
                Pilih tenant dari Omni Console supaya semua modul dibuka langsung dengan data tenant yang sama.
              </p>
            </div>
          </div>
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Buka Omni Console
          </Link>
        </div>
      </div>
    );
  }

  const moduleLinks = [
    { to: '/admin/dashboard', label: 'Console', icon: LayoutDashboard },
    { to: '/owner/dashboard', label: 'MyPOS', icon: Building2 },
    { to: '/accounting/dashboard', label: 'MyAkuntan', icon: Calculator },
    { to: '/inventory/dashboard', label: 'MyInventory', icon: Package },
    { to: '/medsos/dashboard', label: 'MyCommerSocial', icon: Share2 },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] w-[min(98vw,1240px)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900">Tenant aktif: {selectedTenant.businessName}</p>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                ID {selectedTenant.id}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Semua modul yang dibuka sekarang akan memakai tenant ini tanpa perlu login ulang.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex flex-wrap items-center gap-2">
            {moduleLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  location.pathname === item.to || location.pathname.startsWith(item.to + '/')
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={clearSelectedTenant}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-rose-200 hover:text-rose-600"
          >
            <X className="h-4 w-4" />
            Lepas tenant
          </button>
        </div>
      </div>
    </div>
  );
}
