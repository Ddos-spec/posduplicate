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
  BellRing,
  Bot,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  PlugZap,
  Plus,
  Save,
  Shield,
  Store,
  Trash2,
  UsersRound,
  Workflow,
} from 'lucide-react';
import { settingsService } from '../../services/settingsService';

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
  aiAnalysis: {
    hasApiKey: false,
    apiKeyMasked: null,
    modelPreset: 'auto',
    model: 'openrouter/auto',
    customModel: '',
    temperature: 0.3,
    maxTokens: 900,
  },
  systemMessages: {
    postAnalysis: 'Anda adalah analis performa konten untuk dashboard bisnis. Tulis jawaban dalam Bahasa Indonesia yang ringkas, langsung, dan fokus tindakan.',
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (!isDemo) {
          const backendResponse = await settingsService.getSettings();
          const backendSettings = (backendResponse.data as { myCommerSocialSettings?: Partial<SettingsState>; myCommerSocialSettingsSavedAt?: string }) || {};
          const workspaceSettings = backendSettings.myCommerSocialSettings;

          if (workspaceSettings) {
            setSettings({
              ...defaultSettings,
              ...workspaceSettings,
              channelAccess: {
                ...defaultSettings.channelAccess,
                ...(workspaceSettings.channelAccess ?? {}),
              },
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

        const returnedSettings = (response.data as { myCommerSocialSettings?: Partial<SettingsState> }).myCommerSocialSettings;
        nextSettings = returnedSettings
          ? {
              ...defaultSettings,
              ...returnedSettings,
              channelAccess: {
                ...defaultSettings.channelAccess,
                ...(returnedSettings.channelAccess ?? {}),
              },
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
      icon: MessageSquareText,
    },
    {
      key: 'socialAds' as const,
      title: 'Social + Ads',
      description: 'Aktifkan koneksi social media dan ads melalui workspace sosial.',
      icon: PlugZap,
    },
    {
      key: 'marketplace' as const,
      title: 'Marketplace',
      description: 'Simpan status modul marketplace agar tim tahu kapan fitur ini dibuka.',
      icon: Store,
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
    <div className="space-y-6">
      <div className={`rounded-[32px] p-6 md:p-8 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
            <p className={`text-sm mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Atur channel aktif, rule operasional, notifikasi, dan team seat untuk workspace MyCommerSocial.
            </p>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-3">
            <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
              <p className="text-xs uppercase tracking-[0.18em]">Last saved</p>
              <p className="text-sm font-semibold mt-1">{formatSavedAt(lastSavedAt)}</p>
            </div>
            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Menyimpan...' : 'Simpan perubahan'}
            </button>
            {dirty ? (
              <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Ada perubahan yang belum disimpan.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {channelCards.map((card) => (
          <div key={card.key} className={`rounded-[24px] p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
            <div className={`inline-flex rounded-2xl p-3 ${isDark ? 'bg-slate-900 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              <card.icon size={18} />
            </div>
            <div className="flex items-start justify-between gap-3 mt-4">
              <div>
                <h2 className="font-bold text-lg">{card.title}</h2>
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

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <section className={`rounded-[32px] p-6 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Shield size={18} className="text-emerald-500" />
            <div>
              <h2 className="font-bold text-lg">SLA policies</h2>
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
              <h2 className="font-bold text-lg">Routing & approval</h2>
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
            <h2 className="font-bold text-lg">Content analysis</h2>
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
                <FieldHelp title="API key analysis" description="Kunci ini dipakai untuk menjalankan generate analysis di halaman Analytics. Jika sudah tersimpan, Anda hanya perlu mengisi lagi saat ingin mengganti key." />
              </span>
              <input
                value={analysisApiKeyInput}
                onChange={(event) => {
                  setAnalysisApiKeyInput(event.target.value);
                  setDirty(true);
                }}
                placeholder={settings.aiAnalysis.hasApiKey ? 'API key sudah tersimpan — isi lagi untuk mengganti' : 'Masukkan API key analysis'}
                className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'bg-white ring-1 ring-slate-900/5 text-gray-900 placeholder:text-gray-400'}`}
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

            <label className="space-y-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Mode model
                <FieldHelp title="Mode model" description="Pilih mode model untuk analysis konten. Auto cocok untuk mulai cepat, sedangkan custom dipakai bila ingin mengisi model sendiri." />
              </span>
              <select
                value={settings.aiAnalysis.modelPreset}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    aiAnalysis: {
                      ...current.aiAnalysis,
                      modelPreset: event.target.value as AnalysisModelPreset,
                    },
                  }))
                }
                className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-900/5 text-gray-900'}`}
              >
                <option value="auto">Auto</option>
                <option value="fast">Fast</option>
                <option value="balanced">Balanced</option>
                <option value="deep">Deep</option>
                <option value="custom">Custom</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Temperature
                <FieldHelp title="Temperature" description="Nilai rendah membuat analisis lebih stabil. Nilai lebih tinggi membuat gaya jawaban lebih variatif." />
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
                className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-900/5 text-gray-900'}`}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold inline-flex items-center gap-2">
                Max tokens
                <FieldHelp title="Max tokens" description="Batasi panjang hasil analysis supaya lebih ringkas dan hemat." />
              </span>
              <input
                type="number"
                min={200}
                max={4000}
                step={50}
                value={settings.aiAnalysis.maxTokens}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    aiAnalysis: {
                      ...current.aiAnalysis,
                      maxTokens: Number(event.target.value || 0),
                    },
                  }))
                }
                className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-900/5 text-gray-900'}`}
              />
            </label>

            {settings.aiAnalysis.modelPreset === 'custom' ? (
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold inline-flex items-center gap-2">
                  Custom model ID
                  <FieldHelp title="Custom model ID" description="Isi model ID khusus jika ingin memakai model analysis tertentu di luar preset yang tersedia." />
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
                  className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'bg-white ring-1 ring-slate-900/5 text-gray-900 placeholder:text-gray-400'}`}
                />
              </label>
            ) : null}

            <div className="md:col-span-2 pt-4 border-t dark:border-slate-700">
              <h3 className="text-sm font-bold mb-4 uppercase tracking-widest text-gray-400">AI System Instructions</h3>
              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold inline-flex items-center gap-2">
                    Post Analysis Instruction
                    <FieldHelp title="Post Analysis" description="Instruksi sistem untuk AI saat menganalisis performa postingan di halaman Analytics." />
                  </span>
                  <textarea
                    value={settings.systemMessages.postAnalysis}
                    onChange={(e) => updateSettings(curr => ({ ...curr, systemMessages: { ...curr.systemMessages, postAnalysis: e.target.value } }))}
                    rows={2}
                    className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-900/5 text-gray-900'}`}
                    placeholder="Contoh: Jadilah analis yang kritis..."
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold inline-flex items-center gap-2">
                    Content Generation Instruction
                    <FieldHelp title="Content Generation" description="Instruksi sistem untuk AI saat membantu membuat caption di halaman Composer." />
                  </span>
                  <textarea
                    value={settings.systemMessages.contentGeneration}
                    onChange={(e) => updateSettings(curr => ({ ...curr, systemMessages: { ...curr.systemMessages, contentGeneration: e.target.value } }))}
                    rows={2}
                    className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-900/5 text-gray-900'}`}
                    placeholder="Contoh: Gunakan gaya bahasa anak muda..."
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold inline-flex items-center gap-2">
                    Inbox Reply Instruction
                    <FieldHelp title="Inbox Reply" description="Instruksi sistem untuk AI saat menyarankan balasan pesan pelanggan di halaman Inbox." />
                  </span>
                  <textarea
                    value={settings.systemMessages.inboxReply}
                    onChange={(e) => updateSettings(curr => ({ ...curr, systemMessages: { ...curr.systemMessages, inboxReply: e.target.value } }))}
                    rows={2}
                    className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-900/5 text-gray-900'}`}
                    placeholder="Contoh: Balas dengan sangat sabar..."
                  />
                </label>
              </div>
            </div>

            <div className="md:col-span-2 pt-4 border-t dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Workflow size={16} className="text-emerald-500" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Custom AI Webhook</h3>
                <FieldHelp title="Custom AI Webhook" description="Gunakan fitur ini jika Anda memiliki sistem AI atau bot eksternal (seperti n8n atau custom server). Jika diaktifkan, semua pesan masuk akan diteruskan ke URL Webhook ini." />
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
                    className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white disabled:opacity-50' : 'bg-white ring-1 ring-slate-900/5 text-gray-900 disabled:opacity-50'}`}
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
                Mode model aktif: <strong>{settings.aiAnalysis.modelPreset}</strong>
              </div>
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-950 text-gray-300' : 'bg-white text-gray-700 border border-gray-100'}`}>
                Temperature: <strong>{settings.aiAnalysis.temperature}</strong>
              </div>
              <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-950 text-gray-300' : 'bg-white text-gray-700 border border-gray-100'}`}>
                Max tokens: <strong>{settings.aiAnalysis.maxTokens}</strong>
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
              <h2 className="font-bold text-lg">Team seats</h2>
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
                className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'bg-white ring-1 ring-slate-900/5 text-gray-900 placeholder:text-gray-400'}`}
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
                className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'bg-white ring-1 ring-slate-900/5 text-gray-900 placeholder:text-gray-400'}`}
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
                className={`w-full rounded-2xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-900 text-white placeholder:text-gray-500' : 'bg-white ring-1 ring-slate-900/5 text-gray-900 placeholder:text-gray-400'}`}
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
                <h2 className="font-bold">Reply templates</h2>
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
                <h2 className="font-bold">Notification targets</h2>
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
