# MyPOS Database Setup Guide

## 🚀 Quick Setup untuk Presentasi Klien

### Option 1: Gunakan PostgreSQL yang Sudah Ada

Jika Anda sudah punya PostgreSQL running, ikuti langkah ini:

#### 1. Update .env dengan kredensial database Anda

Edit file `backend/.env`:

```env
# Ganti dengan kredensial PostgreSQL Anda
DATABASE_URL=postgresql://username:password@localhost:5432/mypos

# Contoh:
# DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/mypos
```

#### 2. Jalankan migration SQL

Buka PostgreSQL CLI (psql) atau GUI tool (pgAdmin, DBeaver):

```bash
# Via psql
psql -U postgres -d mypos -f database/prisma_migration.sql

# Atau copy-paste isi file ke pgAdmin Query Tool
```

#### 3. Jalankan seed data

```bash
psql -U postgres -d mypos -f database/seed_data.sql
```

### Option 2: Setup dari Awal (PostgreSQL Belum Ada)

#### 1. Install PostgreSQL

Download dari: https://www.postgresql.org/download/windows/

Atau install via Chocolatey:
```bash
choco install postgresql
```

#### 2. Create Database

```bash
# Login ke PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE mypos;

# Exit
\q
```

#### 3. Jalankan Migration & Seed

```bash
cd "C:\Users\Administrator\Documents\projek web\posduplicate"

# Run migration
psql -U postgres -d mypos -f database/prisma_migration.sql

# Run seed
psql -U postgres -d mypos -f database/seed_data.sql
```

### Option 3: Gunakan Docker (Recommended)

#### 1. Install Docker Desktop untuk Windows

Download: https://www.docker.com/products/docker-desktop/

#### 2. Jalankan PostgreSQL Container

```bash
cd "C:\Users\Administrator\Documents\projek web\posduplicate"

# Start PostgreSQL
docker run --name mypos-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=mypos -p 5432:5432 -d postgres:15

# Wait 5 seconds for PostgreSQL to start
timeout /t 5

# Run migration
docker exec -i mypos-postgres psql -U postgres -d mypos < database/prisma_migration.sql

# Run seed
docker exec -i mypos-postgres psql -U postgres -d mypos < database/seed_data.sql
```

#### 3. Update .env

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/mypos
```

## 🔑 Login Credentials (Password: password123)

Setelah seed data berhasil, gunakan credentials ini untuk login:

**Kebuli Utsman Restaurant:**
- Owner: `owner@kebuliutsman.com` / `password123`
- Kasir: `kasir@kebuliutsman.com` / `password123`

**Kopi Kita Cafe:**
- Owner: `owner@kopikita.com` / `password123`
- Kasir: `kasir@kopikita.com` / `password123`

## ✅ Verifikasi Setup

### 1. Cek Database

```bash
psql -U postgres -d mypos

# Di dalam psql:
\dt                    # List all tables
SELECT COUNT(*) FROM users;      # Should return 4
SELECT COUNT(*) FROM items;      # Should return 8
SELECT COUNT(*) FROM categories; # Should return 4
\q
```

### 2. Test Backend

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Start server
npm run dev
```

Server akan berjalan di: http://localhost:3000

### 3. Test Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Get products (no auth required)
curl http://localhost:3000/api/products

# Get categories (no auth required)
curl http://localhost:3000/api/categories

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"owner@kebuliutsman.com\",\"password\":\"password123\"}"
```

### 4. Test Frontend

```bash
cd frontend
npm run dev
```

Frontend akan berjalan di: http://localhost:5173

Login dengan credentials di atas.

## 🔧 Troubleshooting

### Error: "operation not permitted" saat prisma generate

**Solusi:** Stop backend server terlebih dahulu, lalu:

```bash
cd backend
npx prisma generate
```

### Error: "Authentication failed"

**Solusi:** Cek kredensial di `.env` file:

```bash
# Test koneksi
psql -U postgres -d mypos -c "SELECT 1"

# Jika berhasil, update DATABASE_URL di .env dengan kredensial yang sama
```

### Error: "Database does not exist"

**Solusi:** Create database terlebih dahulu:

```bash
psql -U postgres -c "CREATE DATABASE mypos"
```

### Items/Products tidak muncul di frontend

**Solusi:** Pastikan seed data sudah di-run:

```bash
psql -U postgres -d mypos -f database/seed_data.sql

# Verify
psql -U postgres -d mypos -c "SELECT COUNT(*) FROM items"
```

## 📊 Database Schema

Sistem ini menggunakan **Multi-Tenant Architecture**:

- **Tenants** - Business/Companies (Kebuli Utsman, Kopi Kita)
- **Outlets** - Physical locations/branches
- **Users** - Employees dengan role-based access
- **Items** - Products/Menu items (sebelumnya 'products')
- **Categories** - Product categories
- **Transactions** - Orders/Sales
- **Payments** - Payment records

## 🎯 Ready untuk Presentasi

Setelah semua langkah di atas berhasil:

1. ✅ Backend running di `http://localhost:3000`
2. ✅ Frontend running di `http://localhost:5173`
3. ✅ Database sudah terisi dengan sample data
4. ✅ Bisa login dengan credentials di atas
5. ✅ Products dan Categories tampil di Cashier page

**DEMO FLOW:**
1. Buka `http://localhost:5173`
2. Login dengan `owner@kebuliutsman.com` / `password123`
3. Pilih products di Cashier page
4. Add to cart
5. Process payment
6. Transaction berhasil!

Good luck dengan presentasi! 🚀
