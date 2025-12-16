import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import {
  Users, Search, Download, Plus, MoreVertical, Check, X,
  Building2, Clock, Filter, ChevronDown
} from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'Distributor' | 'Produsen' | 'Retail' | 'Accountant' | 'Staff';
  outlet: string;
  allOutlets: boolean;
  status: boolean;
  createdAt: string;
  lastLogin: string;
  isOnline: boolean;
}

export default function UserManagementPage() {
  const { isDark } = useThemeStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'distributor' | 'produsen' | 'retail'>('all');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState('terbaru');

  const stats = {
    total: 8,
    active: 7,
    loginToday: 5,
    slots: 12,
    maxSlots: 20
  };

  const users: User[] = [
    { id: 1, name: 'John Doe', email: 'john@perusahaan.com', role: 'Distributor', outlet: 'Semua Outlet', allOutlets: true, status: true, createdAt: '15 Des 2025', lastLogin: '5 menit lalu', isOnline: true },
    { id: 2, name: 'Sarah Smith', email: 'sarah@perusahaan.com', role: 'Produsen', outlet: 'Outlet Pusat', allOutlets: false, status: true, createdAt: '14 Des 2025', lastLogin: '2 jam lalu', isOnline: true },
    { id: 3, name: 'Michael Chen', email: 'michael@perusahaan.com', role: 'Retail', outlet: 'Outlet Jakarta', allOutlets: false, status: false, createdAt: '10 Des 2025', lastLogin: 'Offline', isOnline: false },
    { id: 4, name: 'Lisa Miller', email: 'lisa@perusahaan.com', role: 'Accountant', outlet: 'Semua Outlet', allOutlets: true, status: true, createdAt: '08 Des 2025', lastLogin: '10 menit lalu', isOnline: true },
    { id: 5, name: 'David Kim', email: 'david@perusahaan.com', role: 'Staff', outlet: 'Outlet Surabaya', allOutlets: false, status: true, createdAt: '01 Des 2025', lastLogin: 'Offline', isOnline: false },
  ];

  const toggleSelectUser = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Distributor': return 'bg-blue-100 text-blue-600';
      case 'Produsen': return 'bg-purple-100 text-purple-600';
      case 'Retail': return 'bg-emerald-100 text-emerald-600';
      case 'Accountant': return 'bg-indigo-100 text-indigo-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Distributor': return '📦';
      case 'Produsen': return '🏭';
      case 'Retail': return '🛒';
      case 'Accountant': return '📊';
      default: return '👤';
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        🏠 / <span className={isDark ? 'text-white' : 'text-gray-900'}>Kelola Pengguna</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Kelola Pengguna</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
              {stats.total} dari {stats.maxSlots} pengguna aktif
            </span>
            <span className="text-emerald-500 font-medium">{Math.round((stats.total / stats.maxSlots) * 100)}%</span>
            <div className={`w-24 h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(stats.total / stats.maxSlots) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isDark ? 'border-slate-700 text-gray-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
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

      {/* Stats Cards */}
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
                  strokeDasharray={`${(stats.slots / stats.maxSlots) * 100} 100`}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className={`rounded-xl ${isDark ? 'bg-slate-800' : 'bg-white shadow'}`}>
        {/* Search and Filters */}
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
                  {filter !== 'all' && <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${activeFilter === filter ? 'bg-emerald-600' : isDark ? 'bg-slate-600' : 'bg-gray-200'}`}>
                    {filter === 'distributor' ? '2' : filter === 'produsen' ? '1' : '0'}
                  </span>}
                </button>
              ))}
            </div>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Urutkan:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-left text-sm ${isDark ? 'text-gray-400 bg-slate-800/50' : 'text-gray-500 bg-gray-50'}`}>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length}
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
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={`${selectedUsers.includes(user.id) ? isDark ? 'bg-purple-500/10 border-l-4 border-l-purple-500' : 'bg-purple-50 border-l-4 border-l-purple-500' : ''} ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}
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
                        {user.name.split(' ').map(n => n[0]).join('')}
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
                    <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${user.status ? 'bg-emerald-500' : isDark ? 'bg-slate-600' : 'bg-gray-300'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${user.status ? 'translate-x-6' : ''}`} />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>{user.createdAt}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>2 hari lalu</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-emerald-500' : user.lastLogin === 'Offline' ? 'bg-gray-400' : 'bg-yellow-500'}`} />
                      <span className={`text-sm ${user.isOnline ? 'text-emerald-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {user.lastLogin}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selection Actions */}
        {selectedUsers.length > 0 && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-xl shadow-lg ${isDark ? 'bg-purple-600' : 'bg-purple-500'} text-white`}>
            <span className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              {selectedUsers.length} pengguna dipilih
            </span>
            <button className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium">
              🚫 Nonaktifkan
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-sm font-medium">
              🗑 Hapus
            </button>
            <button onClick={() => setSelectedUsers([])} className="p-1 hover:bg-white/20 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Pagination */}
        <div className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Menampilkan 1-10 dari {stats.total} pengguna
          </span>
          <div className="flex items-center gap-2">
            <select className={`px-3 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
              <option>10 per halaman</option>
              <option>25 per halaman</option>
              <option>50 per halaman</option>
            </select>
            <div className="flex items-center gap-1">
              <button className={`w-8 h-8 rounded flex items-center justify-center ${isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                &lt;
              </button>
              <button className="w-8 h-8 rounded flex items-center justify-center bg-purple-500 text-white">1</button>
              <button className={`w-8 h-8 rounded flex items-center justify-center ${isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                2
              </button>
              <button className={`w-8 h-8 rounded flex items-center justify-center ${isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                3
              </button>
              <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>...</span>
              <button className={`w-8 h-8 rounded flex items-center justify-center ${isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                8
              </button>
              <button className={`w-8 h-8 rounded flex items-center justify-center ${isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
