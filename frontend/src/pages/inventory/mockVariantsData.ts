// Data Mock untuk Farmasi
export const MOCK_PHARMACY_ITEMS = [
  {
    id: 'MED-001',
    name: 'Paracetamol 500mg',
    sku: 'PAR-500-TAB',
    category: 'Obat Bebas',
    currentStock: 1200,
    unit: 'tablet',
    minStock: 500,
    costPerUnit: 200,
    lastUpdated: '2026-01-20',
    status: 'Aman',
    supplier: 'PT Pharma Indo',
    // Farmasi Specific
    batchNo: 'B-29910',
    expiryDate: '2026-12-31', 
    golongan: 'Hijau'
  },
  {
    id: 'MED-002',
    name: 'Amoxicillin 500mg',
    sku: 'AMX-500-CAP',
    category: 'Antibiotik',
    currentStock: 50,
    unit: 'kapsul',
    minStock: 100,
    costPerUnit: 800,
    lastUpdated: '2026-01-18',
    status: 'Menipis',
    supplier: 'PT Medika Jaya',
    // Farmasi Specific
    batchNo: 'B-11029',
    expiryDate: '2025-06-15', // Near expiry scenario
    golongan: 'Merah (K)'
  },
  {
    id: 'MED-003',
    name: 'Vitamin C 1000mg',
    sku: 'VIT-C-1000',
    category: 'Suplemen',
    currentStock: 0,
    unit: 'botol',
    minStock: 10,
    costPerUnit: 45000,
    lastUpdated: '2026-01-10',
    status: 'Habis',
    supplier: 'PT Sehat Bugar',
    // Farmasi Specific
    batchNo: 'B-55120',
    expiryDate: '2027-01-01',
    golongan: 'Biru'
  }
];

// Data Mock untuk Retail (Fashion/Electronics)
export const MOCK_RETAIL_ITEMS = [
  {
    id: 'RET-001',
    name: 'Kaos Polos Basic',
    sku: 'TSH-BLK-L',
    category: 'Pakaian Pria',
    currentStock: 85,
    unit: 'pcs',
    minStock: 20,
    costPerUnit: 35000,
    lastUpdated: '2026-01-20',
    status: 'Aman',
    supplier: 'Garmen Bandung',
    // Retail Specific
    variant: 'Hitam / L',
    barcode: '8991002003001'
  },
  {
    id: 'RET-002',
    name: 'Celana Chino Slim',
    sku: 'CHN-NVY-32',
    category: 'Celana',
    currentStock: 12,
    unit: 'pcs',
    minStock: 15,
    costPerUnit: 85000,
    lastUpdated: '2026-01-19',
    status: 'Menipis',
    supplier: 'Garmen Bandung',
    // Retail Specific
    variant: 'Navy / 32',
    barcode: '8991002003002'
  },
  {
    id: 'RET-003',
    name: 'Topi Snapback',
    sku: 'HAT-RED-OS',
    category: 'Aksesoris',
    currentStock: 45,
    unit: 'pcs',
    minStock: 10,
    costPerUnit: 25000,
    lastUpdated: '2026-01-15',
    status: 'Aman',
    supplier: 'Topi Kita',
    // Retail Specific
    variant: 'Merah / All Size',
    barcode: '8991002003003'
  }
];
