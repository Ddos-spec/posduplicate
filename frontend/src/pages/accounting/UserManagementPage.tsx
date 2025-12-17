import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  Download,
  Plus,
  Check,
  X,
  Building2,
  Clock,
  ChevronDown,
  Loader2
} from 'lucide-react';

interface ApiRole {
  id: number;
  name: string;
}

interface ApiOutlet {
  id: number;
  name: string;
}

interface ApiUser {
  id: number;
  name: string;
  email: string;
  role?: ApiRole | null;
  outlet?: ApiOutlet | null;
  is_active: boolean;
  created_at: string | null;
  last_login: string | null;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  outlet: string;
  allOutlets: boolean;
  status: boolean;
  createdAt: string;
  lastLogin: string;
  isOnline: boolean;
}

interface StatsState {
  total: number;
  active: number;
  loginToday: number;
  slots: number;
  maxSlots: number;
}

const roleQueryMap: Record<string, string> = {
  distributor: 'Distributor',
  produsen: 'Produsen',
  retail: 'Retail',
  accountant: 'Accountant',
  staff: 'Staff',
  owner: 'Owner',
  manager: 'Manager'
};

const formatDate = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getRelativeTime = (value: string | null) => {
  if (!value) return 'Offline';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Offline';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 2) return 'Baru saja';
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${diffDays} hari lalu`;
};

const isRecentlyOnline = (value: string | null) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const diffMinutes = (Date.now() - date.getTime()) / (1000 * 60);
  return diffMinutes <= 10;
};

export default function UserManagementPage() {
  const { isDark } = useThemeStore();
  const navigate = useNavigate();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'distributor' | 'produsen' | 'retail'>('all');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'terbaru' | 'nama' | 'role'>('terbaru');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<StatsState>({
    total: 0,
    active: 0,
    loginToday: 0,
    slots: 0,
    maxSlots: 0
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [updatingUserIds, setUpdatingUserIds] = useState<number[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const fetchUsers = useCallback(
    async (pageValue = 1) => {
      try {
        setLoading(true);
        const params: Record<string, string | number> = {
          page: pageValue,
          limit: pageSize
        };

        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }

        if (activeFilter !== 'all') {
          params.role = roleQueryMap[activeFilter] || activeFilter;
        }

        const response = await api.get('/accounting/users', { params });
        const payload = response.data?.data || {};
        const statsData = payload.stats || {};

        const totalUsers = Number(statsData.totalUsers || 0);
        const slotsRemaining = Number(statsData.slotsRemaining || 0);
        const maxSlots = Number(statsData.maxUsers || totalUsers + slotsRemaining);

        setStats({
          total: totalUsers,
          active: Number(statsData.activeUsers || 0),
          loginToday: Number(statsData.loginToday || 0),
          slots: slotsRemaining,
          maxSlots
        });

        const mappedUsers: UserRow[] = (payload.users || []).map((user: ApiUser) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role?.name || 'Staff',
          outlet: user.outlet?.name || 'Semua Outlet',
          allOutlets: !user.outlet || user.outlet.id === 0,
          status: user.is_active,
          createdAt: formatDate(user.created_at),
          lastLogin: getRelativeTime(user.last_login),
          isOnline: isRecentlyOnline(user.last_login)
        }));

        setUsers(mappedUsers);
        setPage(payload.pagination?.page || pageValue);
        setTotalPages(payload.pagination?.totalPages || 1);
        setTotalCount(payload.pagination?.total || totalUsers);
        setSelectedUsers([]);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        let errorMessage = 'Gagal memuat pengguna';
        if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
          errorMessage = error.response.data.error.message;
        }
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [activeFilter, pageSize, searchTerm]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [fetchUsers]);

  const displayedUsers = useMemo(() => {
    const sorted = [...users];
    if (sortBy === 'nama') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'role') {
      sorted.sort((a, b) => a.role.localeCompare(b.role));
    }
    return sorted;
  }, [sortBy, users]);

  const usagePercent = stats.maxSlots > 0 ? Math.round((stats.total / stats.maxSlots) * 100) : 0;

  const toggleSelectUser = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === displayedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(displayedUsers.map((user) => user.id));
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'distributor':
        return 'bg-blue-100 text-blue-600';
      case 'produsen':
        return 'bg-purple-100 text-purple-600';
      case 'retail':
        return 'bg-emerald-100 text-emerald-600';
      case 'accountant':
        return 'bg-indigo-100 text-indigo-600';
      case 'owner':
        return 'bg-yellow-100 text-yellow-700';
      case 'manager':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'distributor':
        return 'D';
      case 'produsen':
        return 'P';
      case 'retail':
        return 'R';
      case 'accountant':
        return 'A';
      case 'owner':
        return 'O';
      case 'manager':
        return 'M';
      default:
        return 'U';
    }
  };

  const handleToggleStatus = async (user: UserRow) => {
    if (user.id === currentUserId) {
      toast.error('Tidak bisa menonaktifkan akun sendiri');
      return;
    }

    const nextStatus = !user.status;
    try {
      setUpdatingUserIds((prev) => [...prev, user.id]);
      await api.patch(`/accounting/users/${user.id}`, { is_active: nextStatus });
      toast.success(nextStatus ? 'Pengguna diaktifkan' : 'Pengguna dinonaktifkan');
      fetchUsers(page);
    } catch (error) {
      console.error('Failed to update user status:', error);
      let errorMessage = 'Gagal mengubah status pengguna';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setUpdatingUserIds((prev) => prev.filter((id) => id !== user.id));
    }
  };

  const handleBulkDeactivate = async () => {
    const targets = selectedUsers.filter((id) => id !== currentUserId);
    if (targets.length === 0) {
      toast.error('Tidak ada pengguna yang bisa dinonaktifkan');
      return;
    }

    try {
      setBulkUpdating(true);
      const results = await Promise.allSettled(
        targets.map((id) => api.patch(`/accounting/users/${id}`, { is_active: false }))
      );
      const failed = results.filter((result) => result.status === 'rejected');
      if (failed.length > 0) {
        toast.error(`Gagal menonaktifkan ${failed.length} pengguna`);
      } else {
        toast.success('Pengguna berhasil dinonaktifkan');
      }
      fetchUsers(page);
    } finally {
      setBulkUpdating(false);
      setSelectedUsers([]);
    }
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    fetchUsers(nextPage);
  };

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <div className="space-y-6">
      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Akuntansi / <span className={isDark ? 'text-white' : 'text-gray-900'}>Kelola Pengguna</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Kelola Pengguna</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              {stats.total} dari {stats.maxSlots} pengguna aktif
            </span>
            <span className="text-emerald-500 font-medium">{usagePercent}%</span>
            <div className={`w-24 h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              isDark ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
          <button
            onClick={() => navigate('/accounting/users/create')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600"
          >
            <Plus className="w-4 h-4" />
            Buat Pengguna Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Pengguna</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
              <Users className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.active}</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pengguna Aktif</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-500 text-sm">ONLINE</span>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.loginToday}</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Login Hari Ini</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
              <Clock className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.slots}</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Slot Tersisa</p>
            </div>
            <div className="relative w-10 h-10">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke={isDark ? '#334155' : '#e5e7eb'} strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3"
                  strokeDasharray={`${stats.maxSlots > 0 ? (stats.slots / stats.maxSlots) * 100 : 0} 100`}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Cari nama, email, atau role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              {(['all', 'distributor', 'produsen', 'retail'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    activeFilter === filter
                      ? 'bg-emerald-500 text-white'
                      : isDark ? 'bg-slate-700 text-gray-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter === 'all' ? 'Semua' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Urutkan:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'terbaru' | 'nama' | 'role')}
                className={`bg-transparent text-sm font-medium focus:outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                <option value="terbaru">Terbaru</option>
                <option value="nama">Nama</option>
                <option value="role">Role</option>
              </select>
              <ChevronDown className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-left text-sm ${isDark ? 'text-gray-400 bg-slate-800/50' : 'text-gray-500 bg-gray-50'}`}>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={displayedUsers.length > 0 && selectedUsers.length === displayedUsers.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Pengguna</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Outlet</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Dibuat</th>
                <th className="px-4 py-3 font-medium">Login Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memuat pengguna...
                    </div>
                  </td>
                </tr>
              ) : displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada pengguna.
                  </td>
                </tr>
              ) : (
                displayedUsers.map((user) => {
                  const isUpdating = updatingUserIds.includes(user.id);
                  const isSelf = user.id === currentUserId;
                  return (
                    <tr
                      key={user.id}
                      className={`${
                        selectedUsers.includes(user.id)
                          ? isDark
                            ? 'bg-purple-500/10 border-l-4 border-l-purple-500'
                            : 'bg-purple-50 border-l-4 border-l-purple-500'
                          : ''
                      } ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-medium">
                            {user.name.split(' ').map((name) => name[0]).join('')}
                          </div>
                          <div>
                            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.name}</p>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {getRoleIcon(user.role)} {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {user.allOutlets && <Building2 className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />}
                          <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{user.outlet}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          disabled={isUpdating || isSelf}
                          className={`w-12 h-6 rounded-full p-1 transition-colors ${
                            user.status ? 'bg-emerald-500' : isDark ? 'bg-slate-600' : 'bg-gray-300'
                          } ${isUpdating || isSelf ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                          title={isSelf ? 'Tidak bisa menonaktifkan akun sendiri' : 'Ubah status'}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${user.status ? 'translate-x-6' : ''}`} />
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>{user.createdAt}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              user.isOnline ? 'bg-emerald-500' : user.lastLogin === 'Offline' ? 'bg-gray-400' : 'bg-yellow-500'
                            }`}
                          />
                          <span className={`text-sm ${user.isOnline ? 'text-emerald-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {user.lastLogin}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {selectedUsers.length > 0 && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-xl shadow-lg ${isDark ? 'bg-purple-600' : 'bg-purple-500'} text-white`}>
            <span className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              {selectedUsers.length} pengguna dipilih
            </span>
            <button
              onClick={handleBulkDeactivate}
              disabled={bulkUpdating}
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium disabled:opacity-70"
            >
              {bulkUpdating ? 'Memproses...' : 'Nonaktifkan'}
            </button>
            <button
              onClick={() => toast.error('Fitur hapus belum tersedia')}
              className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-sm font-medium"
            >
              Hapus
            </button>
            <button onClick={() => setSelectedUsers([])} className="p-1 hover:bg-white/20 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-4 py-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Menampilkan {rangeStart}-{rangeEnd} dari {totalCount} pengguna
          </span>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              <option value={10}>10 per halaman</option>
              <option value={25}>25 per halaman</option>
              <option value={50}>50 per halaman</option>
            </select>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className={`w-8 h-8 rounded flex items-center justify-center ${
                  isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                } ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                &lt;
              </button>
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className={`w-8 h-8 rounded flex items-center justify-center ${
                  isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                } ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
