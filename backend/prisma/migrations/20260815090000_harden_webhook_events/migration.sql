ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS payload_digest VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_webhook_events_integration_external
  ON public.webhook_events (integration_type, tenant_id, external_id);
