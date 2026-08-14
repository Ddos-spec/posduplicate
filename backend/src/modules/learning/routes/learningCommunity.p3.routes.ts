import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import {
  getAssessments,
  getCourses,
  getEnrollments,
  getForums,
  getLessons,
  getPublicCourse,
  getPublicCourses,
  getPublicForums,
  getPublicLearnerWorkspace,
  getPublicTopic,
  getPublicTopics,
  getReplies,
  getTopics,
  patchAdminProgress,
  patchAssessmentStatus,
  patchCourseStatus,
  patchForumStatus,
  patchLessonStatus,
  patchPublicLearnerProgress,
  patchReplyModeration,
  patchTopicModeration,
  postAdminAttemptStart,
  postAdminAttemptSubmit,
  postAssessment,
  postCourse,
  postEnrollment,
  postEnrollmentToken,
  postForum,
  postLesson,
  postPublicAttemptStart,
  postPublicAttemptSubmit,
  postPublicReply,
  postPublicTopic,
  postReply,
  postTopic,
  postVote,
} from '../controllers/learningCommunity.p3.controller';

const router = Router();

const learnerWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'PUBLIC_LEARNING_RATE_LIMITED', message: 'Too many learning updates. Please try again later.' } },
});

const communityWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'PUBLIC_COMMUNITY_RATE_LIMITED', message: 'Too many community submissions. Please try again later.' } },
});

// Public read surfaces: only published website/course/forum records are returned by services.
router.get('/public/:publicSlug/courses', getPublicCourses);
router.get('/public/:publicSlug/courses/:courseSlug', getPublicCourse);
router.get('/public/:publicSlug/forums', getPublicForums);
router.get('/public/:publicSlug/forums/:forumSlug/topics', getPublicTopics);
router.get('/public/:publicSlug/forums/:forumSlug/topics/:topicSlug', getPublicTopic);

// Public learner mutations are bearer-scoped by X-Learning-Token on fixed paths.
router.get('/public/learner/workspace', getPublicLearnerWorkspace);
router.patch('/public/learner/progress/:lessonId', learnerWriteLimiter, patchPublicLearnerProgress);
router.post('/public/learner/assessments/:assessmentId/start', learnerWriteLimiter, postPublicAttemptStart);
router.post('/public/learner/attempts/:attemptId/submit', learnerWriteLimiter, postPublicAttemptSubmit);

// Public forum writes are retry-idempotent with X-Community-Token and never accept customerId.
router.post('/public/:publicSlug/forums/:forumSlug/topics', communityWriteLimiter, postPublicTopic);
router.post('/public/:publicSlug/forums/:forumSlug/topics/:topicSlug/replies', communityWriteLimiter, postPublicReply);

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/courses', requireCapability('digital.learning.read'), getCourses);
router.post('/courses', requireCapability('digital.learning.manage'), postCourse);
router.patch('/courses/:id/status', requireCapability('digital.learning.manage'), patchCourseStatus);
router.get('/courses/:courseId/lessons', requireCapability('digital.learning.read'), getLessons);
router.post('/courses/:courseId/lessons', requireCapability('digital.learning.manage'), postLesson);
router.patch('/lessons/:id/status', requireCapability('digital.learning.manage'), patchLessonStatus);
router.get('/courses/:courseId/assessments', requireCapability('digital.learning.read'), getAssessments);
router.post('/courses/:courseId/assessments', requireCapability('digital.learning.manage'), postAssessment);
router.patch('/assessments/:id/status', requireCapability('digital.learning.manage'), patchAssessmentStatus);
router.get('/courses/:courseId/enrollments', requireCapability('digital.learning.read'), getEnrollments);
router.post('/courses/:courseId/enrollments', requireCapability('digital.learning.manage'), postEnrollment);
router.post('/enrollments/:enrollmentId/access-token', requireCapability('digital.learning.manage'), postEnrollmentToken);
router.patch('/enrollments/:enrollmentId/lessons/:lessonId/progress', requireCapability('digital.learning.manage'), patchAdminProgress);
router.post('/enrollments/:enrollmentId/assessments/:assessmentId/start', requireCapability('digital.learning.manage'), postAdminAttemptStart);
router.post('/attempts/:attemptId/submit', requireCapability('digital.learning.manage'), postAdminAttemptSubmit);

router.get('/forums', requireCapability('digital.community.read'), getForums);
router.post('/forums', requireCapability('digital.community.manage'), postForum);
router.patch('/forums/:id/status', requireCapability('digital.community.manage'), patchForumStatus);
router.get('/forums/:forumId/topics', requireCapability('digital.community.read'), getTopics);
router.post('/forums/:forumId/topics', requireCapability('digital.community.manage'), postTopic);
router.get('/topics/:topicId/replies', requireCapability('digital.community.read'), getReplies);
router.post('/topics/:topicId/replies', requireCapability('digital.community.manage'), postReply);
router.patch('/topics/:id/moderation', requireCapability('digital.community.manage'), patchTopicModeration);
router.patch('/replies/:id/moderation', requireCapability('digital.community.manage'), patchReplyModeration);
router.post('/votes', requireCapability('digital.community.manage'), postVote);

export default router;
