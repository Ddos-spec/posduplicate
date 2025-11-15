import api from './api';

export interface Employee {
  id: number;
  user_id: number;
  outlet_id: number;
  employee_code?: string;
  pin_code?: string;
  position?: string;
  salary?: number;
  is_active: boolean;
  hired_at?: string;
  created_at: string;
  users?: {
    id: number;
    name: string;
    email: string;
    roles?: {
      id: number;
      name: string;
    };
  };
  outlets?: {
    id: number;
    name: string;
  };
}

export interface CreateEmployeeData {
  user_id: number;
  outlet_id: number;
  employee_code?: string;
  pin_code?: string;
  position?: string;
  salary?: number;
  hired_at?: string;
}

export interface UpdateEmployeeData {
  employee_code?: string;
  pin_code?: string;
  position?: string;
  salary?: number;
  is_active?: boolean;
  hired_at?: string;
}

export const employeeService = {
  async getAll(params?: { outlet_id?: number; is_active?: boolean }) {
    const response = await api.get<{ success: boolean; data: Employee[]; count: number }>('/employees', { params });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get<{ success: boolean; data: Employee }>(`/employees/${id}`);
    return response.data.data;
  },

  async create(data: CreateEmployeeData) {
    const response = await api.post<{ success: boolean; data: Employee; message: string }>('/employees', data);
    return response.data;
  },

  async update(id: number, data: UpdateEmployeeData) {
    const response = await api.put<{ success: boolean; data: Employee; message: string }>(`/employees/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await api.delete<{ success: boolean; message: string }>(`/employees/${id}`);
    return response.data;
  },
};
