import api from './api';

export interface ForecastMetric {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
}

export interface ForecastDataPoint {
  date: string;
  actualValue: number | null;
  predictedValue: number;
}

export interface ForecastChart {
  revenue?: ForecastDataPoint[];
  expense?: ForecastDataPoint[];
  profit?: ForecastDataPoint[];
  sales?: ForecastDataPoint[];
}

export interface ForecastResponse {
  title: string;
  subtitle: string;
  confidence: number;
  trendLabel: string;
  metrics: ForecastMetric[];
  charts?: ForecastChart;
  inventory?: {
    currentStockValue: number;
    lowStockItemCount: number;
    daysOfStockRemaining: number;
    predictedConsumption30Days: number;
  };
}

export interface RawForecastData {
  forecastType: string;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  trendLabel: string;
  data: ForecastDataPoint[];
  metrics: {
    totalPredicted: number;
    averageDaily: number;
    growthRate: number;
  };
}

export const forecastService = {
  /**
   * Get Owner Forecast (comprehensive)
   */
  async getOwnerForecast(params?: { outletId?: number; days?: number }): Promise<ForecastResponse> {
    const response = await api.get<{ success: boolean; data: ForecastResponse }>('/accounting/forecast/owner', { params });
    return response.data.data;
  },

  /**
   * Get Retail Forecast
   */
  async getRetailForecast(params?: { outletId?: number; days?: number }): Promise<ForecastResponse> {
    const response = await api.get<{ success: boolean; data: ForecastResponse }>('/accounting/forecast/retail', { params });
    return response.data.data;
  },

  /**
   * Get Distributor Forecast
   */
  async getDistributorForecast(params?: { outletId?: number; days?: number }): Promise<ForecastResponse> {
    const response = await api.get<{ success: boolean; data: ForecastResponse }>('/accounting/forecast/distributor', { params });
    return response.data.data;
  },

  /**
   * Get Produsen (Manufacturer) Forecast
   */
  async getProdusenForecast(params?: { outletId?: number; days?: number }): Promise<ForecastResponse> {
    const response = await api.get<{ success: boolean; data: ForecastResponse }>('/accounting/forecast/produsen', { params });
    return response.data.data;
  },

  /**
   * Get Raw Forecast Data (for custom charts)
   */
  async getForecastData(params?: { type?: 'revenue' | 'expense' | 'sales' | 'inventory'; outletId?: number; days?: number }): Promise<RawForecastData> {
    const response = await api.get<{ success: boolean; data: RawForecastData }>('/accounting/forecast/data', { params });
    return response.data.data;
  }
};
