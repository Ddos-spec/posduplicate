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
  qty: number;        // Quantity sold
  revenue: number;    // Total revenue from sales
}

export interface CategorySales {
  name: string;
  count: number;
  value: number;
  [key: string]: string | number;
}

export interface RecentTransaction {
  id: number;
  transactionNumber: string;
  total: number;
  status: string;
  createdAt: string;
}

// Map snake_case API response to camelCase
const mapRecentTransaction = (data: any): RecentTransaction => ({
  id: data.id,
  transactionNumber: data.transaction_number || data.transactionNumber,
  total: data.total,
  status: data.status,
  createdAt: data.created_at || data.createdAt,
});

export interface CashierPerformance {
  cashierId: number;
  cashierName: string;
  totalTransactions: number;
  totalSales: number;
  avgTransactionValue: number;
}

export const dashboardService = {
  async getSummary(params?: { outletId?: number; startDate?: string; endDate?: string }) {
    const response = await api.get<{ success: boolean; data: DashboardSummary }>('/dashboard/summary', { params });
    return response.data.data;
  },

  async getSalesTrend(params?: { days?: number; outletId?: number; startDate?: string; endDate?: string }) {
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
    const response = await api.get<{ success: boolean; data: any[] }>('/dashboard/recent-transactions', { params });
    return response.data.data.map(mapRecentTransaction);
  },

  async getCashierPerformance(params?: { days?: number }) {
    const response = await api.get<{ success: boolean; data: CashierPerformance[] }>('/dashboard/cashier-performance', { params });
    return response.data.data;
  },

  // New Report Endpoints
  async getFinancialReport(params?: { outlet_id?: number; start_date?: string; end_date?: string }) {
    const response = await api.get('/reports/financials', { params });
    return response.data.data;
  },

  async getOperationalReport(params?: { outlet_id?: number; start_date?: string; end_date?: string }) {
    const response = await api.get('/reports/operations', { params });
    return response.data.data;
  },

  async getInventoryValue(params?: { outlet_id?: number }) {
    const response = await api.get('/reports/inventory-value', { params });
    return response.data.data;
  },

  async getCustomerAnalytics(params?: { outlet_id?: number }) {
    const response = await api.get('/reports/customers', { params });
    return response.data.data;
  },

  async getFraudStats(params?: { outlet_id?: number; start_date?: string; end_date?: string }) {
    const response = await api.get('/reports/fraud-stats', { params });
    return response.data.data;
  }
};
