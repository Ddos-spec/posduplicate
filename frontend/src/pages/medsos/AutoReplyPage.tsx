import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Bot, Loader2, MessageCircle, ShieldCheck } from 'lucide-react';
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.65fr)]">
        <div className={`rounded-[28px] p-4 md:p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-sm ring-1 ring-slate-900/5'}`}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold mb-1">Nama Automasi</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Komen 'INFO' kirim link" className={`w-full p-3 rounded-xl border ${isDark ? 'bg-[#111318] ring-1 ring-white/10 text-white' : 'bg-white border-gray-200'}`} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Trigger Keywords</label>
              <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="info, link, harga, mau" className={`w-full p-3 rounded-xl border ${isDark ? 'bg-[#111318] ring-1 ring-white/10 text-white' : 'bg-white border-gray-200'}`} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Isi Balasan DM</label>
              <textarea value={dmMessage} onChange={e => setDmMessage(e.target.value)} rows={4} placeholder="Halo! Ini link promo yang kamu minta..." className={`w-full p-3 rounded-xl border resize-y ${isDark ? 'bg-[#111318] ring-1 ring-white/10 text-white' : 'bg-white border-gray-200'}`} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Balasan Komen Publik <span className="text-xs font-normal opacity-60">opsional</span></label>
              <textarea value={commentReply} onChange={e => setCommentReply(e.target.value)} rows={2} placeholder="Cek DM ya kak!" className={`w-full p-3 rounded-xl border resize-y ${isDark ? 'bg-[#111318] ring-1 ring-white/10 text-white' : 'bg-white border-gray-200'}`} />
            </div>
          </div>
          <button onClick={handleSave} disabled={loading} className="mt-4 inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Bot size={18} />}
            Aktifkan Automasi
          </button>
        </div>

        <aside className={`rounded-[28px] p-4 ${isDark ? 'bg-slate-950/70 ring-1 ring-white/10' : 'bg-slate-50 ring-1 ring-slate-200'}`}>
          <div className="flex items-center gap-2 font-bold"><MessageCircle size={17} className="text-emerald-500" />Preview flow</div>
          <div className="mt-4 space-y-3 text-sm">
            <div className={`rounded-2xl p-3 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>Komentar mengandung: <b>{keywords || 'info'}</b></div>
            <div className={`rounded-2xl p-3 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>DM terkirim: <b>{dmMessage ? `${dmMessage.slice(0, 70)}...` : 'Isi pesan DM dulu'}</b></div>
            <div className={`rounded-2xl p-3 ${isDark ? 'bg-slate-900' : 'bg-white'}`}><ShieldCheck size={15} className="inline mr-1 text-emerald-500" />Rule tersimpan sebagai automasi.</div>
          </div>
        </aside>
      </div>
    </div>
  );

}
