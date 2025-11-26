import api from './api';

export interface PrinterSettings {
  defaultPrinter?: string;
  printerWidth?: '58mm' | '80mm';
  autoPrint?: boolean;
  copies?: number;
}

export const printerSettingsService = {
  async getSettings(): Promise<PrinterSettings> {
    const response = await api.get('/printer-settings');
    return response.data.data;
  },

  async updateSettings(settings: PrinterSettings): Promise<PrinterSettings> {
    const response = await api.put('/printer-settings', settings);
    return response.data.data;
  },

  async resetSettings(): Promise<PrinterSettings> {
    const response = await api.post('/printer-settings/reset');
    return response.data.data;
  },
};
