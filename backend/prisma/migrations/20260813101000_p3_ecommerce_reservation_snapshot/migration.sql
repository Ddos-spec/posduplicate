-- P3.2 forward hardening: persist the exact stock quantity reserved per order line.
ALTER TABLE public.ecommerce_order_items
  ADD COLUMN IF NOT EXISTS reserved_stock_quantity NUMERIC(15,3) NOT NULL DEFAULT 0;

ALTER TABLE public.ecommerce_order_items
  DROP CONSTRAINT IF EXISTS ecommerce_order_item_reserved_stock_valid;
ALTER TABLE public.ecommerce_order_items
  ADD CONSTRAINT ecommerce_order_item_reserved_stock_valid
  CHECK (reserved_stock_quantity >= 0 AND reserved_stock_quantity <= quantity);

COMMENT ON COLUMN public.ecommerce_order_items.reserved_stock_quantity IS
  'Exact stock quantity decremented at reservation time. Cancellation restores this snapshot rather than re-reading mutable track_stock configuration.';
