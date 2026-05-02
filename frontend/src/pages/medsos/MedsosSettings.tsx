import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { BrandLogo } from '../../components/medsos/BrandLogo';
import toast from 'react-hot-toast';
import {
  approvalFlows,
  automationRules,
  channelSettings,
  marketplacePreferences,
  notificationDestinations,
  replyTemplates,
  routingRules,
  slaPolicies,
  teamSeats,
  workspaceHealth,
} from '../../data/omnichannelMock';
import {
  BellRing,
  Check,
  Shield,
  SplitSquareVertical,
  WandSparkles,
} from 'lucide-react';

export default function MedsosSettings() {
  const { isDark } = useThemeStore();
  const [channels, setChannels] = useState(channelSettings);
  const [routes, setRoutes] = useState(routingRules);
  const [destinations, setDestinations] = useState(notificationDestinations);

  const toggleChannel = (id: string, key: 'publishApproval' | 'useUnifiedInbox') => {
    setChannels((prev) => prev.map((channel) => {
      if (channel.id !== id) return channel;
      const nextValue = !channel[key];
      toast.success(`${channel.name} ${key === 'publishApproval' ? 'approval' : 'inbox'} ${nextValue ? 'enabled' : 'disabled'}`);
      return { ...channel, [key]: nextValue };
    }));
  };

  const toggleRoute = (id: number) => {
    setRoutes((prev) => prev.map((route) => {
      if (route.id !== id) return route;
      toast.success(`${route.name} ${route.active ? 'paused' : 'activated'}`);
      return { ...route, active: !route.active };
    }));
  };

  const toggleDestination = (id: number) => {
    setDestinations((prev) => prev.map((destination) => {
      if (destination.id !== id) return destination;
      toast.success(`${destination.name} ${destination.active ? 'muted' : 'enabled'}`);
      return { ...destination, active: !destination.active };
    }));
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Settings & Integrations</h1>
            <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Hamba jadikan settings ini lebih serius: ada channel matrix, SLA policy, routing rule, template reply, approval flow, dan alert destination.
            </p>
          </div>
          <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900/60 text-gray-200' : 'bg-blue-50 text-blue-700'}`}>
            <p className="text-xs uppercase tracking-[0.18em]">Current mode</p>
            <p className="font-semibold text-sm">Connector hub sudah mengunci stack Tapchat + Jubelio + Shown; toggle lain masih frontend-first.</p>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-4">
        {[
          {
            name: 'Tapchat',
            role: 'Social inbox + lead ads sync',
            helper: 'User bayar vendor langsung, kita hanya baca status dan workflow.',
          },
          {
            name: 'Jubelio',
            role: 'Marketplace ops backbone',
            helper: 'Order, stok, katalog, dan buyer chat akan lewat layer ini.',
          },
          {
            name: 'Shown',
            role: 'Meta Ads command source',
            helper: 'Ad account milik user tetap di vendor, dashboard kita hanya memantau dan mengarahkan.',
          },
        ].map((item) => (
          <div key={item.name} className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <p className="text-xs uppercase tracking-[0.18em] text-blue-500">{item.name}</p>
            <h3 className="mt-2 font-bold">{item.role}</h3>
            <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {workspaceHealth.map((item) => (
          <div key={item.label} className={`rounded-2xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.label}</p>
            <p className="mt-2 text-2xl font-bold">{item.value}</p>
            <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.helper}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Channel Operations Matrix</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Owner, sync mode, reply window, unified inbox, dan approval setting per channel.</p>
          </div>
          <SplitSquareVertical size={18} className="text-blue-500" />
        </div>
        <div className="grid xl:grid-cols-2 gap-4">
          {channels.map((channel) => (
            <div key={channel.id} className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <BrandLogo brand={channel.brand} size={46} className="rounded-2xl px-1" withRing />
                  <div>
                    <h4 className="font-semibold">{channel.name}</h4>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>owner {channel.owner}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full ${channel.status === 'active' ? 'bg-emerald-100 text-emerald-600' : channel.status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                  {channel.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sync mode</p>
                  <p className="font-semibold">{channel.syncMode}</p>
                </div>
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Reply window</p>
                  <p className="font-semibold">{channel.replyWindow}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mt-5">
                <button
                  onClick={() => toggleChannel(channel.id, 'useUnifiedInbox')}
                  className={`rounded-2xl border px-4 py-3 text-left ${isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
                >
                  <p className="text-sm font-semibold">Unified Inbox</p>
                  <p className={`text-xs mt-1 ${channel.useUnifiedInbox ? 'text-emerald-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {channel.useUnifiedInbox ? 'enabled' : 'disabled'}
                  </p>
                </button>
                <button
                  onClick={() => toggleChannel(channel.id, 'publishApproval')}
                  className={`rounded-2xl border px-4 py-3 text-left ${isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
                >
                  <p className="text-sm font-semibold">Publish Approval</p>
                  <p className={`text-xs mt-1 ${channel.publishApproval ? 'text-emerald-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {channel.publishApproval ? 'required' : 'not required'}
                  </p>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Shield size={18} className="text-emerald-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>SLA Policies</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>First response, resolution, dan escalation per jalur komunikasi.</p>
            </div>
          </div>
          <div className="space-y-3">
            {slaPolicies.map((policy) => (
              <div key={policy.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{policy.channel}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>owner {policy.owner}</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-600">{policy.firstResponse}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Resolution</p>
                    <p className="font-semibold">{policy.resolution}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Escalation</p>
                    <p className="font-semibold">{policy.escalation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <WandSparkles size={18} className="text-purple-500" />
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Routing Rules & Automation</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Atur trigger, route, dan auto handling yang membuat inbox terasa pintar.</p>
            </div>
          </div>
          <div className="space-y-3 mb-5">
            {routes.map((route) => (
              <button
                key={route.id}
                onClick={() => toggleRoute(route.id)}
                className={`w-full rounded-2xl border p-4 text-left ${isDark ? 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/70' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{route.name}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Trigger {route.trigger}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Action {route.action}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${route.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-700'}`}>
                    {route.active ? 'active' : 'paused'}
                  </span>
                </div>
                <p className={`text-[11px] mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Fallback {route.fallback}</p>
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {automationRules.map((rule) => (
              <div key={rule.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{rule.name}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{rule.description}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${rule.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-700'}`}>
                    {rule.enabled ? 'live' : 'draft'}
                  </span>
                </div>
                <p className={`text-[11px] mt-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Coverage {rule.coverage}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_1fr_0.9fr] gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <h3 className={`font-bold mb-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>Reply Templates</h3>
          <div className="space-y-3">
            {replyTemplates.map((template) => (
              <div key={template.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{template.title}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{template.category} • {template.channel}</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-600">macro</span>
                </div>
                <p className={`text-sm mt-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{template.preview}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <h3 className={`font-bold mb-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>Team Seats & Approval Flow</h3>
          <div className="space-y-3 mb-5">
            {teamSeats.map((seat) => (
              <div key={seat.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <p className="font-semibold text-sm">{seat.name}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{seat.role} • {seat.shift}</p>
                <p className={`text-xs mt-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Coverage {seat.channels.join(', ')}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Workload {seat.workload}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {approvalFlows.map((flow) => (
              <div key={flow.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-semibold text-sm">{flow.name}</p>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700">{flow.sla}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {flow.steps.map((step) => (
                    <span key={step} className={`rounded-full px-2 py-1 text-[10px] ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-4">
              <BellRing size={18} className="text-blue-500" />
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Alert Destinations</h3>
            </div>
            <div className="space-y-3">
              {destinations.map((destination) => (
                <button
                  key={destination.id}
                  onClick={() => toggleDestination(destination.id)}
                  className={`w-full rounded-2xl border p-4 text-left ${isDark ? 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/70' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{destination.name}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{destination.target}</p>
                      <p className={`text-xs mt-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{destination.event}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${destination.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-700'}`}>
                      {destination.active ? 'active' : 'muted'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Check size={18} className="text-emerald-500" />
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Marketplace Preferences</h3>
            </div>
            <div className="space-y-3">
              {marketplacePreferences.map((pref) => (
                <div key={pref.label} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <p className="font-semibold text-sm">{pref.label}</p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{pref.value}</p>
                  <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{pref.helper}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
