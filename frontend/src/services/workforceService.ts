import api from './api';

export interface WorkforceEmployee {
  id: number;
  tenant_id: number;
  employee_id: string;
  user_id?: number | null;
  name: string;
  department?: string | null;
  position?: string | null;
  join_date?: string | null;
  status?: string | null;
  basic_salary?: number | string | null;
  users?: { id: number; name: string; email: string; role?: string | null; is_active?: boolean | null } | null;
}

export interface AttendanceSession {
  id: number;
  tenant_id: number;
  employee_id: number;
  user_id: number;
  outlet_id: number;
  outlet_name?: string;
  employee_code?: string;
  employee_name?: string;
  department?: string | null;
  position?: string | null;
  clock_in_at: string;
  clock_out_at?: string | null;
  status: 'open' | 'closed' | 'corrected';
  source: string;
  notes?: string | null;
  duration_minutes?: number | null;
}

export interface WorkforceOutlet { id: number; name: string; }

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export async function getEmployeeDirectory(): Promise<WorkforceEmployee[]> {
  return unwrap<WorkforceEmployee[]>(await api.get('/workforce/employees?limit=250'));
}

export async function getAttendanceSessions(): Promise<AttendanceSession[]> {
  return unwrap<AttendanceSession[]>(await api.get('/workforce/attendance?limit=200'));
}

export async function getMyAttendance(): Promise<{ employee: WorkforceEmployee; sessions: AttendanceSession[]; openSession: AttendanceSession | null }> {
  return unwrap(await api.get('/workforce/attendance/me?limit=30'));
}

export async function clockIn(outletId: number, notes?: string) {
  return unwrap<AttendanceSession>(await api.post('/workforce/attendance/clock-in', { outletId, notes }));
}

export async function clockOut(notes?: string) {
  return unwrap<AttendanceSession>(await api.post('/workforce/attendance/clock-out', { notes }));
}

export async function getWorkforceOutlets(): Promise<WorkforceOutlet[]> {
  return unwrap<WorkforceOutlet[]>(await api.get('/outlets'));
}
