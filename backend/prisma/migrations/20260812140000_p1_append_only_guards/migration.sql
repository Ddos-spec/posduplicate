-- P1 audit hardening: immutable ledger rows at the PostgreSQL layer.
-- Corrections must be new compensating rows; historical entries cannot be updated/deleted.

CREATE OR REPLACE FUNCTION public.prevent_suite_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'append-only ledger % cannot be %; write a compensating event instead', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS trg_loyalty_ledger_append_only ON public.loyalty_ledger;
CREATE TRIGGER trg_loyalty_ledger_append_only
BEFORE UPDATE OR DELETE ON public.loyalty_ledger
FOR EACH ROW EXECUTE FUNCTION public.prevent_suite_ledger_mutation();

DROP TRIGGER IF EXISTS trg_warehouse_stock_ledger_append_only ON public.warehouse_stock_ledger;
CREATE TRIGGER trg_warehouse_stock_ledger_append_only
BEFORE UPDATE OR DELETE ON public.warehouse_stock_ledger
FOR EACH ROW EXECUTE FUNCTION public.prevent_suite_ledger_mutation();

DROP TRIGGER IF EXISTS trg_procurement_event_ledger_append_only ON public.procurement_event_ledger;
CREATE TRIGGER trg_procurement_event_ledger_append_only
BEFORE UPDATE OR DELETE ON public.procurement_event_ledger
FOR EACH ROW EXECUTE FUNCTION public.prevent_suite_ledger_mutation();
