-- Migration: Add platform-specific pricing columns to items table
-- Date: 2025-11-22
-- Description: Add price_gofood, price_grabfood, price_shopeefood columns for multi-platform pricing

ALTER TABLE items
ADD COLUMN IF NOT EXISTS price_gofood DECIMAL(12, 2) NULL,
ADD COLUMN IF NOT EXISTS price_grabfood DECIMAL(12, 2) NULL,
ADD COLUMN IF NOT EXISTS price_shopeefood DECIMAL(12, 2) NULL;

-- Add comments for documentation
COMMENT ON COLUMN items.price_gofood IS 'Product price for GoFood platform (NULL means use default price)';
COMMENT ON COLUMN items.price_grabfood IS 'Product price for GrabFood platform (NULL means use default price)';
COMMENT ON COLUMN items.price_shopeefood IS 'Product price for ShopeeFood platform (NULL means use default price)';
