import api from './api';

export interface Outlet {
  id: number;
  tenantId?: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  npwp?: string;
  settings?: any;
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
  settings?: any;
}

export const outletService = {
  async getAll(params?: { is_active?: boolean }) {
    const response = await api.get<{ success: boolean; data: Outlet[]; count: number }>('/outlets', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<{ success: boolean; data: Outlet }>(`/outlets/${id}`);
    return response.data.data;
  },

  async create(data: CreateOutletData) {
    const response = await api.post<{ success: boolean; data: Outlet; message: string }>('/outlets', data);
    return response.data;
  },

  async update(id: number, data: UpdateOutletData) {
    const response = await api.put<{ success: boolean; data: Outlet; message: string }>(`/outlets/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await api.delete<{ success: boolean; message: string }>(`/outlets/${id}`);
    return response.data;
  },

  async toggleStatus(id: number, isActive: boolean) {
    const response = await api.put<{ success: boolean; data: Outlet; message: string }>(`/outlets/${id}/toggle-status`, { isActive });
    return response.data;
  },
};
