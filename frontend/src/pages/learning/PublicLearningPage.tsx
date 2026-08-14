import { useEffect, useState } from 'react';
import { BookOpen, Clock3, GraduationCap, Loader2 } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getPublicLearningCourse, getPublicLearningCourses, type LearningCourse, type LearningLesson } from '../../services/learningCommunityService';

const blockText = (lesson: LearningLesson) => (lesson.content || []).map((block) => block.text).filter(Boolean).join('\n\n');

export default function PublicLearningPage() {
  const { publicSlug = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const courseSlug = searchParams.get('course');
  const [courses, setCourses] = useState<LearningCourse[]>([]);
  const [selected, setSelected] = useState<{ course: LearningCourse; lessons: LearningLesson[] } | null>(null);
  const [siteName, setSiteName] = useState('Learning');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([
      getPublicLearningCourses(publicSlug),
      courseSlug ? getPublicLearningCourse(publicSlug, courseSlug) : Promise.resolve(null),
    ]).then(([root, course]) => {
      if (!active) return;
      setCourses(root.courses); setSiteName(root.site.name || 'Learning'); setSelected(course);
    }).catch((requestError: any) => {
      if (active) setError(requestError?.response?.data?.error?.message || 'Learning content unavailable.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseSlug, publicSlug]);

  if (loading) return <main className="min-h-screen grid place-items-center bg-slate-50"><Loader2 className="animate-spin" /></main>;

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-blue-700"><GraduationCap size={18}/>Academy</div>
        <h1 className="mt-2 text-3xl font-black">{siteName}</h1>
        <p className="mt-2 text-sm text-slate-600">Published learning material. Progress and assessments are available through an enrollment link issued by the business.</p>
      </header>
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      {selected ? <div className="space-y-4">
        <button onClick={() => setSearchParams({})} className="text-sm font-bold text-blue-700">← All courses</button>
        <section className="rounded-3xl border bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-black">{selected.course.title}</h2><p className="mt-2 max-w-3xl text-sm text-slate-600">{selected.course.description}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{selected.course.difficulty}</span></div></section>
        <div className="space-y-3">{selected.lessons.map((lesson) => <article key={lesson.id} className="rounded-2xl border bg-white p-5"><div className="flex items-center justify-between gap-3"><div className="font-black">{lesson.position + 1}. {lesson.title}</div><span className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock3 size={13}/>{lesson.duration_minutes} min</span></div><div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{blockText(lesson)}</div></article>)}</div>
      </div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{courses.map((course) => <button key={course.id} onClick={() => setSearchParams({ course: course.slug })} className="rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5"><BookOpen size={20} className="text-blue-600"/><h2 className="mt-3 text-lg font-black">{course.title}</h2><p className="mt-2 line-clamp-3 text-sm text-slate-600">{course.description}</p><div className="mt-4 flex gap-3 text-xs font-semibold text-slate-500"><span>{course.lesson_count || 0} lessons</span><span>{course.difficulty}</span></div></button>)}</div>}
      {!selected && courses.length === 0 && <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">No published courses yet.</div>}
    </div>
  </main>;
}
