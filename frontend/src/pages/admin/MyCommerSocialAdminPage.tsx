import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowUpRight,
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  MessageSquareShare,
  PackageOpen,
  RefreshCcw,
  Search,
  Settings2,
  ShieldCheck,
  Share2,
  UserRoundCog,
  Users,
  WalletCards,
  XCircle,
} from 'lucide-react';
import FieldHelp from '../../components/medsos/FieldHelp';
import { PlatformBadge } from '../../components/medsos/PlatformBadge';
import {
  myCommerSocialAdminService,
  type MyCommerSocialAdminConfig,
  type MyCommerSocialAdminListResponse,
  type MyCommerSocialAdminTenantDetail,
} from '../../services/myCommerSocialAdminService';

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
});

const planPresets: Array<{
  key: string;
  label: string;
  description: string;
  monthlyPrice: number;
  maxProfiles: number;
  maxSocialAccounts: number;
  maxAdsAccounts: number;
  maxTeamSeats: number;
}> = [
  {
    key: 'starter',
    label: 'Starter 500K',
    description: 'Untuk brand tunggal yang butuh WA + social + ads dasar.',
    monthlyPrice: 500000,
    maxProfiles: 1,
    maxSocialAccounts: 3,
    maxAdsAccounts: 1,
    maxTeamSeats: 2,
  },
  {
    key: 'growth',
    label: 'Growth 1JT',
    description: 'Untuk tim yang butuh lebih banyak channel dan seat.',
    monthlyPrice: 1000000,
    maxProfiles: 1,
    maxSocialAccounts: 10,
    maxAdsAccounts: 3,
    maxTeamSeats: 5,
  },
  {
    key: 'scale',
    label: 'Scale',
    description: 'Untuk kebutuhan besar dengan limit lebih longgar.',
    monthlyPrice: 2000000,
    maxProfiles: 3,
    maxSocialAccounts: 20,
    maxAdsAccounts: 8,
    maxTeamSeats: 12,
  },
];

const defaultListResponse: MyCommerSocialAdminListResponse = {
  summary: {
    totalTenants: 0,
    moduleEnabledTenants: 0,
    zernioProfileReadyTenants: 0,
    waConnectedTenants: 0,
    estimatedMrr: 0,
  },
  items: [],
};

function formatDateTime(value?: string | null) {
  if (!value) return 'Belum ada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('id-ID');
}

function getStatusTone(status: string) {
  switch (status) {
    case 'connected':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'syncing':
    case 'pending_user_action':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'degraded':
    case 'action_required':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
    return error.response.data.error.message as string;
  }
  return fallback;
}

function buildConfigForm(detail: MyCommerSocialAdminTenantDetail) {
  return {
    moduleEnabled: detail.moduleEnabled,
    planName: detail.config.planName,
    monthlyPrice: detail.config.monthlyPrice,
    billingMode: detail.config.billingMode,
    maxProfiles: detail.config.maxProfiles,
    maxSocialAccounts: detail.config.maxSocialAccounts,
    maxAdsAccounts: detail.config.maxAdsAccounts,
    maxTeamSeats: detail.config.maxTeamSeats,
    waInboxEnabled: detail.config.waInboxEnabled,
    socialAdsEnabled: detail.config.socialAdsEnabled,
    marketplaceEnabled: detail.config.marketplaceEnabled,
    autoCreateZernioProfile: detail.config.autoCreateZernioProfile,
    notes: detail.config.notes,
  };
}

type ConfigFormState = MyCommerSocialAdminConfig & { moduleEnabled: boolean };

export default function MyCommerSocialAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listState, setListState] = useState<MyCommerSocialAdminListResponse>(defaultListResponse);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ensuringProfile, setEnsuringProfile] = useState(false);
  const [syncingSlug, setSyncingSlug] = useState<string | null>(null);
  const [moduleStatus, setModuleStatus] = useState(searchParams.get('moduleStatus') || 'enabled');
  const [planFilter, setPlanFilter] = useState(searchParams.get('plan') || 'all');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(() => {
    const raw = searchParams.get('tenantId');
    return raw ? Number(raw) : null;
  });
  const [detail, setDetail] = useState<MyCommerSocialAdminTenantDetail | null>(null);
  const [form, setForm] = useState<ConfigFormState | null>(null);

  const loadList = async (params?: { focusTenantId?: number | null }) => {
    try {
      setLoading(true);
      const data = await myCommerSocialAdminService.getTenants({
        search: search || undefined,
        moduleStatus,
        plan: planFilter,
      });
      setListState(data);

      const focusTenantId = params?.focusTenantId ?? selectedTenantId;
      if (focusTenantId) {
        const exists = data.items.some((item) => item.id === focusTenantId);
        if (!exists) {
          setSelectedTenantId(null);
          setDetail(null);
          setForm(null);
        }
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Gagal memuat daftar tenant MyCommerSocial.'));
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (tenantId: number) => {
    try {
      setDetailLoading(true);
      const data = await myCommerSocialAdminService.getTenantDetail(tenantId);
      setDetail(data);
      setForm(buildConfigForm(data));
      setSelectedTenantId(tenantId);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tenantId', String(tenantId));
      setSearchParams(nextParams, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Gagal memuat detail tenant MyCommerSocial.'));
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const rawTenantId = searchParams.get('tenantId');
    const tenantId = rawTenantId ? Number(rawTenantId) : null;
    if (tenantId && Number.isFinite(tenantId)) {
      void loadDetail(tenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPreset = useMemo(
    () => planPresets.find((preset) => preset.key === form?.planName) || null,
    [form?.planName]
  );

  const applyPreset = (presetKey: string) => {
    if (!form) return;
    const preset = planPresets.find((item) => item.key === presetKey);
    if (!preset) return;

    setForm({
      ...form,
      planName: preset.key,
      monthlyPrice: preset.monthlyPrice,
      maxProfiles: preset.maxProfiles,
      maxSocialAccounts: preset.maxSocialAccounts,
      maxAdsAccounts: preset.maxAdsAccounts,
      maxTeamSeats: preset.maxTeamSeats,
    });
  };

  const handleRefresh = async () => {
    await loadList();
    if (selectedTenantId) {
      await loadDetail(selectedTenantId);
    }
  };

  const handleSave = async () => {
    if (!detail || !form) return;

    try {
      setSaving(true);
      const updated = await myCommerSocialAdminService.updateTenantConfig(detail.id, form);
      setDetail(updated);
      setForm(buildConfigForm(updated));
      await loadList({ focusTenantId: updated.id });
      toast.success('Konfigurasi MyCommerSocial berhasil diperbarui.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Gagal menyimpan konfigurasi MyCommerSocial.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEnsureProfile = async () => {
    if (!detail) return;

    try {
      setEnsuringProfile(true);
      const data = await myCommerSocialAdminService.ensureProfile(detail.id);
      setDetail(data.detail);
      setForm(buildConfigForm(data.detail));
      await loadList({ focusTenantId: detail.id });
      toast.success(`Profile Zernio siap: ${data.profileId}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Gagal menyiapkan profile Zernio.'));
    } finally {
      setEnsuringProfile(false);
    }
  };

  const handleSyncConnector = async (slug: 'social-hub' | 'marketplace-hub' | 'meta-ads-hub') => {
    if (!detail) return;

    try {
      setSyncingSlug(slug);
      const data = await myCommerSocialAdminService.syncConnector(detail.id, slug);
      setDetail(data.detail);
      setForm(buildConfigForm(data.detail));
      await loadList({ focusTenantId: detail.id });
      toast.success('Status connector diperbarui.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Gagal menyegarkan status connector.'));
    } finally {
      setSyncingSlug(null);
    }
  };

  const visibleTenants = listState.items;

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 mb-3">
            <Share2 className="w-4 h-4" />
            MyCommerSocial control tower
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MyCommerSocial Ops</h1>
          <p className="text-gray-600 mt-2 max-w-4xl">
            Kelola paket, limit, workspace WA, dan profile Zernio per tenant dari satu panel. Model yang dipakai:
            <span className="font-medium text-gray-800"> satu tenant = satu profile Zernio</span>, lalu harga dibedakan lewat quota internal seperti 500K atau 1JT.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700"
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh data
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Enabled</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">{listState.summary.moduleEnabledTenants}</p>
          <p className="mt-2 text-sm text-gray-500">Tenant dengan modul aktif</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Profiles</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">{listState.summary.zernioProfileReadyTenants}</p>
          <p className="mt-2 text-sm text-gray-500">Tenant sudah punya profile Zernio</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <MessageSquareShare className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-gray-400">WA</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">{listState.summary.waConnectedTenants}</p>
          <p className="mt-2 text-sm text-gray-500">Workspace WA siap operasional</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
              <WalletCards className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-gray-400">MRR</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">{currencyFormatter.format(listState.summary.estimatedMrr)}</p>
          <p className="mt-2 text-sm text-gray-500">Estimasi revenue modul aktif</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.6fr,0.9fr,0.9fr,auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void loadList();
                }
              }}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Cari tenant, owner, atau email"
            />
          </div>

          <select
            value={moduleStatus}
            onChange={(event) => setModuleStatus(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Semua tenant</option>
            <option value="enabled">Modul aktif</option>
            <option value="disabled">Modul nonaktif</option>
          </select>

          <select
            value={planFilter}
            onChange={(event) => setPlanFilter(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Semua plan</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="scale">Scale</option>
            <option value="custom">Custom</option>
          </select>

          <button
            onClick={() => {
              const nextParams = new URLSearchParams(searchParams);
              if (search) nextParams.set('search', search); else nextParams.delete('search');
              if (moduleStatus) nextParams.set('moduleStatus', moduleStatus); else nextParams.delete('moduleStatus');
              if (planFilter) nextParams.set('plan', planFilter); else nextParams.delete('plan');
              setSearchParams(nextParams, { replace: true });
              void loadList();
            }}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Terapkan filter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-20 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Memuat tenant MyCommerSocial...</span>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.05fr,1.35fr]">
          <div className="space-y-4">
            {visibleTenants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center text-gray-500 shadow-sm">
                Belum ada tenant yang cocok dengan filter ini.
              </div>
            ) : (
              visibleTenants.map((tenant) => {
                const isSelected = tenant.id === selectedTenantId;
                return (
                  <button
                    key={tenant.id}
                    type="button"
                    onClick={() => void loadDetail(tenant.id)}
                    className={`w-full rounded-2xl border p-5 text-left shadow-sm transition ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50/40'
                        : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{tenant.businessName}</h3>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            tenant.moduleEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-100 text-gray-500'
                          }`}>
                            {tenant.moduleEnabled ? 'MyCommerSocial aktif' : 'Modul nonaktif'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{tenant.ownerName} • {tenant.email}</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-gray-400" />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Plan internal</p>
                        <p className="mt-2 font-semibold text-gray-900">{tenant.config.planName}</p>
                        <p className="text-sm text-gray-500">{currencyFormatter.format(tenant.config.monthlyPrice)} / bulan</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Workspace</p>
                        <p className="mt-2 text-sm font-medium text-gray-900">
                          {tenant.workspace.waWorkspaceName || 'Belum ada nama workspace'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {tenant.workspace.zernioProfileReady ? 'Profile Zernio siap' : 'Profile Zernio belum siap'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-semibold ${getStatusTone(tenant.workspace.waStatus)}`}>
                        WA • {tenant.workspace.waStatusLabel}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-semibold ${getStatusTone(tenant.workspace.adsStatus)}`}>
                        Ads • {tenant.workspace.adsStatusLabel}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-600">
                        Seats {tenant.config.maxTeamSeats}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-600">
                        Social {tenant.config.maxSocialAccounts}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>{tenant.usage.userCount} user</span>
                      <span>{tenant.usage.outletCount} outlet</span>
                      <span>Sync terakhir: {formatDateTime(tenant.workspace.lastSyncAt)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
            {detailLoading ? (
              <div className="flex min-h-[720px] items-center justify-center px-6 py-20">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">Memuat detail tenant...</span>
              </div>
            ) : !detail || !form ? (
              <div className="flex min-h-[720px] flex-col items-center justify-center px-8 py-20 text-center">
                <Settings2 className="h-10 w-10 text-gray-300" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Pilih tenant untuk dikelola</h3>
                <p className="mt-2 max-w-md text-sm text-gray-500">
                  Panel kanan akan menampilkan paket internal, kesiapan WA, detail Zernio, dan limit yang bisa dibedakan untuk tenant 500K atau 1JT.
                </p>
              </div>
            ) : (
              <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold text-gray-900">{detail.businessName}</h2>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        detail.moduleEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-100 text-gray-500'
                      }`}>
                        {detail.moduleEnabled ? 'Modul aktif' : 'Modul nonaktif'}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        detail.isActive ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-rose-200 bg-rose-50 text-rose-700'
                      }`}>
                        {detail.isActive ? detail.subscriptionStatus : 'inactive'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      {detail.ownerName} • {detail.email}
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                      Sync terakhir: {formatDateTime(detail.workspace.lastSyncAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleEnsureProfile}
                      disabled={ensuringProfile}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {ensuringProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      Pastikan profile Zernio
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeDollarSign className="h-4 w-4" />}
                      Simpan konfigurasi
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Harga internal</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{currencyFormatter.format(form.monthlyPrice)}</p>
                    <p className="mt-1 text-sm text-gray-500">{form.planName} • {form.billingMode}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Quota akun</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{form.maxSocialAccounts}</p>
                    <p className="mt-1 text-sm text-gray-500">Social account via Zernio</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Ads account</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{form.maxAdsAccounts}</p>
                    <p className="mt-1 text-sm text-gray-500">Limit account iklan per tenant</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Team seats</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{form.maxTeamSeats}</p>
                    <p className="mt-1 text-sm text-gray-500">Jumlah operator internal</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Paket & pengaturan internal</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Atur perbedaan tenant 500K vs 1JT dari limit internal. Akun master Zernio tetap satu, isolasinya ada di profile tenant.
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      <UserRoundCog className="h-4 w-4" />
                      Super admin control
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {planPresets.map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => applyPreset(preset.key)}
                        className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                          selectedPreset?.key === preset.key
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:text-blue-700'
                        }`}
                        title={preset.description}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        Modul aktif
                        <FieldHelp title="Modul aktif" description="Jika dimatikan, tenant tidak bisa membuka MyCommerSocial walau data koneksinya masih tersimpan." />
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={form.moduleEnabled}
                          onChange={(event) => setForm({ ...form, moduleEnabled: event.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Tenant boleh mengakses MyCommerSocial</span>
                      </div>
                    </label>

                    <label className="rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        Auto create Zernio profile
                        <FieldHelp title="Auto create profile" description="Saat aktif, save konfigurasi akan memastikan tenant langsung punya profile Zernio sendiri." />
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={form.autoCreateZernioProfile}
                          onChange={(event) => setForm({ ...form, autoCreateZernioProfile: event.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Provision profile otomatis</span>
                      </div>
                    </label>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                        Nama plan
                        <FieldHelp title="Nama plan" description="Nama internal paket tenant. Tidak harus sama dengan pricing vendor." />
                      </label>
                      <input
                        value={form.planName}
                        onChange={(event) => setForm({ ...form, planName: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                        Harga per bulan
                        <FieldHelp title="Harga internal" description="Harga yang dibebankan ke tenant untuk dashboard + alokasi engine. Cocok dipakai untuk skema 500K dan 1JT." />
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.monthlyPrice}
                        onChange={(event) => setForm({ ...form, monthlyPrice: Number(event.target.value || 0) })}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                        Billing mode
                        <FieldHelp title="Billing mode" description="Bundled berarti semua ditagih oleh platform ini. Custom bisa dipakai kalau ada perjanjian khusus." />
                      </label>
                      <select
                        value={form.billingMode}
                        onChange={(event) => setForm({ ...form, billingMode: event.target.value as ConfigFormState['billingMode'] })}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="bundled">Bundled</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                        Max profile
                        <FieldHelp title="Max profile" description="Jumlah brand/workspace Zernio yang boleh dimiliki tenant ini." />
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.maxProfiles}
                        onChange={(event) => setForm({ ...form, maxProfiles: Number(event.target.value || 0) })}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                        Max social account
                        <FieldHelp title="Max social account" description="Batas akun social media per tenant. Limit ini yang membedakan paket murah dan paket premium." />
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.maxSocialAccounts}
                        onChange={(event) => setForm({ ...form, maxSocialAccounts: Number(event.target.value || 0) })}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                        Max ads account
                        <FieldHelp title="Max ads account" description="Berapa account iklan yang boleh ditautkan tenant ke Zernio." />
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.maxAdsAccounts}
                        onChange={(event) => setForm({ ...form, maxAdsAccounts: Number(event.target.value || 0) })}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                        Max team seats
                        <FieldHelp title="Max team seats" description="Jumlah operator/team internal yang boleh aktif di dashboard." />
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.maxTeamSeats}
                        onChange={(event) => setForm({ ...form, maxTeamSeats: Number(event.target.value || 0) })}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4">
                      <input
                        type="checkbox"
                        checked={form.waInboxEnabled}
                        onChange={(event) => setForm({ ...form, waInboxEnabled: event.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          WA Inbox
                          <FieldHelp title="WA Inbox" description="Aktifkan jika tenant boleh menggunakan integrasi Customer Service CRM untuk WhatsApp." />
                        </div>
                        <p className="mt-1 text-sm text-gray-500">Operasional WhatsApp dari produk internal.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4">
                      <input
                        type="checkbox"
                        checked={form.socialAdsEnabled}
                        onChange={(event) => setForm({ ...form, socialAdsEnabled: event.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          Social + Ads via Zernio
                          <FieldHelp title="Social + Ads" description="Jika dimatikan, tenant tidak seharusnya menghubungkan akun social atau ads walau profile Zernio masih ada." />
                        </div>
                        <p className="mt-1 text-sm text-gray-500">Instagram, Facebook, TikTok, LinkedIn, Meta Ads, Google Ads, dan lainnya.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4">
                      <input
                        type="checkbox"
                        checked={form.marketplaceEnabled}
                        onChange={(event) => setForm({ ...form, marketplaceEnabled: event.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          Marketplace
                          <FieldHelp title="Marketplace" description="Saat ini sebaiknya tetap Coming Soon sambil menunggu arah kerja sama dengan Jubelio final." />
                        </div>
                        <p className="mt-1 text-sm text-gray-500">Simpan toggle ini untuk roadmap, bukan untuk live use.</p>
                      </div>
                    </label>
                  </div>

                  <div className="mt-5">
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                      Catatan internal
                      <FieldHelp title="Catatan internal" description="Gunakan untuk pengingat billing, SLA, custom deal, atau kondisi khusus tenant ini." />
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(event) => setForm({ ...form, notes: event.target.value })}
                      rows={4}
                      className="w-full rounded-2xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="Contoh: tenant bayar 1JT, dapat 10 social account, 3 ads account, 5 team seats."
                    />
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
                  <div className="rounded-3xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Connector status</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Super admin bisa memantau koneksi tenant tanpa perlu masuk sebagai user tenant.
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                        <Clock3 className="h-4 w-4" />
                        {detail.integrationHub.summary.connected}/{detail.integrationHub.summary.total} connected
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      {detail.integrationHub.connectors.map((connector) => (
                        <div key={connector.slug} className="rounded-2xl border border-gray-200 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex items-center gap-3">
                                <h4 className="font-semibold text-gray-900">{connector.name}</h4>
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusTone(connector.status)}`}>
                                  {connector.statusLabel}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-gray-500">{connector.description}</p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                {connector.supportedChannels.map((channel) => (
                                  <PlatformBadge key={`${connector.slug}-${channel.brand}`} brand={channel.brand} label={channel.label} size={36} />
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {connector.vendorPortalUrl && (
                                <a
                                  href={connector.vendorPortalUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Portal
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleSyncConnector(connector.slug as 'social-hub' | 'marketplace-hub' | 'meta-ads-hub')}
                                disabled={syncingSlug === connector.slug}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {syncingSlug === connector.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                                Sync
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl bg-gray-50 p-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Workspace</p>
                              <p className="mt-2 text-sm font-medium text-gray-900">{connector.workspaceName || 'Belum diisi'}</p>
                              <p className="text-sm text-gray-500">Updated {formatDateTime(connector.updatedAt)}</p>
                            </div>
                            <div className="rounded-2xl bg-gray-50 p-3">
                              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Connection ref</p>
                              <p className="mt-2 text-sm font-medium text-gray-900">{connector.connectionRefMasked || 'Belum ada'}</p>
                              <p className="text-sm text-gray-500">Sync {formatDateTime(connector.lastSyncAt)}</p>
                            </div>
                          </div>

                          {connector.nextActions.length > 0 && (
                            <ul className="mt-4 space-y-2 text-sm text-gray-600">
                              {connector.nextActions.slice(0, 3).map((action) => (
                                <li key={action} className="flex items-start gap-2">
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border border-gray-200 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Zernio accounts</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Akun tenant ini tetap berada di bawah master account yang sama, tapi dipisah lewat profile per tenant.
                          </p>
                        </div>
                        <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {detail.zernioAccounts.length} connected
                        </div>
                      </div>

                      {detail.zernioSyncError ? (
                        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {detail.zernioSyncError}
                        </div>
                      ) : null}

                      <div className="mt-4 grid gap-3">
                        <div className="rounded-2xl bg-gray-50 p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900">Profile tenant</p>
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          </div>
                          <p className="mt-2 break-all text-sm text-gray-600">{detail.workspace.zernioProfileId || 'Belum ada profile Zernio'}</p>
                        </div>

                        <div className="rounded-2xl bg-gray-50 p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900">Social accounts</p>
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <p className="mt-2 text-2xl font-bold text-gray-900">{detail.socialAccounts.length}</p>
                          <p className="text-sm text-gray-500">Limit paket: {detail.config.maxSocialAccounts}</p>
                        </div>

                        <div className="rounded-2xl bg-gray-50 p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900">Ads accounts</p>
                            <BadgeDollarSign className="h-4 w-4 text-purple-600" />
                          </div>
                          <p className="mt-2 text-2xl font-bold text-gray-900">{detail.adsAccounts.length}</p>
                          <p className="text-sm text-gray-500">Limit paket: {detail.config.maxAdsAccounts}</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {detail.zernioAccounts.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-5 text-center text-sm text-gray-500">
                            Belum ada akun Zernio yang terhubung.
                          </div>
                        ) : (
                          detail.zernioAccounts.map((account) => (
                            <div key={account.id} className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900">{account.displayName || account.username || account.platform}</p>
                                <p className="text-sm text-gray-500">{account.platform} • {account.username || account.id}</p>
                              </div>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                account.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {account.isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                {account.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-gray-200 p-5">
                      <div className="flex items-center gap-2">
                        <PackageOpen className="h-5 w-5 text-amber-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Marketplace</h3>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Untuk sekarang tetap jadikan marketplace sebagai <span className="font-medium text-gray-700">Coming Soon</span> sampai arah integrasi Jubelio benar-benar matang.
                      </p>
                      <div className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                        Toggle marketplace boleh disimpan untuk roadmap tenant, tapi jangan dipromosikan sebagai fitur live dulu.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
