import { useEffect, useMemo, useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Users, Loader2, Search, MessageCircle } from 'lucide-react';
import { listZernioContacts } from '../../services/medsosPostsService';
import toast from 'react-hot-toast';

export default function CustomerDatabasePage() {
  const { isDark } = useThemeStore();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listZernioContacts()
      .then((data) => {
        const arr = Array.isArray(data) ? data : data?.contacts || data?.data || [];
        setContacts(arr);
      })
      .catch(() => {
        toast.error('Gagal memuat daftar kontak');
        setContacts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredContacts = useMemo(() => contacts.filter((contact) => {
    const keyword = search.toLowerCase();
    return [contact.displayName, contact.name, contact.platformIdentifier, contact.username]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  }), [contacts, search]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`rounded-[28px] p-4 md:p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-sm ring-1 ring-slate-900/5'}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-3 py-1.5 font-bold ${isDark ? 'bg-slate-900 text-cyan-200 ring-1 ring-white/10' : 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100'}`}>{contacts.length} kontak</span>
            <span className={`rounded-full px-3 py-1.5 font-bold ${isDark ? 'bg-slate-900 text-blue-200 ring-1 ring-white/10' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'}`}>{contacts.reduce((sum, item) => sum + Number(item.messageCount || 0), 0)} pesan</span>
          </div>
        </div>

        <div className={`mb-4 flex items-center gap-2 rounded-2xl px-3 py-2 ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200'}`}>
          <Search size={16} className="text-blue-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, username, atau platform ID..." className="w-full bg-transparent text-sm outline-none" />
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : filteredContacts.length === 0 ? (
          <div className={`rounded-[24px] p-8 text-center ${isDark ? 'bg-slate-900/50 border-slate-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
            <Users size={42} className="mx-auto mb-3 opacity-50" />
            <p>{contacts.length === 0 ? 'Belum ada kontak. Mulai interaksi di Inbox untuk mengumpulkan data kontak.' : 'Kontak tidak ditemukan untuk kata kunci itu.'}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredContacts.map((contact, i) => (
              <div key={contact.id || i} className={`rounded-[22px] p-4 ${isDark ? 'bg-slate-950/70 ring-1 ring-white/10' : 'bg-slate-50 ring-1 ring-slate-200'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 font-black text-cyan-600">{String(contact.displayName || contact.name || '?').charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{contact.displayName || contact.name || 'Unknown'}</p>
                    <p className={`truncate text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{contact.platformIdentifier || contact.username || '-'}</p>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-600"><MessageCircle size={12} />{contact.messageCount || 0}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

}
