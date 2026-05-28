import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Bot, Loader2, Wand2, MessageCircle, ShieldCheck } from 'lucide-react';
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`rounded-[28px] p-4 md:p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-sm ring-1 ring-slate-900/5'}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
              <Wand2 size={13} /> Automation Builder
            </div>
            <div className="flex items-start gap-2">
              <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Comment-to-DM</h1>
              <FieldHelp title="Automations" description="Bikin bot Comment-to-DM. Otomatis kirim pesan DM kalau ada user yang komen kata kunci tertentu." howToUse="Isi nama rule, kata kunci, pesan DM, dan balasan publik opsional. Setelah aktif, bot akan merespons komentar yang cocok." />
            </div>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Satu rule sederhana: keyword masuk, DM terkirim, komentar publik dibalas bila perlu.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              ['1', 'Keyword'],
              ['2', 'DM'],
              ['3', 'Aktif'],
            ].map(([num, label]) => (
              <div key={label} className={`rounded-2xl px-3 py-2 text-center ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'}`}>
                <p className="font-black text-emerald-600">{num}</p>
                <p>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

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
