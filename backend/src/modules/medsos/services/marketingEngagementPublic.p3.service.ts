import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';
import { registerMarketingEvent } from './marketingEvent.p3.service';
import { submitMarketingSurvey } from './marketingSurvey.p3.service';

const domainError = (message: string, code: string, status = 400) =>
  Object.assign(new Error(message), { code, status });

const publicSlug = (value: unknown) => {
  const slug = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(slug)) throw domainError('Invalid public site slug', 'INVALID_PUBLIC_SITE_SLUG');
  return slug;
};

const entitySlug = (value: unknown, code: string) => {
  const slug = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(slug)) throw domainError('Invalid public entity slug', code);
  return slug;
};

const resolvePublicTenant = async (siteSlugValue: unknown) => {
  const siteSlug = publicSlug(siteSlugValue);
  const rows = await prisma.$queryRaw<Array<{ tenant_id: number; name: string }>>(Prisma.sql`
    SELECT tenant_id,name
    FROM public.website_sites
    WHERE public_slug=${siteSlug} AND status='published'
    LIMIT 1
  `);
  const site = rows[0];
  if (!site) throw domainError('Public site not found', 'PUBLIC_SITE_NOT_FOUND', 404);
  return { tenantId: Number(site.tenant_id), siteName: site.name };
};

export const getPublicMarketingEvent = async (siteSlugValue: unknown, eventSlugValue: unknown) => {
  const { tenantId, siteName } = await resolvePublicTenant(siteSlugValue);
  const eventSlug = entitySlug(eventSlugValue, 'INVALID_MARKETING_EVENT_SLUG');
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT e.id,e.slug,e.name,e.description,e.starts_at,e.ends_at,e.venue,e.capacity,e.registration_open,
      COALESCE((SELECT SUM(r.seats) FROM public.marketing_event_registrations r
        WHERE r.tenant_id=e.tenant_id AND r.event_id=e.id AND r.status IN ('registered','checked_in')),0)::int AS occupied_seats
    FROM public.marketing_events e
    WHERE e.tenant_id=${tenantId} AND e.slug=${eventSlug} AND e.status='published'
    LIMIT 1
  `);
  const event = rows[0];
  if (!event) throw domainError('Published event not found', 'PUBLIC_MARKETING_EVENT_NOT_FOUND', 404);
  return {
    siteName,
    event: {
      ...event,
      available_seats: event.capacity == null ? null : Math.max(0, Number(event.capacity) - Number(event.occupied_seats || 0)),
    },
  };
};

export const registerPublicMarketingEvent = async (
  siteSlugValue: unknown,
  eventSlugValue: unknown,
  input: { attendeeName: string; attendeeEmail?: string | null; attendeePhone?: string | null; seats?: number },
) => {
  const { tenantId } = await resolvePublicTenant(siteSlugValue);
  const eventSlug = entitySlug(eventSlugValue, 'INVALID_MARKETING_EVENT_SLUG');
  const rows = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
    SELECT id FROM public.marketing_events
    WHERE tenant_id=${tenantId} AND slug=${eventSlug} AND status='published'
    LIMIT 1
  `);
  const event = rows[0];
  if (!event) throw domainError('Published event not found', 'PUBLIC_MARKETING_EVENT_NOT_FOUND', 404);
  const registration = await registerMarketingEvent(tenantId, null, event.id, {
    attendeeName: input.attendeeName,
    attendeeEmail: input.attendeeEmail,
    attendeePhone: input.attendeePhone,
    seats: input.seats,
  });
  return {
    id: registration.id,
    event_id: registration.event_id,
    attendee_name: registration.attendee_name,
    seats: registration.seats,
    status: registration.status,
    registered_at: registration.registered_at,
  };
};

export const getPublicMarketingSurvey = async (siteSlugValue: unknown, surveySlugValue: unknown) => {
  const { tenantId, siteName } = await resolvePublicTenant(siteSlugValue);
  const surveySlug = entitySlug(surveySlugValue, 'INVALID_MARKETING_SURVEY_SLUG');
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT s.id,s.slug,s.title,s.description,
      COALESCE(json_agg(json_build_object(
        'id',q.id,'position',q.position,'question_type',q.question_type,'prompt',q.prompt,
        'required',q.required,'options',q.options
      ) ORDER BY q.position,q.id) FILTER (WHERE q.id IS NOT NULL),'[]'::json) AS questions
    FROM public.marketing_surveys s
    LEFT JOIN public.marketing_survey_questions q ON q.survey_id=s.id AND q.tenant_id=s.tenant_id
    WHERE s.tenant_id=${tenantId} AND s.slug=${surveySlug} AND s.status='published'
    GROUP BY s.id
    LIMIT 1
  `);
  const survey = rows[0];
  if (!survey) throw domainError('Published survey not found', 'PUBLIC_MARKETING_SURVEY_NOT_FOUND', 404);
  return { siteName, survey };
};

export const submitPublicMarketingSurvey = async (
  siteSlugValue: unknown,
  surveySlugValue: unknown,
  input: { respondentName?: string | null; respondentEmail?: string | null; answers: Array<{ questionId: number; answer: unknown }> },
) => {
  const { tenantId } = await resolvePublicTenant(siteSlugValue);
  const surveySlug = entitySlug(surveySlugValue, 'INVALID_MARKETING_SURVEY_SLUG');
  const rows = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
    SELECT id FROM public.marketing_surveys
    WHERE tenant_id=${tenantId} AND slug=${surveySlug} AND status='published'
    LIMIT 1
  `);
  const survey = rows[0];
  if (!survey) throw domainError('Published survey not found', 'PUBLIC_MARKETING_SURVEY_NOT_FOUND', 404);
  const response = await submitMarketingSurvey(tenantId, null, survey.id, {
    respondentName: input.respondentName,
    respondentEmail: input.respondentEmail,
    answers: input.answers,
  });
  return { id: response.id, survey_id: response.survey_id, status: response.status, submitted_at: response.submitted_at };
};
