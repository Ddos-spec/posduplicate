-- =====================================================
-- Multi-Tenant Migration Script
-- =====================================================
-- Description: Upgrade from single-tenant to multi-tenant SaaS system
-- Version: 2.0
-- =====================================================

-- Step 1: Create Tenants Table
-- =====================================================
-- Tenants = Penyewa/Admin yang sewa platform MyPOS
-- Contoh: Restoran A, Toko B, Cafe C

CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,           -- Nama bisnis penyewa
    owner_name VARCHAR(255) NOT NULL,              -- Nama pemilik bisnis
    email VARCHAR(255) UNIQUE NOT NULL,            -- Email untuk login admin tenant
    phone VARCHAR(50),
    address TEXT,

    -- Subscription Management
    subscription_plan VARCHAR(50) DEFAULT 'basic', -- 'basic', 'pro', 'enterprise'
    subscription_status VARCHAR(50) DEFAULT 'trial', -- 'trial', 'active', 'suspended', 'expired'
    subscription_starts_at TIMESTAMP,
    subscription_expires_at TIMESTAMP,
    max_outlets INTEGER DEFAULT 1,                 -- Batas jumlah outlet per plan
    max_users INTEGER DEFAULT 5,                   -- Batas jumlah users per plan

    -- Billing
    billing_email VARCHAR(255),
    payment_method VARCHAR(50),                    -- 'bank_transfer', 'credit_card', etc
    last_payment_at TIMESTAMP,
    next_billing_date DATE,

    -- Settings per tenant
    settings JSONB DEFAULT '{}'::JSONB,            -- Custom settings per tenant
    features JSONB DEFAULT '{}'::JSONB,            -- Enabled features per plan

    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP                           -- Soft delete
);

-- Indexes untuk performance
CREATE INDEX idx_tenants_email ON tenants(email);
CREATE INDEX idx_tenants_status ON tenants(subscription_status);
CREATE INDEX idx_tenants_active ON tenants(is_active);


-- Step 2: Add tenant_id to outlets
-- =====================================================
-- Setiap outlet sekarang belong to 1 tenant

ALTER TABLE outlets
ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;

-- Index untuk performance
CREATE INDEX IF NOT EXISTS idx_outlets_tenant ON outlets(tenant_id);


-- Step 3: Add tenant_id to users
-- =====================================================
-- User sekarang belong to 1 tenant (data isolation)

ALTER TABLE users
ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;

-- Index untuk performance
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);


-- Step 4: Update roles untuk support Super Admin
-- =====================================================
-- Tambah role Super Admin (platform owner)

INSERT INTO roles (name, permissions)
VALUES ('Super Admin', '{"all": true, "manage_tenants": true, "view_all_data": true}')
ON CONFLICT (name) DO UPDATE
SET permissions = EXCLUDED.permissions;


-- Step 5: Create Audit Log untuk Tenant Activities
-- =====================================================
-- Track aktivitas penting tenant (untuk billing & security)

CREATE TABLE IF NOT EXISTS tenant_audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,                  -- 'login', 'create_outlet', 'subscription_change', etc
    entity_type VARCHAR(100),                      -- 'outlet', 'user', 'transaction', etc
    entity_id INTEGER,
    details JSONB DEFAULT '{}'::JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_audit_tenant ON tenant_audit_logs(tenant_id);
CREATE INDEX idx_tenant_audit_created ON tenant_audit_logs(created_at);


-- Step 6: Create Tenant Subscription History
-- =====================================================
-- Track perubahan subscription & payment

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL,                     -- 'basic', 'pro', 'enterprise'
    status VARCHAR(50) NOT NULL,                   -- 'pending', 'active', 'expired', 'cancelled'
    amount DECIMAL(12, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'IDR',
    billing_cycle VARCHAR(50),                     -- 'monthly', 'yearly'
    starts_at TIMESTAMP,
    expires_at TIMESTAMP,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50),                    -- 'pending', 'paid', 'failed'
    payment_reference VARCHAR(255),                -- Invoice number / receipt
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_subs_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subs_status ON tenant_subscriptions(status);


-- Step 7: Auto-update Triggers
-- =====================================================

-- Trigger untuk updated_at di tenants
CREATE OR REPLACE FUNCTION update_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_tenants_updated_at();


-- Step 8: Add Constraints untuk Data Isolation
-- =====================================================

-- Pastikan user hanya bisa akses outlet dalam tenant yang sama
-- (akan dihandle di application level via middleware)

COMMENT ON COLUMN outlets.tenant_id IS 'Belongs to which tenant (data isolation)';
COMMENT ON COLUMN users.tenant_id IS 'User belongs to this tenant only';
COMMENT ON TABLE tenants IS 'Tenants/Penyewa yang sewa platform MyPOS (SaaS model)';


-- =====================================================
-- Migration Complete
-- =====================================================
-- Next steps:
-- 1. Run seed_multi_tenant.sql untuk sample data
-- 2. Update Prisma schema
-- 3. Implement tenant middleware di backend
-- 4. Test dengan 2 tenant berbeda

