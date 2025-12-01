import api from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  outletId?: number;
  tenantId?: number;
  roles?: {
    id: number;
    name: string;
  };
  lastLogin?: string;
  createdAt: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  roleId: number;
  outletId?: number;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  roleId?: number;
  outletId?: number;
  isActive?: boolean;
  password?: string;
}

export const userService = {
  async getAll(params?: { outlet_id?: number }) {
    const response = await api.get<{ success: boolean; data: User[] }>('/users', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<{ success: boolean; data: User }>(`/users/${id}`);
    return response.data.data;
  },

  async create(data: CreateUserData) {
    const response = await api.post<{ success: boolean; data: User; message: string }>('/users', data);
    return response.data;
  },

  async update(id: number, data: UpdateUserData) {
    const response = await api.put<{ success: boolean; data: User; message: string }>(`/users/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await api.delete<{ success: boolean; message: string }>(`/users/${id}`);
    return response.data;
  },

  async resetPassword(id: number, newPassword: string) {
    const response = await api.post<{ success: boolean; message: string }>(`/users/${id}/reset-password`, { newPassword });
    return response.data;
  },
};
