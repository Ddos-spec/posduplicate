-- P3.5 public participation idempotency.
-- Opaque browser submission tokens are SHA-256 hashed server-side; raw tokens are never persisted.

ALTER TABLE public.marketing_event_registrations
  ADD COLUMN IF NOT EXISTS submission_key_hash CHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS ux_marketing_event_registration_submission_key
  ON public.marketing_event_registrations (tenant_id, event_id, submission_key_hash)
  WHERE submission_key_hash IS NOT NULL;

ALTER TABLE public.marketing_survey_responses
  ADD COLUMN IF NOT EXISTS submission_key_hash CHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS ux_marketing_survey_response_submission_key
  ON public.marketing_survey_responses (tenant_id, survey_id, submission_key_hash)
  WHERE submission_key_hash IS NOT NULL;

COMMENT ON COLUMN public.marketing_event_registrations.submission_key_hash IS
  'SHA-256 of opaque public registration attempt token; ensures network retries do not consume capacity twice.';
COMMENT ON COLUMN public.marketing_survey_responses.submission_key_hash IS
  'SHA-256 of opaque public survey submission attempt token; ensures network retries do not create duplicate responses.';
