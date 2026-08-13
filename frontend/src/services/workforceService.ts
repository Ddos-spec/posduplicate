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

export interface LeaveType {
  id: number;
  tenant_id: number;
  code: string;
  name: string;
  track_balance: boolean;
  allow_negative: boolean;
  is_active: boolean;
}

export interface LeaveAllocation {
  id: number;
  tenant_id: number;
  employee_id: number;
  leave_type_id: number;
  period_start: string;
  period_end: string;
  allocated_days: number | string;
  reserved_days: number | string;
  used_days: number | string;
  available_days?: number | string;
  status: string;
  notes?: string | null;
  employee_code?: string;
  employee_name?: string;
  leave_type_code?: string;
  leave_type_name?: string;
}

export interface LeaveRequest {
  id: number;
  tenant_id: number;
  employee_id: number;
  leave_type_id: number;
  allocation_id?: number | null;
  start_date: string;
  end_date: string;
  requested_days: number | string;
  reason?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  decision_note?: string | null;
  created_at?: string;
  employee_code?: string;
  employee_name?: string;
  department?: string | null;
  position?: string | null;
  leave_type_code?: string;
  leave_type_name?: string;
}

export interface MyLeaveState {
  employee: WorkforceEmployee;
  allocations: LeaveAllocation[];
  requests: LeaveRequest[];
}

export interface RecruitmentVacancy {
  id: number;
  tenant_id: number;
  outlet_id?: number | null;
  code: string;
  title: string;
  department?: string | null;
  employment_type: string;
  headcount: number;
  status: 'draft' | 'open' | 'paused' | 'closed';
  description?: string | null;
  target_start_date?: string | null;
  outlet_name?: string | null;
  hiring_manager_name?: string | null;
  applicant_count?: number;
  hired_count?: number;
}

export interface RecruitmentApplicant {
  id: number;
  tenant_id: number;
  vacancy_id: number;
  applicant_name: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  stage: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
  resume_url?: string | null;
  notes?: string | null;
  expected_salary?: number | string | null;
  vacancy_code?: string;
  vacancy_title?: string;
  department?: string | null;
  hired_employee_code?: string | null;
  hired_employee_name?: string | null;
}

export interface RecruitmentInterview {
  id: number;
  tenant_id: number;
  applicant_id: number;
  interviewer_user_id?: number | null;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  score?: number | string | null;
  feedback?: string | null;
  applicant_name?: string;
  vacancy_title?: string;
  interviewer_name?: string | null;
}

export interface RecruitmentOffer {
  id: number;
  tenant_id: number;
  applicant_id: number;
  version: number;
  offered_salary: number | string;
  start_date?: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'withdrawn';
  notes?: string | null;
  applicant_name?: string;
  vacancy_title?: string;
  created_at?: string;
}

export interface AppraisalGoal {
  id: number;
  tenant_id: number;
  appraisal_id: number;
  title: string;
  description?: string | null;
  weight: number | string;
  self_score?: number | string | null;
  reviewer_score?: number | string | null;
  self_comment?: string | null;
  reviewer_comment?: string | null;
}

export interface AppraisalCycle {
  id: number;
  tenant_id: number;
  code: string;
  name: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'open' | 'closed';
  description?: string | null;
  appraisal_count?: number;
  completed_count?: number;
}

export interface Appraisal {
  id: number;
  tenant_id: number;
  cycle_id: number;
  employee_id: number;
  reviewer_user_id: number;
  status: 'self_review' | 'manager_review' | 'completed' | 'cancelled';
  self_summary?: string | null;
  manager_summary?: string | null;
  overall_score?: number | string | null;
  cycle_code?: string;
  cycle_name?: string;
  period_start?: string;
  period_end?: string;
  employee_code?: string;
  employee_name?: string;
  department?: string | null;
  position?: string | null;
  reviewer_name?: string;
  reviewer_email?: string;
  goals: AppraisalGoal[];
}

export interface MyAppraisalState {
  employee: WorkforceEmployee;
  appraisals: Appraisal[];
}

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export const workforceErrorMessage = (error: unknown, fallback: string) => {
  const candidate = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return candidate.response?.data?.error?.message || candidate.message || fallback;
};

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

export async function getLeaveTypes(): Promise<LeaveType[]> {
  return unwrap<LeaveType[]>(await api.get('/workforce/leave/types'));
}

export async function getMyLeave(): Promise<MyLeaveState> {
  return unwrap<MyLeaveState>(await api.get('/workforce/leave/me'));
}

export async function requestLeave(payload: { leaveTypeId: number; startDate: string; endDate: string; reason?: string }) {
  return unwrap<LeaveRequest>(await api.post('/workforce/leave/request', payload));
}

export async function cancelMyLeaveRequest(id: number) {
  return unwrap<LeaveRequest>(await api.post(`/workforce/leave/requests/${id}/cancel`));
}

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  return unwrap<LeaveRequest[]>(await api.get('/workforce/leave/requests?limit=200'));
}

export async function decideLeaveRequest(id: number, decision: 'approved' | 'rejected', note?: string) {
  return unwrap<LeaveRequest>(await api.post(`/workforce/leave/requests/${id}/decision`, { decision, note }));
}

export async function getLeaveAllocations(): Promise<LeaveAllocation[]> {
  return unwrap<LeaveAllocation[]>(await api.get('/workforce/leave/allocations?limit=250'));
}

export async function createLeaveType(payload: { code: string; name: string; trackBalance: boolean; allowNegative: boolean }) {
  return unwrap<LeaveType>(await api.post('/workforce/leave/types', payload));
}

export async function createLeaveAllocation(payload: { employeeId: number; leaveTypeId: number; allocatedDays: number; periodStart: string; periodEnd: string; notes?: string }) {
  return unwrap<LeaveAllocation>(await api.post('/workforce/leave/allocations', payload));
}

export async function getRecruitmentVacancies(): Promise<RecruitmentVacancy[]> {
  return unwrap<RecruitmentVacancy[]>(await api.get('/workforce/recruitment/vacancies'));
}

export async function createRecruitmentVacancy(payload: { code: string; title: string; department?: string; employmentType: string; headcount: number; description?: string; targetStartDate?: string }) {
  return unwrap<RecruitmentVacancy>(await api.post('/workforce/recruitment/vacancies', payload));
}

export async function updateRecruitmentVacancyStatus(id: number, status: RecruitmentVacancy['status']) {
  return unwrap<RecruitmentVacancy>(await api.patch(`/workforce/recruitment/vacancies/${id}/status`, { status }));
}

export async function getRecruitmentApplicants(): Promise<RecruitmentApplicant[]> {
  return unwrap<RecruitmentApplicant[]>(await api.get('/workforce/recruitment/applicants'));
}

export async function createRecruitmentApplicant(payload: { vacancyId: number; name: string; email?: string; phone?: string; source?: string; expectedSalary?: number; resumeUrl?: string; notes?: string }) {
  return unwrap<RecruitmentApplicant>(await api.post('/workforce/recruitment/applicants', payload));
}

export async function moveRecruitmentApplicantStage(id: number, stage: RecruitmentApplicant['stage'], note?: string) {
  return unwrap<RecruitmentApplicant>(await api.patch(`/workforce/recruitment/applicants/${id}/stage`, { stage, note }));
}

export async function getRecruitmentInterviews(): Promise<RecruitmentInterview[]> {
  return unwrap<RecruitmentInterview[]>(await api.get('/workforce/recruitment/interviews'));
}

export async function scheduleRecruitmentInterview(id: number, payload: { scheduledAt: string; durationMinutes: number; interviewerUserId?: number }) {
  return unwrap<RecruitmentInterview>(await api.post(`/workforce/recruitment/applicants/${id}/interviews`, payload));
}

export async function completeRecruitmentInterview(id: number, payload: { score?: number; feedback?: string }) {
  return unwrap<RecruitmentInterview>(await api.post(`/workforce/recruitment/interviews/${id}/complete`, payload));
}

export async function cancelRecruitmentInterview(id: number, reason?: string) {
  return unwrap<RecruitmentInterview>(await api.post(`/workforce/recruitment/interviews/${id}/cancel`, { reason }));
}

export async function getRecruitmentOffers(): Promise<RecruitmentOffer[]> {
  return unwrap<RecruitmentOffer[]>(await api.get('/workforce/recruitment/offers'));
}

export async function createRecruitmentOffer(id: number, payload: { offeredSalary: number; startDate?: string; notes?: string }) {
  return unwrap<RecruitmentOffer>(await api.post(`/workforce/recruitment/applicants/${id}/offers`, payload));
}

export async function updateRecruitmentOfferStatus(id: number, status: RecruitmentOffer['status'], note?: string) {
  return unwrap<RecruitmentOffer>(await api.patch(`/workforce/recruitment/offers/${id}/status`, { status, note }));
}

export async function hireRecruitmentApplicant(id: number, payload: { employeeId: string; userId?: number; basicSalary?: number; joinDate?: string; department?: string; position?: string }) {
  return unwrap<{ applicant: RecruitmentApplicant; employee: WorkforceEmployee; acceptedOffer: RecruitmentOffer }>(await api.post(`/workforce/recruitment/applicants/${id}/hire`, payload));
}

export async function getAppraisalCycles(): Promise<AppraisalCycle[]> {
  return unwrap<AppraisalCycle[]>(await api.get('/workforce/appraisals/cycles'));
}

export async function createAppraisalCycle(payload: { code: string; name: string; periodStart: string; periodEnd: string; description?: string }) {
  return unwrap<AppraisalCycle>(await api.post('/workforce/appraisals/cycles', payload));
}

export async function updateAppraisalCycleStatus(id: number, status: AppraisalCycle['status']) {
  return unwrap<AppraisalCycle>(await api.patch(`/workforce/appraisals/cycles/${id}/status`, { status }));
}

export async function getAppraisals(): Promise<Appraisal[]> {
  return unwrap<Appraisal[]>(await api.get('/workforce/appraisals'));
}

export async function getMyAppraisals(): Promise<MyAppraisalState> {
  return unwrap<MyAppraisalState>(await api.get('/workforce/appraisals/me'));
}

export async function createAppraisal(payload: { cycleId: number; employeeId: number; reviewerUserId: number; goals: Array<{ title: string; description?: string; weight: number }> }) {
  return unwrap<Appraisal>(await api.post('/workforce/appraisals', payload));
}

export async function submitMyAppraisal(id: number, payload: { selfSummary?: string; goals: Array<{ goalId: number; selfScore: number; selfComment?: string }> }) {
  return unwrap<Appraisal>(await api.post(`/workforce/appraisals/${id}/self-submit`, payload));
}

export async function finalizeAppraisal(id: number, payload: { managerSummary?: string; goals: Array<{ goalId: number; reviewerScore: number; reviewerComment?: string }> }) {
  return unwrap<Appraisal>(await api.post(`/workforce/appraisals/${id}/finalize`, payload));
}

export async function cancelAppraisal(id: number) {
  return unwrap<Appraisal>(await api.post(`/workforce/appraisals/${id}/cancel`));
}
