export const MOCK_INVENTORY_STATS = {
  totalValue: 185000000, // Estimasi nilai stok (naik karena chain besar)
  totalItems: 59, // Sesuai data excel (kurang lebih)
  lowStockCount: 4,
  outOfStockCount: 1,
  pendingPO: 3,
  avgDaysCover: 4.2, // Target klien 4-5 hari
};

export type InventoryCategory = 'Bahan Pokok' | 'Minuman' | 'Frozen Food' | 'Packaging' | 'WIP (Olahan)';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: InventoryCategory;
  currentStock: number;
  unit: string;
  minStock: number;
  costPerUnit: number;
  lastUpdated: string;
  status: 'Aman' | 'Menipis' | 'Habis';
  supplier: string;
  source: 'DC' | 'Supplier Langsung'; // Kebutuhan Klien
  daysCover: number; // Kebutuhan Klien
}

// Data REAL dari Excel Klien
export const MOCK_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'BR-001',
    name: 'Beras Yaman Rice',
    sku: 'RMT.00004-1',
    category: 'Bahan Pokok',
    currentStock: 250,
    unit: 'Kg',
    minStock: 100,
    costPerUnit: 12500,
    lastUpdated: '2026-01-20',
    status: 'Aman',
    supplier: 'Supplier Langsung',
    source: 'Supplier Langsung',
    daysCover: 5.5
  },
  {
    id: 'FGS-00007',
    name: '7dates Jus Kurma',
    sku: 'FGS-00007',
    category: 'Minuman',
    currentStock: 12,
    unit: 'Dus',
    minStock: 10,
    costPerUnit: 145000,
    lastUpdated: '2026-01-19',
    status: 'Menipis',
    supplier: '7dates Pusat',
    source: 'Supplier Langsung',
    daysCover: 2.1
  },
  {
    id: 'FGS-00012',
    name: 'Samosa Beef Original',
    sku: 'FGS-00012',
    category: 'Frozen Food',
    currentStock: 450,
    unit: 'PCS',
    minStock: 100,
    costPerUnit: 3500,
    lastUpdated: '2026-01-20',
    status: 'Aman',
    supplier: 'Central Kitchen',
    source: 'DC',
    daysCover: 4.8
  },
  {
    id: 'PCG-00001',
    name: 'Lunch Box Standard',
    sku: 'PCG-00001',
    category: 'Packaging',
    currentStock: 1200,
    unit: 'PCS',
    minStock: 500,
    costPerUnit: 1200,
    lastUpdated: '2026-01-18',
    status: 'Aman',
    supplier: 'Mitra Pack',
    source: 'Supplier Langsung',
    daysCover: 7.0
  },
  {
    id: 'WIP-00002',
    name: 'Kambing Olahan (WIP)',
    sku: 'WIP-00002',
    category: 'WIP (Olahan)',
    currentStock: 0,
    unit: 'Bungkus',
    minStock: 20,
    costPerUnit: 85000,
    lastUpdated: '2026-01-20',
    status: 'Habis',
    supplier: 'Central Kitchen',
    source: 'DC',
    daysCover: 0
  },
  {
    id: 'FGS-00009',
    name: 'Dahagaku Lemon Sereh',
    sku: 'FGS-00009',
    category: 'Minuman',
    currentStock: 45,
    unit: 'Botol',
    minStock: 24,
    costPerUnit: 8500,
    lastUpdated: '2026-01-20',
    status: 'Aman',
    supplier: 'Dahagaku Indonesia',
    source: 'Supplier Langsung',
    daysCover: 3.5
  },
  {
    id: 'PCG-00023',
    name: 'Sedotan Steril',
    sku: 'PCG.00023',
    category: 'Packaging',
    currentStock: 15,
    unit: 'Pack',
    minStock: 20,
    costPerUnit: 15000,
    lastUpdated: '2026-01-15',
    status: 'Menipis',
    supplier: 'Mitra Pack',
    source: 'Supplier Langsung',
    daysCover: 1.8
  }
];

// Forecasting Data (Sesuai pola Excel: Weekend naik 30-50%)
export const MOCK_FORECAST_DATA = [
  { day: 'Senin', usage: 450, predicted: 460, reason: 'Normal Day' },
  { day: 'Selasa', usage: 440, predicted: 455, reason: 'Normal Day' },
  { day: 'Rabu', usage: 480, predicted: 490, reason: 'Trend Naik' },
  { day: 'Kamis', usage: 520, predicted: 550, reason: 'Pre-Weekend' },
  { day: 'Jumat', usage: 850, predicted: 900, reason: 'Early Weekend (+30%)' },
  { day: 'Sabtu', usage: 1100, predicted: 1200, reason: 'Peak Weekend (+50%)' },
  { day: 'Minggu', usage: 950, predicted: 1050, reason: 'Family Day (+40%)' },
];

export const MOCK_ALERTS = [
  { id: 1, type: 'critical', message: 'Kambing Olahan (WIP) HABIS! Kiriman DC belum sampai.', item: 'Kambing Olahan' },
  { id: 2, type: 'warning', message: 'Jus Kurma sisa 2 hari (Days Cover < 3). Segera order.', item: '7dates Jus Kurma' },
  { id: 3, type: 'info', message: 'Weekend demand naik 50%. Siapkan extra Samosa & Beras.', item: 'Forecast Info' },
];