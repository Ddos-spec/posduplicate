import api from './api';

export interface Tenant {
  id: number;
  businessName: string;
  ownerName: string;
  email: string;
  phone?: string;
  address?: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionStartsAt?: string;
  subscriptionExpiresAt?: string;
  nextBillingDate?: string;
  maxOutlets?: number;
  maxUsers?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    outlets: number;
    users: number;
  };
}

// Map snake_case API response to camelCase
const mapTenant = (data: any): Tenant => ({
  id: data.id,
  businessName: data.business_name || data.businessName,
  ownerName: data.owner_name || data.ownerName,
  email: data.email,
  phone: data.phone,
  address: data.address,
  subscriptionPlan: data.subscription_plan || data.subscriptionPlan,
  subscriptionStatus: data.subscription_status || data.subscriptionStatus,
  subscriptionStartsAt: data.subscription_starts_at || data.subscriptionStartsAt,
  subscriptionExpiresAt: data.subscription_expires_at || data.subscriptionExpiresAt,
  nextBillingDate: data.next_billing_date || data.nextBillingDate,
  maxOutlets: data.max_outlets || data.maxOutlets,
  maxUsers: data.max_users || data.maxUsers,
  isActive: data.is_active ?? data.isActive,
  createdAt: data.created_at || data.createdAt,
  updatedAt: data.updated_at || data.updatedAt,
  _count: data._count,
});

export interface CreateTenantData {
  businessName: string;
  ownerName: string;
  email: string;
  password?: string;
  phone?: string;
  address?: string;
}

export interface UpdateTenantData {
  businessName?: string;
  ownerName?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
}

export const tenantService = {
  async getAll(params?: { status?: string; plan?: string; search?: string }) {
    const response = await api.get<{ success: boolean; data: any[]; count: number }>('/tenants', { params });
    return {
      ...response.data,
      data: response.data.data.map(mapTenant),
    };
  },

  // Alias for backward compatibility
  async getAllTenants(params?: { status?: string; plan?: string; search?: string }) {
    return this.getAll(params);
  },

  async getById(id: number) {
    const response = await api.get<{ success: boolean; data: any }>(`/tenants/${id}`);
    return mapTenant(response.data.data);
  },

  async create(data: CreateTenantData) {
    const response = await api.post<{ success: boolean; data: any; message: string }>('/tenants', data);
    return {
      ...response.data,
      data: mapTenant(response.data.data),
    };
  },

  async update(id: number, data: UpdateTenantData) {
    const response = await api.put<{ success: boolean; data: any; message: string }>(`/tenants/${id}`, data);
    return {
      ...response.data,
      data: mapTenant(response.data.data),
    };
  },

  async toggleStatus(id: number, isActive: boolean) {
    const response = await api.patch<{ success: boolean; data: any; message: string }>(`/tenants/${id}/status`, { isActive });
    return {
      ...response.data,
      data: mapTenant(response.data.data),
    };
  },

  async updateSubscription(id: number, data: { plan?: string; status?: string; expiresAt?: string }) {
    const response = await api.patch<{ success: boolean; data: any; message: string }>(`/tenants/${id}/subscription`, data);
    return {
      ...response.data,
      data: mapTenant(response.data.data),
    };
  },

  async delete(id: number) {
    const response = await api.delete<{ success: boolean; message: string }>(`/tenants/${id}`);
    return response.data;
  },
};
