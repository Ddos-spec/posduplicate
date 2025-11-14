-- =====================================================
-- MyPOS Database Migration (Prisma Compatible)
-- =====================================================
-- This migration aligns with Prisma schema using 'items' instead of 'products'

-- Step 1: Create Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_status VARCHAR(50) DEFAULT 'trial',
    subscription_starts_at TIMESTAMP,
    subscription_expires_at TIMESTAMP,
    max_outlets INTEGER DEFAULT 1,
    max_users INTEGER DEFAULT 5,
    billing_email VARCHAR(255),
    payment_method VARCHAR(50),
    last_payment_at TIMESTAMP,
    next_billing_date DATE,
    settings JSONB DEFAULT '{}'::JSONB,
    features JSONB DEFAULT '{}'::JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Step 3: Create Outlets Table
CREATE TABLE IF NOT EXISTS outlets (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    npwp VARCHAR(50),
    settings JSONB DEFAULT '{}'::JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    outlet_id INTEGER REFERENCES outlets(id),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 5: Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'item',
    outlet_id INTEGER REFERENCES outlets(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 6: Create Items Table (Products)
CREATE TABLE IF NOT EXISTS items (
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

-- Step 7: Create Variants Table
CREATE TABLE IF NOT EXISTS variants (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price_adjust DECIMAL(12, 2) DEFAULT 0,
    sku VARCHAR(100),
    stock DECIMAL(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 8: Create Modifiers Table
CREATE TABLE IF NOT EXISTS modifiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12, 2) DEFAULT 0,
    outlet_id INTEGER REFERENCES outlets(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 9: Create Item_Modifiers Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS item_modifiers (
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    modifier_id INTEGER NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, modifier_id)
);

-- Step 10: Create Tables Table (Restaurant Tables)
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    capacity INTEGER DEFAULT 4,
    status VARCHAR(50) DEFAULT 'available',
    outlet_id INTEGER REFERENCES outlets(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 11: Create Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_number VARCHAR(100) UNIQUE NOT NULL,
    order_type VARCHAR(50) NOT NULL,
    table_id INTEGER REFERENCES tables(id),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    subtotal DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    service_charge DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    outlet_id INTEGER REFERENCES outlets(id),
    cashier_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Step 12: Create Transaction Items Table
CREATE TABLE IF NOT EXISTS transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id),
    variant_id INTEGER REFERENCES variants(id),
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 13: Create Transaction Modifiers Table
CREATE TABLE IF NOT EXISTS transaction_modifiers (
    id SERIAL PRIMARY KEY,
    transaction_item_id INTEGER NOT NULL REFERENCES transaction_items(id) ON DELETE CASCADE,
    modifier_id INTEGER NOT NULL REFERENCES modifiers(id),
    modifier_name VARCHAR(255) NOT NULL,
    price DECIMAL(12, 2) NOT NULL
);

-- Step 14: Create Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    change_amount DECIMAL(12, 2) DEFAULT 0,
    reference_number VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 15: Create Customers Table
CREATE TABLE IF NOT EXISTS customers (
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

-- Step 16: Create Ingredients Table
CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    unit VARCHAR(50) NOT NULL,
    stock DECIMAL(12, 2) DEFAULT 0,
    min_stock DECIMAL(12, 2) DEFAULT 0,
    cost_per_unit DECIMAL(12, 2) DEFAULT 0,
    outlet_id INTEGER REFERENCES outlets(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 17: Create Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outlet_id INTEGER NOT NULL REFERENCES outlets(id),
    employee_code VARCHAR(50),
    pin_code VARCHAR(6),
    position VARCHAR(100),
    salary DECIMAL(12, 2),
    is_active BOOLEAN DEFAULT true,
    hired_at DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 18: Create Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_outlets_tenant ON outlets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_outlet ON users(outlet_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_outlet ON items(outlet_id);
CREATE INDEX IF NOT EXISTS idx_items_active ON items(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_number ON transactions(transaction_number);
CREATE INDEX IF NOT EXISTS idx_transactions_outlet ON transactions(outlet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_cashier ON transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_outlet ON customers(outlet_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_outlet ON ingredients(outlet_id);

-- Step 19: Insert Default Roles
INSERT INTO roles (name, permissions) VALUES
('Super Admin', '{"all": true, "manage_tenants": true, "view_all_data": true}'),
('Owner', '{"manage_outlets": true, "manage_users": true, "view_reports": true, "manage_products": true}'),
('Manager', '{"manage_users": true, "view_reports": true, "manage_products": true, "manage_transactions": true}'),
('Cashier', '{"create_transactions": true, "view_products": true, "manage_own_transactions": true}')
ON CONFLICT (name) DO UPDATE SET permissions = EXCLUDED.permissions;

-- Step 20: Create Update Triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trigger_%s_updated_at ON %s', tbl, tbl);
        EXECUTE format('CREATE TRIGGER trigger_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', tbl, tbl);
    END LOOP;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
