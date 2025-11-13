-- =====================================================
-- MyPOS Database Schema - PostgreSQL
-- =====================================================
-- Version: 1.0
-- Description: Complete database schema for MyPOS system
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE outlets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    npwp VARCHAR(50),
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    outlet_id INTEGER REFERENCES outlets(id),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PRODUCTS & MENU
-- =====================================================

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'item', -- 'item' or 'ingredient'
    outlet_id INTEGER REFERENCES outlets(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    cost DECIMAL(12, 2) DEFAULT 0,
    image VARCHAR(500),
    description TEXT,
    sku VARCHAR(100),
    stock DECIMAL(12, 2) DEFAULT 0,
    track_stock BOOLEAN DEFAULT false,
    min_stock DECIMAL(12, 2) DEFAULT 0,
    outlet_id INTEGER REFERENCES outlets(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE variants (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price_adjust DECIMAL(12, 2) DEFAULT 0,
    sku VARCHAR(100),
    stock DECIMAL(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE modifiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12, 2) DEFAULT 0,
    outlet_id INTEGER REFERENCES outlets(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE item_modifiers (
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    modifier_id INTEGER REFERENCES modifiers(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, modifier_id)
);

-- =====================================================
-- INGREDIENTS & RECIPES
-- =====================================================

CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    unit VARCHAR(50) NOT NULL, -- 'kg', 'liter', 'pcs', etc
    stock DECIMAL(12, 2) DEFAULT 0,
    min_stock DECIMAL(12, 2) DEFAULT 0,
    cost_per_unit DECIMAL(12, 2) DEFAULT 0,
    outlet_id INTEGER REFERENCES outlets(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    yield_qty DECIMAL(12, 2) DEFAULT 1,
    yield_unit VARCHAR(50),
    cost_per_unit DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL(12, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL
);

-- =====================================================
-- INVENTORY & SUPPLIERS
-- =====================================================

CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    outlet_id INTEGER REFERENCES outlets(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
    subtotal DECIMAL(12, 2) DEFAULT 0,
    tax DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    outlet_id INTEGER REFERENCES outlets(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_order_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL(12, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL
);

CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'in', 'out', 'adjustment', 'transfer', 'waste'
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL(12, 2) NOT NULL,
    from_outlet_id INTEGER REFERENCES outlets(id),
    to_outlet_id INTEGER REFERENCES outlets(id),
    reference_id INTEGER, -- PO id, transaction id, etc
    reference_type VARCHAR(50), -- 'purchase_order', 'transaction', 'adjustment'
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_transfers (
    id SERIAL PRIMARY KEY,
    transfer_number VARCHAR(100) UNIQUE NOT NULL,
    from_outlet_id INTEGER REFERENCES outlets(id),
    to_outlet_id INTEGER REFERENCES outlets(id),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_transfer_items (
    id SERIAL PRIMARY KEY,
    transfer_id INTEGER REFERENCES stock_transfers(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL(12, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL
);

-- =====================================================
-- TRANSACTIONS (POS)
-- =====================================================

CREATE TABLE tables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    capacity INTEGER DEFAULT 4,
    status VARCHAR(50) DEFAULT 'available', -- 'available', 'occupied', 'reserved'
    outlet_id INTEGER REFERENCES outlets(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    transaction_number VARCHAR(100) UNIQUE NOT NULL,
    order_type VARCHAR(50) NOT NULL, -- 'dine-in', 'takeaway', 'delivery'
    table_id INTEGER REFERENCES tables(id),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    subtotal DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    service_charge DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'cancelled', 'held'
    notes TEXT,
    outlet_id INTEGER REFERENCES outlets(id),
    cashier_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id),
    variant_id INTEGER REFERENCES variants(id),
    item_name VARCHAR(255) NOT NULL, -- Store name for historical record
    quantity DECIMAL(12, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transaction_modifiers (
    id SERIAL PRIMARY KEY,
    transaction_item_id INTEGER REFERENCES transaction_items(id) ON DELETE CASCADE,
    modifier_id INTEGER REFERENCES modifiers(id),
    modifier_name VARCHAR(255) NOT NULL,
    price DECIMAL(12, 2) NOT NULL
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL, -- 'cash', 'qris', 'bank_transfer', 'card', 'e-wallet'
    amount DECIMAL(12, 2) NOT NULL,
    change_amount DECIMAL(12, 2) DEFAULT 0,
    reference_number VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'pending', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE held_orders (
    id SERIAL PRIMARY KEY,
    order_data JSONB NOT NULL,
    cashier_id INTEGER REFERENCES users(id),
    outlet_id INTEGER REFERENCES outlets(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- =====================================================
-- CUSTOMERS & LOYALTY
-- =====================================================

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    date_of_birth DATE,
    outlet_id INTEGER REFERENCES outlets(id),
    total_spent DECIMAL(12, 2) DEFAULT 0,
    total_visits INTEGER DEFAULT 0,
    last_visit TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loyalty_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    min_points INTEGER DEFAULT 0,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    benefits JSONB DEFAULT '{}',
    outlet_id INTEGER REFERENCES outlets(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loyalty_points (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    tier_id INTEGER REFERENCES loyalty_tiers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loyalty_transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    transaction_id INTEGER REFERENCES transactions(id),
    points_earned INTEGER DEFAULT 0,
    points_redeemed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    transaction_id INTEGER REFERENCES transactions(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    response TEXT,
    responded_by INTEGER REFERENCES users(id),
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- EMPLOYEES & SHIFTS
-- =====================================================

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    outlet_id INTEGER REFERENCES outlets(id),
    employee_code VARCHAR(50),
    pin_code VARCHAR(6),
    position VARCHAR(100),
    salary DECIMAL(12, 2),
    is_active BOOLEAN DEFAULT true,
    hired_at DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    outlet_id INTEGER REFERENCES outlets(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    expected_cash DECIMAL(12, 2) DEFAULT 0,
    actual_cash DECIMAL(12, 2) DEFAULT 0,
    difference DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'closed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PROMOTIONS & DISCOUNTS
-- =====================================================

CREATE TABLE promo_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'percentage', 'fixed_amount', 'buy_x_get_y'
    value DECIMAL(12, 2) NOT NULL,
    min_purchase DECIMAL(12, 2) DEFAULT 0,
    applicable_to JSONB DEFAULT '{}', -- item ids, category ids
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    outlet_id INTEGER REFERENCES outlets(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE discounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'percentage', 'fixed_amount'
    value DECIMAL(12, 2) NOT NULL,
    applicable_to VARCHAR(50) DEFAULT 'all', -- 'all', 'category', 'item'
    applicable_ids JSONB DEFAULT '[]',
    outlet_id INTEGER REFERENCES outlets(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE taxes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rate DECIMAL(5, 2) NOT NULL,
    type VARCHAR(50) DEFAULT 'percentage', -- 'percentage', 'fixed'
    applicable_to VARCHAR(50) DEFAULT 'all',
    outlet_id INTEGER REFERENCES outlets(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SETTINGS & CONFIGURATIONS
-- =====================================================

CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    outlet_id INTEGER REFERENCES outlets(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users & Auth
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_outlet ON users(outlet_id);

-- Products
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_outlet ON items(outlet_id);
CREATE INDEX idx_items_active ON items(is_active);

-- Transactions
CREATE INDEX idx_transactions_number ON transactions(transaction_number);
CREATE INDEX idx_transactions_outlet ON transactions(outlet_id);
CREATE INDEX idx_transactions_cashier ON transactions(cashier_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_date ON transactions(created_at);
CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);

-- Inventory
CREATE INDEX idx_ingredients_outlet ON ingredients(outlet_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(type);
CREATE INDEX idx_inventory_movements_ingredient ON inventory_movements(ingredient_id);

-- Customers
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_outlet ON customers(outlet_id);

-- Shifts
CREATE INDEX idx_shifts_employee ON shifts(employee_id);
CREATE INDEX idx_shifts_status ON shifts(status);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outlets_updated_at BEFORE UPDATE ON outlets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF SCHEMA
-- =====================================================
