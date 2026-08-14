import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

type JourneyStepType = 'wait' | 'broadcast' | 'tag' | 'notify';
type JourneyTriggerType = 'manual' | 'event_registration' | 'survey_submitted' | 'customer_created' | 'scheduled';

type JourneyStepInput = { type: JourneyStepType; config?: Record<string, unknown> };
type CreateJourneyInput = {
  name: string;
  description?: string | null;
  triggerType?: JourneyTriggerType;
  triggerConfig?: Record<string, unknown>;
  audienceFilter?: Record<string, unknown>;
  steps: JourneyStepInput[];
};

const domainError = (message: string, code: string, status = 400) =>
  Object.assign(new Error(message), { code, status });

const positiveInt = (value: unknown, code: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw domainError('Expected positive integer', code);
  return parsed;
};

const cleanText = (value: unknown, max: number, code: string, required = true) => {
  const text = String(value ?? '').trim();
  if ((required && !text) || text.length > max) throw domainError('Invalid text value', code);
  return text || null;
};

const record = (value: unknown, code: string) => {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw domainError('Expected object value', code);
  return value as Record<string, unknown>;
};

const appendEvent = async (
  tx: Prisma.TransactionClient,
  input: { tenantId: number; journeyId: number; eventType: string; actorUserId: number; payload?: Record<string, unknown> },
) => {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.marketing_engagement_events
      (tenant_id,entity_type,entity_id,event_type,actor_user_id,payload)
    VALUES (${input.tenantId},'journey',${input.journeyId},${input.eventType},${input.actorUserId},CAST(${JSON.stringify(input.payload ?? {})} AS jsonb))
  `);
};

export const listMarketingJourneys = async (tenantId: number) => prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT j.*,
    COALESCE((SELECT COUNT(*) FROM public.marketing_journey_steps s WHERE s.tenant_id=j.tenant_id AND s.journey_id=j.id),0)::int AS step_count
  FROM public.marketing_journeys j
  WHERE j.tenant_id=${tenantId}
  ORDER BY j.id DESC
`);

export const getMarketingJourney = async (tenantId: number, journeyIdValue: unknown) => {
  const journeyId = positiveInt(journeyIdValue, 'INVALID_MARKETING_JOURNEY_ID');
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT j.*,
      COALESCE(json_agg(json_build_object('id',s.id,'position',s.position,'step_type',s.step_type,'config',s.config)
        ORDER BY s.position,s.id) FILTER (WHERE s.id IS NOT NULL),'[]'::json) AS steps
    FROM public.marketing_journeys j
    LEFT JOIN public.marketing_journey_steps s ON s.journey_id=j.id AND s.tenant_id=j.tenant_id
    WHERE j.id=${journeyId} AND j.tenant_id=${tenantId}
    GROUP BY j.id
    LIMIT 1
  `);
  if (!rows[0]) throw domainError('Marketing journey not found', 'MARKETING_JOURNEY_NOT_FOUND', 404);
  return rows[0];
};

export const createMarketingJourney = async (tenantId: number, userId: number, input: CreateJourneyInput) => {
  const name = cleanText(input.name, 180, 'INVALID_MARKETING_JOURNEY_NAME') as string;
  const triggerType = String(input.triggerType || 'manual').trim() as JourneyTriggerType;
  if (!['manual','event_registration','survey_submitted','customer_created','scheduled'].includes(triggerType)) {
    throw domainError('Invalid journey trigger', 'INVALID_MARKETING_JOURNEY_TRIGGER');
  }
  if (!Array.isArray(input.steps) || input.steps.length < 1 || input.steps.length > 50) {
    throw domainError('Journey requires 1-50 steps', 'INVALID_MARKETING_JOURNEY_STEPS');
  }

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.marketing_journeys
        (tenant_id,name,description,status,trigger_type,trigger_config,audience_filter,created_by,updated_by)
      VALUES (
        ${tenantId},${name},${cleanText(input.description, 5000, 'INVALID_MARKETING_JOURNEY_DESCRIPTION', false)},'draft',${triggerType},
        CAST(${JSON.stringify(record(input.triggerConfig, 'INVALID_MARKETING_JOURNEY_TRIGGER_CONFIG'))} AS jsonb),
        CAST(${JSON.stringify(record(input.audienceFilter, 'INVALID_MARKETING_JOURNEY_AUDIENCE'))} AS jsonb),${userId},${userId}
      ) RETURNING *
    `);
    const journey = rows[0];
    for (let index = 0; index < input.steps.length; index += 1) {
      const step = input.steps[index];
      const type = String(step.type || '').trim() as JourneyStepType;
      if (!['wait','broadcast','tag','notify'].includes(type)) throw domainError('Invalid journey step type', 'INVALID_MARKETING_JOURNEY_STEP');
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.marketing_journey_steps (tenant_id,journey_id,position,step_type,config)
        VALUES (${tenantId},${Number(journey.id)},${index},${type},CAST(${JSON.stringify(record(step.config, 'INVALID_MARKETING_JOURNEY_STEP_CONFIG'))} AS jsonb))
      `);
    }
    await appendEvent(tx, { tenantId, journeyId: Number(journey.id), eventType: 'created', actorUserId: userId });
    return journey;
  });
};

export const transitionMarketingJourney = async (tenantId: number, userId: number, journeyIdValue: unknown, targetValue: unknown) => {
  const journeyId = positiveInt(journeyIdValue, 'INVALID_MARKETING_JOURNEY_ID');
  const target = String(targetValue || '').trim().toLowerCase();
  const transitions: Record<string, string[]> = {
    draft: ['active', 'archived'],
    active: ['paused', 'archived'],
    paused: ['active', 'archived'],
    archived: [],
  };
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.marketing_journeys WHERE id=${journeyId} AND tenant_id=${tenantId} FOR UPDATE
    `);
    const journey = rows[0];
    if (!journey) throw domainError('Marketing journey not found', 'MARKETING_JOURNEY_NOT_FOUND', 404);
    if (!(transitions[String(journey.status)] || []).includes(target)) throw domainError('Invalid journey transition', 'INVALID_MARKETING_JOURNEY_TRANSITION', 409);
    if (target === 'active') {
      const stepRows = await tx.$queryRaw<Array<{ count: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count FROM public.marketing_journey_steps WHERE tenant_id=${tenantId} AND journey_id=${journeyId}
      `);
      if (Number(stepRows[0]?.count || 0) < 1) throw domainError('Journey has no steps', 'MARKETING_JOURNEY_EMPTY', 409);
    }
    const changed = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.marketing_journeys SET status=${target},updated_by=${userId},updated_at=NOW()
      WHERE id=${journeyId} AND tenant_id=${tenantId} AND status=${String(journey.status)} RETURNING *
    `);
    if (!changed[0]) throw domainError('Concurrent journey update', 'MARKETING_JOURNEY_CONCURRENT_UPDATE', 409);
    await appendEvent(tx, { tenantId, journeyId, eventType: `status_${target}`, actorUserId: userId });
    return changed[0];
  });
};
