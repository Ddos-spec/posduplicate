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

export interface CreateTenantData {
  businessName: string;
  ownerName: string;
  email: string;
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
    const response = await api.get<{ success: boolean; data: Tenant[]; count: number }>('/tenants', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<{ success: boolean; data: Tenant }>(`/tenants/${id}`);
    return response.data.data;
  },

  async create(data: CreateTenantData) {
    const response = await api.post<{ success: boolean; data: Tenant; message: string }>('/tenants', data);
    return response.data;
  },

  async update(id: number, data: UpdateTenantData) {
    const response = await api.put<{ success: boolean; data: Tenant; message: string }>(`/tenants/${id}`, data);
    return response.data;
  },

  async toggleStatus(id: number, isActive: boolean) {
    const response = await api.put<{ success: boolean; data: Tenant; message: string }>(`/tenants/${id}/toggle-status`, { isActive });
    return response.data;
  },

  async updateSubscription(id: number, data: { plan?: string; status?: string; expiresAt?: string }) {
    const response = await api.put<{ success: boolean; data: Tenant; message: string }>(`/tenants/${id}/subscription`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await api.delete<{ success: boolean; message: string }>(`/tenants/${id}`);
    return response.data;
  },
};
