import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';
import { setLearningLessonProgress, startLearningAttempt, submitLearningAttempt } from './learning.p3.service';

const domainError = (message: string, code: string, status = 400) =>
  Object.assign(new Error(message), { code, status });

const positiveInt = (value: unknown, code: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw domainError('Expected positive integer', code);
  return parsed;
};

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');

const resolveEnrollment = async (tokenValue: unknown) => {
  const token = String(tokenValue || '').trim();
  if (token.length < 32 || token.length > 512) throw domainError('Learner token required', 'LEARNING_TOKEN_REQUIRED', 401);
  const tokenHash = hashToken(token);
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT e.*,c.slug AS course_slug,c.title AS course_title,c.description AS course_description,
      c.visibility,c.status AS course_status,c.site_id,cu.name AS customer_name,cu.email AS customer_email
    FROM public.learning_enrollments e
    JOIN public.learning_courses c ON c.tenant_id=e.tenant_id AND c.id=e.course_id
    JOIN public.customers cu ON cu.id=e.customer_id AND cu.tenant_id=e.tenant_id
    WHERE e.access_token_hash=${tokenHash}
      AND e.status IN ('active','completed')
      AND c.status='published'
    LIMIT 1
  `);
  if (!rows[0]) throw domainError('Learner access is invalid or inactive', 'LEARNING_ACCESS_INVALID', 401);
  return rows[0];
};

export const issueLearningAccessToken = async (tenantId: number, userId: number, enrollmentIdValue: unknown) => {
  const enrollmentId = positiveInt(enrollmentIdValue, 'INVALID_LEARNING_ENROLLMENT_ID');
  const token = newToken();
  const tokenHash = hashToken(token);
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.learning_enrollments WHERE tenant_id=${tenantId} AND id=${enrollmentId} FOR UPDATE
    `);
    const enrollment = rows[0];
    if (!enrollment || enrollment.status === 'cancelled') throw domainError('Active enrollment required', 'LEARNING_ENROLLMENT_REQUIRED', 409);
    const updated = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.learning_enrollments
      SET access_token_hash=${tokenHash},token_rotated_at=NOW()
      WHERE tenant_id=${tenantId} AND id=${enrollmentId}
      RETURNING id,tenant_id,course_id,customer_id,status,token_rotated_at
    `);
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.learning_events (tenant_id,course_id,enrollment_id,event_type,actor_user_id,customer_id,payload)
      VALUES (${tenantId},${Number(enrollment.course_id)},${enrollmentId},'learner_access_rotated',${userId},${Number(enrollment.customer_id)},'{}'::jsonb)
    `);
    return { ...updated[0], token };
  });
};

export const getPublicLearningWorkspace = async (tokenValue: unknown) => {
  const enrollment = await resolveEnrollment(tokenValue);
  const tenantId = Number(enrollment.tenant_id);
  const enrollmentId = Number(enrollment.id);
  const courseId = Number(enrollment.course_id);
  const [lessons, assessments, progress, certificate] = await Promise.all([
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id,position,slug,title,content,duration_minutes,status
      FROM public.learning_lessons
      WHERE tenant_id=${tenantId} AND course_id=${courseId} AND status='published'
      ORDER BY position,id
    `),
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT a.id,a.lesson_id,a.title,a.passing_score,a.max_attempts,
        COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id',q.id,'position',q.position,'question_type',q.question_type,'prompt',q.prompt,'options',q.options,'points',q.points
          ) ORDER BY q.position,q.id)
          FROM public.learning_assessment_questions q
          WHERE q.tenant_id=a.tenant_id AND q.assessment_id=a.id
        ),'[]'::jsonb) AS questions,
        COALESCE((SELECT COUNT(*) FROM public.learning_attempts la WHERE la.tenant_id=a.tenant_id AND la.enrollment_id=${enrollmentId} AND la.assessment_id=a.id),0)::int AS attempt_count,
        EXISTS(SELECT 1 FROM public.learning_attempts la WHERE la.tenant_id=a.tenant_id AND la.enrollment_id=${enrollmentId} AND la.assessment_id=a.id AND la.status='passed') AS passed
      FROM public.learning_assessments a
      WHERE a.tenant_id=${tenantId} AND a.course_id=${courseId} AND a.status='published'
      ORDER BY a.id
    `),
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT lesson_id,status,progress_percent,started_at,completed_at,updated_at
      FROM public.learning_progress
      WHERE tenant_id=${tenantId} AND enrollment_id=${enrollmentId}
    `),
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT certificate_number,evidence_sha256,issued_at
      FROM public.learning_certificates
      WHERE tenant_id=${tenantId} AND enrollment_id=${enrollmentId}
      LIMIT 1
    `),
  ]);
  return {
    enrollment: {
      id: enrollmentId,
      status: enrollment.status,
      customer_name: enrollment.customer_name,
      course: {
        id: courseId,
        slug: enrollment.course_slug,
        title: enrollment.course_title,
        description: enrollment.course_description,
      },
    },
    lessons,
    assessments,
    progress,
    certificate: certificate[0] ?? null,
  };
};

export const updatePublicLearningProgress = async (tokenValue: unknown, lessonIdValue: unknown, progressValue: unknown) => {
  const enrollment = await resolveEnrollment(tokenValue);
  return setLearningLessonProgress(Number(enrollment.tenant_id), null, Number(enrollment.id), lessonIdValue, progressValue);
};

export const startPublicLearningAttempt = async (tokenValue: unknown, assessmentIdValue: unknown) => {
  const enrollment = await resolveEnrollment(tokenValue);
  return startLearningAttempt(Number(enrollment.tenant_id), Number(enrollment.id), assessmentIdValue);
};

export const submitPublicLearningAttempt = async (
  tokenValue: unknown,
  attemptIdValue: unknown,
  answers: Array<{ questionId: number; answer: unknown }>,
) => {
  const enrollment = await resolveEnrollment(tokenValue);
  const attemptId = positiveInt(attemptIdValue, 'INVALID_LEARNING_ATTEMPT_ID');
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT id FROM public.learning_attempts
    WHERE tenant_id=${Number(enrollment.tenant_id)} AND id=${attemptId} AND enrollment_id=${Number(enrollment.id)}
    LIMIT 1
  `);
  if (!rows[0]) throw domainError('Attempt is outside learner enrollment', 'LEARNING_ATTEMPT_SCOPE_MISMATCH', 403);
  return submitLearningAttempt(Number(enrollment.tenant_id), attemptId, answers);
};
