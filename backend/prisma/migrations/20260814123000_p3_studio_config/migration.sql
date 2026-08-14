-- P3.8 Studio: tenant-scoped custom fields, record values, deterministic workflow rules,
-- immutable rule executions, and an append-only audit trail. Rules are data-only JSON DSL;
-- no executable code is stored or evaluated.

CREATE TABLE IF NOT EXISTS public.studio_fields (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(40) NOT NULL,
  field_key VARCHAR(80) NOT NULL,
  label VARCHAR(160) NOT NULL,
  data_type VARCHAR(20) NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT studio_field_entity_valid CHECK (entity_type IN ('customer','crm_opportunity','sales_order','inventory','equipment')),
  CONSTRAINT studio_field_key_valid CHECK (field_key ~ '^[a-z][a-z0-9_]{1,79}$'),
  CONSTRAINT studio_field_label_not_blank CHECK (length(trim(label)) > 0),
  CONSTRAINT studio_field_type_valid CHECK (data_type IN ('text','number','boolean','date','select')),
  CONSTRAINT studio_field_options_array CHECK (jsonb_typeof(options) = 'array'),
  CONSTRAINT studio_field_status_valid CHECK (status IN ('active','archived')),
  CONSTRAINT ux_studio_field_key UNIQUE (tenant_id,entity_type,field_key),
  CONSTRAINT ux_studio_field_scope_id UNIQUE (tenant_id,id)
);
CREATE INDEX IF NOT EXISTS idx_studio_field_scope ON public.studio_fields (tenant_id,entity_type,status,id);

CREATE TABLE IF NOT EXISTS public.studio_record_values (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  field_id BIGINT NOT NULL,
  record_key VARCHAR(120) NOT NULL,
  value JSONB NOT NULL,
  updated_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT studio_record_key_not_blank CHECK (length(trim(record_key)) > 0),
  CONSTRAINT ux_studio_record_value UNIQUE (tenant_id,field_id,record_key),
  CONSTRAINT fk_studio_record_value_field_scope FOREIGN KEY (tenant_id,field_id)
    REFERENCES public.studio_fields(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_studio_record_value_scope ON public.studio_record_values (tenant_id,record_key,field_id);

CREATE TABLE IF NOT EXISTS public.studio_workflow_rules (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(40) NOT NULL,
  name VARCHAR(180) NOT NULL,
  trigger_event VARCHAR(30) NOT NULL,
  condition JSONB NOT NULL,
  action JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT studio_rule_entity_valid CHECK (entity_type IN ('customer','crm_opportunity','sales_order','inventory','equipment')),
  CONSTRAINT studio_rule_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT studio_rule_trigger_valid CHECK (trigger_event IN ('created','updated','status_changed','manual')),
  CONSTRAINT studio_rule_condition_object CHECK (jsonb_typeof(condition) = 'object'),
  CONSTRAINT studio_rule_action_object CHECK (jsonb_typeof(action) = 'object'),
  CONSTRAINT studio_rule_status_valid CHECK (status IN ('draft','active','archived')),
  CONSTRAINT ux_studio_rule_scope_id UNIQUE (tenant_id,id)
);
CREATE INDEX IF NOT EXISTS idx_studio_rule_scope ON public.studio_workflow_rules (tenant_id,entity_type,status,trigger_event,id);

CREATE TABLE IF NOT EXISTS public.studio_rule_executions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id BIGINT NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  record_key VARCHAR(120) NOT NULL,
  execution_status VARCHAR(30) NOT NULL,
  input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT studio_execution_status_valid CHECK (execution_status IN ('applied','review_required','skipped')),
  CONSTRAINT studio_execution_input_object CHECK (jsonb_typeof(input_snapshot) = 'object'),
  CONSTRAINT studio_execution_output_object CHECK (jsonb_typeof(output) = 'object'),
  CONSTRAINT fk_studio_execution_rule_scope FOREIGN KEY (tenant_id,rule_id)
    REFERENCES public.studio_workflow_rules(tenant_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_studio_execution_scope ON public.studio_rule_executions (tenant_id,entity_type,record_key,id DESC);

CREATE TABLE IF NOT EXISTS public.studio_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(40) NOT NULL,
  entity_id VARCHAR(120) NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  actor_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT studio_event_type_not_blank CHECK (length(trim(event_type)) > 0),
  CONSTRAINT studio_event_payload_object CHECK (jsonb_typeof(payload) = 'object')
);
CREATE INDEX IF NOT EXISTS idx_studio_event_scope ON public.studio_events (tenant_id,entity_type,entity_id,id DESC);

CREATE OR REPLACE FUNCTION public.prevent_studio_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS trg_studio_rule_executions_immutable ON public.studio_rule_executions;
CREATE TRIGGER trg_studio_rule_executions_immutable
BEFORE UPDATE OR DELETE ON public.studio_rule_executions
FOR EACH ROW EXECUTE FUNCTION public.prevent_studio_audit_mutation();
DROP TRIGGER IF EXISTS trg_studio_events_immutable ON public.studio_events;
CREATE TRIGGER trg_studio_events_immutable
BEFORE UPDATE OR DELETE ON public.studio_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_studio_audit_mutation();
