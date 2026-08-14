import { NextFunction, Request, Response } from 'express';
import {
  createLearningAssessment,
  createLearningCourse,
  createLearningLesson,
  enrollLearningCustomer,
  listLearningAssessments,
  listLearningCourses,
  listLearningEnrollments,
  listLearningLessons,
  setLearningAssessmentStatus,
  setLearningLessonProgress,
  setLearningLessonStatus,
  startLearningAttempt,
  submitLearningAttempt,
  transitionLearningCourse,
} from '../services/learning.p3.service';
import {
  getPublicLearningWorkspace,
  issueLearningAccessToken,
  startPublicLearningAttempt,
  submitPublicLearningAttempt,
  updatePublicLearningProgress,
} from '../services/learningPublic.p3.service';
import { getPublicLearningCourse, listPublicLearningCourses } from '../services/learningDiscovery.p3.service';
import {
  createCommunityForum,
  createCommunityReply,
  createCommunityTopic,
  listCommunityForums,
  listCommunityReplies,
  listCommunityTopics,
  moderateCommunityReply,
  moderateCommunityTopic,
  transitionCommunityForum,
  voteCommunity,
} from '../services/community.p3.service';
import {
  createPublicCommunityReply,
  createPublicCommunityTopic,
  getPublicCommunityTopic,
  listPublicCommunityForums,
  listPublicCommunityTopics,
} from '../services/communityPublic.p3.service';

const context = (req: Request) => {
  const tenantId = Number(req.tenantId);
  const userId = Number(req.userId);
  if (!Number.isInteger(tenantId) || tenantId <= 0) throw Object.assign(new Error('Tenant context required'), { status: 401, code: 'TENANT_REQUIRED' });
  if (!Number.isInteger(userId) || userId <= 0) throw Object.assign(new Error('User context required'), { status: 401, code: 'USER_REQUIRED' });
  return { tenantId, userId };
};

const headerToken = (req: Request, name: 'x-learning-token' | 'x-community-token') => {
  const value = String(req.header(name) || '').trim();
  if (!value) throw Object.assign(new Error('Public access token required'), { status: 401, code: 'PUBLIC_TOKEN_REQUIRED' });
  return value;
};

export const getCourses = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listLearningCourses(tenantId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const postCourse = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await createLearningCourse(tenantId, userId, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const patchCourseStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await transitionLearningCourse(tenantId, userId, req.params.id, req.body.status); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const getLessons = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listLearningLessons(tenantId, req.params.courseId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const postLesson = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await createLearningLesson(tenantId, userId, req.params.courseId, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const patchLessonStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await setLearningLessonStatus(tenantId, userId, req.params.id, req.body.status); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const getAssessments = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listLearningAssessments(tenantId, req.params.courseId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const postAssessment = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await createLearningAssessment(tenantId, userId, { ...req.body, courseId: Number(req.params.courseId) }); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const patchAssessmentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await setLearningAssessmentStatus(tenantId, userId, req.params.id, req.body.status); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const getEnrollments = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listLearningEnrollments(tenantId, req.params.courseId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const postEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await enrollLearningCustomer(tenantId, userId, req.params.courseId, req.body.customerId); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const postEnrollmentToken = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await issueLearningAccessToken(tenantId, userId, req.params.enrollmentId); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const patchAdminProgress = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await setLearningLessonProgress(tenantId, userId, req.params.enrollmentId, req.params.lessonId, req.body.progress); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const postAdminAttemptStart = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await startLearningAttempt(tenantId, req.params.enrollmentId, req.params.assessmentId); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const postAdminAttemptSubmit = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await submitLearningAttempt(tenantId, req.params.attemptId, req.body.answers || []); return res.json({ success: true, data }); } catch (error) { return next(error); }
};

export const getPublicCourses = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await listPublicLearningCourses(req.params.publicSlug); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const getPublicCourse = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await getPublicLearningCourse(req.params.publicSlug, req.params.courseSlug); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const getPublicLearnerWorkspace = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await getPublicLearningWorkspace(headerToken(req, 'x-learning-token')); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const patchPublicLearnerProgress = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await updatePublicLearningProgress(headerToken(req, 'x-learning-token'), req.params.lessonId, req.body.progress); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const postPublicAttemptStart = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await startPublicLearningAttempt(headerToken(req, 'x-learning-token'), req.params.assessmentId); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const postPublicAttemptSubmit = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await submitPublicLearningAttempt(headerToken(req, 'x-learning-token'), req.params.attemptId, req.body.answers || []); return res.json({ success: true, data }); } catch (error) { return next(error); }
};

export const getForums = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listCommunityForums(tenantId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const postForum = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await createCommunityForum(tenantId, userId, req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const patchForumStatus = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await transitionCommunityForum(tenantId, userId, req.params.id, req.body.status); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const getTopics = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listCommunityTopics(tenantId, req.params.forumId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const postTopic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = context(req);
    const data = await createCommunityTopic(tenantId, { userId, name: req.body.authorName || `User ${userId}`, email: req.body.authorEmail }, req.params.forumId, req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) { return next(error); }
};
export const getReplies = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await listCommunityReplies(tenantId, req.params.topicId); return res.json({ success: true, data, count: data.length }); } catch (error) { return next(error); }
};
export const postReply = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = context(req);
    const data = await createCommunityReply(tenantId, { userId, name: req.body.authorName || `User ${userId}`, email: req.body.authorEmail }, req.params.topicId, req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) { return next(error); }
};
export const patchTopicModeration = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await moderateCommunityTopic(tenantId, userId, req.params.id, req.body); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const patchReplyModeration = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId, userId } = context(req); const data = await moderateCommunityReply(tenantId, userId, req.params.id, req.body.status); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const postVote = async (req: Request, res: Response, next: NextFunction) => {
  try { const { tenantId } = context(req); const data = await voteCommunity(tenantId, req.body.customerId, req.body); return res.json({ success: true, data }); } catch (error) { return next(error); }
};

export const getPublicForums = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await listPublicCommunityForums(req.params.publicSlug); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const getPublicTopics = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await listPublicCommunityTopics(req.params.publicSlug, req.params.forumSlug); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const getPublicTopic = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await getPublicCommunityTopic(req.params.publicSlug, req.params.forumSlug, req.params.topicSlug); return res.json({ success: true, data }); } catch (error) { return next(error); }
};
export const postPublicTopic = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await createPublicCommunityTopic(req.params.publicSlug, req.params.forumSlug, headerToken(req, 'x-community-token'), req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
export const postPublicReply = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = await createPublicCommunityReply(req.params.publicSlug, req.params.forumSlug, req.params.topicSlug, headerToken(req, 'x-community-token'), req.body); return res.status(201).json({ success: true, data }); } catch (error) { return next(error); }
};
