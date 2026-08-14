import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const domainError = (message: string, code: string, status = 400) => Object.assign(new Error(message), { code, status });
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
const articleSlug = (value: unknown) => {
  const slug = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,139}$/.test(slug)) throw domainError('Invalid article slug', 'INVALID_KNOWLEDGE_SLUG');
  return slug;
};

const validateContent = (value: unknown) => {
  if (!Array.isArray(value)) throw domainError('Knowledge content must be an array of declarative blocks', 'INVALID_KNOWLEDGE_CONTENT');
  if (value.length > 300) throw domainError('Knowledge article has too many blocks', 'INVALID_KNOWLEDGE_CONTENT');
  const json = JSON.stringify(value);
  if (Buffer.byteLength(json, 'utf8') > 250_000) throw domainError('Knowledge article is too large', 'KNOWLEDGE_CONTENT_TOO_LARGE', 413);
  if (/[<>]/.test(json) || /javascript:/i.test(json) || /data:text\/html/i.test(json)) {
    throw domainError('Raw HTML or executable URLs are not supported in Knowledge content', 'UNSAFE_KNOWLEDGE_CONTENT');
  }
  const walk = (node: unknown, depth: number) => {
    if (depth > 8) throw domainError('Knowledge content nesting is too deep', 'INVALID_KNOWLEDGE_CONTENT');
    if (Array.isArray(node)) return node.forEach((child) => walk(child, depth + 1));
    if (!node || typeof node !== 'object') return;
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      if (!/^[a-zA-Z0-9_-]{1,50}$/.test(key)) throw domainError('Invalid knowledge content key', 'INVALID_KNOWLEDGE_CONTENT');
      walk(child, depth + 1);
    }
  };
  walk(value, 0);
  return value as unknown[];
};

const appendEvent = async (
  tx: Prisma.TransactionClient,
  input: { tenantId: number; entityType: 'knowledge_space' | 'knowledge_article'; entityId: number; eventType: string; userId: number; payload?: Record<string, unknown> },
) => {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.productivity_events (tenant_id,entity_type,entity_id,event_type,actor_user_id,payload)
    VALUES (${input.tenantId},${input.entityType},${input.entityId},${input.eventType},${input.userId},CAST(${JSON.stringify(input.payload ?? {})} AS jsonb))
  `);
};

export const listKnowledgeSpaces = async (tenantId: number) => prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT s.*,
    COALESCE((SELECT COUNT(*) FROM public.knowledge_articles a WHERE a.tenant_id=s.tenant_id AND a.space_id=s.id AND a.status <> 'archived'),0)::int AS article_count
  FROM public.knowledge_spaces s
  WHERE s.tenant_id=${tenantId}
  ORDER BY lower(s.name),s.id
`);

export const createKnowledgeSpace = async (tenantId: number, userId: number, input: { name: string; description?: string | null }) => {
  const name = cleanText(input.name, 180, 'INVALID_KNOWLEDGE_SPACE_NAME') as string;
  const description = cleanText(input.description, 5000, 'INVALID_KNOWLEDGE_SPACE_DESCRIPTION', false);
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.knowledge_spaces (tenant_id,name,description,visibility,created_by,updated_by)
      VALUES (${tenantId},${name},${description},'tenant',${userId},${userId}) RETURNING *
    `);
    const space = rows[0];
    await appendEvent(tx, { tenantId, entityType: 'knowledge_space', entityId: Number(space.id), eventType: 'created', userId });
    return space;
  });
};

export const listKnowledgeArticles = async (tenantId: number, spaceIdValue?: unknown) => {
  const spaceId = spaceIdValue == null || spaceIdValue === '' ? null : positiveInt(spaceIdValue, 'INVALID_KNOWLEDGE_SPACE_ID');
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT a.*,s.name AS space_name
    FROM public.knowledge_articles a
    JOIN public.knowledge_spaces s ON s.id=a.space_id AND s.tenant_id=a.tenant_id
    WHERE a.tenant_id=${tenantId} AND (${spaceId}::bigint IS NULL OR a.space_id=${spaceId})
    ORDER BY a.updated_at DESC,a.id DESC
  `);
};

export const getKnowledgeArticle = async (tenantId: number, articleIdValue: unknown) => {
  const articleId = positiveInt(articleIdValue, 'INVALID_KNOWLEDGE_ARTICLE_ID');
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT a.*,s.name AS space_name,v.content,v.summary,v.created_at AS version_created_at
    FROM public.knowledge_articles a
    JOIN public.knowledge_spaces s ON s.id=a.space_id AND s.tenant_id=a.tenant_id
    LEFT JOIN public.knowledge_article_versions v
      ON v.tenant_id=a.tenant_id AND v.article_id=a.id AND v.version_no=a.current_version
    WHERE a.tenant_id=${tenantId} AND a.id=${articleId}
    LIMIT 1
  `);
  if (!rows[0]) throw domainError('Knowledge article not found', 'KNOWLEDGE_ARTICLE_NOT_FOUND', 404);
  return rows[0];
};

export const createKnowledgeArticle = async (
  tenantId: number,
  userId: number,
  input: { spaceId: number; slug: string; title: string; content: unknown; summary?: string | null },
) => {
  const spaceId = positiveInt(input.spaceId, 'INVALID_KNOWLEDGE_SPACE_ID');
  const slug = articleSlug(input.slug);
  const title = cleanText(input.title, 240, 'INVALID_KNOWLEDGE_TITLE') as string;
  const content = validateContent(input.content);
  const summary = cleanText(input.summary, 500, 'INVALID_KNOWLEDGE_SUMMARY', false);
  return prisma.$transaction(async (tx) => {
    const spaceRows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT id FROM public.knowledge_spaces WHERE tenant_id=${tenantId} AND id=${spaceId} FOR SHARE
    `);
    if (!spaceRows[0]) throw domainError('Knowledge space not found', 'KNOWLEDGE_SPACE_NOT_FOUND', 404);
    const articleRows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.knowledge_articles
        (tenant_id,space_id,slug,title,status,current_version,created_by,updated_by)
      VALUES (${tenantId},${spaceId},${slug},${title},'draft',1,${userId},${userId}) RETURNING *
    `);
    const article = articleRows[0];
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.knowledge_article_versions (tenant_id,article_id,version_no,content,summary,created_by)
      VALUES (${tenantId},${Number(article.id)},1,CAST(${JSON.stringify(content)} AS jsonb),${summary},${userId})
    `);
    await appendEvent(tx, { tenantId, entityType: 'knowledge_article', entityId: Number(article.id), eventType: 'created', userId, payload: { version: 1 } });
    return getKnowledgeArticleWithinTx(tx, tenantId, Number(article.id));
  });
};

const getKnowledgeArticleWithinTx = async (tx: Prisma.TransactionClient, tenantId: number, articleId: number) => {
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT a.*,v.content,v.summary
    FROM public.knowledge_articles a
    JOIN public.knowledge_article_versions v
      ON v.tenant_id=a.tenant_id AND v.article_id=a.id AND v.version_no=a.current_version
    WHERE a.tenant_id=${tenantId} AND a.id=${articleId} LIMIT 1
  `);
  return rows[0];
};

export const reviseKnowledgeArticle = async (
  tenantId: number,
  userId: number,
  articleIdValue: unknown,
  input: { title?: string; content: unknown; summary?: string | null },
) => {
  const articleId = positiveInt(articleIdValue, 'INVALID_KNOWLEDGE_ARTICLE_ID');
  const content = validateContent(input.content);
  const summary = cleanText(input.summary, 500, 'INVALID_KNOWLEDGE_SUMMARY', false);
  const nextTitle = input.title == null ? null : cleanText(input.title, 240, 'INVALID_KNOWLEDGE_TITLE');
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.knowledge_articles WHERE tenant_id=${tenantId} AND id=${articleId} FOR UPDATE
    `);
    const article = rows[0];
    if (!article) throw domainError('Knowledge article not found', 'KNOWLEDGE_ARTICLE_NOT_FOUND', 404);
    if (article.status === 'archived') throw domainError('Archived article cannot be revised', 'KNOWLEDGE_ARTICLE_ARCHIVED', 409);
    const version = Number(article.current_version) + 1;
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.knowledge_article_versions (tenant_id,article_id,version_no,content,summary,created_by)
      VALUES (${tenantId},${articleId},${version},CAST(${JSON.stringify(content)} AS jsonb),${summary},${userId})
    `);
    await tx.$executeRaw(Prisma.sql`
      UPDATE public.knowledge_articles
      SET current_version=${version},title=COALESCE(${nextTitle},title),updated_by=${userId},updated_at=NOW()
      WHERE tenant_id=${tenantId} AND id=${articleId}
    `);
    await appendEvent(tx, { tenantId, entityType: 'knowledge_article', entityId: articleId, eventType: 'revised', userId, payload: { version } });
    return getKnowledgeArticleWithinTx(tx, tenantId, articleId);
  });
};

export const transitionKnowledgeArticle = async (tenantId: number, userId: number, articleIdValue: unknown, targetValue: unknown) => {
  const articleId = positiveInt(articleIdValue, 'INVALID_KNOWLEDGE_ARTICLE_ID');
  const target = String(targetValue || '').trim().toLowerCase();
  const transitions: Record<string, string[]> = { draft: ['published','archived'], published: ['draft','archived'], archived: [] };
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.knowledge_articles WHERE tenant_id=${tenantId} AND id=${articleId} FOR UPDATE
    `);
    const article = rows[0];
    if (!article) throw domainError('Knowledge article not found', 'KNOWLEDGE_ARTICLE_NOT_FOUND', 404);
    if (!(transitions[String(article.status)] || []).includes(target)) throw domainError('Invalid article transition', 'INVALID_KNOWLEDGE_TRANSITION', 409);
    const changed = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.knowledge_articles
      SET status=${target},updated_by=${userId},updated_at=NOW(),
          published_at=CASE WHEN ${target}='published' THEN COALESCE(published_at,NOW()) ELSE published_at END,
          archived_at=CASE WHEN ${target}='archived' THEN NOW() ELSE archived_at END
      WHERE tenant_id=${tenantId} AND id=${articleId} AND status=${String(article.status)}
      RETURNING *
    `);
    if (!changed[0]) throw domainError('Concurrent article update', 'KNOWLEDGE_ARTICLE_CONCURRENT_UPDATE', 409);
    await appendEvent(tx, { tenantId, entityType: 'knowledge_article', entityId: articleId, eventType: `status_${target}`, userId });
    return changed[0];
  });
};
