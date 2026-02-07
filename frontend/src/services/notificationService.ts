import api from './api';

export interface AdminNotification {
  id: string;
  type: 'expiring' | 'overdue' | 'billing' | 'transaction_alert';
  message: string;
  details: string;
  tenantId: number;
  createdAt: string;
  entityId?: number;
}

export const notificationService = {
  async getAdminNotifications() {
    const response = await api.get<{ success: boolean; data: AdminNotification[]; count: number }>('/notifications/admin');
    return response.data;
  },

  async getTenantNotifications() {
    const response = await api.get<{ success: boolean; data: AdminNotification[]; count: number }>('/notifications/tenant');
    return response.data;
  },
};
