import prisma from '../../../utils/prisma';
import { decrypt, encrypt } from '../../../utils/crypto';
import {
  getManagedIntegrationDefinition,
  managedIntegrationOrder,
  type ManagedChannelBrand,
  type ManagedIntegrationDefinition,
  type ManagedIntegrationSlug,
} from './managedIntegrationCatalog';
import { buildMetaOAuthStartUrl, getMetaCallbackUrl } from './metaOAuth.service';

type IntegrationState =
  | 'not_connected'
  | 'pending_user_action'
  | 'connected'
  | 'action_required'
  | 'syncing'
  | 'degraded';

type JsonRecord = Record<string, any>;

export interface ManagedAssetInput {
  id?: string;
  label: string;
  kind: string;
  status?: string;
}

export interface CompleteConnectionInput {
  connectionId?: string;
  workspaceName?: string;
  notes?: string;
  vendorWorkspaceUrl?: string;
  vendorWorkspaceEmail?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  renewalDate?: string;
  billingOwnerName?: string;
  selectedAssets?: ManagedAssetInput[];
}

export interface ConnectRequestInput {
  returnPath?: string;
}

interface CallbackPayload {
  state?: string;
  status?: string;
  connectionId?: string;
  workspace?: string;
  assets?: string[];
  note?: string;
}

const defaultHealthScore: Record<ManagedIntegrationSlug, number> = {
  'social-hub': 91,
  'marketplace-hub': 88,
  'meta-ads-hub': 86,
};

const dashboardFee = {
  currency: 'IDR',
  amount: 300000,
  label: 'Rp300.000 / bulan',
  description: 'Biaya dashboard orchestration. Connector partner dan spend dibayar user langsung ke partner/provider masing-masing.',
};

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function decryptCredentials(value: unknown): JsonRecord {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const decrypted = decrypt(value);
      return asRecord(decrypted);
    } catch {
      return {};
    }
  }

  return asRecord(value);
}

function maskReference(reference?: string | null): string | null {
  if (!reference) {
    return null;
  }

  if (reference.length <= 8) {
    return `${reference.slice(0, 2)}***${reference.slice(-2)}`;
  }

  return `${reference.slice(0, 4)}••••${reference.slice(-4)}`;
}

function normalizeState(rawStatus?: string | null, isActive?: boolean | null): IntegrationState {
  if (isActive && (rawStatus === 'active' || rawStatus === 'connected')) {
    return 'connected';
  }

  switch ((rawStatus || '').toLowerCase()) {
    case 'active':
    case 'connected':
      return 'connected';
    case 'pending':
    case 'pending_user_action':
      return 'pending_user_action';
    case 'action_required':
    case 'expired':
    case 'reconnect_required':
      return 'action_required';
    case 'syncing':
      return 'syncing';
    case 'warning':
    case 'degraded':
      return 'degraded';
    default:
      return 'not_connected';
  }
}

function statusLabel(state: IntegrationState): string {
  switch (state) {
    case 'connected':
      return 'Connected';
    case 'pending_user_action':
      return 'Waiting for user approval';
    case 'action_required':
      return 'Action required';
    case 'syncing':
      return 'Syncing';
    case 'degraded':
      return 'Degraded';
    default:
      return 'Not connected';
  }
}

function getFrontendBaseUrl(): string {
  const configured = process.env.FRONTEND_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
  return configured.split(',')[0].trim().replace(/\/$/, '');
}

function getBackendPublicUrl(): string {
  const configured = process.env.PUBLIC_URL || 'http://localhost:3000';
  return configured.replace(/\/$/, '');
}

function buildStateToken(payload: JsonRecord): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeStateToken(state?: string): JsonRecord {
  if (!state) {
    return {};
  }

  try {
    return JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as JsonRecord;
  } catch {
    return {};
  }
}

function buildHostedLaunchUrl(definition: ManagedIntegrationDefinition, state: string, tenantId: number, returnPath?: string): string | null {
  if (!definition.launchUrl) {
    return null;
  }

  const callbackUrl = `${getBackendPublicUrl()}/api/medsos/integrations/callback/${definition.slug}`;
  const returnUrl = `${getFrontendBaseUrl()}${returnPath || '/medsos/connections'}`;
  const url = new URL(definition.launchUrl);

  url.searchParams.set('state', state);
  url.searchParams.set('tenant_id', String(tenantId));
  url.searchParams.set('connection_slug', definition.slug);
  url.searchParams.set('callback_url', callbackUrl);
  url.searchParams.set('return_url', returnUrl);

  return url.toString();
}

function buildDefaultAssets(definition: ManagedIntegrationDefinition): ManagedAssetInput[] {
  return definition.supportedChannels.map((channel) => ({
    id: channel.brand,
    label: channel.label,
    kind: channel.brand,
    status: 'ready',
  }));
}

function mapSelectedAssets(value: unknown): ManagedAssetInput[] {
  return asArray<JsonRecord>(value).reduce<ManagedAssetInput[]>((accumulator, item, index) => {
      const label = String(item.label || item.name || item.kind || `asset-${index + 1}`).trim();
      const kind = String(item.kind || item.type || 'channel').trim();

      if (!label) {
        return accumulator;
      }

      accumulator.push({
        id: String(item.id || `${kind}-${index + 1}`),
        label,
        kind,
        status: String(item.status || 'connected'),
      });

      return accumulator;
    }, []);
}

function buildNextActions(
  state: IntegrationState,
  definition: ManagedIntegrationDefinition,
  hasLaunchUrl: boolean,
  hasVendorPortalUrl: boolean
): string[] {
  if (state === 'connected') {
    return ['Pantau health score', 'Sinkronkan data bila perlu', `Kelola billing ${definition.providerName} langsung dari portal vendornya`];
  }

  if (state === 'pending_user_action') {
    return [`Selesaikan login / approval di ${definition.providerName}`, 'Pilih aset yang akan diaktifkan', 'Kembali ke dashboard untuk finalisasi otomatis'];
  }

  if (!hasLaunchUrl && hasVendorPortalUrl) {
    return [
      `Buka portal ${definition.providerName} lalu aktifkan plan yang direkomendasikan`,
      'Hubungkan aset yang dibutuhkan dari sisi vendor',
      'Kembali ke dashboard untuk menyimpan reference dan finalisasi channel aktif',
    ];
  }

  if (!hasLaunchUrl) {
    return ['Isi hosted connect URL provider di environment server', 'Setelah itu user bisa klik Connect tanpa setup teknis tambahan'];
  }

  if (state === 'action_required') {
    return [`Lakukan reconnect akun di ${definition.providerName}`, 'Pastikan permission dan billing partner masih aktif'];
  }

  return ['Klik Connect untuk memulai onboarding', 'User hanya login dan approve, backend menangani callback serta status'];
}

function buildConnectionCard(
  definition: ManagedIntegrationDefinition,
  integrationRow?: {
    id: number;
    status: string;
    is_active: boolean;
    configuration: unknown;
    credentials: unknown;
    metadata: unknown;
    activated_at: Date | null;
    last_sync_at: Date | null;
    created_at: Date;
    updated_at: Date;
  } | null
) {
  const configuration = asRecord(integrationRow?.configuration);
  const metadata = asRecord(integrationRow?.metadata);
  const credentials = decryptCredentials(integrationRow?.credentials);
  const state = normalizeState(integrationRow?.status, integrationRow?.is_active);
  const selectedAssets = mapSelectedAssets(metadata.selectedAssets);
  const launchUrlConfigured = Boolean(definition.launchUrl);
  const vendorPortalUrl = definition.vendorPortalUrl || null;
  const healthScore = Number(metadata.healthScore || defaultHealthScore[definition.slug] || 0);

  return {
    id: integrationRow?.id || null,
    slug: definition.slug,
    integrationType: definition.integrationType,
    name: definition.name,
    workspaceName: String(configuration.workspaceName || '') || null,
    category: definition.category,
    description: definition.description,
    providerName: definition.providerName,
    providerKey: definition.providerKey,
    status: state,
    statusLabel: statusLabel(state),
    isActive: state === 'connected' || state === 'syncing',
    healthScore: state === 'not_connected' ? 0 : healthScore,
    supportedChannels: definition.supportedChannels,
    capabilities: definition.capabilities,
    billingNote: definition.billingNote,
    dashboardFeeNote: definition.dashboardFeeNote,
    pricingSummary: definition.pricingSummary || null,
    recommendedPlan: definition.recommendedPlan || null,
    selectedAssets: selectedAssets.length > 0 ? selectedAssets : (state === 'connected' ? buildDefaultAssets(definition) : []),
    setupChecklist: definition.setupChecklist,
    requiredUserActions: definition.requiredUserActions,
    nextActions: buildNextActions(state, definition, launchUrlConfigured, Boolean(vendorPortalUrl)),
    launchMode: definition.launchMode,
    launchUrlConfigured,
    vendorPortalUrl,
    vendorPortalLabel: definition.vendorPortalLabel || null,
    pricingUrl: definition.pricingUrl || null,
    docsUrl: definition.docsUrl || null,
    supportUrl: definition.supportUrl || null,
    callbackUrl: `${getBackendPublicUrl()}/api/medsos/integrations/callback/${definition.slug}`,
    webhookUrl: `${getBackendPublicUrl()}/api/medsos/integrations/webhook/${definition.slug}`,
    operatorNotes: metadata.notes || null,
    vendorWorkspaceUrl: metadata.vendorWorkspaceUrl || null,
    vendorWorkspaceEmail: metadata.vendorWorkspaceEmail || null,
    subscriptionPlan: metadata.subscriptionPlan || null,
    subscriptionStatus: metadata.subscriptionStatus || null,
    renewalDate: metadata.renewalDate || null,
    billingOwnerName: metadata.billingOwnerName || null,
    lastSyncAt: integrationRow?.last_sync_at?.toISOString() || null,
    connectedAt: integrationRow?.activated_at?.toISOString() || null,
    connectionRefMasked: maskReference(credentials.connectionId || credentials.connectionRef || null),
    launchSession: configuration.launchSession || null,
    lastError: metadata.lastError || null,
    lastWebhookEvent: metadata.lastWebhookEvent || null,
    updatedAt: integrationRow?.updated_at?.toISOString() || null,
    customerPaysDirectly: true,
    dashboardFee,
  };
}

async function upsertManagedIntegration(
  tenantId: number,
  definition: ManagedIntegrationDefinition,
  data: {
    status: string;
    isActive: boolean;
    configuration?: JsonRecord;
    metadata?: JsonRecord;
    credentials?: JsonRecord;
    activatedAt?: Date | null;
    lastSyncAt?: Date | null;
  }
) {
  const encryptedCredentials = data.credentials ? encrypt(data.credentials) : undefined;

  return prisma.integrations.upsert({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: definition.integrationType,
      },
    },
    update: {
      status: data.status,
      is_active: data.isActive,
      configuration: data.configuration ?? {},
      metadata: data.metadata ?? {},
      credentials: encryptedCredentials ?? undefined,
      activated_at: data.activatedAt ?? undefined,
      last_sync_at: data.lastSyncAt ?? undefined,
      updated_at: new Date(),
    },
    create: {
      tenant_id: tenantId,
      integration_type: definition.integrationType,
      status: data.status,
      is_active: data.isActive,
      configuration: data.configuration ?? {},
      metadata: data.metadata ?? {},
      credentials: encryptedCredentials ?? {},
      activated_at: data.activatedAt ?? null,
      last_sync_at: data.lastSyncAt ?? null,
    },
  });
}

export async function getManagedIntegrationHub(tenantId: number) {
  const rows = await prisma.integrations.findMany({
    where: {
      tenant_id: tenantId,
      integration_type: {
        in: managedIntegrationOrder.map((slug) => getManagedIntegrationDefinition(slug)!.integrationType),
      },
    },
    select: {
      id: true,
      integration_type: true,
      status: true,
      is_active: true,
      configuration: true,
      credentials: true,
      metadata: true,
      activated_at: true,
      last_sync_at: true,
      created_at: true,
      updated_at: true,
    },
  });

  const rowByType = new Map(rows.map((row) => [row.integration_type, row]));
  const connectors = managedIntegrationOrder.map((slug) => {
    const definition = getManagedIntegrationDefinition(slug)!;
    return buildConnectionCard(definition, rowByType.get(definition.integrationType));
  });

  return {
    billing: {
      dashboardFee,
      customerPaysConnectorDirectly: true,
      architecture: 'third_party_orchestrated',
      promise: 'User cukup klik connect, login, pilih aset, lalu dashboard mengelola status dan workflow.',
    },
    summary: {
      total: connectors.length,
      connected: connectors.filter((item) => item.status === 'connected').length,
      pending: connectors.filter((item) => item.status === 'pending_user_action').length,
      actionRequired: connectors.filter((item) => item.status === 'action_required').length,
      providerLinksConfigured: connectors.filter((item) => item.launchUrlConfigured || Boolean(item.vendorPortalUrl)).length,
    },
    connectors,
  };
}

export async function getManagedIntegrationDetail(tenantId: number, slug: string) {
  const definition = getManagedIntegrationDefinition(slug);
  if (!definition) {
    return null;
  }

  const row = await prisma.integrations.findUnique({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: definition.integrationType,
      },
    },
    select: {
      id: true,
      status: true,
      is_active: true,
      configuration: true,
      credentials: true,
      metadata: true,
      activated_at: true,
      last_sync_at: true,
      created_at: true,
      updated_at: true,
    },
  });

  return buildConnectionCard(definition, row);
}

export async function beginManagedIntegrationConnect(
  tenantId: number,
  userId: number,
  slug: string,
  input: ConnectRequestInput = {}
) {
  const definition = getManagedIntegrationDefinition(slug);
  if (!definition) {
    throw new Error('Managed integration not found');
  }

  // Meta Ads: use our own OAuth flow instead of a third-party hosted link
  if (slug === 'meta-ads-hub') {
    const oauthUrl = buildMetaOAuthStartUrl(tenantId, userId, input.returnPath);
    return {
      slug,
      providerName: definition.providerName,
      launchMode: 'redirect' as const,
      launchUrl: oauthUrl,
      callbackUrl: getMetaCallbackUrl(),
      returnUrl: `${getFrontendBaseUrl()}${input.returnPath || '/medsos/connections'}`,
      instructions: [
        'Klik Connect — Anda akan diarahkan ke halaman login Meta.',
        'Login dengan akun Facebook yang terhubung ke Business Manager.',
        'Pilih Ad Account yang ingin diintegrasikan lalu klik Continue.',
        'Setelah selesai, dashboard akan otomatis menampilkan data campaign.',
      ],
    };
  }

  const row = await prisma.integrations.findUnique({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: definition.integrationType,
      },
    },
    select: {
      id: true,
      configuration: true,
      metadata: true,
    },
  });

  const currentConfiguration = asRecord(row?.configuration);
  const currentMetadata = asRecord(row?.metadata);
  const state = buildStateToken({
    tenantId,
    userId,
    slug: definition.slug,
    returnPath: input.returnPath || '/medsos/connections',
    ts: Date.now(),
  });
  const launchUrl = buildHostedLaunchUrl(definition, state, tenantId, input.returnPath);
  const launchSession = {
    state,
    createdAt: new Date().toISOString(),
    launchUrl,
    returnPath: input.returnPath || '/medsos/connections',
    callbackUrl: `${getBackendPublicUrl()}/api/medsos/integrations/callback/${definition.slug}`,
  };

  await upsertManagedIntegration(tenantId, definition, {
    status: 'pending_user_action',
    isActive: false,
    configuration: {
      ...currentConfiguration,
      launchSession,
    },
    metadata: {
      ...currentMetadata,
      lastError: null,
      lastLaunchAttemptAt: new Date().toISOString(),
    },
  });

  return {
    slug: definition.slug,
    providerName: definition.providerName,
    launchMode: launchUrl ? 'redirect' : 'manual_reference',
    launchUrl,
    callbackUrl: launchSession.callbackUrl,
    returnUrl: `${getFrontendBaseUrl()}${launchSession.returnPath}`,
    instructions: launchUrl
      ? [
          'Buka hosted connect link partner.',
          'Login lalu pilih aset yang ingin diaktifkan.',
          'Setelah approval selesai, backend menangani callback otomatis.',
        ]
      : [
          'Hosted connect URL provider belum diisi di server.',
          'Isi environment connector URL atau selesaikan finalisasi via modal operator di dashboard.',
        ],
  };
}

export async function completeManagedIntegrationConnect(
  tenantId: number,
  slug: string,
  input: CompleteConnectionInput = {}
) {
  const definition = getManagedIntegrationDefinition(slug);
  if (!definition) {
    throw new Error('Managed integration not found');
  }

  const existing = await prisma.integrations.findUnique({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: definition.integrationType,
      },
    },
    select: {
      configuration: true,
      metadata: true,
      credentials: true,
      created_at: true,
    },
  });

  const configuration = asRecord(existing?.configuration);
  const metadata = asRecord(existing?.metadata);
  const credentials = decryptCredentials(existing?.credentials);
  const selectedAssets = (input.selectedAssets && input.selectedAssets.length > 0)
    ? input.selectedAssets.map((item, index) => ({
        id: item.id || `${slug}-${index + 1}`,
        label: item.label,
        kind: item.kind,
        status: item.status || 'connected',
      }))
    : buildDefaultAssets(definition).map((item) => ({
        ...item,
        status: 'connected',
      }));

  await upsertManagedIntegration(tenantId, definition, {
    status: 'connected',
    isActive: true,
    activatedAt: existing?.created_at || new Date(),
    lastSyncAt: new Date(),
    configuration: {
      ...configuration,
      workspaceName: input.workspaceName || configuration.workspaceName || definition.name,
      launchSession: null,
    },
    metadata: {
      ...metadata,
      selectedAssets,
      healthScore: metadata.healthScore || defaultHealthScore[definition.slug],
      notes: input.notes || metadata.notes || null,
      vendorWorkspaceUrl: input.vendorWorkspaceUrl || metadata.vendorWorkspaceUrl || null,
      vendorWorkspaceEmail: input.vendorWorkspaceEmail || metadata.vendorWorkspaceEmail || null,
      subscriptionPlan: input.subscriptionPlan || metadata.subscriptionPlan || definition.recommendedPlan || null,
      subscriptionStatus: input.subscriptionStatus || metadata.subscriptionStatus || 'active',
      renewalDate: input.renewalDate || metadata.renewalDate || null,
      billingOwnerName: input.billingOwnerName || metadata.billingOwnerName || null,
      lastError: null,
      lastWebhookEvent: metadata.lastWebhookEvent || null,
      finalizedAt: new Date().toISOString(),
    },
    credentials: {
      ...credentials,
      connectionId: input.connectionId || credentials.connectionId || null,
    },
  });

  return getManagedIntegrationDetail(tenantId, slug);
}

export async function disconnectManagedIntegration(tenantId: number, slug: string) {
  const definition = getManagedIntegrationDefinition(slug);
  if (!definition) {
    throw new Error('Managed integration not found');
  }

  const existing = await prisma.integrations.findUnique({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: definition.integrationType,
      },
    },
    select: {
      configuration: true,
      metadata: true,
    },
  });

  await upsertManagedIntegration(tenantId, definition, {
    status: 'inactive',
    isActive: false,
    configuration: {
      ...asRecord(existing?.configuration),
      launchSession: null,
    },
    metadata: {
      ...asRecord(existing?.metadata),
      selectedAssets: [],
      healthScore: 0,
      disconnectedAt: new Date().toISOString(),
    },
    credentials: {},
  });

  return getManagedIntegrationDetail(tenantId, slug);
}

export async function syncManagedIntegration(tenantId: number, slug: string) {
  const definition = getManagedIntegrationDefinition(slug);
  if (!definition) {
    throw new Error('Managed integration not found');
  }

  const existing = await prisma.integrations.findUnique({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: definition.integrationType,
      },
    },
    select: {
      configuration: true,
      metadata: true,
      credentials: true,
    },
  });

  const metadata = asRecord(existing?.metadata);
  const hasConnection = Boolean(decryptCredentials(existing?.credentials).connectionId) || asArray(metadata.selectedAssets).length > 0;

  await upsertManagedIntegration(tenantId, definition, {
    status: hasConnection ? 'connected' : 'action_required',
    isActive: hasConnection,
    lastSyncAt: new Date(),
    configuration: asRecord(existing?.configuration),
    metadata: {
      ...metadata,
      healthScore: hasConnection ? (metadata.healthScore || defaultHealthScore[definition.slug]) : 0,
      lastError: hasConnection ? null : 'Belum ada connection reference atau aset aktif untuk disinkronkan.',
      lastManualSyncAt: new Date().toISOString(),
    },
    credentials: decryptCredentials(existing?.credentials),
  });

  return getManagedIntegrationDetail(tenantId, slug);
}

export async function handleManagedIntegrationCallback(slug: string, payload: CallbackPayload) {
  const definition = getManagedIntegrationDefinition(slug);
  if (!definition) {
    throw new Error('Managed integration not found');
  }

  const statePayload = decodeStateToken(payload.state);
  const tenantId = Number(statePayload.tenantId);
  if (!tenantId) {
    throw new Error('Invalid callback state');
  }

  const existing = await prisma.integrations.findUnique({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: definition.integrationType,
      },
    },
    select: {
      configuration: true,
      metadata: true,
      credentials: true,
    },
  });

  const status = (payload.status || '').toLowerCase();
  const connected = status === 'connected' || status === 'success' || status === 'approved';
  const selectedAssets = (payload.assets && payload.assets.length > 0)
    ? payload.assets.map((asset, index) => ({
        id: `${slug}-${index + 1}`,
        label: asset,
        kind: asset.toLowerCase().replace(/\s+/g, '_'),
        status: connected ? 'connected' : 'pending',
      }))
    : buildDefaultAssets(definition).map((item) => ({
        ...item,
        status: connected ? 'connected' : 'pending',
      }));

  await upsertManagedIntegration(tenantId, definition, {
    status: connected ? 'connected' : 'action_required',
    isActive: connected,
    activatedAt: connected ? new Date() : null,
    lastSyncAt: connected ? new Date() : null,
    configuration: {
      ...asRecord(existing?.configuration),
      workspaceName: payload.workspace || asRecord(existing?.configuration).workspaceName || definition.name,
      launchSession: null,
      lastCallbackAt: new Date().toISOString(),
    },
    metadata: {
      ...asRecord(existing?.metadata),
      selectedAssets,
      healthScore: connected ? defaultHealthScore[definition.slug] : 0,
      lastError: connected ? null : (payload.note || 'Provider callback belum menyatakan koneksi berhasil.'),
      lastWebhookEvent: connected ? null : asRecord(existing?.metadata).lastWebhookEvent,
    },
    credentials: {
      ...decryptCredentials(existing?.credentials),
      connectionId: payload.connectionId || decryptCredentials(existing?.credentials).connectionId || null,
    },
  });

  const returnPath = String(statePayload.returnPath || '/medsos/connections');
  const redirectUrl = new URL(`${getFrontendBaseUrl()}${returnPath}`);
  redirectUrl.searchParams.set('provider', slug);
  redirectUrl.searchParams.set('status', connected ? 'connected' : 'action_required');
  redirectUrl.searchParams.set('source', 'callback');

  return {
    redirectUrl: redirectUrl.toString(),
    tenantId,
    connected,
  };
}

export async function proxySocialHubStats(tenantId: number) {
  const definition = getManagedIntegrationDefinition('social-hub')!;

  const row = await prisma.integrations.findUnique({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: definition.integrationType,
      },
    },
    select: { status: true, is_active: true, credentials: true, metadata: true },
  });

  if (!row?.is_active) {
    return null;
  }

  const credentials = decryptCredentials(row.credentials);
  const metadata = asRecord(row.metadata);
  const apiKey = credentials.connectionId as string | undefined;
  const baseUrl = (metadata.vendorWorkspaceUrl as string | undefined)?.replace(/\/$/, '');

  if (!apiKey || !baseUrl) {
    return null;
  }

  const response = await fetch(`${baseUrl}/api/v1/external/stats`, {
    headers: { 'X-Tenant-Key': apiKey },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`CRM stats returned ${response.status}`);
  }

  const json = await response.json() as { status: string; data: Record<string, unknown> };
  if (json.status !== 'success') {
    throw new Error('CRM stats response error');
  }

  return json.data;
}

export async function handleManagedIntegrationWebhook(slug: string, headers: Record<string, string | string[] | undefined>, body: unknown) {
  const definition = getManagedIntegrationDefinition(slug);
  if (!definition) {
    throw new Error('Managed integration not found');
  }

  const providedSecret = String(headers['x-managed-signature'] || headers['x-webhook-secret'] || '');
  if (definition.webhookSecret && providedSecret !== definition.webhookSecret) {
    const error = new Error('Invalid webhook signature');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }

  const payload = asRecord(body);
  const tenantId = Number(payload.tenantId || payload.tenant_id);
  if (!tenantId) {
    return {
      accepted: true,
      ignored: true,
      reason: 'tenant_id not provided',
    };
  }

  const existing = await prisma.integrations.findUnique({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: definition.integrationType,
      },
    },
    select: {
      configuration: true,
      metadata: true,
      credentials: true,
    },
  });

  const metadata = asRecord(existing?.metadata);
  await upsertManagedIntegration(tenantId, definition, {
    status: decryptCredentials(existing?.credentials).connectionId ? 'connected' : 'pending_user_action',
    isActive: Boolean(decryptCredentials(existing?.credentials).connectionId),
    lastSyncAt: new Date(),
    configuration: asRecord(existing?.configuration),
    metadata: {
      ...metadata,
      healthScore: Number(payload.healthScore || payload.health_score || metadata.healthScore || defaultHealthScore[definition.slug]),
      lastWebhookEvent: {
        receivedAt: new Date().toISOString(),
        eventType: payload.eventType || payload.type || 'partner.update',
      },
      lastError: payload.error || null,
    },
    credentials: decryptCredentials(existing?.credentials),
  });

  return {
    accepted: true,
    ignored: false,
  };
}
