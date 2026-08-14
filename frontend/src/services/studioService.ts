import api from './api';

export type StudioEntityType = 'customer' | 'crm_opportunity' | 'sales_order' | 'inventory' | 'equipment';
export type StudioDataType = 'text' | 'number' | 'boolean' | 'date' | 'select';
export type StudioRuleOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'exists';
export type StudioActionType = 'set_field' | 'flag' | 'require_approval';

export interface StudioField {
  id: number | string;
  entity_type: StudioEntityType;
  field_key: string;
  label: string;
  data_type: StudioDataType;
  is_required: boolean;
  options: string[];
  status: 'active' | 'archived';
  created_at: string;
}
export interface StudioRule {
  id: number | string;
  entity_type: StudioEntityType;
  name: string;
  trigger_event: 'created' | 'updated' | 'status_changed' | 'manual';
  condition: { field: string; operator: StudioRuleOperator; value?: unknown };
  action: { type: StudioActionType; field?: string; value?: unknown; message?: string };
  status: 'draft' | 'active' | 'archived';
  created_at: string;
}

export interface StudioExecution {
  id: number | string;
  rule_id: number | string;
  rule_name?: string;
  ruleName?: string;
  entity_type: StudioEntityType;
  record_key: string;
  execution_status: 'applied' | 'review_required' | 'skipped';
  output: Record<string, unknown>;
  created_at: string;
}

export interface StudioWorkspace {
  fields: StudioField[];
  rules: StudioRule[];
  executions: StudioExecution[];
  events: Array<Record<string, unknown>>;
  summary: { activeFields: number; activeRules: number; reviewRequired: number };
}

const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export async function getStudioWorkspace(): Promise<StudioWorkspace> {
  return unwrap(await api.get('/studio'));
}

export async function createStudioField(payload: {
  entityType: StudioEntityType;
  fieldKey: string;
  label: string;
  dataType: StudioDataType;
  isRequired: boolean;
  options: string[];
}): Promise<StudioField> {
  return unwrap(await api.post('/studio/fields', payload));
}

export async function updateStudioFieldStatus(id: number | string, status: 'active' | 'archived'): Promise<StudioField> {
  return unwrap(await api.patch(`/studio/fields/${id}/status`, { status }));
}

export async function saveStudioValue(payload: { fieldId: number | string; recordKey: string; value: unknown }) {
  return unwrap<Record<string, unknown>>(await api.put('/studio/values', payload));
}

export async function getStudioValues(entityType: StudioEntityType, recordKey: string) {
  return unwrap<{ entityType: StudioEntityType; recordKey: string; values: Array<Record<string, unknown>> }>(
    await api.get(`/studio/values/${entityType}/${encodeURIComponent(recordKey)}`),
  );
}

export async function createStudioRule(payload: {
  entityType: StudioEntityType;
  name: string;
  triggerEvent: 'created' | 'updated' | 'status_changed' | 'manual';
  condition: { field: string; operator: StudioRuleOperator; value?: unknown };
  action: { type: StudioActionType; field?: string; value?: unknown; message?: string };
}): Promise<StudioRule> {
  return unwrap(await api.post('/studio/rules', payload));
}

export async function updateStudioRuleStatus(id: number | string, status: 'draft' | 'active' | 'archived'): Promise<StudioRule> {
  return unwrap(await api.patch(`/studio/rules/${id}/status`, { status }));
}

export async function previewStudioRules(payload: {
  entityType: StudioEntityType;
  triggerEvent: 'created' | 'updated' | 'status_changed' | 'manual';
  data: Record<string, unknown>;
}) {
  return unwrap<{ matched: Array<{ id: number | string; name: string; action: Record<string, unknown> }>; matchedCount: number; applied: false }>(
    await api.post('/studio/rules/preview', payload),
  );
}

export async function applyStudioRules(payload: {
  entityType: StudioEntityType;
  triggerEvent: 'created' | 'updated' | 'status_changed' | 'manual';
  recordKey: string;
  data: Record<string, unknown>;
}) {
  return unwrap<{ matchedCount: number; executions: StudioExecution[]; applied: true }>(
    await api.post('/studio/rules/apply', payload),
  );
}
