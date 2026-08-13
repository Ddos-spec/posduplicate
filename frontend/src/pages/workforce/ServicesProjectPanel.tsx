import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, FolderKanban, PauseCircle, PlayCircle, Plus, RefreshCw, Timer, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createServicePlanning,
  createServiceProject,
  createServiceTask,
  decideServiceTimesheet,
  getMyServiceTimesheets,
  getMyTimesheetContext,
  getServicePlanning,
  getServiceProjects,
  getServiceTasks,
  getServiceTimesheets,
  servicesErrorMessage,
  submitMyServiceTimesheet,
  updateServicePlanningStatus,
  updateServiceProjectStatus,
  updateServiceTaskStatus,
  type MyTimesheetContext,
  type ServicePlanningAllocation,
  type ServiceProject,
  type ServiceTask,
  type ServiceTimesheetEntry,
} from '../../services/servicesService';
import type { WorkforceEmployee } from '../../services/workforceService';

interface Props { employees: WorkforceEmployee[]; }
type Section = 'projects' | 'timesheets' | 'planning';

const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition focus:border-cyan-500';
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value)) : '—';
const formatDateTime = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const minutesText = (minutes?: number | null) => `${Math.floor(Number(minutes || 0) / 60)}j ${Number(minutes || 0) % 60}m`;
const today = () => new Date().toISOString().slice(0, 10);

const projectBadge = (status: ServiceProject['status']) => status === 'completed' ? 'bg-emerald-950 text-emerald-300' : status === 'cancelled' ? 'bg-rose-950 text-rose-300' : status === 'on_hold' ? 'bg-amber-950 text-amber-300' : status === 'open' ? 'bg-cyan-950 text-cyan-300' : 'bg-slate-800 text-slate-300';
const taskBadge = (status: ServiceTask['status']) => status === 'done' ? 'bg-emerald-950 text-emerald-300' : status === 'cancelled' ? 'bg-rose-950 text-rose-300' : status === 'blocked' ? 'bg-amber-950 text-amber-300' : status === 'in_progress' ? 'bg-cyan-950 text-cyan-300' : 'bg-slate-800 text-slate-300';

export default function ServicesProjectPanel({ employees }: Props) {
  const [section, setSection] = useState<Section>('projects');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [projects, setProjects] = useState<ServiceProject[]>([]);
  const [tasks, setTasks] = useState<ServiceTask[]>([]);
  const [managerProjectsVisible, setManagerProjectsVisible] = useState(false);
  const [context, setContext] = useState<MyTimesheetContext | null>(null);
  const [myTimesheets, setMyTimesheets] = useState<ServiceTimesheetEntry[]>([]);
  const [timesheetManagerRows, setTimesheetManagerRows] = useState<ServiceTimesheetEntry[]>([]);
  const [timesheetManagerVisible, setTimesheetManagerVisible] = useState(false);
  const [planningRows, setPlanningRows] = useState<ServicePlanningAllocation[]>([]);
  const [planningVisible, setPlanningVisible] = useState(false);

  const [projectForm, setProjectForm] = useState({ code: '', name: '', description: '', startDate: '', dueDate: '', plannedHours: '' });
  const [taskForm, setTaskForm] = useState({ projectId: '', title: '', description: '', assigneeEmployeeId: '', priority: 'normal' as ServiceTask['priority'], plannedHours: '', dueAt: '' });
  const [timeForm, setTimeForm] = useState({ projectId: '', taskId: '', workDate: today(), minutes: '60', billable: true, description: '' });
  const [planningForm, setPlanningForm] = useState({ employeeId: '', projectId: '', taskId: '', startAt: '', endAt: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [projectResult, taskResult, contextResult, myTimeResult, managerTimeResult, planningResult] = await Promise.allSettled([
      getServiceProjects(), getServiceTasks(), getMyTimesheetContext(), getMyServiceTimesheets(), getServiceTimesheets(), getServicePlanning(),
    ]);

    if (projectResult.status === 'fulfilled' && taskResult.status === 'fulfilled') {
      setProjects(projectResult.value);
      setTasks(taskResult.value);
      setManagerProjectsVisible(true);
    } else {
      setProjects([]);
      setTasks([]);
      setManagerProjectsVisible(false);
    }
    if (contextResult.status === 'fulfilled') setContext(contextResult.value); else setContext(null);
    if (myTimeResult.status === 'fulfilled') setMyTimesheets(myTimeResult.value.entries); else setMyTimesheets([]);
    if (managerTimeResult.status === 'fulfilled') { setTimesheetManagerRows(managerTimeResult.value); setTimesheetManagerVisible(true); } else { setTimesheetManagerRows([]); setTimesheetManagerVisible(false); }
    if (planningResult.status === 'fulfilled') { setPlanningRows(planningResult.value); setPlanningVisible(true); } else { setPlanningRows([]); setPlanningVisible(false); }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const selfProject = context?.projects[0];
    if (selfProject) setTimeForm((current) => ({ ...current, projectId: current.projectId || String(selfProject.id) }));
    const editableProject = projects.find((row) => ['draft', 'open'].includes(row.status));
    if (editableProject) setTaskForm((current) => ({ ...current, projectId: current.projectId || String(editableProject.id) }));
    const plannableProject = projects.find((row) => !['completed', 'cancelled'].includes(row.status));
    if (plannableProject) setPlanningForm((current) => ({ ...current, projectId: current.projectId || String(plannableProject.id) }));
    if (employees[0]) setPlanningForm((current) => ({ ...current, employeeId: current.employeeId || String(employees[0].id) }));
  }, [context, employees, projects]);

  const selfTasks = useMemo(() => context?.tasks.filter((row) => !timeForm.projectId || row.project_id === Number(timeForm.projectId)) || [], [context, timeForm.projectId]);
  const managerTaskOptions = useMemo(() => tasks.filter((row) => !planningForm.projectId || row.project_id === Number(planningForm.projectId)).filter((row) => !['done', 'cancelled'].includes(row.status)), [planningForm.projectId, tasks]);
  const pendingTimesheets = useMemo(() => timesheetManagerRows.filter((row) => row.status === 'submitted'), [timesheetManagerRows]);

  const execute = async (key: string, action: () => Promise<unknown>, success: string) => {
    setWorking(key);
    try {
      await action();
      toast.success(success);
      await load();
    } catch (error) {
      toast.error(servicesErrorMessage(error, 'Aksi Services gagal'));
    } finally { setWorking(null); }
  };

  const submitProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectForm.code.trim() || !projectForm.name.trim()) return toast.error('Code dan nama project wajib diisi');
    await execute('new-project', () => createServiceProject({
      code: projectForm.code,
      name: projectForm.name,
      description: projectForm.description || undefined,
      startDate: projectForm.startDate || undefined,
      dueDate: projectForm.dueDate || undefined,
      plannedMinutes: projectForm.plannedHours ? Math.round(Number(projectForm.plannedHours) * 60) : undefined,
    }), 'Project dibuat');
    setProjectForm({ code: '', name: '', description: '', startDate: '', dueDate: '', plannedHours: '' });
  };

  const submitTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!taskForm.projectId || !taskForm.title.trim()) return toast.error('Project dan title task wajib diisi');
    await execute('new-task', () => createServiceTask({
      projectId: Number(taskForm.projectId),
      title: taskForm.title,
      description: taskForm.description || undefined,
      assigneeEmployeeId: taskForm.assigneeEmployeeId ? Number(taskForm.assigneeEmployeeId) : undefined,
      priority: taskForm.priority,
      plannedMinutes: taskForm.plannedHours ? Math.round(Number(taskForm.plannedHours) * 60) : undefined,
      dueAt: taskForm.dueAt ? new Date(taskForm.dueAt).toISOString() : undefined,
    }), 'Task dibuat');
    setTaskForm((current) => ({ ...current, title: '', description: '', assigneeEmployeeId: '', plannedHours: '', dueAt: '' }));
  };

  const submitTimesheet = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!timeForm.projectId || Number(timeForm.minutes) <= 0) return toast.error('Project dan durasi timesheet wajib diisi');
    await execute('new-timesheet', () => submitMyServiceTimesheet({
      projectId: Number(timeForm.projectId),
      taskId: timeForm.taskId ? Number(timeForm.taskId) : undefined,
      workDate: timeForm.workDate || undefined,
      minutes: Number(timeForm.minutes),
      billable: timeForm.billable,
      description: timeForm.description || undefined,
    }), 'Timesheet dikirim untuk approval');
    setTimeForm((current) => ({ ...current, taskId: '', minutes: '60', description: '' }));
  };

  const submitPlanning = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!planningForm.employeeId || !planningForm.startAt || !planningForm.endAt) return toast.error('Employee, start, dan end planning wajib diisi');
    await execute('new-planning', () => createServicePlanning({
      employeeId: Number(planningForm.employeeId),
      projectId: planningForm.projectId ? Number(planningForm.projectId) : undefined,
      taskId: planningForm.taskId ? Number(planningForm.taskId) : undefined,
      startAt: new Date(planningForm.startAt).toISOString(),
      endAt: new Date(planningForm.endAt).toISOString(),
      notes: planningForm.notes || undefined,
    }), 'Planning allocation dibuat');
    setPlanningForm((current) => ({ ...current, taskId: '', startAt: '', endAt: '', notes: '' }));
  };

  const projectActions = (row: ServiceProject) => {
    if (row.status === 'draft') return <><button disabled={working !== null} onClick={() => void execute(`project-open-${row.id}`, () => updateServiceProjectStatus(row.id, 'open'), 'Project dibuka')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"><PlayCircle size={14} className="mr-1 inline" /> Open</button><button disabled={working !== null} onClick={() => void execute(`project-cancel-${row.id}`, () => updateServiceProjectStatus(row.id, 'cancelled'), 'Project dibatalkan')} className="rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300">Cancel</button></>;
    if (row.status === 'open') return <><button disabled={working !== null} onClick={() => void execute(`project-hold-${row.id}`, () => updateServiceProjectStatus(row.id, 'on_hold'), 'Project ditahan')} className="rounded-lg border border-amber-700 px-3 py-1.5 text-xs font-bold text-amber-300"><PauseCircle size={14} className="mr-1 inline" /> Hold</button><button disabled={working !== null} onClick={() => void execute(`project-done-${row.id}`, () => updateServiceProjectStatus(row.id, 'completed'), 'Project selesai')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Complete</button><button disabled={working !== null} onClick={() => void execute(`project-cancel-${row.id}`, () => updateServiceProjectStatus(row.id, 'cancelled'), 'Project dibatalkan')} className="rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300">Cancel</button></>;
    if (row.status === 'on_hold') return <><button disabled={working !== null} onClick={() => void execute(`project-resume-${row.id}`, () => updateServiceProjectStatus(row.id, 'open'), 'Project dilanjutkan')} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white">Resume</button><button disabled={working !== null} onClick={() => void execute(`project-cancel-${row.id}`, () => updateServiceProjectStatus(row.id, 'cancelled'), 'Project dibatalkan')} className="rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300">Cancel</button></>;
    return null;
  };

  const taskActions = (row: ServiceTask) => {
    if (row.status === 'todo') return <><button disabled={working !== null} onClick={() => void execute(`task-start-${row.id}`, () => updateServiceTaskStatus(row.id, 'in_progress'), 'Task dimulai')} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white">Start</button><button disabled={working !== null} onClick={() => void execute(`task-block-${row.id}`, () => updateServiceTaskStatus(row.id, 'blocked'), 'Task diblok')} className="rounded-lg border border-amber-700 px-3 py-1.5 text-xs font-bold text-amber-300">Block</button><button disabled={working !== null} onClick={() => void execute(`task-cancel-${row.id}`, () => updateServiceTaskStatus(row.id, 'cancelled'), 'Task dibatalkan')} className="rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300">Cancel</button></>;
    if (row.status === 'in_progress') return <><button disabled={working !== null} onClick={() => void execute(`task-done-${row.id}`, () => updateServiceTaskStatus(row.id, 'done'), 'Task selesai')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Done</button><button disabled={working !== null} onClick={() => void execute(`task-block-${row.id}`, () => updateServiceTaskStatus(row.id, 'blocked'), 'Task diblok')} className="rounded-lg border border-amber-700 px-3 py-1.5 text-xs font-bold text-amber-300">Block</button><button disabled={working !== null} onClick={() => void execute(`task-cancel-${row.id}`, () => updateServiceTaskStatus(row.id, 'cancelled'), 'Task dibatalkan')} className="rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300">Cancel</button></>;
    if (row.status === 'blocked') return <><button disabled={working !== null} onClick={() => void execute(`task-resume-${row.id}`, () => updateServiceTaskStatus(row.id, 'in_progress'), 'Task dilanjutkan')} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white">Resume</button><button disabled={working !== null} onClick={() => void execute(`task-cancel-${row.id}`, () => updateServiceTaskStatus(row.id, 'cancelled'), 'Task dibatalkan')} className="rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300">Cancel</button></>;
    return null;
  };

  if (loading) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Memuat Project / Timesheets / Planning…</div>;

  return <div className="space-y-6">
    <nav className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2">
      <button onClick={() => setSection('projects')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${section === 'projects' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><FolderKanban size={16} /> Projects</button>
      <button onClick={() => setSection('timesheets')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${section === 'timesheets' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Timer size={16} /> Timesheets</button>
      <button onClick={() => setSection('planning')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${section === 'planning' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><CalendarClock size={16} /> Planning</button>
    </nav>

    {section === 'projects' && (managerProjectsVisible ? <>
      <section className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={submitProject} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-3"><FolderKanban className="text-violet-400" /><div><h2 className="font-black">Buat Project</h2><p className="text-sm text-slate-400">Project dimulai sebagai draft; customer/outlet tetap opsional di backend.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><input className={inputClass} value={projectForm.code} onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value })} placeholder="Code project" /><input className={inputClass} value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="Nama project" /><input className={inputClass} type="date" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} /><input className={inputClass} type="date" value={projectForm.dueDate} onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })} /><input className={inputClass} type="number" min="0" step="0.5" value={projectForm.plannedHours} onChange={(e) => setProjectForm({ ...projectForm, plannedHours: e.target.value })} placeholder="Planned hours" /><textarea className={inputClass} rows={2} value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="Deskripsi" /></div><button disabled={working === 'new-project'} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Plus size={16} /> Buat project</button></form>
        <form onSubmit={submitTask} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-black">Buat Task</h2><p className="text-sm text-slate-400">Task hanya dapat ditambah ke project draft/open.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><select className={inputClass} value={taskForm.projectId} onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })}><option value="">Pilih project</option>{projects.filter((row) => ['draft', 'open'].includes(row.status)).map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select><input className={inputClass} value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Title task" /><select className={inputClass} value={taskForm.assigneeEmployeeId} onChange={(e) => setTaskForm({ ...taskForm, assigneeEmployeeId: e.target.value })}><option value="">Tanpa assignee</option>{employees.map((row) => <option key={row.id} value={row.id}>{row.employee_id} · {row.name}</option>)}</select><select className={inputClass} value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as ServiceTask['priority'] })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select><input className={inputClass} type="number" min="0" step="0.5" value={taskForm.plannedHours} onChange={(e) => setTaskForm({ ...taskForm, plannedHours: e.target.value })} placeholder="Planned hours" /><input className={inputClass} type="datetime-local" value={taskForm.dueAt} onChange={(e) => setTaskForm({ ...taskForm, dueAt: e.target.value })} /><textarea className={`${inputClass} sm:col-span-2`} rows={2} value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Deskripsi task" /></div><button disabled={working === 'new-task'} className="mt-4 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">Buat task</button></form>
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black">Project Portfolio</h2><p className="text-sm text-slate-400">Completion project ditolak jika masih ada task aktif.</p></div><button onClick={() => void load()} className="rounded-xl border border-slate-700 p-2"><RefreshCw size={17} /></button></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{projects.map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold">{row.code} · {row.name}</p><p className="text-sm text-slate-400">{formatDate(row.start_date)} – {formatDate(row.due_date)}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${projectBadge(row.status)}`}>{row.status}</span></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500"><span>Task {row.done_task_count || 0}/{row.task_count || 0}</span><span>Plan {minutesText(row.planned_minutes)}</span><span>Approved {minutesText(row.approved_minutes)}</span></div><div className="mt-3 flex flex-wrap gap-2">{projectActions(row)}</div></div>)}{projects.length === 0 && <p className="text-sm text-slate-500">Belum ada project.</p>}</div></section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-black">Tasks</h2><div className="mt-4 grid gap-3 lg:grid-cols-2">{tasks.map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold">{row.title}</p><p className="text-sm text-slate-400">{row.project_code} · {row.project_name} · {row.assignee_name || 'unassigned'}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${taskBadge(row.status)}`}>{row.status}</span></div><p className="mt-2 text-xs text-slate-500">Priority {row.priority} · plan {minutesText(row.planned_minutes)} · approved {minutesText(row.approved_minutes)} · due {formatDateTime(row.due_at)}</p><div className="mt-3 flex flex-wrap gap-2">{taskActions(row)}</div></div>)}{tasks.length === 0 && <p className="text-sm text-slate-500">Belum ada task.</p>}</div></section>
    </> : <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-5 text-sm text-amber-200">Akun ini tidak memiliki Project manager/read capability. Self Timesheets tetap dapat digunakan melalui tab Timesheets.</div>)}

    {section === 'timesheets' && <>
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={submitTimesheet} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-3"><Clock3 className="text-cyan-400" /><div><h2 className="font-black">Log Waktu Saya</h2><p className="text-sm text-slate-400">Project/task context berasal dari endpoint self-safe; employee identity dari login.</p></div></div>{context ? <div className="mt-4 grid gap-3"><div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm"><p className="font-bold">{context.employee.name}</p><p className="text-slate-500">{context.employee.employee_id} · {context.employee.department || '—'}</p></div><select className={inputClass} value={timeForm.projectId} onChange={(e) => setTimeForm({ ...timeForm, projectId: e.target.value, taskId: '' })}><option value="">Pilih project</option>{context.projects.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name} · {row.status}</option>)}</select><select className={inputClass} value={timeForm.taskId} onChange={(e) => setTimeForm({ ...timeForm, taskId: e.target.value })}><option value="">Task opsional</option>{selfTasks.map((row) => <option key={row.id} value={row.id}>{row.title} · {row.status}</option>)}</select><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} type="date" value={timeForm.workDate} onChange={(e) => setTimeForm({ ...timeForm, workDate: e.target.value })} /><input className={inputClass} type="number" min="1" max="1440" value={timeForm.minutes} onChange={(e) => setTimeForm({ ...timeForm, minutes: e.target.value })} placeholder="Menit" /></div><textarea className={inputClass} rows={2} value={timeForm.description} onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })} placeholder="Deskripsi pekerjaan" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={timeForm.billable} onChange={(e) => setTimeForm({ ...timeForm, billable: e.target.checked })} /> Billable</label><button disabled={working === 'new-timesheet' || context.projects.length === 0} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">Submit timesheet</button></div> : <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">Timesheet self-service tidak tersedia atau akun belum linked ke employee aktif.</div>}</form>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-black">Riwayat Waktu Saya</h2><div className="mt-4 space-y-3">{myTimesheets.map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold">{row.project_code} · {row.project_name}</p><p className="text-sm text-slate-400">{row.task_title || 'Tanpa task'} · {formatDate(row.work_date)} · {minutesText(row.minutes)}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${row.status === 'approved' ? 'bg-emerald-950 text-emerald-300' : row.status === 'rejected' ? 'bg-rose-950 text-rose-300' : 'bg-amber-950 text-amber-300'}`}>{row.status}</span></div>{row.description && <p className="mt-2 text-sm text-slate-300">{row.description}</p>}{row.rejected_reason && <p className="mt-2 text-xs text-rose-300">Rejected: {row.rejected_reason}</p>}</div>)}{myTimesheets.length === 0 && <p className="text-sm text-slate-500">Belum ada timesheet.</p>}</div></div>
      </section>
      {timesheetManagerVisible && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-black">Timesheet Approval Queue</h2><p className="text-sm text-slate-400">{pendingTimesheets.length} submitted entry menunggu keputusan.</p><div className="mt-4 grid gap-3 lg:grid-cols-2">{pendingTimesheets.map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><p className="font-bold">{row.employee_name} · {row.project_code}</p><p className="text-sm text-slate-400">{row.task_title || 'Tanpa task'} · {formatDate(row.work_date)} · {minutesText(row.minutes)} · {row.billable ? 'billable' : 'non-billable'}</p>{row.description && <p className="mt-2 text-sm text-slate-300">{row.description}</p>}<div className="mt-3 flex gap-2"><button disabled={working !== null} onClick={() => void execute(`ts-approve-${row.id}`, () => decideServiceTimesheet(row.id, 'approved'), 'Timesheet disetujui')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"><CheckCircle2 size={14} /> Approve</button><button disabled={working !== null} onClick={() => { const reason = window.prompt('Alasan rejection wajib diisi'); if (!reason?.trim()) return; void execute(`ts-reject-${row.id}`, () => decideServiceTimesheet(row.id, 'rejected', reason.trim()), 'Timesheet ditolak'); }} className="inline-flex items-center gap-1 rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300"><XCircle size={14} /> Reject</button></div></div>)}{pendingTimesheets.length === 0 && <p className="text-sm text-slate-500">Tidak ada submitted timesheet.</p>}</div></section>}
    </>}

    {section === 'planning' && (planningVisible ? <>
      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={submitPlanning} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-3"><CalendarClock className="text-violet-400" /><div><h2 className="font-black">Buat Planning</h2><p className="text-sm text-slate-400">Employee overlap pada planned/confirmed allocation ditolak oleh lock backend `74001`.</p></div></div><div className="mt-4 grid gap-3"><select className={inputClass} value={planningForm.employeeId} onChange={(e) => setPlanningForm({ ...planningForm, employeeId: e.target.value })}><option value="">Pilih employee</option>{employees.map((row) => <option key={row.id} value={row.id}>{row.employee_id} · {row.name}</option>)}</select><select className={inputClass} value={planningForm.projectId} onChange={(e) => setPlanningForm({ ...planningForm, projectId: e.target.value, taskId: '' })}><option value="">Tanpa project</option>{projects.filter((row) => !['completed', 'cancelled'].includes(row.status)).map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select><select className={inputClass} value={planningForm.taskId} onChange={(e) => setPlanningForm({ ...planningForm, taskId: e.target.value })} disabled={!planningForm.projectId}><option value="">Task opsional</option>{managerTaskOptions.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} type="datetime-local" value={planningForm.startAt} onChange={(e) => setPlanningForm({ ...planningForm, startAt: e.target.value })} /><input className={inputClass} type="datetime-local" value={planningForm.endAt} onChange={(e) => setPlanningForm({ ...planningForm, endAt: e.target.value })} /></div><textarea className={inputClass} rows={2} value={planningForm.notes} onChange={(e) => setPlanningForm({ ...planningForm, notes: e.target.value })} placeholder="Catatan" /><button disabled={working === 'new-planning' || employees.length === 0} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Buat allocation</button></div></form>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-black">Planning Schedule</h2><div className="mt-4 space-y-3">{planningRows.map((row) => <div key={row.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold">{row.employee_name} · {row.project_code || 'General'}</p><p className="text-sm text-slate-400">{row.task_title || 'Tanpa task'} · {formatDateTime(row.start_at)} – {formatDateTime(row.end_at)}</p></div><span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-bold uppercase">{row.status}</span></div>{row.notes && <p className="mt-2 text-sm text-slate-300">{row.notes}</p>}<div className="mt-3 flex gap-2">{row.status === 'planned' && <><button disabled={working !== null} onClick={() => void execute(`plan-confirm-${row.id}`, () => updateServicePlanningStatus(row.id, 'confirmed'), 'Planning dikonfirmasi')} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white">Confirm</button><button disabled={working !== null} onClick={() => void execute(`plan-cancel-${row.id}`, () => updateServicePlanningStatus(row.id, 'cancelled'), 'Planning dibatalkan')} className="rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300">Cancel</button></>}{row.status === 'confirmed' && <><button disabled={working !== null} onClick={() => void execute(`plan-done-${row.id}`, () => updateServicePlanningStatus(row.id, 'done'), 'Planning selesai')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">Done</button><button disabled={working !== null} onClick={() => void execute(`plan-cancel-${row.id}`, () => updateServicePlanningStatus(row.id, 'cancelled'), 'Planning dibatalkan')} className="rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-bold text-rose-300">Cancel</button></>}</div></div>)}{planningRows.length === 0 && <p className="text-sm text-slate-500">Belum ada planning allocation.</p>}</div></div>
      </section>
    </> : <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-5 text-sm text-amber-200">Akun ini tidak memiliki Planning read/manage capability.</div>)}
  </div>;
}
