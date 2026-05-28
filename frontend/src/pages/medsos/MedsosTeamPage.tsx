import { useEffect, useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Eye,
  EyeOff,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

interface McsPermissions {
  inbox: boolean;
  analytics: boolean;
  content: boolean;
  ads: boolean;
  settings: boolean;
  marketplace: boolean;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  mcsPermissions: McsPermissions;
}

const MODULE_LABELS: { key: keyof McsPermissions; label: string; description: string }[] = [
  { key: 'inbox', label: 'Inbox', description: 'WA, Sosial & Marketplace chat' },
  { key: 'analytics', label: 'Analytics', description: 'Dashboard kinerja & laporan' },
  { key: 'content', label: 'Content', description: 'Planner & posting sosial media' },
  { key: 'marketplace', label: 'Marketplace', description: 'Kontrol marketplace hub' },
  { key: 'ads', label: 'Ads Workspace', description: 'Manajemen iklan Meta/Google' },
  { key: 'settings', label: 'Settings', description: 'Konfigurasi & integrasi' },
];

const emptyPermissions: McsPermissions = {
  inbox: false,
  analytics: false,
  content: false,
  ads: false,
  settings: false,
  marketplace: false,
};

const defaultForm = () => ({
  name: '',
  email: '',
  password: '',
  mcsPermissions: { ...emptyPermissions, inbox: true },
});

export default function MedsosTeamPage() {
  const { isDark } = useThemeStore();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<TeamMember | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [editPermissions, setEditPermissions] = useState<McsPermissions | null>(null);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/medsos/team');
      setMembers(data.data);
    } catch {
      toast.error('Gagal memuat daftar tim.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(defaultForm());
    setShowForm(true);
  };

  const openEdit = (member: TeamMember) => {
    setEditTarget(member);
    setEditPermissions({ ...member.mcsPermissions });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setEditPermissions(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/medsos/team', {
        name: form.name,
        email: form.email,
        password: form.password,
        mcsPermissions: form.mcsPermissions,
      });
      toast.success('Anggota tim berhasil ditambahkan.');
      closeForm();
      fetchTeam();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Gagal menambahkan anggota.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!editTarget || !editPermissions) return;
    setSaving(true);
    try {
      await api.put(`/medsos/team/${editTarget.id}`, { mcsPermissions: editPermissions });
      toast.success('Hak akses diperbarui.');
      closeForm();
      fetchTeam();
    } catch {
      toast.error('Gagal memperbarui hak akses.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Nonaktifkan anggota tim ini?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/medsos/team/${id}`);
      toast.success('Anggota tim dinonaktifkan.');
      fetchTeam();
    } catch {
      toast.error('Gagal menonaktifkan anggota.');
    } finally {
      setDeletingId(null);
    }
  };

  const togglePerm = (key: keyof McsPermissions, source: 'form' | 'edit') => {
    if (source === 'form') {
      setForm((f) => ({ ...f, mcsPermissions: { ...f.mcsPermissions, [key]: !f.mcsPermissions[key] } }));
    } else {
      setEditPermissions((p) => p ? { ...p, [key]: !p[key] } : p);
    }
  };

  const card = `rounded-[24px] p-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white ring-1 ring-slate-900/5 shadow-sm'}`;
  const inputClass = `w-full rounded-xl border-0 ring-1 ring-inset ring-gray-200 dark:ring-white/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white focus:ring-blue-500' : 'border-gray-300 bg-white focus:ring-blue-500'}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus size={16} />
          Tambah Anggota
        </button>
      </div>

      {/* Create member form */}
      {showForm ? (
        <div className={card}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Tambah Anggota Baru</h2>
            <button onClick={closeForm} className={`rounded-lg p-1 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Nama</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Nama anggota"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Email (username login)</label>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="email@domain.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={inputClass}
                  placeholder="Minimal 6 karakter"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Hak Akses Modul</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MODULE_LABELS.map(({ key, label, description }) => {
                  const active = form.mcsPermissions[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => togglePerm(key, 'form')}
                      className={`rounded-xl border p-3 text-left transition ${active
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400'
                        : isDark ? 'border-slate-600 bg-slate-700/50' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-1.5">
                        {active ? <ShieldCheck size={14} className="text-blue-500 shrink-0" /> : <div className="h-3.5 w-3.5 rounded-full border border-gray-400 shrink-0" />}
                        <span className={`text-sm font-semibold ${active ? 'text-blue-700 dark:text-blue-300' : ''}`}>{label}</span>
                      </div>
                      <p className={`mt-0.5 text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeForm} className={`rounded-xl px-4 py-2 text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Simpan
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Member list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-blue-500" />
        </div>
      ) : members.length === 0 ? (
        <div className={`${card} flex flex-col items-center py-12 text-center`}>
          <UserRound size={36} className={isDark ? 'text-gray-600' : 'text-gray-300'} />
          <p className={`mt-3 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Belum ada anggota tim</p>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Klik "Tambah Anggota" untuk menambahkan anggota pertama.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className={card}>
              {editTarget?.id === member.id && editPermissions ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold">Edit Hak Akses — {member.name}</p>
                    <button onClick={closeForm} className={`rounded-lg p-1 ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                      <X size={16} />
                    </button>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {MODULE_LABELS.map(({ key, label, description }) => {
                      const active = editPermissions[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => togglePerm(key, 'edit')}
                          className={`rounded-xl border p-3 text-left transition ${active
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400'
                            : isDark ? 'border-slate-600 bg-slate-700/50' : 'border-gray-200 bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-1.5">
                            {active ? <ShieldCheck size={14} className="text-blue-500 shrink-0" /> : <div className="h-3.5 w-3.5 rounded-full border border-gray-400 shrink-0" />}
                            <span className={`text-sm font-semibold ${active ? 'text-blue-700 dark:text-blue-300' : ''}`}>{label}</span>
                          </div>
                          <p className={`mt-0.5 text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={closeForm} className={`rounded-xl px-4 py-2 text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                      Batal
                    </button>
                    <button
                      onClick={handleUpdatePermissions}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                      Simpan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${isDark ? 'bg-slate-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{member.email}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {MODULE_LABELS.filter(({ key }) => member.mcsPermissions[key]).map(({ key, label }) => (
                          <span key={key} className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                            {label}
                          </span>
                        ))}
                        {MODULE_LABELS.filter(({ key }) => member.mcsPermissions[key]).length === 0 ? (
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Belum ada akses</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(member)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-100'}`}
                    >
                      Edit Akses
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      disabled={deletingId === member.id}
                      className={`rounded-xl p-2 transition ${isDark ? 'text-red-400 hover:bg-red-900/20' : 'text-red-500 hover:bg-red-50'}`}
                    >
                      {deletingId === member.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
