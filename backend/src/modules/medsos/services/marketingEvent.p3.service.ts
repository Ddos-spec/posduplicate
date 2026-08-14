import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

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

const timestamp = (value: unknown, code: string) => {
  const parsed = new Date(String(value ?? ''));
  if (Number.isNaN(parsed.getTime())) throw domainError('Invalid timestamp', code);
  return parsed;
};

const appendEvent = async (
  tx: Prisma.TransactionClient,
  input: { tenantId: number; entityType: 'event' | 'registration'; entityId: number; eventType: string; actorUserId: number; customerId?: number | null; payload?: Record<string, unknown> },
) => {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.marketing_engagement_events
      (tenant_id,entity_type,entity_id,event_type,actor_user_id,customer_id,payload)
    VALUES (
      ${input.tenantId},${input.entityType},${input.entityId},${input.eventType},${input.actorUserId},
      ${input.customerId ?? null},CAST(${JSON.stringify(input.payload ?? {})} AS jsonb)
    )
  `);
};

export const listMarketingEvents = async (tenantId: number) => prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT e.*,
    COALESCE((SELECT SUM(r.seats) FROM public.marketing_event_registrations r
      WHERE r.tenant_id=e.tenant_id AND r.event_id=e.id AND r.status IN ('registered','checked_in')),0)::int AS occupied_seats,
    COALESCE((SELECT COUNT(*) FROM public.marketing_event_registrations r
      WHERE r.tenant_id=e.tenant_id AND r.event_id=e.id AND r.status IN ('registered','checked_in')),0)::int AS registration_count
  FROM public.marketing_events e
  WHERE e.tenant_id=${tenantId}
  ORDER BY e.starts_at DESC,e.id DESC
`);

export const createMarketingEvent = async (
  tenantId: number,
  userId: number,
  input: { slug: string; name: string; description?: string | null; startsAt: string; endsAt: string; venue?: string | null; capacity?: number | null },
) => {
  const slug = String(input.slug || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(slug)) throw domainError('Invalid event slug', 'INVALID_MARKETING_EVENT_SLUG');
  const name = cleanText(input.name, 220, 'INVALID_MARKETING_EVENT_NAME') as string;
  const startsAt = timestamp(input.startsAt, 'INVALID_MARKETING_EVENT_START');
  const endsAt = timestamp(input.endsAt, 'INVALID_MARKETING_EVENT_END');
  if (endsAt <= startsAt) throw domainError('Event end must be after start', 'INVALID_MARKETING_EVENT_PERIOD');
  const capacity = input.capacity == null ? null : positiveInt(input.capacity, 'INVALID_MARKETING_EVENT_CAPACITY');
  if (capacity !== null && capacity > 100000) throw domainError('Event capacity too large', 'INVALID_MARKETING_EVENT_CAPACITY');

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.marketing_events
        (tenant_id,slug,name,description,status,starts_at,ends_at,venue,capacity,created_by,updated_by)
      VALUES (
        ${tenantId},${slug},${name},${cleanText(input.description, 5000, 'INVALID_MARKETING_EVENT_DESCRIPTION', false)},
        'draft',${startsAt},${endsAt},${cleanText(input.venue, 240, 'INVALID_MARKETING_EVENT_VENUE', false)},${capacity},${userId},${userId}
      ) RETURNING *
    `);
    const event = rows[0];
    await appendEvent(tx, { tenantId, entityType: 'event', entityId: Number(event.id), eventType: 'created', actorUserId: userId });
    return event;
  });
};

export const transitionMarketingEvent = async (tenantId: number, userId: number, eventIdValue: unknown, targetValue: unknown) => {
  const eventId = positiveInt(eventIdValue, 'INVALID_MARKETING_EVENT_ID');
  const target = String(targetValue || '').trim().toLowerCase();
  const transitions: Record<string, string[]> = {
    draft: ['published', 'cancelled'],
    published: ['closed', 'cancelled'],
    closed: [],
    cancelled: [],
  };
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.marketing_events WHERE id=${eventId} AND tenant_id=${tenantId} FOR UPDATE
    `);
    const event = rows[0];
    if (!event) throw domainError('Marketing event not found', 'MARKETING_EVENT_NOT_FOUND', 404);
    if (!(transitions[String(event.status)] || []).includes(target)) throw domainError('Invalid event transition', 'INVALID_MARKETING_EVENT_TRANSITION', 409);
    const changed = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.marketing_events
      SET status=${target},registration_open=${target === 'published'},updated_by=${userId},updated_at=NOW()
      WHERE id=${eventId} AND tenant_id=${tenantId} AND status=${String(event.status)}
      RETURNING *
    `);
    if (!changed[0]) throw domainError('Concurrent event update', 'MARKETING_EVENT_CONCURRENT_UPDATE', 409);
    await appendEvent(tx, { tenantId, entityType: 'event', entityId: eventId, eventType: `status_${target}`, actorUserId: userId });
    return changed[0];
  });
};

export const listEventRegistrations = async (tenantId: number, eventIdValue: unknown) => {
  const eventId = positiveInt(eventIdValue, 'INVALID_MARKETING_EVENT_ID');
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT r.*,c.name AS customer_name
    FROM public.marketing_event_registrations r
    LEFT JOIN public.customers c ON c.id=r.customer_id
    WHERE r.tenant_id=${tenantId} AND r.event_id=${eventId}
    ORDER BY r.id DESC
  `);
};

export const registerMarketingEvent = async (
  tenantId: number,
  userId: number,
  eventIdValue: unknown,
  input: { customerId?: number | null; attendeeName: string; attendeeEmail?: string | null; attendeePhone?: string | null; seats?: number },
) => prisma.$transaction(async (tx) => {
  const eventId = positiveInt(eventIdValue, 'INVALID_MARKETING_EVENT_ID');
  const seats = positiveInt(input.seats ?? 1, 'INVALID_MARKETING_EVENT_SEATS');
  if (seats > 100) throw domainError('Too many seats per registration', 'INVALID_MARKETING_EVENT_SEATS');
  const eventRows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT * FROM public.marketing_events WHERE id=${eventId} AND tenant_id=${tenantId} FOR UPDATE
  `);
  const event = eventRows[0];
  if (!event) throw domainError('Marketing event not found', 'MARKETING_EVENT_NOT_FOUND', 404);
  if (event.status !== 'published' || event.registration_open !== true) throw domainError('Event registration is closed', 'MARKETING_EVENT_REGISTRATION_CLOSED', 409);
  if (new Date(event.starts_at).getTime() <= Date.now()) throw domainError('Event has already started', 'MARKETING_EVENT_ALREADY_STARTED', 409);

  let customerId: number | null = null;
  if (input.customerId != null) {
    customerId = positiveInt(input.customerId, 'INVALID_CUSTOMER_ID');
    const customerRows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT c.id FROM public.customers c
      JOIN public.outlets o ON o.id=c.outlet_id AND o.tenant_id=${tenantId}
      WHERE c.id=${customerId} LIMIT 1
    `);
    if (!customerRows[0]) throw domainError('Customer not found in tenant', 'MARKETING_CUSTOMER_NOT_FOUND', 404);
  }

  if (event.capacity != null) {
    const occupiedRows = await tx.$queryRaw<Array<{ occupied: bigint | number }>>(Prisma.sql`
      SELECT COALESCE(SUM(seats),0)::bigint AS occupied
      FROM public.marketing_event_registrations
      WHERE tenant_id=${tenantId} AND event_id=${eventId} AND status IN ('registered','checked_in')
    `);
    const occupied = Number(occupiedRows[0]?.occupied || 0);
    if (occupied + seats > Number(event.capacity)) throw domainError('Event capacity exceeded', 'MARKETING_EVENT_CAPACITY_EXCEEDED', 409);
  }

  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    INSERT INTO public.marketing_event_registrations
      (tenant_id,event_id,customer_id,attendee_name,attendee_email,attendee_phone,seats,status,created_by)
    VALUES (
      ${tenantId},${eventId},${customerId},${cleanText(input.attendeeName, 180, 'INVALID_MARKETING_ATTENDEE_NAME')},
      ${cleanText(input.attendeeEmail, 240, 'INVALID_MARKETING_ATTENDEE_EMAIL', false)},
      ${cleanText(input.attendeePhone, 80, 'INVALID_MARKETING_ATTENDEE_PHONE', false)},${seats},'registered',${userId}
    ) RETURNING *
  `);
  const registration = rows[0];
  await appendEvent(tx, {
    tenantId,
    entityType: 'registration',
    entityId: Number(registration.id),
    eventType: 'registered',
    actorUserId: userId,
    customerId,
    payload: { eventId, seats },
  });
  return registration;
});

export const transitionEventRegistration = async (
  tenantId: number,
  userId: number,
  registrationIdValue: unknown,
  targetValue: unknown,
) => {
  const registrationId = positiveInt(registrationIdValue, 'INVALID_MARKETING_REGISTRATION_ID');
  const target = String(targetValue || '').trim().toLowerCase();
  const transitions: Record<string, string[]> = {
    registered: ['checked_in', 'cancelled', 'no_show'],
    checked_in: [],
    cancelled: [],
    no_show: [],
  };
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.marketing_event_registrations
      WHERE id=${registrationId} AND tenant_id=${tenantId} FOR UPDATE
    `);
    const registration = rows[0];
    if (!registration) throw domainError('Event registration not found', 'MARKETING_REGISTRATION_NOT_FOUND', 404);
    if (!(transitions[String(registration.status)] || []).includes(target)) throw domainError('Invalid registration transition', 'INVALID_MARKETING_REGISTRATION_TRANSITION', 409);
    const changed = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.marketing_event_registrations
      SET status=${target},
          checked_in_at=CASE WHEN ${target}='checked_in' THEN NOW() ELSE checked_in_at END,
          cancelled_at=CASE WHEN ${target}='cancelled' THEN NOW() ELSE cancelled_at END
      WHERE id=${registrationId} AND tenant_id=${tenantId} AND status=${String(registration.status)}
      RETURNING *
    `);
    if (!changed[0]) throw domainError('Concurrent registration update', 'MARKETING_REGISTRATION_CONCURRENT_UPDATE', 409);
    await appendEvent(tx, {
      tenantId,
      entityType: 'registration',
      entityId: registrationId,
      eventType: `status_${target}`,
      actorUserId: userId,
      customerId: registration.customer_id ? Number(registration.customer_id) : null,
      payload: { eventId: Number(registration.event_id) },
    });
    return changed[0];
  });
};
