import { useEffect, useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Users, Loader2 } from 'lucide-react';
import FieldHelp from '../../components/medsos/FieldHelp';
import { listZernioContacts } from '../../services/medsosPostsService';
import toast from 'react-hot-toast';

export default function CustomerDatabasePage() {
  const { isDark } = useThemeStore();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div className={`rounded-[32px] p-6 md:p-8 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5'}`}>
        <div className="flex items-center gap-2 mb-6">
          <h1 className={`text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>CRM & Contacts</h1>
          <FieldHelp title="CRM Contacts" description="Daftar kontak yang pernah berinteraksi melalui inbox. Data diambil langsung dari CRM terpadu." />
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : contacts.length === 0 ? (
          <div className={`rounded-[24px] p-6 text-center ${isDark ? 'bg-slate-900/50 border-slate-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
            <Users size={48} className="mx-auto mb-3 opacity-50" />
            <p>Belum ada kontak. Mulai interaksi di Inbox untuk mengumpulkan data kontak.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`${isDark ? 'bg-slate-900 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                <tr>
                  <th className="px-4 py-3 rounded-tl-xl">Nama / Display Name</th>
                  <th className="px-4 py-3">Platform ID / Username</th>
                  <th className="px-4 py-3 rounded-tr-xl">Total Messages</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-100'}`}>
                {contacts.map((contact, i) => (
                  <tr key={contact.id || i}>
                    <td className="px-4 py-3 font-semibold">{contact.displayName || contact.name || 'Unknown'}</td>
                    <td className="px-4 py-3">{contact.platformIdentifier || '-'}</td>
                    <td className="px-4 py-3">{contact.messageCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
