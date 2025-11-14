import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Building2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { tenantService, Tenant, CreateTenantData, UpdateTenantData } from '../../services/tenantService';

export default function TenantManagementPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState<CreateTenantData>({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: ''
  });

  // Fetch tenants
  const fetchTenants = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (planFilter !== 'all') params.plan = planFilter;
      if (searchTerm) params.search = searchTerm;

      const result = await tenantService.getAll(params);
      setTenants(result.data);
    } catch (error: any) {
      console.error('Error fetching tenants:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [statusFilter, planFilter]);

  const handleSearch = () => {
    fetchTenants();
  };

  const handleAddTenant = () => {
    setEditingTenant(null);
    setFormData({
      businessName: '',
      ownerName: '',
      email: '',
      phone: '',
      address: ''
    });
    setShowModal(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      businessName: tenant.businessName,
      ownerName: tenant.ownerName,
      email: tenant.email,
      phone: tenant.phone || '',
      address: tenant.address || ''
    });
    setShowModal(true);
  };

  const handleSaveTenant = async () => {
    try {
      if (!formData.businessName || !formData.ownerName || !formData.email) {
        toast.error('Business name, owner name, and email are required');
        return;
      }

      if (editingTenant) {
        // Update existing tenant
        const updateData: UpdateTenantData = {
          businessName: formData.businessName,
          ownerName: formData.ownerName,
          phone: formData.phone,
          address: formData.address
        };
        await tenantService.update(editingTenant.id, updateData);
        toast.success('Tenant updated successfully');
      } else {
        // Create new tenant
        await tenantService.create(formData);
        toast.success('Tenant created successfully');
      }

      setShowModal(false);
      fetchTenants();
    } catch (error: any) {
      console.error('Error saving tenant:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to save tenant');
    }
  };

  const handleToggleStatus = async (tenant: Tenant) => {
    try {
      const newStatus = !tenant.isActive;
      await tenantService.toggleStatus(tenant.id, newStatus);
      toast.success(`Tenant ${newStatus ? 'activated' : 'deactivated'} successfully`);
      fetchTenants();
    } catch (error: any) {
      console.error('Error toggling status:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update status');
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!confirm(`Delete tenant "${tenant.businessName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await tenantService.delete(tenant.id);
      toast.success('Tenant deleted successfully');
      fetchTenants();
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to delete tenant');
    }
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return 'bg-red-100 text-red-800';
    }

    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trial':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTenants = tenants;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading tenants...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tenant Management</h1>
        <p className="text-gray-600">Manage all tenants and their subscriptions</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by business name, owner, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="expired">Expired</option>
          </select>
          <button
            onClick={handleAddTenant}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Tenant
          </button>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No tenants found
                </td>
              </tr>
            ) : (
              filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tenant.businessName}</p>
                        <p className="text-xs text-gray-500">{tenant.maxOutlets} outlets max</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{tenant.ownerName}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{tenant.email}</p>
                    <p className="text-xs text-gray-500">{tenant.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {tenant.subscriptionPlan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(tenant.subscriptionStatus, tenant.isActive)}`}>
                      {tenant.isActive ? tenant.subscriptionStatus : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(tenant.createdAt).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditTenant(tenant)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(tenant)}
                        className={`p-1 rounded ${tenant.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                        title={tenant.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {tenant.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Kebuli Utsman"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Owner Name *
                    </label>
                    <input
                      type="text"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Ahmad Utsman"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!editingTenant}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="owner@business.com"
                  />
                  {editingTenant && (
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0812-xxxx-xxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Business address"
                    />
                  </div>
                </div>

                {!editingTenant && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> New tenants will automatically get:
                    </p>
                    <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
                      <li>Pro Plan (Rp 500,000/month)</li>
                      <li>Active status</li>
                      <li>5 outlets max</li>
                      <li>20 users max</li>
                      <li>First billing in 1 month</li>
                    </ul>
                  </div>
                )}
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
                  {editingTenant ? 'Update' : 'Create'} Tenant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
