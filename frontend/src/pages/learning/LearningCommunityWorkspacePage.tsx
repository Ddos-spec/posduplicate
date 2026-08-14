import { type FormEvent, useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Copy, GraduationCap, Loader2, MessageSquareText, Plus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { getWebsiteSites, type WebsiteSite } from '../../services/digitalWebsiteService';
import {
  createCommunityForum,
  createCommunityReply,
  createCommunityTopic,
  createLearningAssessment,
  createLearningCourse,
  createLearningLesson,
  enrollLearningCustomer,
  getCommunityForums,
  getCommunityReplies,
  getCommunityTopics,
  getLearningAssessments,
  getLearningCourses,
  getLearningEnrollments,
  getLearningLessons,
  issueLearningAccessToken,
  moderateCommunityReply,
  moderateCommunityTopic,
  setCommunityForumStatus,
  setLearningAssessmentStatus,
  setLearningCourseStatus,
  setLearningLessonStatus,
  type CommunityForum,
  type CommunityReply,
  type CommunityTopic,
  type LearningAssessment,
  type LearningCourse,
  type LearningEnrollment,
  type LearningLesson,
} from '../../services/learningCommunityService';

type Tab = 'learning' | 'community';
const paragraph = (text: string) => [{ type: 'paragraph' as const, text: text.trim() }];
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);

export default function LearningCommunityWorkspacePage() {
  const [tab, setTab] = useState<Tab>('learning');
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<WebsiteSite[]>([]);
  const [courses, setCourses] = useState<LearningCourse[]>([]);
  const [forums, setForums] = useState<CommunityForum[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<LearningCourse | null>(null);
  const [selectedForum, setSelectedForum] = useState<CommunityForum | null>(null);
  const [lessons, setLessons] = useState<LearningLesson[]>([]);
  const [assessments, setAssessments] = useState<LearningAssessment[]>([]);
  const [enrollments, setEnrollments] = useState<LearningEnrollment[]>([]);
  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<CommunityTopic | null>(null);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [learnerLink, setLearnerLink] = useState('');

  const [courseForm, setCourseForm] = useState({ siteId: '', title: '', slug: '', description: '', visibility: 'private', difficulty: 'beginner' });
  const [lessonForm, setLessonForm] = useState({ title: '', slug: '', body: '', duration: '10' });
  const [assessmentForm, setAssessmentForm] = useState({ title: '', prompt: '', answer: '', passingScore: '70', maxAttempts: '3' });
  const [customerId, setCustomerId] = useState('');
  const [forumForm, setForumForm] = useState({ siteId: '', name: '', slug: '', description: '', visibility: 'private' });
  const [topicForm, setTopicForm] = useState({ title: '', slug: '', body: '' });
  const [replyBody, setReplyBody] = useState('');

  const loadRoot = async () => {
    setLoading(true);
    try {
      const [siteRows, courseRows, forumRows] = await Promise.all([getWebsiteSites(), getLearningCourses(), getCommunityForums()]);
      setSites(siteRows);
      setCourses(courseRows);
      setForums(forumRows);
      if (selectedCourse) setSelectedCourse(courseRows.find((row) => row.id === selectedCourse.id) || null);
      if (selectedForum) setSelectedForum(forumRows.find((row) => row.id === selectedForum.id) || null);
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Gagal memuat Learning & Community'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadRoot(); }, []);

  const loadCourse = async (course: LearningCourse) => {
    setSelectedCourse(course); setLearnerLink('');
    try {
      const [lessonRows, assessmentRows, enrollmentRows] = await Promise.all([
        getLearningLessons(course.id), getLearningAssessments(course.id), getLearningEnrollments(course.id),
      ]);
      setLessons(lessonRows); setAssessments(assessmentRows); setEnrollments(enrollmentRows);
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Gagal memuat course'); }
  };

  const loadForum = async (forum: CommunityForum) => {
    setSelectedForum(forum); setSelectedTopic(null); setReplies([]);
    try { setTopics(await getCommunityTopics(forum.id)); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Gagal memuat forum'); }
  };

  const loadTopic = async (topic: CommunityTopic) => {
    setSelectedTopic(topic);
    try { setReplies(await getCommunityReplies(topic.id)); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Gagal memuat replies'); }
  };

  const refreshForum = async (forum: CommunityForum, topicId?: number) => {
    const [forumRows, topicRows] = await Promise.all([getCommunityForums(), getCommunityTopics(forum.id)]);
    const refreshedForum = forumRows.find((row) => row.id === forum.id) || forum;
    const refreshedTopic = topicId ? topicRows.find((row) => row.id === topicId) || null : null;
    setForums(forumRows);
    setSelectedForum(refreshedForum);
    setTopics(topicRows);
    setSelectedTopic(refreshedTopic);
    setReplies(refreshedTopic ? await getCommunityReplies(refreshedTopic.id) : []);
  };

  const createCourse = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const created = await createLearningCourse({
        siteId: courseForm.siteId ? Number(courseForm.siteId) : null,
        title: courseForm.title, slug: courseForm.slug || slugify(courseForm.title), description: courseForm.description,
        visibility: courseForm.visibility, difficulty: courseForm.difficulty,
      });
      setCourseForm({ siteId: '', title: '', slug: '', description: '', visibility: 'private', difficulty: 'beginner' });
      toast.success('Course dibuat'); await loadRoot(); await loadCourse(created);
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Course gagal dibuat'); }
  };

  const createLesson = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedCourse) return;
    try {
      await createLearningLesson(selectedCourse.id, {
        position: lessons.length,
        title: lessonForm.title,
        slug: lessonForm.slug || slugify(lessonForm.title),
        content: paragraph(lessonForm.body), durationMinutes: Number(lessonForm.duration || 0),
      });
      setLessonForm({ title: '', slug: '', body: '', duration: '10' });
      toast.success('Lesson dibuat'); await loadCourse(selectedCourse);
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Lesson gagal dibuat'); }
  };

  const createAssessment = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedCourse) return;
    try {
      await createLearningAssessment(selectedCourse.id, {
        title: assessmentForm.title, passingScore: Number(assessmentForm.passingScore), maxAttempts: Number(assessmentForm.maxAttempts),
        questions: [{ type: 'short_text', prompt: assessmentForm.prompt, correctAnswer: assessmentForm.answer, points: 1 }],
      });
      setAssessmentForm({ title: '', prompt: '', answer: '', passingScore: '70', maxAttempts: '3' });
      toast.success('Assessment dibuat'); await loadCourse(selectedCourse);
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Assessment gagal dibuat'); }
  };

  const enroll = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedCourse || !customerId) return;
    try {
      const enrollment = await enrollLearningCustomer(selectedCourse.id, Number(customerId));
      const access = await issueLearningAccessToken(enrollment.id);
      const link = `${window.location.origin}/learn/entry#token=${encodeURIComponent(access.token)}`;
      setLearnerLink(link); setCustomerId('');
      toast.success('Customer enrolled & learner link generated'); await loadCourse(selectedCourse);
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Enrollment gagal'); }
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(learnerLink); toast.success('Learner link copied'); }
    catch { toast.error('Clipboard tidak tersedia'); }
  };

  const createForum = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const created = await createCommunityForum({
        siteId: forumForm.siteId ? Number(forumForm.siteId) : null,
        name: forumForm.name, slug: forumForm.slug || slugify(forumForm.name), description: forumForm.description, visibility: forumForm.visibility,
      });
      setForumForm({ siteId: '', name: '', slug: '', description: '', visibility: 'private' });
      toast.success('Forum dibuat'); await loadRoot(); await loadForum(created);
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Forum gagal dibuat'); }
  };

  const createTopic = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedForum) return;
    try {
      await createCommunityTopic(selectedForum.id, { title: topicForm.title, slug: topicForm.slug || slugify(topicForm.title), content: paragraph(topicForm.body) });
      setTopicForm({ title: '', slug: '', body: '' }); toast.success('Topic dibuat'); await refreshForum(selectedForum);
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Topic gagal dibuat'); }
  };

  const createReply = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedForum || !selectedTopic || !replyBody.trim()) return;
    try { await createCommunityReply(selectedTopic.id, { content: paragraph(replyBody) }); setReplyBody(''); toast.success('Reply dibuat'); await refreshForum(selectedForum, selectedTopic.id); }
    catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Reply gagal dibuat'); }
  };

  const moderateTopic = async (topic: CommunityTopic, patch: { status?: string; pinned?: boolean }) => {
    if (!selectedForum) return;
    try {
      await moderateCommunityTopic(topic.id, patch);
      await refreshForum(selectedForum, selectedTopic?.id);
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Moderasi topic gagal'); }
  };

  const moderateReply = async (replyId: number, status: 'visible' | 'hidden') => {
    if (!selectedForum || !selectedTopic) return;
    try {
      await moderateCommunityReply(replyId, status);
      await refreshForum(selectedForum, selectedTopic.id);
    } catch (error: any) { toast.error(error?.response?.data?.error?.message || 'Moderasi reply gagal'); }
  };

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin" /></div>;

  return <main className="min-h-screen bg-slate-50 p-4 md:p-7 text-slate-900">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">P3.7 Learning & Community</p>
        <h1 className="mt-2 text-3xl font-black">eLearning + Forum Operations</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">Published website sites are reused for public discovery. Learners reuse Customer records. Lesson and forum content is declarative-safe.</p>
        <div className="mt-5 flex gap-2">{(['learning','community'] as Tab[]).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === item ? 'bg-slate-900 text-white' : 'border bg-white'}`}>{item === 'learning' ? 'eLearning' : 'Forum'}</button>)}</div>
      </header>

      {tab === 'learning' ? <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <form onSubmit={createCourse} className="space-y-3 rounded-2xl border bg-white p-4">
            <div className="flex items-center gap-2 font-bold"><GraduationCap size={18}/>New course</div>
            <select value={courseForm.siteId} onChange={(e) => setCourseForm({ ...courseForm, siteId: e.target.value })} className="w-full rounded-xl border px-3 py-2"><option value="">No public site</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} · {site.status}</option>)}</select>
            <input required value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="Course title" className="w-full rounded-xl border px-3 py-2" />
            <input value={courseForm.slug} onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value })} placeholder="slug (auto if blank)" className="w-full rounded-xl border px-3 py-2" />
            <textarea value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} placeholder="Description" className="w-full rounded-xl border px-3 py-2" />
            <div className="grid grid-cols-2 gap-2"><select value={courseForm.visibility} onChange={(e) => setCourseForm({ ...courseForm, visibility: e.target.value })} className="rounded-xl border px-3 py-2"><option value="private">Private</option><option value="public">Public</option></select><select value={courseForm.difficulty} onChange={(e) => setCourseForm({ ...courseForm, difficulty: e.target.value })} className="rounded-xl border px-3 py-2"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
            <button className="w-full rounded-xl bg-slate-900 px-3 py-2 font-bold text-white"><Plus size={15} className="inline mr-1"/>Create</button>
          </form>
          <div className="rounded-2xl border bg-white p-3"><div className="mb-2 text-sm font-bold">Courses</div><div className="space-y-2">{courses.map((course) => <button key={course.id} onClick={() => void loadCourse(course)} className={`w-full rounded-xl border p-3 text-left ${selectedCourse?.id === course.id ? 'border-blue-500 bg-blue-50' : ''}`}><div className="font-semibold">{course.title}</div><div className="text-xs text-slate-500">{course.status} · {course.lesson_count || 0} lessons · {course.enrollment_count || 0} learners</div></button>)}</div></div>
        </div>

        <div>{selectedCourse ? <div className="space-y-4">
          <section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">{selectedCourse.title}</h2><p className="text-sm text-slate-500">{selectedCourse.slug} · {selectedCourse.visibility} · {selectedCourse.status}</p></div>{selectedCourse.status !== 'archived' && <button onClick={async () => { try { const updated = await setLearningCourseStatus(selectedCourse.id, selectedCourse.status === 'published' ? 'draft' : 'published'); await loadRoot(); await loadCourse(updated); } catch (e:any) { toast.error(e?.response?.data?.error?.message || 'Status gagal'); } }} className="rounded-xl border px-3 py-2 text-sm font-bold">{selectedCourse.status === 'published' ? 'Unpublish' : 'Publish course'}</button>}</div></section>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border bg-white p-4"><h3 className="font-bold">Lessons</h3><form onSubmit={createLesson} className="mt-3 space-y-2"><input required value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="Lesson title" className="w-full rounded-xl border px-3 py-2"/><textarea required value={lessonForm.body} onChange={(e) => setLessonForm({ ...lessonForm, body: e.target.value })} placeholder="Lesson paragraph" className="w-full rounded-xl border px-3 py-2"/><div className="flex gap-2"><input value={lessonForm.duration} onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })} type="number" min="0" className="w-24 rounded-xl border px-3 py-2"/><button className="flex-1 rounded-xl bg-slate-900 px-3 py-2 font-bold text-white">Add lesson</button></div></form><div className="mt-3 space-y-2">{lessons.map((lesson) => <div key={lesson.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><div className="font-semibold">{lesson.title}</div><div className="text-xs text-slate-500">{lesson.status} · {lesson.duration_minutes} min</div></div>{lesson.status !== 'archived' && <button onClick={async () => { await setLearningLessonStatus(lesson.id, lesson.status === 'published' ? 'draft' : 'published'); await loadCourse(selectedCourse); }} className="text-xs font-bold text-blue-700">{lesson.status === 'published' ? 'Draft' : 'Publish'}</button>}</div>)}</div></section>
            <section className="rounded-2xl border bg-white p-4"><h3 className="font-bold">Assessment</h3><form onSubmit={createAssessment} className="mt-3 space-y-2"><input required value={assessmentForm.title} onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })} placeholder="Assessment title" className="w-full rounded-xl border px-3 py-2"/><input required value={assessmentForm.prompt} onChange={(e) => setAssessmentForm({ ...assessmentForm, prompt: e.target.value })} placeholder="Question" className="w-full rounded-xl border px-3 py-2"/><input required value={assessmentForm.answer} onChange={(e) => setAssessmentForm({ ...assessmentForm, answer: e.target.value })} placeholder="Correct answer" className="w-full rounded-xl border px-3 py-2"/><button className="w-full rounded-xl bg-slate-900 px-3 py-2 font-bold text-white">Add assessment</button></form><div className="mt-3 space-y-2">{assessments.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><div className="font-semibold">{item.title}</div><div className="text-xs text-slate-500">{item.status} · pass {item.passing_score}%</div></div>{item.status !== 'archived' && <button onClick={async () => { await setLearningAssessmentStatus(item.id, item.status === 'published' ? 'draft' : 'published'); await loadCourse(selectedCourse); }} className="text-xs font-bold text-blue-700">{item.status === 'published' ? 'Draft' : 'Publish'}</button>}</div>)}</div></section>
          </div>
          <section className="rounded-2xl border bg-white p-4"><div className="flex items-center gap-2 font-bold"><Users size={17}/>Enroll existing customer</div><form onSubmit={enroll} className="mt-3 flex gap-2"><input required value={customerId} onChange={(e) => setCustomerId(e.target.value)} type="number" min="1" placeholder="Customer ID" className="flex-1 rounded-xl border px-3 py-2"/><button className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">Enroll + link</button></form>{learnerLink && <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3"><code className="min-w-0 flex-1 truncate text-xs">{learnerLink}</code><button onClick={() => void copyLink()}><Copy size={16}/></button></div>}<div className="mt-3 grid gap-2 md:grid-cols-2">{enrollments.map((row) => <div key={row.id} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="font-semibold">{row.customer_name || `Customer #${row.customer_id}`}</div><div className="text-xs text-slate-500">{row.status} · {row.completed_lessons || 0} completed</div><button onClick={async () => { const access = await issueLearningAccessToken(row.id); const link = `${window.location.origin}/learn/entry#token=${encodeURIComponent(access.token)}`; setLearnerLink(link); toast.success('Learner token rotated'); }} className="mt-2 text-xs font-bold text-blue-700">Rotate access link</button></div>)}</div></section>
        </div> : <div className="rounded-2xl border bg-white p-10 text-center text-slate-500"><BookOpen className="mx-auto mb-3"/>Select a course</div>}</div>
      </div> : <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4"><form onSubmit={createForum} className="space-y-3 rounded-2xl border bg-white p-4"><div className="flex items-center gap-2 font-bold"><MessageSquareText size={18}/>New forum</div><select value={forumForm.siteId} onChange={(e) => setForumForm({ ...forumForm, siteId: e.target.value })} className="w-full rounded-xl border px-3 py-2"><option value="">No public site</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} · {site.status}</option>)}</select><input required value={forumForm.name} onChange={(e) => setForumForm({ ...forumForm, name: e.target.value })} placeholder="Forum name" className="w-full rounded-xl border px-3 py-2"/><textarea value={forumForm.description} onChange={(e) => setForumForm({ ...forumForm, description: e.target.value })} placeholder="Description" className="w-full rounded-xl border px-3 py-2"/><select value={forumForm.visibility} onChange={(e) => setForumForm({ ...forumForm, visibility: e.target.value })} className="w-full rounded-xl border px-3 py-2"><option value="private">Private</option><option value="public">Public</option></select><button className="w-full rounded-xl bg-slate-900 px-3 py-2 font-bold text-white">Create forum</button></form><div className="rounded-2xl border bg-white p-3"><div className="mb-2 text-sm font-bold">Forums</div>{forums.map((forum) => <button key={forum.id} onClick={() => void loadForum(forum)} className={`mb-2 w-full rounded-xl border p-3 text-left ${selectedForum?.id === forum.id ? 'border-blue-500 bg-blue-50' : ''}`}><div className="font-semibold">{forum.name}</div><div className="text-xs text-slate-500">{forum.status} · {forum.topic_count || 0} topics</div></button>)}</div></div>
        <div>{selectedForum ? <div className="space-y-4"><section className="rounded-2xl border bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">{selectedForum.name}</h2><p className="text-sm text-slate-500">{selectedForum.status} · {selectedForum.visibility}</p></div>{selectedForum.status !== 'archived' && <button onClick={async () => { try { const updated = await setCommunityForumStatus(selectedForum.id, selectedForum.status === 'published' ? 'draft' : 'published'); await loadRoot(); await loadForum(updated); } catch (e:any) { toast.error(e?.response?.data?.error?.message || 'Status gagal'); } }} className="rounded-xl border px-3 py-2 text-sm font-bold">{selectedForum.status === 'published' ? 'Unpublish' : 'Publish forum'}</button>}</div></section><form onSubmit={createTopic} className="space-y-2 rounded-2xl border bg-white p-4"><h3 className="font-bold">Create staff topic</h3><input required value={topicForm.title} onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })} placeholder="Topic title" className="w-full rounded-xl border px-3 py-2"/><textarea required value={topicForm.body} onChange={(e) => setTopicForm({ ...topicForm, body: e.target.value })} placeholder="Topic body" className="w-full rounded-xl border px-3 py-2"/><button className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">Create topic</button></form><div className="grid gap-4 lg:grid-cols-2"><section className="rounded-2xl border bg-white p-4"><h3 className="font-bold">Topics</h3><div className="mt-3 space-y-2">{topics.map((topic) => <div key={topic.id} className={`rounded-xl border p-3 ${selectedTopic?.id === topic.id ? 'border-blue-500' : ''}`}><button onClick={() => void loadTopic(topic)} className="w-full text-left"><div className="font-semibold">{topic.pinned ? '📌 ' : ''}{topic.title}</div><div className="text-xs text-slate-500">{topic.status} · {topic.reply_count || 0} replies</div></button><div className="mt-2 flex gap-3 text-xs font-bold"><button onClick={() => void moderateTopic(topic,{pinned:!topic.pinned})} className="text-blue-700">{topic.pinned?'Unpin':'Pin'}</button>{topic.status === 'hidden' ? <button onClick={() => void moderateTopic(topic,{status:'open'})} className="text-blue-700">Restore</button> : <><button onClick={() => void moderateTopic(topic,{status:topic.status==='locked'?'open':'locked'})} className="text-amber-700">{topic.status==='locked'?'Open':'Lock'}</button><button onClick={() => void moderateTopic(topic,{status:'hidden'})} className="text-rose-700">Hide</button></>}</div></div>)}</div></section><section className="rounded-2xl border bg-white p-4"><h3 className="font-bold">Replies</h3>{selectedTopic ? <><form onSubmit={createReply} className="mt-3 flex gap-2"><input required value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Staff reply" className="flex-1 rounded-xl border px-3 py-2"/><button className="rounded-xl bg-slate-900 px-3 py-2 font-bold text-white">Reply</button></form><div className="mt-3 space-y-2">{replies.map((reply) => <div key={reply.id} className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-bold">{reply.author_name} · {reply.status}</div><div className="mt-1 text-sm">{reply.content?.[0]?.text || 'Reply'}</div><div className="mt-2 flex gap-2 text-xs font-bold">{reply.status === 'hidden' ? <button onClick={() => void moderateReply(reply.id,'visible')} className="text-blue-700">Restore</button> : <button onClick={() => void moderateReply(reply.id,'hidden')} className="text-rose-700">Hide</button>}</div></div>)}</div></> : <p className="mt-4 text-sm text-slate-500">Select a topic.</p>}</section></div></div> : <div className="rounded-2xl border bg-white p-10 text-center text-slate-500"><MessageSquareText className="mx-auto mb-3"/>Select a forum</div>}</div>
      </div>}
      <footer className="rounded-2xl border bg-white p-4 text-xs text-slate-500"><CheckCircle2 size={14} className="inline mr-1"/>Public publishing remains tied to an existing published Website site. Learner links are bearer fragments and raw tokens are not persisted.</footer>
    </div>
  </main>;
}
