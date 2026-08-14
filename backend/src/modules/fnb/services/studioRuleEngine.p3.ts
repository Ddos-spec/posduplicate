export const STUDIO_ENTITY_TYPES = ['customer', 'crm_opportunity', 'sales_order', 'inventory', 'equipment'] as const;
export const STUDIO_DATA_TYPES = ['text', 'number', 'boolean', 'date', 'select'] as const;
export const STUDIO_RULE_OPERATORS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'exists'] as const;
export const STUDIO_ACTION_TYPES = ['set_field', 'flag', 'require_approval'] as const;

export type StudioEntityType = (typeof STUDIO_ENTITY_TYPES)[number];
export type StudioDataType = (typeof STUDIO_DATA_TYPES)[number];
export type StudioRuleOperator = (typeof STUDIO_RULE_OPERATORS)[number];
export type StudioActionType = (typeof STUDIO_ACTION_TYPES)[number];

export interface StudioRuleCondition {
  field: string;
  operator: StudioRuleOperator;
  value?: unknown;
}

export interface StudioRuleAction {
  type: StudioActionType;
  field?: string;
  value?: unknown;
  message?: string;
}

export class StudioValidationError extends Error {
  status = 400;
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'StudioValidationError';
    this.code = code;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{1,79}$/;

export const assertStudioEntityType = (value: unknown): StudioEntityType => {
  if (!STUDIO_ENTITY_TYPES.includes(value as StudioEntityType)) {
    throw new StudioValidationError('Studio entity type is not supported', 'STUDIO_ENTITY_INVALID');
  }
  return value as StudioEntityType;
};

export const assertStudioFieldKey = (value: unknown, code = 'STUDIO_FIELD_KEY_INVALID') => {
  const field = String(value || '').trim();
  if (!FIELD_KEY_PATTERN.test(field)) {
    throw new StudioValidationError('Field key must use lowercase letters, numbers, and underscores', code);
  }
  return field;
};

export const normalizeStudioValue = (
  dataType: StudioDataType,
  value: unknown,
  required: boolean,
  options: unknown[] = [],
) => {
  if (value === null || value === undefined || value === '') {
    if (required) throw new StudioValidationError('A value is required for this field', 'STUDIO_VALUE_REQUIRED');
    return null;
  }

  if (dataType === 'text') {
    const text = String(value).trim();
    if (text.length > 2000) throw new StudioValidationError('Text value is too long', 'STUDIO_VALUE_TOO_LONG');
    return text;
  }

  if (dataType === 'number') {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) throw new StudioValidationError('Number value is invalid', 'STUDIO_NUMBER_INVALID');
    return number;
  }

  if (dataType === 'boolean') {
    if (typeof value !== 'boolean') throw new StudioValidationError('Boolean value must be true or false', 'STUDIO_BOOLEAN_INVALID');
    return value;
  }

  if (dataType === 'date') {
    const date = String(value);
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw new StudioValidationError('Date value must use YYYY-MM-DD', 'STUDIO_DATE_INVALID');
    }
    return date;
  }

  const selected = String(value);
  const allowed = options.map(String);
  if (!allowed.includes(selected)) throw new StudioValidationError('Selected value is not in the field options', 'STUDIO_SELECT_INVALID');
  return selected;
};

export const normalizeRuleDefinition = (conditionInput: unknown, actionInput: unknown) => {
  if (!isRecord(conditionInput)) throw new StudioValidationError('Rule condition must be an object', 'STUDIO_CONDITION_INVALID');
  if (!isRecord(actionInput)) throw new StudioValidationError('Rule action must be an object', 'STUDIO_ACTION_INVALID');

  const field = assertStudioFieldKey(conditionInput.field, 'STUDIO_CONDITION_FIELD_INVALID');
  const operator = String(conditionInput.operator || '') as StudioRuleOperator;
  if (!STUDIO_RULE_OPERATORS.includes(operator)) {
    throw new StudioValidationError('Rule operator is not supported', 'STUDIO_OPERATOR_INVALID');
  }
  if (operator !== 'exists' && !Object.prototype.hasOwnProperty.call(conditionInput, 'value')) {
    throw new StudioValidationError('This rule operator requires a comparison value', 'STUDIO_CONDITION_VALUE_REQUIRED');
  }

  const actionType = String(actionInput.type || '') as StudioActionType;
  if (!STUDIO_ACTION_TYPES.includes(actionType)) {
    throw new StudioValidationError('Rule action type is not supported', 'STUDIO_ACTION_TYPE_INVALID');
  }

  const condition: StudioRuleCondition = { field, operator };
  if (operator !== 'exists') condition.value = conditionInput.value;

  const action: StudioRuleAction = { type: actionType };
  if (actionType === 'set_field') {
    action.field = assertStudioFieldKey(actionInput.field, 'STUDIO_ACTION_FIELD_INVALID');
    if (!Object.prototype.hasOwnProperty.call(actionInput, 'value')) {
      throw new StudioValidationError('set_field requires a value', 'STUDIO_ACTION_VALUE_REQUIRED');
    }
    action.value = actionInput.value;
  } else {
    const message = String(actionInput.message || '').trim();
    if (!message || message.length > 600) {
      throw new StudioValidationError('Flag and approval actions require a message up to 600 characters', 'STUDIO_ACTION_MESSAGE_INVALID');
    }
    action.message = message;
  }

  return { condition, action };
};

const comparableNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const evaluateStudioCondition = (condition: StudioRuleCondition, data: Record<string, unknown>) => {
  const actual = data[condition.field];
  const expected = condition.value;

  switch (condition.operator) {
    case 'exists': return actual !== null && actual !== undefined && actual !== '';
    case 'eq': return actual === expected || String(actual) === String(expected);
    case 'neq': return !(actual === expected || String(actual) === String(expected));
    case 'contains': return typeof actual === 'string'
      ? actual.toLocaleLowerCase().includes(String(expected).toLocaleLowerCase())
      : Array.isArray(actual) && actual.some((item) => item === expected || String(item) === String(expected));
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const left = comparableNumber(actual);
      const right = comparableNumber(expected);
      if (left === null || right === null) return false;
      if (condition.operator === 'gt') return left > right;
      if (condition.operator === 'gte') return left >= right;
      if (condition.operator === 'lt') return left < right;
      return left <= right;
    }
    default: return false;
  }
};
