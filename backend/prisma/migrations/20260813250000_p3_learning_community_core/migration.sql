-- P3.7 Learning & Community core.
-- Reuses public.customers for learners, public.users for staff authors/moderators,
-- and public.website_sites for public publishing. No parallel learner/customer/user master.

CREATE UNIQUE INDEX IF NOT EXISTS ux_website_sites_tenant_id_id
  ON public.website_sites (tenant_id, id);

CREATE TABLE IF NOT EXISTS public.learning_courses (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  site_id INTEGER,
  slug VARCHAR(140) NOT NULL,
  title VARCHAR(220) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  visibility VARCHAR(20) NOT NULL DEFAULT 'private',
  difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner',
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT learning_course_slug_not_blank CHECK (length(trim(slug)) > 0),
  CONSTRAINT learning_course_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT learning_course_status_valid CHECK (status IN ('draft','published','archived')),
  CONSTRAINT learning_course_visibility_valid CHECK (visibility IN ('public','private')),
  CONSTRAINT learning_course_difficulty_valid CHECK (difficulty IN ('beginner','intermediate','advanced')),
  CONSTRAINT ux_learning_course_slug UNIQUE (tenant_id, slug),
  CONSTRAINT fk_learning_course_site_scope FOREIGN KEY (tenant_id, site_id)
    REFERENCES public.website_sites(tenant_id, id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_course_tenant_id_id
  ON public.learning_courses (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_learning_course_scope
  ON public.learning_courses (tenant_id, status, visibility, id);

CREATE TABLE IF NOT EXISTS public.learning_lessons (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  slug VARCHAR(140) NOT NULL,
  title VARCHAR(220) NOT NULL,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT learning_lesson_position_valid CHECK (position >= 0),
  CONSTRAINT learning_lesson_duration_valid CHECK (duration_minutes >= 0),
  CONSTRAINT learning_lesson_slug_not_blank CHECK (length(trim(slug)) > 0),
  CONSTRAINT learning_lesson_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT learning_lesson_status_valid CHECK (status IN ('draft','published','archived')),
  CONSTRAINT ux_learning_lesson_position UNIQUE (tenant_id, course_id, position),
  CONSTRAINT ux_learning_lesson_slug UNIQUE (tenant_id, course_id, slug),
  CONSTRAINT fk_learning_lesson_course_scope FOREIGN KEY (tenant_id, course_id)
    REFERENCES public.learning_courses(tenant_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_lesson_tenant_id_id
  ON public.learning_lessons (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_learning_lesson_scope
  ON public.learning_lessons (tenant_id, course_id, status, position, id);

CREATE TABLE IF NOT EXISTS public.learning_assessments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL,
  lesson_id INTEGER,
  title VARCHAR(220) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  passing_score NUMERIC(5,2) NOT NULL DEFAULT 70,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT learning_assessment_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT learning_assessment_status_valid CHECK (status IN ('draft','published','archived')),
  CONSTRAINT learning_assessment_passing_score_valid CHECK (passing_score BETWEEN 0 AND 100),
  CONSTRAINT learning_assessment_max_attempts_valid CHECK (max_attempts BETWEEN 1 AND 100),
  CONSTRAINT fk_learning_assessment_course_scope FOREIGN KEY (tenant_id, course_id)
    REFERENCES public.learning_courses(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_learning_assessment_lesson_scope FOREIGN KEY (tenant_id, lesson_id)
    REFERENCES public.learning_lessons(tenant_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_assessment_tenant_id_id
  ON public.learning_assessments (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_learning_assessment_scope
  ON public.learning_assessments (tenant_id, course_id, status, id);

CREATE TABLE IF NOT EXISTS public.learning_assessment_questions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assessment_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  question_type VARCHAR(24) NOT NULL,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer JSONB NOT NULL DEFAULT 'null'::jsonb,
  points NUMERIC(8,2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT learning_question_position_valid CHECK (position >= 0),
  CONSTRAINT learning_question_type_valid CHECK (question_type IN ('single_choice','multiple_choice','true_false','short_text')),
  CONSTRAINT learning_question_prompt_not_blank CHECK (length(trim(prompt)) > 0),
  CONSTRAINT learning_question_points_valid CHECK (points > 0),
  CONSTRAINT ux_learning_question_position UNIQUE (tenant_id, assessment_id, position),
  CONSTRAINT fk_learning_question_assessment_scope FOREIGN KEY (tenant_id, assessment_id)
    REFERENCES public.learning_assessments(tenant_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_question_tenant_id_id
  ON public.learning_assessment_questions (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_learning_question_scope
  ON public.learning_assessment_questions (tenant_id, assessment_id, position, id);

CREATE TABLE IF NOT EXISTS public.learning_enrollments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT learning_enrollment_status_valid CHECK (status IN ('active','completed','cancelled')),
  CONSTRAINT ux_learning_enrollment_customer UNIQUE (tenant_id, course_id, customer_id),
  CONSTRAINT fk_learning_enrollment_course_scope FOREIGN KEY (tenant_id, course_id)
    REFERENCES public.learning_courses(tenant_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_enrollment_tenant_id_id
  ON public.learning_enrollments (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_learning_enrollment_scope
  ON public.learning_enrollments (tenant_id, course_id, status, customer_id, id);

CREATE TABLE IF NOT EXISTS public.learning_progress (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  enrollment_id BIGINT NOT NULL,
  lesson_id INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started',
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT learning_progress_status_valid CHECK (status IN ('not_started','in_progress','completed')),
  CONSTRAINT learning_progress_percent_valid CHECK (progress_percent BETWEEN 0 AND 100),
  CONSTRAINT ux_learning_progress_lesson UNIQUE (tenant_id, enrollment_id, lesson_id),
  CONSTRAINT fk_learning_progress_enrollment_scope FOREIGN KEY (tenant_id, enrollment_id)
    REFERENCES public.learning_enrollments(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_learning_progress_lesson_scope FOREIGN KEY (tenant_id, lesson_id)
    REFERENCES public.learning_lessons(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_learning_progress_scope
  ON public.learning_progress (tenant_id, enrollment_id, status, id);

CREATE TABLE IF NOT EXISTS public.learning_attempts (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  enrollment_id BIGINT NOT NULL,
  assessment_id INTEGER NOT NULL,
  attempt_no INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  score NUMERIC(8,2),
  max_score NUMERIC(8,2),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  CONSTRAINT learning_attempt_no_valid CHECK (attempt_no > 0),
  CONSTRAINT learning_attempt_status_valid CHECK (status IN ('in_progress','submitted','passed','failed')),
  CONSTRAINT learning_attempt_score_valid CHECK (score IS NULL OR score >= 0),
  CONSTRAINT learning_attempt_max_score_valid CHECK (max_score IS NULL OR max_score > 0),
  CONSTRAINT ux_learning_attempt_number UNIQUE (tenant_id, enrollment_id, assessment_id, attempt_no),
  CONSTRAINT fk_learning_attempt_enrollment_scope FOREIGN KEY (tenant_id, enrollment_id)
    REFERENCES public.learning_enrollments(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_learning_attempt_assessment_scope FOREIGN KEY (tenant_id, assessment_id)
    REFERENCES public.learning_assessments(tenant_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_attempt_tenant_id_id
  ON public.learning_attempts (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_learning_attempt_scope
  ON public.learning_attempts (tenant_id, enrollment_id, assessment_id, status, id);

CREATE TABLE IF NOT EXISTS public.learning_attempt_answers (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  attempt_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  answer JSONB NOT NULL,
  points_awarded NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT learning_attempt_answer_points_valid CHECK (points_awarded >= 0),
  CONSTRAINT ux_learning_attempt_answer_question UNIQUE (tenant_id, attempt_id, question_id),
  CONSTRAINT fk_learning_attempt_answer_attempt_scope FOREIGN KEY (tenant_id, attempt_id)
    REFERENCES public.learning_attempts(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_learning_attempt_answer_question_scope FOREIGN KEY (tenant_id, question_id)
    REFERENCES public.learning_assessment_questions(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_learning_attempt_answer_scope
  ON public.learning_attempt_answers (tenant_id, attempt_id, question_id, id);

CREATE TABLE IF NOT EXISTS public.learning_certificates (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  enrollment_id BIGINT NOT NULL,
  certificate_number VARCHAR(120) NOT NULL,
  evidence_sha256 CHAR(64) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT learning_certificate_number_not_blank CHECK (length(trim(certificate_number)) > 0),
  CONSTRAINT learning_certificate_hash_valid CHECK (length(evidence_sha256) = 64),
  CONSTRAINT ux_learning_certificate_enrollment UNIQUE (tenant_id, enrollment_id),
  CONSTRAINT ux_learning_certificate_number UNIQUE (tenant_id, certificate_number),
  CONSTRAINT fk_learning_certificate_enrollment_scope FOREIGN KEY (tenant_id, enrollment_id)
    REFERENCES public.learning_enrollments(tenant_id, id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_learning_certificate_scope
  ON public.learning_certificates (tenant_id, issued_at DESC, id);

CREATE TABLE IF NOT EXISTS public.learning_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id INTEGER,
  enrollment_id BIGINT,
  event_type VARCHAR(80) NOT NULL,
  actor_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  customer_id INTEGER REFERENCES public.customers(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT learning_event_type_not_blank CHECK (length(trim(event_type)) > 0),
  CONSTRAINT fk_learning_event_course_scope FOREIGN KEY (tenant_id, course_id)
    REFERENCES public.learning_courses(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_learning_event_enrollment_scope FOREIGN KEY (tenant_id, enrollment_id)
    REFERENCES public.learning_enrollments(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_learning_event_scope
  ON public.learning_events (tenant_id, course_id, enrollment_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS public.community_forums (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  site_id INTEGER,
  slug VARCHAR(140) NOT NULL,
  name VARCHAR(220) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  visibility VARCHAR(20) NOT NULL DEFAULT 'private',
  created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_forum_slug_not_blank CHECK (length(trim(slug)) > 0),
  CONSTRAINT community_forum_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT community_forum_status_valid CHECK (status IN ('draft','published','archived')),
  CONSTRAINT community_forum_visibility_valid CHECK (visibility IN ('public','private')),
  CONSTRAINT ux_community_forum_slug UNIQUE (tenant_id, slug),
  CONSTRAINT fk_community_forum_site_scope FOREIGN KEY (tenant_id, site_id)
    REFERENCES public.website_sites(tenant_id, id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_community_forum_tenant_id_id
  ON public.community_forums (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_community_forum_scope
  ON public.community_forums (tenant_id, status, visibility, id);

CREATE TABLE IF NOT EXISTS public.community_topics (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  forum_id INTEGER NOT NULL,
  slug VARCHAR(180) NOT NULL,
  title VARCHAR(240) NOT NULL,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  customer_id INTEGER REFERENCES public.customers(id) ON DELETE SET NULL,
  author_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  author_name VARCHAR(180) NOT NULL,
  author_email VARCHAR(240),
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_topic_slug_not_blank CHECK (length(trim(slug)) > 0),
  CONSTRAINT community_topic_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT community_topic_author_not_blank CHECK (length(trim(author_name)) > 0),
  CONSTRAINT community_topic_status_valid CHECK (status IN ('open','locked','hidden','archived')),
  CONSTRAINT ux_community_topic_slug UNIQUE (tenant_id, forum_id, slug),
  CONSTRAINT fk_community_topic_forum_scope FOREIGN KEY (tenant_id, forum_id)
    REFERENCES public.community_forums(tenant_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_community_topic_tenant_id_id
  ON public.community_topics (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_community_topic_scope
  ON public.community_topics (tenant_id, forum_id, status, pinned DESC, updated_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS public.community_replies (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  topic_id BIGINT NOT NULL,
  parent_reply_id BIGINT,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'visible',
  customer_id INTEGER REFERENCES public.customers(id) ON DELETE SET NULL,
  author_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  author_name VARCHAR(180) NOT NULL,
  author_email VARCHAR(240),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_reply_author_not_blank CHECK (length(trim(author_name)) > 0),
  CONSTRAINT community_reply_status_valid CHECK (status IN ('visible','hidden','deleted')),
  CONSTRAINT fk_community_reply_topic_scope FOREIGN KEY (tenant_id, topic_id)
    REFERENCES public.community_topics(tenant_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_community_reply_tenant_id_id
  ON public.community_replies (tenant_id, id);
DO $$ BEGIN
  ALTER TABLE public.community_replies
    ADD CONSTRAINT fk_community_reply_parent_scope
    FOREIGN KEY (tenant_id, parent_reply_id)
    REFERENCES public.community_replies(tenant_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_community_reply_scope
  ON public.community_replies (tenant_id, topic_id, status, created_at, id);

CREATE TABLE IF NOT EXISTS public.community_votes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  topic_id BIGINT,
  reply_id BIGINT,
  customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  value SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_vote_target_valid CHECK ((topic_id IS NOT NULL)::int + (reply_id IS NOT NULL)::int = 1),
  CONSTRAINT community_vote_value_valid CHECK (value IN (-1,1)),
  CONSTRAINT fk_community_vote_topic_scope FOREIGN KEY (tenant_id, topic_id)
    REFERENCES public.community_topics(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_community_vote_reply_scope FOREIGN KEY (tenant_id, reply_id)
    REFERENCES public.community_replies(tenant_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_community_vote_topic_customer
  ON public.community_votes (tenant_id, topic_id, customer_id) WHERE topic_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_community_vote_reply_customer
  ON public.community_votes (tenant_id, reply_id, customer_id) WHERE reply_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_vote_scope
  ON public.community_votes (tenant_id, topic_id, reply_id, id);

CREATE TABLE IF NOT EXISTS public.community_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  forum_id INTEGER,
  topic_id BIGINT,
  reply_id BIGINT,
  event_type VARCHAR(80) NOT NULL,
  actor_user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  customer_id INTEGER REFERENCES public.customers(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_event_type_not_blank CHECK (length(trim(event_type)) > 0),
  CONSTRAINT fk_community_event_forum_scope FOREIGN KEY (tenant_id, forum_id)
    REFERENCES public.community_forums(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_community_event_topic_scope FOREIGN KEY (tenant_id, topic_id)
    REFERENCES public.community_topics(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_community_event_reply_scope FOREIGN KEY (tenant_id, reply_id)
    REFERENCES public.community_replies(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_community_event_scope
  ON public.community_events (tenant_id, forum_id, topic_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.reject_learning_community_immutable_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'learning/community immutable ledger rows cannot be updated or deleted';
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_learning_certificates_immutable
    BEFORE UPDATE OR DELETE ON public.learning_certificates
    FOR EACH ROW EXECUTE FUNCTION public.reject_learning_community_immutable_mutation();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_learning_events_immutable
    BEFORE UPDATE OR DELETE ON public.learning_events
    FOR EACH ROW EXECUTE FUNCTION public.reject_learning_community_immutable_mutation();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_community_events_immutable
    BEFORE UPDATE OR DELETE ON public.community_events
    FOR EACH ROW EXECUTE FUNCTION public.reject_learning_community_immutable_mutation();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
