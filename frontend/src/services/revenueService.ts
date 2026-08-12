import api from './api';

export type CrmStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface RevenueSummary {
  opportunities: Array<{ stage: CrmStage; count: number; value: number | string }>;
  quotations: Array<{ status: string; count: number; value: number | string }>;
  orders: Array<{ status: string; count: number; value: number | string }>;
  pipelineValue: number;
  wonValue: number;
}

export interface CrmOpportunity {
  id: number | string;
  tenant_id: number;
  outlet_id: number | null;
  customer_id: number | null;
  title: string;
  stage: CrmStage;
  probability: number;
  expected_revenue: number | string;
  source: string | null;
  owner_user_id: number | null;
  next_activity_at: string | null;
  notes: string | null;
  lost_reason: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  owner_name?: string | null;
  open_activities?: number;
  updated_at: string;
}

export interface CustomerLite {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  outlet_id?: number | null;
}

export interface QuotationItemInput {
  itemId?: number | null;
  description?: string;
  quantity: number;
  unitPrice?: number;
  discountAmount?: number;
  taxRate?: number;
}

export interface SalesQuotation {
  id: number | string;
  quotation_number: string;
  status: string;
  customer_id: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  valid_until: string | null;
  currency: string;
  subtotal: number | string;
  discount_amount: number | string;
  tax_amount: number | string;
  total: number | string;
  notes?: string | null;
  items: Array<{
    id: number | string;
    itemId?: number | null;
    description: string;
    quantity: number | string;
    unitPrice: number | string;
    lineTotal: number | string;
  }>;
}

export interface SalesOrder {
  id: number | string;
  sales_order_number: string;
  status: string;
  customer_name?: string | null;
  total: number | string;
  created_at: string;
}

export interface Customer360 {
  customer: CustomerLite & { date_of_birth?: string | null };
  metrics: {
    lifetimeValue: number;
    transactionCount: number;
    averageOrderValue: number;
    outstandingReceivable: number;
    openPipelineValue: number;
    wonPipelineValue: number;
    lastTransactionAt: string | null;
  };
  recentTransactions: Array<{
    id: number;
    transaction_number: string;
    total: number | string;
    status: string;
    created_at: string;
  }>;
  receivables: Array<{
    id: number;
    invoice_number: string;
    due_date: string;
    balance: number | string;
    status: string;
  }>;
  opportunities: CrmOpportunity[];
  salesOrders: SalesOrder[];
  loyalty: {
    wallet: null | {
      id: number | string;
      points_balance: number | string;
      monetary_balance: number | string;
      lifetime_points_earned: number | string;
      lifetime_points_redeemed: number | string;
    };
    ledger: Array<Record<string, unknown>>;
  };
}

const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export async function getRevenueSummary(): Promise<RevenueSummary> {
  return unwrap(await api.get('/revenue/summary'));
}

export async function getRevenueCustomers(): Promise<CustomerLite[]> {
  const response = await api.get('/customers');
  return (response.data.data ?? []) as CustomerLite[];
}

export async function getCrmOpportunities(): Promise<CrmOpportunity[]> {
  return unwrap(await api.get('/revenue/crm/opportunities'));
}

export async function createCrmOpportunity(payload: {
  title: string;
  customerId?: number | null;
  outletId?: number | null;
  stage?: CrmStage;
  probability?: number;
  expectedRevenue?: number;
  source?: string;
  nextActivityAt?: string | null;
  notes?: string;
}): Promise<CrmOpportunity> {
  return unwrap(await api.post('/revenue/crm/opportunities', payload));
}

export async function moveCrmOpportunity(id: number | string, stage: CrmStage): Promise<CrmOpportunity> {
  return unwrap(await api.patch(`/revenue/crm/opportunities/${id}/stage`, { stage }));
}

export async function createCrmActivity(id: number | string, payload: { summary: string; dueAt?: string | null; activityType?: string }): Promise<void> {
  await api.post(`/revenue/crm/opportunities/${id}/activities`, payload);
}

export async function getQuotations(): Promise<SalesQuotation[]> {
  return unwrap(await api.get('/revenue/quotations'));
}

export async function createQuotation(payload: {
  customerId?: number | null;
  outletId?: number | null;
  validUntil?: string | null;
  notes?: string;
  opportunityId?: number | string | null;
  items: QuotationItemInput[];
}): Promise<SalesQuotation> {
  return unwrap(await api.post('/revenue/quotations', payload));
}

export async function updateQuotationStatus(id: number | string, status: string): Promise<SalesQuotation> {
  return unwrap(await api.patch(`/revenue/quotations/${id}/status`, { status }));
}

export async function convertQuotation(id: number | string): Promise<SalesOrder> {
  return unwrap(await api.post(`/revenue/quotations/${id}/convert`));
}

export async function getSalesOrders(): Promise<SalesOrder[]> {
  return unwrap(await api.get('/revenue/sales-orders'));
}

export async function getCustomer360(customerId: number): Promise<Customer360> {
  return unwrap(await api.get(`/revenue/customer-360/${customerId}`));
}

export async function adjustLoyalty(customerId: number, payload: {
  entryType?: 'earn' | 'redeem' | 'adjustment' | 'expiry' | 'refund';
  pointsDelta?: number;
  monetaryDelta?: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<void> {
  await api.post(`/revenue/loyalty/${customerId}/adjust`, payload);
}
