# Gemini Memory

## Project Context
- Repository: https://github.com/Ddos-spec/wa-gateways-simple
- Project Type: POS (Point of Sales) System
- Tech Stack: React (Frontend), Node.js/Express (Backend), Prisma (ORM), PostgreSQL (Database).

## 🚀 Development Progress Status (Updated: 29 Nov 2025)

### 🌟 Global Status
- **Owner Module:** ✅ **100% Completed & Functional** (Products, Ingredients, Reports, Integration, Settings).
- **Cashier Module:** ✅ **100% Completed & Functional** (POS, Transactions, Shift Management, Printing).
- **Current Focus:** 🚧 **Admin Module Development**.

### ✅ Recently Completed & Verified
1.  **Product Page Crash Fix:**
    - Fixed infinite loading/crash on "Produk" tab caused by incorrect API response handling (`response.data` vs `response.data.data`) and unsafe property access.
2.  **Report & Dashboard Logic:**
    - **Net Sales Trend:** Correctly groups by **Hour (WIB/UTC+7)** for "Today" view.
    - **Detail Transaksi:** Refactored to show **Per-Transaction (Receipt)** rows.
    - **Sync:** Chart and Table data are consistent in logic and timezone.
3.  **Ingredient Management:**
    - Bulk Import (`bahan.sql`), Fraction Inputs ("1/2"), and Pagination removal for better UX.
4.  **Product Form:**
    - Simplified "Harga Platform Online" input (auto-sync to all platforms).

### 🎯 Next Steps: Admin Module
The focus has shifted entirely to the **Admin Dashboard/Panel**.
1.  **Admin Authentication:** Verify Login/Logout for Admin role.
2.  **Dashboard Overview:** System-wide analytics (Total Tenants, Revenue, etc.).
3.  **User/Tenant Management:** Create, Edit, Suspend Tenants/Owners.
4.  **Billing & Subscriptions:** Manage plan expiry, renewals, and payment status.
5.  **System Settings:** Global configuration, API Key management (if applicable).

---

## Critical Success Factors (Do Not Remove/Break)

### 1. Transaction Module (Cashier)
- **Create Transaction:** Do not access `recipes` table directly (schema mismatch). Keep deduction logic disabled for now.
- **History:** Filter by `cashier_id` for cashiers. Always add +1 day buffer for date filters.
- **Printing:** Use RawBT for Android PWA (`rawbt:` intent).

### 2. Timezone Handling (Global)
- **Strict Rule:** Always convert UTC dates from Database to **WIB (UTC+7)** manually in the Controller (`date + 7 hours`) before sending to Frontend for Charts/Reports to ensure "Today" data looks correct to the user.

### 3. API Response Handling (Frontend)
- **Strict Rule:** Always check if the API response is wrapped. e.g., `response.data.data` vs `response.data`.
- **Safety:** Use optional chaining (`?.`) and fallback values (`|| []` or `|| ''`) when accessing properties of potentially undefined objects to prevent White Screen of Death (WSOD).

## Debugging Lessons
- **Reports:** If Chart and Table don't match, check the Timezone conversion logic in the Controller.
- **White Screen (Crash):** Check console for `filter is not a function` or `cannot read property of undefined`. Usually indicates incorrect API data structure or unsafe property access.