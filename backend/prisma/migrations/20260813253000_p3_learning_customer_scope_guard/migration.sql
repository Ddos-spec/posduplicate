-- P3.7 follow-up: customers are tenant-scoped through their canonical outlet.
-- Reject cross-tenant customer references in learning/community records at the database boundary.

CREATE OR REPLACE FUNCTION public.guard_learning_community_customer_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.customers c
    JOIN public.outlets o ON o.id=c.outlet_id
    WHERE c.id=NEW.customer_id AND o.tenant_id=NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Customer % is outside tenant %', NEW.customer_id, NEW.tenant_id
      USING ERRCODE='23514', CONSTRAINT='learning_community_customer_tenant_scope';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_learning_enrollments_customer_scope ON public.learning_enrollments;
CREATE TRIGGER trg_learning_enrollments_customer_scope
BEFORE INSERT OR UPDATE OF tenant_id,customer_id ON public.learning_enrollments
FOR EACH ROW EXECUTE FUNCTION public.guard_learning_community_customer_scope();

DROP TRIGGER IF EXISTS trg_learning_events_customer_scope ON public.learning_events;
CREATE TRIGGER trg_learning_events_customer_scope
BEFORE INSERT OR UPDATE OF tenant_id,customer_id ON public.learning_events
FOR EACH ROW EXECUTE FUNCTION public.guard_learning_community_customer_scope();

DROP TRIGGER IF EXISTS trg_community_topics_customer_scope ON public.community_topics;
CREATE TRIGGER trg_community_topics_customer_scope
BEFORE INSERT OR UPDATE OF tenant_id,customer_id ON public.community_topics
FOR EACH ROW EXECUTE FUNCTION public.guard_learning_community_customer_scope();

DROP TRIGGER IF EXISTS trg_community_replies_customer_scope ON public.community_replies;
CREATE TRIGGER trg_community_replies_customer_scope
BEFORE INSERT OR UPDATE OF tenant_id,customer_id ON public.community_replies
FOR EACH ROW EXECUTE FUNCTION public.guard_learning_community_customer_scope();

DROP TRIGGER IF EXISTS trg_community_votes_customer_scope ON public.community_votes;
CREATE TRIGGER trg_community_votes_customer_scope
BEFORE INSERT OR UPDATE OF tenant_id,customer_id ON public.community_votes
FOR EACH ROW EXECUTE FUNCTION public.guard_learning_community_customer_scope();

DROP TRIGGER IF EXISTS trg_community_events_customer_scope ON public.community_events;
CREATE TRIGGER trg_community_events_customer_scope
BEFORE INSERT OR UPDATE OF tenant_id,customer_id ON public.community_events
FOR EACH ROW EXECUTE FUNCTION public.guard_learning_community_customer_scope();
