-- P3.7 Learning & Community scope guard.
-- Strengthens exact-course relationships and avoids composite SET NULL on tenant_id.

ALTER TABLE public.learning_courses DROP CONSTRAINT IF EXISTS fk_learning_course_site_scope;
ALTER TABLE public.learning_courses
  ADD CONSTRAINT fk_learning_course_site_scope
  FOREIGN KEY (tenant_id, site_id)
  REFERENCES public.website_sites(tenant_id, id) ON DELETE RESTRICT;

ALTER TABLE public.community_forums DROP CONSTRAINT IF EXISTS fk_community_forum_site_scope;
ALTER TABLE public.community_forums
  ADD CONSTRAINT fk_community_forum_site_scope
  FOREIGN KEY (tenant_id, site_id)
  REFERENCES public.website_sites(tenant_id, id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_lesson_tenant_course_id
  ON public.learning_lessons (tenant_id, course_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_assessment_tenant_course_id
  ON public.learning_assessments (tenant_id, course_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_question_tenant_assessment_id
  ON public.learning_assessment_questions (tenant_id, assessment_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_enrollment_tenant_course_id
  ON public.learning_enrollments (tenant_id, course_id, id);

ALTER TABLE public.learning_assessments DROP CONSTRAINT IF EXISTS fk_learning_assessment_lesson_scope;
ALTER TABLE public.learning_assessments
  ADD CONSTRAINT fk_learning_assessment_lesson_scope
  FOREIGN KEY (tenant_id, course_id, lesson_id)
  REFERENCES public.learning_lessons(tenant_id, course_id, id) ON DELETE CASCADE;

ALTER TABLE public.learning_progress ADD COLUMN IF NOT EXISTS course_id INTEGER;
UPDATE public.learning_progress p
SET course_id = e.course_id
FROM public.learning_enrollments e
WHERE p.tenant_id=e.tenant_id AND p.enrollment_id=e.id AND p.course_id IS NULL;
ALTER TABLE public.learning_progress ALTER COLUMN course_id SET NOT NULL;
ALTER TABLE public.learning_progress DROP CONSTRAINT IF EXISTS fk_learning_progress_enrollment_scope;
ALTER TABLE public.learning_progress DROP CONSTRAINT IF EXISTS fk_learning_progress_lesson_scope;
ALTER TABLE public.learning_progress
  ADD CONSTRAINT fk_learning_progress_enrollment_scope
  FOREIGN KEY (tenant_id, course_id, enrollment_id)
  REFERENCES public.learning_enrollments(tenant_id, course_id, id) ON DELETE CASCADE;
ALTER TABLE public.learning_progress
  ADD CONSTRAINT fk_learning_progress_lesson_scope
  FOREIGN KEY (tenant_id, course_id, lesson_id)
  REFERENCES public.learning_lessons(tenant_id, course_id, id) ON DELETE CASCADE;

ALTER TABLE public.learning_attempts ADD COLUMN IF NOT EXISTS course_id INTEGER;
UPDATE public.learning_attempts a
SET course_id = e.course_id
FROM public.learning_enrollments e
WHERE a.tenant_id=e.tenant_id AND a.enrollment_id=e.id AND a.course_id IS NULL;
ALTER TABLE public.learning_attempts ALTER COLUMN course_id SET NOT NULL;
ALTER TABLE public.learning_attempts DROP CONSTRAINT IF EXISTS fk_learning_attempt_enrollment_scope;
ALTER TABLE public.learning_attempts DROP CONSTRAINT IF EXISTS fk_learning_attempt_assessment_scope;
ALTER TABLE public.learning_attempts
  ADD CONSTRAINT fk_learning_attempt_enrollment_scope
  FOREIGN KEY (tenant_id, course_id, enrollment_id)
  REFERENCES public.learning_enrollments(tenant_id, course_id, id) ON DELETE CASCADE;
ALTER TABLE public.learning_attempts
  ADD CONSTRAINT fk_learning_attempt_assessment_scope
  FOREIGN KEY (tenant_id, course_id, assessment_id)
  REFERENCES public.learning_assessments(tenant_id, course_id, id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_attempt_tenant_assessment_id
  ON public.learning_attempts (tenant_id, assessment_id, id);

ALTER TABLE public.learning_attempt_answers ADD COLUMN IF NOT EXISTS assessment_id INTEGER;
UPDATE public.learning_attempt_answers aa
SET assessment_id = a.assessment_id
FROM public.learning_attempts a
WHERE aa.tenant_id=a.tenant_id AND aa.attempt_id=a.id AND aa.assessment_id IS NULL;
ALTER TABLE public.learning_attempt_answers ALTER COLUMN assessment_id SET NOT NULL;
ALTER TABLE public.learning_attempt_answers DROP CONSTRAINT IF EXISTS fk_learning_attempt_answer_attempt_scope;
ALTER TABLE public.learning_attempt_answers DROP CONSTRAINT IF EXISTS fk_learning_attempt_answer_question_scope;
ALTER TABLE public.learning_attempt_answers
  ADD CONSTRAINT fk_learning_attempt_answer_attempt_scope
  FOREIGN KEY (tenant_id, assessment_id, attempt_id)
  REFERENCES public.learning_attempts(tenant_id, assessment_id, id) ON DELETE CASCADE;
ALTER TABLE public.learning_attempt_answers
  ADD CONSTRAINT fk_learning_attempt_answer_question_scope
  FOREIGN KEY (tenant_id, assessment_id, question_id)
  REFERENCES public.learning_assessment_questions(tenant_id, assessment_id, id) ON DELETE CASCADE;
