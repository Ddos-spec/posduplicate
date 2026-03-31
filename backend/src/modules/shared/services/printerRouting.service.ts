export interface PrinterRoutingSettings {
  cashierAutoPrint: boolean;
  kitchenAutoPrint: boolean;
  kitchenCategoryIds: number[];
}

const DEFAULT_PRINTER_ROUTING_SETTINGS: PrinterRoutingSettings = {
  cashierAutoPrint: true,
  kitchenAutoPrint: false,
  kitchenCategoryIds: []
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
};

const normalizeCategoryIds = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [...DEFAULT_PRINTER_ROUTING_SETTINGS.kitchenCategoryIds];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry > 0)
    )
  ).sort((left, right) => left - right);
};

export const normalizePrinterRoutingSettings = (value: unknown): PrinterRoutingSettings => {
  const candidate = toRecord(value);

  return {
    cashierAutoPrint: candidate.cashierAutoPrint !== false,
    kitchenAutoPrint: candidate.kitchenAutoPrint === true,
    kitchenCategoryIds: normalizeCategoryIds(candidate.kitchenCategoryIds)
  };
};
