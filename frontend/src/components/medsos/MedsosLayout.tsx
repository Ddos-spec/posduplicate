import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import {
  LayoutDashboard, Calendar, MessageCircle, Share2, Settings,
  LogOut, Menu, Sun, Moon, ArrowLeft, Instagram, Facebook, Youtube
} from 'lucide-react';

export default function MedsosLayout() {
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Detect if we are in demo mode
  const isDemo = location.pathname.startsWith('/demo');
  const basePath = isDemo ? '/demo/medsos' : '/medsos';

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: `${basePath}/dashboard` },
    { icon: Calendar, label: 'Content Calendar', path: `${basePath}/calendar` },
    { icon: MessageCircle, label: 'Inbox & Reply', path: `${basePath}/inbox` },
    { icon: Settings, label: 'Settings', path: `${basePath}/settings` },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-64 border-r ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="h-full px-3 py-4 overflow-y-auto">
          {/* Logo / Header */}
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Share2 size={24} />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">MyMedsos</h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Social Media Manager</p>
            </div>
          </div>

          {/* Navigation */}
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

        {/* Footer Sidebar */}
        <div className={`absolute bottom-0 left-0 w-full p-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
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

      {/* Main Content Wrapper */}
      <div className="p-4 md:ml-64">
        {/* Topbar Mobile & Theme Toggle */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <div className="flex -space-x-2 mr-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 flex items-center justify-center text-white border-2 border-white dark:border-slate-800">
                    <Instagram size={14} />
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white border-2 border-white dark:border-slate-800">
                    <Facebook size={14} />
                </div>
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white border-2 border-white dark:border-slate-800">
                    <Youtube size={14} />
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

        {/* Page Content Rendered Here */}
        <Outlet />
      </div>
    </div>
  );
}
