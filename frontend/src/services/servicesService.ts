import api from './api';
import type { WorkforceEmployee } from './workforceService';

export interface ServiceProject {
  id: number;
  tenant_id: number;
  outlet_id?: number | null;
  customer_id?: number | null;
  code: string;
  name: string;
  description?: string | null;
  owner_user_id?: number | null;
  status: 'draft' | 'open' | 'on_hold' | 'completed' | 'cancelled';
  start_date?: string | null;
  due_date?: string | null;
  planned_minutes: number;
  outlet_name?: string | null;
  customer_name?: string | null;
  owner_name?: string | null;
  task_count?: number;
  done_task_count?: number;
  approved_minutes?: number;
}

export interface ServiceTask {
  id: number;
  tenant_id: number;
  project_id: number;
  title: string;
  description?: string | null;
  assignee_employee_id?: number | null;
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  planned_minutes: number;
  due_at?: string | null;
  project_code?: string;
  project_name?: string;
  assignee_code?: string | null;
  assignee_name?: string | null;
  approved_minutes?: number;
}

export interface ServiceTimesheetEntry {
  id: number;
  tenant_id: number;
  project_id: number;
  task_id?: number | null;
  employee_id: number;
  work_date: string;
  minutes: number;
  billable: boolean;
  description?: string | null;
  status: 'submitted' | 'approved' | 'rejected';
  rejected_reason?: string | null;
  project_code?: string;
  project_name?: string;
  task_title?: string | null;
  employee_code?: string;
  employee_name?: string;
  approved_by_name?: string | null;
}

export interface ServicePlanningAllocation {
  id: number;
  tenant_id: number;
  project_id?: number | null;
  task_id?: number | null;
  employee_id: number;
  start_at: string;
  end_at: string;
  status: 'planned' | 'confirmed' | 'done' | 'cancelled';
  notes?: string | null;
  employee_code?: string;
  employee_name?: string;
  project_code?: string | null;
  project_name?: string | null;
  task_title?: string | null;
}

export interface MyTimesheetContextProject { id: number; code: string; name: string; status: 'open' | 'on_hold'; }
export interface MyTimesheetContextTask { id: number; project_id: number; title: string; status: ServiceTask['status']; project_code: string; project_name: string; }
export interface MyTimesheetContext {
  employee: WorkforceEmployee;
  projects: MyTimesheetContextProject[];
  tasks: MyTimesheetContextTask[];
}

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export const servicesErrorMessage = (error: unknown, fallback: string) => {
  const candidate = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return candidate.response?.data?.error?.message || candidate.message || fallback;
};

export async function getServiceProjects(): Promise<ServiceProject[]> {
  return unwrap<ServiceProject[]>(await api.get('/services/projects'));
}
export async function createServiceProject(payload: { code: string; name: string; description?: string; startDate?: string; dueDate?: string; plannedMinutes?: number }) {
  return unwrap<ServiceProject>(await api.post('/services/projects', payload));
}
export async function updateServiceProjectStatus(id: number, status: ServiceProject['status']) {
  return unwrap<ServiceProject>(await api.patch(`/services/projects/${id}/status`, { status }));
}
export async function getServiceTasks(projectId?: number): Promise<ServiceTask[]> {
  return unwrap<ServiceTask[]>(await api.get('/services/tasks', { params: projectId ? { projectId } : undefined }));
}
export async function createServiceTask(payload: { projectId: number; title: string; description?: string; assigneeEmployeeId?: number; priority: ServiceTask['priority']; plannedMinutes?: number; dueAt?: string }) {
  return unwrap<ServiceTask>(await api.post('/services/tasks', payload));
}
export async function updateServiceTaskStatus(id: number, status: ServiceTask['status']) {
  return unwrap<ServiceTask>(await api.patch(`/services/tasks/${id}/status`, { status }));
}
export async function getMyTimesheetContext(): Promise<MyTimesheetContext> {
  return unwrap<MyTimesheetContext>(await api.get('/services/timesheets/me/context'));
}
export async function getMyServiceTimesheets(): Promise<{ employee: WorkforceEmployee; entries: ServiceTimesheetEntry[] }> {
  return unwrap(await api.get('/services/timesheets/me?limit=150'));
}
export async function submitMyServiceTimesheet(payload: { projectId: number; taskId?: number; workDate?: string; minutes: number; billable: boolean; description?: string }) {
  return unwrap<ServiceTimesheetEntry>(await api.post('/services/timesheets/me', payload));
}
export async function getServiceTimesheets(): Promise<ServiceTimesheetEntry[]> {
  return unwrap<ServiceTimesheetEntry[]>(await api.get('/services/timesheets?limit=250'));
}
export async function decideServiceTimesheet(id: number, decision: 'approved' | 'rejected', reason?: string) {
  return unwrap<ServiceTimesheetEntry>(await api.post(`/services/timesheets/${id}/decision`, { decision, reason }));
}
export async function getServicePlanning(): Promise<ServicePlanningAllocation[]> {
  return unwrap<ServicePlanningAllocation[]>(await api.get('/services/planning'));
}
export async function createServicePlanning(payload: { employeeId: number; projectId?: number; taskId?: number; startAt: string; endAt: string; notes?: string }) {
  return unwrap<ServicePlanningAllocation>(await api.post('/services/planning', payload));
}
export async function updateServicePlanningStatus(id: number, status: ServicePlanningAllocation['status']) {
  return unwrap<ServicePlanningAllocation>(await api.patch(`/services/planning/${id}/status`, { status }));
}
