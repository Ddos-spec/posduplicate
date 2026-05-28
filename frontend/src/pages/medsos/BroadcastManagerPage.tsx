import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Loader2, Send, Megaphone, Users, Clock } from 'lucide-react';
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`rounded-[28px] p-4 md:p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-sm ring-1 ring-slate-900/5'}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
              <Megaphone size={13} /> Broadcast
            </div>
            <div className="flex items-start gap-2">
              <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Broadcast Manager</h1>
              <FieldHelp title="Broadcast Manager" description="Kirim pesan massal ke kontak CRM yang ada di platform terkait." howToUse="Pilih platform, isi nama campaign dan pesan. Sistem akan membuat broadcast draft yang bisa diproses oleh channel terkait." />
            </div>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Buat broadcast cepat tanpa wizard panjang. Fokus ke platform, pesan, dan eksekusi.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`rounded-2xl px-3 py-2 ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'}`}><Users size={14} className="mb-1 text-blue-500" /> Target CRM</div>
            <div className={`rounded-2xl px-3 py-2 ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'}`}><Clock size={14} className="mb-1 text-blue-500" /> Siap dijadwalkan</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.65fr)]">
        <div className={`rounded-[28px] p-4 md:p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-sm ring-1 ring-slate-900/5'}`}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold mb-1">Nama Campaign</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Promo Lebaran 2026" className={`w-full p-3 rounded-xl border ${isDark ? 'bg-[#111318] ring-1 ring-white/10 text-white' : 'bg-white border-gray-200'}`} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Platform Tujuan</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)} className={`w-full p-3 rounded-xl border ${isDark ? 'bg-[#111318] ring-1 ring-white/10 text-white' : 'bg-white border-gray-200'}`}>
                <option value="instagram">Instagram DM</option>
                <option value="facebook">Facebook Messenger</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Pesan Broadcast</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} placeholder="Ketik isi pesan promosi..." className={`w-full p-3 rounded-xl border resize-y ${isDark ? 'bg-[#111318] ring-1 ring-white/10 text-white' : 'bg-white border-gray-200'}`} />
            </div>
          </div>
          <button onClick={handleSend} disabled={loading} className="mt-4 inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            Buat Broadcast
          </button>
        </div>

        <aside className={`rounded-[28px] p-4 ${isDark ? 'bg-slate-950/70 ring-1 ring-white/10' : 'bg-slate-50 ring-1 ring-slate-200'}`}>
          <div className="font-bold">Preview pesan</div>
          <div className={`mt-4 rounded-[24px] p-4 text-sm leading-6 ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-700 shadow-sm'}`}>
            <p className="text-xs uppercase tracking-[0.16em] opacity-50">{platform}</p>
            <p className="mt-2 font-semibold">{name || 'Nama campaign'}</p>
            <p className="mt-3 whitespace-pre-wrap">{message || 'Pesan broadcast akan tampil di sini sebelum dikirim.'}</p>
          </div>
        </aside>
      </div>
    </div>
  );

}
