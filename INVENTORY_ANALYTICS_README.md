# Inventory & Sales Analytics Module

## Overview
Modul baru untuk manajemen inventory dan analisis penjualan dengan database-first approach menggunakan PostgreSQL via Prisma.

## Database Schema

### 1. Inventory Module
**Table: `inventory`**
- `id` (Int) - Primary key
- `name` (String) - Nama item
- `category` (String) - Kategori (Bahan Baku, Finished Goods, dll)
- `unit` (String) - Satuan (kg, box, pcs, liter)
- `current_stock` (Decimal) - Stok saat ini
- `alert` (Boolean) - Status peringatan aktif/tidak
- `stock_alert` (Decimal) - Threshold minimum stok
- `track_cost` (Boolean) - Track cost of goods aktif/tidak
- `cost_amount` (Decimal) - Biaya per unit
- `outlet_id` (Int, nullable) - ID outlet
- `is_active` (Boolean) - Status aktif
- `created_at`, `updated_at` (DateTime)

### 2. Sales Analytics Module
**Table: `sales_transactions`**
- `id` (Int) - Primary key
- `outlet` (String) - Nama outlet
- `receipt_number` (String) - Nomor struk
- `date` (DateTime) - Tanggal transaksi
- `time` (String) - Waktu transaksi
- `category` (String) - Kategori produk
- `brand` (String) - Brand (default: 'Unbranded')
- `item_name` (String) - Nama item
- `variant` (String, nullable) - Varian
- `sku` (String, nullable) - SKU
- `quantity` (Int) - Jumlah
- `gross_sales` (Decimal) - Penjualan kotor
- `discounts` (Decimal) - Diskon
- `refunds` (Decimal) - Refund
- `net_sales` (Decimal) - Penjualan bersih
- `tax` (Decimal) - Pajak
- `gratuity` (Decimal) - Tip/gratuity
- `sales_type` (String) - Tipe penjualan (Dine In/Take Away)
- `payment_method` (String) - Metode pembayaran
- `served_by` (String) - Dilayani oleh
- `collected_by` (String) - Dikumpulkan oleh
- `outlet_id` (Int, nullable) - ID outlet
- `created_at`, `updated_at` (DateTime)

## API Endpoints

### Inventory Module
**Base URL: `/api/inventory-module`**

- `GET /` - Get all inventory items
  - Query params: `outlet_id`, `category`, `low_stock`
- `GET /low-stock` - Get low stock items
- `GET /categories` - Get unique categories
- `GET /:id` - Get single item
- `POST /` - Create new item
- `PUT /:id` - Update item
- `DELETE /:id` - Delete item (soft delete)
- `POST /:id/adjust` - Adjust stock (in/out)

### Sales Analytics Module
**Base URL: `/api/sales-analytics`**

- `GET /transactions` - Get all transactions
  - Query params: `outlet_id`, `date_from`, `date_to`, `category`, `sales_type`, `payment_method`
- `GET /transactions/:id` - Get single transaction
- `POST /transactions` - Create transaction
- `POST /transactions/bulk` - Bulk create transactions
- `GET /summary` - Get analytics summary
- `GET /trend` - Get net sales trend (untuk chart)
- `GET /top-items` - Get top selling items
- `GET /by-category` - Get sales by category
- `GET /by-payment` - Get sales by payment method

## Frontend Pages

### 1. Inventory Management Page
**Route: `/owner/inventory`**

**Features:**
- ✅ CRUD operations untuk inventory items
- ✅ Search dan filter by category
- ✅ Low stock indicator dengan warning visual
- ✅ Alert threshold configuration
- ✅ Cost tracking per item
- ✅ High-density table view
- ✅ Pagination
- ✅ Real-time stock status
- ✅ Modal form untuk Create/Update

**UI Components:**
- Stats cards (Total Items, Low Stock, Categories, Tracking Cost)
- Search bar dengan filter kategori
- Low stock toggle filter
- Professional table dengan zebra striping
- Color-coded low stock items (red background)
- Icons untuk stock trend (TrendingUp/TrendingDown)
- Inline edit dan delete actions

### 2. Sales Analytics Page
**Route: `/owner/analytics`**

**Features:**
- ✅ Dynamic line chart dengan warna hijau/merah
- ✅ Date range filter
- ✅ Category filter
- ✅ Summary statistics dashboard
- ✅ Detailed transaction table
- ✅ Export ready structure
- ✅ Responsive design

**Chart Specification:**
- **Single Line Chart** untuk Net Sales Trend
- **Warna Dinamis:**
  - 🟢 HIJAU: Ketika nilai naik (Higher High)
  - 🔴 MERAH: Ketika nilai turun (Lower Low)
- **Style:** Mirip trading chart dengan segment-based coloring
- **Library:** Recharts dengan custom rendering
- **Data Points:** Dengan dots berwarna sesuai trend

**UI Components:**
- Date range picker
- Summary cards (Total Transactions, Gross Sales, Net Sales, Quantity)
- Dynamic trend chart dengan legend
- High-density transaction table
- Pagination
- Export button (structure ready)

## Setup Instructions

### 1. Database Migration
```bash
cd backend

# Copy .env.example to .env and configure DATABASE_URL
cp .env.example .env

# Edit .env and set your PostgreSQL connection string
# DATABASE_URL="postgresql://username:password@localhost:5432/mypos_db?schema=public"

# Generate Prisma client
npm run prisma:generate

# Run migration
npm run prisma:migrate

# Optional: Open Prisma Studio to view/edit data
npm run prisma:studio
```

### 2. Start Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

## Usage Guidelines

### Inventory Management
1. Akses menu "Inventory" di sidebar owner
2. Klik "Tambah Item" untuk create new inventory item
3. Set alert threshold untuk low stock warning
4. Enable "Track Cost" untuk tracking biaya per unit
5. Use filter "Low Stock Only" untuk quick view items yang perlu restock

### Sales Analytics
1. Akses menu "Sales Analytics" di sidebar owner
2. Set date range untuk period analysis
3. Filter by category jika perlu
4. Lihat trend chart untuk visualisasi performa penjualan
5. Scroll down untuk detail transaksi per line item
6. Green line = sales naik, Red line = sales turun

## Technical Stack

### Backend
- **Framework:** Express.js + TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Validation:** Built-in validation

### Frontend
- **Framework:** React + TypeScript
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **State:** Zustand
- **HTTP Client:** Axios
- **Notifications:** React Hot Toast

## Design Principles

1. **Database First:** Semua data dari database, no hardcoded arrays
2. **High-Density UI:** Maximum information dengan clean layout
3. **Professional Design:** Modern, business-oriented interface
4. **Export Ready:** Data structure siap untuk export ke Excel/PDF
5. **Responsive:** Mobile-friendly design
6. **Performance:** Optimized queries dengan pagination
7. **Type Safety:** Full TypeScript untuk backend dan frontend

## Color Coding

### Inventory
- 🔴 Red background: Low stock items
- 🟢 Green icon: Stock di atas threshold
- 🔴 Red icon: Stock di bawah threshold
- 🔵 Blue badge: Category tags
- 🟡 Yellow: Cost tracking indicator

### Analytics
- 🟢 Green: Positive trend (naik)
- 🔴 Red: Negative trend (turun)
- 🔵 Blue: Category badges
- ⚫ Gray: Neutral/default states

## Future Enhancements

- [ ] Export to Excel/PDF functionality
- [ ] Advanced analytics (forecasting, trends)
- [ ] Bulk import untuk inventory
- [ ] Barcode/SKU scanning
- [ ] Automated reorder suggestions
- [ ] Multi-outlet comparison charts
- [ ] Email alerts untuk low stock
- [ ] Integration dengan supplier orders

## Notes

- Migration belum dijalankan karena DATABASE_URL belum dikonfigurasi
- Pastikan PostgreSQL sudah terinstall dan running
- Set proper permissions untuk user database
- Backup database sebelum running migration di production
- Chart performance optimal untuk data range 30-90 hari

---
**Created:** November 2024
**Version:** 1.0.0
