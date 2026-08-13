import api from './api';

export type SubscriptionPlanStatus = 'draft' | 'active' | 'archived';
export type CustomerSubscriptionStatus = 'draft' | 'active' | 'paused' | 'cancelled';
export type SubscriptionIntervalUnit = 'day' | 'week' | 'month' | 'year';

export interface SubscriptionPlanItem {
  id?: number;
  item_id: number;
  item_name?: string;
  sku?: string | null;
  quantity: number | string;
  unit_price: number | string;
  sort_order?: number;
}

export interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  status: SubscriptionPlanStatus;
  interval_unit: SubscriptionIntervalUnit;
  interval_count: number;
  currency: string;
  items: SubscriptionPlanItem[];
}

export interface CustomerSubscription {
  id: number;
  subscription_number: string;
  status: CustomerSubscriptionStatus;
  customer_id: number;
  customer_name: string;
  customer_phone?: string | null;
  outlet_id: number;
  outlet_name: string;
  plan_id?: number | null;
  plan_name?: string | null;
  interval_unit: SubscriptionIntervalUnit;
  interval_count: number;
  currency: string;
  starts_on: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  next_renewal_at: string;
  billed_total: number | string;
  renewal_count: number;
}

export interface SubscriptionSummary { active_plans: number; active_contracts: number; monthly_recurring_revenue: number | string; billed_total: number | string; }
export interface SubscriptionAutomationSettings {
  tenant_id: number;
  enabled: boolean;
  automation_user_id?: number | null;
  automation_user_name?: string | null;
  automation_user_email?: string | null;
  automation_user_role?: string | null;
  max_renewals_per_run: number;
  last_run_at?: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
}
export interface SubscriptionAutomationRunResult { skipped: boolean; reason?: string; attempted: number; succeeded: number; reused: number; failed: number; error?: string | null; }

export interface CustomerOption { id: number; name: string; phone?: string | null; outlet_id?: number | null; }
export interface ItemOption { id: number; name: string; sku?: string | null; price: number | string; outlet_id?: number | null; is_active?: boolean; }

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export const getSubscriptionSummary = async () => unwrap<SubscriptionSummary>(await api.get('/subscriptions/summary'));
export const getSubscriptionAutomationSettings = async () => unwrap<SubscriptionAutomationSettings>(await api.get('/subscriptions/automation'));
export const updateSubscriptionAutomationSettings = async (payload: { enabled: boolean; automationUserId?: number | null; maxRenewalsPerRun?: number }) =>
  unwrap<SubscriptionAutomationSettings>(await api.put('/subscriptions/automation', payload));
export const runSubscriptionAutomation = async () => unwrap<SubscriptionAutomationRunResult>(await api.post('/subscriptions/automation/run'));
export const getSubscriptionPlans = async () => unwrap<SubscriptionPlan[]>(await api.get('/subscriptions/plans'));
export const createSubscriptionPlan = async (payload: {
  code: string; name: string; description?: string; intervalUnit: SubscriptionIntervalUnit; intervalCount: number; currency?: string;
  items: Array<{ itemId: number; quantity: number; unitPrice?: number }>;
}) => unwrap<SubscriptionPlan>(await api.post('/subscriptions/plans', payload));
export const setSubscriptionPlanStatus = async (id: number, status: SubscriptionPlanStatus) =>
  unwrap<SubscriptionPlan>(await api.patch(`/subscriptions/plans/${id}/status`, { status }));

export const getCustomerSubscriptions = async () => unwrap<CustomerSubscription[]>(await api.get('/subscriptions'));
export const createCustomerSubscription = async (payload: { planId: number; customerId: number; startsOn?: string; notes?: string }) =>
  unwrap<CustomerSubscription>(await api.post('/subscriptions', payload));
export const setCustomerSubscriptionStatus = async (id: number, status: CustomerSubscriptionStatus) =>
  unwrap<CustomerSubscription>(await api.patch(`/subscriptions/${id}/status`, { status }));
export const renewCustomerSubscription = async (id: number, expectedRenewalAt: string) => unwrap<{
  reused: boolean;
  renewal: { id: number; status: string; amount: number | string; sales_order_id?: number; receivable_id?: number };
  salesOrder?: { id: number; sales_order_number: string };
  receivable?: { id: number; invoice_number: string };
}>(await api.post(`/subscriptions/${id}/renew`, { expectedRenewalAt }));

export const getSubscriptionCustomers = async () => unwrap<CustomerOption[]>(await api.get('/customers'));
export const getSubscriptionItems = async () => unwrap<ItemOption[]>(await api.get('/products'));
