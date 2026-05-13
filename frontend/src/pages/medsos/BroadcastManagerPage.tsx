import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Loader2, Send } from 'lucide-react';
import FieldHelp from '../../components/medsos/FieldHelp';
import { createZernioBroadcast } from '../../services/medsosPostsService';
import toast from 'react-hot-toast';

export default function BroadcastManagerPage() {
  const { isDark } = useThemeStore();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [platform, setPlatform] = useState('instagram');

  const handleSend = async () => {
    if (!name || !message) {
      toast.error('Isi nama broadcast dan pesan');
      return;
    }
    setLoading(true);
    try {
      await createZernioBroadcast({ name, message, platform });
      toast.success('Broadcast berhasil dibuat');
      setName('');
      setMessage('');
    } catch {
      toast.error('Gagal membuat broadcast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-[32px] p-6 md:p-8 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
        <div className="flex items-center gap-2 mb-6">
          <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Broadcast Manager</h1>
          <FieldHelp title="Broadcast Manager" description="Kirim pesan massal ke kontak CRM yang ada di platform terkait." />
        </div>

        <div className="max-w-xl space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Nama Campaign</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Promo Lebaran 2026"
              className={`w-full p-3 rounded-xl border ${isDark ? 'bg-[#111318] ring-1 ring-white/10 text-white' : 'bg-white border-gray-200'}`} 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Platform Tujuan</label>
            <select 
              value={platform} 
              onChange={e => setPlatform(e.target.value)}
              className={`w-full p-3 rounded-xl border ${isDark ? 'bg-[#111318] ring-1 ring-white/10 text-white' : 'bg-white border-gray-200'}`}
            >
              <option value="instagram">Instagram DM</option>
              <option value="facebook">Facebook Messenger</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Pesan Broadcast</label>
            <textarea 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              rows={4}
              placeholder="Ketik isi pesan promosi..."
              className={`w-full p-3 rounded-xl border resize-none ${isDark ? 'bg-[#111318] ring-1 ring-white/10 text-white' : 'bg-white border-gray-200'}`} 
            />
          </div>

          <button 
            onClick={handleSend} 
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            Kirim Broadcast
          </button>
        </div>
      </div>
    </div>
  );
}
