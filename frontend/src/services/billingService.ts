import api from './api';

export interface BillingRecord {
  id: number;
  businessName: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionStartsAt: string;
  subscriptionExpiresAt: string;
  nextBillingDate: string;
  lastPaymentAt: string | null;
  createdAt: string;
}

export interface SubscriptionPlan {
  name: string;
  price: number;
  features: string[];
}

export interface BillingStats {
  totalRevenue: number;
  activeSubscriptions: number;
  expiringSoon: number;
  overduePayments: number;
}

export interface RecordPaymentData {
  tenantId: number;
  amount: number;
  method: string;
  referenceNumber?: string;
}

export interface PaymentReceipt {
  id: number;
}

export const billingService = {
  async getHistory(params?: { status?: string; limit?: number }) {
    const response = await api.get<{ success: boolean; data: BillingRecord[] }>('/admin/billing/history', {
      params
    });
    return response.data;
  },

  async getPlans() {
    const response = await api.get<{ success: boolean; data: SubscriptionPlan[] }>('/admin/billing/plans');
    return response.data;
  },

  async recordPayment(data: RecordPaymentData) {
    const response = await api.post<{ success: boolean; data: PaymentReceipt; message: string }>('/admin/billing/payment', data);
    return response.data;
  },

  async getStats() {
    const response = await api.get<{ success: boolean; data: BillingStats }>('/admin/billing/stats');
    return response.data;
  }
};
