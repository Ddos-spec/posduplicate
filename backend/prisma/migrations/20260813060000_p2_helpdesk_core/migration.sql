-- P2.7 Helpdesk core.
-- Reuses existing customer, outlet, project, field-service and accounting employee sources of truth.

CREATE TABLE IF NOT EXISTS public.service_helpdesk_sla_policies (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  name VARCHAR(160) NOT NULL,
  priority VARCHAR(16),
  first_response_minutes INTEGER NOT NULL,
  resolution_minutes INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT helpdesk_sla_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT helpdesk_sla_priority_valid CHECK (priority IS NULL OR priority IN ('low','normal','high','urgent')),
  CONSTRAINT helpdesk_sla_first_response_positive CHECK (first_response_minutes > 0),
  CONSTRAINT helpdesk_sla_resolution_positive CHECK (resolution_minutes > 0),
  CONSTRAINT ux_helpdesk_sla_name UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.service_helpdesk_tickets (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER REFERENCES public.outlets(id) ON DELETE SET NULL,
  customer_id INTEGER REFERENCES public.customers(id) ON DELETE SET NULL,
  project_id INTEGER REFERENCES public.service_projects(id) ON DELETE SET NULL,
  field_order_id INTEGER REFERENCES public.service_field_orders(id) ON DELETE SET NULL,
  sla_policy_id INTEGER REFERENCES public.service_helpdesk_sla_policies(id) ON DELETE SET NULL,
  assigned_employee_id INTEGER REFERENCES accounting.employees(id) ON DELETE SET NULL,
  code VARCHAR(60) NOT NULL,
  subject VARCHAR(220) NOT NULL,
  description TEXT,
  requester_name VARCHAR(160),
  requester_email VARCHAR(255),
  requester_phone VARCHAR(60),
  channel VARCHAR(20) NOT NULL DEFAULT 'internal',
  priority VARCHAR(16) NOT NULL DEFAULT 'normal',
  status VARCHAR(24) NOT NULL DEFAULT 'new',
  first_response_due_at TIMESTAMPTZ,
  resolution_due_at TIMESTAMPTZ,
  first_responded_at TIMESTAMPTZ,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT helpdesk_ticket_code_not_blank CHECK (length(trim(code)) > 0),
  CONSTRAINT helpdesk_ticket_subject_not_blank CHECK (length(trim(subject)) > 0),
  CONSTRAINT helpdesk_ticket_channel_valid CHECK (channel IN ('internal','web','email','whatsapp','phone','social')),
  CONSTRAINT helpdesk_ticket_priority_valid CHECK (priority IN ('low','normal','high','urgent')),
  CONSTRAINT helpdesk_ticket_status_valid CHECK (status IN ('new','open','pending','customer_wait','resolved','closed','cancelled')),
  CONSTRAINT ux_helpdesk_ticket_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.service_helpdesk_messages (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  ticket_id INTEGER NOT NULL REFERENCES public.service_helpdesk_tickets(id) ON DELETE CASCADE,
  author_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  author_employee_id INTEGER REFERENCES accounting.employees(id) ON DELETE SET NULL,
  direction VARCHAR(16) NOT NULL,
  visibility VARCHAR(16) NOT NULL DEFAULT 'public',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT helpdesk_message_direction_valid CHECK (direction IN ('inbound','outbound','internal')),
  CONSTRAINT helpdesk_message_visibility_valid CHECK (visibility IN ('public','internal')),
  CONSTRAINT helpdesk_message_body_not_blank CHECK (length(trim(body)) > 0)
);

CREATE TABLE IF NOT EXISTS public.service_helpdesk_events (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  ticket_id INTEGER NOT NULL REFERENCES public.service_helpdesk_tickets(id) ON DELETE CASCADE,
  event_type VARCHAR(60) NOT NULL,
  actor_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  employee_id INTEGER REFERENCES accounting.employees(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT helpdesk_event_type_not_blank CHECK (length(trim(event_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_helpdesk_sla_scope
  ON public.service_helpdesk_sla_policies (tenant_id, is_active, priority);
CREATE INDEX IF NOT EXISTS idx_helpdesk_ticket_scope
  ON public.service_helpdesk_tickets (tenant_id, status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_helpdesk_ticket_assignee
  ON public.service_helpdesk_tickets (tenant_id, assigned_employee_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_helpdesk_ticket_customer
  ON public.service_helpdesk_tickets (tenant_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_helpdesk_ticket_sla_due
  ON public.service_helpdesk_tickets (tenant_id, status, first_response_due_at, resolution_due_at);
CREATE INDEX IF NOT EXISTS idx_helpdesk_message_ticket
  ON public.service_helpdesk_messages (tenant_id, ticket_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_helpdesk_event_ticket
  ON public.service_helpdesk_events (tenant_id, ticket_id, occurred_at ASC);

DROP TRIGGER IF EXISTS trg_service_helpdesk_message_append_only ON public.service_helpdesk_messages;
CREATE TRIGGER trg_service_helpdesk_message_append_only
BEFORE UPDATE OR DELETE ON public.service_helpdesk_messages
FOR EACH ROW EXECUTE FUNCTION public.prevent_suite_ledger_mutation();

DROP TRIGGER IF EXISTS trg_service_helpdesk_event_append_only ON public.service_helpdesk_events;
CREATE TRIGGER trg_service_helpdesk_event_append_only
BEFORE UPDATE OR DELETE ON public.service_helpdesk_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_suite_ledger_mutation();

COMMENT ON TABLE public.service_helpdesk_tickets IS
  'P2.7 tenant-scoped Helpdesk tickets with optional links to existing customer/project/Field Service sources.';
COMMENT ON TABLE public.service_helpdesk_messages IS
  'P2.7 immutable Helpdesk conversation entries. UPDATE/DELETE are blocked by suite ledger guard.';
COMMENT ON TABLE public.service_helpdesk_events IS
  'P2.7 immutable Helpdesk lifecycle audit events.';
