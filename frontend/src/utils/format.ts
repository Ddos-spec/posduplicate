
export const formatCurrency = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return `Rp ${num.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
};

export const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/\D/g, ''));
};
