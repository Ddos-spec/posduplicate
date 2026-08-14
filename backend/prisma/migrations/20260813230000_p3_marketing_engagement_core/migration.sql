-- P3.5 Marketing Engagement core.
-- Reuses public.customers and existing messaging/broadcast surfaces; no parallel customer master or delivery ledger.

CREATE TABLE IF NOT EXISTS public.marketing_journeys (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  trigger_type VARCHAR(40) NOT NULL DEFAULT 'manual',
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  audience_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketing_journey_status_valid CHECK (status IN ('draft','active','paused','archived')),
  CONSTRAINT marketing_journey_trigger_valid CHECK (trigger_type IN ('manual','event_registration','survey_submitted','customer_created','scheduled')),
  CONSTRAINT marketing_journey_name_not_blank CHECK (length(trim(name)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_marketing_journey_scope
  ON public.marketing_journeys (tenant_id, status, id);

CREATE TABLE IF NOT EXISTS public.marketing_journey_steps (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  journey_id INTEGER NOT NULL REFERENCES public.marketing_journeys(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  step_type VARCHAR(30) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketing_journey_step_position_valid CHECK (position >= 0),
  CONSTRAINT marketing_journey_step_type_valid CHECK (step_type IN ('wait','broadcast','tag','notify')),
  CONSTRAINT ux_marketing_journey_step_position UNIQUE (tenant_id, journey_id, position)
);
CREATE INDEX IF NOT EXISTS idx_marketing_journey_step_scope
  ON public.marketing_journey_steps (tenant_id, journey_id, position, id);

CREATE TABLE IF NOT EXISTS public.marketing_events (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(220) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  venue VARCHAR(240),
  capacity INTEGER,
  registration_open BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketing_event_status_valid CHECK (status IN ('draft','published','closed','cancelled')),
  CONSTRAINT marketing_event_time_valid CHECK (ends_at > starts_at),
  CONSTRAINT marketing_event_capacity_valid CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT marketing_event_slug_not_blank CHECK (length(trim(slug)) > 0),
  CONSTRAINT marketing_event_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT ux_marketing_event_slug UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_marketing_event_scope
  ON public.marketing_events (tenant_id, status, starts_at, id);

CREATE TABLE IF NOT EXISTS public.marketing_event_registrations (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES public.marketing_events(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES public.customers(id) ON DELETE SET NULL,
  attendee_name VARCHAR(180) NOT NULL,
  attendee_email VARCHAR(240),
  attendee_phone VARCHAR(80),
  seats INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'registered',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_in_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT marketing_event_registration_status_valid CHECK (status IN ('registered','checked_in','cancelled','no_show')),
  CONSTRAINT marketing_event_registration_seats_valid CHECK (seats BETWEEN 1 AND 100),
  CONSTRAINT marketing_event_attendee_name_not_blank CHECK (length(trim(attendee_name)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_marketing_event_registration_scope
  ON public.marketing_event_registrations (tenant_id, event_id, status, id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_marketing_event_registration_customer
  ON public.marketing_event_registrations (tenant_id, event_id, customer_id)
  WHERE customer_id IS NOT NULL AND status <> 'cancelled';

CREATE TABLE IF NOT EXISTS public.marketing_surveys (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug VARCHAR(120) NOT NULL,
  title VARCHAR(220) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketing_survey_status_valid CHECK (status IN ('draft','published','closed','archived')),
  CONSTRAINT marketing_survey_slug_not_blank CHECK (length(trim(slug)) > 0),
  CONSTRAINT marketing_survey_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT ux_marketing_survey_slug UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_marketing_survey_scope
  ON public.marketing_surveys (tenant_id, status, id);

CREATE TABLE IF NOT EXISTS public.marketing_survey_questions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  survey_id INTEGER NOT NULL REFERENCES public.marketing_surveys(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  question_type VARCHAR(30) NOT NULL,
  prompt TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketing_survey_question_position_valid CHECK (position >= 0),
  CONSTRAINT marketing_survey_question_type_valid CHECK (question_type IN ('short_text','long_text','single_choice','multiple_choice','rating','nps')),
  CONSTRAINT marketing_survey_question_prompt_not_blank CHECK (length(trim(prompt)) > 0),
  CONSTRAINT ux_marketing_survey_question_position UNIQUE (tenant_id, survey_id, position)
);
CREATE INDEX IF NOT EXISTS idx_marketing_survey_question_scope
  ON public.marketing_survey_questions (tenant_id, survey_id, position, id);

CREATE TABLE IF NOT EXISTS public.marketing_survey_responses (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  survey_id INTEGER NOT NULL REFERENCES public.marketing_surveys(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES public.customers(id) ON DELETE SET NULL,
  respondent_name VARCHAR(180),
  respondent_email VARCHAR(240),
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  CONSTRAINT marketing_survey_response_status_valid CHECK (status IN ('in_progress','submitted'))
);
CREATE INDEX IF NOT EXISTS idx_marketing_survey_response_scope
  ON public.marketing_survey_responses (tenant_id, survey_id, status, id);

CREATE TABLE IF NOT EXISTS public.marketing_survey_answers (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  response_id BIGINT NOT NULL REFERENCES public.marketing_survey_responses(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES public.marketing_survey_questions(id) ON DELETE RESTRICT,
  answer JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ux_marketing_survey_answer UNIQUE (tenant_id, response_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_marketing_survey_answer_scope
  ON public.marketing_survey_answers (tenant_id, response_id, question_id);

CREATE TABLE IF NOT EXISTS public.marketing_engagement_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(30) NOT NULL,
  entity_id BIGINT NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  actor_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  customer_id INTEGER REFERENCES public.customers(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketing_engagement_entity_type_valid CHECK (entity_type IN ('journey','event','registration','survey','response')),
  CONSTRAINT marketing_engagement_event_type_not_blank CHECK (length(trim(event_type)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_marketing_engagement_event_scope
  ON public.marketing_engagement_events (tenant_id, entity_type, entity_id, id);

CREATE OR REPLACE FUNCTION public.prevent_marketing_engagement_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'marketing_engagement_events is append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_marketing_engagement_events_immutable ON public.marketing_engagement_events;
CREATE TRIGGER trg_marketing_engagement_events_immutable
BEFORE UPDATE OR DELETE ON public.marketing_engagement_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_marketing_engagement_event_mutation();

COMMENT ON TABLE public.marketing_journeys IS
  'P3.5 declarative lifecycle journeys. Delivery remains on existing messaging/broadcast infrastructure.';
COMMENT ON TABLE public.marketing_event_registrations IS
  'P3.5 event registrations referencing existing customers when available; attendee fields are immutable booking snapshots, not a customer master.';
COMMENT ON TABLE public.marketing_survey_responses IS
  'P3.5 survey response records referencing existing customers when available.';
COMMENT ON TABLE public.marketing_engagement_events IS
  'Append-only P3.5 engagement lifecycle audit ledger.';
