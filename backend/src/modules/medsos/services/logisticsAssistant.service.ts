import { randomBytes } from 'crypto';

type PlainObject = Record<string, any>;

export type LogisticsAssistantSettings = {
  active: boolean;
  provider: 'rajaongkir';
  shippingCostEnabled: boolean;
  trackingEnabled: boolean;
  originId: number | null;
  originLabel: string;
  defaultCouriers: string[];
  defaultWeightGrams: number;
  automationToken?: string;
  automationTokenMasked?: string | null;
};

export type ManagedLogisticsStatus = {
  provider: 'rajaongkir';
  configured: boolean;
  shippingCostReady: boolean;
  trackingReady: boolean;
  helper: string;
};

type RajaOngkirMeta = {
  message?: string;
  code?: number;
  status?: string | boolean;
};

type RajaOngkirResponse<T> = {
  meta?: RajaOngkirMeta;
  data?: T;
};

type DestinationItem = {
  id: number;
  label: string;
  province_name?: string | null;
  city_name?: string | null;
  district_name?: string | null;
  subdistrict_name?: string | null;
  zip_code?: string | null;
};

type ShippingCostOption = {
  name?: string;
  code?: string;
  service?: string;
  description?: string;
  cost?: number | string;
  etd?: string;
};

type TrackingHistoryItem = {
  date?: string;
  desc?: string;
  location?: string;
  status?: string;
  note?: string;
};

const DEFAULT_LOGISTICS_SETTINGS: LogisticsAssistantSettings = {
  active: false,
  provider: 'rajaongkir',
  shippingCostEnabled: true,
  trackingEnabled: true,
  originId: null,
  originLabel: '',
  defaultCouriers: ['jne', 'sicepat', 'anteraja'],
  defaultWeightGrams: 1000,
};

const DEFAULT_BASE_URL = 'https://rajaongkir.komerce.id/api/v1';

const isPlainObject = (value: unknown): value is PlainObject =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const maskSecretValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}•••${trimmed.slice(-2)}`;
  }
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
};

const sanitizeCourierCode = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');

export const normalizeCourierList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => sanitizeCourierCode(String(item || '')))
          .filter(Boolean)
      )
    );
  }

  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          .split(/[,\n:]/)
          .map((item) => sanitizeCourierCode(item))
          .filter(Boolean)
      )
    );
  }

  return [...DEFAULT_LOGISTICS_SETTINGS.defaultCouriers];
};

export const normalizeLogisticsAssistantSettings = (value: unknown): LogisticsAssistantSettings => {
  const candidate = isPlainObject(value) ? value : {};
  const rawToken = typeof candidate.automationToken === 'string' ? candidate.automationToken.trim() : '';

  return {
    active: Boolean(candidate.active),
    provider: 'rajaongkir',
    shippingCostEnabled: candidate.shippingCostEnabled !== false,
    trackingEnabled: candidate.trackingEnabled !== false,
    originId: Number.isFinite(Number(candidate.originId)) ? Number(candidate.originId) : null,
    originLabel: typeof candidate.originLabel === 'string' ? candidate.originLabel.trim() : '',
    defaultCouriers: normalizeCourierList(candidate.defaultCouriers),
    defaultWeightGrams: Math.max(100, Number(candidate.defaultWeightGrams) || DEFAULT_LOGISTICS_SETTINGS.defaultWeightGrams),
    ...(rawToken ? { automationToken: rawToken } : {}),
    automationTokenMasked: rawToken ? maskSecretValue(rawToken) : null,
  };
};

export const sanitizeLogisticsAssistantSettings = (value: unknown) => {
  const normalized = normalizeLogisticsAssistantSettings(value);
  const { automationToken, ...safe } = normalized;
  return safe;
};

export const mergeLogisticsAssistantSettings = (currentValue: unknown, incomingValue: unknown) => {
  const current = normalizeLogisticsAssistantSettings(currentValue);
  const incoming = isPlainObject(incomingValue) ? incomingValue : {};
  const merged = normalizeLogisticsAssistantSettings({
    ...current,
    ...incoming,
    defaultCouriers: Object.prototype.hasOwnProperty.call(incoming, 'defaultCouriers')
      ? incoming.defaultCouriers
      : current.defaultCouriers,
  });

  const rawIncomingToken = typeof incoming.automationToken === 'string' ? incoming.automationToken.trim() : '';
  const token = rawIncomingToken || current.automationToken || randomBytes(18).toString('hex');

  return {
    ...merged,
    automationToken: token,
  };
};

export const getManagedLogisticsStatus = (): ManagedLogisticsStatus => {
  const shippingKey = String(process.env.RAJAONGKIR_SHIPPING_API_KEY || '').trim();
  const configured = Boolean(shippingKey);

  return {
    provider: 'rajaongkir',
    configured,
    shippingCostReady: configured,
    trackingReady: configured,
    helper: configured
      ? 'Server siap memakai RajaOngkir untuk cek ongkir dan cek resi.'
      : 'Isi RAJAONGKIR_SHIPPING_API_KEY di server agar fitur logistics assistant aktif penuh.',
  };
};

const getBaseUrl = () => (process.env.RAJAONGKIR_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');

const getShippingApiKey = () => String(process.env.RAJAONGKIR_SHIPPING_API_KEY || '').trim();

const assertConfigured = () => {
  if (!getShippingApiKey()) {
    const error = new Error('RajaOngkir shipping API key belum dikonfigurasi di server.');
    (error as any).statusCode = 503;
    throw error;
  }
};

const toErrorMessage = async (response: Response) => {
  try {
    const data = (await response.json()) as RajaOngkirResponse<unknown>;
    return data?.meta?.message || response.statusText || 'Request gagal ke RajaOngkir.';
  } catch {
    return response.statusText || 'Request gagal ke RajaOngkir.';
  }
};

const raFetch = async <T>(path: string, init?: RequestInit) => {
  assertConfigured();
  const headers = new Headers(init?.headers || {});
  headers.set('key', getShippingApiKey());

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers,
    signal: init?.signal || AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const error = new Error(await toErrorMessage(response));
    (error as any).statusCode = response.status;
    throw error;
  }

  const data = (await response.json()) as RajaOngkirResponse<T>;
  const metaStatus = data?.meta?.status;
  const metaCode = Number(data?.meta?.code || 0);

  if (
    metaCode >= 400 ||
    metaStatus === false ||
    (typeof metaStatus === 'string' && metaStatus.toLowerCase() !== 'success')
  ) {
    const error = new Error(data?.meta?.message || 'Request gagal ke RajaOngkir.');
    (error as any).statusCode = metaCode || 400;
    throw error;
  }

  return data;
};

export const searchDomesticDestinations = async (search: string, limit = 10, offset = 0) => {
  const keyword = search.trim();
  if (!keyword) {
    const error = new Error('Kata kunci tujuan wajib diisi.');
    (error as any).statusCode = 400;
    throw error;
  }

  const query = new URLSearchParams({
    search: keyword,
    limit: String(Math.max(1, Math.min(limit, 50))),
    offset: String(Math.max(0, offset)),
  });
  const response = await raFetch<DestinationItem[]>(`/destination/domestic-destination?${query.toString()}`);
  return response.data || [];
};

const resolveDestination = async (value: {
  id?: string | number | null;
  search?: string | null;
  fallbackLabel?: string | null;
}) => {
  if (Number.isFinite(Number(value.id))) {
    return {
      id: Number(value.id),
      label: typeof value.fallbackLabel === 'string' ? value.fallbackLabel.trim() : '',
    };
  }

  const search = String(value.search || '').trim() || String(value.fallbackLabel || '').trim();
  if (!search) {
    const error = new Error('Lokasi tujuan belum lengkap.');
    (error as any).statusCode = 400;
    throw error;
  }

  const matches = await searchDomesticDestinations(search, 5, 0);
  if (!matches.length) {
    const error = new Error(`Tujuan "${search}" tidak ditemukan di RajaOngkir.`);
    (error as any).statusCode = 404;
    throw error;
  }

  return {
    id: matches[0].id,
    label: matches[0].label,
  };
};

const resolveWeight = (value: {
  explicitWeight?: string | number | null;
  defaultWeightGrams?: number | null;
  items?: Array<{ weightGrams?: number | string | null; qty?: number | string | null }>;
}) => {
  const explicit = Number(value.explicitWeight);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.round(explicit);
  }

  if (Array.isArray(value.items) && value.items.length > 0) {
    const total = value.items.reduce((sum, item) => {
      const itemWeight = Number(item.weightGrams);
      const qty = Math.max(1, Number(item.qty) || 1);
      return sum + (Number.isFinite(itemWeight) && itemWeight > 0 ? itemWeight * qty : 0);
    }, 0);

    if (total > 0) {
      return Math.round(total);
    }
  }

  return Math.max(100, Number(value.defaultWeightGrams) || DEFAULT_LOGISTICS_SETTINGS.defaultWeightGrams);
};

const buildCourierParam = (value: {
  courier?: string | null;
  defaultCouriers?: string[];
}) => {
  const requested = normalizeCourierList(value.courier || '');
  const fallback = normalizeCourierList(value.defaultCouriers || DEFAULT_LOGISTICS_SETTINGS.defaultCouriers);
  const finalCouriers = requested.length ? requested : fallback;

  if (!finalCouriers.length) {
    const error = new Error('Kurir belum dikonfigurasi.');
    (error as any).statusCode = 400;
    throw error;
  }

  return finalCouriers.join(':');
};

const sortCostOptions = (items: ShippingCostOption[]) =>
  [...items].sort((a, b) => Number(a.cost || 0) - Number(b.cost || 0));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

export const calculateDomesticShippingCost = async (params: {
  originId?: string | number | null;
  originLabel?: string | null;
  originSearch?: string | null;
  destinationId?: string | number | null;
  destinationLabel?: string | null;
  destinationSearch?: string | null;
  weightGrams?: string | number | null;
  courier?: string | null;
  price?: 'lowest' | 'highest' | null;
  items?: Array<{ weightGrams?: number | string | null; qty?: number | string | null }>;
  tenantDefaults?: LogisticsAssistantSettings;
}) => {
  const defaults = params.tenantDefaults || DEFAULT_LOGISTICS_SETTINGS;
  const origin = await resolveDestination({
    id: params.originId ?? defaults.originId,
    search: params.originSearch || defaults.originLabel,
    fallbackLabel: params.originLabel || defaults.originLabel,
  });
  const destination = await resolveDestination({
    id: params.destinationId,
    search: params.destinationSearch,
    fallbackLabel: params.destinationLabel,
  });
  const weight = resolveWeight({
    explicitWeight: params.weightGrams,
    defaultWeightGrams: defaults.defaultWeightGrams,
    items: params.items,
  });
  const courier = buildCourierParam({
    courier: params.courier,
    defaultCouriers: defaults.defaultCouriers,
  });

  const body = new URLSearchParams();
  body.set('origin', String(origin.id));
  body.set('destination', String(destination.id));
  body.set('weight', String(weight));
  body.set('courier', courier);
  if (params.price === 'highest' || params.price === 'lowest') {
    body.set('price', params.price);
  } else {
    body.set('price', 'lowest');
  }

  const response = await raFetch<ShippingCostOption[]>('/calculate/domestic-cost', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const options = sortCostOptions(response.data || []);
  if (!options.length) {
    const error = new Error(response.meta?.message || 'Tidak ada opsi ongkir untuk kombinasi ini.');
    (error as any).statusCode = 404;
    throw error;
  }

  const cheapest = options[0];
  const aiSummary = `Ditemukan ${options.length} opsi ongkir dari ${origin.label || origin.id} ke ${destination.label || destination.id}. Paling murah ${cheapest.code?.toUpperCase() || cheapest.name || 'kurir'} ${cheapest.service || ''} dengan biaya ${formatCurrency(Number(cheapest.cost || 0))}${cheapest.etd ? ` estimasi ${cheapest.etd}` : ''}.`;

  return {
    origin,
    destination,
    weightGrams: weight,
    courierCodes: courier.split(':'),
    options: options.map((item) => ({
      courierName: item.name || item.code || 'Courier',
      courierCode: String(item.code || '').toLowerCase(),
      service: item.service || '',
      description: item.description || '',
      cost: Number(item.cost || 0),
      etd: item.etd || '',
    })),
    aiSummary,
  };
};

export const trackWaybill = async (params: {
  awb: string;
  courier: string;
  lastPhoneNumber?: string | number | null;
}) => {
  const awb = String(params.awb || '').trim();
  const courier = sanitizeCourierCode(String(params.courier || ''));

  if (!awb) {
    const error = new Error('Nomor resi wajib diisi.');
    (error as any).statusCode = 400;
    throw error;
  }

  if (!courier) {
    const error = new Error('Kurir wajib diisi.');
    (error as any).statusCode = 400;
    throw error;
  }

  const query = new URLSearchParams({
    awb,
    courier,
  });
  const body = new URLSearchParams();
  body.set('awb', awb);
  body.set('courier', courier);

  if (params.lastPhoneNumber !== undefined && params.lastPhoneNumber !== null && String(params.lastPhoneNumber).trim()) {
    body.set('last_phone_number', String(params.lastPhoneNumber).trim());
  }

  const response = await raFetch<any>(`/track/waybill?${query.toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const payload = response.data || {};
  const summary = payload.summary || {};
  const history = Array.isArray(payload.details)
    ? payload.details
    : Array.isArray(payload.manifest)
      ? payload.manifest
      : Array.isArray(payload.history)
        ? payload.history
        : [];
  const normalizedHistory = history.map((item: TrackingHistoryItem) => ({
    date: item.date || '',
    description: item.desc || item.status || item.note || '',
    location: item.location || '',
  }));
  const latestEvent = normalizedHistory[0] || null;
  const delivered = Boolean(payload.delivered);
  const currentStatus =
    String(summary.status || summary.waybill_status || payload.status || latestEvent?.description || '').trim() || 'Status belum tersedia';

  return {
    delivered,
    summary: {
      courierCode: String(summary.courier_code || courier).toLowerCase(),
      courierName: summary.courier_name || courier.toUpperCase(),
      waybillNumber: summary.waybill_number || awb,
      serviceCode: summary.service_code || '',
      status: currentStatus,
      shipperName: summary.shipper_name || '',
      receiverName: summary.receiver_name || '',
      waybillDate: summary.waybill_date || '',
    },
    latestEvent,
    history: normalizedHistory,
    aiSummary: delivered
      ? `Resi ${awb} (${courier.toUpperCase()}) sudah terkirim. Status terakhir: ${currentStatus}.${latestEvent?.location ? ` Lokasi terakhir: ${latestEvent.location}.` : ''}`
      : `Resi ${awb} (${courier.toUpperCase()}) saat ini berstatus ${currentStatus}.${latestEvent?.location ? ` Lokasi terakhir: ${latestEvent.location}.` : ''}`,
  };
};

export const buildAutomationToolDescriptor = (tenantId: number, settings: LogisticsAssistantSettings) => {
  const baseUrl = String(process.env.API_BASE_URL || 'https://filter-bot-mypos-backend.qk6yxt.easypanel.host').replace(/\/$/, '');
  const serverStatus = getManagedLogisticsStatus();

  return {
    enabled: serverStatus.configured && settings.active,
    provider: 'rajaongkir',
    helper: serverStatus.helper,
    endpoint: `${baseUrl}/api/medsos/logistics/assistant`,
    authHeader: 'x-mcs-logistics-token',
    authToken: settings.automationToken || null,
    tenantId,
    shippingCostEnabled: settings.shippingCostEnabled,
    trackingEnabled: settings.trackingEnabled,
    originId: settings.originId,
    originLabel: settings.originLabel,
    defaultCouriers: settings.defaultCouriers,
    defaultWeightGrams: settings.defaultWeightGrams,
    supportedActions: ['cost', 'track'],
    examples: {
      cost: {
        tenantId,
        action: 'cost',
        payload: {
          destinationSearch: 'Bandung',
          weightGrams: 1000,
          courier: 'jne',
        },
      },
      track: {
        tenantId,
        action: 'track',
        payload: {
          awb: 'JP1234567890',
          courier: 'jne',
        },
      },
    },
  };
};
