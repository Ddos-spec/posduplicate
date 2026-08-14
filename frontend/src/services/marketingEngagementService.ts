import api from './api';

export type MarketingEventStatus = 'draft' | 'published' | 'closed' | 'cancelled';
export type MarketingRegistrationStatus = 'registered' | 'checked_in' | 'cancelled' | 'no_show';
export type MarketingSurveyStatus = 'draft' | 'published' | 'closed' | 'archived';
export type MarketingSurveyQuestionType = 'short_text' | 'long_text' | 'single_choice' | 'multiple_choice' | 'rating' | 'nps';

export interface MarketingEvent {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  status: MarketingEventStatus;
  starts_at: string;
  ends_at: string;
  venue?: string | null;
  capacity?: number | null;
  registration_open: boolean;
  occupied_seats: number;
  registration_count: number;
}

export interface MarketingEventRegistration {
  id: number;
  event_id: number;
  customer_id?: number | null;
  customer_name?: string | null;
  attendee_name: string;
  attendee_email?: string | null;
  attendee_phone?: string | null;
  seats: number;
  status: MarketingRegistrationStatus;
  registered_at: string;
  checked_in_at?: string | null;
  cancelled_at?: string | null;
}

export interface MarketingSurveyQuestion {
  id?: number;
  position?: number;
  question_type?: MarketingSurveyQuestionType;
  type?: MarketingSurveyQuestionType;
  prompt: string;
  required?: boolean;
  options?: string[];
}

export interface MarketingSurvey {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  status: MarketingSurveyStatus;
  question_count?: number;
  response_count?: number;
  questions?: MarketingSurveyQuestion[];
}

export interface MarketingSurveyResponse {
  id: number;
  survey_id: number;
  customer_id?: number | null;
  customer_name?: string | null;
  respondent_name?: string | null;
  respondent_email?: string | null;
  submitted_at?: string | null;
  answers: Array<{ question_id: number; answer: unknown }>;
}

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export const getMarketingEvents = async () => unwrap<MarketingEvent[]>(await api.get('/medsos/engagement/events'));
export const createMarketingEvent = async (payload: {
  slug: string; name: string; description?: string; startsAt: string; endsAt: string; venue?: string; capacity?: number | null;
}) => unwrap<MarketingEvent>(await api.post('/medsos/engagement/events', payload));
export const setMarketingEventStatus = async (id: number, status: MarketingEventStatus) =>
  unwrap<MarketingEvent>(await api.patch(`/medsos/engagement/events/${id}/status`, { status }));
export const getMarketingEventRegistrations = async (id: number) =>
  unwrap<MarketingEventRegistration[]>(await api.get(`/medsos/engagement/events/${id}/registrations`));
export const createMarketingEventRegistration = async (id: number, payload: {
  customerId?: number | null; attendeeName: string; attendeeEmail?: string; attendeePhone?: string; seats?: number;
}) => unwrap<MarketingEventRegistration>(await api.post(`/medsos/engagement/events/${id}/registrations`, payload));
export const setMarketingRegistrationStatus = async (id: number, status: MarketingRegistrationStatus) =>
  unwrap<MarketingEventRegistration>(await api.patch(`/medsos/engagement/registrations/${id}/status`, { status }));

export const getMarketingSurveys = async () => unwrap<MarketingSurvey[]>(await api.get('/medsos/engagement/surveys'));
export const getMarketingSurvey = async (id: number) => unwrap<MarketingSurvey>(await api.get(`/medsos/engagement/surveys/${id}`));
export const createMarketingSurvey = async (payload: {
  slug: string; title: string; description?: string;
  questions: Array<{ type: MarketingSurveyQuestionType; prompt: string; required?: boolean; options?: string[] }>;
}) => unwrap<MarketingSurvey>(await api.post('/medsos/engagement/surveys', payload));
export const setMarketingSurveyStatus = async (id: number, status: MarketingSurveyStatus) =>
  unwrap<MarketingSurvey>(await api.patch(`/medsos/engagement/surveys/${id}/status`, { status }));
export const getMarketingSurveyResponses = async (id: number) =>
  unwrap<MarketingSurveyResponse[]>(await api.get(`/medsos/engagement/surveys/${id}/responses`));
export const submitMarketingSurveyResponse = async (id: number, payload: {
  customerId?: number | null; respondentName?: string; respondentEmail?: string;
  answers: Array<{ questionId: number; answer: unknown }>;
}) => unwrap<MarketingSurveyResponse>(await api.post(`/medsos/engagement/surveys/${id}/responses`, payload));
