-- Migration: Add API Keys and Printer Settings
-- Date: 2025-11-26
-- Description: Remove Google Sheets integration, add API keys table and printer settings

-- 1. Remove google_sheet_id column from tenants table
ALTER TABLE tenants DROP COLUMN IF EXISTS google_sheet_id;

-- 2. Add printer_settings column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS printer_settings JSON DEFAULT '{}';

-- 3. Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  key_name VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP(6),
  created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP(6),
  CONSTRAINT fk_api_keys_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 4. Create indexes for api_keys table
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);

-- 5. Add comment to tables
COMMENT ON TABLE api_keys IS 'API keys for tenant authentication';
COMMENT ON COLUMN users.printer_settings IS 'User-specific printer configuration (JSON)';
