import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { PlatformBadge } from '../../components/medsos/PlatformBadge';
import FieldHelp from '../../components/medsos/FieldHelp';
import {
  CONTENT_STUDIO_STORAGE_KEY,
  createDefaultProviderConfigs,
  downloadTextFile,
  requestProviderText,
  type ProviderRuntimeConfig,
} from '../../lib/contentStudio';
import {
  createZernioAdsAgentActions,
  decideZernioAdsAgentAction,
  disconnectZernioAccount,
  getZernioAdsAgentActions,
  invalidateMcsRequestCache,
  getZernioAdAnalytics,
  getZernioAdsByCampaign,
  getZernioAccounts,
  getZernioAdsConnectUrl,
  getZernioAdsSummary,
  type ZernioAdAnalyticsSummary,
  type ZernioAdListItem,
  type ZernioAdsAgentAction,
  type ZernioAdsAgentActionInput,
  type ZernioAdsCampaignSummary,
  type ZernioAdsSummary,
  type ZernioAccount,
} from '../../services/medsosPostsService';
import { isZernioAdsAccount, zernioAdsPlatforms } from '../../data/zernioCatalog';
import {
  Bot,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  PlugZap,
  RefreshCw,
  Sparkles,
  Unplug,
  Wand2,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

const previewAdChartData = [
  { date: 'D-6', spend: 0, clicks: 0, conversions: 0 },
  { date: 'D-5', spend: 0, clicks: 0, conversions: 0 },
  { date: 'D-4', spend: 0, clicks: 0, conversions: 0 },
  { date: 'D-3', spend: 0, clicks: 0, conversions: 0 },
  { date: 'D-2', spend: 0, clicks: 0, conversions: 0 },
  { date: 'D-1', spend: 0, clicks: 0, conversions: 0 },
  { date: 'Today', spend: 0, clicks: 0, conversions: 0 },
];

const previewNetworkCards = [
  { key: 'metaads', label: 'Meta Ads', connectedAccounts: 0, linkedAdAccounts: 0, totalCampaigns: 0, activeCampaigns: 0, impressions: 0, clicks: 0, ctr: 0, conversions: 0 },
  { key: 'googleads', label: 'Google Ads', connectedAccounts: 0, linkedAdAccounts: 0, totalCampaigns: 0, activeCampaigns: 0, impressions: 0, clicks: 0, ctr: 0, conversions: 0 },
  { key: 'tiktokads', label: 'TikTok Ads', connectedAccounts: 0, linkedAdAccounts: 0, totalCampaigns: 0, activeCampaigns: 0, impressions: 0, clicks: 0, ctr: 0, conversions: 0 },
];

const previewCampaignRows = [
  { id: 'preview-meta', name: 'Preview Campaign • Meta Ads', networkLabel: 'Meta Ads', adAccountName: 'Belum ada ad account', status: 'preview', spend: 0, clicks: 0, ctr: 0, roas: null as number | null },
  { id: 'preview-google', name: 'Preview Campaign • Google Ads', networkLabel: 'Google Ads', adAccountName: 'Belum ada ad account', status: 'preview', spend: 0, clicks: 0, ctr: 0, roas: null as number | null },
];

type DatePreset = '7d' | '30d' | '90d' | 'custom';

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateInput(date);
}

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

function escapeCsvCell(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}


type AdsCopilotGoal =
  | 'Leads'
  | 'Sales'
  | 'Awareness'
  | 'Retargeting'
  | 'Traffic'
  | 'Engagement'
  | 'App Install'
  | 'Catalog Sales'
  | 'Store Visit'
  | 'ROAS Efficiency'
  | 'Creative Testing'
  | 'Budget Optimization';
type AdsCopilotPlatform =
  | 'Semua Platform'
  | 'Omnichannel'
  | 'Meta Ads'
  | 'TikTok Ads'
  | 'Google Ads'
  | 'LinkedIn Ads'
  | 'Pinterest Ads'
  | 'X Ads';
type AdsAgentMode = 'Advisor' | 'Approval-first' | 'Guarded autopilot';

const ADS_COPILOT_GOALS: Array<{ value: AdsCopilotGoal; label: string; helper: string }> = [
  { value: 'Leads', label: 'Leads / WA masuk', helper: 'Cari chat, form, dan prospek baru.' },
  { value: 'Sales', label: 'Sales / pembelian', helper: 'Fokus transaksi dan closing.' },
  { value: 'Awareness', label: 'Awareness', helper: 'Bangun reach dan ingatan brand.' },
  { value: 'Retargeting', label: 'Retargeting', helper: 'Kejar orang yang sudah pernah interaksi.' },
  { value: 'Traffic', label: 'Traffic', helper: 'Dorong klik ke landing page atau katalog.' },
  { value: 'Engagement', label: 'Engagement', helper: 'Naikkan komen, DM, save, dan share.' },
  { value: 'App Install', label: 'App install', helper: 'Untuk aplikasi/mobile funnel.' },
  { value: 'Catalog Sales', label: 'Catalog sales', helper: 'Cocok untuk produk banyak SKU.' },
  { value: 'Store Visit', label: 'Store visit', helper: 'Dorong kunjungan toko/offline.' },
  { value: 'ROAS Efficiency', label: 'ROAS efficiency', helper: 'Optimasi efisiensi belanja iklan.' },
  { value: 'Creative Testing', label: 'Creative testing', helper: 'Tes hook, angle, dan visual.' },
  { value: 'Budget Optimization', label: 'Budget optimization', helper: 'Bantu alokasi, scale, pause, dan rebalance.' },
];

const ADS_COPILOT_PLATFORMS: Array<{ value: AdsCopilotPlatform; label: string; helper: string }> = [
  { value: 'Semua Platform', label: 'Semua platform', helper: 'AI pilih kombinasi paling masuk akal.' },
  { value: 'Omnichannel', label: 'Omnichannel', helper: 'Gabungan paid + organic + WA follow-up.' },
  { value: 'Meta Ads', label: 'Meta Ads', helper: 'Facebook, Instagram, Reels, katalog.' },
  { value: 'TikTok Ads', label: 'TikTok Ads', helper: 'UGC, Spark Ads, short video.' },
  { value: 'Google Ads', label: 'Google Ads', helper: 'Search, Display, YouTube, Performance Max.' },
  { value: 'LinkedIn Ads', label: 'LinkedIn Ads', helper: 'B2B, lead gen, professional audience.' },
  { value: 'Pinterest Ads', label: 'Pinterest Ads', helper: 'Inspirasi visual, lifestyle, discovery.' },
  { value: 'X Ads', label: 'X Ads', helper: 'Trend, conversation, dan awareness cepat.' },
];

const ADS_AGENT_MODES: Array<{ value: AdsAgentMode; label: string; helper: string }> = [
  { value: 'Approval-first', label: 'Approval-first', helper: 'AI boleh menyarankan aksi, eksekusi tetap perlu Ya/Tidak dari user.' },
  { value: 'Advisor', label: 'Advisor only', helper: 'AI hanya memberi saran, tanpa lane persetujuan budget.' },
  { value: 'Guarded autopilot', label: 'Guarded autopilot', helper: 'AI susun rencana scale/pause, tapi budget besar tetap minta approval.' },
];

function getStoredOpenRouterRuntimeConfig(): ProviderRuntimeConfig {
  const defaults = createDefaultProviderConfigs().openrouter;
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(CONTENT_STUDIO_STORAGE_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as { providerConfigs?: { openrouter?: Partial<ProviderRuntimeConfig> } };
    return {
      ...defaults,
      ...(saved.providerConfigs?.openrouter ?? {}),
    };
  } catch {
    return defaults;
  }
}

function buildAdsFallbackPlan(input: {
  brief: string;
  goal: AdsCopilotGoal;
  platform: AdsCopilotPlatform;
  connectedPlatforms: string;
  activeCampaigns: number;
  alerts: Array<{ title: string; detail: string }>;
  agentMode: AdsAgentMode;
  budgetGuardrail: string;
}) {
  const alertLine = input.alerts.length
    ? input.alerts.map((item, index) => `${index + 1}. ${item.title}: ${item.detail}`).join('\n')
    : 'Belum ada alert keras. Fokus mulai dari struktur campaign dan creative test.';

  return [
    '1. Ringkasan situasi',
    `Brief: ${input.brief}`,
    `Goal: ${input.goal}. Platform prioritas: ${input.platform}. Platform tersambung: ${input.connectedPlatforms || 'belum ada / preview'}. Active campaign: ${input.activeCampaigns}. Mode AI: ${input.agentMode}. Guardrail budget: ${input.budgetGuardrail || 'belum diisi user'}.`,
    '',
    '2. Angle campaign yang disarankan',
    '- Angle problem-solution: buka dengan masalah paling nyata customer, lalu tampilkan solusi dan bukti sederhana.',
    '- Angle offer: tekankan benefit utama + alasan kenapa harus action sekarang.',
    '- Angle trust: tampilkan proses, hasil, testimoni, atau before-after yang believable.',
    '',
    '3. Draft copy iklan',
    'Headline A: Solusi cepat untuk masalah yang sering bikin customer ragu',
    'Headline B: Coba cara lebih simpel mulai hari ini',
    'Primary text: Kalau selama ini customer masih ragu, mulai dari penjelasan paling sederhana: masalahnya apa, solusinya apa, dan kenapa produk ini layak dicoba sekarang. Tutup dengan CTA jelas.',
    'CTA: Chat sekarang / Cek penawaran / Konsultasi gratis',
    '',
    '4. Prompt creative siap generate',
    `Buat creative ads untuk ${input.platform}. Produk/brief: ${input.brief}. Visual modern, clean, hook kuat di 2 detik pertama, tampilkan problem customer, solusi, benefit utama, proof sederhana, dan CTA jelas. Gaya natural, tidak berlebihan, cocok untuk bisnis Indonesia.`,
    '',
    '5. Eksperimen 7 hari',
    '- Test 3 hook berbeda: problem, benefit, social proof.',
    '- Test 2 visual: UGC natural vs produk premium.',
    '- Matikan asset CTR rendah setelah data cukup, pindahkan budget ke hook terbaik.',
    '',
    '6. Pending approval untuk user',
    '- YA: Jalankan struktur testing kecil dengan guardrail budget di atas.',
    '- REVISI: Minta AI ubah audience, copy, atau split budget.',
    '- TUNDA: Simpan sebagai draft tanpa eksekusi.',
    '',
    '7. Alert dari data saat ini',
    alertLine,
  ].join('\n');
}

function buildAdsAgentActionDrafts(input: {
  brief: string;
  goal: AdsCopilotGoal;
  platform: AdsCopilotPlatform;
  agentMode: AdsAgentMode;
  budgetGuardrail: string;
  campaigns: ZernioAdsCampaignSummary[];
  connectedPlatforms: string;
}): ZernioAdsAgentActionInput[] {
  const actions: ZernioAdsAgentActionInput[] = [];
  const campaigns = input.campaigns.slice(0, 8);
  const lowCtr = campaigns.find((campaign) => Number(campaign.metrics.ctr || 0) > 0 && Number(campaign.metrics.ctr || 0) < 0.8);
  const bestConverter = campaigns.find((campaign) => Number(campaign.metrics.conversions || 0) > 0);
  const spendingNoConversion = campaigns.find((campaign) => Number(campaign.metrics.spend || 0) > 0 && Number(campaign.metrics.conversions || 0) === 0);

  actions.push({
    title: 'Generate 3 creative test baru',
    detail: `Buat 3 variasi hook dan visual untuk brief "${input.brief}" sesuai goal ${input.goal}. Creative diarahkan ke ${input.platform}.`,
    actionType: 'create_creative_test',
    platform: input.platform,
    riskLevel: 'low',
    budgetImpact: 'Belum menyentuh budget, aman untuk disiapkan sebagai draft.',
    approvalQuestion: 'Setujui AI membuat blueprint creative test dan prompt iklannya?',
  });

  actions.push({
    title: 'Siapkan struktur budget testing',
    detail: `Gunakan guardrail: ${input.budgetGuardrail || 'testing kecil dulu'}. AI membagi budget ke campaign/creative test tanpa eksekusi langsung.`,
    actionType: 'rebalance_budget',
    platform: input.platform,
    riskLevel: input.agentMode === 'Guarded autopilot' ? 'medium' : 'low',
    budgetImpact: input.budgetGuardrail || 'Budget wajib dikonfirmasi user sebelum berubah.',
    approvalQuestion: 'Setujui struktur split budget ini masuk pending eksekusi?',
  });

  if (bestConverter) {
    actions.push({
      title: `Scale kandidat terbaik: ${bestConverter.name}`,
      detail: `Campaign ini punya ${formatNumber(bestConverter.metrics.conversions)} conversion, CTR ${formatMetricValue(bestConverter.metrics.ctr)}%, spend ${bestConverter.currency ? formatCurrencyValue(bestConverter.currency, bestConverter.metrics.spend) : formatMetricValue(bestConverter.metrics.spend)}. AI menyarankan scale bertahap sesuai guardrail.`,
      actionType: 'scale_campaign',
      platform: bestConverter.networkLabel,
      targetId: bestConverter.id,
      targetName: bestConverter.name,
      riskLevel: 'medium',
      budgetImpact: 'Potensi menaikkan spend; butuh approval owner sebelum eksekusi.',
      approvalQuestion: 'Setujui kandidat scale ini untuk masuk antrian eksekusi?',
    });
  }

  if (lowCtr) {
    actions.push({
      title: `Review / pause creative CTR rendah: ${lowCtr.name}`,
      detail: `CTR ${formatMetricValue(lowCtr.metrics.ctr)}% terdeteksi rendah. AI menyarankan review creative, audience, dan kemungkinan pause setelah data cukup.`,
      actionType: 'pause_campaign',
      platform: lowCtr.networkLabel,
      targetId: lowCtr.id,
      targetName: lowCtr.name,
      riskLevel: 'medium',
      budgetImpact: 'Bisa menahan spend buruk, tapi tetap perlu approval agar tidak mematikan campaign penting.',
      approvalQuestion: 'Setujui action review/pause ini masuk pending approval?',
    });
  }

  if (spendingNoConversion) {
    actions.push({
      title: `Audit spend tanpa conversion: ${spendingNoConversion.name}`,
      detail: `Campaign sudah spend ${spendingNoConversion.currency ? formatCurrencyValue(spendingNoConversion.currency, spendingNoConversion.metrics.spend) : formatMetricValue(spendingNoConversion.metrics.spend)} tanpa conversion terbaca. Cek tracking, landing, audience, dan offer.`,
      actionType: 'audit_tracking',
      platform: spendingNoConversion.networkLabel,
      targetId: spendingNoConversion.id,
      targetName: spendingNoConversion.name,
      riskLevel: 'high',
      budgetImpact: 'Tidak langsung ubah budget; audit dulu supaya tidak salah matikan campaign.',
      approvalQuestion: 'Setujui audit tracking dan funnel untuk campaign ini?',
    });
  }

  actions.push({
    title: 'Set daily monitoring rule',
    detail: `Pantau campaign aktif lintas ${input.connectedPlatforms || input.platform}. Trigger alert jika CTR turun, CPL naik, atau spend keluar guardrail.`,
    actionType: 'set_monitoring_rule',
    platform: input.platform,
    riskLevel: 'low',
    budgetImpact: 'Tidak mengubah budget; hanya aturan pantau dan reminder.',
    approvalQuestion: 'Aktifkan rule monitoring ini sebagai SOP operator?',
  });

  return actions.slice(0, 6);
}

function slugifyFilenamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'export';
}

function buildPresetRange(preset: Exclude<DatePreset, 'custom'>) {
  const today = formatDateInput(new Date());
  switch (preset) {
    case '7d':
      return { fromDate: getDateDaysAgo(6), toDate: today };
    case '30d':
      return { fromDate: getDateDaysAgo(29), toDate: today };
    case '90d':
    default:
      return { fromDate: getDateDaysAgo(89), toDate: today };
  }
}

const platformBreakdownDefaults: Record<string, string[]> = {
  facebook: ['age', 'gender', 'country', 'publisher_platform'],
  instagram: ['age', 'gender', 'country', 'publisher_platform'],
  tiktok: ['gender', 'age', 'country_code', 'platform'],
};

const breakdownLabels: Record<string, string> = {
  age: 'Age',
  gender: 'Gender',
  country: 'Country',
  country_code: 'Country',
  publisher_platform: 'Publisher',
  platform: 'Platform',
  device_platform: 'Device',
  region: 'Region',
  language: 'Language',
  ac: 'Network',
};

export default function OmnichannelAdsHub() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const isDemo = location.pathname.startsWith('/demo');

  const [loading, setLoading] = useState(!isDemo);
  const [busyPlatform, setBusyPlatform] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ZernioAccount[]>(isDemo ? demoAccounts : []);
  const [summary, setSummary] = useState<ZernioAdsSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [campaignAdsLoading, setCampaignAdsLoading] = useState(false);
  const [campaignAds, setCampaignAds] = useState<ZernioAdListItem[]>([]);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [selectedAdAnalyticsLoading, setSelectedAdAnalyticsLoading] = useState(false);
  const [selectedAdAnalytics, setSelectedAdAnalytics] = useState<ZernioAdAnalyticsSummary | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [fromDate, setFromDate] = useState<string>(() => buildPresetRange('30d').fromDate);
  const [toDate, setToDate] = useState<string>(() => buildPresetRange('30d').toDate);
  const [adsCopilotBrief, setAdsCopilotBrief] = useState('');
  const [adsCopilotGoal, setAdsCopilotGoal] = useState<AdsCopilotGoal>('Leads');
  const [adsCopilotPlatform, setAdsCopilotPlatform] = useState<AdsCopilotPlatform>('Semua Platform');
  const [adsAgentMode, setAdsAgentMode] = useState<AdsAgentMode>('Approval-first');
  const [adsBudgetGuardrail, setAdsBudgetGuardrail] = useState('Mulai kecil, maksimal 10-20% budget harian untuk testing.');
  const [adsCopilotOutput, setAdsCopilotOutput] = useState('');
  const [adsCopilotLoading, setAdsCopilotLoading] = useState(false);
  const [adsAgentActions, setAdsAgentActions] = useState<ZernioAdsAgentAction[]>([]);
  const [adsAgentDecisionBusyId, setAdsAgentDecisionBusyId] = useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<ZernioAccount | null>(null);

  const load = async (options?: { refresh?: boolean; silent?: boolean }) => {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [zernioAccounts, zernioSummary, agentQueue] = await Promise.all([
        getZernioAccounts(),
        getZernioAdsSummary({ fromDate, toDate, refresh: options?.refresh }),
        getZernioAdsAgentActions().catch(() => ({ runs: [], actions: [] })),
      ]);
      setAccounts(zernioAccounts);
      setSummary(zernioSummary);
      setAdsAgentActions(agentQueue.actions);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to load Zernio ads workspace', error);
    } finally {
      if (options?.silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isDemo) return;
    void load();
  }, [isDemo, fromDate, toDate]);

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

  const previewMode = !isDemo && adAccounts.length === 0 && !summary;

  const platformSummaries = summary?.platforms ?? [];
  const workspaceAccounts = summary?.accounts ?? [];
  const topCampaigns = summary?.campaigns.slice(0, 12) ?? [];
  const activeCampaign = useMemo(
    () => summary?.campaigns.find((campaign) => campaign.id === activeCampaignId) ?? null,
    [summary, activeCampaignId]
  );
  const selectedAd = useMemo(
    () => campaignAds.find((ad) => ad.id === selectedAdId) ?? null,
    [campaignAds, selectedAdId]
  );

  const dailyChartData = useMemo(
    () => (selectedAdAnalytics?.daily ?? []).map((row) => ({
      date: row.date,
      spend: Number(row.spend || 0),
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      conversions: Number(row.conversions || 0),
    })),
    [selectedAdAnalytics]
  );

  const availableBreakdowns = useMemo(
    () => Object.entries(selectedAdAnalytics?.breakdowns ?? {}),
    [selectedAdAnalytics]
  );
  const alerts = useMemo(() => {
    const source = summary?.campaigns ?? [];
    const items = source.flatMap((campaign) => {
      const list: Array<{ id: string; level: 'high' | 'medium'; title: string; detail: string }> = [];

      if (campaign.metrics.spend >= 100 && campaign.metrics.conversions === 0) {
        list.push({
          id: `${campaign.id}-no-conv`,
          level: 'high',
          title: 'Spend berjalan tanpa conversion',
          detail: `${campaign.name} sudah belanja ${campaign.currency ? formatCurrencyValue(campaign.currency, campaign.metrics.spend) : formatMetricValue(campaign.metrics.spend)} tapi conversion masih 0.`,
        });
      }

      if (campaign.metrics.impressions >= 1000 && campaign.metrics.ctr > 0 && campaign.metrics.ctr < 1) {
        list.push({
          id: `${campaign.id}-low-ctr`,
          level: 'medium',
          title: 'CTR rendah',
          detail: `${campaign.name} punya CTR ${formatMetricValue(campaign.metrics.ctr)}% dengan ${formatCompactNumber(campaign.metrics.impressions)} impressions.`,
        });
      }

      if (campaign.reviewStatus === 'rejected' || campaign.reviewStatus === 'with_issues') {
        list.push({
          id: `${campaign.id}-review`,
          level: 'high',
          title: 'Campaign ditandai platform',
          detail: `${campaign.name} sedang dalam status review ${campaign.reviewStatus}.`,
        });
      }

      if (campaign.status === 'active' && campaign.metrics.impressions === 0 && campaign.metrics.spend === 0) {
        list.push({
          id: `${campaign.id}-idle`,
          level: 'medium',
          title: 'Campaign aktif tapi belum bergerak',
          detail: `${campaign.name} aktif namun belum punya spend atau impressions pada range yang dipilih.`,
        });
      }

      return list;
    });

    return items.slice(0, 6);
  }, [summary]);

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
      if (import.meta.env.DEV) console.warn('Failed to start Zernio ads connection', error);
      setBusyPlatform(null);
    }
  };

  const handleDisconnect = (account: ZernioAccount) => {
    setDisconnectTarget(account);
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget) return;
    const account = disconnectTarget;
    setDisconnectTarget(null);
    try {
      await disconnectZernioAccount(account.id);
      if (isDemo) {
        setAccounts((current) => current.filter((item) => item.id !== account.id));
      } else {
        await load();
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to disconnect ads account', error);
    }
  };

  const handleRefreshWorkspace = async () => {
    await load({ refresh: true, silent: true });
    if (activeCampaign) {
      await fetchCampaignDetail(activeCampaign, selectedAdId, true);
    }
  };

  const applyPreset = (preset: Exclude<DatePreset, 'custom'>) => {
    const next = buildPresetRange(preset);
    setDatePreset(preset);
    setFromDate(next.fromDate);
    setToDate(next.toDate);
  };

  const loadAdAnalytics = async (ad: ZernioAdListItem, refresh = false) => {
    setSelectedAdId(ad.id);
    setSelectedAdAnalyticsLoading(true);
    try {
      const analytics = await getZernioAdAnalytics({
        adId: ad.id,
        fromDate,
        toDate,
        breakdowns: platformBreakdownDefaults[ad.platform] ?? [],
        refresh,
      });
      setSelectedAdAnalytics(analytics);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to load ad analytics detail', error);
      setSelectedAdAnalytics(null);
    } finally {
      setSelectedAdAnalyticsLoading(false);
    }
  };

  const fetchCampaignDetail = async (campaign: ZernioAdsCampaignSummary, preferredAdId?: string | null, refresh = false) => {
    setCampaignAdsLoading(true);
    setCampaignAds([]);
    setSelectedAdAnalytics(null);

    try {
      const ads = await getZernioAdsByCampaign({
        campaignId: campaign.id,
        accountId: campaign.socialAccountId,
        adAccountId: campaign.adAccountId,
        fromDate,
        toDate,
        refresh,
      });
      setCampaignAds(ads);
      const preferredAd = (preferredAdId ? ads.find((ad) => ad.id === preferredAdId) : null) ?? ads[0] ?? null;
      if (preferredAd) {
        await loadAdAnalytics(preferredAd, refresh);
      } else {
        setSelectedAdId(null);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to inspect campaign detail', error);
    } finally {
      setCampaignAdsLoading(false);
    }
  };

  const handleInspectCampaign = async (campaign: ZernioAdsCampaignSummary) => {
    if (activeCampaignId === campaign.id) {
      void fetchCampaignDetail(campaign, selectedAdId);
      return;
    }
    setActiveCampaignId(campaign.id);
  };

  const handleExportCampaigns = () => {
    if (!summary?.campaigns.length) {
      return;
    }

    const rows = [
      ['Campaign', 'Network', 'Platform', 'Ad Account', 'Status', 'Review Status', 'Currency', 'Spend', 'Impressions', 'Clicks', 'CTR', 'Conversions', 'ROAS'],
      ...summary.campaigns.map((campaign) => [
        campaign.name,
        campaign.networkLabel,
        campaign.platformLabel,
        campaign.adAccountName || '',
        campaign.status,
        campaign.reviewStatus || '',
        campaign.currency || '',
        campaign.metrics.spend,
        campaign.metrics.impressions,
        campaign.metrics.clicks,
        campaign.metrics.ctr,
        campaign.metrics.conversions,
        campaign.metrics.roas ?? '',
      ]),
    ];

    downloadCsv(`ads-campaigns-${fromDate}-to-${toDate}.csv`, rows);
  };

  const handleExportAdAnalytics = () => {
    if (!selectedAdAnalytics) {
      return;
    }

    const rows: Array<Array<string | number>> = [
      ['Ad', selectedAdAnalytics.name],
      ['Platform', selectedAdAnalytics.platformLabel],
      ['Status', selectedAdAnalytics.status],
      [],
      ['Date', 'Spend', 'Impressions', 'Clicks', 'CTR', 'Conversions', 'ROAS'],
      ...selectedAdAnalytics.daily.map((row) => [
        row.date,
        row.spend,
        row.impressions,
        row.clicks,
        row.ctr,
        row.conversions,
        row.roas ?? 0,
      ]),
    ];

    for (const [dimension, values] of Object.entries(selectedAdAnalytics.breakdowns)) {
      rows.push([]);
      rows.push([breakdownLabels[dimension] || dimension, 'Impressions', 'Clicks', 'CTR']);
      values.forEach((row) => {
        const label =
          row.name ??
          row.label ??
          row.value ??
          row.age ??
          row.gender ??
          row.country ??
          row.country_code ??
          row.publisher_platform ??
          row.platform ??
          'Item';

        rows.push([
          String(label),
          Number(row.impressions || 0),
          Number(row.clicks || 0),
          Number(row.ctr || 0),
        ]);
      });
    }

    downloadCsv(`ad-analytics-${slugifyFilenamePart(selectedAdAnalytics.name)}-${fromDate}-to-${toDate}.csv`, rows);
  };

  useEffect(() => {
    if (isDemo || !activeCampaign) {
      return;
    }
    void fetchCampaignDetail(activeCampaign, selectedAdId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCampaign, fromDate, toDate]);


  const runAdsCopilot = async () => {
    const brief = adsCopilotBrief.trim();
    if (!brief) {
      setAdsCopilotOutput('Isi brief kasar dulu. Contoh: promo parfum baru, target wanita aktif 20-35, goal leads WhatsApp.');
      return;
    }

    setAdsCopilotLoading(true);
    try {
      const connectedPlatforms = adAccounts.map((account) => account.platform).join(', ');
      const topCampaignContext = topCampaigns.slice(0, 5).map((campaign) => (
        `- ${campaign.name}: status ${campaign.status}, spend ${campaign.currency ? formatCurrencyValue(campaign.currency, campaign.metrics.spend) : formatMetricValue(campaign.metrics.spend)}, CTR ${formatMetricValue(campaign.metrics.ctr)}%, conversions ${formatNumber(campaign.metrics.conversions)}`
      )).join('\n') || 'Belum ada campaign terbaca.';
      const config = getStoredOpenRouterRuntimeConfig();
      const hasKey = Boolean((config.apiKey || import.meta.env.VITE_OPENROUTER_API_KEY || '').trim());
      const fallback = buildAdsFallbackPlan({
        brief,
        goal: adsCopilotGoal,
        platform: adsCopilotPlatform,
        connectedPlatforms,
        activeCampaigns: summary?.totals.activeCampaigns ?? 0,
        alerts,
        agentMode: adsAgentMode,
        budgetGuardrail: adsBudgetGuardrail,
      });

      const result = !hasKey
        ? fallback
        : await requestProviderText({
            providerId: 'openrouter',
            config,
            messages: [
              {
                role: 'system',
                content: [
                  'Anda adalah AI Ads Strategist senior sekaligus agentic ads copilot untuk bisnis Indonesia.',
                  'Jawab ringkas, actionable, tanpa jargon. Bantu operator membuat campaign plan, copy, prompt creative, eksperimen, dan usulan budget berdasarkan data dashboard jika ada.',
                  'Anda boleh menyarankan pause, scale, rebalance budget, dan prioritas campaign, tetapi WAJIB meminta persetujuan user dulu.',
                  'Jangan pernah mengaku sudah mengeksekusi perubahan iklan. Semua aksi yang menyentuh budget/status campaign harus ditulis sebagai Pending approval dengan pilihan YA / REVISI / TUNDA.',
                ].join('\n'),
              },
              {
                role: 'user',
                content: [
                  `Brief kasar user: ${brief}`,
                  `Goal: ${adsCopilotGoal}`,
                  `Platform prioritas: ${adsCopilotPlatform}`,
                  `Mode agentic: ${adsAgentMode}`,
                  `Guardrail budget: ${adsBudgetGuardrail || 'belum diisi user'}`,
                  `Platform tersambung: ${connectedPlatforms || 'belum ada / preview'}`,
                  `Total campaign aktif: ${summary?.totals.activeCampaigns ?? 0}`,
                  'Alert dashboard:',
                  alerts.length ? alerts.map((item) => `- ${item.title}: ${item.detail}`).join('\n') : '- Tidak ada alert keras.',
                  'Campaign sample:',
                  topCampaignContext,
                  '',
                  'Format wajib: 1) Ringkasan situasi, 2) Rekomendasi objective & audience, 3) Draft copy iklan, 4) Prompt creative foto/video siap generate, 5) Budget split eksperimen, 6) Pending approval dengan pilihan YA / REVISI / TUNDA, 7) Next action 7 hari, 8) Risiko yang harus dicek.',
                  'Penting: boleh mengusulkan scale/pause/rebalance budget, tapi jangan pernah mengaku sudah mengeksekusi. Semua perubahan budget/status campaign harus ditulis sebagai permintaan persetujuan user dulu.',
                ].join('\n'),
              },
            ],
          });
      const actionDrafts = buildAdsAgentActionDrafts({
        brief,
        goal: adsCopilotGoal,
        platform: adsCopilotPlatform,
        agentMode: adsAgentMode,
        budgetGuardrail: adsBudgetGuardrail,
        campaigns: topCampaigns,
        connectedPlatforms,
      });

      if (!isDemo) {
        const run = await createZernioAdsAgentActions({
          brief,
          goal: adsCopilotGoal,
          platform: adsCopilotPlatform,
          agentMode: adsAgentMode,
          budgetGuardrail: adsBudgetGuardrail,
          output: result,
          actions: actionDrafts,
        });
        setAdsAgentActions((current) => [...run.actions, ...current].slice(0, 100));
      } else {
        const now = new Date().toISOString();
        setAdsAgentActions(actionDrafts.map((action, index) => ({
          ...action,
          id: `demo-action-${Date.now()}-${index}`,
          runId: 'demo-run',
          status: 'pending',
          executionStatus: 'proposal_only',
          createdAt: now,
        })));
      }

      setAdsCopilotOutput(result);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to run ads copilot', error);
      setAdsCopilotOutput(buildAdsFallbackPlan({
        brief,
        goal: adsCopilotGoal,
        platform: adsCopilotPlatform,
        connectedPlatforms: adAccounts.map((account) => account.platform).join(', '),
        activeCampaigns: summary?.totals.activeCampaigns ?? 0,
        alerts,
        agentMode: adsAgentMode,
        budgetGuardrail: adsBudgetGuardrail,
      }));
    } finally {
      setAdsCopilotLoading(false);
    }
  };


  const appendAdsAgentDecision = (decision: 'YA' | 'REVISI' | 'TUNDA' | 'ALTERNATIF') => {
    const decisionText: Record<typeof decision, string> = {
      YA: 'User menyetujui rencana awal. Siapkan checklist eksekusi kecil, tetap jangan klaim campaign sudah berubah sampai API eksekusi tersedia.',
      REVISI: 'User minta revisi. Buat opsi yang lebih aman: budget lebih kecil, audience lebih sempit, dan creative test lebih sederhana.',
      TUNDA: 'User menunda. Simpan sebagai draft dan beri daftar data yang perlu dikumpulkan sebelum jalan.',
      ALTERNATIF: 'User minta alternatif. Buat 3 opsi: hemat, standar, agresif, lengkap dengan risiko dan approval point.',
    };
    setAdsCopilotOutput((current) => {
      const base = current.trim() || 'Belum ada output AI. Generate ads plan dulu, lalu pilih keputusan.';
      return `${base}\n\n---\nKeputusan approval: ${decision}\n${decisionText[decision]}`;
    });
  };

  const handleAdsAgentActionDecision = async (action: ZernioAdsAgentAction, decision: 'approve' | 'revise' | 'defer') => {
    setAdsAgentDecisionBusyId(action.id);
    try {
      if (isDemo || action.id.startsWith('demo-action-')) {
        const nextStatus = decision === 'approve' ? 'approved' : decision === 'revise' ? 'revision_requested' : 'deferred';
        setAdsAgentActions((current) => current.map((item) => item.id === action.id ? {
          ...item,
          status: nextStatus,
          executionStatus: decision === 'approve' ? 'ready_for_manual_execution' : nextStatus,
          decidedAt: new Date().toISOString(),
        } : item));
        return;
      }

      const updated = await decideZernioAdsAgentAction(action.id, decision);
      setAdsAgentActions((current) => current.map((item) => item.id === action.id ? updated : item));
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Failed to decide ads agent action', error);
      setAdsCopilotOutput((current) => `${current.trim()}\n\nCatatan: keputusan action gagal disimpan. Coba refresh lalu ulangi.`);
    } finally {
      setAdsAgentDecisionBusyId(null);
    }
  };

  const copyAdsCopilotOutput = async () => {
    if (!adsCopilotOutput.trim()) return;
    try {
      await navigator.clipboard.writeText(adsCopilotOutput);
    } catch {
      // ignore clipboard errors; download is still available
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`rounded-[24px] p-3 md:p-4 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white ring-1 ring-slate-200 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
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

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleRefreshWorkspace()}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
              isDark ? 'bg-slate-900 text-slate-100 hover:bg-slate-700' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
            title="Paksa ambil ulang data ads"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh data'}
          </button>
          <button
            type="button"
            onClick={handleExportCampaigns}
            disabled={!summary?.campaigns.length}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60"
            title="Export campaign lintas network ke CSV"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>

        <div className={`mt-3 rounded-[20px] p-3 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-blue-100 bg-blue-50/60'}`}>
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">Analytics range</p>
                <FieldHelp title="Analytics range" description="Ringkasan ads, daftar campaign, sampai detail ad akan mengikuti rentang tanggal ini. Cocok untuk baca performa 7 hari, 30 hari, atau 90 hari terakhir." />
              </div>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Ubah range untuk mengganti angka spend, CTR, conversions, dan timeline di seluruh Ads Workspace.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
              <div className="flex flex-wrap gap-2">
                {(['7d', '30d', '90d'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                      datePreset === preset
                        ? 'bg-blue-600 text-white'
                        : isDark
                          ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                    title={`Gunakan range ${preset}`}
                  >
                    {preset === '7d' ? '7 hari' : preset === '30d' ? '30 hari' : '90 hari'}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <label htmlFor="ads-from-date" className="flex flex-col gap-1 text-sm">
                  <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Dari</span>
                  <input
                    id="ads-from-date"
                    type="date"
                    value={fromDate}
                    onChange={(event) => {
                      setDatePreset('custom');
                      setFromDate(event.target.value);
                    }}
                    className={`rounded-xl px-3 py-2 ${isDark ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}
                  />
                </label>
                <label htmlFor="ads-to-date" className="flex flex-col gap-1 text-sm">
                  <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sampai</span>
                  <input
                    id="ads-to-date"
                    type="date"
                    value={toDate}
                    onChange={(event) => {
                      setDatePreset('custom');
                      setToDate(event.target.value);
                    }}
                    className={`rounded-xl px-3 py-2 ${isDark ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className={`rounded-[28px] p-4 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Bot className="text-purple-500" size={18} />
                  <h2 className="text-xl font-bold">AI Ads Copilot</h2>
                  <FieldHelp
                    title="AI Ads Copilot"
                    description="Bantu tim yang bingung mulai campaign: dari brief kasar menjadi objective, audience, copy iklan, prompt creative, budget test, dan action 7 hari."
                    howToUse="Tulis produk, target, promo, atau masalah yang mau dikejar. Pilih goal dan platform, lalu klik Generate ads plan. Kalau OpenRouter key ada, AI live dipakai; kalau belum, fallback tetap memberi template demo."
                  />
                </div>
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Brief kasar masuk, plan campaign dan prompt iklan keluar.</p>
              </div>
              <button
                type="button"
                onClick={() => void runAdsCopilot()}
                disabled={adsCopilotLoading}
                className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-60"
              >
                {adsCopilotLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Generate ads plan
              </button>
            </div>

            <textarea
              value={adsCopilotBrief}
              onChange={(event) => setAdsCopilotBrief(event.target.value)}
              rows={3}
              placeholder="Contoh: produk parfum premium, target wanita aktif 20-35, promo bundling, goal leads WhatsApp, butuh creative yang elegan tapi tetap natural..."
              className={`w-full min-h-[96px] resize-y rounded-2xl px-4 py-3 text-sm leading-6 outline-none transition ${isDark ? 'bg-slate-950 text-white placeholder:text-slate-500 ring-1 ring-white/10 focus:ring-blue-400/40' : 'bg-slate-50 text-slate-900 placeholder:text-slate-400 ring-1 ring-slate-200 focus:ring-blue-300'}`}
            />

            <div className="grid gap-3 lg:grid-cols-3">
              <label htmlFor="ads-copilot-goal" className="space-y-1 text-sm font-semibold">
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Goal iklan</span>
                <select
                  id="ads-copilot-goal"
                  value={adsCopilotGoal}
                  onChange={(event) => setAdsCopilotGoal(event.target.value as AdsCopilotGoal)}
                  className={`w-full rounded-2xl px-3 py-2.5 text-sm outline-none ${isDark ? 'bg-slate-950 text-white ring-1 ring-white/10' : 'bg-white text-slate-800 ring-1 ring-slate-200'}`}
                >
                  {ADS_COPILOT_GOALS.map((goal) => <option key={goal.value} value={goal.value}>{goal.label}</option>)}
                </select>
                <p className={`text-[11px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {ADS_COPILOT_GOALS.find((item) => item.value === adsCopilotGoal)?.helper}
                </p>
              </label>
              <label htmlFor="ads-copilot-platform" className="space-y-1 text-sm font-semibold">
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Platform fokus</span>
                <select
                  id="ads-copilot-platform"
                  value={adsCopilotPlatform}
                  onChange={(event) => setAdsCopilotPlatform(event.target.value as AdsCopilotPlatform)}
                  className={`w-full rounded-2xl px-3 py-2.5 text-sm outline-none ${isDark ? 'bg-slate-950 text-white ring-1 ring-white/10' : 'bg-white text-slate-800 ring-1 ring-slate-200'}`}
                >
                  {ADS_COPILOT_PLATFORMS.map((platform) => <option key={platform.value} value={platform.value}>{platform.label}</option>)}
                </select>
                <p className={`text-[11px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {ADS_COPILOT_PLATFORMS.find((item) => item.value === adsCopilotPlatform)?.helper}
                </p>
              </label>
              <label htmlFor="ads-agent-mode" className="space-y-1 text-sm font-semibold">
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Mode AI agent</span>
                <select
                  id="ads-agent-mode"
                  value={adsAgentMode}
                  onChange={(event) => setAdsAgentMode(event.target.value as AdsAgentMode)}
                  className={`w-full rounded-2xl px-3 py-2.5 text-sm outline-none ${isDark ? 'bg-slate-950 text-white ring-1 ring-white/10' : 'bg-white text-slate-800 ring-1 ring-slate-200'}`}
                >
                  {ADS_AGENT_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                </select>
                <p className={`text-[11px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {ADS_AGENT_MODES.find((item) => item.value === adsAgentMode)?.helper}
                </p>
              </label>
            </div>

            <label htmlFor="ads-budget-guardrail" className="block space-y-1 text-sm font-semibold">
              <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Batas budget & approval</span>
              <input
                id="ads-budget-guardrail"
                value={adsBudgetGuardrail}
                onChange={(event) => setAdsBudgetGuardrail(event.target.value)}
                placeholder="Contoh: testing Rp50.000/hari, scale hanya kalau CPL turun 20%, semua perubahan budget harus minta approval."
                className={`w-full rounded-2xl px-3 py-2.5 text-sm outline-none ${isDark ? 'bg-slate-950 text-white placeholder:text-slate-500 ring-1 ring-white/10' : 'bg-white text-slate-800 placeholder:text-slate-400 ring-1 ring-slate-200'}`}
              />
              <p className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Ini bikin AI bergaya seperti copilot: bisa kasih rekomendasi budget, tapi tetap berhenti di tahap minta persetujuan.
              </p>
            </label>
          </div>

          <div className={`rounded-[24px] p-3 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 ring-1 ring-blue-100'}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wand2 className="text-blue-500" size={17} />
                <p className="font-bold">Output strategi</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void copyAdsCopilotOutput()} disabled={!adsCopilotOutput.trim()} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50 ${isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
                  <Copy size={14} />
                  Copy
                </button>
                <button type="button" onClick={() => downloadTextFile('ai-ads-copilot-plan.txt', adsCopilotOutput)} disabled={!adsCopilotOutput.trim()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  <Download size={14} />
                  Download
                </button>
              </div>
            </div>
            {adsCopilotOutput ? (
              <div className="space-y-3">
                <pre className={`max-h-[300px] overflow-y-auto whitespace-pre-wrap rounded-2xl p-4 text-sm leading-6 font-sans ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-white/85 text-slate-800 ring-1 ring-slate-100'}`}>{adsCopilotOutput}</pre>
                <div className={`rounded-2xl p-3 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'bg-white/80 ring-1 ring-purple-100'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold">Approval lane</p>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Simulasi alur agentic: AI menyarankan, user pilih Ya/Revisi/Tunda sebelum eksekusi.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {([
                        ['YA', 'Setujui'] as const,
                        ['REVISI', 'Revisi'] as const,
                        ['TUNDA', 'Tunda'] as const,
                        ['ALTERNATIF', 'Opsi lain'] as const,
                      ]).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => appendAdsAgentDecision(value)}
                          className={`rounded-xl px-3 py-2 text-xs font-bold ${
                            value === 'YA'
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : value === 'REVISI'
                                ? 'bg-amber-500 text-white hover:bg-amber-600'
                                : isDark
                                  ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                <Sparkles size={30} className="mb-3 text-purple-500" />
                <p className="font-semibold">Belum ada plan.</p>
                <p className="mt-1 text-sm">Tulis brief kasar, nanti AI susun campaign plan dan prompt creative.</p>
              </div>
            )}

            {adsAgentActions.length > 0 ? (
              <div className={`mt-3 rounded-2xl p-3 ${isDark ? 'bg-slate-900/80 ring-1 ring-white/10' : 'bg-white/90 ring-1 ring-blue-100'}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">Agent action queue</p>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ini bukan teks doang: tiap rekomendasi masuk antrian approval dan tersimpan.</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isDark ? 'bg-purple-500/15 text-purple-200' : 'bg-purple-50 text-purple-700'}`}>
                    {adsAgentActions.filter((action) => action.status === 'pending').length} pending
                  </span>
                </div>
                <div className="space-y-2">
                  {adsAgentActions.slice(0, 5).map((action) => {
                    const busy = adsAgentDecisionBusyId === action.id;
                    return (
                      <div key={action.id} className={`rounded-2xl p-3 ${isDark ? 'bg-slate-950 ring-1 ring-white/10' : 'bg-slate-50 ring-1 ring-slate-200'}`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-sm">{action.title}</p>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                action.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : action.status === 'revision_requested'
                                    ? 'bg-amber-100 text-amber-700'
                                    : action.status === 'deferred'
                                      ? 'bg-slate-200 text-slate-600'
                                      : 'bg-blue-100 text-blue-700'
                              }`}>
                                {action.status === 'revision_requested' ? 'revisi' : action.status}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                action.riskLevel === 'high'
                                  ? 'bg-rose-100 text-rose-700'
                                  : action.riskLevel === 'medium'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                risk {action.riskLevel || 'low'}
                              </span>
                            </div>
                            <p className={`mt-1 line-clamp-2 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{action.detail}</p>
                            <p className={`mt-1 text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{action.budgetImpact}</p>
                          </div>
                        </div>
                        {action.status === 'pending' ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" disabled={busy} onClick={() => void handleAdsAgentActionDecision(action, 'approve')} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                              {busy ? '...' : 'Setujui'}
                            </button>
                            <button type="button" disabled={busy} onClick={() => void handleAdsAgentActionDecision(action, 'revise')} className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-60">
                              Revisi
                            </button>
                            <button type="button" disabled={busy} onClick={() => void handleAdsAgentActionDecision(action, 'defer')} className={`rounded-xl px-3 py-1.5 text-xs font-bold disabled:opacity-60 ${isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                              Tunda
                            </button>
                          </div>
                        ) : (
                          <p className={`mt-2 text-[11px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Execution: {action.executionStatus.replace(/_/g, ' ')}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {alerts.length > 0 ? (
        <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-bold text-xl">Attention center</h2>
            <FieldHelp title="Attention center" description="Alert ini dibentuk dari data campaign yang sudah dibaca dari workspace ads. Tujuannya supaya user tahu campaign mana yang perlu dicek duluan tanpa buka satu-satu." />
          </div>

          <div className="grid lg:grid-cols-2 gap-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-[24px] p-4 ${
                  alert.level === 'high'
                    ? isDark ? 'border-rose-800 bg-rose-950/20' : 'border-rose-200 bg-rose-50'
                    : isDark ? 'border-amber-800 bg-amber-950/20' : 'border-amber-200 bg-amber-50'
                }`}
              >
                <p className="font-semibold">{alert.title}</p>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{alert.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {previewMode ? (
        <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-blue-500" size={18} />
            <div>
              <h2 className="font-bold text-xl">Preview analytics ads</h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Angka dan chart di bawah ini masih netral agar bentuk dashboard tetap terlihat sebelum network ads pertama tersambung.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mb-6">
            {previewNetworkCards.map((platform) => (
              <div key={platform.key} className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{platform.label}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {platform.connectedAccounts} workspace • {platform.linkedAdAccounts} ad account • {platform.totalCampaigns} campaign
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-slate-800 text-gray-200' : 'border bg-white ring-1 ring-slate-900/5 text-gray-600'}`}>
                    Preview
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Impressions</p>
                    <p className="font-semibold">{formatCompactNumber(platform.impressions)}</p>
                  </div>
                  <div>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Clicks</p>
                    <p className="font-semibold">{formatCompactNumber(platform.clicks)}</p>
                  </div>
                  <div>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CTR</p>
                    <p className="font-semibold">{formatMetricValue(platform.ctr)}%</p>
                  </div>
                  <div>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Conversions</p>
                    <p className="font-semibold">{formatCompactNumber(platform.conversions)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid xl:grid-cols-2 gap-4 mb-6">
            <div className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
              <p className="font-semibold mb-4">Preview spend timeline</p>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={previewAdChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis dataKey="date" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                    <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="spend" stroke="#3B82F6" fill="#93C5FD" fillOpacity={0.35} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
              <p className="font-semibold mb-4">Preview engagement timeline</p>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={previewAdChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis dataKey="date" tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                    <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} />
                    <Tooltip />
                    <Bar dataKey="clicks" fill="#60A5FA" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="conversions" fill="#34D399" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
            <div className="px-4 py-3 border-b border-inherit">
              <p className="font-semibold">Preview campaign table</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {['Campaign', 'Network', 'Ad account', 'Status', 'Spend', 'Clicks', 'CTR', 'ROAS'].map((header) => (
                      <th key={header} className="px-4 py-3 text-left font-medium text-xs">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {previewCampaignRows.map((campaign) => (
                    <tr key={campaign.id}>
                      <td className="px-4 py-3 font-medium">{campaign.name}</td>
                      <td className="px-4 py-3">{campaign.networkLabel}</td>
                      <td className="px-4 py-3">{campaign.adAccountName}</td>
                      <td className="px-4 py-3">{campaign.status}</td>
                      <td className="px-4 py-3">{formatMetricValue(campaign.spend)}</td>
                      <td className="px-4 py-3">{formatCompactNumber(campaign.clicks)}</td>
                      <td className="px-4 py-3">{formatMetricValue(campaign.ctr)}%</td>
                      <td className="px-4 py-3">{campaign.roas == null ? '—' : `${formatMetricValue(campaign.roas)}x`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid xl:grid-cols-2 gap-6">
        <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
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
                <div key={platform.id} className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
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
                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isDark ? 'bg-[#111318] ring-1 ring-white/10 text-white hover:bg-slate-700' : 'border bg-white ring-1 ring-slate-900/5 text-gray-700 hover:bg-gray-50'}`}
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
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60"
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

        <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="text-blue-500" size={18} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xl">Workspace snapshot</h2>
                <FieldHelp title="Workspace snapshot" description="Ringkasan semua network ads yang sudah dipetakan dari workspace tenant ini, termasuk account terhubung, ad account, campaign, dan metrik lintas network." />
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Kalau tenant menghubungkan beberapa network sekaligus, setiap network akan diringkas terpisah lalu digabung di view global ini.
              </p>
            </div>
          </div>

          {adAccounts.length === 0 ? (
            <div className={`rounded-[24px] p-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Belum ada ad account yang tersambung. Mulai dari Meta Ads atau Google Ads sesuai kebutuhan tenant.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Networks aktif</p>
                  <p className="mt-2 text-xl md:text-2xl font-bold tracking-tight">{summary?.totals.networks ?? adAccounts.length}</p>
                </div>
                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ad accounts</p>
                  <p className="mt-2 text-xl md:text-2xl font-bold tracking-tight">{summary?.totals.linkedAdAccounts ?? 0}</p>
                </div>
                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total campaign</p>
                  <p className="mt-2 text-xl md:text-2xl font-bold tracking-tight">{summary?.totals.totalCampaigns ?? 0}</p>
                </div>
                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-xs uppercase tracking-[0.16em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CTR gabungan</p>
                  <p className="mt-2 text-xl md:text-2xl font-bold tracking-tight">{formatMetricValue(summary?.totals.metrics.ctr ?? 0)}%</p>
                </div>
              </div>

              {summary?.totals.spendByCurrency?.length ? (
                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="font-semibold">Spend per currency</p>
                    <FieldHelp title="Spend per currency" description="Workspace ads tidak menormalisasi semua network ke satu mata uang. Karena itu total spend ditampilkan per currency supaya angka tidak menyesatkan." />
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
                    <div key={platform.key} className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
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
          <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="text-blue-500" size={18} />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-xl">Per-account analytics</h2>
                  <FieldHelp title="Per-account analytics" description="Setiap workspace ads bisa punya satu atau lebih ad account. Di sini ringkasan campaign dan spend dipisah per account supaya operator bisa lihat mana yang aktif dan mana yang belum bergerak." />
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Ini bagian yang menentukan apakah dashboard sanggup membaca semua akun ads yang tersambung di tenant yang sama.
                </p>
              </div>
            </div>

            {workspaceAccounts.length === 0 ? (
              <div className={`rounded-[24px] p-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Belum ada account ads yang berhasil dibaca dari workspace ini.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {workspaceAccounts.map((workspaceAccount) => (
                  <div key={workspaceAccount.id} className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
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
                        <div className={`rounded-[24px] p-4 ${isDark ? 'bg-[#111318] ring-1 ring-white/10/70' : 'bg-white ring-1 ring-slate-900/5'}`}>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Belum ada ad account spesifik yang dikembalikan untuk workspace ini.</p>
                        </div>
                      ) : (
                        workspaceAccount.adAccounts.map((adAccount) => (
                          <div key={`${workspaceAccount.id}-${adAccount.id}`} className={`rounded-[24px] p-4 ${isDark ? 'bg-[#111318] ring-1 ring-white/10/70' : 'bg-white ring-1 ring-slate-900/5'}`}>
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

          <section className={`rounded-3xl border ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
            <div className="px-6 py-5 border-b border-inherit">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xl">Campaign intelligence</h2>
                <FieldHelp title="Campaign intelligence" description="Daftar ini mengambil campaign lintas network dari workspace ads lalu menampilkannya dalam format yang lebih mudah dipantau dari dashboard internal." />
              </div>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Data ini sudah bukan khusus Meta saja. Kalau tenant menyalakan Google Ads, LinkedIn Ads, TikTok Ads, Pinterest Ads, atau X Ads, campaign dari network itu juga ikut masuk ke tabel ini.
              </p>
            </div>

            {topCampaigns.length === 0 ? (
              <div className="px-6 py-8">
                <div className={`rounded-[24px] p-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Account ads sudah tersambung, tapi belum ada campaign yang dikembalikan untuk profile tenant ini.
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
                          <div className="flex items-center justify-between gap-3">
                            <span>{campaign.metrics.roas == null ? '—' : `${formatMetricValue(campaign.metrics.roas)}x`}</span>
                            <button
                              type="button"
                              onClick={() => void handleInspectCampaign(campaign)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${activeCampaignId === campaign.id
                                ? 'bg-blue-600 text-white'
                                : isDark
                                  ? 'bg-slate-700 text-slate-100 hover:bg-slate-600'
                                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              }`}
                              title="Buka detail ad di dalam campaign ini"
                            >
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {activeCampaign ? (
            <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-xl">Ad drill-down</h2>
                    <FieldHelp title="Ad drill-down" description="Bagian ini memakai endpoint analytics ads untuk membedah isi campaign sampai level ad." />
                  </div>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Campaign <span className="font-semibold">{activeCampaign.name}</span> • {activeCampaign.networkLabel} • {activeCampaign.adAccountName || 'Ad account belum bernama'}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className={`rounded-[24px] p-3 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Spend</p>
                    <p className="font-semibold">{activeCampaign.currency ? formatCurrencyValue(activeCampaign.currency, activeCampaign.metrics.spend) : '—'}</p>
                  </div>
                  <div className={`rounded-[24px] p-3 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Clicks</p>
                    <p className="font-semibold">{formatCompactNumber(activeCampaign.metrics.clicks)}</p>
                  </div>
                  <div className={`rounded-[24px] p-3 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CTR</p>
                    <p className="font-semibold">{formatMetricValue(activeCampaign.metrics.ctr)}%</p>
                  </div>
                  <div className={`rounded-[24px] p-3 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ROAS</p>
                    <p className="font-semibold">{activeCampaign.metrics.roas == null ? '—' : `${formatMetricValue(activeCampaign.metrics.roas)}x`}</p>
                  </div>
                </div>
              </div>

              <div className="grid xl:grid-cols-[1.05fr_1.25fr] gap-6">
                <div className="space-y-4">
                  <div className={`rounded-2xl border ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="px-4 py-3 border-b border-inherit">
                      <p className="font-semibold">Ads inside campaign</p>
                    </div>

                    {campaignAdsLoading ? (
                      <div className="px-4 py-8 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      </div>
                    ) : campaignAds.length === 0 ? (
                      <div className="px-4 py-5">
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Tidak ada detail level ad yang dikembalikan untuk campaign ini.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-inherit">
                        {campaignAds.map((ad) => (
                          <button
                            key={ad.id}
                            type="button"
                            onClick={() => void loadAdAnalytics(ad)}
                            className={`w-full text-left px-4 py-4 transition ${selectedAdId === ad.id
                              ? isDark ? 'bg-slate-800/90' : 'bg-blue-50'
                              : isDark ? 'hover:bg-slate-800/60' : 'hover:bg-gray-50'
                            }`}
                            title="Lihat analytics detail ad ini"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold truncate">{ad.name}</p>
                                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {ad.adAccountName || 'Ad account'} • {humanizeStatus(ad.status)} • {ad.goal || ad.platformLabel}
                                </p>
                              </div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-slate-700 text-slate-100' : 'bg-white text-gray-600 border border-gray-200'}`}>
                                {formatCompactNumber(ad.metrics.clicks)} clicks
                              </span>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                              <div>
                                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Spend</p>
                                <p className="font-semibold">{activeCampaign.currency ? formatCurrencyValue(activeCampaign.currency, ad.metrics.spend) : formatMetricValue(ad.metrics.spend)}</p>
                              </div>
                              <div>
                                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CTR</p>
                                <p className="font-semibold">{formatMetricValue(ad.metrics.ctr)}%</p>
                              </div>
                              <div>
                                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Conv.</p>
                                <p className="font-semibold">{formatCompactNumber(ad.metrics.conversions)}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <p className="font-semibold">Selected ad analytics</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {selectedAd ? `${selectedAd.name} • ${selectedAd.platformLabel}` : 'Pilih satu ad untuk melihat analytics detail.'}
                        </p>
                      </div>
                      {selectedAdAnalyticsLoading ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> : null}
                    </div>

                    {!selectedAd ? (
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Pilih satu ad di panel kiri untuk membuka timeline dan breakdown analytics.
                      </p>
                    ) : !selectedAdAnalytics ? (
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Analytics detail belum tersedia untuk ad ini.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={handleExportAdAnalytics}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all"
                            title="Export timeline dan breakdown ad ini ke CSV"
                          >
                            <Download size={15} />
                            Export ad analytics CSV
                          </button>
                          <button
                            type="button"
                            onClick={() => selectedAd && void loadAdAnalytics(selectedAd, true)}
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                              isDark ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                            }`}
                            title="Paksa ambil ulang analytics ad ini"
                          >
                            <RefreshCw size={15} className={selectedAdAnalyticsLoading ? 'animate-spin' : ''} />
                            Refresh ad analytics
                          </button>
                        </div>

                        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                          <div className={`rounded-[24px] p-3 ${isDark ? 'bg-[#111318] ring-1 ring-white/10/70' : 'bg-white ring-1 ring-slate-900/5'}`}>
                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Impressions</p>
                            <p className="font-semibold">{formatCompactNumber(selectedAdAnalytics.summary.impressions)}</p>
                          </div>
                          <div className={`rounded-[24px] p-3 ${isDark ? 'bg-[#111318] ring-1 ring-white/10/70' : 'bg-white ring-1 ring-slate-900/5'}`}>
                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Clicks</p>
                            <p className="font-semibold">{formatCompactNumber(selectedAdAnalytics.summary.clicks)}</p>
                          </div>
                          <div className={`rounded-[24px] p-3 ${isDark ? 'bg-[#111318] ring-1 ring-white/10/70' : 'bg-white ring-1 ring-slate-900/5'}`}>
                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CTR</p>
                            <p className="font-semibold">{formatMetricValue(selectedAdAnalytics.summary.ctr)}%</p>
                          </div>
                          <div className={`rounded-[24px] p-3 ${isDark ? 'bg-[#111318] ring-1 ring-white/10/70' : 'bg-white ring-1 ring-slate-900/5'}`}>
                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ROAS</p>
                            <p className="font-semibold">{selectedAdAnalytics.summary.roas == null ? '—' : `${formatMetricValue(selectedAdAnalytics.summary.roas)}x`}</p>
                          </div>
                        </div>

                        <div className={`rounded-2xl border ${isDark ? 'bg-[#111318] ring-1 ring-white/10/70' : 'bg-white ring-1 ring-slate-900/5'}`}>
                          <div className="px-4 py-3 border-b border-inherit">
                            <p className="font-semibold">Daily timeline</p>
                          </div>
                          {selectedAdAnalytics.daily.length === 0 ? (
                            <div className="px-4 py-4">
                              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Belum ada timeline harian yang dikembalikan.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[620px] text-sm">
                                <thead>
                                  <tr className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {['Date', 'Spend', 'Impressions', 'Clicks', 'CTR', 'Conversions'].map((header) => (
                                      <th key={header} className="px-4 py-3 text-left font-medium text-xs">{header}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-inherit">
                                  {selectedAdAnalytics.daily.slice(-7).reverse().map((row) => (
                                    <tr key={row.date}>
                                      <td className="px-4 py-3">{row.date}</td>
                                      <td className="px-4 py-3">{activeCampaign.currency ? formatCurrencyValue(activeCampaign.currency, row.spend) : formatMetricValue(row.spend)}</td>
                                      <td className="px-4 py-3">{formatCompactNumber(row.impressions)}</td>
                                      <td className="px-4 py-3">{formatCompactNumber(row.clicks)}</td>
                                      <td className="px-4 py-3">{formatMetricValue(row.ctr)}%</td>
                                      <td className="px-4 py-3">{formatCompactNumber(row.conversions)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {dailyChartData.length > 0 ? (
                          <div className={`rounded-[24px] p-4 ${isDark ? 'bg-[#111318] ring-1 ring-white/10/70' : 'bg-white ring-1 ring-slate-900/5'}`}>
                            <div className="flex items-center gap-2 mb-4">
                              <p className="font-semibold">Performance chart</p>
                              <FieldHelp title="Performance chart" description="Visual cepat untuk melihat pola spend, clicks, dan conversions per hari tanpa harus membaca tabel satu per satu." />
                            </div>

                            <div className="grid xl:grid-cols-2 gap-4">
                              <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={dailyChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E5E7EB'} />
                                    <XAxis dataKey="date" stroke={isDark ? '#94A3B8' : '#6B7280'} tick={{ fontSize: 12 }} />
                                    <YAxis stroke={isDark ? '#94A3B8' : '#6B7280'} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="spend" stroke="#3B82F6" fill="#93C5FD" fillOpacity={0.3} name="Spend" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>

                              <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={dailyChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E5E7EB'} />
                                    <XAxis dataKey="date" stroke={isDark ? '#94A3B8' : '#6B7280'} tick={{ fontSize: 12 }} />
                                    <YAxis stroke={isDark ? '#94A3B8' : '#6B7280'} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="clicks" fill="#10B981" name="Clicks" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="conversions" fill="#F59E0B" name="Conversions" radius={[6, 6, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {availableBreakdowns.length > 0 ? (
                          <div className={`rounded-[24px] p-4 ${isDark ? 'bg-[#111318] ring-1 ring-white/10/70' : 'bg-white ring-1 ring-slate-900/5'}`}>
                            <div className="flex items-center gap-2 mb-4">
                              <p className="font-semibold">Breakdowns</p>
                              <FieldHelp title="Breakdowns" description="Breakdown yang tersedia bergantung pada platform. Meta dan TikTok biasanya paling kaya di bagian ini." />
                            </div>

                            <div className="grid xl:grid-cols-2 gap-4">
                              {availableBreakdowns.map(([dimension, rows]) => (
                                <div key={dimension} className={`rounded-[24px] p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                                  <p className="font-semibold">{breakdownLabels[dimension] || dimension}</p>
                                  <div className="mt-3 space-y-2">
                                    {rows.slice(0, 5).map((row, index) => {
                                      const label =
                                        row.name ??
                                        row.label ??
                                        row.value ??
                                        row.age ??
                                        row.gender ??
                                        row.country ??
                                        row.country_code ??
                                        row.publisher_platform ??
                                        row.platform ??
                                        `Item ${index + 1}`;

                                      return (
                                        <div key={`${dimension}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                                          <div className="min-w-0">
                                            <p className="truncate font-medium">{String(label)}</p>
                                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>
                                              {formatCompactNumber(Number(row.impressions || 0))} impressions
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-semibold">{formatCompactNumber(Number(row.clicks || 0))} clicks</p>
                                            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>
                                              {formatMetricValue(Number(row.ctr || 0))}%
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </>
      ) : null}


      {disconnectTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className={`w-full max-w-md rounded-[28px] border p-5 shadow-2xl ${isDark ? 'border-white/10 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-950'}`}>
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500"><Unplug size={20} /></span>
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">Putuskan akun ads?</h3>
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Putuskan {disconnectTarget.displayName || disconnectTarget.username || disconnectTarget.platform} dari workspace ini?</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDisconnectTarget(null)} className={`rounded-2xl px-4 py-2 text-sm font-bold ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}>Batal</button>
              <button type="button" onClick={() => void confirmDisconnect()} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700">Putuskan</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

