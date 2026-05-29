import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import {
  approvalFlows,
  notificationDestinations,
  replyTemplates,
  routingRules,
  slaPolicies,
} from '../../data/omnichannelMock';
import FieldHelp from '../../components/medsos/FieldHelp';
import {
  McsAdsIcon,
  McsConnectionsIcon,
  McsIconBadge,
  McsInboxIcon,
  McsMarketplaceIcon,
} from '../../components/medsos/MyCommerSocialIcons';
import {
  BellRing,
  Bot,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  Shield,
  Trash2,
  UsersRound,
  Workflow,
} from 'lucide-react';
import { settingsService, type ManagedLogisticsStatus } from '../../services/settingsService';

const STORAGE_KEY = 'mycommersocial_settings_v2';

type WorkspaceSeat = {
  id: number;
  name: string;
  role: string;
  channels: string;
};

type AnalysisModelPreset = 'auto' | 'fast' | 'balanced' | 'deep' | 'custom';

type AiAnalysisSettings = {
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  modelPreset: AnalysisModelPreset;
  model: string;
  customModel: string;
  temperature: number;
  maxTokens: number;
};

type SettingsState = {
  channelAccess: {
    waInbox: boolean;
    socialAds: boolean;
    marketplace: boolean;
  };
  logisticsAssistant: {
    active: boolean;
    provider: 'rajaongkir';
    shippingCostEnabled: boolean;
    trackingEnabled: boolean;
    originId: string;
    originLabel: string;
    defaultCouriers: string;
    defaultWeightGrams: number;
    automationTokenMasked: string | null;
  };
  aiAnalysis: AiAnalysisSettings;
  systemMessages: {
    postAnalysis: string;
    contentGeneration: string;
    inboxReply: string;
  };
  externalWebhook: {
    active: boolean;
    url: string;
  };
  activeSlaIds: number[];
  activeRoutingIds: number[];
  activeApprovalIds: number[];
  activeTemplateIds: number[];
  activeNotificationIds: number[];
  seats: WorkspaceSeat[];
};

const defaultSettings: SettingsState = {
  channelAccess: {
    waInbox: true,
    socialAds: true,
    marketplace: false,
  },
  logisticsAssistant: {
    active: false,
    provider: 'rajaongkir',
    shippingCostEnabled: true,
    trackingEnabled: true,
    originId: '',
    originLabel: '',
    defaultCouriers: 'jne, sicepat, anteraja',
    defaultWeightGrams: 1000,
    automationTokenMasked: null,
  },
  aiAnalysis: {
    hasApiKey: false,
    apiKeyMasked: null,
    modelPreset: 'auto',
    model: 'openrouter/auto',
    customModel: '',
    temperature: 0.3,
    maxTokens: 1800,
  },
  systemMessages: {
    postAnalysis: 'Anda adalah analis performa konten untuk dashboard bisnis dan social commerce. Tulis Bahasa Indonesia yang jelas, tajam, berbasis metrik, menyebut penyebab performa, risiko, rekomendasi prioritas, dan eksperimen berikutnya. Jangan mengarang data audience jika data lokasi, usia, atau gender tidak tersedia.',
    contentGeneration: 'Anda adalah copywriter kreatif profesional yang ahli dalam membuat caption media sosial yang menarik dan berorientasi pada konversi.',
    inboxReply: 'Anda adalah staf layanan pelanggan yang ramah dan membantu. Balas pesan pelanggan dengan sopan dan berikan solusi yang tepat.',
  },
  externalWebhook: {
    active: false,
    url: '',
  },
  activeSlaIds: slaPolicies.map((policy) => policy.id),
  activeRoutingIds: routingRules.filter((rule) => rule.active).map((rule) => rule.id),
  activeApprovalIds: approvalFlows.map((flow) => flow.id),
  activeTemplateIds: replyTemplates.slice(0, 3).map((template) => template.id),
  activeNotificationIds: notificationDestinations.filter((item) => item.active).map((item) => item.id),
  seats: [],
};

type SeatDraft = {
  name: string;
  role: string;
  channels: string;
};

const emptySeatDraft: SeatDraft = {
  name: '',
  role: '',
  channels: '',
};

const MODEL_PRESET_MAP: Record<Exclude<AnalysisModelPreset, 'custom'>, string> = {
  auto: 'openrouter/auto',
  fast: 'google/gemini-3-flash-preview',
  balanced: 'openai/gpt-5.1',
  deep: 'anthropic/claude-sonnet-4.5',
};

const MODEL_PRESET_OPTIONS: Array<{
  id: AnalysisModelPreset;
  label: string;
  helper: string;
  detail: string;
}> = [
  {
    id: 'auto',
    label: 'Auto',
    helper: 'Paling aman untuk mulai',
    detail: 'OpenRouter memilih model terbaik otomatis berdasarkan isi prompt.',
  },
  {
    id: 'fast',
    label: 'Fast',
    helper: 'Cepat dan ringan',
    detail: 'Cocok untuk analisis singkat saat butuh respons paling cepat.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    helper: 'Seimbang',
    detail: 'Cocok untuk kualitas stabil tanpa terlalu berat.',
  },
  {
    id: 'deep',
    label: 'Deep',
    helper: 'Lebih mendalam',
    detail: 'Cocok untuk insight yang lebih tajam dan lebih lengkap.',
  },
  {
    id: 'custom',
    label: 'Custom',
    helper: 'Isi model sendiri',
    detail: 'Pakai slug model OpenRouter Anda sendiri. Jika gagal, sistem akan fallback ke Auto.',
  },
];

function getModelPresetSummary(preset: AnalysisModelPreset) {
  return MODEL_PRESET_OPTIONS.find((item) => item.id === preset) ?? MODEL_PRESET_OPTIONS[0];
}

function inferModelPreset(model?: string): AnalysisModelPreset {
  if (!model) return 'auto';
  const entry = Object.entries(MODEL_PRESET_MAP).find(([, value]) => value === model);
  return (entry?.[0] as AnalysisModelPreset | undefined) ?? 'custom';
}

function buildAiAnalysisSettings(value?: Partial<AiAnalysisSettings>) {
  const preset = inferModelPreset(value?.model);
  return {
    ...defaultSettings.aiAnalysis,
    ...value,
    modelPreset: value?.modelPreset ?? preset,
    model: value?.model || MODEL_PRESET_MAP.auto,
    customModel: preset === 'custom' ? value?.model || value?.customModel || '' : value?.customModel || '',
    temperature: typeof value?.temperature === 'number' ? value.temperature : defaultSettings.aiAnalysis.temperature,
    maxTokens: typeof value?.maxTokens === 'number' ? value.maxTokens : defaultSettings.aiAnalysis.maxTokens,
  };
}

function maskKeyLocally(value: string) {
  if (!value) return null;
  if (value.length <= 8) {
    return `${value.slice(0, 2)}•••${value.slice(-2)}`;
  }
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function formatSavedAt(value: string | null) {
  if (!value) return 'Belum pernah disimpan';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Belum pernah disimpan';
  return date.toLocaleString('id-ID');
}

function buildLogisticsAssistantSettings(value?: Partial<SettingsState['logisticsAssistant']>) {
  const rawCouriers = (value as any)?.defaultCouriers;
  return {
    ...defaultSettings.logisticsAssistant,
    ...value,
    provider: 'rajaongkir' as const,
    originId: value?.originId !== undefined && value?.originId !== null ? String(value.originId) : '',
    originLabel: typeof value?.originLabel === 'string' ? value.originLabel : '',
    defaultCouriers: Array.isArray(rawCouriers)
      ? rawCouriers.join(', ')
      : typeof rawCouriers === 'string'
        ? rawCouriers
        : defaultSettings.logisticsAssistant.defaultCouriers,
    defaultWeightGrams: Math.max(100, Number(value?.defaultWeightGrams) || defaultSettings.logisticsAssistant.defaultWeightGrams),
    automationTokenMasked: typeof value?.automationTokenMasked === 'string' ? value.automationTokenMasked : null,
  };
}

function toggleSelection(list: number[], value: number) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function ToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-600'
      }`}
    >
      {label}
    </button>
  );
}

export default function MedsosSettings() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const isDemo = location.pathname.startsWith('/demo');
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [seatDraft, setSeatDraft] = useState<SeatDraft>(emptySeatDraft);
  const [analysisApiKeyInput, setAnalysisApiKeyInput] = useState('');
  const [managedLogisticsStatus, setManagedLogisticsStatus] = useState<ManagedLogisticsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fieldClass = isDark
    ? 'w-full rounded-2xl border border-slate-700/80 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder:text-gray-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15'
    : 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10';
  const textareaFieldClass = `${fieldClass} min-h-[112px] resize-y leading-6`;

  useEffect(() => {
    const load = async () => {
      try {
        if (!isDemo) {
          const backendResponse = await settingsService.getSettings();
          const backendSettings = (backendResponse.data as {
            myCommerSocialSettings?: Partial<SettingsState>;
            myCommerSocialSettingsSavedAt?: string;
            managedLogisticsStatus?: ManagedLogisticsStatus;
          }) || {};
          const workspaceSettings = backendSettings.myCommerSocialSettings;
          setManagedLogisticsStatus(backendSettings.managedLogisticsStatus || null);

          if (workspaceSettings) {
            setSettings({
              ...defaultSettings,
              ...workspaceSettings,
              channelAccess: {
                ...defaultSettings.channelAccess,
                ...(workspaceSettings.channelAccess ?? {}),
              },
              logisticsAssistant: buildLogisticsAssistantSettings(workspaceSettings.logisticsAssistant),
              aiAnalysis: buildAiAnalysisSettings(workspaceSettings.aiAnalysis),
              seats: workspaceSettings.seats ?? [],
            });
            setLastSavedAt(backendSettings.myCommerSocialSettingsSavedAt || null);
            setDirty(false);
            return;
          }
        }

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as { settings?: Partial<SettingsState>; lastSavedAt?: string };
          if (parsed.settings) {
            setSettings({
              ...defaultSettings,
              ...parsed.settings,
              channelAccess: {
                ...defaultSettings.channelAccess,
                ...(parsed.settings.channelAccess ?? {}),
              },
              logisticsAssistant: buildLogisticsAssistantSettings(parsed.settings.logisticsAssistant),
              aiAnalysis: buildAiAnalysisSettings(parsed.settings.aiAnalysis),
              seats: parsed.settings.seats ?? [],
            });
          }
          if (parsed.lastSavedAt) {
            setLastSavedAt(parsed.lastSavedAt);
          }
        }
      } catch (error) {
        console.error('Failed to load MyCommerSocial settings', error);
        if (!isDemo) {
          toast.error('Gagal memuat settings workspace.');
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isDemo]);

  const activeSummary = useMemo(
    () => ({
      sla: settings.activeSlaIds.length,
      routing: settings.activeRoutingIds.length,
      approvals: settings.activeApprovalIds.length,
      templates: settings.activeTemplateIds.length,
      seats: settings.seats.length,
    }),
    [settings]
  );

  const saveSettings = async () => {
    const savedAt = new Date().toISOString();
    try {
      setSaving(true);
      const resolvedModel = settings.aiAnalysis.modelPreset === 'custom'
        ? settings.aiAnalysis.customModel.trim() || settings.aiAnalysis.model || MODEL_PRESET_MAP.auto
        : MODEL_PRESET_MAP[settings.aiAnalysis.modelPreset as Exclude<AnalysisModelPreset, 'custom'>];

      const settingsPayload: Omit<SettingsState, 'aiAnalysis'> & { aiAnalysis: Record<string, unknown> } = {
        ...settings,
        logisticsAssistant: {
          ...settings.logisticsAssistant,
          originId: settings.logisticsAssistant.originId.trim(),
          originLabel: settings.logisticsAssistant.originLabel.trim(),
          defaultCouriers: settings.logisticsAssistant.defaultCouriers,
          defaultWeightGrams: settings.logisticsAssistant.defaultWeightGrams,
        },
        aiAnalysis: {
          hasApiKey: settings.aiAnalysis.hasApiKey,
          apiKeyMasked: settings.aiAnalysis.apiKeyMasked,
          modelPreset: settings.aiAnalysis.modelPreset,
          model: resolvedModel,
          customModel: settings.aiAnalysis.customModel.trim(),
          temperature: settings.aiAnalysis.temperature,
          maxTokens: settings.aiAnalysis.maxTokens,
        },
      };

      if (analysisApiKeyInput.trim()) {
        settingsPayload.aiAnalysis.apiKey = analysisApiKeyInput.trim();
      }

      let nextSettings: SettingsState;

      if (isDemo) {
        nextSettings = {
          ...settings,
          aiAnalysis: buildAiAnalysisSettings({
            ...settings.aiAnalysis,
            hasApiKey: analysisApiKeyInput.trim() ? true : settings.aiAnalysis.hasApiKey,
            apiKeyMasked: analysisApiKeyInput.trim()
              ? maskKeyLocally(analysisApiKeyInput.trim())
              : settings.aiAnalysis.apiKeyMasked,
            model: resolvedModel,
          }),
        };
      } else {
        const response = await settingsService.updateSettings({
          myCommerSocialSettings: settingsPayload,
          myCommerSocialSettingsSavedAt: savedAt,
        });
        setManagedLogisticsStatus(response.data.managedLogisticsStatus || null);

        const returnedSettings = (response.data as { myCommerSocialSettings?: Partial<SettingsState> }).myCommerSocialSettings;
        nextSettings = returnedSettings
          ? {
              ...defaultSettings,
              ...returnedSettings,
              channelAccess: {
                ...defaultSettings.channelAccess,
                ...(returnedSettings.channelAccess ?? {}),
              },
              logisticsAssistant: buildLogisticsAssistantSettings(returnedSettings.logisticsAssistant),
              aiAnalysis: buildAiAnalysisSettings({
                ...returnedSettings.aiAnalysis,
                hasApiKey: analysisApiKeyInput.trim() ? true : returnedSettings.aiAnalysis?.hasApiKey ?? settings.aiAnalysis.hasApiKey,
                apiKeyMasked: analysisApiKeyInput.trim()
                  ? maskKeyLocally(analysisApiKeyInput.trim())
                  : returnedSettings.aiAnalysis?.apiKeyMasked ?? settings.aiAnalysis.apiKeyMasked,
              }),
              seats: returnedSettings.seats ?? settings.seats,
            }
          : {
              ...settings,
              logisticsAssistant: buildLogisticsAssistantSettings(settings.logisticsAssistant),
              aiAnalysis: buildAiAnalysisSettings({
                ...settings.aiAnalysis,
                hasApiKey: analysisApiKeyInput.trim() ? true : settings.aiAnalysis.hasApiKey,
                apiKeyMasked: analysisApiKeyInput.trim()
                  ? maskKeyLocally(analysisApiKeyInput.trim())
                  : settings.aiAnalysis.apiKeyMasked,
                model: resolvedModel,
              }),
            };
      }

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          settings: nextSettings,
          lastSavedAt: savedAt,
        })
      );
      setSettings(nextSettings);
      setAnalysisApiKeyInput('');
      setLastSavedAt(savedAt);
      setDirty(false);
      toast.success('Settings berhasil disimpan.');
    } catch (error) {
      console.error('Failed to save MyCommerSocial settings', error);
      toast.error('Gagal menyimpan settings workspace.');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (updater: (current: SettingsState) => SettingsState) => {
    setSettings((current) => updater(current));
    setDirty(true);
  };

  const addSeat = () => {
    if (!seatDraft.name.trim() || !seatDraft.role.trim()) {
      toast.error('Nama dan role team seat wajib diisi.');
      return;
    }

    updateSettings((current) => ({
      ...current,
      seats: [
        ...current.seats,
        {
          id: Date.now(),
          name: seatDraft.name.trim(),
          role: seatDraft.role.trim(),
          channels: seatDraft.channels.trim(),
        },
      ],
    }));
    setSeatDraft(emptySeatDraft);
    toast.success('Team seat ditambahkan.');
  };

  const channelCards = [
    {
      key: 'waInbox' as const,
      title: 'WA Inbox',
      description: 'Aktifkan akses WhatsApp melalui workspace inbox internal.',
      icon: McsInboxIcon,
    },
    {
      key: 'socialAds' as const,
      title: 'Social + Ads',
      description: 'Aktifkan koneksi social media dan ads melalui workspace sosial.',
      icon: McsAdsIcon,
    },
    {
      key: 'marketplace' as const,
      title: 'Marketplace',
      description: 'Simpan status modul marketplace agar tim tahu kapan fitur ini dibuka.',
      icon: McsMarketplaceIcon,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className={`rounded-2xl px-4 py-2.5 ${isDark ? 'bg-slate-900/60 text-gray-200 ring-1 ring-white/10' : 'bg-white text-gray-700 ring-1 ring-slate-200 shadow-sm'}`}>
          <p className="text-[10px] uppercase tracking-[0.18em]">Last saved</p>
          <p className="text-xs font-semibold mt-0.5">{formatSavedAt(lastSavedAt)}</p>
        </div>
        <button
          type="button"
          onClick={() => void saveSettings()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
        {dirty ? (
          <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Ada perubahan belum disimpan.</p>
        ) : null}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {channelCards.map((card) => (
          <div key={card.key} className={`rounded-[24px] p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
            <McsIconBadge
              icon={card.icon}
              size={42}
              iconSize={18}
              tone={card.key === 'waInbox' ? 'emerald' : card.key === 'socialAds' ? 'blue' : 'violet'}
            />
            <div className="flex items-start justify-between gap-3 mt-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-lg">{card.title}</h2>
                  <FieldHelp
                    title={card.title}
                    description={card.description}
                    howToUse="Aktifkan toggle kalau workspace ini memang dipakai tim. Matikan hanya kalau channel tersebut belum ingin digunakan atau sedang tidak masuk scope operasional."
                  />
                </div>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.description}</p>
              </div>
              <ToggleButton
                active={settings.channelAccess[card.key]}
                label={settings.channelAccess[card.key] ? 'Aktif' : 'Nonaktif'}
                onClick={() =>
                  updateSettings((current) => ({
                    ...current,
                    channelAccess: {
                      ...current.channelAccess,
                      [card.key]: !current.channelAccess[card.key],
                    },
                  }))
                }
              />
            </div>
          </div>
        ))}
      </div>

      <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5 mb-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-3">
              <McsIconBadge icon={McsConnectionsIcon} size={44} iconSize={19} tone="blue" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-lg">Logistics assistant</h2>
                  <FieldHelp
                    title="Logistics assistant"
                    description="Managed integration RajaOngkir untuk kebutuhan cek ongkir dan cek resi tanpa customer harus login ke provider."
                    howToUse="Aktifkan dulu assistant-nya, isi origin dan kurir default, lalu simpan. Setelah itu workflow AI bisa memanggil cek ongkir atau cek resi secara otomatis."
                  />
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Managed integration RajaOngkir untuk AI cek ongkir dan cek resi tanpa customer login ke provider.
                </p>
              </div>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Saat webhook AI aktif, sistem akan menyisipkan tool logistics otomatis ke payload webhook. Jadi workflow AI bisa pakai cek ongkir dan cek resi tanpa mengekspos RajaOngkir ke customer.
            </p>
          </div>

          <div className={`rounded-[24px] p-4 min-w-[280px] ${isDark ? 'bg-slate-900/70 ring-1 ring-white/10' : 'bg-blue-50 ring-1 ring-blue-100'}`}>
            <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Server status</p>
            <p className="mt-2 text-lg font-bold tracking-tight">
              {managedLogisticsStatus?.configured ? 'Ready to use' : 'Need API key'}
            </p>
            <p className={`mt-2 text-xs leading-5 ${isDark ? 'text-gray-400' : 'text-blue-900/80'}`}>
              {managedLogisticsStatus?.helper || 'Status logistics assistant akan muncul setelah settings backend dimuat.'}
            </p>
          </div>
        </div>

        <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`rounded-[24px] p-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'bg-gray-50 border border-gray-100'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">Aktifkan logistics assistant</p>
                  <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Jika aktif, AI workflow dapat memanggil tool cek ongkir dan cek resi.</p>
                </div>
                <ToggleButton
                  active={settings.logisticsAssistant.active}
                  label={settings.logisticsAssistant.active ? 'Aktif' : 'Off'}
                  onClick={() =>
                    updateSettings((current) => ({
                      ...current,
                      logisticsAssistant: {
                        ...current.logisticsAssistant,
                        active: !current.logisticsAssistant.active,
                      },
                    }))
                  }
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className={`rounded-2xl p-3 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Cek ongkir</p>
                  <ToggleButton
                    active={settings.logisticsAssistant.shippingCostEnabled}
                    label={settings.logisticsAssistant.shippingCostEnabled ? 'Aktif' : 'Off'}
                    onClick={() =>
                      updateSettings((current) => ({
                        ...current,
                        logisticsAssistant: {
                          ...current.logisticsAssistant,
                          shippingCostEnabled: !current.logisticsAssistant.shippingCostEnabled,
                        },
                      }))
                    }
                  />
                </div>
                <div className={`rounded-2xl p-3 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Cek resi</p>
                  <ToggleButton
                    active={settings.logisticsAssistant.trackingEnabled}
                    label={settings.logisticsAssistant.trackingEnabled ? 'Aktif' : 'Off'}
                    onClick={() =>
                      updateSettings((current) => ({
                        ...current,
                        logisticsAssistant: {
                          ...current.logisticsAssistant,
                          trackingEnabled: !current.logisticsAssistant.trackingEnabled,
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Origin ID RajaOngkir
                <FieldHelp title="Origin ID RajaOngkir" description="Isi ID lokasi asal dari RajaOngkir. Ini dipakai sebagai origin default saat AI menghitung ongkir." howToUse="Cari dulu origin ID dari akun RajaOngkir Anda, lalu tempelkan di sini. Pakai ID asal gudang atau lokasi kirim utama." />
              </span>
              <input
                value={settings.logisticsAssistant.originId}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    logisticsAssistant: {
                      ...current.logisticsAssistant,
                      originId: event.target.value,
                    },
                  }))
                }
                placeholder="Contoh: 501"
                className={fieldClass}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Label origin
                <FieldHelp title="Label origin" description="Nama gudang atau lokasi asal agar lebih mudah dibaca owner dan AI workflow." howToUse="Isi nama manusiawi seperti Gudang Jakarta Barat atau Warehouse Surabaya agar tim mudah mengenali origin yang sedang dipakai." />
              </span>
              <input
                value={settings.logisticsAssistant.originLabel}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    logisticsAssistant: {
                      ...current.logisticsAssistant,
                      originLabel: event.target.value,
                    },
                  }))
                }
                placeholder="Contoh: Gudang Jakarta Barat"
                className={fieldClass}
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Kurir default
                <FieldHelp title="Kurir default" description="Pisahkan dengan koma. Contoh: jne, sicepat, anteraja. Jika customer tidak menyebut kurir, AI akan memakai daftar ini." howToUse="Masukkan kode kurir dengan format koma. Urutan depan bisa dianggap prioritas awal kalau customer tidak menyebut kurir tertentu." />
              </span>
              <input
                value={settings.logisticsAssistant.defaultCouriers}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    logisticsAssistant: {
                      ...current.logisticsAssistant,
                      defaultCouriers: event.target.value,
                    },
                  }))
                }
                placeholder="jne, sicepat, anteraja"
                className={fieldClass}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Berat default
                <FieldHelp title="Berat default" description="Dipakai jika AI belum mendapat berat paket dari katalog atau customer. Satuan gram." howToUse="Isi angka gram sebagai fallback, misalnya 1000 untuk 1 kg. Gunakan nilai aman agar estimasi ongkir tidak terlalu meleset." />
              </span>
              <input
                type="number"
                min={100}
                step={100}
                value={settings.logisticsAssistant.defaultWeightGrams}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    logisticsAssistant: {
                      ...current.logisticsAssistant,
                      defaultWeightGrams: Math.max(100, Number(event.target.value) || 100),
                    },
                  }))
                }
                className={fieldClass}
              />
            </label>
          </div>

          <div className={`rounded-[24px] p-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'bg-gray-50 border border-gray-100'}`}>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={18} className="text-blue-500" />
              <h3 className="font-bold">Cara kerja nanti</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-950 text-gray-300' : 'bg-white text-gray-700 border border-gray-100'}`}>
                Customer tanya ongkir / resi ke AI customer service.
              </div>
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-950 text-gray-300' : 'bg-white text-gray-700 border border-gray-100'}`}>
                Webhook AI menerima payload yang sudah berisi descriptor tool logistics assistant.
              </div>
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-950 text-gray-300' : 'bg-white text-gray-700 border border-gray-100'}`}>
                Workflow AI memanggil endpoint internal kita, lalu backend kita yang bicara ke RajaOngkir.
              </div>
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-950 text-gray-300' : 'bg-white text-gray-700 border border-gray-100'}`}>
                Customer tidak perlu login RajaOngkir dan tidak tahu ada n8n di belakang layar.
              </div>
            </div>

            <div className={`mt-4 rounded-2xl p-4 ${isDark ? 'bg-blue-500/10 text-blue-100' : 'bg-blue-50 text-blue-900'}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Automation token</p>
              <p className="mt-2 text-sm">
                {settings.logisticsAssistant.automationTokenMasked
                  ? `Sudah dibuat (${settings.logisticsAssistant.automationTokenMasked}) dan akan dikirim otomatis ke payload webhook.`
                  : 'Token automation akan dibuat otomatis saat settings pertama kali disimpan.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Shield size={18} className="text-emerald-500" />
            <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg">SLA policies</h2>
            <FieldHelp
              title="SLA policies"
              description="Bagian ini menjelaskan target first response dan resolution per channel atau jenis interaksi."
              howToUse="Pakai daftar ini sebagai acuan kerja tim. Bila target bisnis berubah, update nilai SLA agar operator dan reviewer punya patokan yang sama."
            />
          </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pilih SLA yang aktif untuk tim operasional.</p>
            </div>
          </div>
          <div className="space-y-3">
            {slaPolicies.map((policy) => {
              const active = settings.activeSlaIds.includes(policy.id);
              return (
                <div key={policy.id} className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{policy.channel}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Owner {policy.owner}</p>
                    </div>
                    <ToggleButton
                      active={active}
                      label={active ? 'Aktif' : 'Off'}
                      onClick={() =>
                        updateSettings((current) => ({
                          ...current,
                          activeSlaIds: toggleSelection(current.activeSlaIds, policy.id),
                        }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>First response</p>
                      <p className="font-semibold">{policy.firstResponse}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Resolution</p>
                      <p className="font-semibold">{policy.resolution}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Workflow size={18} className="text-purple-500" />
            <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg">Routing & approval</h2>
            <FieldHelp
              title="Routing & approval"
              description="Bagian ini mengatur rule kapan kasus diarahkan ke orang tertentu atau butuh approval tambahan."
              howToUse="Aktifkan rule yang relevan dengan operasi tim. Gunakan untuk kasus refund, sentiment negatif, atau campaign yang butuh approval sebelum dijalankan."
            />
          </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Atur rule routing dan approval yang aktif di workspace.</p>
            </div>
          </div>
          <div className="space-y-3">
            {routingRules.map((rule) => {
              const active = settings.activeRoutingIds.includes(rule.id);
              return (
                <div key={rule.id} className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{rule.name}</p>
                      <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Trigger {rule.trigger}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Action {rule.action}</p>
                    </div>
                    <ToggleButton
                      active={active}
                      label={active ? 'Aktif' : 'Off'}
                      onClick={() =>
                        updateSettings((current) => ({
                          ...current,
                          activeRoutingIds: toggleSelection(current.activeRoutingIds, rule.id),
                        }))
                      }
                    />
                  </div>
                </div>
              );
            })}

            {approvalFlows.map((flow) => {
              const active = settings.activeApprovalIds.includes(flow.id);
              return (
                <div key={flow.id} className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{flow.name}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{flow.scope}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{flow.steps.join(' → ')}</p>
                    </div>
                    <ToggleButton
                      active={active}
                      label={active ? 'Aktif' : 'Off'}
                      onClick={() =>
                        updateSettings((current) => ({
                          ...current,
                          activeApprovalIds: toggleSelection(current.activeApprovalIds, flow.id),
                        }))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center gap-2 mb-5">
          <Bot size={18} className="text-blue-500" />
          <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg">Content analysis</h2>
            <FieldHelp
              title="Content analysis"
              description="Panel ini dipakai untuk mengatur API key, model, temperature, dan instruksi AI yang dipakai saat menganalisis konten."
              howToUse="Isi API key dulu, pilih mode model yang cocok, atur temperature seperlunya, lalu simpan. Setelah itu fitur analysis di halaman analytics akan memakai konfigurasi ini."
            />
          </div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Simpan akses analysis agar halaman Analytics bisa menghasilkan insight per konten saat tombol generate ditekan.
            </p>
          </div>
        </div>

        <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                API key analysis
                <FieldHelp title="API key analysis" description="Kunci ini dipakai untuk menjalankan generate analysis di halaman Analytics. Jika sudah tersimpan, Anda hanya perlu mengisi lagi saat ingin mengganti key." howToUse="Tempel API key provider yang valid, lalu simpan perubahan. Kalau key lama masih aktif dan tidak ingin diganti, field ini boleh dibiarkan seperti status tersimpan." />
              </span>
              <input
                value={analysisApiKeyInput}
                onChange={(event) => {
                  setAnalysisApiKeyInput(event.target.value);
                  setDirty(true);
                }}
                placeholder={settings.aiAnalysis.hasApiKey ? 'API key sudah tersimpan — isi lagi untuk mengganti' : 'Masukkan API key analysis'}
                className={fieldClass}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {settings.aiAnalysis.hasApiKey ? (
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
                    API key tersimpan {settings.aiAnalysis.apiKeyMasked ? `(${settings.aiAnalysis.apiKeyMasked})` : ''}
                  </span>
                ) : (
                  <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Belum ada API key yang tersimpan.</span>
                )}
              </div>
            </label>

            <div className="space-y-3 md:col-span-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Mode model
                <FieldHelp title="Mode model" description="Pilih mode model untuk analysis konten. Auto paling aman untuk mulai, sedangkan custom dipakai bila ingin mengisi slug model OpenRouter sendiri." howToUse="Mulai dari Auto kalau belum yakin. Pindah ke Fast, Balanced, Deep, atau Custom bila Anda sudah tahu trade-off kualitas, kecepatan, dan biaya model." />
              </span>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {MODEL_PRESET_OPTIONS.map((option) => {
                  const active = settings.aiAnalysis.modelPreset === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        updateSettings((current) => ({
                          ...current,
                          aiAnalysis: {
                            ...current.aiAnalysis,
                            modelPreset: option.id,
                          },
                        }))
                      }
                      className={`rounded-2xl p-4 text-left transition-all ${
                        active
                          ? isDark
                            ? 'bg-blue-500/15 ring-2 ring-blue-400/70 text-white'
                            : 'bg-blue-50 ring-2 ring-blue-500/70 text-gray-900'
                          : isDark
                            ? 'bg-slate-900 ring-1 ring-white/10 text-gray-300 hover:ring-white/20'
                            : 'bg-white ring-1 ring-slate-200 text-gray-700 hover:ring-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold">{option.label}</span>
                        {active ? <CheckCircle2 size={16} className="text-blue-500" /> : null}
                      </div>
                      <p className={`mt-2 text-xs font-semibold ${active ? (isDark ? 'text-blue-200' : 'text-blue-600') : 'text-gray-400'}`}>
                        {option.helper}
                      </p>
                      <p className="mt-2 text-xs leading-5 opacity-90">
                        {option.detail}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className={`rounded-2xl p-4 text-xs leading-5 ${isDark ? 'bg-slate-900 text-gray-300 ring-1 ring-white/10' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                <strong>Catatan:</strong> preset Auto memakai <code className="font-mono">openrouter/auto</code>, jadi model aktual dipilih otomatis oleh OpenRouter dan nama model final akan tampil di hasil analisis.
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Temperature
                <FieldHelp title="Temperature" description="Nilai rendah membuat analisis lebih stabil. Nilai lebih tinggi membuat gaya jawaban lebih variatif." howToUse="Untuk analisis bisnis biasanya cukup rendah seperti 0.2–0.4. Naikkan hanya kalau memang ingin gaya jawaban lebih kreatif atau eksploratif." />
              </span>
              <input
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={settings.aiAnalysis.temperature}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    aiAnalysis: {
                      ...current.aiAnalysis,
                      temperature: Number(event.target.value || 0),
                    },
                  }))
                }
                className={fieldClass}
              />
            </label>

            {settings.aiAnalysis.modelPreset === 'custom' ? (
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold inline-flex items-center gap-2">
                  Custom model ID
                  <FieldHelp title="Custom model ID" description="Isi model ID khusus jika ingin memakai model analysis tertentu di luar preset yang tersedia." howToUse="Gunakan hanya saat mode Custom dipilih. Tempel slug model persis seperti yang disyaratkan provider atau OpenRouter." />
                </span>
                <input
                  value={settings.aiAnalysis.customModel}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      aiAnalysis: {
                        ...current.aiAnalysis,
                        customModel: event.target.value,
                      },
                    }))
                  }
                  placeholder="Masukkan model ID custom"
                  className={fieldClass}
                />
              </label>
            ) : null}

            <div className="md:col-span-2 pt-4 border-t dark:border-slate-700">
              <h3 className="text-sm font-bold mb-4 uppercase tracking-widest text-gray-400">AI System Instructions</h3>
              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold inline-flex items-center gap-2">
                    Post Analysis Instruction
                  <FieldHelp title="Post Analysis" description="Instruksi sistem untuk AI saat menganalisis performa postingan di halaman Analytics." howToUse="Tuliskan gaya output yang diinginkan, misalnya ringkas, aksi nyata, dan fokus pada insight yang relevan untuk tim marketing." />
                  </span>
                  <textarea
                    value={settings.systemMessages.postAnalysis}
                    onChange={(e) => updateSettings(curr => ({ ...curr, systemMessages: { ...curr.systemMessages, postAnalysis: e.target.value } }))}
                    rows={4}
                    className={textareaFieldClass}
                    placeholder="Contoh: Jadilah analis yang kritis..."
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold inline-flex items-center gap-2">
                    Content Generation Instruction
                  <FieldHelp title="Content Generation" description="Instruksi sistem untuk AI saat membantu membuat caption di halaman Composer." howToUse="Masukkan aturan tone, gaya brand, CTA, atau batasan copywriting agar caption yang dihasilkan sesuai karakter bisnis Anda." />
                  </span>
                  <textarea
                    value={settings.systemMessages.contentGeneration}
                    onChange={(e) => updateSettings(curr => ({ ...curr, systemMessages: { ...curr.systemMessages, contentGeneration: e.target.value } }))}
                    rows={4}
                    className={textareaFieldClass}
                    placeholder="Contoh: Gunakan gaya bahasa anak muda..."
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold inline-flex items-center gap-2">
                    Inbox Reply Instruction
                  <FieldHelp title="Inbox Reply" description="Instruksi sistem untuk AI saat menyarankan balasan pesan pelanggan di halaman Inbox." howToUse="Isi panduan bahasa balasan, level sopan santun, batas janji ke customer, atau rule eskalasi supaya saran reply AI tetap aman." />
                  </span>
                  <textarea
                    value={settings.systemMessages.inboxReply}
                    onChange={(e) => updateSettings(curr => ({ ...curr, systemMessages: { ...curr.systemMessages, inboxReply: e.target.value } }))}
                    rows={4}
                    className={textareaFieldClass}
                    placeholder="Contoh: Balas dengan sangat sabar..."
                  />
                </label>
              </div>
            </div>

            <div className="md:col-span-2 pt-4 border-t dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Workflow size={16} className="text-emerald-500" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Custom AI Webhook</h3>
            <FieldHelp title="Custom AI Webhook" description="Gunakan fitur ini jika Anda memiliki sistem AI atau bot eksternal (seperti n8n atau custom server). Jika diaktifkan, semua pesan masuk akan diteruskan ke URL Webhook ini." howToUse="Aktifkan hanya kalau Anda memang punya endpoint AI eksternal yang siap menerima payload. Isi URL webhook, simpan, lalu uji dengan pesan masuk dari channel yang aktif." />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ToggleButton
                    active={settings.externalWebhook.active}
                    label={settings.externalWebhook.active ? 'Webhook Aktif' : 'Webhook Off'}
                    onClick={() => updateSettings(curr => ({ ...curr, externalWebhook: { ...curr.externalWebhook, active: !curr.externalWebhook.active } }))}
                  />
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Kirim pesan masuk ke server eksternal</span>
                </div>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold inline-flex items-center gap-2">
                    Endpoint URL
                  </span>
                  <input
                    type="url"
                    value={settings.externalWebhook.url}
                    onChange={(e) => updateSettings(curr => ({ ...curr, externalWebhook: { ...curr.externalWebhook, url: e.target.value } }))}
                    placeholder="https://api.domain-anda.com/webhook/receive"
                    disabled={!settings.externalWebhook.active}
                    className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-55`}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className={`rounded-[24px] p-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={18} className="text-blue-500" />
              <h3 className="font-bold">Ringkasan analysis</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-950 text-gray-300' : 'bg-white text-gray-700 border border-gray-100'}`}>
                Mode model aktif: <strong>{getModelPresetSummary(settings.aiAnalysis.modelPreset).label}</strong>
              </div>
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-950 text-gray-300' : 'bg-white text-gray-700 border border-gray-100'}`}>
                Temperature: <strong>{settings.aiAnalysis.temperature}</strong>
              </div>
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-950 text-gray-300' : 'bg-white text-gray-700 border border-gray-100'}`}>
                Model target: <strong>{settings.aiAnalysis.modelPreset === 'custom' ? (settings.aiAnalysis.customModel || 'Belum diisi') : MODEL_PRESET_MAP[settings.aiAnalysis.modelPreset as Exclude<AnalysisModelPreset, 'custom'>]}</strong>
              </div>
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-950 text-gray-300' : 'bg-white text-gray-700 border border-gray-100'}`}>
                Generate analysis hanya berjalan saat tombol di halaman Analytics ditekan.
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <UsersRound size={18} className="text-orange-500" />
            <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg">Team seats</h2>
            <FieldHelp
              title="Team seats"
              description="Bagian ini dipakai untuk mendaftarkan kursi kerja atau anggota tim yang akan memakai workspace ini."
              howToUse="Tambahkan satu seat per peran penting, isi nama, role, dan channel yang ditangani, lalu simpan agar pembagian kerja tim lebih rapi."
            />
          </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tambahkan seat tim yang akan memakai workspace ini.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Nama seat
                <FieldHelp title="Nama seat" description="Nama singkat untuk anggota atau kursi kerja. Contoh: Admin CS 1 atau Content Reviewer." />
              </span>
              <input
                value={seatDraft.name}
                onChange={(event) => setSeatDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Contoh: Admin CS 1"
                className={fieldClass}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Role
                <FieldHelp title="Role" description="Peran utama seat ini di operasional. Contoh: Customer Service, Reviewer, atau Ads Operator." />
              </span>
              <input
                value={seatDraft.role}
                onChange={(event) => setSeatDraft((current) => ({ ...current, role: event.target.value }))}
                placeholder="Contoh: Customer Service"
                className={fieldClass}
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Channel
                <FieldHelp title="Channel" description="Daftar channel yang akan ditangani seat ini. Contoh: WhatsApp, Instagram, Facebook Ads." />
              </span>
              <input
                value={seatDraft.channels}
                onChange={(event) => setSeatDraft((current) => ({ ...current, channels: event.target.value }))}
                placeholder="Contoh: WhatsApp, Instagram"
                className={fieldClass}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={addSeat}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Plus size={16} />
            Tambah team seat
          </button>

          {settings.seats.length === 0 ? (
            <div className={`rounded-[24px] p-5 mt-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10 text-gray-300' : 'border-gray-100 bg-gray-50 text-gray-600'}`}>
              Belum ada team seat. Tambahkan seat sesuai tim yang akan memakai workspace ini.
            </div>
          ) : (
            <div className="space-y-3 mt-5">
              {settings.seats.map((seat) => (
                <div key={seat.id} className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{seat.name}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{seat.role}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{seat.channels || 'Belum ada channel'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings((current) => ({
                          ...current,
                          seats: current.seats.filter((item) => item.id !== seat.id),
                        }))
                      }
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isDark ? 'bg-slate-950 text-rose-300 hover:bg-rose-950/40' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
                    >
                      <Trash2 size={14} />
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`rounded-[24px] p-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-3">
                <BellRing size={18} className="text-blue-500" />
          <div className="flex items-center gap-2">
            <h2 className="font-bold">Reply templates</h2>
            <FieldHelp
              title="Reply templates"
              description="Template balasan cepat untuk skenario yang sering berulang agar operator tidak menulis dari nol setiap saat."
              howToUse="Aktifkan template yang relevan dengan bisnis Anda, lalu gunakan sebagai dasar respons operator atau draft dari AI di halaman inbox."
            />
          </div>
              </div>
              <div className="space-y-3">
                {replyTemplates.map((template) => {
                  const active = settings.activeTemplateIds.includes(template.id);
                  return (
                    <div key={template.id} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{template.title}</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{template.channel}</p>
                      </div>
                      <ToggleButton
                        active={active}
                        label={active ? 'Aktif' : 'Off'}
                        onClick={() =>
                          updateSettings((current) => ({
                            ...current,
                            activeTemplateIds: toggleSelection(current.activeTemplateIds, template.id),
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`rounded-[24px] p-5 ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Workflow size={18} className="text-emerald-500" />
          <div className="flex items-center gap-2">
            <h2 className="font-bold">Notification targets</h2>
            <FieldHelp
              title="Notification targets"
              description="Bagian ini menentukan ke mana alert penting dikirim, seperti email, Slack, atau supervisor WhatsApp."
              howToUse="Aktifkan hanya kanal notifikasi yang benar-benar dipakai operasional. Pastikan targetnya aktif agar alert SLA, refund, atau approval tidak terlambat dibaca."
            />
          </div>
              </div>
              <div className="space-y-3">
                {notificationDestinations.map((destination) => {
                  const active = settings.activeNotificationIds.includes(destination.id);
                  return (
                    <div key={destination.id} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{destination.name}</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{destination.event}</p>
                      </div>
                      <ToggleButton
                        active={active}
                        label={active ? 'Aktif' : 'Off'}
                        onClick={() =>
                          updateSettings((current) => ({
                            ...current,
                            activeNotificationIds: toggleSelection(current.activeNotificationIds, destination.id),
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={`rounded-[24px] p-5 mt-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-blue-100 bg-blue-50'}`}>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-blue-500 mt-0.5" />
              <div>
                <p className="font-semibold">Ringkasan konfigurasi</p>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-blue-900'}`}>
                  {activeSummary.sla} SLA aktif, {activeSummary.routing} routing rule aktif, {activeSummary.approvals} approval flow aktif, {activeSummary.templates} template aktif, dan {activeSummary.seats} team seat tersimpan di workspace ini.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
