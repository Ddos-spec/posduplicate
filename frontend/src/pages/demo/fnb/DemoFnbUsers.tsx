import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DemoLayout from '../DemoLayout';

// --- DUMMY DATA ---
const DUMMY_USERS = [
  { id: 1, name: 'Budi Santoso', email: 'budi@cafe.com', role: 'Owner', roleId: 2, isActive: true, lastLogin: '2025-12-18T08:00:00' },
  { id: 2, name: 'Siti Aminah', email: 'siti@cafe.com', role: 'Cashier', roleId: 3, isActive: true, lastLogin: '2025-12-18T07:30:00' },
  { id: 3, name: 'Rudi Hartono', email: 'rudi@cafe.com', role: 'Kitchen', roleId: 5, isActive: true, lastLogin: '2025-12-17T14:00:00' },
  { id: 4, name: 'Dewi Lestari', email: 'dewi@cafe.com', role: 'Waiter', roleId: 6, isActive: false, lastLogin: '2025-11-20T10:00:00' },
];

export default function DemoFnbUsers() {
  const [users, setUsers] = useState(DUMMY_USERS);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roleId: 3
  });

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'All' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleAddUser = () => {
    setSelectedUser(null);
    setFormData({ name: '', email: '', roleId: 3 });
    setShowModal(true);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setFormData({ name: user.name, email: user.email, roleId: user.roleId });
    setShowModal(true);
  };

  const handleSaveUser = () => {
    if (!formData.name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
        if (selectedUser) {
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? {
                ...u, 
                name: formData.name, 
                email: formData.email,
                role: getRoleName(formData.roleId),
                roleId: formData.roleId
            } : u));
            toast.success('Simulasi: User updated');
        } else {
            const newUser = {
                id: Date.now(),
                name: formData.name,
                email: formData.email,
                role: getRoleName(formData.roleId),
                roleId: formData.roleId,
                isActive: true,
                lastLogin: new Date().toISOString()
            };
            setUsers(prev => [...prev, newUser]);
            toast.success('Simulasi: User created');
        }
        setIsProcessing(false);
        setShowModal(false);
    }, 800);
  };

  const handleDeleteUser = (userId: number) => {
      if(confirm('Simulasi: Delete user?')) {
          setUsers(prev => prev.filter(u => u.id !== userId));
          toast.success('Simulasi: User deleted');
      }
  };

  const getRoleName = (id: number) => {
      const roles: any = { 2: 'Owner', 3: 'Cashier', 4: 'Manager', 5: 'Kitchen', 6: 'Waiter' };
      return roles[id] || 'Unknown';
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      Owner: 'bg-purple-100 text-purple-800',
      Cashier: 'bg-green-100 text-green-800',
      Kitchen: 'bg-orange-100 text-orange-800',
      Waiter: 'bg-yellow-100 text-yellow-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DemoLayout variant="owner" title="Manajemen Karyawan (Demo)">
      <div className="p-6">
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">User Management</h1>
            <p className="text-gray-600">Manage user accounts and access</p>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100">
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

        {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                <table className="w-full">
                <thead className="bg-gray-50 border-b">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                {user.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{user.name}</div>
                                <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                            {user.role}
                        </span>
                        </td>
                        <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        </td>
                        <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleEditUser(user)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteUser(user.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        )}

        {/* Modal */}
        {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">{selectedUser ? 'Edit User' : 'Add User'}</h3>
                <div className="space-y-4">
                    <input 
                        className="w-full p-2 border rounded" 
                        placeholder="Name" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                    <input 
                        className="w-full p-2 border rounded" 
                        placeholder="Email" 
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                    <select 
                        className="w-full p-2 border rounded"
                        value={formData.roleId}
                        onChange={e => setFormData({...formData, roleId: parseInt(e.target.value)})}
                    >
                        <option value={2}>Owner</option>
                        <option value={3}>Cashier</option>
                        <option value={5}>Kitchen</option>
                        <option value={6}>Waiter</option>
                    </select>
                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setShowModal(false)} className="flex-1 p-2 border rounded">Cancel</button>
                        <button onClick={handleSaveUser} disabled={isProcessing} className="flex-1 p-2 bg-blue-600 text-white rounded">
                            {isProcessing ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
            </div>
        )}
      </div>
    </DemoLayout>
  );
}
