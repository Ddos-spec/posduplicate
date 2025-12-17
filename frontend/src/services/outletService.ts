import api from './api';

export interface Outlet {
  id: number;
  tenantId?: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  npwp?: string;
  settings?: OutletSettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tenants?: {
    id: number;
    businessName: string;
    email: string;
  };
  _count?: {
    users: number;
    items: number;
    transactions: number;
  };
}

export interface OutletSettings {
  [key: string]: any; // Placeholder, replace with actual properties if known
}

// Map snake_case API response to camelCase
const mapOutlet = (data: any): Outlet => ({
  id: data.id,
  tenantId: data.tenant_id || data.tenantId,
  name: data.name,
  address: data.address,
  phone: data.phone,
  email: data.email,
  npwp: data.npwp,
  settings: data.settings,
  isActive: data.is_active ?? data.isActive,
  createdAt: data.created_at || data.createdAt,
  updatedAt: data.updated_at || data.updatedAt,
  tenants: data.tenants,
  _count: data._count,
});

export interface CreateOutletData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  npwp?: string;
}

export interface UpdateOutletData {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  npwp?: string;
  isActive?: boolean;
  settings?: OutletSettings;
}

export const outletService = {
  async getAll(params?: { is_active?: boolean }) {
    const response = await api.get<{ success: boolean; data: any[]; count: number }>('/outlets', { params });
    return {
      ...response.data,
      data: response.data.data.map(mapOutlet),
    };
  },

  async getById(id: number) {
    const response = await api.get<{ success: boolean; data: any }>(`/outlets/${id}`);
    return mapOutlet(response.data.data);
  },

  async create(data: CreateOutletData) {
    const response = await api.post<{ success: boolean; data: any; message: string }>('/outlets', data);
    return {
      ...response.data,
      data: mapOutlet(response.data.data),
    };
  },

  async update(id: number, data: UpdateOutletData) {
    const response = await api.put<{ success: boolean; data: any; message: string }>(`/outlets/${id}`, data);
    return {
      ...response.data,
      data: mapOutlet(response.data.data),
    };
  },

  async delete(id: number) {
    const response = await api.delete<{ success: boolean; message: string }>(`/outlets/${id}`);
    return response.data;
  },

  async toggleStatus(id: number, isActive: boolean) {
    const response = await api.put<{ success: boolean; data: any; message: string }>(`/outlets/${id}/toggle-status`, { isActive });
    return {
      ...response.data,
      data: mapOutlet(response.data.data),
    };
  },
};
