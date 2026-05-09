import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { useDemoUser } from '../../pages/demo/demoRoleStore';
import { channelConnections, priorityThreads } from '../../data/omnichannelMock';
import { getMyCommerSocialIntegrationHub } from '../../services/myCommerSocialIntegrations';
import { getZernioAccounts } from '../../services/medsosPostsService';
import { BrandLogo } from './BrandLogo';
import MyCommerSocialLogo from './MyCommerSocialLogo';
import {
  ArrowLeft,
  BellRing,
  Calendar,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LineChart,
  Megaphone,
  Menu,
  MessageSquareText,
  Moon,
  PlugZap,
  Plus,
  Settings,
  Share2,
  Store,
  Sun,
} from 'lucide-react';

type BaseMenu = {
  icon: typeof LayoutDashboard;
  label: string;
  roles: string[];
};

type LinkMenu = BaseMenu & {
  type: 'link';
  path: string;
};

type GroupMenu = BaseMenu & {
  type: 'group';
  key: string;
  children: Array<{
    label: string;
    path: string;
    helper: string;
  }>;
};

type MenuItem = LinkMenu | GroupMenu;

export default function MedsosLayout() {
  const { isDark, toggleTheme } = useThemeStore();
  const { currentRole } = useDemoUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    inbox: true,
    analytics: true,
  });

  const isDemo = location.pathname.startsWith('/demo');
  const basePath = isDemo ? '/demo/medsos' : '/medsos';

  const [liveActiveChannels, setLiveActiveChannels] = useState<number | null>(null);

  useEffect(() => {
    if (!isDemo) {
      Promise.all([getMyCommerSocialIntegrationHub(), getZernioAccounts()])
        .then(([hub, accounts]) => {
          const waConnector = hub.connectors.find((connector) => connector.slug === 'social-hub');
          const waCount = waConnector?.vendorWorkspaceUrl || waConnector?.connectionRefMasked || waConnector?.status === 'connected' ? 1 : 0;
          setLiveActiveChannels(accounts.length + waCount);
        })
        .catch(() => setLiveActiveChannels(0));
    }
  }, [isDemo]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const allMenus = useMemo<MenuItem[]>(
    () => [
      { type: 'link', icon: LayoutDashboard, label: 'Overview', path: `${basePath}/dashboard`, roles: ['all'] },
      { type: 'link', icon: PlugZap, label: 'Connections', path: `${basePath}/connections`, roles: ['medsos_manager', 'all'] },
      { type: 'link', icon: Calendar, label: 'Planner', path: `${basePath}/calendar`, roles: ['medsos_manager', 'content_creator', 'all'] },
      {
        type: 'group',
        key: 'inbox',
        icon: MessageSquareText,
        label: 'Inbox',
        roles: ['medsos_manager', 'medsos_cs', 'all'],
        children: [
          { label: 'WA', path: `${basePath}/inbox/wa`, helper: 'WhatsApp workspace' },
          { label: 'Medsos', path: `${basePath}/inbox/social`, helper: 'DM & komentar social' },
          { label: 'Marketplace', path: `${basePath}/inbox/marketplace`, helper: 'Buyer chat marketplace' },
        ],
      },
      { type: 'link', icon: Store, label: 'Marketplace', path: `${basePath}/marketplace`, roles: ['medsos_manager', 'medsos_cs', 'all'] },
      { type: 'link', icon: Megaphone, label: 'Ads Workspace', path: `${basePath}/ads`, roles: ['medsos_manager', 'all'] },
      {
        type: 'group',
        key: 'analytics',
        icon: LineChart,
        label: 'Analytics',
        roles: ['medsos_manager', 'all'],
        children: [
          { label: 'WA', path: `${basePath}/analytics/wa`, helper: 'Kinerja inbox WA' },
          { label: 'Medsos', path: `${basePath}/analytics/social`, helper: 'Konten & engagement' },
          { label: 'Marketplace', path: `${basePath}/analytics/marketplace`, helper: 'Kinerja buyer chat' },
        ],
      },
      { type: 'link', icon: CreditCard, label: 'Plans & Pricing', path: `${basePath}/pricing`, roles: ['medsos_manager', 'all'] },
      { type: 'link', icon: Settings, label: 'Settings', path: `${basePath}/settings`, roles: ['medsos_manager', 'all'] },
    ],
    [basePath],
  );

  const menuItems = useMemo(
    () =>
      allMenus.filter((item) => {
        if (currentRole === 'super_admin') return true;
        if (item.roles.includes('all')) return true;
        return item.roles.includes(currentRole);
      }),
    [allMenus, currentRole],
  );

  useEffect(() => {
    setExpandedGroups((current) => {
      let changed = false;
      const next = { ...current };
      for (const item of menuItems) {
        if (item.type === 'group' && item.children.some((child) => location.pathname.startsWith(child.path)) && !current[item.key]) {
          next[item.key] = true;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [location.pathname, menuItems]);

  const inboxCount = useMemo(
    () => (isDemo ? priorityThreads.reduce((total, item) => total + item.unread, 0) : 0),
    [isDemo],
  );

  const activeChannels = useMemo(
    () => (isDemo ? channelConnections.filter((item) => item.status !== 'offline').length : liveActiveChannels ?? '…'),
    [isDemo, liveActiveChannels],
  );

  const toggleGroup = (key: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const isActiveLink = (path: string) => location.pathname === path;

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[1px] md:hidden"
        />
      ) : null}

      <aside className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-64 border-r ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="h-full px-3 py-4 overflow-y-auto pb-40">
          <div className="flex items-center gap-3 mb-8 px-2">
            <MyCommerSocialLogo size={40} className="shadow-lg shadow-blue-500/30" />
            <div>
              <h2 className="font-bold text-lg leading-tight">MyCommerSocial</h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {currentRole === 'medsos_manager'
                  ? 'Omnichannel Manager'
                  : currentRole === 'content_creator'
                    ? 'Content Creator'
                    : currentRole === 'medsos_cs'
                      ? 'Inbox Operator'
                      : 'WA + Social + Marketplace'}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <BrandLogo brand="whatsapp" size={20} className="rounded-md" />
                <BrandLogo brand="instagram" size={20} className="rounded-md" />
                <BrandLogo brand="facebook" size={20} className="rounded-md" />
                <BrandLogo brand="metaads" size={20} className="rounded-md" withRing />
              </div>
            </div>
          </div>

          <div className={`mb-6 rounded-2xl p-4 border ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-blue-100 bg-blue-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={`text-xs uppercase tracking-[0.2em] ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>War Room</p>
                <h3 className="font-semibold">Omnichannel Control</h3>
              </div>
              <Share2 className={`${isDark ? 'text-blue-300' : 'text-blue-500'}`} size={18} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>Active Channels</p>
                <p className="text-lg font-bold">{activeChannels}</p>
              </div>
              <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>Unread</p>
                <p className="text-lg font-bold">{inboxCount}</p>
              </div>
            </div>
          </div>

          <div className="px-2 mb-4">
            <button
              onClick={() => navigate(`${basePath}/create`)}
              title="Buka composer untuk membuat campaign atau post baru"
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all"
            >
              <Plus size={20} /> Create Campaign
            </button>
          </div>

          <ul className="space-y-2 font-medium">
            {menuItems.map((item, idx) => {
              if (item.type === 'link') {
                const isActive = isActiveLink(item.path);
                return (
                  <li key={`${item.label}-${idx}`}>
                    <button
                      onClick={() => navigate(item.path)}
                      title={`Buka halaman ${item.label}`}
                      className={`flex items-center w-full p-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                          : isDark
                            ? 'text-gray-400 hover:bg-slate-700 hover:text-white'
                            : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                      <span className="ml-3">{item.label}</span>
                    </button>
                  </li>
                );
              }

              const isGroupActive = item.children.some((child) => location.pathname.startsWith(child.path));
              const isExpanded = expandedGroups[item.key] ?? false;

              return (
                <li key={`${item.label}-${idx}`}>
                  <button
                    onClick={() => toggleGroup(item.key)}
                    title={`Buka submenu ${item.label}`}
                    className={`flex items-center w-full p-3 rounded-xl transition-all duration-200 ${
                      isGroupActive
                        ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                        : isDark
                          ? 'text-gray-400 hover:bg-slate-700 hover:text-white'
                          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 transition-transform duration-200 ${isGroupActive ? 'scale-110' : ''}`} />
                    <span className="ml-3 flex-1 text-left">{item.label}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded ? (
                    <div className="mt-2 ml-3 space-y-1 border-l border-blue-200/40 pl-3">
                      {item.children.map((child) => {
                        const active = location.pathname === child.path;
                        return (
                          <button
                            key={child.path}
                            onClick={() => navigate(child.path)}
                            title={child.helper}
                            className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                              active
                                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-slate-700 dark:text-white dark:ring-slate-600'
                                : isDark
                                  ? 'text-gray-300 hover:bg-slate-700/60'
                                  : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-semibold">{child.label}</span>
                            </div>
                            <p className={`mt-1 text-[11px] ${active ? (isDark ? 'text-gray-200' : 'text-blue-600') : (isDark ? 'text-gray-500' : 'text-gray-500')}`}>
                              {child.helper}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        <div className={`absolute bottom-0 left-0 w-full p-4 border-t ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className={`mb-3 rounded-xl px-3 py-2 text-xs flex items-center gap-2 ${isDark ? 'bg-slate-900 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
            <BellRing size={14} />
            2 channel butuh follow up hari ini
          </div>
          <button
            onClick={() => navigate(isDemo ? '/demo' : '/module-selector')}
            title={isDemo ? 'Kembali ke pemilihan demo' : 'Kembali ke pemilihan modul'}
            className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
              isDark ? 'text-gray-400 hover:bg-slate-700 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {isDemo ? 'Kembali ke Demo' : 'Ganti Modul'}
          </button>
        </div>
      </aside>

      <div className="p-4 md:ml-64">
        <div className="flex justify-between items-center mb-6">
          <button
            type="button"
            title={sidebarOpen ? 'Tutup navigasi MyCommerSocial' : 'Buka navigasi MyCommerSocial'}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <div className={`hidden md:flex items-center gap-3 rounded-2xl px-4 py-2 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="flex -space-x-2 mr-1">
                <BrandLogo brand="whatsapp" size={28} className="rounded-xl border-2 border-white" />
                <BrandLogo brand="instagram" size={28} className="rounded-xl border-2 border-white" />
                <BrandLogo brand="facebook" size={28} className="rounded-xl border-2 border-white" />
                <BrandLogo brand="metaads" size={28} className="rounded-xl border-2 border-white" withRing />
              </div>
              <div>
                <p className={`text-[11px] uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Mode</p>
                <p className="text-sm font-semibold">MyCommerSocial</p>
              </div>
              <div className={`h-8 w-px ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <div>
                <p className={`text-[11px] uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Focus</p>
                <p className="text-sm font-semibold truncate max-w-[220px]">Inbox, analytics, dan AI workspace</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              title={isDark ? 'Pakai mode terang' : 'Pakai mode gelap'}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-gray-100 border border-gray-200 shadow-sm'}`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
