-- P3.3 controlled auto-renew configuration. Disabled by default; the actor must
-- be an explicit active tenant user validated by the application before enablement.

CREATE TABLE IF NOT EXISTS public.subscription_automation_settings (
  tenant_id INTEGER PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  automation_user_id INTEGER REFERENCES public.users(id) ON DELETE RESTRICT,
  max_renewals_per_run INTEGER NOT NULL DEFAULT 100,
  last_run_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  updated_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_automation_batch_valid CHECK (max_renewals_per_run BETWEEN 1 AND 500),
  CONSTRAINT subscription_automation_actor_required CHECK (NOT enabled OR automation_user_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.subscription_automation_runs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  attempted_count INTEGER NOT NULL DEFAULT 0,
  succeeded_count INTEGER NOT NULL DEFAULT 0,
  reused_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT subscription_automation_run_status_valid CHECK (status IN ('running','success','partial','failed')),
  CONSTRAINT subscription_automation_run_counts_valid CHECK (
    attempted_count >= 0 AND succeeded_count >= 0 AND reused_count >= 0 AND failed_count >= 0
  )
);
CREATE INDEX IF NOT EXISTS idx_subscription_automation_run_scope
  ON public.subscription_automation_runs (tenant_id, started_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.prevent_subscription_automation_run_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'subscription_automation_runs cannot be deleted';
  END IF;
  IF OLD.status <> 'running' THEN
    RAISE EXCEPTION 'completed subscription_automation_runs are immutable';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_subscription_automation_runs_immutable ON public.subscription_automation_runs;
CREATE TRIGGER trg_subscription_automation_runs_immutable
BEFORE UPDATE OR DELETE ON public.subscription_automation_runs
FOR EACH ROW EXECUTE FUNCTION public.prevent_subscription_automation_run_mutation();
