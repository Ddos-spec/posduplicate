import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Key, User, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  outlet: string;
  lastLogin: string;
  status: 'Active' | 'Inactive';
}

const mockUsers: User[] = [
  { id: 1, name: 'Owner', email: 'owner@kebuliutsman.com', role: 'Owner', outlet: 'All', lastLogin: '2025-11-14 10:30', status: 'Active' },
  { id: 2, name: 'Kasir 1', email: 'kasir1@kebuli.com', role: 'Cashier', outlet: 'Main Store', lastLogin: '2025-11-14 09:15', status: 'Active' },
  { id: 3, name: 'Kasir 2', email: 'kasir2@kebuli.com', role: 'Cashier', outlet: 'Main Store', lastLogin: '2025-11-13 18:45', status: 'Active' },
  { id: 4, name: 'Manager 1', email: 'manager1@kebuli.com', role: 'Manager', outlet: 'Branch Kemang', lastLogin: '2025-11-14 08:30', status: 'Active' },
  { id: 5, name: 'Kitchen 1', email: 'kitchen1@kebuli.com', role: 'Kitchen', outlet: 'Main Store', lastLogin: '2025-11-14 07:00', status: 'Active' },
  { id: 6, name: 'Kasir 3', email: 'kasir3@kebuli.com', role: 'Cashier', outlet: 'Branch Kemang', lastLogin: '2025-11-13 20:15', status: 'Active' },
  { id: 7, name: 'Kitchen 2', email: 'kitchen2@kebuli.com', role: 'Kitchen', outlet: 'Branch Kemang', lastLogin: '2025-11-14 06:45', status: 'Active' },
  { id: 8, name: 'Waiter 1', email: 'waiter1@kebuli.com', role: 'Waiter', outlet: 'Main Store', lastLogin: '2025-11-13 19:30', status: 'Active' },
  { id: 9, name: 'Waiter 2', email: 'waiter2@kebuli.com', role: 'Waiter', outlet: 'Branch Kemang', lastLogin: '2025-11-14 09:00', status: 'Active' },
  { id: 10, name: 'Admin', email: 'admin@kebuli.com', role: 'Admin', outlet: 'All', lastLogin: '2025-11-12 15:20', status: 'Active' },
  { id: 11, name: 'Kasir Lama', email: 'kasir_old@kebuli.com', role: 'Cashier', outlet: 'Main Store', lastLogin: '2025-10-01 12:00', status: 'Inactive' }
];

export default function UserManagementPage() {
  const [users] = useState<User[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'All' || user.role === filterRole;
    const matchesStatus = filterStatus === 'All' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleAddUser = () => {
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleSaveUser = () => {
    toast.success('User saved successfully! (Mock)');
    setShowModal(false);
  };

  const handleResetPassword = () => {
    toast.success('Password reset successfully! (Mock)');
    setShowResetModal(false);
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      Owner: 'bg-red-100 text-red-800',
      Admin: 'bg-purple-100 text-purple-800',
      Manager: 'bg-blue-100 text-blue-800',
      Cashier: 'bg-green-100 text-green-800',
      Kitchen: 'bg-orange-100 text-orange-800',
      Waiter: 'bg-yellow-100 text-yellow-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">User Management</h1>
        <p className="text-gray-600">Manage user accounts and access</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-2xl font-bold text-gray-800">{users.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter(u => u.status === 'Active').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Inactive</p>
          <p className="text-2xl font-bold text-red-600">
            {users.filter(u => u.status === 'Inactive').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Roles</p>
          <p className="text-2xl font-bold text-purple-600">
            {new Set(users.map(u => u.role)).size}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Roles</option>
            <option value="Owner">Owner</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Cashier">Cashier</option>
            <option value="Kitchen">Kitchen</option>
          </select>
          <button
            onClick={handleAddUser}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outlet</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-900">{user.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {user.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">{user.outlet}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.lastLogin}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowResetModal(true);
                      }}
                      className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                      title="Reset Password"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete user "${user.name}"?`)) {
                          toast.success('User deleted! (Mock)');
                        }
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {selectedUser ? 'Edit User' : 'Create New User'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    defaultValue={selectedUser?.name}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue={selectedUser?.email}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {!selectedUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••••"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    defaultValue={selectedUser?.role}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Manager">Manager</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Waiter">Waiter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Outlet</label>
                  <select
                    defaultValue={selectedUser?.outlet}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Main Store">Main Store</option>
                    <option value="Branch Kemang">Branch Kemang</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Reset Password</h2>
              <p className="text-gray-600 mb-4">
                Reset password for: <strong>{selectedUser?.name}</strong>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  onClick={() => {
                    const randomPassword = Math.random().toString(36).slice(-8);
                    toast.success(`Random password generated: ${randomPassword}`);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Generate Random Password
                </button>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
