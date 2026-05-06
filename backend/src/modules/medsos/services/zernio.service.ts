import prisma from '../../../utils/prisma';

const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY || '';
const BASE = 'https://zernio.com/api/v1';

function headers() {
  return {
    Authorization: `Bearer ${ZERNIO_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function zFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(10000),
  });
  const json = await resp.json() as T & { error?: string };
  if (!resp.ok) throw new Error((json as any).error ?? `Zernio error ${resp.status}`);
  return json;
}

// ─── Profile per tenant ────────────────────────────────────────────────────

async function getStoredProfileId(tenantId: number): Promise<string | null> {
  const row = await prisma.integrations.findUnique({
    where: { tenant_id_integration_type: { tenant_id: tenantId, integration_type: 'zernio_profile' } },
    select: { metadata: true },
  });
  return (row?.metadata as any)?.profileId ?? null;
}

async function storeProfileId(tenantId: number, profileId: string): Promise<void> {
  await prisma.integrations.upsert({
    where: { tenant_id_integration_type: { tenant_id: tenantId, integration_type: 'zernio_profile' } },
    update: { metadata: { profileId }, is_active: true, status: 'active', updated_at: new Date() },
    create: { tenant_id: tenantId, integration_type: 'zernio_profile', status: 'active', is_active: true, metadata: { profileId } },
  });
}

export async function getOrCreateZernioProfile(tenantId: number, tenantName?: string): Promise<string> {
  const existing = await getStoredProfileId(tenantId);
  if (existing) return existing;

  const data = await zFetch<{ profile: { _id: string } }>('/profiles', {
    method: 'POST',
    body: JSON.stringify({ name: tenantName ?? `Tenant ${tenantId}` }),
  });

  await storeProfileId(tenantId, data.profile._id);
  return data.profile._id;
}

// ─── Connect / Disconnect ──────────────────────────────────────────────────

export async function getConnectUrl(
  tenantId: number,
  platform: string,
  redirectUrl: string,
  tenantName?: string,
): Promise<string> {
  const profileId = await getOrCreateZernioProfile(tenantId, tenantName);
  const qs = new URLSearchParams({ profileId, redirectUrl });
  const data = await zFetch<{ authUrl: string }>(`/connect/${platform}?${qs}`);
  return data.authUrl;
}

export interface ZernioAccount {
  id: string;
  platform: string;
  username: string;
  displayName: string;
  profileUrl: string | null;
  isActive: boolean;
}

export async function listZernioAccounts(tenantId: number, tenantName?: string): Promise<ZernioAccount[]> {
  const profileId = await getOrCreateZernioProfile(tenantId, tenantName);
  const data = await zFetch<{ accounts: any[] }>(`/accounts?profileId=${profileId}`);
  return (data.accounts ?? []).map((a) => ({
    id: a._id ?? a.id,
    platform: a.platform,
    username: a.username ?? a.accountId ?? '',
    displayName: a.displayName ?? a.name ?? a.username ?? a.platform,
    profileUrl: a.profileUrl ?? null,
    isActive: a.isActive ?? true,
  }));
}

export async function disconnectZernioAccount(accountId: string): Promise<void> {
  await zFetch(`/accounts/${accountId}`, { method: 'DELETE' });
}

// ─── Ads summary ──────────────────────────────────────────────────────────

export interface ZernioAdsSummary {
  connectedVia: 'zernio';
  accountName: string | null;
  adAccounts: Array<{ id: string; name: string; currency?: string }>;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    spend: number;
    impressions: number;
    clicks: number;
  }>;
  totals: { spend: number; impressions: number; clicks: number };
}

export async function getZernioAdsSummary(tenantId: number): Promise<ZernioAdsSummary | null> {
  try {
    const accounts = await listZernioAccounts(tenantId);
    const fbAccount = accounts.find((a) => a.platform === 'facebook');
    if (!fbAccount) return null;

    // Fetch ad accounts linked to this Facebook connection
    const adAccountsData = await zFetch<{ adAccounts?: any[] }>(`/ads/accounts?accountId=${fbAccount.id}`)
      .catch(() => ({ adAccounts: [] }));

    const adAccounts: Array<{ id: string; name: string; currency?: string }> = (adAccountsData.adAccounts ?? []).map((a: any) => ({
      id: a.id ?? a.accountId,
      name: a.name ?? a.id,
      currency: a.currency,
    }));

    // Fetch campaigns for first ad account
    let campaigns: ZernioAdsSummary['campaigns'] = [];
    if (adAccounts[0]) {
      const adsData = await zFetch<{ ads?: any[] }>(`/ads?accountId=${fbAccount.id}&adAccountId=${adAccounts[0].id}`)
        .catch(() => ({ ads: [] }));
      campaigns = (adsData.ads ?? []).map((c: any) => ({
        id: c.id,
        name: c.name ?? c.id,
        status: c.status ?? 'UNKNOWN',
        spend: parseFloat(c.spend ?? '0'),
        impressions: parseInt(c.impressions ?? '0', 10),
        clicks: parseInt(c.clicks ?? '0', 10),
      }));
    }

    const totals = campaigns.reduce(
      (acc, c) => ({ spend: acc.spend + c.spend, impressions: acc.impressions + c.impressions, clicks: acc.clicks + c.clicks }),
      { spend: 0, impressions: 0, clicks: 0 },
    );

    return { connectedVia: 'zernio', accountName: fbAccount.displayName, adAccounts, campaigns, totals };
  } catch {
    return null;
  }
}
