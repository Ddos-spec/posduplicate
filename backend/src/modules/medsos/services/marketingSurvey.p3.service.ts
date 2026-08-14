import { Prisma } from '@prisma/client';
import prisma from '../../../utils/prisma';

type SurveyQuestionType = 'short_text' | 'long_text' | 'single_choice' | 'multiple_choice' | 'rating' | 'nps';
type QuestionInput = { type: SurveyQuestionType; prompt: string; required?: boolean; options?: string[] };
type AnswerInput = { questionId: number; answer: unknown };

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

const normalizeOptions = (type: SurveyQuestionType, optionsValue: unknown) => {
  if (!['single_choice', 'multiple_choice'].includes(type)) return [];
  if (!Array.isArray(optionsValue) || optionsValue.length < 2 || optionsValue.length > 50) {
    throw domainError('Choice question requires 2-50 options', 'INVALID_SURVEY_OPTIONS');
  }
  const options = optionsValue.map((option) => String(option ?? '').trim());
  if (options.some((option) => !option || option.length > 180) || new Set(options).size !== options.length) {
    throw domainError('Survey options must be unique non-empty values', 'INVALID_SURVEY_OPTIONS');
  }
  return options;
};

const appendEvent = async (
  tx: Prisma.TransactionClient,
  input: { tenantId: number; entityType: 'survey' | 'response'; entityId: number; eventType: string; actorUserId?: number | null; customerId?: number | null; payload?: Record<string, unknown> },
) => {
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO public.marketing_engagement_events
      (tenant_id,entity_type,entity_id,event_type,actor_user_id,customer_id,payload)
    VALUES (
      ${input.tenantId},${input.entityType},${input.entityId},${input.eventType},${input.actorUserId ?? null},
      ${input.customerId ?? null},CAST(${JSON.stringify(input.payload ?? {})} AS jsonb)
    )
  `);
};

export const listMarketingSurveys = async (tenantId: number) => prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT s.*,
    COALESCE((SELECT COUNT(*) FROM public.marketing_survey_responses r
      WHERE r.tenant_id=s.tenant_id AND r.survey_id=s.id AND r.status='submitted'),0)::int AS response_count,
    COALESCE((SELECT COUNT(*) FROM public.marketing_survey_questions q
      WHERE q.tenant_id=s.tenant_id AND q.survey_id=s.id),0)::int AS question_count
  FROM public.marketing_surveys s
  WHERE s.tenant_id=${tenantId}
  ORDER BY s.id DESC
`);

export const getMarketingSurvey = async (tenantId: number, surveyIdValue: unknown) => {
  const surveyId = positiveInt(surveyIdValue, 'INVALID_MARKETING_SURVEY_ID');
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT s.*,
      COALESCE(json_agg(json_build_object(
        'id',q.id,'position',q.position,'question_type',q.question_type,'prompt',q.prompt,
        'required',q.required,'options',q.options
      ) ORDER BY q.position,q.id) FILTER (WHERE q.id IS NOT NULL),'[]'::json) AS questions
    FROM public.marketing_surveys s
    LEFT JOIN public.marketing_survey_questions q ON q.survey_id=s.id AND q.tenant_id=s.tenant_id
    WHERE s.id=${surveyId} AND s.tenant_id=${tenantId}
    GROUP BY s.id
    LIMIT 1
  `);
  if (!rows[0]) throw domainError('Marketing survey not found', 'MARKETING_SURVEY_NOT_FOUND', 404);
  return rows[0];
};

export const createMarketingSurvey = async (
  tenantId: number,
  userId: number,
  input: { slug: string; title: string; description?: string | null; questions: QuestionInput[] },
) => {
  const slug = String(input.slug || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(slug)) throw domainError('Invalid survey slug', 'INVALID_MARKETING_SURVEY_SLUG');
  const title = cleanText(input.title, 220, 'INVALID_MARKETING_SURVEY_TITLE') as string;
  if (!Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > 100) {
    throw domainError('Survey requires 1-100 questions', 'INVALID_MARKETING_SURVEY_QUESTIONS');
  }

  return prisma.$transaction(async (tx) => {
    const surveyRows = await tx.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO public.marketing_surveys
        (tenant_id,slug,title,description,status,created_by,updated_by)
      VALUES (
        ${tenantId},${slug},${title},${cleanText(input.description, 5000, 'INVALID_MARKETING_SURVEY_DESCRIPTION', false)},
        'draft',${userId},${userId}
      ) RETURNING *
    `);
    const survey = surveyRows[0];
    for (let index = 0; index < input.questions.length; index += 1) {
      const question = input.questions[index];
      const type = String(question.type || '').trim() as SurveyQuestionType;
      if (!['short_text','long_text','single_choice','multiple_choice','rating','nps'].includes(type)) {
        throw domainError('Invalid survey question type', 'INVALID_SURVEY_QUESTION_TYPE');
      }
      const prompt = cleanText(question.prompt, 2000, 'INVALID_SURVEY_QUESTION_PROMPT') as string;
      const options = normalizeOptions(type, question.options);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO public.marketing_survey_questions
          (tenant_id,survey_id,position,question_type,prompt,required,options)
        VALUES (${tenantId},${Number(survey.id)},${index},${type},${prompt},${Boolean(question.required)},CAST(${JSON.stringify(options)} AS jsonb))
      `);
    }
    await appendEvent(tx, { tenantId, entityType: 'survey', entityId: Number(survey.id), eventType: 'created', actorUserId: userId });
    return survey;
  });
};

export const transitionMarketingSurvey = async (tenantId: number, userId: number, surveyIdValue: unknown, targetValue: unknown) => {
  const surveyId = positiveInt(surveyIdValue, 'INVALID_MARKETING_SURVEY_ID');
  const target = String(targetValue || '').trim().toLowerCase();
  const transitions: Record<string, string[]> = {
    draft: ['published', 'archived'],
    published: ['closed', 'archived'],
    closed: ['archived'],
    archived: [],
  };
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.marketing_surveys WHERE id=${surveyId} AND tenant_id=${tenantId} FOR UPDATE
    `);
    const survey = rows[0];
    if (!survey) throw domainError('Marketing survey not found', 'MARKETING_SURVEY_NOT_FOUND', 404);
    if (!(transitions[String(survey.status)] || []).includes(target)) throw domainError('Invalid survey transition', 'INVALID_MARKETING_SURVEY_TRANSITION', 409);
    const changed = await tx.$queryRaw<any[]>(Prisma.sql`
      UPDATE public.marketing_surveys SET status=${target},updated_by=${userId},updated_at=NOW()
      WHERE id=${surveyId} AND tenant_id=${tenantId} AND status=${String(survey.status)} RETURNING *
    `);
    if (!changed[0]) throw domainError('Concurrent survey update', 'MARKETING_SURVEY_CONCURRENT_UPDATE', 409);
    await appendEvent(tx, { tenantId, entityType: 'survey', entityId: surveyId, eventType: `status_${target}`, actorUserId: userId });
    return changed[0];
  });
};

const validateAnswer = (question: any, answer: unknown) => {
  const type = String(question.question_type) as SurveyQuestionType;
  if (type === 'short_text' || type === 'long_text') {
    const max = type === 'short_text' ? 1000 : 10000;
    const text = String(answer ?? '').trim();
    if (!text || text.length > max) throw domainError('Invalid text answer', 'INVALID_SURVEY_ANSWER');
    return text;
  }
  if (type === 'single_choice') {
    const value = String(answer ?? '').trim();
    const options = Array.isArray(question.options) ? question.options.map(String) : [];
    if (!options.includes(value)) throw domainError('Invalid survey choice', 'INVALID_SURVEY_ANSWER');
    return value;
  }
  if (type === 'multiple_choice') {
    if (!Array.isArray(answer) || answer.length < 1) throw domainError('Invalid multiple-choice answer', 'INVALID_SURVEY_ANSWER');
    const options = Array.isArray(question.options) ? question.options.map(String) : [];
    const values = answer.map((value) => String(value ?? '').trim());
    if (new Set(values).size !== values.length || values.some((value) => !options.includes(value))) {
      throw domainError('Invalid multiple-choice answer', 'INVALID_SURVEY_ANSWER');
    }
    return values;
  }
  const numeric = Number(answer);
  if (!Number.isInteger(numeric)) throw domainError('Invalid numeric survey answer', 'INVALID_SURVEY_ANSWER');
  if (type === 'rating' && (numeric < 1 || numeric > 5)) throw domainError('Rating must be 1-5', 'INVALID_SURVEY_ANSWER');
  if (type === 'nps' && (numeric < 0 || numeric > 10)) throw domainError('NPS must be 0-10', 'INVALID_SURVEY_ANSWER');
  return numeric;
};

export const submitMarketingSurvey = async (
  tenantId: number,
  actorUserId: number | null,
  surveyIdValue: unknown,
  input: { customerId?: number | null; respondentName?: string | null; respondentEmail?: string | null; answers: AnswerInput[] },
  submissionKeyHash: string | null = null,
) => prisma.$transaction(async (tx) => {
  const surveyId = positiveInt(surveyIdValue, 'INVALID_MARKETING_SURVEY_ID');
  const surveyRows = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT * FROM public.marketing_surveys WHERE id=${surveyId} AND tenant_id=${tenantId} FOR UPDATE
  `);
  const survey = surveyRows[0];
  if (!survey) throw domainError('Marketing survey not found', 'MARKETING_SURVEY_NOT_FOUND', 404);

  if (submissionKeyHash) {
    const existingRows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM public.marketing_survey_responses
      WHERE tenant_id=${tenantId} AND survey_id=${surveyId} AND submission_key_hash=${submissionKeyHash}
      LIMIT 1
    `);
    if (existingRows[0]) return existingRows[0];
  }

  if (survey.status !== 'published') throw domainError('Survey is not accepting responses', 'MARKETING_SURVEY_NOT_PUBLISHED', 409);

  const questions = await tx.$queryRaw<any[]>(Prisma.sql`
    SELECT id,question_type,prompt,required,options
    FROM public.marketing_survey_questions
    WHERE tenant_id=${tenantId} AND survey_id=${surveyId}
    ORDER BY position,id
  `);
  if (!questions.length) throw domainError('Survey has no questions', 'MARKETING_SURVEY_EMPTY', 409);
  if (!Array.isArray(input.answers) || input.answers.length > questions.length) throw domainError('Invalid survey answers', 'INVALID_SURVEY_ANSWERS');

  const answerMap = new Map<number, unknown>();
  for (const answer of input.answers) {
    const questionId = positiveInt(answer.questionId, 'INVALID_SURVEY_QUESTION_ID');
    if (answerMap.has(questionId)) throw domainError('Duplicate survey answer', 'DUPLICATE_SURVEY_ANSWER');
    answerMap.set(questionId, answer.answer);
  }
  const questionIds = new Set(questions.map((question) => Number(question.id)));
  for (const questionId of answerMap.keys()) {
    if (!questionIds.has(questionId)) throw domainError('Question does not belong to survey', 'SURVEY_QUESTION_SCOPE_MISMATCH', 409);
  }
  for (const question of questions) {
    if (question.required && !answerMap.has(Number(question.id))) throw domainError('Required survey answer missing', 'SURVEY_REQUIRED_ANSWER_MISSING');
  }

  const normalizedAnswers = questions
    .filter((question) => answerMap.has(Number(question.id)))
    .map((question) => ({ questionId: Number(question.id), value: validateAnswer(question, answerMap.get(Number(question.id))) }));

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

  const responseRows = await tx.$queryRaw<any[]>(Prisma.sql`
    INSERT INTO public.marketing_survey_responses
      (tenant_id,survey_id,customer_id,respondent_name,respondent_email,status,submitted_at,submission_key_hash)
    VALUES (
      ${tenantId},${surveyId},${customerId},
      ${cleanText(input.respondentName, 180, 'INVALID_SURVEY_RESPONDENT_NAME', false)},
      ${cleanText(input.respondentEmail, 240, 'INVALID_SURVEY_RESPONDENT_EMAIL', false)},'submitted',NOW(),${submissionKeyHash}
    ) RETURNING *
  `);
  const response = responseRows[0];
  for (const answer of normalizedAnswers) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO public.marketing_survey_answers (tenant_id,response_id,question_id,answer)
      VALUES (${tenantId},${Number(response.id)},${answer.questionId},CAST(${JSON.stringify(answer.value)} AS jsonb))
    `);
  }
  await appendEvent(tx, {
    tenantId,
    entityType: 'response',
    entityId: Number(response.id),
    eventType: 'submitted',
    actorUserId,
    customerId,
    payload: { surveyId, answerCount: answerMap.size },
  });
  return response;
});

export const listSurveyResponses = async (tenantId: number, surveyIdValue: unknown) => {
  const surveyId = positiveInt(surveyIdValue, 'INVALID_MARKETING_SURVEY_ID');
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT r.*,c.name AS customer_name,
      COALESCE((SELECT json_agg(json_build_object('question_id',a.question_id,'answer',a.answer) ORDER BY a.question_id)
        FROM public.marketing_survey_answers a WHERE a.tenant_id=r.tenant_id AND a.response_id=r.id),'[]'::json) AS answers
    FROM public.marketing_survey_responses r
    LEFT JOIN public.customers c ON c.id=r.customer_id
    WHERE r.tenant_id=${tenantId} AND r.survey_id=${surveyId} AND r.status='submitted'
    ORDER BY r.id DESC
  `);
};
