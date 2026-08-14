import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const domainError = (message: string, code: string, status = 400) =>
  Object.assign(new Error(message), { code, status });

const cleanPublicSlug = (value: unknown) => {
  const slug = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(slug)) throw domainError('Invalid public site slug', 'INVALID_PUBLIC_SITE_SLUG');
  return slug;
};

const cleanForumSlug = (value: unknown) => {
  const slug = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,139}$/.test(slug)) throw domainError('Invalid forum slug', 'INVALID_COMMUNITY_FORUM_SLUG');
  return slug;
};

const cleanText = (value: unknown, max: number, code: string, required = true) => {
  const text = String(value ?? '').trim();
  if ((required && !text) || text.length > max) throw domainError('Invalid text value', code);
  return text || null;
};

const validateBlocks = (value: unknown) => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) throw domainError('Community content must be declarative blocks', 'INVALID_COMMUNITY_CONTENT');
  const allowed = new Set(['heading', 'paragraph', 'callout', 'checklist', 'code', 'link']);
  for (const block of value) {
    if (!block || typeof block !== 'object' || Array.isArray(block) || !allowed.has(String((block as Record<string, unknown>).type || ''))) {
      throw domainError('Unsupported community block', 'INVALID_COMMUNITY_CONTENT');
    }
  }
  const json = JSON.stringify(value);
  if (json.length > 200000 || /[<>]/.test(json) || /javascript:/i.test(json)) throw domainError('Unsafe community content', 'UNSAFE_COMMUNITY_CONTENT');
  return value;
};

const submissionHash = (value: unknown) => {
  const token = String(value || '').trim();
  if (token.length < 24 || token.length > 512) throw domainError('Community submission token required', 'COMMUNITY_SUBMISSION_TOKEN_REQUIRED', 401);
  return crypto.createHash('sha256').update(token).digest('hex');
};

const resolveSite = async (publicSlugValue: unknown) => {
  const publicSlug = cleanPublicSlug(publicSlugValue);
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT id,tenant_id,name,public_slug FROM public.website_sites
    WHERE public_slug=${publicSlug} AND status='published' LIMIT 1
  `);
  if (!rows[0]) throw domainError('Published site not found', 'PUBLIC_SITE_NOT_FOUND', 404);
  return rows[0];
};

export const listPublicCommunityForums = async (publicSlug: unknown) => {
  const site = await resolveSite(publicSlug);
  const forums = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT f.id,f.slug,f.name,f.description,
      COALESCE((SELECT COUNT(*) FROM public.community_topics t WHERE t.tenant_id=f.tenant_id AND t.forum_id=f.id AND t.status IN ('open','locked')),0)::int AS topic_count
    FROM public.community_forums f
    WHERE f.tenant_id=${Number(site.tenant_id)} AND f.site_id=${Number(site.id)}
      AND f.status='published' AND f.visibility='public'
    ORDER BY f.name,f.id
  `);
  return { site: { name: site.name, public_slug: site.public_slug }, forums };
};

export const listPublicCommunityTopics = async (publicSlug: unknown, forumSlugValue: unknown) => {
  const site = await resolveSite(publicSlug);
  const forumSlug = cleanForumSlug(forumSlugValue);
  const forums = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT id,slug,name,description FROM public.community_forums
    WHERE tenant_id=${Number(site.tenant_id)} AND site_id=${Number(site.id)}
      AND slug=${forumSlug} AND status='published' AND visibility='public' LIMIT 1
  `);
  const forum = forums[0];
  if (!forum) throw domainError('Public forum not found', 'PUBLIC_FORUM_NOT_FOUND', 404);
  const topics = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT t.id,t.slug,t.title,t.content,t.status,t.author_name,t.pinned,t.created_at,t.updated_at,
      COALESCE((SELECT COUNT(*) FROM public.community_replies r WHERE r.tenant_id=t.tenant_id AND r.topic_id=t.id AND r.status='visible'),0)::int AS reply_count,
      COALESCE((SELECT SUM(v.value) FROM public.community_votes v WHERE v.tenant_id=t.tenant_id AND v.topic_id=t.id),0)::int AS score
    FROM public.community_topics t
    WHERE t.tenant_id=${Number(site.tenant_id)} AND t.forum_id=${Number(forum.id)}
      AND t.status IN ('open','locked')
    ORDER BY t.pinned DESC,t.updated_at DESC,t.id DESC
  `);
  return { forum, topics };
};

export const getPublicCommunityTopic = async (publicSlug: unknown, forumSlugValue: unknown, topicSlugValue: unknown) => {
  const site = await resolveSite(publicSlug);
  const forumSlug = cleanForumSlug(forumSlugValue);
  const topicSlug = String(topicSlugValue || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,179}$/.test(topicSlug)) throw domainError('Invalid topic slug', 'INVALID_COMMUNITY_TOPIC_SLUG');
  const topics = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT t.*,f.name AS forum_name,f.slug AS forum_slug,
      COALESCE((SELECT SUM(v.value) FROM public.community_votes v WHERE v.tenant_id=t.tenant_id AND v.topic_id=t.id),0)::int AS score
    FROM public.community_topics t
    JOIN public.community_forums f ON f.tenant_id=t.tenant_id AND f.id=t.forum_id
    WHERE t.tenant_id=${Number(site.tenant_id)} AND f.site_id=${Number(site.id)}
      AND f.slug=${forumSlug} AND f.status='published' AND f.visibility='public'
      AND t.slug=${topicSlug} AND t.status IN ('open','locked')
    LIMIT 1
  `);
  const topic = topics[0];
  if (!topic) throw domainError('Public topic not found', 'PUBLIC_TOPIC_NOT_FOUND', 404);
  const replies = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT r.id,r.parent_reply_id,r.content,r.author_name,r.created_at,
      COALESCE((SELECT SUM(v.value) FROM public.community_votes v WHERE v.tenant_id=r.tenant_id AND v.reply_id=r.id),0)::int AS score
    FROM public.community_replies r
    WHERE r.tenant_id=${Number(site.tenant_id)} AND r.topic_id=${Number(topic.id)} AND r.status='visible'
    ORDER BY r.created_at,r.id
  `);
  return { topic, replies };
};

const publicTopicSlug = (title: string) => {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120) || 'topic';
  return `${base}-${crypto.randomBytes(5).toString('hex')}`;
};

export const createPublicCommunityTopic = async (
  publicSlug: unknown,
  forumSlugValue: unknown,
  submissionToken: unknown,
  input: { authorName: string; authorEmail?: string | null; title: string; content: unknown },
) => {
  const site = await resolveSite(publicSlug);
  const forumSlug = cleanForumSlug(forumSlugValue);
  const hash = submissionHash(submissionToken);
  const authorName = cleanText(input.authorName, 180, 'INVALID_COMMUNITY_AUTHOR_NAME') as string;
  const authorEmail = cleanText(input.authorEmail, 240, 'INVALID_COMMUNITY_AUTHOR_EMAIL', false);
  const title = cleanText(input.title, 240, 'INVALID_COMMUNITY_TOPIC_TITLE') as string;
  const content = validateBlocks(input.content);
  return prisma.$transaction(async (tx) => {
    const forums = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.community_forums
      WHERE tenant_id=${Number(site.tenant_id)} AND site_id=${Number(site.id)} AND slug=${forumSlug}
        AND status='published' AND visibility='public' FOR UPDATE
    `);
    const forum = forums[0];
    if (!forum) throw domainError('Public forum not found', 'PUBLIC_FORUM_NOT_FOUND', 404);
    const existing = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.community_topics
      WHERE tenant_id=${Number(site.tenant_id)} AND forum_id=${Number(forum.id)} AND submission_key_hash=${hash}
      LIMIT 1
    `);
    if (existing[0]) return existing[0];
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.community_topics
        (tenant_id,forum_id,slug,title,content,status,author_name,author_email,submission_key_hash)
      VALUES (
        ${Number(site.tenant_id)},${Number(forum.id)},${publicTopicSlug(title)},${title},CAST(${JSON.stringify(content)} AS jsonb),
        'open',${authorName},${authorEmail},${hash}
      ) RETURNING *
    `);
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.community_events (tenant_id,forum_id,topic_id,event_type,payload)
      VALUES (${Number(site.tenant_id)},${Number(forum.id)},${Number(rows[0].id)},'public_topic_created','{}'::jsonb)
    `);
    return rows[0];
  });
};

export const createPublicCommunityReply = async (
  publicSlug: unknown,
  forumSlugValue: unknown,
  topicSlugValue: unknown,
  submissionToken: unknown,
  input: { authorName: string; authorEmail?: string | null; parentReplyId?: number | null; content: unknown },
) => {
  const site = await resolveSite(publicSlug);
  const forumSlug = cleanForumSlug(forumSlugValue);
  const topicSlug = String(topicSlugValue || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,179}$/.test(topicSlug)) throw domainError('Invalid topic slug', 'INVALID_COMMUNITY_TOPIC_SLUG');
  const hash = submissionHash(submissionToken);
  const authorName = cleanText(input.authorName, 180, 'INVALID_COMMUNITY_AUTHOR_NAME') as string;
  const authorEmail = cleanText(input.authorEmail, 240, 'INVALID_COMMUNITY_AUTHOR_EMAIL', false);
  const parentReplyId = input.parentReplyId == null ? null : Number(input.parentReplyId);
  if (parentReplyId !== null && (!Number.isInteger(parentReplyId) || parentReplyId <= 0)) throw domainError('Invalid parent reply', 'INVALID_COMMUNITY_PARENT_REPLY_ID');
  const content = validateBlocks(input.content);
  return prisma.$transaction(async (tx) => {
    const topics = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT t.*,f.site_id,f.status AS forum_status,f.visibility
      FROM public.community_topics t
      JOIN public.community_forums f ON f.tenant_id=t.tenant_id AND f.id=t.forum_id
      WHERE t.tenant_id=${Number(site.tenant_id)} AND f.site_id=${Number(site.id)} AND f.slug=${forumSlug}
        AND t.slug=${topicSlug} FOR UPDATE OF t
    `);
    const topic = topics[0];
    if (!topic || topic.forum_status !== 'published' || topic.visibility !== 'public') throw domainError('Public topic not found', 'PUBLIC_TOPIC_NOT_FOUND', 404);
    if (topic.status !== 'open') throw domainError('Topic is not open for replies', 'COMMUNITY_TOPIC_NOT_OPEN', 409);
    const existing = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.community_replies
      WHERE tenant_id=${Number(site.tenant_id)} AND topic_id=${Number(topic.id)} AND submission_key_hash=${hash}
      LIMIT 1
    `);
    if (existing[0]) return existing[0];
    if (parentReplyId !== null) {
      const parents = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT id FROM public.community_replies
        WHERE tenant_id=${Number(site.tenant_id)} AND topic_id=${Number(topic.id)} AND id=${parentReplyId} AND status='visible'
        LIMIT 1
      `);
      if (!parents[0]) throw domainError('Parent reply not found in topic', 'COMMUNITY_PARENT_REPLY_SCOPE_MISMATCH', 409);
    }
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.community_replies
        (tenant_id,topic_id,parent_reply_id,content,status,author_name,author_email,submission_key_hash)
      VALUES (
        ${Number(site.tenant_id)},${Number(topic.id)},${parentReplyId},CAST(${JSON.stringify(content)} AS jsonb),
        'visible',${authorName},${authorEmail},${hash}
      ) RETURNING *
    `);
    await tx.$executeRaw(Prisma.sql`UPDATE public.community_topics SET updated_at=NOW() WHERE tenant_id=${Number(site.tenant_id)} AND id=${Number(topic.id)}`);
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.community_events (tenant_id,forum_id,topic_id,reply_id,event_type,payload)
      VALUES (${Number(site.tenant_id)},${Number(topic.forum_id)},${Number(topic.id)},${Number(rows[0].id)},'public_reply_created','{}'::jsonb)
    `);
    return rows[0];
  });
};
