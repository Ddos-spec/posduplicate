import crypto from 'crypto';
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

const cleanSlug = (value: unknown, code: string) => {
  const slug = String(value ?? '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,139}$/.test(slug)) throw domainError('Invalid slug', code);
  return slug;
};

const validateBlocks = (value: unknown, code: string) => {
  if (!Array.isArray(value) || value.length > 100) throw domainError('Content must be an array of declarative blocks', code);
  const allowed = new Set(['heading', 'paragraph', 'callout', 'checklist', 'code', 'link']);
  for (const block of value) {
    if (!block || typeof block !== 'object' || Array.isArray(block)) throw domainError('Invalid content block', code);
    const type = String((block as Record<string, unknown>).type || '');
    if (!allowed.has(type)) throw domainError('Unsupported content block type', code);
  }
  const json = JSON.stringify(value);
  if (json.length > 200000 || /[<>]/.test(json) || /javascript:/i.test(json)) {
    throw domainError('Unsafe learning content', 'UNSAFE_LEARNING_CONTENT');
  }
  return value;
};

const normalizeComparable = (value: unknown): unknown => {
  if (Array.isArray(value)) return [...value].map(normalizeComparable).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalizeComparable(item)]));
  }
  if (typeof value === 'string') return value.trim().toLowerCase();
  return value;
};

const answersEqual = (left: unknown, right: unknown) =>
  JSON.stringify(normalizeComparable(left)) === JSON.stringify(normalizeComparable(right));

const appendLearningEvent = async (
  tx: Prisma.TransactionClient,
  input: { tenantId: number; courseId?: number | null; enrollmentId?: number | null; eventType: string; actorUserId?: number | null; customerId?: number | null; payload?: Record<string, unknown> },
) => {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.learning_events
      (tenant_id,course_id,enrollment_id,event_type,actor_user_id,customer_id,payload)
    VALUES (
      ${input.tenantId},${input.courseId ?? null},${input.enrollmentId ?? null},${input.eventType},
      ${input.actorUserId ?? null},${input.customerId ?? null},CAST(${JSON.stringify(input.payload ?? {})} AS jsonb)
    )
  `);
};

const assertSiteScope = async (tx: Prisma.TransactionClient, tenantId: number, siteId: number | null) => {
  if (siteId === null) return;
  const rows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT id,status FROM public.website_sites WHERE tenant_id=${tenantId} AND id=${siteId} LIMIT 1
  `);
  if (!rows[0]) throw domainError('Website site not found in tenant', 'LEARNING_SITE_SCOPE_MISMATCH', 404);
};

export const listLearningCourses = async (tenantId: number) => prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT c.*,
    COALESCE((SELECT COUNT(*) FROM public.learning_lessons l WHERE l.tenant_id=c.tenant_id AND l.course_id=c.id),0)::int AS lesson_count,
    COALESCE((SELECT COUNT(*) FROM public.learning_enrollments e WHERE e.tenant_id=c.tenant_id AND e.course_id=c.id AND e.status <> 'cancelled'),0)::int AS enrollment_count
  FROM public.learning_courses c
  WHERE c.tenant_id=${tenantId}
  ORDER BY c.updated_at DESC,c.id DESC
`);

export const createLearningCourse = async (
  tenantId: number,
  userId: number,
  input: { siteId?: number | null; slug: string; title: string; description?: string | null; visibility?: string; difficulty?: string },
) => {
  const siteId = input.siteId == null ? null : positiveInt(input.siteId, 'INVALID_LEARNING_SITE_ID');
  const slug = cleanSlug(input.slug, 'INVALID_LEARNING_COURSE_SLUG');
  const title = cleanText(input.title, 220, 'INVALID_LEARNING_COURSE_TITLE') as string;
  const visibility = String(input.visibility || 'private');
  const difficulty = String(input.difficulty || 'beginner');
  if (!['public', 'private'].includes(visibility)) throw domainError('Invalid course visibility', 'INVALID_LEARNING_COURSE_VISIBILITY');
  if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) throw domainError('Invalid course difficulty', 'INVALID_LEARNING_COURSE_DIFFICULTY');

  return prisma.$transaction(async (tx) => {
    await assertSiteScope(tx, tenantId, siteId);
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.learning_courses
        (tenant_id,site_id,slug,title,description,status,visibility,difficulty,created_by,updated_by)
      VALUES (
        ${tenantId},${siteId},${slug},${title},${cleanText(input.description, 10000, 'INVALID_LEARNING_COURSE_DESCRIPTION', false)},
        'draft',${visibility},${difficulty},${userId},${userId}
      ) RETURNING *
    `);
    const course = rows[0];
    await appendLearningEvent(tx, { tenantId, courseId: Number(course.id), eventType: 'course_created', actorUserId: userId });
    return course;
  });
};

export const transitionLearningCourse = async (tenantId: number, userId: number, courseIdValue: unknown, targetValue: unknown) => {
  const courseId = positiveInt(courseIdValue, 'INVALID_LEARNING_COURSE_ID');
  const target = String(targetValue || '');
  const allowed: Record<string, string[]> = { draft: ['published', 'archived'], published: ['draft', 'archived'], archived: [] };
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.learning_courses WHERE tenant_id=${tenantId} AND id=${courseId} FOR UPDATE
    `);
    const course = rows[0];
    if (!course) throw domainError('Course not found', 'LEARNING_COURSE_NOT_FOUND', 404);
    if (course.status === target) return course;
    if (!(allowed[String(course.status)] || []).includes(target)) throw domainError('Invalid course transition', 'INVALID_LEARNING_COURSE_TRANSITION', 409);
    if (target === 'published') {
      const lessons = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT COUNT(*)::int AS count FROM public.learning_lessons
        WHERE tenant_id=${tenantId} AND course_id=${courseId} AND status='published'
      `);
      if (Number(lessons[0]?.count || 0) < 1) throw domainError('Publish at least one lesson first', 'LEARNING_COURSE_REQUIRES_LESSON', 409);
      if (course.visibility === 'public') {
        if (!course.site_id) throw domainError('Public course requires a website site', 'PUBLIC_LEARNING_SITE_REQUIRED', 409);
        const sites = await tx.$queryRaw<any[]>(Prisma.sql`
          SELECT status FROM public.website_sites WHERE tenant_id=${tenantId} AND id=${Number(course.site_id)} LIMIT 1
        `);
        if (sites[0]?.status !== 'published') throw domainError('Public course requires a published website site', 'PUBLIC_LEARNING_SITE_NOT_PUBLISHED', 409);
      }
    }
    const updated = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.learning_courses
      SET status=${target},updated_by=${userId},updated_at=NOW(),
          published_at=CASE WHEN ${target}='published' THEN COALESCE(published_at,NOW()) ELSE published_at END,
          archived_at=CASE WHEN ${target}='archived' THEN COALESCE(archived_at,NOW()) ELSE archived_at END
      WHERE tenant_id=${tenantId} AND id=${courseId}
      RETURNING *
    `);
    await appendLearningEvent(tx, { tenantId, courseId, eventType: 'course_status_changed', actorUserId: userId, payload: { from: course.status, to: target } });
    return updated[0];
  });
};

export const listLearningLessons = async (tenantId: number, courseIdValue: unknown) => {
  const courseId = positiveInt(courseIdValue, 'INVALID_LEARNING_COURSE_ID');
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT * FROM public.learning_lessons
    WHERE tenant_id=${tenantId} AND course_id=${courseId}
    ORDER BY position,id
  `);
};

export const createLearningLesson = async (
  tenantId: number,
  userId: number,
  courseIdValue: unknown,
  input: { position: number; slug: string; title: string; content: unknown; durationMinutes?: number },
) => {
  const courseId = positiveInt(courseIdValue, 'INVALID_LEARNING_COURSE_ID');
  const position = Number(input.position);
  const duration = Number(input.durationMinutes ?? 0);
  if (!Number.isInteger(position) || position < 0) throw domainError('Invalid lesson position', 'INVALID_LEARNING_LESSON_POSITION');
  if (!Number.isInteger(duration) || duration < 0 || duration > 100000) throw domainError('Invalid lesson duration', 'INVALID_LEARNING_LESSON_DURATION');
  const content = validateBlocks(input.content, 'INVALID_LEARNING_LESSON_CONTENT');
  return prisma.$transaction(async (tx) => {
    const courses = await tx.$queryRaw<any[]>(Prisma.sql`SELECT id,status FROM public.learning_courses WHERE tenant_id=${tenantId} AND id=${courseId} FOR UPDATE`);
    if (!courses[0]) throw domainError('Course not found', 'LEARNING_COURSE_NOT_FOUND', 404);
    if (courses[0].status === 'archived') throw domainError('Archived course cannot be edited', 'LEARNING_COURSE_ARCHIVED', 409);
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.learning_lessons
        (tenant_id,course_id,position,slug,title,content,duration_minutes,status,created_by,updated_by)
      VALUES (
        ${tenantId},${courseId},${position},${cleanSlug(input.slug, 'INVALID_LEARNING_LESSON_SLUG')},
        ${cleanText(input.title, 220, 'INVALID_LEARNING_LESSON_TITLE')},CAST(${JSON.stringify(content)} AS jsonb),${duration},'draft',${userId},${userId}
      ) RETURNING *
    `);
    await appendLearningEvent(tx, { tenantId, courseId, eventType: 'lesson_created', actorUserId: userId, payload: { lessonId: Number(rows[0].id) } });
    return rows[0];
  });
};

export const setLearningLessonStatus = async (tenantId: number, userId: number, lessonIdValue: unknown, targetValue: unknown) => {
  const lessonId = positiveInt(lessonIdValue, 'INVALID_LEARNING_LESSON_ID');
  const target = String(targetValue || '');
  if (!['draft', 'published', 'archived'].includes(target)) throw domainError('Invalid lesson status', 'INVALID_LEARNING_LESSON_STATUS');
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.learning_lessons WHERE tenant_id=${tenantId} AND id=${lessonId} FOR UPDATE`);
    const lesson = rows[0];
    if (!lesson) throw domainError('Lesson not found', 'LEARNING_LESSON_NOT_FOUND', 404);
    if (lesson.status === 'archived' && target !== 'archived') throw domainError('Archived lesson cannot transition', 'LEARNING_LESSON_ARCHIVED', 409);
    if (lesson.status === target) return lesson;
    const updated = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.learning_lessons SET status=${target},updated_by=${userId},updated_at=NOW()
      WHERE tenant_id=${tenantId} AND id=${lessonId} RETURNING *
    `);
    await appendLearningEvent(tx, { tenantId, courseId: Number(lesson.course_id), eventType: 'lesson_status_changed', actorUserId: userId, payload: { lessonId, from: lesson.status, to: target } });
    return updated[0];
  });
};

export const listLearningAssessments = async (tenantId: number, courseIdValue: unknown) => {
  const courseId = positiveInt(courseIdValue, 'INVALID_LEARNING_COURSE_ID');
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT a.*,
      COALESCE((SELECT COUNT(*) FROM public.learning_assessment_questions q WHERE q.tenant_id=a.tenant_id AND q.assessment_id=a.id),0)::int AS question_count
    FROM public.learning_assessments a
    WHERE a.tenant_id=${tenantId} AND a.course_id=${courseId}
    ORDER BY a.id
  `);
};

export const createLearningAssessment = async (
  tenantId: number,
  userId: number,
  input: {
    courseId: number; lessonId?: number | null; title: string; passingScore?: number; maxAttempts?: number;
    questions: Array<{ type: string; prompt: string; options?: unknown[]; correctAnswer: unknown; points?: number }>;
  },
) => {
  const courseId = positiveInt(input.courseId, 'INVALID_LEARNING_COURSE_ID');
  const lessonId = input.lessonId == null ? null : positiveInt(input.lessonId, 'INVALID_LEARNING_LESSON_ID');
  const passingScore = Number(input.passingScore ?? 70);
  const maxAttempts = Number(input.maxAttempts ?? 3);
  if (!Number.isFinite(passingScore) || passingScore < 0 || passingScore > 100) throw domainError('Invalid passing score', 'INVALID_LEARNING_PASSING_SCORE');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) throw domainError('Invalid max attempts', 'INVALID_LEARNING_MAX_ATTEMPTS');
  if (!Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > 200) throw domainError('Assessment questions required', 'INVALID_LEARNING_QUESTIONS');
  const allowedTypes = new Set(['single_choice', 'multiple_choice', 'true_false', 'short_text']);
  const questions = input.questions.map((question, index) => {
    const type = String(question.type || '');
    if (!allowedTypes.has(type)) throw domainError('Invalid question type', 'INVALID_LEARNING_QUESTION_TYPE');
    const points = Number(question.points ?? 1);
    if (!Number.isFinite(points) || points <= 0 || points > 10000) throw domainError('Invalid question points', 'INVALID_LEARNING_QUESTION_POINTS');
    return {
      position: index,
      type,
      prompt: cleanText(question.prompt, 5000, 'INVALID_LEARNING_QUESTION_PROMPT') as string,
      options: Array.isArray(question.options) ? question.options.slice(0, 100) : [],
      correctAnswer: question.correctAnswer,
      points,
    };
  });

  return prisma.$transaction(async (tx) => {
    const courses = await tx.$queryRaw<any[]>(Prisma.sql`SELECT id,status FROM public.learning_courses WHERE tenant_id=${tenantId} AND id=${courseId} FOR UPDATE`);
    if (!courses[0]) throw domainError('Course not found', 'LEARNING_COURSE_NOT_FOUND', 404);
    if (lessonId !== null) {
      const lessons = await tx.$queryRaw<any[]>(Prisma.sql`SELECT id FROM public.learning_lessons WHERE tenant_id=${tenantId} AND course_id=${courseId} AND id=${lessonId} LIMIT 1`);
      if (!lessons[0]) throw domainError('Lesson does not belong to course', 'LEARNING_LESSON_SCOPE_MISMATCH', 409);
    }
    const assessmentRows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.learning_assessments
        (tenant_id,course_id,lesson_id,title,status,passing_score,max_attempts,created_by,updated_by)
      VALUES (${tenantId},${courseId},${lessonId},${cleanText(input.title, 220, 'INVALID_LEARNING_ASSESSMENT_TITLE')},'draft',${passingScore},${maxAttempts},${userId},${userId})
      RETURNING *
    `);
    const assessment = assessmentRows[0];
    for (const question of questions) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.learning_assessment_questions
          (tenant_id,assessment_id,position,question_type,prompt,options,correct_answer,points)
        VALUES (
          ${tenantId},${Number(assessment.id)},${question.position},${question.type},${question.prompt},
          CAST(${JSON.stringify(question.options)} AS jsonb),CAST(${JSON.stringify(question.correctAnswer)} AS jsonb),${question.points}
        )
      `);
    }
    await appendLearningEvent(tx, { tenantId, courseId, eventType: 'assessment_created', actorUserId: userId, payload: { assessmentId: Number(assessment.id), questionCount: questions.length } });
    return assessment;
  });
};

export const setLearningAssessmentStatus = async (tenantId: number, userId: number, assessmentIdValue: unknown, targetValue: unknown) => {
  const assessmentId = positiveInt(assessmentIdValue, 'INVALID_LEARNING_ASSESSMENT_ID');
  const target = String(targetValue || '');
  if (!['draft', 'published', 'archived'].includes(target)) throw domainError('Invalid assessment status', 'INVALID_LEARNING_ASSESSMENT_STATUS');
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.learning_assessments WHERE tenant_id=${tenantId} AND id=${assessmentId} FOR UPDATE`);
    const assessment = rows[0];
    if (!assessment) throw domainError('Assessment not found', 'LEARNING_ASSESSMENT_NOT_FOUND', 404);
    if (assessment.status === 'archived' && target !== 'archived') throw domainError('Archived assessment cannot transition', 'LEARNING_ASSESSMENT_ARCHIVED', 409);
    if (assessment.status === target) return assessment;
    const updated = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.learning_assessments SET status=${target},updated_by=${userId},updated_at=NOW()
      WHERE tenant_id=${tenantId} AND id=${assessmentId} RETURNING *
    `);
    await appendLearningEvent(tx, { tenantId, courseId: Number(assessment.course_id), eventType: 'assessment_status_changed', actorUserId: userId, payload: { assessmentId, from: assessment.status, to: target } });
    return updated[0];
  });
};

export const listLearningEnrollments = async (tenantId: number, courseIdValue: unknown) => {
  const courseId = positiveInt(courseIdValue, 'INVALID_LEARNING_COURSE_ID');
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT e.*,c.name AS customer_name,c.email AS customer_email,
      COALESCE((SELECT COUNT(*) FROM public.learning_progress p WHERE p.tenant_id=e.tenant_id AND p.enrollment_id=e.id AND p.status='completed'),0)::int AS completed_lessons
    FROM public.learning_enrollments e
    JOIN public.customers c ON c.id=e.customer_id AND c.tenant_id=e.tenant_id
    WHERE e.tenant_id=${tenantId} AND e.course_id=${courseId}
    ORDER BY e.enrolled_at DESC,e.id DESC
  `);
};

export const enrollLearningCustomer = async (tenantId: number, userId: number, courseIdValue: unknown, customerIdValue: unknown) => {
  const courseId = positiveInt(courseIdValue, 'INVALID_LEARNING_COURSE_ID');
  const customerId = positiveInt(customerIdValue, 'INVALID_LEARNING_CUSTOMER_ID');
  return prisma.$transaction(async (tx) => {
    const courses = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.learning_courses WHERE tenant_id=${tenantId} AND id=${courseId} FOR UPDATE`);
    const course = courses[0];
    if (!course) throw domainError('Course not found', 'LEARNING_COURSE_NOT_FOUND', 404);
    if (course.status !== 'published') throw domainError('Course is not published', 'LEARNING_COURSE_NOT_PUBLISHED', 409);
    const customers = await tx.$queryRaw<any[]>(Prisma.sql`SELECT id FROM public.customers WHERE tenant_id=${tenantId} AND id=${customerId} LIMIT 1`);
    if (!customers[0]) throw domainError('Customer not found in tenant', 'LEARNING_CUSTOMER_SCOPE_MISMATCH', 404);
    const existingRows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.learning_enrollments WHERE tenant_id=${tenantId} AND course_id=${courseId} AND customer_id=${customerId} FOR UPDATE
    `);
    const existing = existingRows[0];
    if (existing && existing.status !== 'cancelled') return existing;
    if (existing) {
      const reactivated = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE public.learning_enrollments
        SET status='active',enrolled_at=NOW(),completed_at=NULL,cancelled_at=NULL,created_by=${userId}
        WHERE tenant_id=${tenantId} AND id=${Number(existing.id)} RETURNING *
      `);
      await appendLearningEvent(tx, { tenantId, courseId, enrollmentId: Number(existing.id), eventType: 'enrollment_reactivated', actorUserId: userId, customerId });
      return reactivated[0];
    }
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.learning_enrollments (tenant_id,course_id,customer_id,status,created_by)
      VALUES (${tenantId},${courseId},${customerId},'active',${userId}) RETURNING *
    `);
    await appendLearningEvent(tx, { tenantId, courseId, enrollmentId: Number(rows[0].id), eventType: 'enrolled', actorUserId: userId, customerId });
    return rows[0];
  });
};

export const setLearningLessonProgress = async (
  tenantId: number,
  actorUserId: number | null,
  enrollmentIdValue: unknown,
  lessonIdValue: unknown,
  progressValue: unknown,
) => {
  const enrollmentId = positiveInt(enrollmentIdValue, 'INVALID_LEARNING_ENROLLMENT_ID');
  const lessonId = positiveInt(lessonIdValue, 'INVALID_LEARNING_LESSON_ID');
  const progress = Number(progressValue);
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) throw domainError('Invalid progress percentage', 'INVALID_LEARNING_PROGRESS');
  return prisma.$transaction(async (tx) => {
    const enrollments = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.learning_enrollments WHERE tenant_id=${tenantId} AND id=${enrollmentId} FOR UPDATE`);
    const enrollment = enrollments[0];
    if (!enrollment) throw domainError('Enrollment not found', 'LEARNING_ENROLLMENT_NOT_FOUND', 404);
    if (enrollment.status === 'cancelled') throw domainError('Enrollment is cancelled', 'LEARNING_ENROLLMENT_CANCELLED', 409);
    const lessons = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT id FROM public.learning_lessons WHERE tenant_id=${tenantId} AND course_id=${Number(enrollment.course_id)} AND id=${lessonId} AND status='published' LIMIT 1
    `);
    if (!lessons[0]) throw domainError('Published lesson not found in enrolled course', 'LEARNING_LESSON_SCOPE_MISMATCH', 409);
    const status = progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started';
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.learning_progress
        (tenant_id,course_id,enrollment_id,lesson_id,status,progress_percent,started_at,completed_at,updated_at)
      VALUES (
        ${tenantId},${Number(enrollment.course_id)},${enrollmentId},${lessonId},${status},${progress},
        CASE WHEN ${progress}>0 THEN NOW() ELSE NULL END,CASE WHEN ${progress}>=100 THEN NOW() ELSE NULL END,NOW()
      )
      ON CONFLICT (tenant_id,enrollment_id,lesson_id)
      DO UPDATE SET status=EXCLUDED.status,progress_percent=EXCLUDED.progress_percent,
        started_at=COALESCE(public.learning_progress.started_at,EXCLUDED.started_at),
        completed_at=CASE WHEN EXCLUDED.status='completed' THEN COALESCE(public.learning_progress.completed_at,NOW()) ELSE NULL END,
        updated_at=NOW()
      RETURNING *
    `);
    await appendLearningEvent(tx, { tenantId, courseId: Number(enrollment.course_id), enrollmentId, eventType: 'lesson_progressed', actorUserId, customerId: Number(enrollment.customer_id), payload: { lessonId, progress, status } });
    return rows[0];
  });
};

export const startLearningAttempt = async (tenantId: number, enrollmentIdValue: unknown, assessmentIdValue: unknown) => {
  const enrollmentId = positiveInt(enrollmentIdValue, 'INVALID_LEARNING_ENROLLMENT_ID');
  const assessmentId = positiveInt(assessmentIdValue, 'INVALID_LEARNING_ASSESSMENT_ID');
  return prisma.$transaction(async (tx) => {
    const enrollments = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.learning_enrollments WHERE tenant_id=${tenantId} AND id=${enrollmentId} FOR UPDATE`);
    const enrollment = enrollments[0];
    if (!enrollment || enrollment.status === 'cancelled') throw domainError('Active enrollment required', 'LEARNING_ENROLLMENT_REQUIRED', 409);
    const assessments = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.learning_assessments
      WHERE tenant_id=${tenantId} AND course_id=${Number(enrollment.course_id)} AND id=${assessmentId} AND status='published'
      FOR UPDATE
    `);
    const assessment = assessments[0];
    if (!assessment) throw domainError('Published assessment not found in enrolled course', 'LEARNING_ASSESSMENT_SCOPE_MISMATCH', 409);
    const inProgress = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.learning_attempts
      WHERE tenant_id=${tenantId} AND enrollment_id=${enrollmentId} AND assessment_id=${assessmentId} AND status='in_progress'
      ORDER BY attempt_no DESC LIMIT 1 FOR UPDATE
    `);
    if (inProgress[0]) return inProgress[0];
    const countRows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count FROM public.learning_attempts
      WHERE tenant_id=${tenantId} AND enrollment_id=${enrollmentId} AND assessment_id=${assessmentId}
    `);
    const nextAttempt = Number(countRows[0]?.count || 0) + 1;
    if (nextAttempt > Number(assessment.max_attempts)) throw domainError('Maximum attempts reached', 'LEARNING_MAX_ATTEMPTS_REACHED', 409);
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.learning_attempts
        (tenant_id,course_id,enrollment_id,assessment_id,attempt_no,status)
      VALUES (${tenantId},${Number(enrollment.course_id)},${enrollmentId},${assessmentId},${nextAttempt},'in_progress')
      RETURNING *
    `);
    await appendLearningEvent(tx, { tenantId, courseId: Number(enrollment.course_id), enrollmentId, eventType: 'assessment_attempt_started', customerId: Number(enrollment.customer_id), payload: { assessmentId, attemptId: Number(rows[0].id), attemptNo: nextAttempt } });
    return rows[0];
  });
};

const maybeCompleteEnrollment = async (tx: Prisma.TransactionClient, tenantId: number, enrollment: any) => {
  const lessonRows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.learning_progress p
        WHERE p.tenant_id=l.tenant_id AND p.enrollment_id=${Number(enrollment.id)} AND p.lesson_id=l.id AND p.status='completed'
      ))::int AS completed
    FROM public.learning_lessons l
    WHERE l.tenant_id=${tenantId} AND l.course_id=${Number(enrollment.course_id)} AND l.status='published'
  `);
  const assessmentRows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.learning_attempts a
        WHERE a.tenant_id=la.tenant_id AND a.enrollment_id=${Number(enrollment.id)} AND a.assessment_id=la.id AND a.status='passed'
      ))::int AS passed
    FROM public.learning_assessments la
    WHERE la.tenant_id=${tenantId} AND la.course_id=${Number(enrollment.course_id)} AND la.status='published'
  `);
  const lessonsDone = Number(lessonRows[0]?.total || 0) > 0 && Number(lessonRows[0]?.total || 0) === Number(lessonRows[0]?.completed || 0);
  const assessmentsDone = Number(assessmentRows[0]?.total || 0) === Number(assessmentRows[0]?.passed || 0);
  if (!lessonsDone || !assessmentsDone) return null;

  await tx.$executeRaw(Prisma.sql`
    UPDATE public.learning_enrollments SET status='completed',completed_at=COALESCE(completed_at,NOW())
    WHERE tenant_id=${tenantId} AND id=${Number(enrollment.id)} AND status <> 'cancelled'
  `);
  const certificateNumber = `LC-${tenantId}-${Number(enrollment.id)}`;
  const evidence = crypto.createHash('sha256').update(`${tenantId}:${Number(enrollment.id)}:${Number(enrollment.course_id)}:${Number(enrollment.customer_id)}:${certificateNumber}`).digest('hex');
  const certificates = await tx.$queryRaw<any[]>(Prisma.sql`
    INSERT INTO public.learning_certificates (tenant_id,enrollment_id,certificate_number,evidence_sha256)
    VALUES (${tenantId},${Number(enrollment.id)},${certificateNumber},${evidence})
    ON CONFLICT (tenant_id,enrollment_id) DO NOTHING
    RETURNING *
  `);
  await appendLearningEvent(tx, { tenantId, courseId: Number(enrollment.course_id), enrollmentId: Number(enrollment.id), eventType: 'course_completed', customerId: Number(enrollment.customer_id), payload: { certificateNumber, evidence } });
  return certificates[0] ?? null;
};

export const submitLearningAttempt = async (
  tenantId: number,
  attemptIdValue: unknown,
  answersInput: Array<{ questionId: number; answer: unknown }>,
) => {
  const attemptId = positiveInt(attemptIdValue, 'INVALID_LEARNING_ATTEMPT_ID');
  if (!Array.isArray(answersInput)) throw domainError('Answers must be an array', 'INVALID_LEARNING_ANSWERS');
  return prisma.$transaction(async (tx) => {
    const attempts = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.learning_attempts WHERE tenant_id=${tenantId} AND id=${attemptId} FOR UPDATE`);
    const attempt = attempts[0];
    if (!attempt) throw domainError('Attempt not found', 'LEARNING_ATTEMPT_NOT_FOUND', 404);
    if (attempt.status !== 'in_progress') return attempt;
    const enrollmentRows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.learning_enrollments WHERE tenant_id=${tenantId} AND id=${Number(attempt.enrollment_id)} FOR UPDATE`);
    const enrollment = enrollmentRows[0];
    if (!enrollment || enrollment.status === 'cancelled') throw domainError('Active enrollment required', 'LEARNING_ENROLLMENT_REQUIRED', 409);
    const assessmentRows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM public.learning_assessments WHERE tenant_id=${tenantId} AND id=${Number(attempt.assessment_id)} LIMIT 1`);
    const assessment = assessmentRows[0];
    if (!assessment) throw domainError('Assessment not found', 'LEARNING_ASSESSMENT_NOT_FOUND', 404);
    const questions = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.learning_assessment_questions
      WHERE tenant_id=${tenantId} AND assessment_id=${Number(attempt.assessment_id)} ORDER BY position,id
    `);
    if (!questions.length) throw domainError('Assessment has no questions', 'LEARNING_ASSESSMENT_EMPTY', 409);
    const supplied = new Map<number, unknown>();
    for (const answer of answersInput) supplied.set(positiveInt(answer.questionId, 'INVALID_LEARNING_QUESTION_ID'), answer.answer);
    if (supplied.size !== questions.length || questions.some((question) => !supplied.has(Number(question.id)))) {
      throw domainError('Every assessment question must be answered exactly once', 'LEARNING_ANSWER_SET_MISMATCH');
    }
    let score = 0;
    let maxScore = 0;
    for (const question of questions) {
      const points = Number(question.points);
      maxScore += points;
      const answer = supplied.get(Number(question.id));
      const awarded = answersEqual(answer, question.correct_answer) ? points : 0;
      score += awarded;
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.learning_attempt_answers
          (tenant_id,assessment_id,attempt_id,question_id,answer,points_awarded)
        VALUES (${tenantId},${Number(attempt.assessment_id)},${attemptId},${Number(question.id)},CAST(${JSON.stringify(answer)} AS jsonb),${awarded})
      `);
    }
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const status = percentage >= Number(assessment.passing_score) ? 'passed' : 'failed';
    const updated = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.learning_attempts
      SET status=${status},score=${score},max_score=${maxScore},submitted_at=NOW()
      WHERE tenant_id=${tenantId} AND id=${attemptId} RETURNING *
    `);
    await appendLearningEvent(tx, { tenantId, courseId: Number(enrollment.course_id), enrollmentId: Number(enrollment.id), eventType: 'assessment_attempt_submitted', customerId: Number(enrollment.customer_id), payload: { assessmentId: Number(attempt.assessment_id), attemptId, score, maxScore, percentage, status } });
    const certificate = status === 'passed' ? await maybeCompleteEnrollment(tx, tenantId, enrollment) : null;
    return { ...updated[0], percentage, certificate };
  });
};
