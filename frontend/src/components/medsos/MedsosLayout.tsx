import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { useDemoUser } from '../../pages/demo/demoRoleStore';
import { channelConnections, priorityThreads } from '../../data/omnichannelMock';
import { BrandLogo } from './BrandLogo';
import MyCommerSocialLogo from './MyCommerSocialLogo';
import {
  LayoutDashboard, Calendar, MessageCircle, Share2, Settings,
  Menu, Sun, Moon, ArrowLeft, Plus, Store, LineChart, BellRing, Megaphone, PlugZap
} from 'lucide-react';

export default function MedsosLayout() {
  const { isDark, toggleTheme } = useThemeStore();
  const { currentRole } = useDemoUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isDemo = location.pathname.startsWith('/demo');
  const basePath = isDemo ? '/demo/medsos' : '/medsos';

  const allMenus = [
    { icon: LayoutDashboard, label: 'Overview', path: `${basePath}/dashboard`, roles: ['all'] },
    { icon: PlugZap, label: 'Connections', path: `${basePath}/connections`, roles: ['medsos_manager', 'all'] },
    { icon: Calendar, label: 'Planner', path: `${basePath}/calendar`, roles: ['medsos_manager', 'content_creator', 'all'] },
    { icon: MessageCircle, label: 'Unified Inbox', path: `${basePath}/inbox`, roles: ['medsos_manager', 'medsos_cs', 'all'] },
    { icon: Store, label: 'Marketplace', path: `${basePath}/marketplace`, roles: ['medsos_manager', 'medsos_cs', 'all'] },
    { icon: Megaphone, label: 'Meta Ads', path: `${basePath}/ads`, roles: ['medsos_manager', 'all'] },
    { icon: LineChart, label: 'Analytics', path: `${basePath}/analytics`, roles: ['medsos_manager', 'all'] },
    { icon: Settings, label: 'Settings', path: `${basePath}/settings`, roles: ['medsos_manager', 'all'] },
  ];

  const menuItems = allMenus.filter(item => {
    if (currentRole === 'super_admin') return true;
    if (item.roles.includes('all')) return true;
    return item.roles.includes(currentRole);
  });

  const inboxCount = useMemo(
    () => priorityThreads.reduce((total, item) => total + item.unread, 0),
    []
  );
  const activeChannels = useMemo(
    () => channelConnections.filter(item => item.status !== 'offline').length,
    []
  );

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-64 border-r ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="h-full px-3 py-4 overflow-y-auto">
          <div className="flex items-center gap-3 mb-8 px-2">
            <MyCommerSocialLogo size={40} className="shadow-lg shadow-blue-500/30" />
            <div>
              <h2 className="font-bold text-lg leading-tight">MyCommerSocial</h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {currentRole === 'medsos_manager' ? 'Omnichannel Manager' :
                 currentRole === 'content_creator' ? 'Content Creator' :
                 currentRole === 'medsos_cs' ? 'Inbox Commander' : 'Commerce + Social Hub'}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <BrandLogo brand="instagram" size={20} className="rounded-md" />
                <BrandLogo brand="tiktok" size={20} className="rounded-md" />
                <BrandLogo brand="shopee" size={20} className="rounded-md" />
                <BrandLogo brand="tokopedia" size={20} className="rounded-md px-1" withRing />
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
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all"
            >
              <Plus size={20} /> Create Campaign
            </button>
          </div>

          <ul className="space-y-2 font-medium">
            {menuItems.map((item, idx) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={idx}>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`flex items-center w-full p-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                        : isDark ? 'text-gray-400 hover:bg-slate-700 hover:text-white' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                    <span className="ml-3">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={`absolute bottom-0 left-0 w-full p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className={`mb-3 rounded-xl px-3 py-2 text-xs flex items-center gap-2 ${isDark ? 'bg-slate-900 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
            <BellRing size={14} />
            2 channel butuh follow up hari ini
          </div>
          <button
            onClick={() => navigate(isDemo ? '/demo' : '/module-selector')}
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
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <div className={`hidden md:flex items-center gap-3 rounded-2xl px-4 py-2 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex -space-x-2 mr-1">
              <BrandLogo brand="instagram" size={28} className="rounded-xl border-2 border-white" />
              <BrandLogo brand="facebook" size={28} className="rounded-xl border-2 border-white" />
              <BrandLogo brand="shopee" size={28} className="rounded-xl border-2 border-white" />
              <BrandLogo brand="tokopedia" size={28} className="rounded-xl border-2 border-white px-1" withRing />
            </div>
            <div>
              <p className={`text-[11px] uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Mode</p>
              <p className="text-sm font-semibold">MyCommerSocial</p>
            </div>
              <div className={`h-8 w-px ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
              <div>
                <p className={`text-[11px] uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Focus</p>
                <p className="text-sm font-semibold">Managed connectors + omnichannel ops</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
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
