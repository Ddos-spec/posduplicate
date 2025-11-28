# Gemini Memory

## Project Context
- Repository: https://github.com/Ddos-spec/wa-gateways-simple
- Project Type: POS (Point of Sales) System
- Tech Stack: React (Frontend), Node.js/Express (Backend), Prisma (ORM), PostgreSQL (Database).

## 🚀 Development Progress Status (Updated: 29 Nov 2025)

### ✅ Completed & Verified (Tuntas)
1.  **Report & Dashboard Logic Fixes:**
    - **Net Sales Trend:** Chart now correctly groups by **Hour (WIB/UTC+7)** when viewing "Today".
    - **Detail Transaksi Table:** Refactored to show **Per-Transaction (Receipt)** rows instead of per-item. Columns synced with chart logic (WIB Timezone).
    - **Sync:** Chart and Table data are now consistent in logic and timezone.
2.  **Ingredient Management (Bahan Baku):**
    - **Bulk Import:** Created `bahan.sql` for mass inserting ingredients.
    - **UX Improvement:** Added support for **Fraction Inputs** (e.g., "1/2", "1/4") in Stock/MinStock fields. System auto-converts to decimals.
    - **Pagination:** Removed pagination to show all ingredients in one scrollable list.
3.  **Product Form Simplification:**
    - Refactored Product Form to use a **Single Input** for "Harga Platform Online".
    - Auto-synced to GoFood, GrabFood, and ShopeeFood prices on save.
4.  **Product Page Crash Fix:**
    - **Issue:** Infinite loading/crash on "Produk" tab due to unsafe property access.
    - **Fix:** Implemented safe access (`?.`) and fallback strings for product name/category filtering. Restored missing data loading logic.

### 🔴 Known Issues / Immediate Next Steps (CRITICAL)
*(None at the moment)*

### 🛠 Previous Accomplishments
1.  **PWA Transaction Fix:** Service Worker `NetworkOnly` for API, Dynamic API URL.
2.  **Printing:** RawBT integration for Android PWA.
3.  **Integrations:** DB Schema synced, basic UI for GoFood/Grab/Shopee status.

---

## Critical Success Factors (Do Not Remove/Break)

### 1. Transaction Module
- **Create Transaction:** Do not access `recipes` table directly (schema mismatch). Keep deduction logic disabled for now.
- **History:** Filter by `cashier_id` for cashiers. Always add +1 day buffer for date filters.

### 2. Timezone Handling
- **Strict Rule:** Always convert UTC dates from Database to **WIB (UTC+7)** manually in the Controller (`date + 7 hours`) before sending to Frontend for Charts/Reports to ensure "Today" data looks correct to the user.

## Debugging Lessons
- **Reports:** If Chart and Table don't match, check the Timezone conversion logic in the Controller. Chart usually needs explicit grouping by Hour for single-day views.
