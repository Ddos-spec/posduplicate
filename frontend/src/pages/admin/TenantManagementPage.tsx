import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  Loader2,
  XCircle,
  CheckCircle,
  Monitor,
  Calculator,
  Package,
  Share2,
  Crown,
  WalletCards,
  Users,
  Boxes,
  Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { tenantService } from '../../services/tenantService';
import type { Tenant, CreateTenantData, UpdateTenantData } from '../../services/tenantService';
import useConfirmationStore from '../../store/confirmationStore';
import {
  buildTenantFeatures,
  getEnabledModuleLabels,
  normalizeTenantModules,
} from '../../utils/tenantModules';
import type { TenantModuleKey, TenantModulesState } from '../../utils/tenantModules';

type BusinessTypeOption = 'general' | 'fnb' | 'retail' | 'distributor' | 'produsen';

type TenantFormState = CreateTenantData & {
  subscriptionPlan: string;
  subscriptionStatus: string;
  maxOutlets: number;
  maxUsers: number;
  businessType: BusinessTypeOption;
  billingEmail: string;
  paymentMethod: string;
  modules: TenantModulesState;
};

const defaultModules: TenantModulesState = {
  pos: true,
  accounting: true,
  inventory: true,
  commerSocial: true,
};

const createDefaultFormState = (): TenantFormState => ({
  businessName: '',
  ownerName: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  subscriptionPlan: 'standard',
  subscriptionStatus: 'active',
  maxOutlets: 5,
  maxUsers: 25,
  businessType: 'general',
  billingEmail: '',
  paymentMethod: 'manual',
  modules: { ...defaultModules },
});

const moduleCatalog: Array<{
  key: TenantModuleKey;
  name: string;
  description: string;
  accent: string;
  icon: typeof Monitor;
}> = [
  {
    key: 'pos',
    name: 'MyPOS',
    description: 'Kasir, outlet, transaksi, promosi, dan operasional harian.',
    accent: 'from-emerald-500 to-emerald-600',
    icon: Monitor,
  },
  {
    key: 'accounting',
    name: 'MyAkuntan',
    description: 'GL, jurnal, laporan, budget, AR/AP, dan fondasi akuntansi.',
    accent: 'from-purple-500 to-purple-600',
    icon: Calculator,
  },
  {
    key: 'inventory',
    name: 'MyInventory',
    description: 'Forecast, reorder, gudang, batch, dan pergerakan stok.',
    accent: 'from-orange-500 to-orange-600',
    icon: Package,
  },
  {
    key: 'commerSocial',
    name: 'MyCommerSocial',
    description: 'Marketplace ops, social inbox, planner, analytics, dan Meta Ads.',
    accent: 'from-blue-500 to-blue-600',
    icon: Share2,
  },
];

const planOptions = ['standard', 'growth', 'enterprise'];
const statusOptions = ['active', 'trial', 'expired', 'suspended'];

export default function TenantManagementPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState<TenantFormState>(createDefaultFormState);
  const { showConfirmation } = useConfirmationStore();

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const result = await tenantService.getAll(params);
      setTenants(result.data);
    } catch (error: unknown) {
      console.error('Error fetching tenants:', error);
      let errorMessage = 'Failed to fetch tenants';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleSearch = () => {
    fetchTenants();
  };

  const handleAddTenant = () => {
    setEditingTenant(null);
    setFormData(createDefaultFormState());
    setShowModal(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      businessName: tenant.businessName,
      ownerName: tenant.ownerName,
      email: tenant.email,
      password: '',
      phone: tenant.phone || '',
      address: tenant.address || '',
      subscriptionPlan: tenant.subscriptionPlan || 'standard',
      subscriptionStatus: tenant.subscriptionStatus || 'active',
      maxOutlets: tenant.maxOutlets || 5,
      maxUsers: tenant.maxUsers || 25,
      businessType: (tenant.businessType as BusinessTypeOption) || 'general',
      billingEmail: tenant.billingEmail || tenant.email,
      paymentMethod: tenant.paymentMethod || 'manual',
      modules: normalizeTenantModules(tenant.features),
    });
    setShowModal(true);
  };

  const setModuleEnabled = (key: TenantModuleKey) => {
    setFormData((current) => ({
      ...current,
      modules: {
        ...current.modules,
        [key]: !current.modules[key],
      },
    }));
  };

  const applyModulePreset = (modules: TenantModulesState) => {
    setFormData((current) => ({
      ...current,
      modules,
    }));
  };

  const handleSaveTenant = async () => {
    try {
      if (!formData.businessName || !formData.ownerName || !formData.email) {
        toast.error('Business name, owner name, and email are required');
        return;
      }

      if (!editingTenant && (!formData.password || formData.password.length < 6)) {
        toast.error('Password is required for new tenants and must be at least 6 characters long.');
        return;
      }

      if (!Object.values(formData.modules).some(Boolean)) {
        toast.error('Aktifkan minimal satu modul untuk tenant ini.');
        return;
      }

      if (formData.maxOutlets < 1 || formData.maxUsers < 1) {
        toast.error('Max outlets and max users must be at least 1.');
        return;
      }

      if (editingTenant) {
        const updateData: UpdateTenantData = {
          businessName: formData.businessName,
          ownerName: formData.ownerName,
          phone: formData.phone,
          address: formData.address,
          subscriptionPlan: formData.subscriptionPlan,
          subscriptionStatus: formData.subscriptionStatus,
          maxOutlets: formData.maxOutlets,
          maxUsers: formData.maxUsers,
          businessType: formData.businessType,
          billingEmail: formData.billingEmail || formData.email,
          paymentMethod: formData.paymentMethod,
          features: buildTenantFeatures(formData.modules, editingTenant.features),
        };

        await tenantService.update(editingTenant.id, updateData);
        toast.success('Tenant updated successfully');
      } else {
        const createData: CreateTenantData = {
          businessName: formData.businessName,
          ownerName: formData.ownerName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          address: formData.address,
          subscriptionPlan: formData.subscriptionPlan,
          subscriptionStatus: formData.subscriptionStatus,
          maxOutlets: formData.maxOutlets,
          maxUsers: formData.maxUsers,
          businessType: formData.businessType,
          billingEmail: formData.billingEmail || formData.email,
          paymentMethod: formData.paymentMethod,
          features: buildTenantFeatures(formData.modules),
        };

        await tenantService.create(createData);
        toast.success('Tenant and owner account created successfully');
      }

      setShowModal(false);
      setEditingTenant(null);
      setFormData(createDefaultFormState());
      fetchTenants();
    } catch (error: unknown) {
      console.error('Error saving tenant:', error);
      let errorMessage = 'Failed to save tenant';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    }
  };

  const handleToggleStatus = async (tenant: Tenant) => {
    try {
      const newStatus = !tenant.isActive;
      await tenantService.toggleStatus(tenant.id, newStatus);
      toast.success(`Tenant ${newStatus ? 'activated' : 'deactivated'} successfully`);
      fetchTenants();
    } catch (error: unknown) {
      console.error('Error toggling status:', error);
      let errorMessage = 'Failed to update status';
      if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }
      toast.error(errorMessage);
    }
  };

  const handleDeleteTenant = (tenant: Tenant) => {
    showConfirmation(
      'Delete Tenant',
      `Are you sure you want to delete "${tenant.businessName}"? This action cannot be undone.`,
      async () => {
        try {
          await tenantService.delete(tenant.id);
          toast.success('Tenant deleted successfully');
          fetchTenants();
        } catch (error: unknown) {
          console.error('Error deleting tenant:', error);
          let errorMessage = 'Failed to delete tenant';
          if (axios.isAxiosError(error) && error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
          }
          toast.error(errorMessage);
        }
      }
    );
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) return 'bg-red-100 text-red-800';

    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trial':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-gray-200 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Tenant Management</h1>
          <p className="text-gray-600">
            Super admin sekarang bisa mengatur seluruh suite produk, limit, billing, dan akses modul tenant.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-amber-800 text-sm font-semibold">
          <Crown className="w-4 h-4" />
          Supreme provisioning enabled
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between mb-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span className="text-xs text-gray-400 uppercase">Tenants</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
          <p className="text-sm text-gray-500 mt-1">Tenant aktif di kerajaan MyPOS</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between mb-2">
            <WalletCards className="w-5 h-5 text-emerald-600" />
            <span className="text-xs text-gray-400 uppercase">Subscriptions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{tenants.filter((tenant) => tenant.subscriptionStatus === 'active').length}</p>
          <p className="text-sm text-gray-500 mt-1">Tenant dengan subscription aktif</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between mb-2">
            <Boxes className="w-5 h-5 text-orange-600" />
            <span className="text-xs text-gray-400 uppercase">Module Reach</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {tenants.reduce((total, tenant) => total + getEnabledModuleLabels(tenant.features).length, 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Total modul aktif lintas seluruh tenant</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span className="text-xs text-gray-400 uppercase">Capacity</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {tenants.reduce((total, tenant) => total + (tenant.maxUsers || 0), 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Akumulasi slot user yang diprovisikan</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by business name, owner, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
            <option value="suspended">Suspended</option>
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

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modules</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan & Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Limits</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No tenants found
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => {
                const enabledModules = getEnabledModuleLabels(tenant.features);

                return (
                  <tr key={tenant.id} className="hover:bg-gray-50 align-top">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <Building2 className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{tenant.businessName}</p>
                          <p className="text-xs text-gray-500 mt-1">{tenant.ownerName}</p>
                          <p className="text-xs text-gray-400 mt-1">Business type: {tenant.businessType || 'general'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {enabledModules.length ? (
                          enabledModules.map((label) => (
                            <span key={label} className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              {label}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">No modules enabled</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-900 uppercase">{tenant.subscriptionPlan || 'standard'}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(tenant.subscriptionStatus, tenant.isActive)}`}>
                          {tenant.isActive ? tenant.subscriptionStatus : 'inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{tenant.email}</p>
                      <p className="text-xs text-gray-500 mt-1">{tenant.phone || '-'}</p>
                      <p className="text-xs text-gray-400 mt-2">{tenant.billingEmail || tenant.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm text-gray-700">
                        <p>{tenant.maxOutlets || 0} outlets</p>
                        <p>{tenant.maxUsers || 0} users</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {tenant.subscriptionExpiresAt
                        ? new Date(tenant.subscriptionExpiresAt).toLocaleDateString('id-ID')
                        : 'N/A'}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingTenant ? 'Edit Tenant Provisioning' : 'Add New Tenant'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Super admin bisa mengatur identitas tenant, plan, kapasitas, dan modul yang dijual dari satu panel.
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              <div className="grid xl:grid-cols-[1.2fr,1fr] gap-8">
                <div className="space-y-6">
                  <section className="rounded-2xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-4">Tenant Identity</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
                        <input
                          type="text"
                          value={formData.businessName}
                          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Kebuli Utsman"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Owner Name *</label>
                        <input
                          type="text"
                          value={formData.ownerName}
                          onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Ahmad Utsman"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          disabled={!!editingTenant}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                          placeholder="owner@business.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
                        <select
                          value={formData.businessType}
                          onChange={(e) => setFormData({ ...formData, businessType: e.target.value as BusinessTypeOption })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="general">General</option>
                          <option value="fnb">FNB</option>
                          <option value="retail">Retail</option>
                          <option value="distributor">Distributor</option>
                          <option value="produsen">Produsen</option>
                        </select>
                      </div>
                    </div>

                    {!editingTenant && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Owner Password *</label>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Set an initial password for the owner"
                        />
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4 mt-4">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Billing Email</label>
                        <input
                          type="email"
                          value={formData.billingEmail}
                          onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="billing@business.com"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Business address"
                      />
                    </div>
                  </section>

                  <section className="rounded-2xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-4">Billing & Capacity</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Plan</label>
                        <select
                          value={formData.subscriptionPlan}
                          onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {planOptions.map((plan) => (
                            <option key={plan} value={plan}>
                              {plan.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Status</label>
                        <select
                          value={formData.subscriptionStatus}
                          onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Outlets</label>
                        <input
                          type="number"
                          min={1}
                          value={formData.maxOutlets}
                          onChange={(e) => setFormData({ ...formData, maxOutlets: Number(e.target.value) || 1 })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Users</label>
                        <input
                          type="number"
                          min={1}
                          value={formData.maxUsers}
                          onChange={(e) => setFormData({ ...formData, maxUsers: Number(e.target.value) || 1 })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                        <select
                          value={formData.paymentMethod}
                          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="manual">Manual</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="virtual_account">Virtual Account</option>
                          <option value="cash">Cash</option>
                        </select>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">Module Provisioning</h3>
                        <p className="text-sm text-gray-500 mt-1">Tidak ada lagi tenant yang lahir cuma dengan dua modul.</p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold">
                        <Crown className="w-3.5 h-3.5" />
                        Super Admin Suite
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => applyModulePreset({ pos: true, accounting: true, inventory: true, commerSocial: true })}
                        className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium"
                      >
                        Full Suite
                      </button>
                      <button
                        type="button"
                        onClick={() => applyModulePreset({ pos: true, accounting: true, inventory: true, commerSocial: false })}
                        className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
                      >
                        Core Ops
                      </button>
                      <button
                        type="button"
                        onClick={() => applyModulePreset({ pos: true, accounting: false, inventory: true, commerSocial: true })}
                        className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
                      >
                        Commerce Stack
                      </button>
                    </div>

                    <div className="space-y-3">
                      {moduleCatalog.map((module) => (
                        <button
                          key={module.key}
                          type="button"
                          onClick={() => setModuleEnabled(module.key)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            formData.modules[module.key]
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${module.accent} flex items-center justify-center text-white shadow-sm`}>
                                <module.icon className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{module.name}</p>
                                <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                              </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                              formData.modules[module.key]
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-gray-300 bg-white'
                            }`}>
                              {formData.modules[module.key] ? <CheckCircle className="w-4 h-4" /> : null}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-gray-200 p-5 bg-slate-50">
                    <h3 className="font-semibold text-gray-900 mb-4">Provisioning Summary</h3>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{formData.billingEmail || formData.email || 'Billing email akan mengikuti email owner'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <WalletCards className="w-4 h-4 text-gray-400" />
                        <span>{formData.subscriptionPlan.toUpperCase()} • {formData.subscriptionStatus.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{formData.maxUsers} user seats • {formData.maxOutlets} outlet capacity</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      {getEnabledModuleLabels(buildTenantFeatures(formData.modules)).map((label) => (
                        <span key={label} className="px-2.5 py-1 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200">
                          {label}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTenant}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
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
