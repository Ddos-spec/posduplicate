import prisma from '../../../utils/prisma';
import { decrypt, encrypt } from '../../../utils/crypto';

const GRAPH_VERSION = 'v19.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function getBackendPublicUrl(): string {
  return (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function getFrontendBaseUrl(): string {
  const configured = process.env.FRONTEND_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
  return configured.split(',')[0].trim().replace(/\/$/, '');
}

export function getMetaCallbackUrl(): string {
  return `${getBackendPublicUrl()}/api/medsos/meta-oauth/callback`;
}

function buildStateToken(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeStateToken(state: string): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function buildMetaOAuthUrl(state: string): string {
  const appId = process.env.META_APP_ID || '';
  if (!appId) throw new Error('META_APP_ID tidak diset di environment');

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: getMetaCallbackUrl(),
    state,
    scope: 'ads_read,ads_management,business_management,pages_read_engagement',
    response_type: 'code',
  });

  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

export function buildMetaOAuthStartUrl(tenantId: number, userId: number, returnPath?: string): string {
  const state = buildStateToken({
    tenantId,
    userId,
    returnPath: returnPath || '/medsos/connections',
    ts: Date.now(),
  });
  return buildMetaOAuthUrl(state);
}

async function exchangeCode(code: string): Promise<string> {
  const appId = process.env.META_APP_ID || '';
  const appSecret = process.env.META_APP_SECRET || '';

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: getMetaCallbackUrl(),
    code,
  });

  const resp = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`, {
    signal: AbortSignal.timeout(10000),
  });
  const data = await resp.json() as { access_token?: string; error?: { message: string } };

  if (!data.access_token) {
    throw new Error(data.error?.message || 'Gagal menukar code Meta');
  }
  return data.access_token;
}

async function exchangeForLongLivedToken(shortToken: string): Promise<string> {
  const appId = process.env.META_APP_ID || '';
  const appSecret = process.env.META_APP_SECRET || '';

  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  });

  const resp = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`, {
    signal: AbortSignal.timeout(10000),
  });
  const data = await resp.json() as { access_token?: string; error?: { message: string } };

  if (!data.access_token) {
    throw new Error(data.error?.message || 'Gagal mendapatkan long-lived token');
  }
  return data.access_token;
}

async function fetchMetaUser(token: string): Promise<{ id: string; name: string; email?: string }> {
  const resp = await fetch(`${GRAPH_BASE}/me?fields=id,name,email&access_token=${token}`, {
    signal: AbortSignal.timeout(8000),
  });
  return resp.json() as Promise<{ id: string; name: string; email?: string }>;
}

async function fetchAdAccounts(token: string): Promise<Array<{ id: string; name: string; currency: string; account_status: number }>> {
  const resp = await fetch(
    `${GRAPH_BASE}/me/adaccounts?fields=id,name,currency,account_status,amount_spent&access_token=${token}&limit=20`,
    { signal: AbortSignal.timeout(8000) }
  );
  const data = await resp.json() as { data?: Array<{ id: string; name: string; currency: string; account_status: number }> };
  return data.data ?? [];
}

export async function handleMetaCallback(code: string, state: string): Promise<{ redirectUrl: string }> {
  const statePayload = decodeStateToken(state);
  const tenantId = Number(statePayload.tenantId);
  const returnPath = String(statePayload.returnPath || '/medsos/connections');

  if (!tenantId) throw new Error('State token tidak valid');

  const shortToken = await exchangeCode(code);
  const longToken = await exchangeForLongLivedToken(shortToken);
  const user = await fetchMetaUser(longToken);
  const adAccounts = await fetchAdAccounts(longToken);

  await prisma.integrations.upsert({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: 'managed_meta_ads_hub',
      },
    },
    update: {
      status: 'connected',
      is_active: true,
      credentials: encrypt({ accessToken: longToken, metaUserId: user.id }),
      configuration: { workspaceName: user.name },
      metadata: {
        metaUserName: user.name,
        metaUserId: user.id,
        adAccounts: adAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          currency: a.currency,
          status: a.account_status,
        })),
        connectedViaOAuth: true,
        oauthConnectedAt: new Date().toISOString(),
        healthScore: 92,
      },
      activated_at: new Date(),
      last_sync_at: new Date(),
      updated_at: new Date(),
    },
    create: {
      tenant_id: tenantId,
      integration_type: 'managed_meta_ads_hub',
      status: 'connected',
      is_active: true,
      credentials: encrypt({ accessToken: longToken, metaUserId: user.id }),
      configuration: { workspaceName: user.name },
      metadata: {
        metaUserName: user.name,
        metaUserId: user.id,
        adAccounts: adAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          currency: a.currency,
          status: a.account_status,
        })),
        connectedViaOAuth: true,
        oauthConnectedAt: new Date().toISOString(),
        healthScore: 92,
      },
      activated_at: new Date(),
      last_sync_at: new Date(),
    },
  });

  const redirectUrl = new URL(`${getFrontendBaseUrl()}${returnPath}`);
  redirectUrl.searchParams.set('provider', 'meta-ads-hub');
  redirectUrl.searchParams.set('status', 'connected');
  redirectUrl.searchParams.set('source', 'oauth');
  return { redirectUrl: redirectUrl.toString() };
}

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  insights?: { data: Array<{ spend: string; impressions: string; clicks: string; reach: string; ctr: string; cpm: string }> };
}

export interface MetaAdsSummary {
  metaUserName: string | null;
  adAccounts: Array<{ id: string; name: string; currency: string }>;
  activeCampaigns: number;
  totalCampaigns: number;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    objective: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: string;
    cpm: string;
    dailyBudget: number | null;
    lifetimeBudget: number | null;
  }>;
  totals: { spend: number; impressions: number; clicks: number };
}

export async function getMetaAdsSummary(tenantId: number): Promise<MetaAdsSummary | null> {
  const row = await prisma.integrations.findUnique({
    where: {
      tenant_id_integration_type: {
        tenant_id: tenantId,
        integration_type: 'managed_meta_ads_hub',
      },
    },
    select: { is_active: true, credentials: true, metadata: true },
  });

  if (!row?.is_active) return null;

  let token: string | null = null;
  try {
    const creds = decrypt(row.credentials as string) as { accessToken?: string };
    token = creds.accessToken ?? null;
  } catch {
    return null;
  }

  if (!token) return null;

  const metadata = (row.metadata ?? {}) as {
    metaUserName?: string;
    adAccounts?: Array<{ id: string; name: string; currency: string }>;
  };

  const adAccounts = metadata.adAccounts ?? [];
  const campaigns: MetaCampaign[] = [];

  if (adAccounts[0]) {
    try {
      const resp = await fetch(
        `${GRAPH_BASE}/${adAccounts[0].id}/campaigns?fields=name,status,objective,daily_budget,lifetime_budget,insights{spend,impressions,clicks,reach,ctr,cpm}&access_token=${token}&limit=30`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await resp.json() as { data?: MetaCampaign[]; error?: { message: string } };
      if (data.data) campaigns.push(...data.data);
    } catch {
      // token might be expired — still return partial data
    }
  }

  let totalSpend = 0;
  let totalImpressions = 0;
  let totalClicks = 0;

  const mappedCampaigns = campaigns.map((c) => {
    const insight = c.insights?.data?.[0];
    const spend = parseFloat(insight?.spend ?? '0');
    const impressions = parseInt(insight?.impressions ?? '0', 10);
    const clicks = parseInt(insight?.clicks ?? '0', 10);
    totalSpend += spend;
    totalImpressions += impressions;
    totalClicks += clicks;
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      spend,
      impressions,
      clicks,
      ctr: insight?.ctr ?? '0',
      cpm: insight?.cpm ?? '0',
      dailyBudget: c.daily_budget ? parseInt(c.daily_budget, 10) / 100 : null,
      lifetimeBudget: c.lifetime_budget ? parseInt(c.lifetime_budget, 10) / 100 : null,
    };
  });

  return {
    metaUserName: metadata.metaUserName ?? null,
    adAccounts,
    activeCampaigns: mappedCampaigns.filter((c) => c.status === 'ACTIVE').length,
    totalCampaigns: mappedCampaigns.length,
    campaigns: mappedCampaigns,
    totals: { spend: totalSpend, impressions: totalImpressions, clicks: totalClicks },
  };
}
