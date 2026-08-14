-- P4 Intelligence: immutable evidence runs/findings plus approval-gated, idempotent agent actions.
-- Operational execution is deliberately limited to a server-validated replenishment RFQ action.

CREATE TABLE IF NOT EXISTS public.intelligence_runs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  analysis_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  data_cutoff TIMESTAMPTZ NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT intelligence_run_type_valid CHECK (analysis_type IN ('overview','copilot')),
  CONSTRAINT intelligence_run_status_valid CHECK (status IN ('completed','failed')),
  CONSTRAINT intelligence_run_parameters_object CHECK (jsonb_typeof(parameters) = 'object'),
  CONSTRAINT intelligence_run_evidence_object CHECK (jsonb_typeof(evidence_summary) = 'object'),
  CONSTRAINT ux_intelligence_run_scope_id UNIQUE (tenant_id,id)
);
CREATE INDEX IF NOT EXISTS idx_intelligence_run_scope ON public.intelligence_runs (tenant_id,analysis_type,id DESC);

CREATE TABLE IF NOT EXISTS public.intelligence_findings (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  run_id BIGINT NOT NULL,
  finding_type VARCHAR(40) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  entity_type VARCHAR(40),
  entity_id VARCHAR(120),
  title VARCHAR(220) NOT NULL,
  explanation TEXT NOT NULL,
  observed JSONB NOT NULL DEFAULT '{}'::jsonb,
  derived JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(5,4) NOT NULL,
  recommended_action JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT intelligence_finding_type_valid CHECK (finding_type IN ('sales_signal','stock_risk','cashflow_gap','margin_leakage','demand_signal','replenishment')),
  CONSTRAINT intelligence_finding_severity_valid CHECK (severity IN ('info','low','medium','high','critical')),
  CONSTRAINT intelligence_finding_confidence_valid CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT intelligence_finding_observed_object CHECK (jsonb_typeof(observed) = 'object'),
  CONSTRAINT intelligence_finding_derived_object CHECK (jsonb_typeof(derived) = 'object'),
  CONSTRAINT intelligence_finding_action_object CHECK (jsonb_typeof(recommended_action) = 'object'),
  CONSTRAINT fk_intelligence_finding_run_scope FOREIGN KEY (tenant_id,run_id)
    REFERENCES public.intelligence_runs(tenant_id,id) ON DELETE CASCADE,
  CONSTRAINT ux_intelligence_finding_scope_id UNIQUE (tenant_id,id)
);
CREATE INDEX IF NOT EXISTS idx_intelligence_finding_scope ON public.intelligence_findings (tenant_id,run_id,severity,id);

CREATE TABLE IF NOT EXISTS public.agent_action_requests (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  finding_id BIGINT,
  action_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_approval',
  idempotency_key VARCHAR(160) NOT NULL,
  requested_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  reviewed_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  review_note VARCHAR(600),
  executed_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  result JSONB,
  last_error VARCHAR(1000),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agent_action_type_valid CHECK (action_type IN ('create_replenishment_rfq')),
  CONSTRAINT agent_action_payload_object CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT agent_action_result_object CHECK (result IS NULL OR jsonb_typeof(result) = 'object'),
  CONSTRAINT agent_action_status_valid CHECK (status IN ('pending_approval','approved','rejected','executing','completed','failed','cancelled')),
  CONSTRAINT ux_agent_action_idempotency UNIQUE (tenant_id,idempotency_key),
  CONSTRAINT ux_agent_action_scope_id UNIQUE (tenant_id,id),
  CONSTRAINT fk_agent_action_finding_scope FOREIGN KEY (tenant_id,finding_id)
    REFERENCES public.intelligence_findings(tenant_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_agent_action_scope ON public.agent_action_requests (tenant_id,status,id DESC);

CREATE TABLE IF NOT EXISTS public.agent_action_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  action_id BIGINT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  actor_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agent_action_event_type_not_blank CHECK (length(trim(event_type)) > 0),
  CONSTRAINT agent_action_event_payload_object CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT fk_agent_action_event_scope FOREIGN KEY (tenant_id,action_id)
    REFERENCES public.agent_action_requests(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_agent_action_event_scope ON public.agent_action_events (tenant_id,action_id,id);

CREATE OR REPLACE FUNCTION public.prevent_intelligence_evidence_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS trg_intelligence_runs_immutable ON public.intelligence_runs;
CREATE TRIGGER trg_intelligence_runs_immutable
BEFORE UPDATE OR DELETE ON public.intelligence_runs
FOR EACH ROW EXECUTE FUNCTION public.prevent_intelligence_evidence_mutation();

DROP TRIGGER IF EXISTS trg_intelligence_findings_immutable ON public.intelligence_findings;
CREATE TRIGGER trg_intelligence_findings_immutable
BEFORE UPDATE OR DELETE ON public.intelligence_findings
FOR EACH ROW EXECUTE FUNCTION public.prevent_intelligence_evidence_mutation();

DROP TRIGGER IF EXISTS trg_agent_action_events_immutable ON public.agent_action_events;
CREATE TRIGGER trg_agent_action_events_immutable
BEFORE UPDATE OR DELETE ON public.agent_action_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_intelligence_evidence_mutation();

DROP TRIGGER IF EXISTS trg_agent_action_requests_no_delete ON public.agent_action_requests;
CREATE TRIGGER trg_agent_action_requests_no_delete
BEFORE DELETE ON public.agent_action_requests
FOR EACH ROW EXECUTE FUNCTION public.prevent_intelligence_evidence_mutation();

CREATE OR REPLACE FUNCTION public.enforce_agent_action_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id
     OR OLD.action_type IS DISTINCT FROM NEW.action_type
     OR OLD.payload IS DISTINCT FROM NEW.payload
     OR OLD.idempotency_key IS DISTINCT FROM NEW.idempotency_key
     OR OLD.requested_by IS DISTINCT FROM NEW.requested_by THEN
    RAISE EXCEPTION 'Agent action request scope and approved payload are immutable';
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'pending_approval' AND NEW.status IN ('approved','rejected','cancelled')) OR
    (OLD.status = 'approved' AND NEW.status IN ('executing','failed','cancelled')) OR
    (OLD.status = 'executing' AND NEW.status IN ('completed','failed')) OR
    (OLD.status = 'failed' AND NEW.status IN ('approved','cancelled'))
  ) THEN
    RAISE EXCEPTION 'Invalid agent action transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_action_transition ON public.agent_action_requests;
CREATE TRIGGER trg_agent_action_transition
BEFORE UPDATE ON public.agent_action_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_agent_action_transition();
