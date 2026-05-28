import { useEffect, useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Users, Loader2, Search, Database, MessageCircle } from 'lucide-react';
import FieldHelp from '../../components/medsos/FieldHelp';
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

  const filteredContacts = contacts.filter((contact) => {
    const keyword = search.toLowerCase();
    return [contact.displayName, contact.name, contact.platformIdentifier, contact.username]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`rounded-[28px] p-4 md:p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-sm ring-1 ring-slate-900/5'}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">
              <Database size={13} /> CRM Database
            </div>
            <div className="flex items-start gap-2">
              <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Contacts</h1>
              <FieldHelp title="CRM Contacts" description="Daftar kontak yang pernah berinteraksi melalui inbox. Data diambil langsung dari CRM terpadu." howToUse="Gunakan search untuk mencari kontak. Kontak akan bertambah otomatis dari interaksi inbox dan channel yang terhubung." />
            </div>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Database ringan untuk melihat siapa saja yang sudah masuk ke funnel percakapan.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'}`}><p className="font-black text-lg text-cyan-600">{contacts.length}</p><p>Total kontak</p></div>
            <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'}`}><p className="font-black text-lg text-blue-600">{contacts.reduce((sum, item) => sum + Number(item.messageCount || 0), 0)}</p><p>Pesan</p></div>
          </div>
        </div>
      </div>

      <div className={`rounded-[28px] p-4 md:p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-sm ring-1 ring-slate-900/5'}`}>
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
