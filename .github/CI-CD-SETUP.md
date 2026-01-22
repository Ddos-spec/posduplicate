# CI/CD Pipeline Documentation

## Overview

Pipeline CI/CD ini auto-run setiap kali ada **push** atau **pull request** ke branch `main`/`master`. Pipeline akan mengecek semua modul untuk memastikan tidak ada yang broken.

## Pipeline Jobs

### 1. ✅ Lint & TypeScript Check
**Duration:** ~1-2 menit

- ESLint code quality check
- TypeScript compilation check (tanpa emit)
- Detect syntax errors & type issues

**Fail Conditions:**
- ESLint errors (critical)
- TypeScript compilation errors

---

### 2. 🧪 Unit Tests
**Duration:** ~1-2 menit

- Test isolated functions & controllers
- Mock dependencies (Prisma, bcrypt, JWT)
- Fast execution (no DB needed)

**Test Coverage:**
- Auth (login, register)
- Products
- Customers
- Inventory deduction
- Accounting
- Social media

**Fail Conditions:**
- Any unit test fails

---

### 3. 🔗 Integration Tests
**Duration:** ~2-3 menit

- Test with real PostgreSQL database
- Test API endpoints end-to-end
- Test database interactions

**Database Setup:**
- PostgreSQL 15 (Docker container)
- Auto-migration via Prisma
- Isolated test database

**Fail Conditions:**
- Database connection fails
- Migration fails
- Any integration test fails

---

### 4. 🏗️ Build Check
**Duration:** ~1-2 menit

- Compile TypeScript to JavaScript
- Verify build output exists
- Check for build errors

**Fail Conditions:**
- TypeScript compilation fails
- `dist/server.js` not generated

---

### 5. 🔥 Smoke Tests - All Modules
**Duration:** ~3-5 menit

**Comprehensive testing of ALL modules:**

#### Core Endpoints
- ✅ `GET /` - Root API info
- ✅ `GET /health` - Health check
- ✅ `GET /api-docs` - Swagger UI

#### Auth Module
- ✅ `POST /api/auth/login`
- ✅ `GET /api/auth/me`

#### FnB Module (10 endpoints)
- ✅ `GET /api/products`
- ✅ `GET /api/categories`
- ✅ `GET /api/transactions`
- ✅ `GET /api/inventory`
- ✅ `GET /api/customers`
- ✅ `GET /api/suppliers`
- ✅ `GET /api/expenses`
- ✅ `GET /api/analytics`
- ✅ `GET /api/dashboard`

#### Accounting Module (4 endpoints)
- ✅ `GET /api/accounting/coa`
- ✅ `GET /api/accounting/journal`
- ✅ `GET /api/accounting/reports/balance-sheet`
- ✅ `GET /api/accounting/dashboard`

#### Admin Module
- ✅ `GET /api/admin/analytics/summary` (requires super admin)

#### Shared Module
- ✅ `GET /api/tenants`
- ✅ `GET /api/users`
- ✅ `GET /api/outlets`

#### Social Media Module
- ✅ `GET /api/medsos/accounts`
- ✅ `GET /api/medsos/posts`

#### Error Handling
- ✅ 404 for non-existent routes
- ✅ 401 for missing auth
- ✅ 401 for invalid token

**Fail Conditions:**
- Any endpoint returns unexpected status
- Any module crashes
- Database connection fails

---

### 6. 🔒 Security Audit
**Duration:** ~30 detik

- Run `npm audit` for dependency vulnerabilities
- Check for high/critical severity issues

**Fail Conditions:**
- Critical vulnerabilities found (configurable)

---

## Workflow Status

### ✅ Success
Semua jobs berhasil → Commit aman untuk deploy.

### ❌ Failure
Ada job yang gagal → Fix errors sebelum merge.

**GitHub akan:**
- ❌ Block pull request merge (jika configured)
- 📧 Email notification ke contributor
- 💬 Comment di PR dengan error details

---

## Local Testing

### Run All Tests Locally
```bash
cd backend

# 1. Lint
npm run lint

# 2. TypeScript check
npx tsc --noEmit

# 3. Unit tests
npm run test:unit

# 4. Integration tests (need PostgreSQL)
npm run test:integration

# 5. Smoke tests (need PostgreSQL + .env)
npm run test:smoke

# 6. Build
npm run build

# 7. Security audit
npm audit
```

### Quick Verification
```bash
npm run verify
# Runs: lint + typecheck + all tests
```

---

## Environment Variables

Pipeline otomatis set environment variables untuk testing:

```env
NODE_ENV=test
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/mypos_test
JWT_SECRET=test_jwt_secret_for_ci_cd_pipeline_testing_only
ENCRYPTION_KEY=test_encryption_key_for_ci_cd_pipeline_testing_only
PORT=3500
```

**JANGAN** gunakan credentials production di CI/CD!

---

## Troubleshooting

### Job Failed: Lint & TypeScript Check
**Penyebab:**
- ESLint errors
- TypeScript type errors
- Import errors

**Fix:**
```bash
npm run lint:fix
npx tsc --noEmit
```

---

### Job Failed: Unit Tests
**Penyebab:**
- Test logic error
- Mock configuration salah
- Function signature changed

**Fix:**
```bash
npm run test:unit
# Fix failing tests
```

---

### Job Failed: Integration Tests
**Penyebab:**
- Database schema mismatch
- Migration failed
- Endpoint behavior changed

**Fix:**
```bash
# Update migrations
npx prisma migrate dev

# Run integration tests locally
npm run test:integration
```

---

### Job Failed: Build
**Penyebab:**
- TypeScript compilation errors
- Missing dependencies
- Import path errors

**Fix:**
```bash
npm run build
# Fix compilation errors
```

---

### Job Failed: Smoke Tests
**Penyebab:**
- Endpoint broken
- Response format changed
- Database seeding failed

**Fix:**
```bash
# Run smoke tests locally
npm run test:smoke

# Check specific module
jest tests/smoke/all-modules.smoke.test.ts -t "FnB Module"
```

---

## Adding New Tests

### Add Unit Test
```bash
# Create file: backend/tests/unit/your-module.test.ts
```

### Add Smoke Test
Edit `backend/tests/smoke/all-modules.smoke.test.ts`:

```typescript
describe('🆕 New Module', () => {
  test('GET /api/new-endpoint - Should work', async () => {
    const res = await request(app)
      .get('/api/new-endpoint')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

---

## Badge Status

Add to README.md:

```markdown
![CI/CD Status](https://github.com/YOUR_USERNAME/posduplicate/actions/workflows/ci-cd.yml/badge.svg)
```

---

## Performance Optimization

**Current Pipeline Duration:** ~10-15 menit

**Optimization Tips:**
1. Cache `node_modules` (already done ✅)
2. Run jobs in parallel (already done ✅)
3. Skip jobs for specific file changes
4. Use faster test database (consider in-memory SQLite for unit tests)

---

## Maintenance

### Update Dependencies
```bash
npm update
npm audit fix
```

### Update Node Version
Edit `.github/workflows/ci-cd.yml`:
```yaml
node-version: '20'  # Change this
```

### Disable Specific Job
Comment out job in workflow:
```yaml
# security-audit:
#   name: Security Audit
#   ...
```

---

## Summary

✅ **6 Jobs** protecting code quality
✅ **30+ Endpoints** tested automatically
✅ **All Modules** covered (FnB, Accounting, Admin, Shared, Medsos)
✅ **Database** integration tested
✅ **Build** verified
✅ **Security** audited

**Every commit is automatically validated before merge!** 🚀
