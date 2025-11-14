# MyPOS - Role-Based POS System
**Last Updated:** 14 November 2025
**Project Type:** Multi-Tenant Restaurant POS System

---

## 🎯 CURRENT FOCUS

**PRIORITY: FRONTEND UI COMPLETE FIRST → BACKEND FUNCTIONALITY LATER**

### Goals:
1. ✅ Login works for all 3 roles (Admin, Owner, Kasir)
2. ✅ All UI features visible (can use mock data)
3. ✅ Clear navigation per role
4. ⏳ Backend functionality comes AFTER all UI is complete

---

## 🎭 ROLE HIERARCHY

```
┌─────────────────────────────────────────────────────┐
│                 ADMIN (Super Admin)                 │
│  Route: /admin                                      │
│  Access: Full system control                        │
├─────────────────────────────────────────────────────┤
│  Pages:                                             │
│  • Admin Login (/admin/login)                       │
│  • Tenant Management                                │
│  • System Analytics                                 │
│  • Billing Management                               │
│  • Subscription Plans                               │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│              OWNER (Tenant/Business Owner)          │
│  Route: /owner or /dashboard                        │
│  Access: Own business only                          │
├─────────────────────────────────────────────────────┤
│  Pages:                                             │
│  • Owner Dashboard (analytics & charts)             │
│  • Employee Management                              │
│  • User Management                                  │
│  • Outlet Management                                │
│  • Product Management                               │
│  • Reports & Analytics                              │
│  • Settings                                         │
│  • Inventory (future)                               │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│              KASIR (Cashier/Employee)               │
│  Route: /cashier or /pos                            │
│  Access: POS only                                   │
├─────────────────────────────────────────────────────┤
│  Pages:                                             │
│  • POS Interface (already complete ✅)              │
│  • Transaction History                              │
│  • Table Management (view only)                     │
└─────────────────────────────────────────────────────┘
```

---

## ✅ CURRENT STATUS

### 1. KASIR (Cashier) - ✅ FRONTEND COMPLETE
**Status:** Frontend complete, backend needs fixes (later)

**Available Features:**
- ✅ Login works
- ✅ POS Interface complete
- ✅ Product grid + category filter
- ✅ Cart management
- ✅ Checkout + payment modal
- ✅ Split bill support
- ✅ Receipt printing
- ✅ Transaction history
- ✅ Table management
- ✅ Mobile responsive

**Backend Issues (fix later):**
- Transaction API validation
- Payment recording
- Stock updates

---

### 2. OWNER (Tenant) - ⚠️ INCOMPLETE
**Status:** Login works, but pages are missing/incomplete

**Working:**
- ✅ Login works (owner@kebuliutsman.com / password123)
- ✅ Basic dashboard exists

**Missing Frontend Pages:**
- ❌ Dashboard with charts & analytics UI
- ❌ Employee Management page
- ❌ User Management page
- ❌ Outlet Management page
- ❌ Reports page
- ❌ Settings page
- ❌ Proper navigation menu

---

### 3. ADMIN (Super Admin) - ❌ NOT STARTED
**Status:** Completely missing

**Missing:**
- ❌ Admin login page (/admin/login)
- ❌ Admin dashboard/layout
- ❌ Tenant management page
- ❌ System analytics page
- ❌ Billing management page
- ❌ Navigation menu

---

## 🚀 FRONTEND-FIRST ROADMAP

### PHASE 1: ADMIN ROLE - COMPLETE FRONTEND 🔥

#### Task 1.1: Admin Login Page
**File:** `frontend/src/pages/admin/AdminLoginPage.tsx`
**Route:** `/admin/login`

**UI Components:**
- [ ] Login form (email + password)
- [ ] "Admin Login" header/title
- [ ] Remember me checkbox
- [ ] Login button
- [ ] Error message display
- [ ] Redirect to admin dashboard after login

**Mock Credentials:**
- Email: admin@mypos.com
- Password: admin123

---

#### Task 1.2: Admin Layout & Navigation
**File:** `frontend/src/components/admin/AdminLayout.tsx`
**Route:** `/admin/*`

**UI Components:**
- [ ] Sidebar navigation
  - Dashboard
  - Tenant Management
  - System Analytics
  - Billing Management
  - Subscription Plans
  - Logout
- [ ] Top header with admin name
- [ ] Main content area
- [ ] Responsive mobile menu

---

#### Task 1.3: Tenant Management Page
**File:** `frontend/src/pages/admin/TenantManagementPage.tsx`
**Route:** `/admin/tenants`

**UI Components:**
- [ ] Header with "Add New Tenant" button
- [ ] Search bar
- [ ] Filters (active/inactive, subscription status)
- [ ] Tenant list table
  - Columns: Business Name, Owner Name, Email, Phone, Plan, Status, Created, Actions
  - Actions: Edit, View Details, Deactivate/Activate
- [ ] Pagination

**Add/Edit Tenant Modal:**
- [ ] Business Name input
- [ ] Owner Name input
- [ ] Email input
- [ ] Phone input
- [ ] Business Type dropdown (Restaurant, Retail, Cafe, etc)
- [ ] Subscription Plan dropdown (Basic, Pro, Enterprise)
- [ ] Max Outlets input
- [ ] Max Users input
- [ ] Start Date picker
- [ ] Expiry Date picker
- [ ] Save button

**Mock Data (10 tenants for demo):**
```javascript
const mockTenants = [
  { id: 1, business: "Kebuli Utsman", owner: "Ahmad", email: "owner@kebuliutsman.com", plan: "Pro", status: "Active" },
  { id: 2, business: "Warung Sate Pak Eko", owner: "Eko", email: "eko@sate.com", plan: "Basic", status: "Active" },
  // ... 8 more
]
```

---

#### Task 1.4: System Analytics Page
**File:** `frontend/src/pages/admin/SystemAnalyticsPage.tsx`
**Route:** `/admin/analytics`

**UI Components:**
- [ ] Summary Cards (4 cards)
  - Total Tenants (with trend)
  - Total Users (all tenants)
  - Total Transactions (system-wide)
  - Total Revenue (system-wide)
- [ ] Tenant Growth Chart (line chart)
- [ ] Revenue Chart (bar chart - monthly)
- [ ] Top Performing Tenants Table (top 10)
- [ ] Active vs Inactive Tenants (pie chart)
- [ ] Date range filter

**Use Mock Data / Recharts for charts**

---

#### Task 1.5: Billing Management Page
**File:** `frontend/src/pages/admin/BillingManagementPage.tsx`
**Route:** `/admin/billing`

**UI Components:**

**Tab 1: Subscription Plans**
- [ ] Plan cards (Basic, Pro, Enterprise)
- [ ] Add/Edit plan button
- [ ] Plan details (price, features, limits)

**Tab 2: Billing History**
- [ ] Filter by tenant, date range
- [ ] Billing table
  - Columns: Tenant, Plan, Amount, Paid Date, Next Billing, Status
- [ ] Export to Excel button

**Tab 3: Overdue**
- [ ] Overdue subscriptions list (red alert)
- [ ] Send reminder button
- [ ] Auto-suspend toggle

**Mock subscription plans:**
```javascript
const plans = [
  { name: "Basic", price: 99000, maxOutlets: 1, maxUsers: 5 },
  { name: "Pro", price: 299000, maxOutlets: 5, maxUsers: 20 },
  { name: "Enterprise", price: 999000, maxOutlets: 999, maxUsers: 999 }
]
```

---

### PHASE 2: OWNER ROLE - COMPLETE FRONTEND 🔥

#### Task 2.1: Owner Dashboard Page (Rebuild)
**File:** `frontend/src/pages/OwnerDashboardPage.tsx`
**Route:** `/dashboard` or `/owner/dashboard`

**UI Components:**
- [ ] Welcome header with owner name
- [ ] Date range filter (Today, This Week, This Month, Custom)
- [ ] Outlet selector dropdown (if multiple outlets)

**Summary Cards (4 cards):**
- [ ] Total Sales (with % change)
- [ ] Total Transactions (with % change)
- [ ] Total Products
- [ ] Total Customers

**Charts:**
- [ ] Sales Trend Chart (line chart - last 7/30 days)
- [ ] Sales by Category (pie chart)
- [ ] Top 5 Products (bar chart)

**Tables:**
- [ ] Recent Transactions (last 10)
  - Columns: Transaction #, Date, Total, Status
  - View detail button
- [ ] Low Stock Alerts (if any)

**Quick Actions Buttons:**
- [ ] Go to POS
- [ ] Add Product
- [ ] View Reports
- [ ] Settings

**Use Mock Data / Recharts**

---

#### Task 2.2: Employee Management Page
**File:** `frontend/src/pages/EmployeeManagementPage.tsx`
**Route:** `/owner/employees`

**UI Components:**
- [ ] Header with "Add New Employee" button
- [ ] Search bar
- [ ] Filter by status (Active/Inactive), position, outlet
- [ ] Employee list table
  - Columns: Photo, Name, Position, Employee Code, PIN, Outlet, Status, Actions
  - Actions: Edit, Deactivate, View Performance
- [ ] Pagination

**Add/Edit Employee Modal:**
- [ ] Photo upload
- [ ] Name input
- [ ] Employee Code input (auto-generated option)
- [ ] PIN input (6 digits for quick login)
- [ ] Position dropdown (Cashier, Manager, Kitchen, Waiter)
- [ ] Outlet dropdown
- [ ] Salary input
- [ ] Hire Date picker
- [ ] Link to User Account dropdown (optional)
- [ ] Active/Inactive toggle
- [ ] Save button

**Mock Data (20 employees):**
```javascript
const mockEmployees = [
  { id: 1, name: "Budi Santoso", code: "EMP001", pin: "123456", position: "Cashier", outlet: "Main Store", status: "Active" },
  // ... 19 more
]
```

---

#### Task 2.3: User Management Page
**File:** `frontend/src/pages/UserManagementPage.tsx`
**Route:** `/owner/users`

**UI Components:**
- [ ] Header with "Create New User" button
- [ ] Search bar
- [ ] Filter by role, outlet, status
- [ ] User list table
  - Columns: Name, Email, Role, Outlet, Last Login, Status, Actions
  - Actions: Edit, Reset Password, Deactivate
- [ ] Pagination

**Create/Edit User Modal:**
- [ ] Name input
- [ ] Email input
- [ ] Password input (only for create)
- [ ] Role dropdown (Owner, Manager, Cashier, Kitchen)
- [ ] Outlet dropdown
- [ ] Active/Inactive toggle
- [ ] Save button

**Reset Password Modal:**
- [ ] New password input
- [ ] Confirm password input
- [ ] Generate random password button
- [ ] Save button

**Mock Data (15 users):**
```javascript
const mockUsers = [
  { id: 1, name: "Owner", email: "owner@kebuliutsman.com", role: "Owner", outlet: "All", lastLogin: "2025-11-14 10:30" },
  { id: 2, name: "Kasir 1", email: "kasir1@kebuli.com", role: "Cashier", outlet: "Main Store", lastLogin: "2025-11-14 09:15" },
  // ... 13 more
]
```

---

#### Task 2.4: Outlet Management Page
**File:** `frontend/src/pages/OutletManagementPage.tsx`
**Route:** `/owner/outlets`

**UI Components:**
- [ ] Header with "Add New Outlet" button
- [ ] Outlet cards grid (card view, not table)
  - Card shows: Outlet name, address, phone, status, active users, active products
  - Actions: Edit, Settings, View Stats, Deactivate

**Add/Edit Outlet Modal:**
- [ ] Outlet Name input
- [ ] Address textarea
- [ ] Phone input
- [ ] Email input
- [ ] NPWP input (tax ID)
- [ ] Active/Inactive toggle
- [ ] Save button

**Outlet Settings Modal:**
- [ ] Tax Rate input (%)
- [ ] Tax Name input (e.g., "PB1")
- [ ] Service Charge input (%)
- [ ] Currency dropdown (IDR, USD, etc)
- [ ] Receipt Header textarea
- [ ] Receipt Footer textarea
- [ ] Save button

**Mock Data (3 outlets):**
```javascript
const mockOutlets = [
  { id: 1, name: "Main Store", address: "Jl. Sudirman No. 123", phone: "021-1234567", status: "Active", users: 5, products: 45 },
  { id: 2, name: "Branch Kemang", address: "Jl. Kemang Raya 45", phone: "021-7654321", status: "Active", users: 3, products: 40 },
  { id: 3, name: "Branch BSD", address: "BSD City Blok A", phone: "021-9999888", status: "Inactive", users: 0, products: 0 },
]
```

---

#### Task 2.5: Reports & Analytics Page
**File:** `frontend/src/pages/ReportsPage.tsx`
**Route:** `/owner/reports`

**UI Components:**

**Filters Panel:**
- [ ] Date range picker (From - To)
- [ ] Outlet selector
- [ ] Report type dropdown
- [ ] Export buttons (PDF, Excel, Print)

**Tab Navigation:**
- [ ] Sales Report
- [ ] Product Performance
- [ ] Category Performance
- [ ] Cashier Performance
- [ ] Payment Methods

**Tab 1: Sales Report**
- [ ] Summary cards (Total Sales, Total Transactions, Avg Transaction)
- [ ] Sales chart (daily breakdown)
- [ ] Sales table (date, transactions, total, growth %)

**Tab 2: Product Performance**
- [ ] Top 10 products table (product, sold qty, revenue, profit)
- [ ] Product sales chart (bar chart)
- [ ] Worst performing products (bottom 5)

**Tab 3: Category Performance**
- [ ] Sales by category pie chart
- [ ] Category table (category, items sold, revenue, % of total)

**Tab 4: Cashier Performance**
- [ ] Cashier leaderboard table (cashier, transactions, total sales, avg transaction)
- [ ] Hourly performance chart

**Tab 5: Payment Methods**
- [ ] Payment method breakdown pie chart
- [ ] Payment table (method, count, total amount, % of total)

**Use Mock Data / Recharts**

---

#### Task 2.6: Settings Page
**File:** `frontend/src/pages/SettingsPage.tsx`
**Route:** `/owner/settings`

**UI Components (Tab-based):**

**Tab 1: Business Information**
- [ ] Business name input (from tenant)
- [ ] Owner name input
- [ ] Email input
- [ ] Phone input
- [ ] Address textarea
- [ ] Logo upload
- [ ] Save button

**Tab 2: Tax & Charges**
- [ ] Enable Tax toggle
- [ ] Tax Rate input (%)
- [ ] Tax Name input
- [ ] Enable Service Charge toggle
- [ ] Service Charge Rate input (%)
- [ ] Save button

**Tab 3: Receipt Settings**
- [ ] Receipt Header textarea
- [ ] Receipt Footer textarea
- [ ] Show Logo on Receipt toggle
- [ ] Thermal Printer Width dropdown (58mm, 80mm)
- [ ] Preview Receipt button
- [ ] Save button

**Tab 4: Notifications**
- [ ] Email notifications toggle
- [ ] Low stock alerts toggle
- [ ] Daily sales report email toggle
- [ ] WhatsApp notifications toggle (future)
- [ ] Save button

**Tab 5: System Preferences**
- [ ] Currency dropdown (IDR, USD)
- [ ] Date format dropdown (DD/MM/YYYY, MM/DD/YYYY)
- [ ] Time format dropdown (24h, 12h)
- [ ] Timezone dropdown
- [ ] Language dropdown (English, Indonesia)
- [ ] Save button

**Tab 6: Change Password**
- [ ] Current password input
- [ ] New password input
- [ ] Confirm password input
- [ ] Change password button

---

#### Task 2.7: Owner Layout & Navigation
**File:** `frontend/src/components/owner/OwnerLayout.tsx`

**UI Components:**
- [ ] Sidebar navigation
  - Dashboard
  - Employees
  - Users
  - Outlets
  - Products (link to existing page)
  - Reports
  - Settings
  - Go to POS (link to cashier page)
  - Logout
- [ ] Top header
  - Current outlet selector
  - Notifications bell icon
  - User profile dropdown
- [ ] Main content area
- [ ] Responsive mobile menu

---

### PHASE 3: ROUTING & AUTHENTICATION 🔥

#### Task 3.1: Setup Routing for All Roles
**File:** `frontend/src/App.tsx` or router file

**Routes to Add:**

```javascript
// Admin Routes
/admin/login
/admin/dashboard (or /admin)
/admin/tenants
/admin/analytics
/admin/billing

// Owner Routes
/owner/dashboard (or /dashboard)
/owner/employees
/owner/users
/owner/outlets
/owner/products
/owner/reports
/owner/settings

// Cashier Routes
/cashier (or /pos) - already exists
/login - general login (redirect based on role)
```

**Protected Routes:**
- [ ] Admin routes → require admin role
- [ ] Owner routes → require owner/admin role
- [ ] Cashier routes → require cashier/owner/admin role

---

#### Task 3.2: Role-Based Login & Redirect
**File:** `frontend/src/pages/LoginPage.tsx` or auth service

**Login Logic:**
```javascript
// After successful login, check user role:
if (role === 'admin') {
  navigate('/admin/dashboard')
} else if (role === 'owner') {
  navigate('/owner/dashboard')
} else if (role === 'cashier') {
  navigate('/cashier')
}
```

**Create Test Users in DB (mock or seed):**
```sql
-- Admin user
INSERT INTO users (email, password_hash, name, role_id) VALUES
('admin@mypos.com', 'hashed_admin123', 'Super Admin', 1);

-- Owner user (already exists)
-- owner@kebuliutsman.com / password123

-- Cashier user
INSERT INTO users (email, password_hash, name, role_id, tenant_id, outlet_id) VALUES
('kasir@kebuli.com', 'hashed_kasir123', 'Kasir 1', 3, 1, 1);
```

---

#### Task 3.3: Role Guard / Route Protection
**File:** `frontend/src/components/auth/RoleGuard.tsx`

**Component:**
```javascript
// Protect routes based on user role
<RoleGuard allowedRoles={['admin']}>
  <AdminDashboard />
</RoleGuard>

<RoleGuard allowedRoles={['owner', 'admin']}>
  <OwnerDashboard />
</RoleGuard>

<RoleGuard allowedRoles={['cashier', 'owner', 'admin']}>
  <CashierPage />
</RoleGuard>
```

---

## 📋 IMPLEMENTATION CHECKLIST

### PHASE 1: ADMIN FRONTEND ✅
- [ ] Task 1.1: Admin Login Page
- [ ] Task 1.2: Admin Layout & Navigation
- [ ] Task 1.3: Tenant Management Page (with mock data)
- [ ] Task 1.4: System Analytics Page (with mock charts)
- [ ] Task 1.5: Billing Management Page (with mock data)

### PHASE 2: OWNER FRONTEND ✅
- [ ] Task 2.1: Owner Dashboard Page (rebuild with charts)
- [ ] Task 2.2: Employee Management Page (with mock data)
- [ ] Task 2.3: User Management Page (with mock data)
- [ ] Task 2.4: Outlet Management Page (with mock data)
- [ ] Task 2.5: Reports & Analytics Page (with mock charts)
- [ ] Task 2.6: Settings Page (all tabs)
- [ ] Task 2.7: Owner Layout & Navigation

### PHASE 3: ROUTING & AUTH ✅
- [ ] Task 3.1: Setup all routes
- [ ] Task 3.2: Role-based login redirect
- [ ] Task 3.3: Route protection by role

### PHASE 4: BACKEND (AFTER UI COMPLETE) ⏳
- [ ] Fix transaction API
- [ ] Create dashboard analytics API
- [ ] Create employee API
- [ ] Create user management API
- [ ] Create outlet API
- [ ] Create reports API
- [ ] Create admin tenant API
- [ ] Create admin analytics API
- [ ] Create billing API

---

## 🎯 SUCCESS CRITERIA (FRONTEND)

### Admin Role ✅
- [ ] Can login at /admin/login
- [ ] Can see tenant list (mock data ok)
- [ ] Can see "Add Tenant" form (doesn't need to save)
- [ ] Can see system analytics page with charts
- [ ] Can see billing management page
- [ ] All navigation works

### Owner Role ✅
- [ ] Can login and redirect to owner dashboard
- [ ] Can see dashboard with charts (mock data ok)
- [ ] Can see employee management page
- [ ] Can see user management page
- [ ] Can see outlet management page
- [ ] Can see reports page with charts
- [ ] Can see settings page (all tabs)
- [ ] All navigation works

### Cashier Role ✅
- [ ] Can login and redirect to POS
- [ ] POS interface works (already done ✅)
- [ ] Can only access POS (blocked from owner pages)

### All Roles ✅
- [ ] Login redirects to correct page based on role
- [ ] Logout works
- [ ] Navigation restricted by role
- [ ] UI is responsive (mobile-friendly)

---

## 📦 REQUIRED DEPENDENCIES

```bash
# If not already installed:
npm install recharts          # For charts
npm install react-router-dom  # For routing
npm install lucide-react      # For icons
npm install date-fns          # For date formatting
```

---

## 🚀 EXECUTION ORDER

**Start Here:**
1. Install dependencies (if needed)
2. Create admin pages (Phase 1) - 5 pages
3. Create owner pages (Phase 2) - 6 pages
4. Setup routing (Phase 3)
5. Test all 3 roles can login and navigate

**Later (After UI Complete):**
6. Connect to real backend APIs (Phase 4)

---

## 📝 NOTES

**For Mock Data:**
- Use dummy/hardcoded data in components
- Mock charts with sample datasets
- Forms don't need to save (can just show success toast)
- Focus on UI/UX complete, not functionality

**For Charts:**
- Use Recharts library
- Sample data is fine
- Make it look good visually

**For Tables:**
- Mock data arrays in component state
- Pagination can be frontend-only
- Search/filter can be simple array filter

---

**Last Updated:** 14 November 2025
**Current Focus:** Frontend UI Complete First
**Next Action:** Start PHASE 1 - Build Admin Pages

