# 🔐 Admin User Setup - Quick Guide

## ✅ Files Created

Saya sudah membuatkan **4 files** untuk setup admin user:

### 1. **Backend Script (RECOMMENDED)** ⭐
**File:** `backend/src/scripts/create-admin-prisma.ts`

**Cara pakai:**
```bash
cd backend
npm run create:admin
```

**Output:**
```
🚀 Starting admin user creation...
📋 Step 1: Creating/Getting Super Admin role...
✅ Role created/updated: Super Admin (ID: 1)
🔐 Step 2: Hashing password...
✅ Password hashed successfully
👤 Step 3: Creating/Updating admin user...
✅ Admin user created/updated successfully!
🔍 Step 4: Verifying admin user...

✅ VERIFICATION SUCCESSFUL!
==========================================
📧 Login Credentials:
==========================================
URL:      http://localhost:5173/admin/login
Email:    admin@mypos.com
Password: admin123
==========================================
```

---

### 2. **SQL Query Files** (Alternative)

**File 1:** `database/insert_admin.sql` - Lengkap dengan dokumentasi
**File 2:** `database/insert_admin_simple.sql` - Versi simple

**Cara pakai:**
```bash
psql -h localhost -U your_user -d your_database -f database/insert_admin_simple.sql
```

---

### 3. **Password Hash Generator**
**File:** `database/generate_password_hash.js`

**Cara pakai:**
```bash
cd database
node generate_password_hash.js
```

**Output:**
```
Admin Password:
  Plain: admin123
  Hash:  $2b$10$xQMKl5q7YP8Y5Z5Z5Z5Z5uO8Y5Z5Z5Z5...
```

---

### 4. **Complete Documentation**
**File:** `database/README_ADMIN_SETUP.md`

Dokumentasi lengkap dengan:
- ✅ 3 cara berbeda setup admin
- ✅ Troubleshooting guide
- ✅ Verification queries
- ✅ Testing steps
- ✅ Security notes

---

## 🚀 Quick Start (Pilih Salah Satu)

### Option A: Backend Script (Paling Mudah) ⭐

```bash
cd backend
npm run create:admin
```

✅ Otomatis create role
✅ Otomatis hash password
✅ Otomatis verify
✅ Siap pakai!

---

### Option B: SQL Manual

1. **Generate hash:**
   ```bash
   cd database
   node generate_password_hash.js
   ```

2. **Copy hash dan execute SQL:**
   ```bash
   psql -d your_database -f database/insert_admin.sql
   ```

---

## 🧪 Testing

### 1. Test Admin Login
```
URL:      http://localhost:5173/admin/login
Email:    admin@mypos.com
Password: admin123
```

### 2. Seharusnya Redirect Ke:
```
/admin/dashboard
```

### 3. Check Menu:
- ✅ Dashboard
- ✅ Tenant Management (10 mock tenants)
- ✅ System Analytics (charts)
- ✅ Billing (3 tabs)

---

## 📊 Database Structure

```sql
-- Role yang dibuat:
INSERT INTO roles (name, permissions)
VALUES ('Super Admin', '{"full_access": true}');

-- User yang dibuat:
INSERT INTO users (
  email,
  password_hash,
  name,
  role_id,
  tenant_id,  -- NULL (super admin tidak punya tenant)
  outlet_id,  -- NULL (super admin tidak terikat outlet)
  is_active
)
VALUES (
  'admin@mypos.com',
  '$2b$10$...', -- bcrypt hash untuk 'admin123'
  'Super Admin',
  1, -- role_id dari table roles
  NULL,
  NULL,
  true
);
```

---

## 🔍 Verification Query

Cek apakah admin sudah dibuat dengan benar:

```sql
SELECT
  u.id,
  u.email,
  u.name,
  r.name as role_name,
  u.tenant_id,
  u.outlet_id,
  u.is_active
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.email = 'admin@mypos.com';
```

**Expected Result:**
```
 id |      email        |    name      |  role_name  | tenant_id | outlet_id | is_active
----+-------------------+--------------+-------------+-----------+-----------+-----------
  1 | admin@mypos.com   | Super Admin  | Super Admin |    NULL   |   NULL    |     t
```

Key checks:
- ✅ `tenant_id` = NULL
- ✅ `outlet_id` = NULL
- ✅ `role_name` = "Super Admin"
- ✅ `is_active` = true

---

## 📁 All Files Summary

```
backend/
└── src/scripts/
    ├── create-admin-prisma.ts     ⭐ RECOMMENDED
    └── create-admin.ts            (SQL version - optional)

backend/package.json
└── scripts:
    └── "create:admin"             ← Jalankan dengan: npm run create:admin

database/
├── insert_admin.sql               Full SQL with docs
├── insert_admin_simple.sql        Simple SQL
├── generate_password_hash.js      Password hasher
└── README_ADMIN_SETUP.md          Complete guide

ADMIN_SETUP_SUMMARY.md             ← File ini (Quick reference)
```

---

## 🎯 Next Steps

1. ✅ **Jalankan script:** `npm run create:admin`
2. ✅ **Test login:** http://localhost:5173/admin/login
3. ✅ **Verify menu:** Dashboard, Tenants, Analytics, Billing
4. ✅ **Test create tenant:** Add new tenant dari admin panel
5. 🔄 **Connect backend:** Replace mock data dengan real API

---

## ❗ Important Notes

1. **Password Default:** `admin123` - GANTI setelah first login di production!
2. **Tenant ID:** Super Admin tidak punya `tenant_id` (NULL)
3. **Outlet ID:** Super Admin tidak terikat `outlet_id` (NULL)
4. **Role Name:** Harus exact "Super Admin" untuk role detection
5. **Backend Detect:** `LoginPage.tsx` line 35-36 check role name

---

## 🆘 Troubleshooting

### Q: "Invalid credentials" saat login?
**A:** Password belum di-hash atau hash tidak cocok.
- Jalankan ulang: `npm run create:admin`

### Q: "User not found"?
**A:** Admin user belum dibuat di database.
- Execute: `npm run create:admin`

### Q: Login berhasil tapi redirect ke `/owner/dashboard` bukan `/admin/dashboard`?
**A:** Backend tidak mendeteksi role "Super Admin".
- Check: `LoginPage.tsx` line 35-36
- Verify: Role name di database = "Super Admin" (case-sensitive)

---

## 📞 Support

Jika ada masalah, check files berikut untuk detail:
1. `database/README_ADMIN_SETUP.md` - Complete guide
2. `backend/src/scripts/create-admin-prisma.ts` - Script source code
3. `frontend/src/pages/LoginPage.tsx` - Login logic (line 32-45)

---

**Created:** 14 November 2025
**Status:** ✅ Ready to Use
**Recommendation:** Use `npm run create:admin` (Easiest way)
