import api from './api';
import type { WorkforceEmployee, WorkforceOutlet } from './workforceService';

export interface ServiceCustomer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  outlet_id?: number | null;
  outlet_name?: string | null;
}

export interface ServiceContextProject { id: number; code: string; name: string; status: string; }
export interface ServiceContextTask { id: number; project_id: number; title: string; status: string; project_code?: string; project_name?: string; }

export interface FieldServiceContext {
  employees: WorkforceEmployee[];
  customers: ServiceCustomer[];
  outlets: WorkforceOutlet[];
  projects: ServiceContextProject[];
  tasks: ServiceContextTask[];
}

export interface FieldServiceOrder {
  id: number;
  tenant_id: number;
  outlet_id?: number | null;
  customer_id: number;
  project_id?: number | null;
  task_id?: number | null;
  assigned_employee_id?: number | null;
  planning_allocation_id?: number | null;
  code: string;
  title: string;
  description?: string | null;
  service_address: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'draft' | 'scheduled' | 'en_route' | 'on_site' | 'completed' | 'cancelled';
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  dispatched_at?: string | null;
  arrived_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  resolution_note?: string | null;
  customer_name?: string;
  customer_phone?: string | null;
  outlet_name?: string | null;
  employee_code?: string | null;
  employee_name?: string | null;
  project_code?: string | null;
  project_name?: string | null;
  task_title?: string | null;
}

export interface ServiceEvent {
  id: number;
  event_type: string;
  notes?: string | null;
  occurred_at?: string;
  created_at?: string;
  actor_name?: string | null;
  employee_name?: string | null;
  actor_employee_name?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  payload?: Record<string, unknown>;
}

export interface HelpdeskContext {
  employees: WorkforceEmployee[];
  customers: ServiceCustomer[];
  outlets: WorkforceOutlet[];
  projects: ServiceContextProject[];
  fieldOrders: Array<{ id: number; code: string; title: string; customer_id: number; project_id?: number | null; status: string }>;
}

export interface HelpdeskSla {
  id: number;
  name: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent' | null;
  first_response_minutes: number;
  resolution_minutes: number;
  is_active: boolean;
}

export type HelpdeskStatus = 'new' | 'open' | 'pending' | 'customer_wait' | 'resolved' | 'closed' | 'cancelled';

export interface HelpdeskTicket {
  id: number;
  code: string;
  subject: string;
  description?: string | null;
  customer_id?: number | null;
  project_id?: number | null;
  field_order_id?: number | null;
  sla_policy_id?: number | null;
  assigned_employee_id?: number | null;
  requester_name?: string | null;
  requester_email?: string | null;
  requester_phone?: string | null;
  channel: 'internal' | 'web' | 'email' | 'whatsapp' | 'phone' | 'social';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: HelpdeskStatus;
  first_response_due_at?: string | null;
  resolution_due_at?: string | null;
  first_responded_at?: string | null;
  resolution_note?: string | null;
  customer_name?: string | null;
  employee_name?: string | null;
  project_code?: string | null;
  project_name?: string | null;
  field_order_code?: string | null;
  sla_name?: string | null;
  first_response_breached?: boolean;
  resolution_breached?: boolean;
  message_count?: number;
}

export interface HelpdeskMessage {
  id: number;
  ticket_id: number;
  direction: 'inbound' | 'outbound' | 'internal';
  visibility: 'public' | 'internal';
  body: string;
  author_name?: string | null;
  employee_name?: string | null;
  created_at: string;
}

export interface AppointmentContext {
  employees: WorkforceEmployee[];
  customers: ServiceCustomer[];
  outlets: WorkforceOutlet[];
}

export interface AppointmentType {
  id: number;
  outlet_id?: number | null;
  code: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  is_active: boolean;
  outlet_name?: string | null;
}

export type AppointmentStatus = 'booked' | 'confirmed' | 'checked_in' | 'completed' | 'no_show' | 'cancelled';
export interface Appointment {
  id: number;
  outlet_id: number;
  appointment_type_id: number;
  customer_id: number;
  assigned_employee_id: number;
  planning_allocation_id: number;
  code: string;
  title: string;
  notes?: string | null;
  status: AppointmentStatus;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  completion_note?: string | null;
  cancellation_reason?: string | null;
  type_code?: string;
  type_name?: string;
  customer_name?: string;
  employee_code?: string;
  employee_name?: string;
  outlet_name?: string;
  planning_status?: string;
}

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export async function getFieldServiceContext(): Promise<FieldServiceContext> {
  return unwrap(await api.get('/services/field-service/context'));
}
export async function getFieldServiceOrders(): Promise<FieldServiceOrder[]> {
  return unwrap(await api.get('/services/field-service/orders'));
}
export async function getMyFieldServiceOrders(): Promise<{ employee: WorkforceEmployee; orders: FieldServiceOrder[] }> {
  return unwrap(await api.get('/services/field-service/me'));
}
export async function createFieldServiceOrder(payload: { code: string; title: string; customerId: number; projectId?: number; taskId?: number; serviceAddress?: string; contactName?: string; contactPhone?: string; priority: FieldServiceOrder['priority']; description?: string; notes?: string }) {
  return unwrap<FieldServiceOrder>(await api.post('/services/field-service/orders', payload));
}
export async function scheduleFieldServiceOrder(id: number, payload: { employeeId: number; startAt: string; endAt: string; notes?: string }) {
  return unwrap<{ order: FieldServiceOrder; planning: unknown }>(await api.post(`/services/field-service/orders/${id}/schedule`, payload));
}
export async function cancelFieldServiceOrder(id: number, reason: string) {
  return unwrap<FieldServiceOrder>(await api.post(`/services/field-service/orders/${id}/cancel`, { reason }));
}
export async function getFieldServiceEvents(id: number): Promise<ServiceEvent[]> {
  return unwrap(await api.get(`/services/field-service/orders/${id}/events`));
}
export async function departMyFieldServiceOrder(id: number, payload: { latitude?: number; longitude?: number; notes?: string }) {
  return unwrap<FieldServiceOrder>(await api.post(`/services/field-service/${id}/depart`, payload));
}
export async function arriveMyFieldServiceOrder(id: number, payload: { latitude?: number; longitude?: number; notes?: string }) {
  return unwrap<FieldServiceOrder>(await api.post(`/services/field-service/${id}/arrive`, payload));
}
export async function completeMyFieldServiceOrder(id: number, payload: { latitude?: number; longitude?: number; resolution: string; notes?: string }) {
  return unwrap<FieldServiceOrder>(await api.post(`/services/field-service/${id}/complete`, payload));
}

export async function getHelpdeskContext(): Promise<HelpdeskContext> {
  return unwrap(await api.get('/services/helpdesk/context'));
}
export async function getHelpdeskSlaPolicies(): Promise<HelpdeskSla[]> {
  return unwrap(await api.get('/services/helpdesk/slas'));
}
export async function createHelpdeskSlaPolicy(payload: { name: string; priority?: HelpdeskSla['priority']; firstResponseMinutes: number; resolutionMinutes: number }) {
  return unwrap<HelpdeskSla>(await api.post('/services/helpdesk/slas', payload));
}
export async function getHelpdeskTickets(): Promise<HelpdeskTicket[]> {
  return unwrap(await api.get('/services/helpdesk/tickets?limit=250'));
}
export async function getMyHelpdeskTickets(): Promise<{ employee: WorkforceEmployee; tickets: HelpdeskTicket[] }> {
  return unwrap(await api.get('/services/helpdesk/me'));
}
export async function createHelpdeskTicket(payload: { code: string; subject: string; description?: string; customerId?: number; projectId?: number; fieldOrderId?: number; slaPolicyId?: number; requesterName?: string; requesterEmail?: string; requesterPhone?: string; channel: HelpdeskTicket['channel']; priority: HelpdeskTicket['priority']; initialMessage?: string }) {
  return unwrap<HelpdeskTicket>(await api.post('/services/helpdesk/tickets', payload));
}
export async function assignHelpdeskTicket(id: number, employeeId: number) {
  return unwrap<HelpdeskTicket>(await api.post(`/services/helpdesk/tickets/${id}/assign`, { employeeId }));
}
export async function updateHelpdeskTicketStatus(id: number, status: HelpdeskStatus, note?: string) {
  return unwrap<HelpdeskTicket>(await api.patch(`/services/helpdesk/tickets/${id}/status`, { status, note }));
}
export async function updateMyHelpdeskTicketStatus(id: number, status: HelpdeskStatus, note?: string) {
  return unwrap<HelpdeskTicket>(await api.patch(`/services/helpdesk/me/${id}/status`, { status, note }));
}
export async function getHelpdeskMessages(id: number): Promise<HelpdeskMessage[]> {
  return unwrap(await api.get(`/services/helpdesk/tickets/${id}/messages`));
}
export async function getMyHelpdeskMessages(id: number): Promise<HelpdeskMessage[]> {
  return unwrap(await api.get(`/services/helpdesk/me/${id}/messages`));
}
export async function addHelpdeskMessage(id: number, payload: { body: string; direction: HelpdeskMessage['direction']; visibility: HelpdeskMessage['visibility'] }) {
  return unwrap<HelpdeskMessage>(await api.post(`/services/helpdesk/tickets/${id}/messages`, payload));
}
export async function replyMyHelpdeskTicket(id: number, payload: { body: string; visibility: HelpdeskMessage['visibility'] }) {
  return unwrap<HelpdeskMessage>(await api.post(`/services/helpdesk/me/${id}/reply`, payload));
}
export async function getHelpdeskEvents(id: number): Promise<ServiceEvent[]> {
  return unwrap(await api.get(`/services/helpdesk/tickets/${id}/events`));
}

export async function getAppointmentContext(): Promise<AppointmentContext> {
  return unwrap(await api.get('/services/appointments/context'));
}
export async function getAppointmentTypes(): Promise<AppointmentType[]> {
  return unwrap(await api.get('/services/appointments/types'));
}
export async function createAppointmentType(payload: { code: string; name: string; outletId?: number; description?: string; durationMinutes: number; bufferBeforeMinutes: number; bufferAfterMinutes: number }) {
  return unwrap<AppointmentType>(await api.post('/services/appointments/types', payload));
}
export async function getAppointments(): Promise<Appointment[]> {
  return unwrap(await api.get('/services/appointments'));
}
export async function getMyAppointments(): Promise<Appointment[]> {
  return unwrap(await api.get('/services/appointments/me'));
}
export async function createAppointment(payload: { appointmentTypeId: number; customerId: number; employeeId: number; startAt: string; outletId?: number; title?: string; notes?: string }) {
  return unwrap<Appointment>(await api.post('/services/appointments', payload));
}
export async function confirmAppointment(id: number, notes?: string) {
  return unwrap<Appointment>(await api.post(`/services/appointments/${id}/confirm`, { notes }));
}
export async function rescheduleAppointment(id: number, payload: { startAt: string; employeeId?: number; notes?: string }) {
  return unwrap<Appointment>(await api.post(`/services/appointments/${id}/reschedule`, payload));
}
export async function checkInAppointment(id: number, notes?: string) {
  return unwrap<Appointment>(await api.post(`/services/appointments/${id}/check-in`, { notes }));
}
export async function completeAppointment(id: number, completionNote?: string) {
  return unwrap<Appointment>(await api.post(`/services/appointments/${id}/complete`, { completionNote }));
}
export async function noShowAppointment(id: number) {
  return unwrap<Appointment>(await api.post(`/services/appointments/${id}/no-show`, {}));
}
export async function cancelAppointment(id: number, reason: string) {
  return unwrap<Appointment>(await api.post(`/services/appointments/${id}/cancel`, { reason }));
}
export async function checkInMyAppointment(id: number, notes?: string) {
  return unwrap<Appointment>(await api.post(`/services/appointments/me/${id}/check-in`, { notes }));
}
export async function completeMyAppointment(id: number, completionNote?: string) {
  return unwrap<Appointment>(await api.post(`/services/appointments/me/${id}/complete`, { completionNote }));
}
export async function getAppointmentEvents(id: number): Promise<ServiceEvent[]> {
  return unwrap(await api.get(`/services/appointments/${id}/events`));
}
