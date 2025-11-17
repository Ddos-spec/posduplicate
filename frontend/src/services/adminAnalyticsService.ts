import api from './api';

export interface TenantGrowthData {
  month: string;
  tenants: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
}

export interface TenantStatusData {
  name: string;
  value: number;
  color: string;
}

export interface TopTenant {
  rank: number;
  name: string;
  transactions: number;
  revenue: number;
}

export interface SystemSummary {
  totalTenants: number;
  activeTenants: number;
  totalTransactions: number;
  totalRevenue: number;
}

export const adminAnalyticsService = {
  async getTenantGrowth(months = 12) {
    const response = await api.get<{ success: boolean; data: TenantGrowthData[] }>('/admin/analytics/tenant-growth', {
      params: { months }
    });
    return response.data;
  },

  async getRevenue(months = 12) {
    const response = await api.get<{ success: boolean; data: RevenueData[] }>('/admin/analytics/revenue', {
      params: { months }
    });
    return response.data;
  },

  async getTenantStatus() {
    const response = await api.get<{ success: boolean; data: TenantStatusData[] }>('/admin/analytics/tenant-status');
    return response.data;
  },

  async getTopTenants(limit = 10) {
    const response = await api.get<{ success: boolean; data: TopTenant[] }>('/admin/analytics/top-tenants', {
      params: { limit }
    });
    return response.data;
  },

  async getSummary() {
    const response = await api.get<{ success: boolean; data: SystemSummary }>('/admin/analytics/summary');
    return response.data;
  }
};
