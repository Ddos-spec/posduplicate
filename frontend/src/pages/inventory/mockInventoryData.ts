export const MOCK_INVENTORY_STATS = {
  totalValue: 45200000,
  totalItems: 145,
  lowStockCount: 5,
  outOfStockCount: 1,
  pendingPO: 2,
};

// Kategori FnB yang umum
export type InventoryCategory = 'Bahan Baku' | 'Bahan Segar' | 'Kemasan' | 'Minuman';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: InventoryCategory;
  currentStock: number;
  unit: string;
  minStock: number; // Safety Stock
  costPerUnit: number;
  lastUpdated: string;
  status: 'Aman' | 'Menipis' | 'Habis';
  supplier: string;
}

export const MOCK_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'INV-001',
    name: 'Biji Kopi Arabika (Premium)',
    sku: 'KOP-AR-01',
    category: 'Bahan Baku',
    currentStock: 12.5,
    unit: 'kg',
    minStock: 15, // Warning: Stok < MinStock
    costPerUnit: 185000,
    lastUpdated: '2026-01-20',
    status: 'Menipis',
    supplier: 'CV Kopi Nusantara',
  },
  {
    id: 'INV-002',
    name: 'Susu Fresh Milk (1L)',
    sku: 'DAI-SUS-01',
    category: 'Bahan Segar',
    currentStock: 45,
    unit: 'pack',
    minStock: 20,
    costPerUnit: 18000,
    lastUpdated: '2026-01-20',
    status: 'Aman',
    supplier: 'PT Dairy Farm',
  },
  {
    id: 'INV-003',
    name: 'Gula Pasir Lokal',
    sku: 'GUL-PAS-01',
    category: 'Bahan Baku',
    currentStock: 50,
    unit: 'kg',
    minStock: 10,
    costPerUnit: 14500,
    lastUpdated: '2026-01-19',
    status: 'Aman',
    supplier: 'Toko Grosir Jaya',
  },
  {
    id: 'INV-004',
    name: 'Paper Cup 12oz',
    sku: 'PAC-CUP-12',
    category: 'Kemasan',
    currentStock: 120,
    unit: 'pcs',
    minStock: 500, // Critical
    costPerUnit: 850,
    lastUpdated: '2026-01-18',
    status: 'Menipis',
    supplier: 'PT Packindo',
  },
  {
    id: 'INV-005',
    name: 'Sirup Vanilla',
    sku: 'SYR-VAN-01',
    category: 'Minuman',
    currentStock: 0,
    unit: 'btl',
    minStock: 2,
    costPerUnit: 95000,
    lastUpdated: '2026-01-15',
    status: 'Habis',
    supplier: 'CV Rasa Utama',
  },
  {
    id: 'INV-006',
    name: 'Tepung Terigu (Protein Tinggi)',
    sku: 'TEP-TER-01',
    category: 'Bahan Baku',
    currentStock: 25,
    unit: 'kg',
    minStock: 10,
    costPerUnit: 12000,
    lastUpdated: '2026-01-20',
    status: 'Aman',
    supplier: 'Toko Grosir Jaya',
  },
  {
    id: 'INV-007',
    name: 'Telur Ayam Negeri',
    sku: 'EGG-AYM-01',
    category: 'Bahan Segar',
    currentStock: 5,
    unit: 'kg',
    minStock: 8,
    costPerUnit: 28000,
    lastUpdated: '2026-01-20',
    status: 'Menipis',
    supplier: 'Peternakan Sejahtera',
  },
];

// Data Forecasting (Logic v1: Weighted Average + Tren Mingguan)
// Skenario: Weekend (Sabtu/Minggu) demand naik.
export const MOCK_FORECAST_DATA = [
  { day: 'Senin', usage: 12, predicted: 13, reason: 'Stabil' },
  { day: 'Selasa', usage: 11, predicted: 12, reason: 'Stabil' },
  { day: 'Rabu', usage: 14, predicted: 14, reason: 'Stabil' },
  { day: 'Kamis', usage: 15, predicted: 16, reason: 'Tren Naik' },
  { day: 'Jumat', usage: 22, predicted: 24, reason: 'Pre-weekend' },
  { day: 'Sabtu', usage: 35, predicted: 38, reason: 'Peak Day' }, // Demand tinggi
  { day: 'Minggu', usage: 30, predicted: 32, reason: 'Peak Day' },
];

export const MOCK_ALERTS = [
  { id: 1, type: 'critical', message: 'Sirup Vanilla HABIS! Restock segera.', item: 'Sirup Vanilla' },
  { id: 2, type: 'warning', message: 'Stok Kopi Arabika di bawah batas aman (12.5kg).', item: 'Biji Kopi Arabika' },
  { id: 3, type: 'warning', message: 'Paper Cup menipis, prediksi habis dalam 2 hari.', item: 'Paper Cup 12oz' },
];
