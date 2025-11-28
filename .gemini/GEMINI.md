# Gemini Memory

## Project Context
- Repository: https://github.com/Ddos-spec/wa-gateways-simple
- Project Type: POS (Point of Sales) System
- Tech Stack: React (Frontend), Node.js/Express (Backend), Prisma (ORM), PostgreSQL (Database).

## 🚀 Development Progress Status (Updated: 28 Nov 2025)

### ✅ Completed & Verified (Tuntas)
1.  **PWA Transaction Fix:**
    - Masalah transaksi gagal di HP/Android teratasi.
    - Solusi: Service Worker `NetworkOnly` untuk API, Dynamic API URL, CORS khusus VPS.
2.  **Pencetakan Struk (Receipt):**
    - Metode: HTML/CSS Print (bukan jsPDF).
    - Fitur: Support RawBT (Android PWA), Layout Bersih (tanpa header browser), Teks **BOLD** agar terbaca jelas.
    - Footer: Logika kondisional (Pesan default vs Custom Footer).
3.  **Persiapan Deployment VPS:**
    - Upload Path: Menggunakan `process.cwd()` agar logo tidak hilang saat rebuild.
    - Debugging: Endpoint `/api/debug/check-uploads` untuk cek volume mounting.

### 🛠 Implemented (Siap Tes User)
1.  **Modul Integrasi (Simulasi):**
    - Menu `Owner > Integrasi`.
    - Kartu GoFood/Grab/Shopee/QRIS dengan status "Terhubung/Belum".
    - Form input Merchant ID / Store URL (Data disimpan di DB).
2.  **Kasir Pintar (Smart Cashier UI):**
    - **Switch Harga:** Tombol "GoFood/Grab" muncul di kasir jika integrasi aktif.
    - **Markup Otomatis:** Harga produk di keranjang otomatis berubah sesuai platform (Mark-up).
    - **QRIS on Screen:** Gambar QRIS muncul otomatis di layar saat metode bayar = QRIS.
3.  **Otomasi Laporan (API untuk n8n):**
    - Endpoint Admin: Generate API Key (Plain text storage).
    - Endpoint Laporan: `/api/owner/reports/sales` & `/stock` (JSON Output).
    - Tujuan: Ditarik oleh n8n -> Masuk Google Sheet otomatis.

### 📝 Planned / Next Steps
- Verifikasi User untuk alur Integrasi GoFood (Cek apakah harga berubah sesuai).
- Setup n8n untuk menarik data via API Key yang baru dibuat.

---

## Critical Success Factors (Do Not Remove/Break)

### 1. Transaction Module
- **Create Transaction:**
  - **NEVER** use `prisma.recipes.update` or `prisma.recipes.findMany` inside the transaction creation block. The `recipes` table does not exist in the current production database schema, and attempting to access it causes a silent rollback of the entire transaction.
  - Keep the recipe deduction logic **COMMENTED OUT** or removed until the database schema is synchronized.
  - `createdAt` timestamp: Let the database handle it via `DEFAULT CURRENT_TIMESTAMP`. Do not send `createdAt: new Date()` from the backend to avoid timezone mismatches.

- **Get Transaction History:**
  - **Tenant/Outlet Isolation:** Do NOT use complex tenant/outlet validation logic (e.g., checking `outlet.tenantId`). It is prone to bugs where valid transactions are hidden.
  - **Safe Filter Logic:** Use a simple filter: `where: { cashier_id: req.userId }`. This ensures the logged-in cashier always sees their own transactions.
  - **Date Filter:** When filtering by date range (`date_to`), always add **+1 day** buffer (e.g., `toDate.setDate(toDate.getDate() + 1)`) to handle timezone differences between client/server/database effectively.

### 2. Printing / Receipt
- **PWA/Android Support:**
  - **NEVER** rely solely on `window.print()` or `window.open()` for Android devices.
  - **RawBT Integration:** Use the `rawbt:` Intent Scheme for printing in PWA mode.
  - Logic: Check `isStandalone`. If true -> Generate Base64 PDF -> `window.location.href = 'rawbt:base64,...'`.
  - This bypasses browser dialogs and works reliably on mobile POS setups.

## Debugging Lessons
- **"Nuclear Mode":** When data is missing but creation is success, assume "Silent Rollback" or "Over-aggressive Filtering".
- **Log Level:** Always check the Server Logs for `prisma:error` even if the API returns 201/200. Silent DB errors are common in Prisma transactions.

## Removed Credentials
- Google Service Account Credentials have been removed for security.