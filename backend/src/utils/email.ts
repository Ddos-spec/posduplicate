export const normalizeEmailIdentity = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
};
