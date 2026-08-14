import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

const domainError = (message: string, code: string, status = 400) =>
  Object.assign(new Error(message), { code, status });

const cleanSlug = (value: unknown, max: number, code: string) => {
  const slug = String(value || '').trim().toLowerCase();
  if (slug.length < 1 || slug.length > max || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw domainError('Invalid slug', code);
  }
  return slug;
};

const resolveSite = async (publicSlugValue: unknown) => {
  const publicSlug = cleanSlug(publicSlugValue, 120, 'INVALID_PUBLIC_SITE_SLUG');
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT id,tenant_id,name,public_slug FROM public.website_sites
    WHERE public_slug=${publicSlug} AND status='published' LIMIT 1
  `);
  if (!rows[0]) throw domainError('Published site not found', 'PUBLIC_SITE_NOT_FOUND', 404);
  return rows[0];
};

export const listPublicLearningCourses = async (publicSlugValue: unknown) => {
  const site = await resolveSite(publicSlugValue);
  const courses = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT c.id,c.slug,c.title,c.description,c.difficulty,c.published_at,
      COALESCE((SELECT COUNT(*) FROM public.learning_lessons l WHERE l.tenant_id=c.tenant_id AND l.course_id=c.id AND l.status='published'),0)::int AS lesson_count,
      COALESCE((SELECT SUM(l.duration_minutes) FROM public.learning_lessons l WHERE l.tenant_id=c.tenant_id AND l.course_id=c.id AND l.status='published'),0)::int AS duration_minutes
    FROM public.learning_courses c
    WHERE c.tenant_id=${Number(site.tenant_id)} AND c.site_id=${Number(site.id)}
      AND c.status='published' AND c.visibility='public'
    ORDER BY c.published_at DESC,c.id DESC
  `);
  return { site: { name: site.name, public_slug: site.public_slug }, courses };
};

export const getPublicLearningCourse = async (publicSlugValue: unknown, courseSlugValue: unknown) => {
  const site = await resolveSite(publicSlugValue);
  const courseSlug = cleanSlug(courseSlugValue, 140, 'INVALID_LEARNING_COURSE_SLUG');
  const courses = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT id,slug,title,description,difficulty,published_at
    FROM public.learning_courses
    WHERE tenant_id=${Number(site.tenant_id)} AND site_id=${Number(site.id)}
      AND slug=${courseSlug} AND status='published' AND visibility='public' LIMIT 1
  `);
  const course = courses[0];
  if (!course) throw domainError('Public course not found', 'PUBLIC_LEARNING_COURSE_NOT_FOUND', 404);
  const lessons = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT id,position,slug,title,content,duration_minutes
    FROM public.learning_lessons
    WHERE tenant_id=${Number(site.tenant_id)} AND course_id=${Number(course.id)} AND status='published'
    ORDER BY position,id
  `);
  return { course, lessons };
};
