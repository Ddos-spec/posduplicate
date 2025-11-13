-- =====================================================
-- Multi-Tenant Seed Data
-- =====================================================
-- Sample data dengan 2 tenant berbeda untuk testing

-- Insert Super Admin role (if not exists)
INSERT INTO roles (name, permissions) VALUES
('Super Admin', '{"all": true, "manage_tenants": true}')
ON CONFLICT (name) DO NOTHING;

-- Insert Tenants
INSERT INTO tenants (
  business_name,
  owner_name,
  email,
  phone,
  subscription_plan,
  subscription_status,
  subscription_starts_at,
  subscription_expires_at,
  max_outlets,
  max_users
) VALUES
-- Tenant 1: Restoran Kebuli
('Kebuli Utsman Restaurant', 'Jordan Utsman', 'admin@kebuliutsman.com', '+62 812-3456-7890', 'pro', 'active', NOW(), NOW() + INTERVAL '365 days', 5, 20),

-- Tenant 2: Coffee Shop
('Kopi Kita Cafe', 'Budi Santoso', 'admin@kopikita.com', '+62 813-9876-5432', 'basic', 'trial', NOW(), NOW() + INTERVAL '14 days', 1, 5);

-- Get tenant IDs
DO $$
DECLARE
  tenant1_id INT;
  tenant2_id INT;
  role_superadmin_id INT;
  role_owner_id INT;
  role_manager_id INT;
  role_cashier_id INT;
BEGIN
  -- Get tenant IDs
  SELECT id INTO tenant1_id FROM tenants WHERE email = 'admin@kebuliutsman.com';
  SELECT id INTO tenant2_id FROM tenants WHERE email = 'kopikita.com';

  -- Get role IDs
  SELECT id INTO role_superadmin_id FROM roles WHERE name = 'Super Admin';
  SELECT id INTO role_owner_id FROM roles WHERE name = 'Owner';
  SELECT id INTO role_manager_id FROM roles WHERE name = 'Manager';
  SELECT id INTO role_cashier_id FROM roles WHERE name = 'Cashier';

  -- Update existing outlets to belong to tenant 1
  UPDATE outlets SET tenant_id = tenant1_id WHERE id = 1;

  -- Insert Tenant 2 outlets
  INSERT INTO outlets (tenant_id, name, address, phone, email) VALUES
  (tenant2_id, 'Kopi Kita Pusat', 'Jl. Sudirman No. 456, Jakarta', '+62 813-9876-5432', 'pusat@kopikita.com');

  -- Insert Super Admin user (no tenant)
  INSERT INTO users (email, password_hash, name, role_id, tenant_id, outlet_id) VALUES
  ('superadmin@mypos.com', '$2b$10$rXqvCxjqWXjCq7QZ5XqZ5eX5X5X5X5X5X5X5X5X5X5X5X5X5X5X', 'Super Admin', role_superadmin_id, NULL, NULL)
  ON CONFLICT (email) DO NOTHING;

  -- Update existing users to belong to tenant 1
  UPDATE users SET tenant_id = tenant1_id WHERE email LIKE '%kebuliutsman.com';

  -- Insert Tenant 2 users
  INSERT INTO users (tenant_id, email, password_hash, name, role_id, outlet_id) VALUES
  (tenant2_id, 'owner@kopikita.com', '$2b$10$rXqvCxjqWXjCq7QZ5XqZ5eX5X5X5X5X5X5X5X5X5X5X5X5X5X5X', 'Budi Santoso', role_owner_id, (SELECT id FROM outlets WHERE tenant_id = tenant2_id LIMIT 1)),
  (tenant2_id, 'kasir@kopikita.com', '$2b$10$rXqvCxjqWXjCq7QZ5XqZ5eX5X5X5X5X5X5X5X5X5X5X5X5X5X5X', 'Kasir Kopi', role_cashier_id, (SELECT id FROM outlets WHERE tenant_id = tenant2_id LIMIT 1));

END $$;

-- =====================================================
-- Password untuk semua user: "password123"
-- Hash: $2b$10$rXqvCxjqWXjCq7QZ5XqZ5eX5X5X5X5X5X5X5X5X5X5X5X5X5X5X
-- =====================================================

SELECT 'Multi-tenant seed data inserted successfully!' AS message;
