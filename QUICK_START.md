# 🚀 MyPOS - Quick Start Guide

## ✅ Status: MVP COMPLETE!

✅ **Database**: Multi-tenant schema ready
✅ **Backend API**: 13 endpoints - All complete
✅ **Frontend React**: Cashier POS + Admin Dashboard - Complete
✅ **Production Build**: Ready to deploy

---

## 🏃 Start Development (3 Steps)

### Step 1: Database Setup (2 minutes)

```bash
# Create database
psql -U postgres
CREATE DATABASE mypos;
\q

# Run multi-tenant migration
psql -U postgres -d mypos -f database/migration_multi_tenant.sql

# Load seed data
psql -U postgres -d mypos -f database/seed_multi_tenant.sql
```

### Step 2: Backend Setup (2 minutes)

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Start server
npm run dev
```

✅ **Backend running at:** `http://localhost:3000`

### Step 3: Frontend Setup (2 minutes)

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Start dev server
npm run dev
```

✅ **Frontend running at:** `http://localhost:5173`

---

## 🔑 Demo Login Credentials

### Owner Account
- **Email:** `owner@kebuliutsman.com`
- **Password:** `password123`
- **Access:** Full admin + cashier

### Cashier Account
- **Email:** `kasir@kebuliutsman.com`
- **Password:** `password123`
- **Access:** Cashier POS only

### Super Admin
- **Email:** `superadmin@mypos.com`
- **Password:** `password123`
- **Access:** All tenants + platform management

---

## 🎯 What You Can Do Right Now

### 1. Login to Cashier POS
1. Go to `http://localhost:5173`
2. Login with cashier credentials
3. Click products to add to cart
4. Adjust quantities (+/-)
5. Click "Checkout"
6. Enter payment amount
7. Complete transaction!

### 2. View Admin Dashboard
1. Login with owner credentials
2. Navigate to Admin Dashboard
3. See sales statistics
4. View recent transactions
5. Check top products

### 3. Test Backend APIs

```bash
# Health check
curl http://localhost:3000/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@kebuliutsman.com","password":"password123"}'

# Get products
curl http://localhost:3000/api/products

# Get categories
curl http://localhost:3000/api/categories
```

---

## 📋 Complete API List

### 🔐 Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Get user info
- `POST /api/auth/change-password` - Change password

### 🏢 Tenants (Super Admin)
- `GET /api/tenants` - List all tenants
- `GET /api/tenants/:id` - Get tenant
- `POST /api/tenants` - Create tenant
- `PUT /api/tenants/:id` - Update tenant
- `PATCH /api/tenants/:id/status` - Toggle status
- `PATCH /api/tenants/:id/subscription` - Update subscription
- `DELETE /api/tenants/:id` - Delete tenant
- `GET /api/tenants/me` - Get my tenant info

### 📦 Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### 📂 Categories
- `GET /api/categories` - List categories
- `GET /api/categories/:id` - Get category
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### 💳 Transactions
- `GET /api/transactions` - List transactions
- `GET /api/transactions/:id` - Get transaction
- `POST /api/transactions` - Create transaction
- `POST /api/transactions/hold` - Hold order
- `GET /api/transactions/held` - Get held orders
- `PUT /api/transactions/:id/status` - Update status

### 🪑 Tables
- `GET /api/tables` - List tables
- `GET /api/tables/available` - Available tables
- `POST /api/tables` - Create table
- `PUT /api/tables/:id/status` - Update table status

### 📦 Inventory
- `GET /api/inventory` - List inventory
- `GET /api/inventory/low-stock` - Low stock alerts
- `GET /api/inventory/movements` - Stock movements
- `POST /api/inventory/adjust` - Adjust stock

### 👥 Customers
- `GET /api/customers` - List customers
- `GET /api/customers/:id` - Get customer
- `GET /api/customers/:id/transactions` - Customer transactions
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### 👨‍💼 Employees
- `GET /api/employees` - List employees
- `GET /api/employees/:id` - Get employee
- `GET /api/employees/:id/shifts` - Employee shifts
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### 🔧 Additional APIs
- Modifiers: `GET|POST|PUT|DELETE /api/modifiers`
- Variants: `GET|POST|PUT|DELETE /api/variants`
- Ingredients: `GET|POST|PUT|DELETE /api/ingredients`
- Suppliers: `GET|POST|PUT|DELETE /api/suppliers`

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check .env file exists
ls backend/.env

# Regenerate Prisma client
cd backend
npx prisma generate
```

### Frontend build errors
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Database connection error
```bash
# Check PostgreSQL is running
psql -U postgres

# Update DATABASE_URL in backend/.env
DATABASE_URL="postgresql://postgres:password@localhost:5432/mypos"
```

### Port already in use
```bash
# Change port in backend/.env
PORT=3001

# Change port in frontend/.env
VITE_API_URL=http://localhost:3001/api
```

---

## 🚀 Production Deployment

### Build Frontend
```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Start Backend (Production)
```bash
cd backend
npm install
npx prisma generate
NODE_ENV=production npm start
```

### Using PM2
```bash
cd backend
npm install -g pm2
pm2 start npm --name "mypos-api" -- start
pm2 save
pm2 startup
```

See `DEPLOYMENT.md` for full production setup.

---

## 📊 Test the Full Flow

### Complete Checkout Test
1. Open `http://localhost:5173`
2. Login with: `owner@kebuliutsman.com` / `password123`
3. Click "Cashier" in sidebar
4. Select category "Makanan"
5. Click "Nasi Goreng" (adds to cart)
6. Click "Ayam Bakar" (adds to cart)
7. Adjust quantity using +/- buttons
8. Click "Checkout" button
9. Select payment method: Cash
10. Enter cash received: 100000
11. See change calculation
12. Click "Confirm Payment"
13. ✅ Transaction complete!
14. Check admin dashboard for statistics

---

## 🎉 What's Working

- ✅ Login/Logout with JWT
- ✅ Product catalog with categories
- ✅ Shopping cart (add, remove, quantities)
- ✅ Checkout & payment processing
- ✅ Multi-tenant data isolation
- ✅ Role-based access control
- ✅ Admin dashboard with stats
- ✅ Responsive UI with Tailwind
- ✅ Production build optimized

---

## 📞 Need Help?

- **Full Docs:** `README.md`
- **Deployment:** `DEPLOYMENT.md`
- **Progress:** `IMPLEMENTATION_STATUS.md`
- **Complete Summary:** `PROJECT_COMPLETE.md`

---

**Status:** ✅ MVP COMPLETE - Ready to Launch!
**Last Updated:** November 13, 2025
**Version:** 1.0.0-MVP

🚀 **LET'S MAKE MONEY!** 💰
