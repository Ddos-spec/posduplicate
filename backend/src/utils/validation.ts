/**
 * Validation utilities for safe input parsing
 */

/**
 * Safely parse integer with NaN handling
 */
export const safeParseInt = (value: unknown, defaultValue: number = 0): number => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Safely parse float with NaN handling
 */
export const safeParseFloat = (value: unknown, defaultValue: number = 0): number => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Validate and parse date string
 * Returns null if invalid
 */
export const safeParseDate = (value: unknown): Date | null => {
  if (!value || value === '') {
    return null;
  }
  const date = new Date(String(value));
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Validate date range
 */
export const validateDateRange = (
  dateFrom: unknown,
  dateTo: unknown
): { from: Date | null; to: Date | null; isValid: boolean; error?: string } => {
  const from = safeParseDate(dateFrom);
  const to = safeParseDate(dateTo);

  if (dateFrom && !from) {
    return { from: null, to: null, isValid: false, error: 'Invalid date_from format' };
  }

  if (dateTo && !to) {
    return { from: null, to: null, isValid: false, error: 'Invalid date_to format' };
  }

  if (from && to && from > to) {
    return { from, to, isValid: false, error: 'date_from cannot be after date_to' };
  }

  return { from, to, isValid: true };
};

/**
 * Validate required fields
 */
export const validateRequired = (
  fields: Record<string, unknown>,
  requiredFields: string[]
): { isValid: boolean; missing: string[] } => {
  const missing = requiredFields.filter(
    field => fields[field] === undefined || fields[field] === null || fields[field] === ''
  );
  return {
    isValid: missing.length === 0,
    missing
  };
};

/**
 * Generate idempotency key from request data
 */
export const generateIdempotencyKey = (prefix: string, orderId: string): string => {
  return `${prefix}-${orderId}`;
};
