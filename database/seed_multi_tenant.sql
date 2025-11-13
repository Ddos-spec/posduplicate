-- =====================================================
-- Seed Data for Complete Multi-Tenant System
-- =====================================================

-- Insert Sample Tenants
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
    ('Kebuli Utsman Restaurant', 'Jordan Utsman', 'admin@kebuliutsman.com', '+62 812-3456-7890', 'pro', 'active', NOW(), NOW() + INTERVAL '365 days', 5, 20),
    ('Kopi Kita Cafe', 'Budi Santoso', 'admin@kopikita.com', '+62 813-9876-5432', 'basic', 'trial', NOW(), NOW() + INTERVAL '14 days', 1, 5)
ON CONFLICT (email) DO NOTHING;

-- Insert Data with PL/pgSQL
DO $$
DECLARE
    tenant1_id INT;
    tenant2_id INT;
    role_superadmin_id INT;
    role_owner_id INT;
    role_manager_id INT;
    role_cashier_id INT;
    outlet1_id INT;
    outlet2_id INT;
BEGIN
    -- Get tenant IDs
    SELECT id INTO tenant1_id FROM tenants WHERE email = 'admin@kebuliutsman.com';
    SELECT id INTO tenant2_id FROM tenants WHERE email = 'admin@kopikita.com';
    
    -- Get role IDs
    SELECT id INTO role_superadmin_id FROM roles WHERE name = 'Super Admin';
    SELECT id INTO role_owner_id FROM roles WHERE name = 'Owner';
    SELECT id INTO role_manager_id FROM roles WHERE name = 'Manager';
    SELECT id INTO role_cashier_id FROM roles WHERE name = 'Cashier';
    
    -- Insert Outlets for Tenant 1
    INSERT INTO outlets (tenant_id, name, address, phone, email) VALUES
        (tenant1_id, 'Kebuli Utsman Pusat', 'Jl. Raya Bogor KM 30, Cimanggis', '+62 21-8741-2345', 'pusat@kebuliutsman.com'),
        (tenant1_id, 'Kebuli Utsman Cabang', 'Jl. Margonda Raya No. 100, Depok', '+62 21-7789-1234', 'cabang@kebuliutsman.com')
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO outlet1_id FROM outlets WHERE email = 'pusat@kebuliutsman.com';
    
    -- Insert Outlet for Tenant 2
    INSERT INTO outlets (tenant_id, name, address, phone, email) VALUES
        (tenant2_id, 'Kopi Kita Pusat', 'Jl. Sudirman No. 456, Jakarta', '+62 21-5555-1234', 'pusat@kopikita.com')
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO outlet2_id FROM outlets WHERE email = 'pusat@kopikita.com';
    
    -- Insert Super Admin (no tenant)
    INSERT INTO users (tenant_id, outlet_id, role_id, email, password_hash, name) VALUES
        (NULL, NULL, role_superadmin_id, 'superadmin@mypos.com', '$2b$10$YourHashHere', 'Super Admin')
    ON CONFLICT (email) DO NOTHING;
    
    -- Insert Users for Tenant 1
    INSERT INTO users (tenant_id, outlet_id, role_id, email, password_hash, name) VALUES
        (tenant1_id, outlet1_id, role_owner_id, 'jordan@kebuliutsman.com', '$2b$10$YourHashHere', 'Jordan Utsman'),
        (tenant1_id, outlet1_id, role_manager_id, 'manager@kebuliutsman.com', '$2b$10$YourHashHere', 'Manager Kebuli'),
        (tenant1_id, outlet1_id, role_cashier_id, 'kasir1@kebuliutsman.com', '$2b$10$YourHashHere', 'Kasir Satu')
    ON CONFLICT (email) DO NOTHING;
    
    -- Insert Users for Tenant 2
    INSERT INTO users (tenant_id, outlet_id, role_id, email, password_hash, name) VALUES
        (tenant2_id, outlet2_id, role_owner_id, 'budi@kopikita.com', '$2b$10$YourHashHere', 'Budi Santoso'),
        (tenant2_id, outlet2_id, role_cashier_id, 'kasir@kopikita.com', '$2b$10$YourHashHere', 'Kasir Kopi')
    ON CONFLICT (email) DO NOTHING;
    
    -- Insert Products for Tenant 1
    INSERT INTO products (tenant_id, outlet_id, name, description, price, cost, stock, category) VALUES
        (tenant1_id, outlet1_id, 'Nasi Kebuli Ayam', 'Nasi kebuli dengan ayam goreng', 45000, 25000, 100, 'Makanan'),
        (tenant1_id, outlet1_id, 'Nasi Kebuli Kambing', 'Nasi kebuli dengan daging kambing', 65000, 35000, 50, 'Makanan'),
        (tenant1_id, outlet1_id, 'Es Teh Manis', 'Es teh manis segar', 8000, 3000, 200, 'Minuman'),
        (tenant1_id, outlet1_id, 'Kopi Arab', 'Kopi Arab asli', 15000, 7000, 100, 'Minuman')
    ON CONFLICT DO NOTHING;
    
    -- Insert Products for Tenant 2
    INSERT INTO products (tenant_id, outlet_id, name, description, price, cost, stock, category) VALUES
        (tenant2_id, outlet2_id, 'Espresso', 'Single shot espresso', 18000, 8000, 100, 'Kopi'),
        (tenant2_id, outlet2_id, 'Cappuccino', 'Espresso dengan susu foam', 25000, 12000, 100, 'Kopi'),
        (tenant2_id, outlet2_id, 'Croissant', 'Croissant butter', 22000, 10000, 30, 'Pastry'),
        (tenant2_id, outlet2_id, 'Sandwich', 'Club sandwich', 35000, 18000, 20, 'Makanan')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Seed data inserted successfully!';
    RAISE NOTICE 'Tenant 1 ID: %, Tenant 2 ID: %', tenant1_id, tenant2_id;
    RAISE NOTICE 'Super Admin Role ID: %', role_superadmin_id;
    
END $$;

-- Verify Installation
SELECT 
    'Tenants: ' || COUNT(*)::TEXT AS count,
    'Active' AS status
FROM tenants
UNION ALL
SELECT 
    'Users: ' || COUNT(*)::TEXT,
    'Total'
FROM users
UNION ALL
SELECT 
    'Outlets: ' || COUNT(*)::TEXT,
    'Total'
FROM outlets
UNION ALL
SELECT 
    'Products: ' || COUNT(*)::TEXT,
    'Total'
FROM products;

-- =====================================================
-- Default password for all users: 'password123'
-- Replace $2b$10$YourHashHere with actual bcrypt hash
-- =====================================================