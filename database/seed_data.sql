-- =====================================================
-- Seed Data for MyPOS System
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
    ('Kebuli Utsman Restaurant', 'Jordan Utsman', 'owner@kebuliutsman.com', '+62 812-3456-7890', 'pro', 'active', NOW(), NOW() + INTERVAL '365 days', 5, 20),
    ('Kopi Kita Cafe', 'Budi Santoso', 'owner@kopikita.com', '+62 813-9876-5432', 'basic', 'active', NOW(), NOW() + INTERVAL '30 days', 1, 5)
ON CONFLICT (email) DO NOTHING;

-- Insert Data with PL/pgSQL
DO $$
DECLARE
    tenant1_id INT;
    tenant2_id INT;
    role_owner_id INT;
    role_manager_id INT;
    role_cashier_id INT;
    outlet1_id INT;
    outlet2_id INT;
    cat_food_id INT;
    cat_drink_id INT;
    cat_coffee_id INT;
    cat_pastry_id INT;
    item1_id INT;
    item2_id INT;
    item3_id INT;
    item4_id INT;
    item5_id INT;
    item6_id INT;
BEGIN
    -- Get tenant IDs
    SELECT id INTO tenant1_id FROM tenants WHERE email = 'owner@kebuliutsman.com';
    SELECT id INTO tenant2_id FROM tenants WHERE email = 'owner@kopikita.com';

    -- Get role IDs
    SELECT id INTO role_owner_id FROM roles WHERE name = 'Owner';
    SELECT id INTO role_manager_id FROM roles WHERE name = 'Manager';
    SELECT id INTO role_cashier_id FROM roles WHERE name = 'Cashier';

    -- Insert Outlets for Tenant 1
    INSERT INTO outlets (tenant_id, name, address, phone, email) VALUES
        (tenant1_id, 'Kebuli Utsman Pusat', 'Jl. Raya Bogor KM 30, Cimanggis', '+62 21-8741-2345', 'pusat@kebuliutsman.com')
    ON CONFLICT DO NOTHING
    RETURNING id INTO outlet1_id;

    IF outlet1_id IS NULL THEN
        SELECT id INTO outlet1_id FROM outlets WHERE email = 'pusat@kebuliutsman.com';
    END IF;

    -- Insert Outlet for Tenant 2
    INSERT INTO outlets (tenant_id, name, address, phone, email) VALUES
        (tenant2_id, 'Kopi Kita Pusat', 'Jl. Sudirman No. 456, Jakarta', '+62 21-5555-1234', 'pusat@kopikita.com')
    ON CONFLICT DO NOTHING
    RETURNING id INTO outlet2_id;

    IF outlet2_id IS NULL THEN
        SELECT id INTO outlet2_id FROM outlets WHERE email = 'pusat@kopikita.com';
    END IF;

    -- Insert Users for Tenant 1 (password: password123)
    -- Hash generated with: bcrypt.hash('password123', 10)
    INSERT INTO users (tenant_id, outlet_id, role_id, email, password_hash, name) VALUES
        (tenant1_id, outlet1_id, role_owner_id, 'owner@kebuliutsman.com', '$2b$10$mdkFYcXFBtzPVxhPkI4aHu4JiV.bG6EsgwlMNn0kG5z2uMXvdeM6y', 'Jordan Utsman'),
        (tenant1_id, outlet1_id, role_cashier_id, 'kasir@kebuliutsman.com', '$2b$10$mdkFYcXFBtzPVxhPkI4aHu4JiV.bG6EsgwlMNn0kG5z2uMXvdeM6y', 'Kasir Satu')
    ON CONFLICT (email) DO NOTHING;

    -- Insert Users for Tenant 2
    INSERT INTO users (tenant_id, outlet_id, role_id, email, password_hash, name) VALUES
        (tenant2_id, outlet2_id, role_owner_id, 'owner@kopikita.com', '$2b$10$mdkFYcXFBtzPVxhPkI4aHu4JiV.bG6EsgwlMNn0kG5z2uMXvdeM6y', 'Budi Santoso'),
        (tenant2_id, outlet2_id, role_cashier_id, 'kasir@kopikita.com', '$2b$10$mdkFYcXFBtzPVxhPkI4aHu4JiV.bG6EsgwlMNn0kG5z2uMXvdeM6y', 'Kasir Kopi')
    ON CONFLICT (email) DO NOTHING;

    -- Insert Categories for Tenant 1
    INSERT INTO categories (name, type, outlet_id) VALUES
        ('Makanan', 'item', outlet1_id)
    RETURNING id INTO cat_food_id;

    INSERT INTO categories (name, type, outlet_id) VALUES
        ('Minuman', 'item', outlet1_id)
    RETURNING id INTO cat_drink_id;

    -- Insert Categories for Tenant 2
    INSERT INTO categories (name, type, outlet_id) VALUES
        ('Kopi', 'item', outlet2_id)
    RETURNING id INTO cat_coffee_id;

    INSERT INTO categories (name, type, outlet_id) VALUES
        ('Pastry', 'item', outlet2_id)
    RETURNING id INTO cat_pastry_id;

    -- Insert Items for Tenant 1
    INSERT INTO items (outlet_id, name, description, price, cost, stock, category_id) VALUES
        (outlet1_id, 'Nasi Kebuli Ayam', 'Nasi kebuli dengan ayam goreng', 45000, 25000, 100, cat_food_id)
    RETURNING id INTO item1_id;

    INSERT INTO items (outlet_id, name, description, price, cost, stock, category_id) VALUES
        (outlet1_id, 'Nasi Kebuli Kambing', 'Nasi kebuli dengan daging kambing', 65000, 35000, 50, cat_food_id)
    RETURNING id INTO item2_id;

    INSERT INTO items (outlet_id, name, description, price, cost, stock, category_id) VALUES
        (outlet1_id, 'Es Teh Manis', 'Es teh manis segar', 8000, 3000, 200, cat_drink_id),
        (outlet1_id, 'Kopi Arab', 'Kopi Arab asli', 15000, 7000, 100, cat_drink_id);

    -- Insert Items for Tenant 2
    INSERT INTO items (outlet_id, name, description, price, cost, stock, category_id) VALUES
        (outlet2_id, 'Espresso', 'Single shot espresso', 18000, 8000, 100, cat_coffee_id)
    RETURNING id INTO item5_id;

    INSERT INTO items (outlet_id, name, description, price, cost, stock, category_id) VALUES
        (outlet2_id, 'Cappuccino', 'Espresso dengan susu foam', 25000, 12000, 100, cat_coffee_id)
    RETURNING id INTO item6_id;

    INSERT INTO items (outlet_id, name, description, price, cost, stock, category_id) VALUES
        (outlet2_id, 'Croissant', 'Croissant butter', 22000, 10000, 30, cat_pastry_id),
        (outlet2_id, 'Sandwich', 'Club sandwich', 35000, 18000, 20, cat_pastry_id);

    -- Insert some modifiers
    INSERT INTO modifiers (name, price, outlet_id) VALUES
        ('Extra Ayam', 15000, outlet1_id),
        ('Pedas Level 1', 0, outlet1_id),
        ('Pedas Level 2', 0, outlet1_id),
        ('Extra Shot', 5000, outlet2_id),
        ('Oat Milk', 8000, outlet2_id),
        ('Almond Milk', 8000, outlet2_id);

    -- Insert some tables
    INSERT INTO tables (name, capacity, outlet_id, status) VALUES
        ('Meja 1', 4, outlet1_id, 'available'),
        ('Meja 2', 4, outlet1_id, 'available'),
        ('Meja 3', 6, outlet1_id, 'available'),
        ('Meja 4', 2, outlet1_id, 'available'),
        ('Table A1', 2, outlet2_id, 'available'),
        ('Table A2', 2, outlet2_id, 'available'),
        ('Table B1', 4, outlet2_id, 'available');

    RAISE NOTICE 'Seed data inserted successfully!';
    RAISE NOTICE 'Tenant 1 ID: %, Tenant 2 ID: %', tenant1_id, tenant2_id;
    RAISE NOTICE 'Outlet 1 ID: %, Outlet 2 ID: %', outlet1_id, outlet2_id;

END $$;

-- Verify Installation
SELECT
    'Tenants: ' || COUNT(*)::TEXT AS summary
FROM tenants
UNION ALL
SELECT
    'Users: ' || COUNT(*)::TEXT
FROM users
UNION ALL
SELECT
    'Outlets: ' || COUNT(*)::TEXT
FROM outlets
UNION ALL
SELECT
    'Items: ' || COUNT(*)::TEXT
FROM items
UNION ALL
SELECT
    'Categories: ' || COUNT(*)::TEXT
FROM categories;

-- =====================================================
-- Login Credentials (password: password123):
-- - owner@kebuliutsman.com
-- - kasir@kebuliutsman.com
-- - owner@kopikita.com
-- - kasir@kopikita.com
-- =====================================================
