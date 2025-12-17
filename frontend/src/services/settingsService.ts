import api from './api';

export interface TenantSettings {
  id: number;
  businessName: string;
  ownerName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  logo: string | null;
  taxRate: number | null;
  taxName: string | null;
  serviceCharge: number | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
  currency: string | null;
  dateFormat: string | null;
  timeFormat: string | null;
  language: string | null;
  enableTax: boolean | null;
  enableServiceCharge: boolean | null;
  showLogoOnReceipt: boolean | null;
  printerWidth: string | null;
  emailNotifications: boolean | null;
  lowStockAlerts: boolean | null;
  dailySalesReport: boolean | null;
  whatsappNotifications: boolean | null;
  accountingSettings?: AccountingSettings;
}

export interface AccountingSettings {
  fiscalYearStartMonth: number;
  autoPostJournal: boolean;
  defaultCashAccountId: number | null;
  defaultSalesAccountId: number | null;
  defaultCogsAccountId: number | null;
  defaultInventoryAccountId: number | null;
  defaultReceivableAccountId: number | null;
  defaultPayableAccountId: number | null;
}

export interface UpdateSettingsData {
  businessName?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string | null;
  taxRate?: number;
  taxName?: string;
  serviceCharge?: number;
  receiptHeader?: string;
  receiptFooter?: string;
  currency?: string;
  dateFormat?: string;
  timeFormat?: string;
  language?: string;
  enableTax?: boolean;
  enableServiceCharge?: boolean;
  showLogoOnReceipt?: boolean;
  printerWidth?: string;
  emailNotifications?: boolean;
  lowStockAlerts?: boolean;
  dailySalesReport?: boolean;
  whatsappNotifications?: boolean;
  accountingSettings?: AccountingSettings;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const settingsService = {
  async getSettings() {
    const response = await api.get<{ success: boolean; data: TenantSettings }>('/settings');
    return response.data;
  },

  async updateSettings(data: UpdateSettingsData) {
    const response = await api.put<{ success: boolean; message: string; data: TenantSettings }>('/settings', data);
    return response.data;
  },

  async changePassword(data: ChangePasswordData) {
    const response = await api.post<{ success: boolean; message: string }>('/settings/change-password', data);
    return response.data;
  }
};
