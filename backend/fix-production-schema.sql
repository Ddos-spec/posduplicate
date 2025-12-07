-- Fix missing columns in stock_movements table
ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS supplier_id INTEGER,
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stock_movements_supplier_id_fkey'
  ) THEN
    ALTER TABLE stock_movements
    ADD CONSTRAINT stock_movements_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes if not exist
CREATE INDEX IF NOT EXISTS idx_stock_movements_supplier ON stock_movements(supplier_id);

-- Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'stock_movements'
ORDER BY ordinal_position;
