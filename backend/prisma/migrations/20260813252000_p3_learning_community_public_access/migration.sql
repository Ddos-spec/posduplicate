-- P3.7 public access hardening.
-- Learner bearer tokens are stored hash-only. Public forum writes use retry idempotency hashes.

ALTER TABLE public.learning_enrollments
  ADD COLUMN IF NOT EXISTS access_token_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS token_rotated_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS ux_learning_enrollment_access_token
  ON public.learning_enrollments (access_token_hash)
  WHERE access_token_hash IS NOT NULL;

ALTER TABLE public.community_topics
  ADD COLUMN IF NOT EXISTS submission_key_hash CHAR(64);
ALTER TABLE public.community_replies
  ADD COLUMN IF NOT EXISTS submission_key_hash CHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS ux_community_topic_submission_key
  ON public.community_topics (tenant_id, forum_id, submission_key_hash)
  WHERE submission_key_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_community_reply_submission_key
  ON public.community_replies (tenant_id, topic_id, submission_key_hash)
  WHERE submission_key_hash IS NOT NULL;
