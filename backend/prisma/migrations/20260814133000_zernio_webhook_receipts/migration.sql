-- Zernio webhook delivery ledger.
-- The payload itself is deliberately not persisted; only immutable identifiers and hashes
-- are retained so retries can be deduplicated without creating a second sensitive-data store.

CREATE TABLE IF NOT EXISTS public.zernio_webhook_receipts (
  event_id VARCHAR(200) PRIMARY KEY,
  event_type VARCHAR(160) NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  attempt_count INTEGER NOT NULL DEFAULT 1,
  first_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  last_error_code VARCHAR(100),
  CONSTRAINT zernio_webhook_event_id_not_blank CHECK (length(trim(event_id)) > 0),
  CONSTRAINT zernio_webhook_event_type_not_blank CHECK (length(trim(event_type)) > 0),
  CONSTRAINT zernio_webhook_payload_hash_valid CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT zernio_webhook_status_valid CHECK (status IN ('processing','processed','failed')),
  CONSTRAINT zernio_webhook_attempt_count_valid CHECK (attempt_count > 0),
  CONSTRAINT zernio_webhook_processed_at_valid CHECK (
    (status = 'processed' AND processed_at IS NOT NULL) OR
    (status <> 'processed' AND processed_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_zernio_webhook_receipt_status
  ON public.zernio_webhook_receipts (status,last_received_at);

CREATE OR REPLACE FUNCTION public.enforce_zernio_webhook_receipt_integrity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Zernio webhook receipts are append-only evidence';
  END IF;

  IF OLD.event_id IS DISTINCT FROM NEW.event_id
     OR OLD.event_type IS DISTINCT FROM NEW.event_type
     OR OLD.payload_hash IS DISTINCT FROM NEW.payload_hash
     OR OLD.first_received_at IS DISTINCT FROM NEW.first_received_at THEN
    RAISE EXCEPTION 'Zernio webhook receipt identity and evidence are immutable';
  END IF;

  IF NEW.attempt_count < OLD.attempt_count THEN
    RAISE EXCEPTION 'Zernio webhook attempt count cannot decrease';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_zernio_webhook_receipt_integrity ON public.zernio_webhook_receipts;
CREATE TRIGGER trg_zernio_webhook_receipt_integrity
BEFORE UPDATE OR DELETE ON public.zernio_webhook_receipts
FOR EACH ROW EXECUTE FUNCTION public.enforce_zernio_webhook_receipt_integrity();
