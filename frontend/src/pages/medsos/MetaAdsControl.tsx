import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { PlatformBadge } from '../../components/medsos/PlatformBadge';
import FieldHelp from '../../components/medsos/FieldHelp';
import {
  disconnectZernioAccount,
  getZernioAccounts,
  getZernioAdsConnectUrl,
  getZernioAdsSummary,
  type ZernioAdsSummary,
  type ZernioAccount,
} from '../../services/medsosPostsService';
import { isZernioAdsAccount, zernioAdsPlatforms } from '../../data/zernioCatalog';
import {
  ExternalLink,
  Loader2,
  Megaphone,
  PlugZap,
  Sparkles,
  Unplug,
} from 'lucide-react';

const demoAccounts: ZernioAccount[] = [
  {
    id: 'demo-metaads',
    platform: 'metaads',
    username: 'act_2384',
    displayName: 'Meta Ads Main',
    profileUrl: null,
    isActive: true,
  },
  {
    id: 'demo-googleads',
    platform: 'googleads',
    username: 'customer-001',
    displayName: 'Google Ads Search',
    profileUrl: null,
    isActive: true,
  },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value || 0);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value || 0);
}

function formatMetricValue(value: number | null | undefined, fractionDigits = 2) {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function formatCurrencyValue(currency: string, value: number) {
  if (currency === 'UNSPECIFIED') {
    return `${formatMetricValue(value)} (currency belum dikirim)`;
  }

  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${formatMetricValue(value)}`;
  }
}

function humanizeStatus(status: string) {
  const normalized = status.toLowerCase();
  const labels: Record<string, string> = {
    active: 'Active',
    paused: 'Paused',
    pending_review: 'Pending review',
    rejected: 'Rejected',
    completed: 'Completed',
    cancelled: 'Cancelled',
    error: 'Error',
    unknown: 'Unknown',
  };

  return labels[normalized] ?? status;
}

export default function MetaAdsControl() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const isDemo = location.pathname.startsWith('/demo');

  const [loading, setLoading] = useState(!isDemo);
  const [busyPlatform, setBusyPlatform] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ZernioAccount[]>(isDemo ? demoAccounts : []);
  const [summary, setSummary] = useState<ZernioAdsSummary | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [zernioAccounts, zernioSummary] = await Promise.all([
        getZernioAccounts(),
        getZernioAdsSummary(),
      ]);
      setAccounts(zernioAccounts);
      setSummary(zernioSummary);
    } catch (error) {
      console.error('Failed to load Zernio ads workspace', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDemo) return;
    void load();
  }, [isDemo]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const adsConnected = params.get('zernio_ads_connected');
    if (adsConnected && !isDemo) {
      void load();
    }
  }, [location.search, isDemo]);

  const adAccounts = useMemo(
    () => accounts.filter((account) => isZernioAdsAccount(account.platform)),
    [accounts]
  );

  const platformSummaries = summary?.platforms ?? [];
  const workspaceAccounts = summary?.accounts ?? [];
  const topCampaigns = summary?.campaigns.slice(0, 12) ?? [];

  const getConnectedAccount = (platforms: string[]) => {
    const lowered = platforms.map((item) => item.toLowerCase());
    return adAccounts.find((account) => lowered.includes(account.platform.toLowerCase())) || null;
  };

  const handleConnect = async (platform: string) => {
    setBusyPlatform(platform);
    try {
      const url = await getZernioAdsConnectUrl(platform, undefined, '/medsos/ads');
      window.location.href = url;
    } catch (error) {
      console.error('Failed to start Zernio ads connection', error);
      setBusyPlatform(null);
    }
  };

  const handleDisconnect = async (account: ZernioAccount) => {
    if (!window.confirm(`Putuskan ${account.displayName || account.username || account.platform} dari workspace ini?`)) {
      return;
    }

    try {
      await disconnectZernioAccount(account.id);
      if (isDemo) {
        setAccounts((current) => current.filter((item) => item.id !== account.id));
      } else {
        await load();
      }
    } catch (error) {
      console.error('Failed to disconnect Zernio ads account', error);
    }
  };

  if (!isDemo && loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-blue-100 bg-white shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="max-w-3xl">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4 ${isDark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-100 text-violet-700'}`}>
              <Megaphone size={14} />
              Ads workspace via Zernio
            </div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Semua jalur ads sekarang dipusatkan ke Zernio</h1>
            <p className={`text-sm mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Workspace ini sekarang membaca account, ad account, campaign, dan metrik lintas network langsung dari layer ads Zernio. Jadi kalau tenant menghubungkan beberapa network sekaligus, semuanya bisa tetap muncul di satu tempat.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
            <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
              <p className="text-xs uppercase tracking-[0.18em]">Connected ads</p>
              <p className="font-semibold text-sm mt-1">{summary?.totals.connectedAccounts ?? adAccounts.length} workspace</p>
            </div>
            <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
              <p className="text-xs uppercase tracking-[0.18em]">Active campaigns</p>
              <p className="font-semibold text-sm mt-1">{summary?.totals.activeCampaigns ?? 0} campaign</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <section className={`rounded-3xl border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xl">Connect ad networks</h2>
                <FieldHelp title="Connect ad networks" description="Hubungkan network iklan yang ingin dikelola. Setelah tersambung, account akan muncul di workspace ini." />
              </div>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Gunakan tombol ini untuk menyalakan jalur ads sesuai network yang dibutuhkan tenant.
              </p>
            </div>
            <PlugZap className="text-blue-500" size={18} />
          </div>

          <div className="space-y-3">
            {zernioAdsPlatforms.map((platform) => {
              const account = getConnectedAccount(platform.accountPlatforms);
              const busy = busyPlatform === platform.connectPlatform;
              return (
                <div key={platform.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <PlatformBadge label={platform.label} brand={platform.brand} size={44} tone="bg-slate-100 text-slate-700" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{platform.label}</p>
                        {account ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Connected</span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Needs setup</span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{platform.hint}</p>
                      {platform.requirement ? (
                        <p className={`text-xs mt-2 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{platform.requirement}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {account ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDisconnect(account)}
                          title={`Putuskan ${platform.label} dari workspace ini`}
                          className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isDark ? 'bg-slate-900 text-rose-300 hover:bg-rose-950/40' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
                        >
                          <Unplug size={15} />
                          Disconnect
                        </button>
                        {account.profileUrl ? (
                          <a
                            href={account.profileUrl}
                            target="_blank"
                            rel="noreferrer"
                            title={`Buka profile ${platform.label} di tab baru`}
                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isDark ? 'border border-slate-700 bg-slate-800 text-white hover:bg-slate-700' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                          >
                            <ExternalLink size={15} />
                            Buka profile
                          </a>
                        ) : null}
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={!platform.connectPlatform || busy}
                        onClick={() => platform.connectPlatform && handleConnect(platform.connectPlatform)}
                        title={`Hubungkan ${platform.label} ke workspace ini`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busy ? <Loader2 size={15} className="animate-spin" /> : <PlugZap size={15} />}
                        Connect ads
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={`rounded-3xl border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="text-blue-500" size={18} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xl">Workspace snapshot</h2>
                <FieldHelp title="Workspace snapshot" description="Ringkasan semua network ads yang sudah dipetakan dari profile Zernio tenant ini, termasuk account terhubung, ad account, campaign, dan metrik lintas network." />
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Kalau tenant menghubungkan beberapa network sekaligus, setiap network akan diringkas terpisah lalu digabung di view global ini.
              </p>
            </div>
          </div>

          {adAccounts.length === 0 ? (
            <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Belum ada ad account yang tersambung. Mulai dari Meta Ads atau Google Ads sesuai kebutuhan tenant.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Networks aktif</p>
                  <p className="mt-2 text-2xl font-bold">{summary?.totals.networks ?? adAccounts.length}</p>
                </div>
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ad accounts</p>
                  <p className="mt-2 text-2xl font-bold">{summary?.totals.linkedAdAccounts ?? 0}</p>
                </div>
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total campaign</p>
                  <p className="mt-2 text-2xl font-bold">{summary?.totals.totalCampaigns ?? 0}</p>
                </div>
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CTR gabungan</p>
                  <p className="mt-2 text-2xl font-bold">{formatMetricValue(summary?.totals.metrics.ctr ?? 0)}%</p>
                </div>
              </div>

              {summary?.totals.spendByCurrency?.length ? (
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="font-semibold">Spend per currency</p>
                    <FieldHelp title="Spend per currency" description="Zernio tidak menormalisasi semua network ke satu mata uang. Karena itu total spend ditampilkan per currency supaya angka tidak menyesatkan." />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {summary.totals.spendByCurrency.map((item) => (
                      <div
                        key={item.currency}
                        className={`rounded-xl px-3 py-2 text-sm ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-gray-700 border border-gray-200'}`}
                        title={`ROAS ${item.roas == null ? 'belum tersedia' : `${formatMetricValue(item.roas)}x`}`}
                      >
                        <div className="font-semibold">{formatCurrencyValue(item.currency, item.spend)}</div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {item.roas == null ? `${formatNumber(item.conversions)} conversion` : `ROAS ${formatMetricValue(item.roas)}x`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {platformSummaries.length ? (
                <div className="grid md:grid-cols-2 gap-3">
                  {platformSummaries.map((platform) => (
                    <div key={platform.key} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{platform.label}</p>
                          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {platform.connectedAccounts} workspace • {platform.linkedAdAccounts} ad account • {platform.totalCampaigns} campaign
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {platform.activeCampaigns} active
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Impressions</p>
                          <p className="font-semibold">{formatCompactNumber(platform.metrics.impressions)}</p>
                        </div>
                        <div>
                          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Clicks</p>
                          <p className="font-semibold">{formatCompactNumber(platform.metrics.clicks)}</p>
                        </div>
                        <div>
                          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CTR</p>
                          <p className="font-semibold">{formatMetricValue(platform.metrics.ctr)}%</p>
                        </div>
                        <div>
                          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Conversions</p>
                          <p className="font-semibold">{formatCompactNumber(platform.metrics.conversions)}</p>
                        </div>
                      </div>

                      {platform.spendByCurrency.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {platform.spendByCurrency.map((item) => (
                            <span
                              key={`${platform.key}-${item.currency}`}
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-gray-700 border border-gray-200'}`}
                            >
                              {formatCurrencyValue(item.currency, item.spend)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>

      {summary ? (
        <>
          <section className={`rounded-3xl border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="text-blue-500" size={18} />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-xl">Per-account analytics</h2>
                  <FieldHelp title="Per-account analytics" description="Setiap workspace ads Zernio bisa punya satu atau lebih ad account. Di sini ringkasan campaign dan spend dipisah per account supaya operator bisa lihat mana yang aktif dan mana yang belum bergerak." />
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Ini bagian yang menentukan apakah dashboard sanggup membaca semua akun ads yang tersambung di tenant yang sama.
                </p>
              </div>
            </div>

            {workspaceAccounts.length === 0 ? (
              <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Belum ada account ads yang berhasil dibaca dari profile Zernio ini.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {workspaceAccounts.map((workspaceAccount) => (
                  <div key={workspaceAccount.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <PlatformBadge label={workspaceAccount.networkLabel} size={42} tone="bg-slate-100 text-slate-700" />
                          <div>
                            <p className="font-semibold">{workspaceAccount.displayName || workspaceAccount.username || workspaceAccount.networkLabel}</p>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {workspaceAccount.networkLabel} • {workspaceAccount.adAccounts.length} ad account • {workspaceAccount.totalCampaigns} campaign
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Active</p>
                          <p className="font-semibold">{workspaceAccount.activeCampaigns}</p>
                        </div>
                        <div>
                          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Impressions</p>
                          <p className="font-semibold">{formatCompactNumber(workspaceAccount.metrics.impressions)}</p>
                        </div>
                        <div>
                          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Clicks</p>
                          <p className="font-semibold">{formatCompactNumber(workspaceAccount.metrics.clicks)}</p>
                        </div>
                        <div>
                          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CTR</p>
                          <p className="font-semibold">{formatMetricValue(workspaceAccount.metrics.ctr)}%</p>
                        </div>
                      </div>
                    </div>

                    {workspaceAccount.spendByCurrency.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {workspaceAccount.spendByCurrency.map((item) => (
                          <span
                            key={`${workspaceAccount.id}-${item.currency}`}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-gray-700 border border-gray-200'}`}
                          >
                            {formatCurrencyValue(item.currency, item.spend)}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 grid xl:grid-cols-2 gap-3">
                      {workspaceAccount.adAccounts.length === 0 ? (
                        <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/70' : 'border-gray-200 bg-white'}`}>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Belum ada ad account spesifik yang dikembalikan dari Zernio untuk workspace ini.</p>
                        </div>
                      ) : (
                        workspaceAccount.adAccounts.map((adAccount) => (
                          <div key={`${workspaceAccount.id}-${adAccount.id}`} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/70' : 'border-gray-200 bg-white'}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold truncate">{adAccount.name}</p>
                                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {adAccount.currency || 'Currency tidak dikirim'} • {adAccount.totalCampaigns} campaign • {adAccount.activeCampaigns} active
                                </p>
                              </div>
                              {adAccount.status ? (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-600'}`}>
                                  {adAccount.status}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Spend</p>
                                <p className="font-semibold">
                                  {adAccount.spendByCurrency[0]
                                    ? formatCurrencyValue(adAccount.spendByCurrency[0].currency, adAccount.spendByCurrency[0].spend)
                                    : '—'}
                                </p>
                              </div>
                              <div>
                                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ROAS</p>
                                <p className="font-semibold">
                                  {adAccount.metrics.roas == null ? '—' : `${formatMetricValue(adAccount.metrics.roas)}x`}
                                </p>
                              </div>
                              <div>
                                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Clicks</p>
                                <p className="font-semibold">{formatCompactNumber(adAccount.metrics.clicks)}</p>
                              </div>
                              <div>
                                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Conversions</p>
                                <p className="font-semibold">{formatCompactNumber(adAccount.metrics.conversions)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={`rounded-3xl border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
            <div className="px-6 py-5 border-b border-inherit">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xl">Campaign intelligence</h2>
                <FieldHelp title="Campaign intelligence" description="Daftar ini mengambil campaign lintas network dari Zernio lalu menampilkannya dalam format yang lebih mudah dipantau dari dashboard internal." />
              </div>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Data ini sudah bukan khusus Meta saja. Kalau tenant menyalakan Google Ads, LinkedIn Ads, TikTok Ads, Pinterest Ads, atau X Ads, campaign dari network itu juga ikut masuk ke tabel ini.
              </p>
            </div>

            {topCampaigns.length === 0 ? (
              <div className="px-6 py-8">
                <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Account ads sudah tersambung, tapi belum ada campaign yang dikembalikan Zernio untuk profile tenant ini.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {['Campaign', 'Network', 'Ad account', 'Status', 'Spend', 'Clicks', 'CTR', 'ROAS'].map((header) => (
                        <th key={header} className="px-6 py-4 text-left font-medium text-xs">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inherit">
                    {topCampaigns.map((campaign) => (
                      <tr key={campaign.id}>
                        <td className="px-6 py-4 align-top">
                          <div className="font-medium">{campaign.name}</div>
                          <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {campaign.objective || campaign.platformLabel}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="font-medium">{campaign.networkLabel}</div>
                          <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{campaign.platformLabel}</div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="font-medium">{campaign.adAccountName || 'Ad account belum bernama'}</div>
                          <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{campaign.socialAccountName}</div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${campaign.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : campaign.status === 'paused'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {humanizeStatus(campaign.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top">
                          {campaign.currency ? formatCurrencyValue(campaign.currency, campaign.metrics.spend) : '—'}
                        </td>
                        <td className="px-6 py-4 align-top">{formatCompactNumber(campaign.metrics.clicks)}</td>
                        <td className="px-6 py-4 align-top">{formatMetricValue(campaign.metrics.ctr)}%</td>
                        <td className="px-6 py-4 align-top">
                          {campaign.metrics.roas == null ? '—' : `${formatMetricValue(campaign.metrics.roas)}x`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
