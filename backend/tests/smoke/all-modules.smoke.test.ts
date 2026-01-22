/**
 * Smoke Tests - All Modules
 *
 * Test basic functionality of all modules to ensure nothing is broken.
 * These are HIGH-LEVEL tests that check if endpoints are accessible.
 */

import request from 'supertest';
import app from '../../src/server';
import prisma from '../../src/utils/prisma';

describe('🔥 Smoke Tests - All Modules', () => {
  let authToken: string;
  let testUserId: number;
  let testTenantId: number;
  let testOutletId: number;

  // Setup: Create test user & get auth token
  beforeAll(async () => {
    // Clean up previous test data
    await prisma.users.deleteMany({ where: { email: 'smoke@test.com' } });

    // Create test role if not exists
    let testRole = await prisma.roles.findFirst({ where: { name: 'Owner' } });
    if (!testRole) {
      testRole = await prisma.roles.create({
        data: { name: 'Owner', permissions: {} }
      });
    }

    // Create test tenant
    const tenant = await prisma.tenants.create({
      data: {
        business_name: 'Smoke Test Business',
        owner_name: 'Smoke Tester',
        email: 'smoke-tenant@test.com',
        subscription_status: 'active',
        is_active: true
      }
    });
    testTenantId = tenant.id;

    // Create test outlet
    const outlet = await prisma.outlets.create({
      data: {
        tenant_id: testTenantId,
        name: 'Test Outlet',
        is_active: true
      }
    });
    testOutletId = outlet.id;

    // Create test user
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('testpassword123', 10);

    const user = await prisma.users.create({
      data: {
        email: 'smoke@test.com',
        password_hash: hashedPassword,
        name: 'Smoke Tester',
        role_id: testRole.id,
        tenant_id: testTenantId,
        outlet_id: testOutletId,
        is_active: true
      }
    });
    testUserId = user.id;

    // Login to get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'smoke@test.com', password: 'testpassword123' });

    authToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.users.deleteMany({ where: { email: 'smoke@test.com' } });
    await prisma.outlets.deleteMany({ where: { id: testOutletId } });
    await prisma.tenants.deleteMany({ where: { id: testTenantId } });
    await prisma.$disconnect();
  });

  // ==================== CORE ENDPOINTS ====================
  describe('Core Endpoints', () => {
    test('GET / - Root endpoint should return API info', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('MyPOS');
    });

    test('GET /health - Health check should return OK', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
    });

    test('GET /api-docs - Swagger UI should be accessible', async () => {
      const res = await request(app).get('/api-docs/');
      expect(res.status).toBe(200);
    });
  });

  // ==================== AUTH MODULE ====================
  describe('📦 Shared Module - Auth', () => {
    test('POST /api/auth/login - Login should work', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'smoke@test.com', password: 'testpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    test('GET /api/auth/me - Get current user should work', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('smoke@test.com');
    });
  });

  // ==================== FNB MODULE ====================
  describe('🍔 FnB Module', () => {
    test('GET /api/products - Should fetch products', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/categories - Should fetch categories', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/transactions - Should fetch transactions', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/inventory - Should fetch inventory', async () => {
      const res = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/customers - Should fetch customers', async () => {
      const res = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/suppliers - Should fetch suppliers', async () => {
      const res = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/expenses - Should fetch expenses', async () => {
      const res = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/analytics - Should fetch analytics', async () => {
      const res = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/dashboard - Should fetch dashboard', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== ACCOUNTING MODULE ====================
  describe('💰 Accounting Module', () => {
    test('GET /api/accounting/coa - Should fetch Chart of Accounts', async () => {
      const res = await request(app)
        .get('/api/accounting/coa')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/accounting/journal - Should fetch journal entries', async () => {
      const res = await request(app)
        .get('/api/accounting/journal')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/accounting/reports/balance-sheet - Should fetch balance sheet', async () => {
      const res = await request(app)
        .get('/api/accounting/reports/balance-sheet')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400]).toContain(res.status); // May require date params
    });

    test('GET /api/accounting/dashboard - Should fetch accounting dashboard', async () => {
      const res = await request(app)
        .get('/api/accounting/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== ADMIN MODULE ====================
  describe('⚙️ Admin Module', () => {
    test('GET /api/admin/analytics/summary - Admin analytics should require super admin', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/summary')
        .set('Authorization', `Bearer ${authToken}`);

      // Should fail for non-super-admin
      expect(res.status).toBe(403);
    });
  });

  // ==================== SHARED MODULE ====================
  describe('🔧 Shared Module', () => {
    test('GET /api/tenants - Should fetch tenants', async () => {
      const res = await request(app)
        .get('/api/tenants')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 403]).toContain(res.status); // May require super admin
    });

    test('GET /api/users - Should fetch users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/outlets - Should fetch outlets', async () => {
      const res = await request(app)
        .get('/api/outlets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== MEDSOS MODULE ====================
  describe('📱 Social Media Module', () => {
    test('GET /api/medsos/accounts - Should fetch social accounts', async () => {
      const res = await request(app)
        .get('/api/medsos/accounts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('GET /api/medsos/posts - Should fetch social posts', async () => {
      const res = await request(app)
        .get('/api/medsos/posts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==================== ERROR HANDLING ====================
  describe('❌ Error Handling', () => {
    test('GET /api/nonexistent - Should return 404 for non-existent routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('Protected routes should return 401 without auth', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(401);
    });

    test('Invalid auth token should return 401', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', 'Bearer invalid_token');
      expect(res.status).toBe(401);
    });
  });
});
