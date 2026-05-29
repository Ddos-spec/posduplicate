import { type ComponentType, useEffect, useMemo, useState } from 'react';
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
  McsAdsIcon,
  McsAnalyticsIcon,
  McsConnectionsIcon,
  McsCrmIcon,
  McsIconBadge,
  McsInboxIcon,
  McsMarketplaceIcon,
  McsOverviewIcon,
  McsSettingsIcon,
  McsSocialIcon,
  McsTeamIcon,
  type McsIconBadgeTone,
  type McsIconProps,
} from './MyCommerSocialIcons';
import {
  ArrowLeft,
  BellRing,
  ChevronDown,
  Menu,
  Moon,
  PanelLeft,
  Plus,
  Sun,
  X,
} from 'lucide-react';
import { useZernioPushNotifications } from '../../hooks/useZernioPushNotifications';

type BaseMenu = {
  icon: ComponentType<McsIconProps>;
  label: string;
  roles: string[];
};

type LinkMenu = BaseMenu & {
  type: 'link';
  path: string;
};

type MenuChild = {
  key: string;
  label: string;
  helper: string;
  path?: string;
  children?: MenuChild[];
};

type GroupMenu = BaseMenu & {
  type: 'group';
  key: string;
  children: MenuChild[];
};

type MenuItem = LinkMenu | GroupMenu;

const isMobileViewport = () => typeof window !== 'undefined' && window.innerWidth < 768;

function getMenuTone(label: string): McsIconBadgeTone {
  if (label.includes('Inbox')) return 'emerald';
  if (label.includes('Ads')) return 'amber';
  if (label.includes('Marketplace')) return 'violet';
  if (label.includes('Analytics')) return 'cyan';
  if (label.includes('CRM')) return 'slate';
  if (label.includes('Planner')) return 'violet';
  if (label.includes('Connections')) return 'blue';
  if (label.includes('Settings')) return 'slate';
  if (label.includes('Tim')) return 'cyan';
  return 'blue';
}

function menuTreeHasPath(children: MenuChild[], pathname: string): boolean {
  return children.some((child) => {
    if (child.path && child.path === pathname) return true;
    if (child.children?.length) return menuTreeHasPath(child.children, pathname);
    return false;
  });
}

function collectExpandedKeys(children: MenuChild[], pathname: string, trail: string[] = []): string[] {
  for (const child of children) {
    const nextTrail = [...trail, child.key];
    if (child.path === pathname) {
      return nextTrail;
    }
    if (child.children?.length) {
      const nested = collectExpandedKeys(child.children, pathname, nextTrail);
      if (nested.length) return nested;
    }
  }
  return [];
}

export default function MedsosLayout() {
  useZernioPushNotifications();
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
  const [roomyView] = useState<boolean>(() => true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const expandedByDefault = !isMobileViewport();
    return {
      inbox: expandedByDefault,
      analytics: expandedByDefault,
      crm: expandedByDefault,
      'crm-content': expandedByDefault,
    };
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
    if (isMobileViewport()) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileViewport()) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [sidebarOpen]);

  const allMenus = useMemo<MenuItem[]>(
    () => [
      { type: 'link', icon: McsOverviewIcon, label: 'Overview', path: `${basePath}/dashboard`, roles: ['all'] },
      { type: 'link', icon: McsConnectionsIcon, label: 'Connections', path: `${basePath}/connections`, roles: ['medsos_manager', 'all'] },
      {
        type: 'group',
        key: 'inbox',
        icon: McsInboxIcon,
        label: 'Inbox',
        roles: ['medsos_manager', 'medsos_cs', 'all'],
        children: [
          { key: 'inbox-wa', label: 'WA', path: `${basePath}/inbox/wa`, helper: 'WhatsApp workspace' },
          { key: 'inbox-social', label: 'Medsos', path: `${basePath}/inbox/social`, helper: 'DM & komentar social' },
          { key: 'inbox-marketplace', label: 'Marketplace', path: `${basePath}/inbox/marketplace`, helper: 'Buyer chat marketplace' },
        ],
      },
      { type: 'link', icon: McsMarketplaceIcon, label: 'Marketplace', path: `${basePath}/marketplace`, roles: ['medsos_manager', 'medsos_cs', 'all'] },
      { type: 'link', icon: McsAdsIcon, label: 'Ads Workspace', path: `${basePath}/ads`, roles: ['medsos_manager', 'all'] },
      {
        type: 'group',
        key: 'crm',
        icon: McsCrmIcon,
        label: 'CRM & Automation',
        roles: ['medsos_manager', 'all'],
        children: [
          { key: 'crm-contacts', label: 'Contacts', path: `${basePath}/crm`, helper: 'Database kontak terpadu' },
          { key: 'crm-broadcasts', label: 'Broadcasts', path: `${basePath}/broadcasts`, helper: 'Kirim pesan massal' },
          { key: 'crm-automations', label: 'Automations', path: `${basePath}/automations`, helper: 'Bot Comment-to-DM' },
          { key: 'crm-planner', label: 'Planner', path: `${basePath}/crm/planner`, helper: 'Planner campaign, schedule, dan approval lane' },
          {
            key: 'crm-content',
            label: 'Create Content',
            helper: 'Cockpit foto & video seperti studio kerja tim',
            children: [
              { key: 'crm-content-photo', label: 'Photo Studio', path: `${basePath}/crm/content/photo`, helper: 'Visual brief, image direction, key visual' },
              { key: 'crm-content-video', label: 'Video Studio', path: `${basePath}/crm/content/video`, helper: 'Storyboard, motion board, dan CTA visual' },
            ],
          },
        ],
      },
      {
        type: 'group',
        key: 'analytics',
        icon: McsAnalyticsIcon,
        label: 'Analytics',
        roles: ['medsos_manager', 'all'],
        children: [
          { key: 'analytics-wa', label: 'WA', path: `${basePath}/analytics/wa`, helper: 'Kinerja inbox WA' },
          { key: 'analytics-social', label: 'Medsos', path: `${basePath}/analytics/social`, helper: 'Konten & engagement' },
          { key: 'analytics-marketplace', label: 'Marketplace', path: `${basePath}/analytics/marketplace`, helper: 'Kinerja buyer chat' },
        ],
      },
      { type: 'link', icon: McsTeamIcon, label: 'Tim MCS', path: `${basePath}/team`, roles: ['medsos_manager', 'all'] },
      { type: 'link', icon: McsSettingsIcon, label: 'Settings', path: `${basePath}/settings`, roles: ['medsos_manager', 'all'] },
    ],
    [basePath],
  );

  const menuItems = useMemo(
    () => {
      const canAccessPath = (path?: string) => {
        if (!path) return true;
        if (path.endsWith('/team')) return false;
        if (path.endsWith('/settings')) return Boolean(mcsPerms?.settings);
        if (path.endsWith('/ads')) return Boolean(mcsPerms?.ads);
        if (path.endsWith('/marketplace')) return Boolean(mcsPerms?.marketplace);
        if (
          path.endsWith('/calendar')
          || path.endsWith('/create')
          || path.endsWith('/crm/planner')
          || path.includes('/crm/content/')
        ) return Boolean(mcsPerms?.content);
        if (
          path.endsWith('/crm')
          || path.endsWith('/broadcasts')
          || path.endsWith('/automations')
        ) return Boolean(mcsPerms?.inbox);
        if (path.includes('/analytics/')) return Boolean(mcsPerms?.analytics);
        if (path.endsWith('/pricing') || path.endsWith('/connections')) return false;
        return true;
      };

      const filterChildren = (children: MenuChild[]): MenuChild[] =>
        children.flatMap((child) => {
          const nextChildren = child.children?.length ? filterChildren(child.children) : undefined;
          const allowedSelf = canAccessPath(child.path);
          if (!allowedSelf && !nextChildren?.length) return [];
          return [{
            ...child,
            children: nextChildren,
          }];
        });

      return allMenus.filter((item) => {
        if (currentRole === 'super_admin') return true;
        // Demo mode: use currentRole
        if (isDemo) {
          if (item.roles.includes('all')) return true;
          return item.roles.includes(currentRole);
        }
        // Real mode: owner/manager see all; mcs_member sees only permitted modules
        if (isOwnerOrManager) return true;
        if (isMcsMember && mcsPerms) {
          const isLink = item.type === 'link';
          if (isLink) return canAccessPath(item.path);
          const visibleChildren = filterChildren(item.children);
          if (!visibleChildren.length) return false;
          return item.roles.includes('all');
        }
        if (item.roles.includes('all')) return true;
        return item.roles.includes(currentRole);
      }).map((item) => item.type === 'group' && isMcsMember && mcsPerms
        ? { ...item, children: filterChildren(item.children) }
        : item);
    },
    [allMenus, currentRole, isDemo, isOwnerOrManager, isMcsMember, mcsPerms],
  );

  useEffect(() => {
    setExpandedGroups((current) => {
      let changed = false;
      const next = { ...current };
      for (const item of menuItems) {
        if (item.type === 'group') {
          const keysToExpand = collectExpandedKeys(item.children, location.pathname);
          if (keysToExpand.length) {
            const allKeys = [item.key, ...keysToExpand];
            for (const key of allKeys) {
              if (!current[key]) {
                next[key] = true;
                changed = true;
              }
            }
          }
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

  const navigateFromSidebar = (path: string) => {
    navigate(path);
    if (isMobileViewport()) {
      setSidebarOpen(false);
    }
  };

  const isActiveLink = (path: string) => location.pathname === path;

  const handleSidebarToggle = () => {
    if (!isMobileViewport()) {
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

  const renderMenuChildren = (children: MenuChild[], depth = 0) => (
    <div className={`${depth === 0 ? 'mt-2 ml-3' : 'mt-2 ml-4'} space-y-1 border-l border-blue-200/40 pl-3`}>
      {children.map((child) => {
        const active = child.path ? location.pathname === child.path : child.children?.length ? menuTreeHasPath(child.children, location.pathname) : false;
        const isExpanded = child.children?.length ? expandedGroups[child.key] ?? false : false;

        if (child.children?.length) {
          return (
            <div key={child.key}>
              <button
                type="button"
                onClick={() => toggleGroup(child.key)}
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
                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
                <p className={`mt-1 text-[11px] ${active ? (isDark ? 'text-gray-200' : 'text-blue-600') : (isDark ? 'text-gray-500' : 'text-gray-500')}`}>
                  {child.helper}
                </p>
              </button>
              {isExpanded ? renderMenuChildren(child.children, depth + 1) : null}
            </div>
          );
        }

        return (
          <button
            key={child.key}
            type="button"
            onClick={() => child.path && navigateFromSidebar(child.path)}
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
  );

  const asideWidthClass = sidebarCollapsed ? 'md:w-24' : 'md:w-64';
  const contentOffsetClass = sidebarCollapsed ? 'md:ml-24' : 'md:ml-64';

  return (
    <div className={`h-[100dvh] min-h-screen overflow-hidden transition-colors duration-200 ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] md:hidden"
        />
      ) : null}

      <aside className={`fixed inset-y-0 left-0 z-50 h-[100dvh] w-[84vw] max-w-[320px] ${asideWidthClass} transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} rounded-r-[28px] md:rounded-none md:max-w-none md:translate-x-0 border-r shadow-[0_28px_80px_rgba(2,8,23,0.35)] md:shadow-none ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-200'}`}>
        <div className="h-full overflow-y-auto px-3 py-4 pb-32 md:pb-40">
          <div className={`sticky top-0 z-10 -mx-3 mb-6 border-b px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top,1rem))] backdrop-blur-xl ${isDark ? 'border-white/5 bg-[#111318]/95' : 'border-gray-100 bg-white/95'} ${sidebarCollapsed ? 'flex justify-center mt-2' : ''}`}>
            {/* Sidebar toggle buttons (X for mobile, PanelLeft for PC) */}
            {!sidebarCollapsed && (
              <button 
                onClick={handleSidebarToggle}
                className={`absolute top-0 right-2 z-50 p-2.5 rounded-xl transition-colors shadow-sm border ${isDark ? 'hover:bg-slate-700 text-gray-400 hover:text-white border-slate-700 bg-slate-900/50' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900 border-gray-100 bg-gray-50'}`}
                title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                <X className="w-6 h-6 md:hidden" />
                <PanelLeft className="w-6 h-6 hidden md:block" />
              </button>
            )}

            <div className={`flex flex-col ${sidebarCollapsed ? 'items-center' : 'items-start gap-3 mt-2'}`}>
              <MyCommerSocialLogo size={sidebarCollapsed ? 40 : 48} className="shadow-lg shadow-blue-500/30" />
              {!sidebarCollapsed ? (
                <div className="pr-10">
                  <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>Command Center</p>
                  <h2 className="text-xl font-bold leading-tight">MyCommerSocial</h2>
                  <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {currentRole === 'medsos_manager'
                      ? 'Omnichannel Manager'
                      : currentRole === 'content_creator'
                        ? 'Content Creator'
                        : currentRole === 'medsos_cs'
                          ? 'Inbox Operator'
                          : 'WA + Social + Marketplace'}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {!sidebarCollapsed ? (
            <div className={`mb-6 rounded-[24px] p-4 ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-blue-100 bg-blue-50'}`}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className={`text-xs uppercase tracking-[0.2em] ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>War Room</p>
                  <h3 className="font-semibold">Omnichannel Control</h3>
                </div>
                <McsSocialIcon className={`${isDark ? 'text-blue-300' : 'text-blue-500'}`} size={18} />
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
              onClick={() => navigateFromSidebar(`${basePath}/crm/content/photo`)}
              title="Buka Create Content cockpit untuk racik foto, video, dan publish"
              className={`${sidebarCollapsed ? 'h-11 w-11 rounded-xl' : 'w-full rounded-xl py-3'} flex items-center justify-center gap-2 bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 active:scale-95 transition-all`}
            >
              <Plus size={20} />
              {!sidebarCollapsed ? 'Create Content' : null}
            </button>
          </div>

          {!sidebarCollapsed ? (
            <div className={`mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Navigation
            </div>
          ) : null}

          <ul className="space-y-2 font-medium">
            {menuItems.map((item, idx) => {
              if (item.type === 'link') {
                const isActive = isActiveLink(item.path);
                return (
                  <li key={`${item.label}-${idx}`}>
                    <button
                      onClick={() => navigateFromSidebar(item.path)}
                      title={`Buka halaman ${item.label}`}
                      className={`flex w-full items-center rounded-xl transition-all duration-200 ${sidebarCollapsed ? 'justify-center px-2 py-3' : 'p-3'} ${
                        isActive
                          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                          : isDark
                            ? 'text-gray-400 hover:bg-slate-700 hover:text-white'
                            : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <McsIconBadge
                        icon={item.icon}
                        size={sidebarCollapsed ? 34 : 38}
                        iconSize={18}
                        tone={getMenuTone(item.label)}
                        className={`shrink-0 transition-transform duration-200 ${isActive ? 'scale-105' : 'opacity-95'}`}
                      />
                      {!sidebarCollapsed ? <span className="ml-3">{item.label}</span> : null}
                    </button>
                  </li>
                );
              }

              const isGroupActive = menuTreeHasPath(item.children, location.pathname);
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
                    <McsIconBadge
                      icon={item.icon}
                      size={sidebarCollapsed ? 34 : 38}
                      iconSize={18}
                      tone={getMenuTone(item.label)}
                      className={`shrink-0 transition-transform duration-200 ${isGroupActive ? 'scale-105' : 'opacity-95'}`}
                    />
                    {!sidebarCollapsed ? (
                      <>
                        <span className="ml-3 flex-1 text-left">{item.label}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </>
                    ) : null}
                  </button>
                  {isExpanded && !sidebarCollapsed ? (
                    renderMenuChildren(item.children)
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        <div className={`absolute bottom-0 left-0 w-full border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0.5rem))] ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white ring-1 ring-slate-900/5'}`}>
          {!sidebarCollapsed ? (
            <div className={`mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-slate-900 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
              <BellRing size={14} />
              2 channel butuh follow up hari ini
            </div>
          ) : null}
          <button
            onClick={() => navigateFromSidebar(isDemo ? '/demo' : '/module-selector')}
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

      <div className={`mcs-scroll-root h-[100dvh] overflow-y-auto overflow-x-hidden overscroll-y-auto p-2 md:p-3 lg:p-3 transition-[margin] duration-300 ${contentOffsetClass}`}>
        <div className={`mcs-topbar mb-2 flex items-center justify-between gap-3`}>
          <button
            type="button"
            title={sidebarCollapsed || !sidebarOpen ? 'Buka navigasi MyCommerSocial' : 'Tutup navigasi MyCommerSocial'}
            onClick={handleSidebarToggle}
            className={`inline-flex items-center gap-2 rounded-xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-3 py-2 transition ${isDark ? 'bg-[#111318] ring-1 ring-white/10 hover:bg-slate-700' : 'bg-white ring-1 ring-slate-900/5 hover:bg-gray-100'}`}
          >
            {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="hidden md:inline text-sm font-semibold">{sidebarCollapsed ? 'Buka sidebar' : 'Ringkas sidebar'}</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className={`hidden items-center gap-3 rounded-2xl border px-3 py-1.5 2xl:flex ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white ring-1 ring-slate-900/5 shadow-sm'}`}>
              <div className="mr-1 flex -space-x-2">
                <BrandLogo brand="whatsapp" size={24} className="rounded-xl border-2 border-white" />
                <BrandLogo brand="instagram" size={24} className="rounded-xl border-2 border-white" />
                <BrandLogo brand="facebook" size={24} className="rounded-xl border-2 border-white" />
                <BrandLogo brand="metaads" size={24} className="rounded-xl border-2 border-white" withRing />
              </div>
              <div>
                <p className={`text-[11px] uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Mode</p>
                <p className="text-sm font-semibold">MyCommerSocial</p>
              </div>
              <div className={`h-7 w-px ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <div>
                <p className={`text-[11px] uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Focus</p>
                <p className="max-w-[220px] truncate text-sm font-semibold">Inbox, analytics, dan AI workspace</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              title={isDark ? 'Pakai mode terang' : 'Pakai mode gelap'}
              className={`rounded-xl p-2 transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'border bg-white ring-1 ring-slate-900/5 text-slate-600 shadow-sm hover:bg-gray-100'}`}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className={`mcs-page-shell ${roomyView ? 'mcs-roomy-view' : ''}`.trim()}>
          <Outlet />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav 
        className={`fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t pt-2 transition-all duration-200 md:hidden ${sidebarOpen ? 'pointer-events-none translate-y-full opacity-0' : 'opacity-100'} ${isDark ? 'border-slate-700 bg-slate-900/95 backdrop-blur-md' : 'bg-white ring-1 ring-slate-900/5/95 backdrop-blur-md'}`}
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 1rem))' }}
      >
        <button
          onClick={() => navigate(`${basePath}/dashboard`)}
          className={`flex flex-col items-center justify-center p-2.5 transition-colors ${location.pathname === `${basePath}/dashboard` ? 'text-blue-500' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
            <McsOverviewIcon size={20} />
          <span className="mt-1 text-[10px] font-semibold">Home</span>
        </button>
        <button
          onClick={() => navigate(`${basePath}/inbox/social`)}
          className={`flex flex-col items-center justify-center p-2.5 transition-colors ${location.pathname.includes('/inbox') ? 'text-blue-500' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <div className="relative">
            <McsSocialIcon size={20} />
            {inboxCount > 0 && <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">{inboxCount > 9 ? '9+' : inboxCount}</span>}
          </div>
          <span className="mt-1 text-[10px] font-semibold">Inbox</span>
        </button>
        <button
          onClick={() => navigate(`${basePath}/crm/content/photo`)}
          className="group relative -top-5 flex flex-col items-center justify-center p-2"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 transition-transform group-hover:scale-105">
            <Plus size={24} />
          </div>
          <span className={`mt-1 text-[10px] font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Create</span>
        </button>
        <button
          onClick={() => navigate(`${basePath}/analytics/social`)}
          className={`flex flex-col items-center justify-center p-2.5 transition-colors ${location.pathname.includes('/analytics') ? 'text-blue-500' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <McsAnalyticsIcon size={20} />
          <span className="mt-1 text-[10px] font-semibold">Analytics</span>
        </button>
        <button
          onClick={handleSidebarToggle}
          className={`flex flex-col items-center justify-center p-2.5 transition-colors ${sidebarOpen ? 'text-blue-500' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <Menu size={20} />
          <span className="mt-1 text-[10px] font-semibold">Menu</span>
        </button>
      </nav>
    </div>
  );
}
