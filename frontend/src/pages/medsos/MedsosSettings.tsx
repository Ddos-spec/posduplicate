import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Instagram, Facebook, Youtube, Check, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MedsosSettings() {
  const { isDark } = useThemeStore();
  
  const [connections, setConnections] = useState([
    { id: 'ig', name: 'Instagram', icon: Instagram, connected: true, account: '@my_brand_id', color: 'bg-purple-600' },
    { id: 'fb', name: 'Facebook Page', icon: Facebook, connected: true, account: 'My Brand Official', color: 'bg-blue-600' },
    { id: 'tt', name: 'TikTok', icon: Link2, connected: false, account: '', color: 'bg-black' },
    { id: 'yt', name: 'YouTube', icon: Youtube, connected: false, account: '', color: 'bg-red-600' },
  ]);

  const toggleConnection = (id: string) => {
    setConnections(prev => prev.map(c => {
      if (c.id === id) {
        const newState = !c.connected;
        toast.success(newState ? `${c.name} Connected!` : `${c.name} Disconnected`);
        return { ...c, connected: newState, account: newState ? '@new_account' : '' };
      }
      return c;
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Integrasi Akun</h1>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Hubungkan akun media sosial untuk mengelola konten dan pesan.</p>
      </div>

      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <h3 className={`font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Connected Accounts</h3>
        
        <div className="space-y-4">
          {connections.map(conn => (
            <div key={conn.id} className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'border-slate-700 bg-slate-700/30' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md ${conn.color}`}>
                  <conn.icon size={24} />
                </div>
                <div>
                  <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{conn.name}</h4>
                  {conn.connected ? (
                    <p className="text-sm text-green-500 flex items-center gap-1">
                      <Check size={12} /> Terhubung sebagai {conn.account}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Belum terhubung</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => toggleConnection(conn.id)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  conn.connected 
                    ? 'border border-red-200 text-red-500 hover:bg-red-50' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30'
                }`}
              >
                {conn.connected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Auto-Reply Settings</h3>
        <div className="flex items-center justify-between">
            <div>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Aktifkan Balasan Cepat</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Kirim pesan otomatis saat di luar jam kerja.</p>
            </div>
            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6" />
            </div>
        </div>
      </div>
    </div>
  );
}
