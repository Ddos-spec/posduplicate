-- =====================================================
-- MyPOS Seed Data - Sample Data for Testing
-- =====================================================

-- Insert Roles
INSERT INTO roles (name, permissions) VALUES
('Owner', '{"all": true}'),
('Manager', '{"read": true, "write": true, "delete": false}'),
('Cashier', '{"read": true, "write": false, "delete": false}');

-- Insert Outlet
INSERT INTO outlets (name, address, phone, email, npwp) VALUES
('Kebuli Utsman', 'Jl. Raya Kebuli No. 123, Jakarta', '+62 812-3456-7890', 'info@kebuliutsman.com', '12.345.678.9-012.345');

-- Insert Users (password: 'password123' - hashed with bcrypt)
INSERT INTO users (email, password_hash, name, role_id, outlet_id) VALUES
('owner@kebuliutsman.com', '$2b$10$rXqvCxjqWXjCq7QZ5XqZ5eX5X5X5X5X5X5X5X5X5X5X5X5X5X5X', 'Kebuli Jordan', 1, 1),
('manager@kebuliutsman.com', '$2b$10$rXqvCxjqWXjCq7QZ5XqZ5eX5X5X5X5X5X5X5X5X5X5X5X5X5X5X', 'Manager 1', 2, 1),
('kasir1@kebuliutsman.com', '$2b$10$rXqvCxjqWXjCq7QZ5XqZ5eX5X5X5X5X5X5X5X5X5X5X5X5X5X5X', 'Kasir 1', 3, 1);

-- Insert Categories
INSERT INTO categories (name, type, outlet_id) VALUES
('Makanan', 'item', 1),
('Minuman', 'item', 1),
('Snack', 'item', 1),
('Bahan Baku', 'ingredient', 1);

-- Insert Items
INSERT INTO items (name, category_id, price, cost, stock, track_stock, outlet_id) VALUES
('Ayam Kebuli Perpotong', 1, 45000, 25000, 50, true, 1),
('Kambing Kebuli Perpotong', 1, 65000, 40000, 30, true, 1),
('Loyang Mix 3 Ayam 2 Kambing', 1, 350000, 200000, 10, true, 1),
('Nasi Kebuli', 1, 25000, 12000, 100, true, 1),
('Indomie Goreng', 1, 28000, 15000, 50, true, 1),
('Air Mineral', 2, 5000, 3000, 36, true, 1),
('Es Teh Manis', 2, 12000, 5000, 0, false, 1),
('Es Jeruk', 2, 15000, 7000, 0, false, 1),
('Kopi Susu', 2, 25000, 12000, 0, false, 1),
('Donut Coklat', 3, 18000, 10000, 20, true, 1),
('Croissant', 3, 22000, 12000, 15, true, 1);

-- Insert Variants
INSERT INTO variants (item_id, name, price_adjust) VALUES
(1, 'Level 1 (Tidak Pedas)', -2000),
(1, 'Level 2 (Pedas)', 0),
(1, 'Level 3 (Extra Pedas)', 2000);

-- Insert Modifiers
INSERT INTO modifiers (name, price, outlet_id) VALUES
('Sambal Rendang', 5000, 1),
('Sambal Jeruk', 3000, 1),
('Extra Nasi', 5000, 1),
('Extra Keju', 8000, 1),
('Tanpa Gula', 0, 1);

-- Link Modifiers to Items
INSERT INTO item_modifiers (item_id, modifier_id) VALUES
(1, 1), -- Ayam Kebuli can have Sambal Rendang
(1, 2), -- Ayam Kebuli can have Sambal Jeruk
(1, 3), -- Ayam Kebuli can have Extra Nasi
(2, 1), -- Kambing Kebuli can have Sambal Rendang
(2, 2), -- Kambing Kebuli can have Sambal Jeruk
(9, 5); -- Kopi Susu can be without sugar

-- Insert Ingredients
INSERT INTO ingredients (name, category_id, unit, stock, min_stock, cost_per_unit, outlet_id) VALUES
('Ayam Potong', 4, 'ptg', 290, 50, 25000, 1),
('Beras', 4, 'kg', 50.02, 20, 15000, 1),
('Bawang Putih', 4, 'pcs', 100, 50, 500, 1),
('Bawang Bombay', 4, 'pcs', 80, 30, 1000, 1),
('Aluminium Foil', 4, 'cm', 1000, 500, 50, 1);

-- Insert Tables
INSERT INTO tables (name, capacity, status, outlet_id) VALUES
('Table 1', 4, 'available', 1),
('Table 2', 4, 'available', 1),
('Table 3', 4, 'available', 1),
('Table 4', 4, 'available', 1),
('VIP 1', 6, 'available', 1),
('VIP 2', 6, 'available', 1);

-- Insert Taxes
INSERT INTO taxes (name, rate, type, outlet_id) VALUES
('PB1 (10%)', 10.00, 'percentage', 1),
('Service Charge', 5.00, 'percentage', 1);

-- Insert Loyalty Tiers
INSERT INTO loyalty_tiers (name, min_points, discount_percentage, outlet_id) VALUES
('Bronze', 0, 0, 1),
('Silver', 500, 5, 1),
('Gold', 1000, 10, 1);

-- Insert Sample Customers
INSERT INTO customers (name, phone, email, outlet_id, total_spent, total_visits, last_visit) VALUES
('Ahmad Fauzi', '+62 812-3456-7890', 'ahmad@email.com', 1, 850000, 12, CURRENT_TIMESTAMP - INTERVAL '3 days'),
('Siti Nurhaliza', '+62 813-9876-5432', 'siti@email.com', 1, 450000, 6, CURRENT_TIMESTAMP - INTERVAL '4 days'),
('Budi Santoso', '+62 811-2345-6789', 'budi@email.com', 1, 1200000, 18, CURRENT_TIMESTAMP - INTERVAL '2 days');

-- Insert Employees
INSERT INTO employees (user_id, outlet_id, employee_code, pin_code, position) VALUES
(1, 1, 'EMP001', '1234', 'Owner'),
(3, 1, 'EMP003', '5678', 'Kasir');

-- Insert Sample Promo
INSERT INTO promo_campaigns (name, type, value, min_purchase, start_date, end_date, outlet_id) VALUES
('Ramadan Special', 'percentage', 15.00, 100000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', 1);

-- Insert Settings
INSERT INTO settings (key, value, type, outlet_id) VALUES
('tax_rate', '10', 'number', 1),
('service_charge_rate', '5', 'number', 1),
('currency', 'IDR', 'string', 1),
('receipt_header', 'Kebuli Utsman\nJl. Raya Kebuli No. 123\nTel: +62 812-3456-7890', 'string', 1),
('receipt_footer', 'Thank you for your visit!\nVisit us again soon', 'string', 1);

-- =====================================================
-- END OF SEED DATA
-- =====================================================
