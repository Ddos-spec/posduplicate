import api from './api';

export interface DashboardSummary {
  totalSales: number;
  totalTransactions: number;
  totalProducts: number;
  totalCustomers: number;
  averageTransaction: number;
}

export interface SalesTrendData {
  date: string;
  sales: number;
}

export interface TopProduct {
  id: number;
  name: string;
  price: number;
  stock: number;
}

export interface CategorySales {
  name: string;
  count: number;
  value: number;
}

export interface RecentTransaction {
  id: number;
  transactionNumber: string;
  total: number;
  status: string;
  createdAt: string;
}

export const dashboardService = {
  async getSummary(params?: { outletId?: number; startDate?: string; endDate?: string }) {
    const response = await api.get<{ success: boolean; data: DashboardSummary }>('/dashboard/summary', { params });
    return response.data.data;
  },

  async getSalesTrend(params?: { days?: number; outletId?: number }) {
    const response = await api.get<{ success: boolean; data: SalesTrendData[] }>('/dashboard/sales-trend', { params });
    return response.data.data;
  },

  async getTopProducts(params?: { limit?: number }) {
    const response = await api.get<{ success: boolean; data: TopProduct[] }>('/dashboard/top-products', { params });
    return response.data.data;
  },

  async getSalesByCategory() {
    const response = await api.get<{ success: boolean; data: CategorySales[] }>('/dashboard/sales-by-category');
    return response.data.data;
  },

  async getRecentTransactions(params?: { limit?: number }) {
    const response = await api.get<{ success: boolean; data: RecentTransaction[] }>('/dashboard/recent-transactions', { params });
    return response.data.data;
  },
};
