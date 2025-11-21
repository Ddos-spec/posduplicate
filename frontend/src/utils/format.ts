
export const formatCurrency = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return `Rp ${num.toLocaleString('id-ID')}`;
};

export const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/\D/g, ''));
};
