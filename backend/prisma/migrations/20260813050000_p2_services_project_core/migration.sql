-- P2 Services foundation: Projects, Timesheets and Planning.
-- Reuses accounting.employees, public.customers, public.outlets and public.users as sources of truth.

CREATE TABLE IF NOT EXISTS public.service_projects (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  outlet_id INTEGER REFERENCES public.outlets(id) ON DELETE SET NULL,
  customer_id INTEGER REFERENCES public.customers(id) ON DELETE SET NULL,
  code VARCHAR(60) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  owner_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  start_date DATE,
  due_date DATE,
  planned_minutes INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_project_code_not_blank CHECK (length(trim(code)) > 0),
  CONSTRAINT service_project_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT service_project_dates_valid CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date),
  CONSTRAINT service_project_planned_minutes_valid CHECK (planned_minutes >= 0),
  CONSTRAINT service_project_status_valid CHECK (status IN ('draft','open','on_hold','completed','cancelled')),
  CONSTRAINT ux_service_project_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS public.service_project_tasks (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL REFERENCES public.service_projects(id) ON DELETE CASCADE,
  title VARCHAR(220) NOT NULL,
  description TEXT,
  assignee_employee_id INTEGER REFERENCES accounting.employees(id) ON DELETE SET NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'todo',
  priority VARCHAR(16) NOT NULL DEFAULT 'normal',
  planned_minutes INTEGER NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_task_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT service_task_planned_minutes_valid CHECK (planned_minutes >= 0),
  CONSTRAINT service_task_status_valid CHECK (status IN ('todo','in_progress','blocked','done','cancelled')),
  CONSTRAINT service_task_priority_valid CHECK (priority IN ('low','normal','high','urgent'))
);

CREATE TABLE IF NOT EXISTS public.service_timesheet_entries (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL REFERENCES public.service_projects(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES public.service_project_tasks(id) ON DELETE SET NULL,
  employee_id INTEGER NOT NULL REFERENCES accounting.employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  minutes INTEGER NOT NULL,
  billable BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'submitted',
  approved_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_timesheet_minutes_valid CHECK (minutes > 0 AND minutes <= 1440),
  CONSTRAINT service_timesheet_status_valid CHECK (status IN ('submitted','approved','rejected'))
);

CREATE TABLE IF NOT EXISTS public.service_planning_allocations (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  project_id INTEGER REFERENCES public.service_projects(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES public.service_project_tasks(id) ON DELETE SET NULL,
  employee_id INTEGER NOT NULL REFERENCES accounting.employees(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_planning_period_valid CHECK (end_at > start_at),
  CONSTRAINT service_planning_status_valid CHECK (status IN ('planned','confirmed','done','cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_service_project_scope
  ON public.service_projects (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_task_scope
  ON public.service_project_tasks (tenant_id, project_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_task_assignee
  ON public.service_project_tasks (tenant_id, assignee_employee_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_service_timesheet_scope
  ON public.service_timesheet_entries (tenant_id, project_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_service_timesheet_employee
  ON public.service_timesheet_entries (tenant_id, employee_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_service_planning_employee
  ON public.service_planning_allocations (tenant_id, employee_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_service_planning_project
  ON public.service_planning_allocations (tenant_id, project_id, start_at);

COMMENT ON TABLE public.service_projects IS
  'P2 Services project master. Tenant-scoped project lifecycle; existing customer/outlet/user masters are referenced rather than duplicated.';
COMMENT ON TABLE public.service_timesheet_entries IS
  'P2 Services time entries bound to accounting.employees. Self-service API resolves employee from authenticated user.';
COMMENT ON TABLE public.service_planning_allocations IS
  'P2 Services workforce allocations. API serializes allocation writes and rejects overlapping active allocations per employee.';
