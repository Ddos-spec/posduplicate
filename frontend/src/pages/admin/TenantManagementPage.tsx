import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Building2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Tenant {
  id: number;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  businessType: string;
  plan: string;
  status: 'Active' | 'Inactive' | 'Trial';
  maxOutlets: number;
  maxUsers: number;
  createdAt: string;
}

const mockTenants: Tenant[] = [
  {
    id: 1,
    businessName: 'Kebuli Utsman',
    ownerName: 'Ahmad Utsman',
    email: 'owner@kebuliutsman.com',
    phone: '0812-3456-7890',
    businessType: 'Restaurant',
    plan: 'Pro',
    status: 'Active',
    maxOutlets: 5,
    maxUsers: 20,
    createdAt: '2025-01-15'
  },
  {
    id: 2,
    businessName: 'Warung Sate Pak Eko',
    ownerName: 'Eko Prasetyo',
    email: 'eko@sate.com',
    phone: '0813-4567-8901',
    businessType: 'Restaurant',
    plan: 'Basic',
    status: 'Active',
    maxOutlets: 1,
    maxUsers: 5,
    createdAt: '2025-02-01'
  },
  {
    id: 3,
    businessName: 'Cafe Kopi Nikmat',
    ownerName: 'Siti Rahayu',
    email: 'siti@kopinikmat.com',
    phone: '0814-5678-9012',
    businessType: 'Cafe',
    plan: 'Pro',
    status: 'Active',
    maxOutlets: 3,
    maxUsers: 15,
    createdAt: '2025-02-10'
  },
  {
    id: 4,
    businessName: 'Toko Elektronik Jaya',
    ownerName: 'Budi Santoso',
    email: 'budi@elektronikjaya.com',
    phone: '0815-6789-0123',
    businessType: 'Retail',
    plan: 'Enterprise',
    status: 'Active',
    maxOutlets: 10,
    maxUsers: 50,
    createdAt: '2025-01-20'
  },
  {
    id: 5,
    businessName: 'Bakery Roti Enak',
    ownerName: 'Maria',
    email: 'maria@rotienak.com',
    phone: '0816-7890-1234',
    businessType: 'Bakery',
    plan: 'Basic',
    status: 'Trial',
    maxOutlets: 1,
    maxUsers: 5,
    createdAt: '2025-11-01'
  },
  {
    id: 6,
    businessName: 'Minimarket Sinar Jaya',
    ownerName: 'Hendra',
    email: 'hendra@sinarjaya.com',
    phone: '0817-8901-2345',
    businessType: 'Retail',
    plan: 'Pro',
    status: 'Active',
    maxOutlets: 5,
    maxUsers: 25,
    createdAt: '2025-03-05'
  },
  {
    id: 7,
    businessName: 'Laundry Express',
    ownerName: 'Dewi',
    email: 'dewi@laundryexpress.com',
    phone: '0818-9012-3456',
    businessType: 'Service',
    plan: 'Basic',
    status: 'Inactive',
    maxOutlets: 1,
    maxUsers: 3,
    createdAt: '2025-01-10'
  },
  {
    id: 8,
    businessName: 'Barbershop Maju Jaya',
    ownerName: 'Rizki',
    email: 'rizki@barbershop.com',
    phone: '0819-0123-4567',
    businessType: 'Service',
    plan: 'Pro',
    status: 'Active',
    maxOutlets: 3,
    maxUsers: 10,
    createdAt: '2025-02-15'
  },
  {
    id: 9,
    businessName: 'Warung Makan Sederhana',
    ownerName: 'Ibu Tini',
    email: 'tini@warungmakan.com',
    phone: '0820-1234-5678',
    businessType: 'Restaurant',
    plan: 'Basic',
    status: 'Active',
    maxOutlets: 1,
    maxUsers: 5,
    createdAt: '2025-03-01'
  },
  {
    id: 10,
    businessName: 'Pet Shop Hewan Lucu',
    ownerName: 'Andi',
    email: 'andi@petshop.com',
    phone: '0821-2345-6789',
    businessType: 'Retail',
    plan: 'Pro',
    status: 'Trial',
    maxOutlets: 2,
    maxUsers: 8,
    createdAt: '2025-11-10'
  }
];

export default function TenantManagementPage() {
  const [tenants] = useState<Tenant[]>(mockTenants);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPlan, setFilterPlan] = useState<string>('All');
  const [showModal, setShowModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Filter tenants
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch =
      tenant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || tenant.status === filterStatus;
    const matchesPlan = filterPlan === 'All' || tenant.plan === filterPlan;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const handleAddTenant = () => {
    setSelectedTenant(null);
    setShowModal(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowModal(true);
  };

  const handleSaveTenant = () => {
    toast.success('Tenant saved successfully! (Mock)');
    setShowModal(false);
  };

  const handleDeleteTenant = (tenant: Tenant) => {
    if (confirm(`Delete tenant "${tenant.businessName}"?`)) {
      toast.success('Tenant deleted! (Mock)');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      Active: 'bg-green-100 text-green-800',
      Inactive: 'bg-red-100 text-red-800',
      Trial: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPlanBadge = (plan: string) => {
    const colors = {
      Basic: 'bg-blue-100 text-blue-800',
      Pro: 'bg-purple-100 text-purple-800',
      Enterprise: 'bg-orange-100 text-orange-800'
    };
    return colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tenant Management</h1>
        <p className="text-gray-600">Manage all business tenants and their subscriptions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tenants</p>
              <p className="text-2xl font-bold text-gray-800">{tenants.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {tenants.filter(t => t.status === 'Active').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Trial</p>
              <p className="text-2xl font-bold text-yellow-600">
                {tenants.filter(t => t.status === 'Trial').length}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-red-600">
                {tenants.filter(t => t.status === 'Inactive').length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Trial">Trial</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Plans</option>
            <option value="Basic">Basic</option>
            <option value="Pro">Pro</option>
            <option value="Enterprise">Enterprise</option>
          </select>
          <button
            onClick={handleAddTenant}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Tenant
          </button>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{tenant.businessName}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{tenant.ownerName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>{tenant.email}</div>
                    <div className="text-xs text-gray-500">{tenant.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{tenant.businessType}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanBadge(tenant.plan)}`}>
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(tenant.status)}`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{tenant.createdAt}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toast.info('View details (Mock)')}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditTenant(tenant)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTenant(tenant)}
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
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {selectedTenant ? 'Edit Tenant' : 'Add New Tenant'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                  <input
                    type="text"
                    defaultValue={selectedTenant?.businessName}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Kebuli Utsman"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner Name</label>
                  <input
                    type="text"
                    defaultValue={selectedTenant?.ownerName}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Ahmad Utsman"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue={selectedTenant?.email}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="owner@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    defaultValue={selectedTenant?.phone}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0812-xxxx-xxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
                  <select
                    defaultValue={selectedTenant?.businessType}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Restaurant">Restaurant</option>
                    <option value="Cafe">Cafe</option>
                    <option value="Retail">Retail</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Service">Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Plan</label>
                  <select
                    defaultValue={selectedTenant?.plan}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Basic">Basic</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Outlets</label>
                  <input
                    type="number"
                    defaultValue={selectedTenant?.maxOutlets}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Users</label>
                  <input
                    type="number"
                    defaultValue={selectedTenant?.maxUsers}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
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
                  onClick={handleSaveTenant}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Tenant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
