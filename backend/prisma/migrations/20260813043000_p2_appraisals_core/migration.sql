-- P2 appraisals foundation.
-- Reuses accounting.employees as the employee source of truth.

CREATE TABLE IF NOT EXISTS public.workforce_appraisal_cycles (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  code VARCHAR(60) NOT NULL,
  name VARCHAR(160) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  description TEXT,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workforce_appraisal_cycle_code_not_blank CHECK (length(trim(code)) > 0),
  CONSTRAINT workforce_appraisal_cycle_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT workforce_appraisal_cycle_period_valid CHECK (period_end >= period_start),
  CONSTRAINT workforce_appraisal_cycle_status_valid CHECK (status IN ('draft','open','closed')),
  CONSTRAINT ux_workforce_appraisal_cycle_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.workforce_appraisals (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  cycle_id INTEGER NOT NULL REFERENCES public.workforce_appraisal_cycles(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES accounting.employees(id) ON DELETE CASCADE,
  reviewer_user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status VARCHAR(24) NOT NULL DEFAULT 'self_review',
  self_summary TEXT,
  manager_summary TEXT,
  overall_score NUMERIC(5,2),
  self_submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workforce_appraisal_status_valid CHECK (status IN ('self_review','manager_review','completed','cancelled')),
  CONSTRAINT workforce_appraisal_score_valid CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 5)),
  CONSTRAINT ux_workforce_appraisal_cycle_employee UNIQUE (tenant_id, cycle_id, employee_id)
);

CREATE TABLE IF NOT EXISTS public.workforce_appraisal_goals (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  appraisal_id INTEGER NOT NULL REFERENCES public.workforce_appraisals(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  weight NUMERIC(5,2) NOT NULL,
  self_score NUMERIC(4,2),
  self_comment TEXT,
  reviewer_score NUMERIC(4,2),
  reviewer_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workforce_appraisal_goal_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT workforce_appraisal_goal_weight_valid CHECK (weight > 0 AND weight <= 100),
  CONSTRAINT workforce_appraisal_goal_self_score_valid CHECK (self_score IS NULL OR (self_score >= 0 AND self_score <= 5)),
  CONSTRAINT workforce_appraisal_goal_reviewer_score_valid CHECK (reviewer_score IS NULL OR (reviewer_score >= 0 AND reviewer_score <= 5))
);

CREATE INDEX IF NOT EXISTS idx_workforce_appraisal_cycle_scope
  ON public.workforce_appraisal_cycles (tenant_id, status, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_workforce_appraisal_scope
  ON public.workforce_appraisals (tenant_id, cycle_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workforce_appraisal_employee
  ON public.workforce_appraisals (tenant_id, employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workforce_appraisal_reviewer
  ON public.workforce_appraisals (tenant_id, reviewer_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workforce_appraisal_goal_appraisal
  ON public.workforce_appraisal_goals (tenant_id, appraisal_id, id);

COMMENT ON TABLE public.workforce_appraisals IS
  'P2 employee performance reviews bound to accounting.employees. Lifecycle is self_review -> manager_review -> completed, with cancellation as a terminal branch.';

COMMENT ON TABLE public.workforce_appraisal_goals IS
  'Weighted appraisal goals. API requires total goal weight = 100 before an appraisal can be created.';
