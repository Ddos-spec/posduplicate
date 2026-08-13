-- P2 recruitment foundation.
-- Reuses accounting.employees as the employee source of truth after hiring.

CREATE TABLE IF NOT EXISTS public.workforce_recruitment_vacancies (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER REFERENCES public.outlets(id) ON DELETE SET NULL,
  code VARCHAR(60) NOT NULL,
  title VARCHAR(160) NOT NULL,
  department VARCHAR(120),
  employment_type VARCHAR(30) NOT NULL DEFAULT 'full_time',
  headcount INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  description TEXT,
  hiring_manager_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  target_start_date DATE,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workforce_recruitment_vacancy_code_not_blank CHECK (length(trim(code)) > 0),
  CONSTRAINT workforce_recruitment_vacancy_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT workforce_recruitment_vacancy_headcount_valid CHECK (headcount > 0),
  CONSTRAINT workforce_recruitment_vacancy_type_valid CHECK (employment_type IN ('full_time','part_time','contract','internship','temporary')),
  CONSTRAINT workforce_recruitment_vacancy_status_valid CHECK (status IN ('draft','open','paused','closed')),
  CONSTRAINT ux_workforce_recruitment_vacancy_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.workforce_recruitment_applicants (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  vacancy_id INTEGER NOT NULL REFERENCES public.workforce_recruitment_vacancies(id) ON DELETE CASCADE,
  applicant_name VARCHAR(180) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(60),
  source VARCHAR(80),
  stage VARCHAR(30) NOT NULL DEFAULT 'applied',
  resume_url TEXT,
  notes TEXT,
  expected_salary NUMERIC(15,2),
  hired_employee_id INTEGER REFERENCES accounting.employees(id) ON DELETE SET NULL,
  hired_at TIMESTAMPTZ,
  stage_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workforce_recruitment_applicant_name_not_blank CHECK (length(trim(applicant_name)) > 0),
  CONSTRAINT workforce_recruitment_expected_salary_valid CHECK (expected_salary IS NULL OR expected_salary >= 0),
  CONSTRAINT workforce_recruitment_applicant_stage_valid CHECK (stage IN ('applied','screening','interview','offer','hired','rejected','withdrawn'))
);

CREATE TABLE IF NOT EXISTS public.workforce_recruitment_interviews (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  applicant_id INTEGER NOT NULL REFERENCES public.workforce_recruitment_applicants(id) ON DELETE CASCADE,
  interviewer_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  score NUMERIC(5,2),
  feedback TEXT,
  completed_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workforce_recruitment_interview_duration_valid CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  CONSTRAINT workforce_recruitment_interview_score_valid CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  CONSTRAINT workforce_recruitment_interview_status_valid CHECK (status IN ('scheduled','completed','cancelled'))
);

CREATE TABLE IF NOT EXISTS public.workforce_recruitment_offers (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  applicant_id INTEGER NOT NULL REFERENCES public.workforce_recruitment_applicants(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  offered_salary NUMERIC(15,2) NOT NULL,
  start_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  notes TEXT,
  offered_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workforce_recruitment_offer_salary_valid CHECK (offered_salary >= 0),
  CONSTRAINT workforce_recruitment_offer_version_valid CHECK (version > 0),
  CONSTRAINT workforce_recruitment_offer_status_valid CHECK (status IN ('draft','sent','accepted','declined','withdrawn')),
  CONSTRAINT ux_workforce_recruitment_offer_version UNIQUE (tenant_id, applicant_id, version)
);

CREATE INDEX IF NOT EXISTS idx_workforce_recruitment_vacancy_scope
  ON public.workforce_recruitment_vacancies (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workforce_recruitment_applicant_scope
  ON public.workforce_recruitment_applicants (tenant_id, vacancy_id, stage, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_workforce_recruitment_applicant_email_vacancy
  ON public.workforce_recruitment_applicants (tenant_id, vacancy_id, lower(email))
  WHERE email IS NOT NULL AND length(trim(email)) > 0;

CREATE UNIQUE INDEX IF NOT EXISTS ux_workforce_recruitment_hired_employee
  ON public.workforce_recruitment_applicants (hired_employee_id)
  WHERE hired_employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workforce_recruitment_interview_applicant
  ON public.workforce_recruitment_interviews (tenant_id, applicant_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_workforce_recruitment_offer_applicant
  ON public.workforce_recruitment_offers (tenant_id, applicant_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_workforce_recruitment_offer_accepted
  ON public.workforce_recruitment_offers (tenant_id, applicant_id)
  WHERE status = 'accepted';

COMMENT ON TABLE public.workforce_recruitment_applicants IS
  'P2 recruitment pipeline. interview/offer/hired stages are reached only through their dedicated transactional actions.';

COMMENT ON COLUMN public.workforce_recruitment_applicants.hired_employee_id IS
  'Links a hired applicant to the existing accounting.employees source of truth; no parallel employee master is created.';
