-- P3.3 auto-renew settings. Disabled by default.
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
