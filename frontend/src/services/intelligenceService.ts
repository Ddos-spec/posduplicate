import api from './api';

export interface ReplenishmentRecommendation {
  inventoryId: number;
  outletId: number;
  outletName: string;
  inventoryName: string;
  unit: string;
  currentStock: number;
  minStock: number;
  averageDailyUsage: number;
  targetStock: number;
  recommendedQuantity: number;
  supplierId: number | null;
  supplierName: string | null;
  evidence: string;
}

export interface IntelligenceSnapshot {
  dataCutoff: string;
  provenance: { observed: string[]; derived: string[]; inferred: string[]; unavailable: string[] };
  sales: { last30Days: number; previous30Days: number; completedTransactions: number; changeRate: number | null };
  cashflow: {
    receivableDue30: number;
    payableDue30: number;
    receivableOverdue: number;
    payableOverdue: number;
    scheduledNet30: number;
    interpretation: string;
  };
  margin: {
    assessedItems: number;
    leakageCount: number;
    leakage: Array<{ itemId: number; name: string; price: number; cost: number; marginAmount: number; marginRate: number | null }>;
  };
  demand: { assessedInventory: number; replenishment: ReplenishmentRecommendation[] };
  findings: IntelligenceFinding[];
}

export interface IntelligenceFinding {
  id?: number | string;
  finding_type?: string;
  findingType?: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  entity_id?: string | null;
  entityId?: string;
  title: string;
  explanation: string;
  observed: Record<string, unknown>;
  derived: Record<string, unknown>;
  confidence: number | string;
  recommended_action?: Record<string, unknown>;
  recommendedAction?: Record<string, unknown>;
}

export interface AgentAction {
  id: number | string;
  finding_id: number | string | null;
  action_type: 'create_replenishment_rfq';
  payload: Record<string, unknown>;
  status: 'pending_approval' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed' | 'cancelled';
  result: Record<string, unknown> | null;
  last_error?: string | null;
  review_note?: string | null;
  requested_at: string;
  events?: Array<Record<string, unknown>>;
}

export interface IntelligenceDashboard {
  snapshot: IntelligenceSnapshot;
  latestRun: Record<string, unknown> | null;
  findings: IntelligenceFinding[];
  actions: AgentAction[];
}

export interface CopilotResponse {
  mode: 'deterministic_evidence';
  intent: string;
  answer: string;
  confidence: number;
  dataCutoff: string;
  evidence: Array<Record<string, unknown>>;
  limitations: string[];
}

const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export async function getIntelligenceDashboard(): Promise<IntelligenceDashboard> {
  return unwrap(await api.get('/intelligence'));
}

export async function runIntelligenceAnalysis(): Promise<{ run: Record<string, unknown>; snapshot: IntelligenceSnapshot }> {
  return unwrap(await api.post('/intelligence/runs'));
}

export async function askIntelligenceCopilot(question: string): Promise<CopilotResponse> {
  return unwrap(await api.post('/intelligence/copilot/ask', { question }));
}

export async function requestReplenishmentAction(
  inventoryId: number,
  findingId?: number | string | null,
  idempotencyKey = `replenishment:${inventoryId}:${crypto.randomUUID()}`,
): Promise<{ action: AgentAction; reused: boolean }> {
  return unwrap(await api.post('/intelligence/actions', { inventoryId, findingId }, {
    headers: { 'Idempotency-Key': idempotencyKey },
  }));
}

export async function approveAgentAction(id: number | string, note: string): Promise<AgentAction> {
  return unwrap(await api.post(`/intelligence/actions/${id}/approve`, { note }));
}

export async function rejectAgentAction(id: number | string, note: string): Promise<AgentAction> {
  return unwrap(await api.post(`/intelligence/actions/${id}/reject`, { note }));
}

export async function executeAgentAction(id: number | string): Promise<{ action: AgentAction; reused: boolean }> {
  return unwrap(await api.post(`/intelligence/actions/${id}/execute`));
}
