import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Bot, Loader2 } from 'lucide-react';
import FieldHelp from '../../components/medsos/FieldHelp';
import { createZernioAutomation } from '../../services/medsosPostsService';
import toast from 'react-hot-toast';

export default function AutoReplyPage() {
  const { isDark } = useThemeStore();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [dmMessage, setDmMessage] = useState('');
  const [commentReply, setCommentReply] = useState('');

  const handleSave = async () => {
    if (!name || !keywords || !dmMessage) {
      toast.error('Isi nama, keywords, dan pesan DM');
      return;
    }
    setLoading(true);
    try {
      await createZernioAutomation({ name, keywords, dmMessage, commentReply });
      toast.success('Automasi Comment-to-DM aktif!');
      setName('');
      setKeywords('');
      setDmMessage('');
      setCommentReply('');
    } catch {
      toast.error('Gagal membuat automasi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
        <div className="flex items-center gap-2 mb-6">
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Comment Automations</h1>
          <FieldHelp title="Automations" description="Bikin bot Comment-to-DM. Otomatis kirim pesan DM kalau ada user yang komen kata kunci tertentu." />
        </div>

        <div className="max-w-xl space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Nama Automasi</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Komen 'INFO' kirim Link"
              className={`w-full p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200'}`} 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Trigger Keywords (pisahkan dengan koma)</label>
            <input 
              type="text" 
              value={keywords} 
              onChange={e => setKeywords(e.target.value)} 
              placeholder="info, link, harga, mau"
              className={`w-full p-3 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200'}`} 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Isi Balasan DM (Private)</label>
            <textarea 
              value={dmMessage} 
              onChange={e => setDmMessage(e.target.value)} 
              rows={3}
              placeholder="Halo! Ini link promo yang kamu minta: https://mypos.id"
              className={`w-full p-3 rounded-xl border resize-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200'}`} 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Isi Balasan Komen (Public - Opsional)</label>
            <textarea 
              value={commentReply} 
              onChange={e => setCommentReply(e.target.value)} 
              rows={2}
              placeholder="Cek DM ya kak!"
              className={`w-full p-3 rounded-xl border resize-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200'}`} 
            />
          </div>

          <button 
            onClick={handleSave} 
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Bot size={18} />}
            Aktifkan Automasi
          </button>
        </div>
      </div>
    </div>
  );
}
