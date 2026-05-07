import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { PlatformBadge } from '../../components/medsos/PlatformBadge';
import {
  disconnectZernioAccount,
  getZernioAccounts,
  getZernioAdsConnectUrl,
  getZernioAdsSummary,
  type MetaAdsSummary,
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

function humanizePlatform(platform: string) {
  const value = platform.toLowerCase();
  const labels: Record<string, string> = {
    metaads: 'Meta Ads',
    linkedinads: 'LinkedIn Ads',
    pinterestads: 'Pinterest Ads',
    tiktokads: 'TikTok Ads',
    googleads: 'Google Ads',
    xads: 'X Ads',
  };
  return labels[value] || platform;
}

export default function MetaAdsControl() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const isDemo = location.pathname.startsWith('/demo');

  const [loading, setLoading] = useState(!isDemo);
  const [busyPlatform, setBusyPlatform] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ZernioAccount[]>(isDemo ? demoAccounts : []);
  const [summary, setSummary] = useState<MetaAdsSummary | null>(null);

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
              Tidak ada lagi connector ads yang berdiri sendiri. Meta Ads, Google Ads, LinkedIn Ads, TikTok Ads, Pinterest Ads, dan X Ads diperlakukan sebagai bagian dari workspace Zernio tenant.
            </p>
          </div>

          <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
            <p className="text-xs uppercase tracking-[0.18em]">Connected ads</p>
            <p className="font-semibold text-sm mt-1">{adAccounts.length} account</p>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <section className={`rounded-3xl border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-bold text-xl">Connect ad networks</h2>
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
              <h2 className="font-bold text-xl">Workspace snapshot</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Zernio menjadi sumber utama daftar ad account yang terlihat di tenant ini.
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
            <div className="space-y-3">
              {adAccounts.map((account) => (
                <div key={account.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <PlatformBadge label={humanizePlatform(account.platform)} size={42} tone="bg-slate-100 text-slate-700" />
                    <div>
                      <p className="font-semibold">{humanizePlatform(account.platform)}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {account.displayName || account.username || 'Connected ad account'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {summary ? (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Meta spend</p>
                  <p className="mt-2 text-2xl font-bold">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: summary.adAccounts[0]?.currency || 'USD',
                      maximumFractionDigits: 0,
                    }).format(summary.totals.spend || 0)}
                  </p>
                </div>
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Campaign aktif</p>
                  <p className="mt-2 text-2xl font-bold">{summary.activeCampaigns}</p>
                </div>
              </div>

              <div className={`rounded-2xl border ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="px-4 py-3 border-b border-inherit">
                  <p className="font-semibold">Meta campaign snapshot</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {['Campaign', 'Status', 'Spend', 'Clicks'].map((header) => (
                          <th key={header} className="px-4 py-3 text-left font-medium text-xs">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-inherit">
                      {summary.campaigns.slice(0, 5).map((campaign) => (
                        <tr key={campaign.id}>
                          <td className="px-4 py-3 font-medium">{campaign.name}</td>
                          <td className="px-4 py-3">{campaign.status}</td>
                          <td className="px-4 py-3">{campaign.spend}</td>
                          <td className="px-4 py-3">{campaign.clicks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
