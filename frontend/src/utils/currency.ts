export const formatPrice = (value: number): string => {
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

export const formatCurrency = (value: number): string => {
  return `Rp ${value.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
};
