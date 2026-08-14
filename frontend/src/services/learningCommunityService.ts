import api from './api';

export type DeclarativeBlock = {
  type: 'heading' | 'paragraph' | 'callout' | 'checklist' | 'code' | 'link';
  text?: string;
  level?: number;
  items?: Array<{ text: string; checked?: boolean }>;
  href?: string;
  language?: string;
};

export interface LearningCourse {
  id: number;
  site_id?: number | null;
  slug: string;
  title: string;
  description?: string | null;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  lesson_count?: number;
  enrollment_count?: number;
  published_at?: string | null;
}

export interface LearningLesson {
  id: number;
  course_id?: number;
  position: number;
  slug: string;
  title: string;
  content: DeclarativeBlock[];
  duration_minutes: number;
  status: 'draft' | 'published' | 'archived';
}

export interface LearningAssessment {
  id: number;
  lesson_id?: number | null;
  title: string;
  status?: 'draft' | 'published' | 'archived';
  passing_score: number;
  max_attempts: number;
  question_count?: number;
  questions?: Array<{ id: number; position: number; question_type: string; prompt: string; options: unknown[]; points: number }>;
  passed?: boolean;
  attempt_count?: number;
}

export interface LearningEnrollment {
  id: number;
  course_id: number;
  customer_id: number;
  status: 'active' | 'completed' | 'cancelled';
  customer_name?: string;
  customer_email?: string;
  completed_lessons?: number;
}

export interface CommunityForum {
  id: number;
  site_id?: number | null;
  slug: string;
  name: string;
  description?: string | null;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private';
  topic_count?: number;
}

export interface CommunityTopic {
  id: number;
  forum_id?: number;
  forum_name?: string;
  forum_slug?: string;
  slug: string;
  title: string;
  content: DeclarativeBlock[];
  status: 'open' | 'locked' | 'hidden' | 'archived';
  author_name: string;
  pinned: boolean;
  reply_count?: number;
  score?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CommunityReply {
  id: number;
  topic_id?: number;
  parent_reply_id?: number | null;
  content: DeclarativeBlock[];
  status?: 'visible' | 'hidden' | 'deleted';
  author_name: string;
  score?: number;
  created_at?: string;
}

export interface PublicLearnerWorkspace {
  enrollment: {
    id: number;
    status: string;
    customer_name: string;
    course: { id: number; slug: string; title: string; description?: string | null };
  };
  lessons: LearningLesson[];
  assessments: LearningAssessment[];
  progress: Array<{ lesson_id: number; status: string; progress_percent: number; completed_at?: string | null }>;
  certificate?: { certificate_number: string; evidence_sha256: string; issued_at: string } | null;
}

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;
const learningHeaders = (token: string) => ({ 'X-Learning-Token': token });
const communityHeaders = (token: string) => ({ 'X-Community-Token': token });

export const getLearningCourses = async () => unwrap<LearningCourse[]>(await api.get('/learning/courses'));
export const createLearningCourse = async (payload: { siteId?: number | null; slug: string; title: string; description?: string; visibility?: string; difficulty?: string }) => unwrap<LearningCourse>(await api.post('/learning/courses', payload));
export const setLearningCourseStatus = async (id: number, status: string) => unwrap<LearningCourse>(await api.patch(`/learning/courses/${id}/status`, { status }));
export const getLearningLessons = async (courseId: number) => unwrap<LearningLesson[]>(await api.get(`/learning/courses/${courseId}/lessons`));
export const createLearningLesson = async (courseId: number, payload: { position: number; slug: string; title: string; content: DeclarativeBlock[]; durationMinutes?: number }) => unwrap<LearningLesson>(await api.post(`/learning/courses/${courseId}/lessons`, payload));
export const setLearningLessonStatus = async (id: number, status: string) => unwrap<LearningLesson>(await api.patch(`/learning/lessons/${id}/status`, { status }));
export const getLearningAssessments = async (courseId: number) => unwrap<LearningAssessment[]>(await api.get(`/learning/courses/${courseId}/assessments`));
export const createLearningAssessment = async (courseId: number, payload: { lessonId?: number | null; title: string; passingScore?: number; maxAttempts?: number; questions: Array<{ type: string; prompt: string; options?: unknown[]; correctAnswer: unknown; points?: number }> }) => unwrap<LearningAssessment>(await api.post(`/learning/courses/${courseId}/assessments`, payload));
export const setLearningAssessmentStatus = async (id: number, status: string) => unwrap<LearningAssessment>(await api.patch(`/learning/assessments/${id}/status`, { status }));
export const getLearningEnrollments = async (courseId: number) => unwrap<LearningEnrollment[]>(await api.get(`/learning/courses/${courseId}/enrollments`));
export const enrollLearningCustomer = async (courseId: number, customerId: number) => unwrap<LearningEnrollment>(await api.post(`/learning/courses/${courseId}/enrollments`, { customerId }));
export const issueLearningAccessToken = async (enrollmentId: number) => unwrap<{ id: number; token: string; token_rotated_at: string }>(await api.post(`/learning/enrollments/${enrollmentId}/access-token`));

export const getCommunityForums = async () => unwrap<CommunityForum[]>(await api.get('/learning/forums'));
export const createCommunityForum = async (payload: { siteId?: number | null; slug: string; name: string; description?: string; visibility?: string }) => unwrap<CommunityForum>(await api.post('/learning/forums', payload));
export const setCommunityForumStatus = async (id: number, status: string) => unwrap<CommunityForum>(await api.patch(`/learning/forums/${id}/status`, { status }));
export const getCommunityTopics = async (forumId: number) => unwrap<CommunityTopic[]>(await api.get(`/learning/forums/${forumId}/topics`));
export const createCommunityTopic = async (forumId: number, payload: { title: string; slug: string; content: DeclarativeBlock[]; authorName?: string; authorEmail?: string }) => unwrap<CommunityTopic>(await api.post(`/learning/forums/${forumId}/topics`, payload));
export const getCommunityReplies = async (topicId: number) => unwrap<CommunityReply[]>(await api.get(`/learning/topics/${topicId}/replies`));
export const createCommunityReply = async (topicId: number, payload: { content: DeclarativeBlock[]; parentReplyId?: number | null; authorName?: string; authorEmail?: string }) => unwrap<CommunityReply>(await api.post(`/learning/topics/${topicId}/replies`, payload));
export const moderateCommunityTopic = async (id: number, payload: { status?: string; pinned?: boolean }) => unwrap<CommunityTopic>(await api.patch(`/learning/topics/${id}/moderation`, payload));
export const moderateCommunityReply = async (id: number, status: string) => unwrap<CommunityReply>(await api.patch(`/learning/replies/${id}/moderation`, { status }));

export const getPublicLearningCourses = async (publicSlug: string) => unwrap<{ site: { name: string; public_slug: string }; courses: LearningCourse[] }>(await api.get(`/learning/public/${encodeURIComponent(publicSlug)}/courses`));
export const getPublicLearningCourse = async (publicSlug: string, courseSlug: string) => unwrap<{ course: LearningCourse; lessons: LearningLesson[] }>(await api.get(`/learning/public/${encodeURIComponent(publicSlug)}/courses/${encodeURIComponent(courseSlug)}`));
export const getPublicLearnerWorkspace = async (token: string) => unwrap<PublicLearnerWorkspace>(await api.get('/learning/public/learner/workspace', { headers: learningHeaders(token) }));
export const updatePublicLearnerProgress = async (token: string, lessonId: number, progress: number) => unwrap(await api.patch(`/learning/public/learner/progress/${lessonId}`, { progress }, { headers: learningHeaders(token) }));
export const startPublicLearnerAttempt = async (token: string, assessmentId: number) => unwrap<{ id: number; attempt_no: number }>(await api.post(`/learning/public/learner/assessments/${assessmentId}/start`, undefined, { headers: learningHeaders(token) }));
export const submitPublicLearnerAttempt = async (token: string, attemptId: number, answers: Array<{ questionId: number; answer: unknown }>) => unwrap<any>(await api.post(`/learning/public/learner/attempts/${attemptId}/submit`, { answers }, { headers: learningHeaders(token) }));

export const getPublicCommunityForums = async (publicSlug: string) => unwrap<{ site: { name: string; public_slug: string }; forums: CommunityForum[] }>(await api.get(`/learning/public/${encodeURIComponent(publicSlug)}/forums`));
export const getPublicCommunityTopics = async (publicSlug: string, forumSlug: string) => unwrap<{ forum: CommunityForum; topics: CommunityTopic[] }>(await api.get(`/learning/public/${encodeURIComponent(publicSlug)}/forums/${encodeURIComponent(forumSlug)}/topics`));
export const getPublicCommunityTopic = async (publicSlug: string, forumSlug: string, topicSlug: string) => unwrap<{ topic: CommunityTopic; replies: CommunityReply[] }>(await api.get(`/learning/public/${encodeURIComponent(publicSlug)}/forums/${encodeURIComponent(forumSlug)}/topics/${encodeURIComponent(topicSlug)}`));
export const createPublicCommunityTopic = async (publicSlug: string, forumSlug: string, token: string, payload: { authorName: string; authorEmail?: string; title: string; content: DeclarativeBlock[] }) => unwrap<CommunityTopic>(await api.post(`/learning/public/${encodeURIComponent(publicSlug)}/forums/${encodeURIComponent(forumSlug)}/topics`, payload, { headers: communityHeaders(token) }));
export const createPublicCommunityReply = async (publicSlug: string, forumSlug: string, topicSlug: string, token: string, payload: { authorName: string; authorEmail?: string; parentReplyId?: number | null; content: DeclarativeBlock[] }) => unwrap<CommunityReply>(await api.post(`/learning/public/${encodeURIComponent(publicSlug)}/forums/${encodeURIComponent(forumSlug)}/topics/${encodeURIComponent(topicSlug)}/replies`, payload, { headers: communityHeaders(token) }));
