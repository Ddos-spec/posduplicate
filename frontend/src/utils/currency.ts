export const formatPrice = (value: number): string => {
  return value.toLocaleString('id-ID');
};

export const formatCurrency = (value: number): string => {
  return `Rp ${value.toLocaleString('id-ID')}`;
};
