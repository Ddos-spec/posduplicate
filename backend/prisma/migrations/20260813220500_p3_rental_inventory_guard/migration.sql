-- P3.4 Rental inventory integrity guard.
-- Protects active rental commitments regardless of which application path mutates public.items.

CREATE OR REPLACE FUNCTION public.protect_rental_item_commitments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id INTEGER;
  v_outlet_id INTEGER;
  v_buffer_minutes INTEGER;
  v_required_stock NUMERIC := 0;
BEGIN
  SELECT s.tenant_id, s.outlet_id, s.buffer_minutes
    INTO v_tenant_id, v_outlet_id, v_buffer_minutes
  FROM public.rental_item_settings s
  WHERE s.item_id = OLD.id
    AND s.status = 'active'
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  WITH commitments AS (
    SELECT
      b.id AS booking_id,
      bi.quantity,
      b.starts_at - (v_buffer_minutes * interval '1 minute') AS effective_start,
      b.ends_at + (v_buffer_minutes * interval '1 minute') AS effective_end
    FROM public.rental_booking_items bi
    JOIN public.rental_bookings b
      ON b.id = bi.booking_id
     AND b.tenant_id = bi.tenant_id
    WHERE bi.tenant_id = v_tenant_id
      AND bi.item_id = OLD.id
      AND b.outlet_id = v_outlet_id
      AND b.status IN ('reserved','confirmed','picked_up')
      AND b.ends_at + (v_buffer_minutes * interval '1 minute') > NOW()
  ), boundary_points AS (
    SELECT effective_start AS point FROM commitments
  ), loads AS (
    SELECT p.point, COALESCE(SUM(c.quantity),0) AS load
    FROM boundary_points p
    JOIN commitments c
      ON c.effective_start <= p.point
     AND c.effective_end > p.point
    GROUP BY p.point
  )
  SELECT COALESCE(MAX(load),0) INTO v_required_stock FROM loads;

  IF v_required_stock <= 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.outlet_id IS DISTINCT FROM OLD.outlet_id THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'RENTAL_ITEM_OUTLET_COMMITTED: item with active rental commitments cannot move outlet';
  END IF;

  IF COALESCE(NEW.track_stock,FALSE) = FALSE THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'RENTAL_ITEM_TRACKING_COMMITTED: item with active rental commitments must remain tracked stock';
  END IF;

  IF COALESCE(NEW.is_active,TRUE) = FALSE THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'RENTAL_ITEM_ACTIVE_COMMITTED: item with active rental commitments cannot be deactivated';
  END IF;

  IF COALESCE(NEW.stock,0) < v_required_stock THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = format(
        'RENTAL_ITEM_STOCK_COMMITTED: stock %s is below peak committed rental quantity %s',
        COALESCE(NEW.stock,0), v_required_stock
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_rental_item_commitments ON public.items;
CREATE TRIGGER trg_protect_rental_item_commitments
BEFORE UPDATE OF stock, outlet_id, track_stock, is_active ON public.items
FOR EACH ROW EXECUTE FUNCTION public.protect_rental_item_commitments();

COMMENT ON FUNCTION public.protect_rental_item_commitments() IS
  'P3.4 protects physical rental capacity at the public.items database boundary across POS sales and administrative stock edits.';
