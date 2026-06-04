import prisma from '../../../utils/prisma';
import { decrypt, encrypt } from '../../../utils/crypto';

const TIKTOK_BUSINESS_BASE = 'https://business-api.tiktok.com/open_api/v1.3';
const INTEGRATION_TYPE = 'managed_tiktok_ads_hub';

type JsonRecord = Record<string, unknown>;

interface TikTokStatePayload {
  tenantId?: number;
  userId?: number;
  returnPath?: string;
  ts?: number;
}

interface TikTokTokenResponse {
  code?: number;
  message?: string;
  data?: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_token_expires_in?: number;
    scope?: string;
    advertiser_ids?: string[];
  };
  request_id?: string;
}

interface TikTokAdvertiserItem {
  advertiser_id?: string;
  advertiser_name?: string;
  advertiser_role?: string;
  bc_id?: string;
  bc_name?: string;
  status?: string;
  timezone?: string;
  currency?: string;
}

interface TikTokAdvertiserResponse {
  code?: number;
  message?: string;
  data?: {
    list?: TikTokAdvertiserItem[];
    advertisers?: TikTokAdvertiserItem[];
    advertiser_ids?: string[];
  };
  request_id?: string;
}

function getBackendPublicUrl(): string {
  return (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function getFrontendBaseUrl(): string {
  return (process.env.FRONTEND_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')[0]
    .trim()
    .replace(/\/$/, '');
}

function getAppId(): string {
  return process.env.TIKTOK_BUSINESS_APP_ID || process.env.TIKTOK_ADS_APP_ID || '';
}

function getAppSecret(): string {
  return process.env.TIKTOK_BUSINESS_APP_SECRET || process.env.TIKTOK_ADS_APP_SECRET || '';
}

function getRedirectUri(): string {
  return process.env.TIKTOK_BUSINESS_REDIRECT_URI || `${getBackendPublicUrl()}/api/medsos/tiktok/callback`;
}

function buildStateToken(payload: TikTokStatePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeStateToken(state: string): TikTokStatePayload {
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as TikTokStatePayload;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function maskReference(reference?: string | null): string | null {
  if (!reference) return null;
  if (reference.length <= 8) return `${reference.slice(0, 2)}***${reference.slice(-2)}`;
  return `${reference.slice(0, 4)}••••${reference.slice(-4)}`;
}

export function getTikTokAdsCallbackUrl(): string {
  return getRedirectUri();
}

export function buildTikTokAdsOAuthStartUrl(tenantId: number, userId: number, returnPath?: string): string {
  const appId = getAppId();
  if (!appId) {
    throw new Error('TIKTOK_BUSINESS_APP_ID belum diset di environment');
  }

  const state = buildStateToken({
    tenantId,
    userId,
    returnPath: returnPath || '/medsos/connections',
    ts: Date.now(),
  });

  const params = new URLSearchParams({
    app_id: appId,
    state,
    redirect_uri: getRedirectUri(),
  });

  return `https://business-api.tiktok.com/portal/auth?${params.toString()}`;
}

async function exchangeAuthCode(authCode: string): Promise<Required<TikTokTokenResponse>['data']> {
  const appId = getAppId();
  const secret = getAppSecret();
  if (!appId || !secret) {
    throw new Error('Credential TikTok Business API belum lengkap di environment');
  }

  const response = await fetch(`${TIKTOK_BUSINESS_BASE}/oauth2/access_token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: appId,
      secret,
      auth_code: authCode,
    }),
    signal: AbortSignal.timeout(12000),
  });

  const payload = await response.json() as TikTokTokenResponse;
  if (!response.ok || payload.code !== 0 || !payload.data?.access_token) {
    throw new Error(payload.message || 'Gagal menukar TikTok auth code');
  }

  return payload.data;
}

async function fetchAdvertisers(accessToken: string): Promise<TikTokAdvertiserItem[]> {
  const response = await fetch(`${TIKTOK_BUSINESS_BASE}/oauth2/advertiser/get/`, {
    headers: { 'Access-Token': accessToken },
    signal: AbortSignal.timeout(12000),
  });
  const payload = await response.json() as TikTokAdvertiserResponse;
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || 'Gagal membaca TikTok advertiser list');
  }

  const list = payload.data?.list || payload.data?.advertisers;
  if (Array.isArray(list)) return list;

  const ids = Array.isArray(payload.data?.advertiser_ids) ? payload.data?.advertiser_ids : [];
  return ids.map((advertiserId) => ({ advertiser_id: advertiserId, advertiser_name: advertiserId }));
}

export async function handleTikTokAdsCallback(
  authCode: string,
  state: string,
): Promise<{ redirectUrl: string }> {
  const statePayload = decodeStateToken(state);
  const tenantId = Number(statePayload.tenantId);
  const returnPath = getString(statePayload.returnPath, '/medsos/connections');
  if (!tenantId) {
    throw new Error('State TikTok tidak valid. Mulai koneksi dari tombol Connect di dashboard, bukan dari URL statis portal.');
  }

  const token = await exchangeAuthCode(authCode);
  const advertisers = await fetchAdvertisers(token.access_token!);
  const primaryAdvertiser = advertisers[0] || null;
  const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null;
  const refreshExpiresAt = token.refresh_token_expires_in
    ? new Date(Date.now() + token.refresh_token_expires_in * 1000).toISOString()
    : null;

  await prisma.integrations.upsert({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: INTEGRATION_TYPE,
      },
    },
    update: {
      status: 'connected',
      is_active: true,
      credentials: encrypt({
        accessToken: token.access_token,
        refreshToken: token.refresh_token || null,
        expiresAt,
        refreshExpiresAt,
      }),
      configuration: {
        workspaceName: getString(primaryAdvertiser?.advertiser_name, 'TikTok Ads'),
        callbackUrl: getRedirectUri(),
      },
      metadata: {
        connectedViaOAuth: true,
        oauthConnectedAt: new Date().toISOString(),
        scope: token.scope || null,
        advertisers: advertisers.map((item) => ({
          id: getString(item.advertiser_id),
          name: getString(item.advertiser_name, getString(item.advertiser_id, 'TikTok Advertiser')),
          role: item.advertiser_role || null,
          businessCenterId: item.bc_id || null,
          businessCenterName: item.bc_name || null,
          status: item.status || null,
          timezone: item.timezone || null,
          currency: item.currency || null,
        })),
        healthScore: advertisers.length > 0 ? 92 : 72,
      },
      activated_at: new Date(),
      last_sync_at: new Date(),
      updated_at: new Date(),
    },
    create: {
      tenant_id: tenantId,
      integration_type: INTEGRATION_TYPE,
      status: 'connected',
      is_active: true,
      credentials: encrypt({
        accessToken: token.access_token,
        refreshToken: token.refresh_token || null,
        expiresAt,
        refreshExpiresAt,
      }),
      configuration: {
        workspaceName: getString(primaryAdvertiser?.advertiser_name, 'TikTok Ads'),
        callbackUrl: getRedirectUri(),
      },
      metadata: {
        connectedViaOAuth: true,
        oauthConnectedAt: new Date().toISOString(),
        scope: token.scope || null,
        advertisers: advertisers.map((item) => ({
          id: getString(item.advertiser_id),
          name: getString(item.advertiser_name, getString(item.advertiser_id, 'TikTok Advertiser')),
          role: item.advertiser_role || null,
          businessCenterId: item.bc_id || null,
          businessCenterName: item.bc_name || null,
          status: item.status || null,
          timezone: item.timezone || null,
          currency: item.currency || null,
        })),
        healthScore: advertisers.length > 0 ? 92 : 72,
      },
      activated_at: new Date(),
      last_sync_at: new Date(),
    },
  });

  const redirectUrl = new URL(`${getFrontendBaseUrl()}${returnPath}`);
  redirectUrl.searchParams.set('ads_connected', 'tiktok');
  redirectUrl.searchParams.set('provider', 'tiktok-ads-hub');
  redirectUrl.searchParams.set('status', 'connected');
  redirectUrl.searchParams.set('source', 'oauth');
  return { redirectUrl: redirectUrl.toString() };
}

export async function listTikTokAdsConnectedAccounts(tenantId: number) {
  const row = await prisma.integrations.findUnique({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: INTEGRATION_TYPE,
      },
    },
    select: { id: true, status: true, is_active: true, configuration: true, metadata: true },
  });

  if (!row?.is_active || row.status !== 'connected') return [];
  const metadata = asRecord(row.metadata);
  const advertisers = Array.isArray(metadata.advertisers) ? metadata.advertisers.map(asRecord) : [];
  const primary = advertisers[0] || {};
  const displayName = getString(primary.name, getString(asRecord(row.configuration).workspaceName, 'TikTok Ads'));
  const username = getString(primary.id, `direct-${row.id}`);

  return [{
    id: `tiktok-direct:${row.id}`,
    platform: 'tiktokads',
    username,
    displayName,
    profileUrl: null,
    isActive: true,
  }];
}

export async function disconnectTikTokAdsIntegration(tenantId: number): Promise<boolean> {
  const existing = await prisma.integrations.findUnique({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: INTEGRATION_TYPE,
      },
    },
    select: { id: true, credentials: true },
  });

  if (!existing) return false;

  await prisma.integrations.update({
    where: { id: existing.id },
    data: {
      status: 'inactive',
      is_active: false,
      credentials: {},
      metadata: {
        disconnectedAt: new Date().toISOString(),
        previousConnectionMasked: maskReference(String(existing.id)),
      },
      updated_at: new Date(),
    },
  });

  return true;
}

export async function getTikTokAdsSummary(tenantId: number) {
  const row = await prisma.integrations.findUnique({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: INTEGRATION_TYPE,
      },
    },
    select: { status: true, is_active: true, credentials: true, configuration: true, metadata: true, last_sync_at: true },
  });

  if (!row?.is_active || row.status !== 'connected') return null;

  let hasToken = false;
  try {
    const credentials = decrypt(row.credentials as string) as JsonRecord;
    hasToken = Boolean(credentials.accessToken);
  } catch {
    hasToken = false;
  }

  const metadata = asRecord(row.metadata);
  const advertisers = Array.isArray(metadata.advertisers) ? metadata.advertisers : [];
  return {
    connected: hasToken,
    provider: 'tiktok-ads-hub',
    workspaceName: getString(asRecord(row.configuration).workspaceName, 'TikTok Ads'),
    advertisers,
    scope: metadata.scope || null,
    lastSyncAt: row.last_sync_at,
  };
}
