import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Activity,
  ArrowRight,
  Building2,
  Calculator,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Package,
  Search,
  Share2,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import { tenantService, type Tenant } from '../../services/tenantService';
import { myCommerSocialAdminService, type MyCommerSocialAdminTenantDetail } from '../../services/myCommerSocialAdminService';
import { useSuperAdminTenantStore } from '../../store/superAdminTenantStore';
import { getEnabledModuleLabels } from '../../utils/tenantModules';

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
});

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
    return error.response.data.error.message as string;
  }
  return fallback;
}

export default function SuperAdminOmniPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mcsDetail, setMcsDetail] = useState<MyCommerSocialAdminTenantDetail | null>(null);
  const { selectedTenant, setSelectedTenant, clearSelectedTenant } = useSuperAdminTenantStore();

  const selectedTenantRecord = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenant?.id) || null,
    [tenants, selectedTenant?.id]
  );

  const filteredTenants = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return tenants;
    return tenants.filter((tenant) =>
      [tenant.businessName, tenant.ownerName, tenant.email]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword))
    );
  }, [search, tenants]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await tenantService.getAll();
        setTenants(result.data);
      } catch (error) {
        toast.error(getErrorMessage(error, 'Gagal memuat tenant untuk omni console.'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!selectedTenant?.id) {
      setMcsDetail(null);
      return;
    }

    const loadMcs = async () => {
      try {
        setDetailLoading(true);
        const detail = await myCommerSocialAdminService.getTenantDetail(selectedTenant.id);
        setMcsDetail(detail);
      } catch (error) {
        toast.error(getErrorMessage(error, 'Gagal memuat detail tenant terpilih.'));
      } finally {
        setDetailLoading(false);
      }
    };

    void loadMcs();
  }, [selectedTenant?.id]);

  const moduleCards = [
    {
      title: 'MyPOS',
      description: 'Operasional kasir, outlet, transaksi, dan laporan owner.',
      to: '/owner/dashboard',
      icon: Building2,
      accent: 'bg-emerald-100 text-emerald-600',
    },
    {
      title: 'MyAkuntan',
      description: 'Jurnal, ledger, AP/AR, budget, dan laporan keuangan.',
      to: '/accounting/dashboard',
      icon: Calculator,
      accent: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'MyInventory',
      description: 'Stok, reorder, forecast, simulasi recipe, dan analytics.',
      to: '/inventory/dashboard',
      icon: Package,
      accent: 'bg-orange-100 text-orange-600',
    },
    {
      title: 'MyCommerSocial',
      description: 'WA Inbox, social media, ads, dan pengelolaan channel.',
      to: '/medsos/dashboard',
      icon: Share2,
      accent: 'bg-blue-100 text-blue-600',
    },
  ];

  return (
    <div className="space-y-6 pb-28">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white mb-3">
            <ShieldCheck className="h-4 w-4" />
            Super admin omni console
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Omni Console</h1>
          <p className="mt-2 max-w-4xl text-gray-600">
            Pilih satu tenant, lalu buka semua modul dari satu login. Setelah tenant dipilih, semua request modul akan otomatis memakai tenant yang sama sampai kamu ganti lagi.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/tenants"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700"
          >
            <Users className="h-4 w-4" />
            Tenant Management
          </Link>
          <Link
            to="/admin/analytics"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700"
          >
            <Activity className="h-4 w-4" />
            System Analytics
          </Link>
          <Link
            to="/admin/billing"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700"
          >
            <CreditCard className="h-4 w-4" />
            Billing
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr,1.35fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tenant switcher</h2>
              <p className="mt-1 text-sm text-gray-500">
                Pilih tenant yang ingin dikelola. Pilihan ini berlaku ke MyPOS, MyAkuntan, MyInventory, dan MyCommerSocial.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {tenants.length} tenant
            </span>
          </div>

          <div className="mt-4 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari tenant, owner, atau email"
              className="w-full rounded-2xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-300 px-4 py-16 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="ml-3">Memuat tenant...</span>
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-16 text-center text-gray-500">
                Tidak ada tenant yang cocok dengan pencarian.
              </div>
            ) : (
              filteredTenants.map((tenant) => {
                const selected = selectedTenant?.id === tenant.id;
                const enabledModules = getEnabledModuleLabels(tenant.features);

                return (
                  <button
                    key={tenant.id}
                    type="button"
                    onClick={() =>
                      setSelectedTenant({
                        id: tenant.id,
                        businessName: tenant.businessName,
                        ownerName: tenant.ownerName,
                        email: tenant.email,
                      })
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected
                        ? 'border-blue-400 bg-blue-50/50'
                        : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900">{tenant.businessName}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            tenant.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {tenant.isActive ? tenant.subscriptionStatus : 'inactive'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{tenant.ownerName} • {tenant.email}</p>
                      </div>
                      {selected ? <CheckCircle2 className="h-5 w-5 text-blue-600" /> : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {enabledModules.map((module) => (
                        <span key={`${tenant.id}-${module}`} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                          {module}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            {!selectedTenant ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                <ShieldCheck className="h-10 w-10 text-gray-300" />
                <h2 className="mt-4 text-xl font-semibold text-gray-900">Pilih tenant dulu</h2>
                <p className="mt-2 max-w-lg text-sm text-gray-500">
                  Setelah tenant dipilih, kamu bisa buka semua modul langsung tanpa login ulang. Tenant context juga dipakai oleh panel MyCommerSocial dan modul bisnis lainnya.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold text-gray-900">{selectedTenant.businessName}</h2>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        Tenant aktif
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      {selectedTenant.ownerName || '-'} • {selectedTenant.email || '-'}
                    </p>
                    {selectedTenantRecord ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {getEnabledModuleLabels(selectedTenantRecord.features).map((module) => (
                          <span key={module} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                            {module}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedTenant}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:border-rose-200 hover:text-rose-600"
                  >
                    Lepas tenant
                  </button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Plan</p>
                    <p className="mt-2 text-xl font-bold text-gray-900">{selectedTenantRecord?.subscriptionPlan || '-'}</p>
                    <p className="mt-1 text-sm text-gray-500">{selectedTenantRecord?.subscriptionStatus || '-'}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Outlets</p>
                    <p className="mt-2 text-xl font-bold text-gray-900">{selectedTenantRecord?.maxOutlets || 0}</p>
                    <p className="mt-1 text-sm text-gray-500">Batas outlet tenant</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Users</p>
                    <p className="mt-2 text-xl font-bold text-gray-900">{selectedTenantRecord?.maxUsers || 0}</p>
                    <p className="mt-1 text-sm text-gray-500">Batas user tenant</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Modules</p>
                    <p className="mt-2 text-xl font-bold text-gray-900">{selectedTenantRecord ? getEnabledModuleLabels(selectedTenantRecord.features).length : 0}</p>
                    <p className="mt-1 text-sm text-gray-500">Modul aktif untuk tenant ini</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {moduleCards.map((module) => (
              <div key={module.title} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className={`rounded-2xl p-3 ${module.accent}`}>
                    <module.icon className="h-5 w-5" />
                  </div>
                  <Link
                    to={module.to}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      selectedTenant
                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none'
                    }`}
                  >
                    Buka
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{module.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{module.description}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Channel status</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Ringkasan cepat status WA, social workspace, dan paket MyCommerSocial tenant yang sedang dipilih.
                  </p>
                </div>
                <Link
                  to={selectedTenant ? `/admin/mycommersocial?tenantId=${selectedTenant.id}` : '/admin/mycommersocial'}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${
                    selectedTenant
                      ? 'border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-700'
                      : 'border-gray-100 text-gray-300 pointer-events-none'
                  }`}
                >
                  Detail channel
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>

              {detailLoading ? (
                <div className="mt-5 flex items-center text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="ml-3">Memuat detail channel...</span>
                </div>
              ) : !selectedTenant ? (
                <div className="mt-5 rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                  Pilih tenant untuk melihat status WA dan social workspace.
                </div>
              ) : !mcsDetail ? (
                <div className="mt-5 rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                  Detail channel belum tersedia.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Paket internal</p>
                      <p className="mt-2 text-lg font-bold text-gray-900">{mcsDetail.config.planName}</p>
                      <p className="mt-1 text-sm text-gray-500">{currencyFormatter.format(mcsDetail.config.monthlyPrice)}/bulan</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-400">WA Inbox</p>
                      <p className="mt-2 text-lg font-bold text-gray-900">{mcsDetail.workspace.waStatusLabel}</p>
                      <p className="mt-1 text-sm text-gray-500">{mcsDetail.workspace.waWorkspaceName || 'Belum ada workspace'}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Social workspace</p>
                      <p className="mt-2 text-lg font-bold text-gray-900">{mcsDetail.workspace.zernioProfileReady ? 'Siap' : 'Belum siap'}</p>
                      <p className="mt-1 text-sm text-gray-500">{mcsDetail.workspace.zernioProfileId || 'Belum ada profile'}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Ads account</p>
                      <p className="mt-2 text-lg font-bold text-gray-900">{mcsDetail.adsAccounts.length}/{mcsDetail.config.maxAdsAccounts}</p>
                      <p className="mt-1 text-sm text-gray-500">Connected via social workspace</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-200 p-4">
                      <p className="text-sm font-semibold text-gray-900">Social accounts</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {mcsDetail.socialAccounts.length ? (
                          mcsDetail.socialAccounts.map((account) => (
                            <span key={account.id} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                              {account.displayName || account.username || account.platform}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">Belum ada akun social terhubung.</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 p-4">
                      <p className="text-sm font-semibold text-gray-900">Connector summary</p>
                      <div className="mt-3 space-y-2 text-sm text-gray-600">
                        {mcsDetail.integrationHub.connectors.map((connector) => (
                          <div key={connector.slug} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
                            <span>{connector.name}</span>
                            <span className="font-medium text-gray-900">{connector.statusLabel}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <WalletCards className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-900">Cara kerja</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Pilih tenant sekali dari Omni Console.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Semua route modul memakai tenant context yang sama otomatis.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Kalau perlu ganti tenant, cukup pilih tenant lain. Tidak perlu login ulang.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>Untuk MyCommerSocial, paket 500K atau 1JT diatur dari quota internal per tenant.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
