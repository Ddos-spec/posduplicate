import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { useDemoUser } from '../../pages/demo/demoRoleStore';
import { useAuthStore } from '../../store/authStore';
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
  PanelLeft,
  PlugZap,
  Plus,
  Settings,
  Share2,
  Store,
  Sun,
  Users,
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
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isOwnerOrManager = user?.roles?.name === 'owner' || user?.roles?.name === 'manager' || user?.role?.name === 'owner' || user?.role?.name === 'manager';
  const isMcsMember = user?.roles?.name === 'mcs_member' || user?.role?.name === 'mcs_member';
  const mcsPerms = user?.dashboard_preferences?.mcs;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
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
      { type: 'link', icon: Users, label: 'Tim MCS', path: `${basePath}/team`, roles: ['medsos_manager', 'all'] },
      { type: 'link', icon: Settings, label: 'Settings', path: `${basePath}/settings`, roles: ['medsos_manager', 'all'] },
    ],
    [basePath],
  );

  const menuItems = useMemo(
    () =>
      allMenus.filter((item) => {
        if (currentRole === 'super_admin') return true;
        // Demo mode: use currentRole
        if (isDemo) {
          if (item.roles.includes('all')) return true;
          return item.roles.includes(currentRole);
        }
        // Real mode: owner/manager see all; mcs_member sees only permitted modules
        if (isOwnerOrManager) return true;
        if (isMcsMember && mcsPerms) {
          if (item.path?.endsWith('/team')) return false;
          if (item.path?.endsWith('/settings')) return Boolean(mcsPerms.settings);
          if (item.path?.endsWith('/ads')) return Boolean(mcsPerms.ads);
          if (item.path?.endsWith('/marketplace')) return Boolean(mcsPerms.marketplace);
          if (item.path?.endsWith('/calendar') || item.path?.endsWith('/create')) return Boolean(mcsPerms.content);
          if (item.key === 'inbox') return Boolean(mcsPerms.inbox);
          if (item.key === 'analytics') return Boolean(mcsPerms.analytics);
          if (item.path?.endsWith('/pricing') || item.path?.endsWith('/connections')) return false;
          return item.roles.includes('all');
        }
        if (item.roles.includes('all')) return true;
        return item.roles.includes(currentRole);
      }),
    [allMenus, currentRole, isDemo, isOwnerOrManager, isMcsMember, mcsPerms],
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

  const handleSidebarToggle = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setSidebarCollapsed((current) => !current);
      return;
    }
    setSidebarOpen((current) => !current);
  };

  const handleGroupToggle = (key: string) => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
      return;
    }
    toggleGroup(key);
  };

  const asideWidthClass = sidebarCollapsed ? 'md:w-24' : 'md:w-64';
  const contentOffsetClass = sidebarCollapsed ? 'md:ml-24' : 'md:ml-64';

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

      <aside className={`fixed top-0 left-0 z-40 h-screen w-64 ${asideWidthClass} transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 border-r ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="h-full overflow-y-auto px-3 py-4 pb-40">
          <div className={`mb-8 px-2 ${sidebarCollapsed ? 'flex justify-center' : 'flex items-center gap-3'}`}>
            <MyCommerSocialLogo size={40} className="shadow-lg shadow-blue-500/30" />
            {!sidebarCollapsed ? (
              <div>
                <h2 className="text-lg font-bold leading-tight">MyCommerSocial</h2>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {currentRole === 'medsos_manager'
                    ? 'Omnichannel Manager'
                    : currentRole === 'content_creator'
                      ? 'Content Creator'
                      : currentRole === 'medsos_cs'
                        ? 'Inbox Operator'
                        : 'WA + Social + Marketplace'}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <BrandLogo brand="whatsapp" size={20} className="rounded-md" />
                  <BrandLogo brand="instagram" size={20} className="rounded-md" />
                  <BrandLogo brand="facebook" size={20} className="rounded-md" />
                  <BrandLogo brand="metaads" size={20} className="rounded-md" withRing />
                </div>
              </div>
            ) : null}
          </div>

          {!sidebarCollapsed ? (
            <div className={`mb-6 rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-blue-100 bg-blue-50'}`}>
              <div className="mb-3 flex items-center justify-between">
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
          ) : null}

          <div className={`mb-4 px-2 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
            <button
              onClick={() => navigate(`${basePath}/create`)}
              title="Buka composer untuk membuat campaign atau post baru"
              className={`${sidebarCollapsed ? 'h-11 w-11 rounded-xl' : 'w-full rounded-xl py-3'} flex items-center justify-center gap-2 bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700`}
            >
              <Plus size={20} />
              {!sidebarCollapsed ? 'Create Campaign' : null}
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
                      className={`flex w-full items-center rounded-xl transition-all duration-200 ${sidebarCollapsed ? 'justify-center px-2 py-3' : 'p-3'} ${
                        isActive
                          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                          : isDark
                            ? 'text-gray-400 hover:bg-slate-700 hover:text-white'
                            : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <item.icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                      {!sidebarCollapsed ? <span className="ml-3">{item.label}</span> : null}
                    </button>
                  </li>
                );
              }

              const isGroupActive = item.children.some((child) => location.pathname.startsWith(child.path));
              const isExpanded = expandedGroups[item.key] ?? false;

              return (
                <li key={`${item.label}-${idx}`}>
                  <button
                    onClick={() => handleGroupToggle(item.key)}
                    title={`Buka submenu ${item.label}`}
                    className={`flex w-full items-center rounded-xl transition-all duration-200 ${sidebarCollapsed ? 'justify-center px-2 py-3' : 'p-3'} ${
                      isGroupActive
                        ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                        : isDark
                          ? 'text-gray-400 hover:bg-slate-700 hover:text-white'
                          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 transition-transform duration-200 ${isGroupActive ? 'scale-110' : ''}`} />
                    {!sidebarCollapsed ? (
                      <>
                        <span className="ml-3 flex-1 text-left">{item.label}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </>
                    ) : null}
                  </button>
                  {isExpanded && !sidebarCollapsed ? (
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

        <div className={`absolute bottom-0 left-0 w-full border-t p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          {!sidebarCollapsed ? (
            <div className={`mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-slate-900 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
              <BellRing size={14} />
              2 channel butuh follow up hari ini
            </div>
          ) : null}
          <button
            onClick={() => navigate(isDemo ? '/demo' : '/module-selector')}
            title={isDemo ? 'Kembali ke pemilihan demo' : 'Kembali ke pemilihan modul'}
            className={`flex items-center rounded-xl py-3 text-sm font-medium transition-colors ${sidebarCollapsed ? 'justify-center px-2' : 'w-full px-4'} ${
              isDark ? 'text-white hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-2'}`} />
            {!sidebarCollapsed ? (isDemo ? 'Kembali ke Demo' : 'Ganti Modul') : null}
          </button>
        </div>
      </aside>

      <div className={`p-4 transition-[margin] duration-300 ${contentOffsetClass}`}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            title={sidebarCollapsed || !sidebarOpen ? 'Buka navigasi MyCommerSocial' : 'Tutup navigasi MyCommerSocial'}
            onClick={handleSidebarToggle}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 transition ${isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-gray-200 bg-white hover:bg-gray-100'}`}
          >
            {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="hidden md:inline text-sm font-semibold">{sidebarCollapsed ? 'Buka sidebar' : 'Ringkas sidebar'}</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className={`hidden items-center gap-3 rounded-2xl border px-4 py-2 md:flex ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
              <div className="mr-1 flex -space-x-2">
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
                <p className="max-w-[220px] truncate text-sm font-semibold">Inbox, analytics, dan AI workspace</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              title={isDark ? 'Pakai mode terang' : 'Pakai mode gelap'}
              className={`rounded-xl p-2 transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'border border-gray-200 bg-white text-slate-600 shadow-sm hover:bg-gray-100'}`}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
