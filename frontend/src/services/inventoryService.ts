import api from './api';

// Types
export interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  current_stock: number;
  unit: string;
  min_stock: number;
  cost_amount: number;
  supplier_id: number | null;
  business_type: string;
  days_cover: number | null;
  source: string | null;
  batch_no: string | null;
  expiry_date: string | null;
  variant: string | null;
  barcode: string | null;
  status: 'Aman' | 'Menipis' | 'Habis';
  suppliers?: { id: number; name: string } | null;
}

export interface InventoryStats {
  totalValue: number;
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingPO: number;
  avgDaysCover: number | string;
}

export interface InventoryAlert {
  id: number;
  outlet_id: number;
  inventory_id: number;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
  inventory?: { id: number; name: string; sku: string; current_stock: number; unit: string };
}

export interface ForecastData {
  day: string;
  date?: string;
  usage: number;
  predicted: number;
  reason: string;
}

export interface PurchaseOrder {
  id: number;
  outlet_id: number;
  po_number: string;
  supplier_id: number | null;
  status: string;
  order_date: string;
  expected_date: string | null;
  subtotal: number;
  total: number;
  notes: string | null;
  suppliers?: { id: number; name: string } | null;
  purchase_order_items: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: number;
  po_id: number;
  inventory_id: number;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
  received_qty: number;
  inventory?: { id: number; name: string; sku: string; unit: string };
}

export interface POSuggestion {
  inventoryId: number;
  name: string;
  sku: string | null;
  currentStock: number;
  minStock: number;
  suggestedQty: number;
  unit: string;
  supplier: { id: number; name: string } | null;
  costPerUnit: number;
}

export interface InventorySettings {
  id: number;
  outlet_id: number;
  business_type: string;
  low_stock_threshold_days: number;
  auto_reorder_enabled: boolean;
  reorder_lead_days: number;
  track_expiry: boolean;
  expiry_warning_days: number;
  track_batch: boolean;
  settings: Record<string, any>;
}

// Inventory Module API
export const inventoryService = {
  // Get all inventory items
  getAll: async (params?: { outlet_id?: number; category?: string; business_type?: string; status?: string; low_stock?: boolean }) => {
    const response = await api.get('/fnb/inventory-module', { params });
    return response.data;
  },

  // Get single item
  getById: async (id: number) => {
    const response = await api.get(`/fnb/inventory-module/${id}`);
    return response.data;
  },

  // Create item
  create: async (data: Partial<InventoryItem>) => {
    const response = await api.post('/fnb/inventory-module', data);
    return response.data;
  },

  // Update item
  update: async (id: number, data: Partial<InventoryItem>) => {
    const response = await api.put(`/fnb/inventory-module/${id}`, data);
    return response.data;
  },

  // Delete item
  delete: async (id: number) => {
    const response = await api.delete(`/fnb/inventory-module/${id}`);
    return response.data;
  },

  // Adjust stock
  adjustStock: async (id: number, data: { quantity: number; type: 'in' | 'out'; notes?: string }) => {
    const response = await api.post(`/fnb/inventory-module/${id}/adjust`, data);
    return response.data;
  },

  // Get stats for dashboard
  getStats: async (outletId?: number) => {
    const response = await api.get('/fnb/inventory-module/stats', { params: { outlet_id: outletId } });
    return response.data;
  },

  // Get alerts
  getAlerts: async (outletId?: number, includeResolved?: boolean) => {
    const response = await api.get('/fnb/inventory-module/alerts', {
      params: { outlet_id: outletId, include_resolved: includeResolved }
    });
    return response.data;
  },

  // Generate alerts
  generateAlerts: async (outletId?: number) => {
    const response = await api.post('/fnb/inventory-module/alerts/generate', null, {
      params: { outlet_id: outletId }
    });
    return response.data;
  },

  // Resolve alert
  resolveAlert: async (alertId: number) => {
    const response = await api.put(`/fnb/inventory-module/alerts/${alertId}/resolve`);
    return response.data;
  },

  // Get forecast data
  getForecast: async (outletId?: number, days?: number) => {
    const response = await api.get('/fnb/inventory-module/forecast', {
      params: { outlet_id: outletId, days }
    });
    return response.data;
  },

  // Get categories
  getCategories: async () => {
    const response = await api.get('/fnb/inventory-module/categories');
    return response.data;
  },

  // Get low stock items
  getLowStock: async (outletId?: number) => {
    const response = await api.get('/fnb/inventory-module/low-stock', { params: { outlet_id: outletId } });
    return response.data;
  }
};

// Purchase Orders API
export const purchaseOrderService = {
  // Get all POs
  getAll: async (params?: { outlet_id?: number; status?: string; supplier_id?: number }) => {
    const response = await api.get('/fnb/purchase-orders', { params });
    return response.data;
  },

  // Get single PO
  getById: async (id: number) => {
    const response = await api.get(`/fnb/purchase-orders/${id}`);
    return response.data;
  },

  // Create PO
  create: async (data: { outletId: number; supplierId?: number; expectedDate?: string; notes?: string; items: Array<{ inventoryId: number; quantity: number; unit: string; unitPrice: number }> }) => {
    const response = await api.post('/fnb/purchase-orders', data);
    return response.data;
  },

  // Update PO
  update: async (id: number, data: Partial<PurchaseOrder & { items?: Array<{ inventoryId: number; quantity: number; unit: string; unitPrice: number }> }>) => {
    const response = await api.put(`/fnb/purchase-orders/${id}`, data);
    return response.data;
  },

  // Update PO status
  updateStatus: async (id: number, status: string) => {
    const response = await api.patch(`/fnb/purchase-orders/${id}/status`, { status });
    return response.data;
  },

  // Receive PO items
  receiveItems: async (id: number, items: Array<{ itemId: number; receivedQty: number }>) => {
    const response = await api.post(`/fnb/purchase-orders/${id}/receive`, { items });
    return response.data;
  },

  // Delete PO
  delete: async (id: number) => {
    const response = await api.delete(`/fnb/purchase-orders/${id}`);
    return response.data;
  },

  // Get PO suggestions
  getSuggestions: async (outletId?: number) => {
    const response = await api.get('/fnb/purchase-orders/suggestions', { params: { outlet_id: outletId } });
    return response.data;
  }
};

// Inventory Settings API
export const inventorySettingsService = {
  // Get settings
  get: async (outletId: number) => {
    const response = await api.get('/fnb/inventory-settings', { params: { outlet_id: outletId } });
    return response.data;
  },

  // Update settings
  update: async (outletId: number, data: Partial<InventorySettings>) => {
    const response = await api.put('/fnb/inventory-settings', data, { params: { outlet_id: outletId } });
    return response.data;
  },

  // Get business type fields
  getBusinessTypeFields: async (businessType?: string) => {
    const response = await api.get('/fnb/inventory-settings/business-types', { params: { business_type: businessType } });
    return response.data;
  },

  // Get inventory summary
  getSummary: async (outletId?: number) => {
    const response = await api.get('/fnb/inventory-settings/summary', { params: { outlet_id: outletId } });
    return response.data;
  }
};
