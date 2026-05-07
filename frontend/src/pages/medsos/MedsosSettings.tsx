import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useThemeStore } from '../../store/themeStore';
import {
  approvalFlows,
  notificationDestinations,
  replyTemplates,
  routingRules,
  slaPolicies,
  teamSeats,
} from '../../data/omnichannelMock';
import {
  BellRing,
  CheckCircle2,
  MessageSquareText,
  PlugZap,
  Save,
  Shield,
  Store,
  UsersRound,
  Workflow,
} from 'lucide-react';

const STORAGE_KEY = 'mycommersocial_settings_v1';

type SettingsState = {
  channelAccess: {
    waInbox: boolean;
    socialAds: boolean;
    marketplace: boolean;
  };
  activeSlaIds: number[];
  activeRoutingIds: number[];
  activeApprovalIds: number[];
  activeTemplateIds: number[];
  activeNotificationIds: number[];
  activeSeatIds: number[];
};

const defaultSettings: SettingsState = {
  channelAccess: {
    waInbox: true,
    socialAds: true,
    marketplace: false,
  },
  activeSlaIds: slaPolicies.map((policy) => policy.id),
  activeRoutingIds: routingRules.filter((rule) => rule.active).map((rule) => rule.id),
  activeApprovalIds: approvalFlows.map((flow) => flow.id),
  activeTemplateIds: replyTemplates.slice(0, 3).map((template) => template.id),
  activeNotificationIds: notificationDestinations.filter((item) => item.active).map((item) => item.id),
  activeSeatIds: teamSeats.map((seat) => seat.id),
};

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
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { settings?: SettingsState; lastSavedAt?: string };
        if (parsed.settings) {
          setSettings({ ...defaultSettings, ...parsed.settings });
        }
        if (parsed.lastSavedAt) {
          setLastSavedAt(parsed.lastSavedAt);
        }
      }
    } catch (error) {
      console.error('Failed to load MyCommerSocial settings', error);
    }
  }, []);

  const activeSummary = useMemo(
    () => ({
      sla: settings.activeSlaIds.length,
      routing: settings.activeRoutingIds.length,
      approvals: settings.activeApprovalIds.length,
      templates: settings.activeTemplateIds.length,
    }),
    [settings]
  );

  const saveSettings = () => {
    const savedAt = new Date().toISOString();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        settings,
        lastSavedAt: savedAt,
      })
    );
    setLastSavedAt(savedAt);
    setDirty(false);
    toast.success('Settings berhasil disimpan.');
  };

  const updateSettings = (updater: (current: SettingsState) => SettingsState) => {
    setSettings((current) => updater(current));
    setDirty(true);
  };

  const channelCards = [
    {
      key: 'waInbox' as const,
      title: 'WA Inbox',
      description: 'Aktifkan akses WhatsApp melalui Customer Service CRM.',
      icon: MessageSquareText,
    },
    {
      key: 'socialAds' as const,
      title: 'Social + Ads',
      description: 'Aktifkan koneksi social media dan ads melalui Zernio.',
      icon: PlugZap,
    },
    {
      key: 'marketplace' as const,
      title: 'Marketplace',
      description: 'Simpan status modul marketplace agar tim tahu kapan fitur ini dibuka.',
      icon: Store,
    },
  ];

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
            <p className={`text-sm mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Atur channel aktif, rule operasional, approval, dan notifikasi untuk workspace MyCommerSocial.
            </p>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-3">
            <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-gray-50 text-gray-700'}`}>
              <p className="text-xs uppercase tracking-[0.18em]">Last saved</p>
              <p className="text-sm font-semibold mt-1">{formatSavedAt(lastSavedAt)}</p>
            </div>
            <button
              type="button"
              onClick={saveSettings}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Save size={16} />
              Simpan perubahan
            </button>
            {dirty ? (
              <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Ada perubahan yang belum disimpan.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {channelCards.map((card) => (
          <div key={card.key} className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
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
        <section className={`rounded-3xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
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
                <div key={policy.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
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

        <section className={`rounded-3xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
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
                <div key={rule.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
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
                <div key={flow.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
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

      <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <section className={`rounded-3xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <UsersRound size={18} className="text-orange-500" />
            <div>
              <h2 className="font-bold text-lg">Team seats</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tentukan seat yang aktif di workspace.</p>
            </div>
          </div>
          <div className="space-y-3">
            {teamSeats.map((member) => {
              const active = settings.activeSeatIds.includes(member.id);
              return (
                <div key={member.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{member.name}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{member.role}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{member.workload}</p>
                    </div>
                    <ToggleButton
                      active={active}
                      label={active ? 'Aktif' : 'Off'}
                      onClick={() =>
                        updateSettings((current) => ({
                          ...current,
                          activeSeatIds: toggleSelection(current.activeSeatIds, member.id),
                        }))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={`rounded-3xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
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

            <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
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

          <div className={`rounded-2xl border p-5 mt-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-blue-100 bg-blue-50'}`}>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-blue-500 mt-0.5" />
              <div>
                <p className="font-semibold">Ringkasan konfigurasi</p>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-blue-900'}`}>
                  {activeSummary.sla} SLA aktif, {activeSummary.routing} routing rule aktif, {activeSummary.approvals} approval flow aktif, dan {activeSummary.templates} template balasan dipakai di workspace ini.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
