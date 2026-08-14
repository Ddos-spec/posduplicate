import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';
import { findTenantCustomer } from './customerScope.p3';

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

const cleanSlug = (value: unknown, code: string) => {
  const slug = String(value ?? '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,179}$/.test(slug)) throw domainError('Invalid slug', code);
  return slug;
};

const validateBlocks = (value: unknown) => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) {
    throw domainError('Community content must be a non-empty array of declarative blocks', 'INVALID_COMMUNITY_CONTENT');
  }
  const allowed = new Set(['heading', 'paragraph', 'callout', 'checklist', 'code', 'link']);
  for (const block of value) {
    if (!block || typeof block !== 'object' || Array.isArray(block)) throw domainError('Invalid community block', 'INVALID_COMMUNITY_CONTENT');
    if (!allowed.has(String((block as Record<string, unknown>).type || ''))) throw domainError('Unsupported community block type', 'INVALID_COMMUNITY_CONTENT');
  }
  const json = JSON.stringify(value);
  if (json.length > 200000 || /[<>]/.test(json) || /javascript:/i.test(json)) throw domainError('Unsafe community content', 'UNSAFE_COMMUNITY_CONTENT');
  return value;
};

const appendEvent = async (
  tx: Prisma.TransactionClient,
  input: { tenantId: number; forumId?: number | null; topicId?: number | null; replyId?: number | null; eventType: string; actorUserId?: number | null; customerId?: number | null; payload?: Record<string, unknown> },
) => {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.community_events
      (tenant_id,forum_id,topic_id,reply_id,event_type,actor_user_id,customer_id,payload)
    VALUES (
      ${input.tenantId},${input.forumId ?? null},${input.topicId ?? null},${input.replyId ?? null},${input.eventType},
      ${input.actorUserId ?? null},${input.customerId ?? null},CAST(${JSON.stringify(input.payload ?? {})} AS jsonb)
    )
  `);
};

export const listCommunityForums = async (tenantId: number) => prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT f.*,
    COALESCE((SELECT COUNT(*) FROM public.community_topics t WHERE t.tenant_id=f.tenant_id AND t.forum_id=f.id AND t.status <> 'archived'),0)::int AS topic_count
  FROM public.community_forums f
  WHERE f.tenant_id=${tenantId}
  ORDER BY f.updated_at DESC,f.id DESC
`);

export const createCommunityForum = async (
  tenantId: number,
  userId: number,
  input: { siteId?: number | null; slug: string; name: string; description?: string | null; visibility?: string },
) => {
  const siteId = input.siteId == null ? null : positiveInt(input.siteId, 'INVALID_COMMUNITY_SITE_ID');
  const visibility = String(input.visibility || 'private');
  if (!['public', 'private'].includes(visibility)) throw domainError('Invalid forum visibility', 'INVALID_COMMUNITY_VISIBILITY');
  return prisma.$transaction(async (tx) => {
    if (siteId !== null) {
      const sites = await tx.$queryRaw<any[]>(Prisma.sql`SELECT id FROM public.website_sites WHERE tenant_id=${tenantId} AND id=${siteId} LIMIT 1`);
      if (!sites[0]) throw domainError('Website site not found in tenant', 'COMMUNITY_SITE_SCOPE_MISMATCH', 404);
    }
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.community_forums
        (tenant_id,site_id,slug,name,description,status,visibility,created_by,updated_by)
      VALUES (
        ${tenantId},${siteId},${cleanSlug(input.slug, 'INVALID_COMMUNITY_FORUM_SLUG')},
        ${cleanText(input.name, 220, 'INVALID_COMMUNITY_FORUM_NAME')},
        ${cleanText(input.description, 10000, 'INVALID_COMMUNITY_FORUM_DESCRIPTION', false)},'draft',${visibility},${userId},${userId}
      ) RETURNING *
    `);
    await appendEvent(tx, { tenantId, forumId: Number(rows[0].id), eventType: 'forum_created', actorUserId: userId });
    return rows[0];
  });
};

export const transitionCommunityForum = async (tenantId: number, userId: number, forumIdValue: unknown, targetValue: unknown) => {
  const forumId = positiveInt(forumIdValue, 'INVALID_COMMUNITY_FORUM_ID');
  const target = String(targetValue || '');
  const allowed: Record<string, string[]> = { draft: ['published', 'archived'], published: ['draft', 'archived'], archived: [] };
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.community_forums WHERE tenant_id=${tenantId} AND id=${forumId} FOR UPDATE`);
    const forum = rows[0];
    if (!forum) throw domainError('Forum not found', 'COMMUNITY_FORUM_NOT_FOUND', 404);
    if (forum.status === target) return forum;
    if (!(allowed[String(forum.status)] || []).includes(target)) throw domainError('Invalid forum transition', 'INVALID_COMMUNITY_FORUM_TRANSITION', 409);
    if (target === 'published' && forum.visibility === 'public') {
      if (!forum.site_id) throw domainError('Public forum requires a website site', 'PUBLIC_COMMUNITY_SITE_REQUIRED', 409);
      const sites = await tx.$queryRaw<any[]>(Prisma.sql`SELECT status FROM public.website_sites WHERE tenant_id=${tenantId} AND id=${Number(forum.site_id)} LIMIT 1`);
      if (sites[0]?.status !== 'published') throw domainError('Public forum requires a published website site', 'PUBLIC_COMMUNITY_SITE_NOT_PUBLISHED', 409);
    }
    const updated = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.community_forums
      SET status=${target},updated_by=${userId},updated_at=NOW(),
        published_at=CASE WHEN ${target}='published' THEN COALESCE(published_at,NOW()) ELSE published_at END,
        archived_at=CASE WHEN ${target}='archived' THEN COALESCE(archived_at,NOW()) ELSE archived_at END
      WHERE tenant_id=${tenantId} AND id=${forumId} RETURNING *
    `);
    await appendEvent(tx, { tenantId, forumId, eventType: 'forum_status_changed', actorUserId: userId, payload: { from: forum.status, to: target } });
    return updated[0];
  });
};

export const listCommunityTopics = async (tenantId: number, forumIdValue: unknown) => {
  const forumId = positiveInt(forumIdValue, 'INVALID_COMMUNITY_FORUM_ID');
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT t.*,
      COALESCE((SELECT COUNT(*) FROM public.community_replies r WHERE r.tenant_id=t.tenant_id AND r.topic_id=t.id AND r.status='visible'),0)::int AS reply_count,
      COALESCE((SELECT SUM(v.value) FROM public.community_votes v WHERE v.tenant_id=t.tenant_id AND v.topic_id=t.id),0)::int AS score
    FROM public.community_topics t
    WHERE t.tenant_id=${tenantId} AND t.forum_id=${forumId}
    ORDER BY t.pinned DESC,t.updated_at DESC,t.id DESC
  `);
};

export const createCommunityTopic = async (
  tenantId: number,
  actor: { userId?: number | null; customerId?: number | null; name: string; email?: string | null },
  forumIdValue: unknown,
  input: { slug: string; title: string; content: unknown },
) => {
  const forumId = positiveInt(forumIdValue, 'INVALID_COMMUNITY_FORUM_ID');
  const customerId = actor.customerId == null ? null : positiveInt(actor.customerId, 'INVALID_COMMUNITY_CUSTOMER_ID');
  const userId = actor.userId == null ? null : positiveInt(actor.userId, 'INVALID_COMMUNITY_USER_ID');
  return prisma.$transaction(async (tx) => {
    const forums = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.community_forums WHERE tenant_id=${tenantId} AND id=${forumId} FOR UPDATE`);
    const forum = forums[0];
    if (!forum) throw domainError('Forum not found', 'COMMUNITY_FORUM_NOT_FOUND', 404);
    if (forum.status !== 'published') throw domainError('Forum is not published', 'COMMUNITY_FORUM_NOT_PUBLISHED', 409);
    if (customerId !== null) {
      const customers = await findTenantCustomer(tx, tenantId, customerId);
      if (!customers[0]) throw domainError('Customer not found in tenant', 'COMMUNITY_CUSTOMER_SCOPE_MISMATCH', 404);
    }
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.community_topics
        (tenant_id,forum_id,slug,title,content,status,customer_id,author_user_id,author_name,author_email)
      VALUES (
        ${tenantId},${forumId},${cleanSlug(input.slug, 'INVALID_COMMUNITY_TOPIC_SLUG')},
        ${cleanText(input.title, 240, 'INVALID_COMMUNITY_TOPIC_TITLE')},CAST(${JSON.stringify(validateBlocks(input.content))} AS jsonb),
        'open',${customerId},${userId},${cleanText(actor.name, 180, 'INVALID_COMMUNITY_AUTHOR_NAME')},
        ${cleanText(actor.email, 240, 'INVALID_COMMUNITY_AUTHOR_EMAIL', false)}
      ) RETURNING *
    `);
    await appendEvent(tx, { tenantId, forumId, topicId: Number(rows[0].id), eventType: 'topic_created', actorUserId: userId, customerId });
    return rows[0];
  });
};

export const listCommunityReplies = async (tenantId: number, topicIdValue: unknown) => {
  const topicId = positiveInt(topicIdValue, 'INVALID_COMMUNITY_TOPIC_ID');
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT r.*,
      COALESCE((SELECT SUM(v.value) FROM public.community_votes v WHERE v.tenant_id=r.tenant_id AND v.reply_id=r.id),0)::int AS score
    FROM public.community_replies r
    WHERE r.tenant_id=${tenantId} AND r.topic_id=${topicId}
    ORDER BY r.created_at,r.id
  `);
};

export const createCommunityReply = async (
  tenantId: number,
  actor: { userId?: number | null; customerId?: number | null; name: string; email?: string | null },
  topicIdValue: unknown,
  input: { parentReplyId?: number | null; content: unknown },
) => {
  const topicId = positiveInt(topicIdValue, 'INVALID_COMMUNITY_TOPIC_ID');
  const customerId = actor.customerId == null ? null : positiveInt(actor.customerId, 'INVALID_COMMUNITY_CUSTOMER_ID');
  const userId = actor.userId == null ? null : positiveInt(actor.userId, 'INVALID_COMMUNITY_USER_ID');
  const parentReplyId = input.parentReplyId == null ? null : positiveInt(input.parentReplyId, 'INVALID_COMMUNITY_PARENT_REPLY_ID');
  return prisma.$transaction(async (tx) => {
    const topics = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT t.*,f.status AS forum_status FROM public.community_topics t
      JOIN public.community_forums f ON f.tenant_id=t.tenant_id AND f.id=t.forum_id
      WHERE t.tenant_id=${tenantId} AND t.id=${topicId} FOR UPDATE OF t
    `);
    const topic = topics[0];
    if (!topic) throw domainError('Topic not found', 'COMMUNITY_TOPIC_NOT_FOUND', 404);
    if (topic.forum_status !== 'published' || topic.status !== 'open') throw domainError('Topic is not open for replies', 'COMMUNITY_TOPIC_NOT_OPEN', 409);
    if (customerId !== null) {
      const customers = await findTenantCustomer(tx, tenantId, customerId);
      if (!customers[0]) throw domainError('Customer not found in tenant', 'COMMUNITY_CUSTOMER_SCOPE_MISMATCH', 404);
    }
    if (parentReplyId !== null) {
      const parents = await tx.$queryRaw<any[]>(Prisma.sql`SELECT id FROM public.community_replies WHERE tenant_id=${tenantId} AND topic_id=${topicId} AND id=${parentReplyId} LIMIT 1`);
      if (!parents[0]) throw domainError('Parent reply is outside topic', 'COMMUNITY_PARENT_REPLY_SCOPE_MISMATCH', 409);
    }
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.community_replies
        (tenant_id,topic_id,parent_reply_id,content,status,customer_id,author_user_id,author_name,author_email)
      VALUES (
        ${tenantId},${topicId},${parentReplyId},CAST(${JSON.stringify(validateBlocks(input.content))} AS jsonb),
        'visible',${customerId},${userId},${cleanText(actor.name, 180, 'INVALID_COMMUNITY_AUTHOR_NAME')},
        ${cleanText(actor.email, 240, 'INVALID_COMMUNITY_AUTHOR_EMAIL', false)}
      ) RETURNING *
    `);
    await tx.$executeRaw(Prisma.sql`UPDATE public.community_topics SET updated_at=NOW() WHERE tenant_id=${tenantId} AND id=${topicId}`);
    await appendEvent(tx, { tenantId, forumId: Number(topic.forum_id), topicId, replyId: Number(rows[0].id), eventType: 'reply_created', actorUserId: userId, customerId });
    return rows[0];
  });
};

export const moderateCommunityTopic = async (
  tenantId: number,
  userId: number,
  topicIdValue: unknown,
  input: { status?: string; pinned?: boolean },
) => {
  const topicId = positiveInt(topicIdValue, 'INVALID_COMMUNITY_TOPIC_ID');
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.community_topics WHERE tenant_id=${tenantId} AND id=${topicId} FOR UPDATE`);
    const topic = rows[0];
    if (!topic) throw domainError('Topic not found', 'COMMUNITY_TOPIC_NOT_FOUND', 404);
    const status = input.status == null ? String(topic.status) : String(input.status);
    if (!['open', 'locked', 'hidden', 'archived'].includes(status)) throw domainError('Invalid topic status', 'INVALID_COMMUNITY_TOPIC_STATUS');
    const pinned = input.pinned == null ? Boolean(topic.pinned) : Boolean(input.pinned);
    const updated = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.community_topics SET status=${status},pinned=${pinned},updated_at=NOW()
      WHERE tenant_id=${tenantId} AND id=${topicId} RETURNING *
    `);
    await appendEvent(tx, { tenantId, forumId: Number(topic.forum_id), topicId, eventType: 'topic_moderated', actorUserId: userId, payload: { status, pinned } });
    return updated[0];
  });
};

export const moderateCommunityReply = async (tenantId: number, userId: number, replyIdValue: unknown, statusValue: unknown) => {
  const replyId = positiveInt(replyIdValue, 'INVALID_COMMUNITY_REPLY_ID');
  const status = String(statusValue || '');
  if (!['visible', 'hidden', 'deleted'].includes(status)) throw domainError('Invalid reply status', 'INVALID_COMMUNITY_REPLY_STATUS');
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT r.*,t.forum_id FROM public.community_replies r
      JOIN public.community_topics t ON t.tenant_id=r.tenant_id AND t.id=r.topic_id
      WHERE r.tenant_id=${tenantId} AND r.id=${replyId} FOR UPDATE OF r
    `);
    const reply = rows[0];
    if (!reply) throw domainError('Reply not found', 'COMMUNITY_REPLY_NOT_FOUND', 404);
    if (reply.status === status) return reply;
    const updated = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.community_replies SET status=${status},updated_at=NOW()
      WHERE tenant_id=${tenantId} AND id=${replyId} RETURNING *
    `);
    await appendEvent(tx, { tenantId, forumId: Number(reply.forum_id), topicId: Number(reply.topic_id), replyId, eventType: 'reply_moderated', actorUserId: userId, payload: { from: reply.status, to: status } });
    return updated[0];
  });
};

export const voteCommunity = async (
  tenantId: number,
  customerIdValue: unknown,
  input: { topicId?: number | null; replyId?: number | null; value: number },
) => {
  const customerId = positiveInt(customerIdValue, 'INVALID_COMMUNITY_CUSTOMER_ID');
  const topicId = input.topicId == null ? null : positiveInt(input.topicId, 'INVALID_COMMUNITY_TOPIC_ID');
  const replyId = input.replyId == null ? null : positiveInt(input.replyId, 'INVALID_COMMUNITY_REPLY_ID');
  if ((topicId === null) === (replyId === null)) throw domainError('Vote must target exactly one entity', 'INVALID_COMMUNITY_VOTE_TARGET');
  const value = Number(input.value);
  if (![1, -1].includes(value)) throw domainError('Vote must be 1 or -1', 'INVALID_COMMUNITY_VOTE_VALUE');
  return prisma.$transaction(async (tx) => {
    const customers = await findTenantCustomer(tx, tenantId, customerId);
    if (!customers[0]) throw domainError('Customer not found in tenant', 'COMMUNITY_CUSTOMER_SCOPE_MISMATCH', 404);
    let forumId: number;
    if (topicId !== null) {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT forum_id,status FROM public.community_topics WHERE tenant_id=${tenantId} AND id=${topicId} LIMIT 1`);
      if (!rows[0] || rows[0].status === 'hidden' || rows[0].status === 'archived') throw domainError('Vote target unavailable', 'COMMUNITY_VOTE_TARGET_UNAVAILABLE', 409);
      forumId = Number(rows[0].forum_id);
      const votes = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO public.community_votes (tenant_id,topic_id,customer_id,value)
        VALUES (${tenantId},${topicId},${customerId},${value})
        ON CONFLICT (tenant_id,topic_id,customer_id) WHERE topic_id IS NOT NULL
        DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()
        RETURNING *
      `);
      await appendEvent(tx, { tenantId, forumId, topicId, eventType: 'topic_voted', customerId, payload: { value } });
      return votes[0];
    }
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT r.topic_id,t.forum_id,r.status FROM public.community_replies r
      JOIN public.community_topics t ON t.tenant_id=r.tenant_id AND t.id=r.topic_id
      WHERE r.tenant_id=${tenantId} AND r.id=${replyId!} LIMIT 1
    `);
    if (!rows[0] || rows[0].status !== 'visible') throw domainError('Vote target unavailable', 'COMMUNITY_VOTE_TARGET_UNAVAILABLE', 409);
    forumId = Number(rows[0].forum_id);
    const votes = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.community_votes (tenant_id,reply_id,customer_id,value)
      VALUES (${tenantId},${replyId!},${customerId},${value})
      ON CONFLICT (tenant_id,reply_id,customer_id) WHERE reply_id IS NOT NULL
      DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()
      RETURNING *
    `);
    await appendEvent(tx, { tenantId, forumId, topicId: Number(rows[0].topic_id), replyId, eventType: 'reply_voted', customerId, payload: { value } });
    return votes[0];
  });
};
