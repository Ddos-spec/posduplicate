import prisma from '../../../utils/prisma';

const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY || '';
const BASE = 'https://zernio.com/api/v1';
const ZERNIO_CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const zernioCache = new Map<string, CacheEntry<unknown>>();

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
  if (!resp.ok) throw new Error((json as any).error ?? `Upstream service error ${resp.status}`);
  return json;
}

function getCacheValue<T>(key: string): T | null {
  const entry = zernioCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    zernioCache.delete(key);
    return null;
  }

  return entry.value as T;
}

function setCacheValue<T>(key: string, value: T, ttlMs = ZERNIO_CACHE_TTL_MS): T {
  zernioCache.set(key, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
  return value;
}

async function getOrSetCache<T>(key: string, factory: () => Promise<T>, refresh = false, ttlMs = ZERNIO_CACHE_TTL_MS): Promise<T> {
  if (!refresh) {
    const cached = getCacheValue<T>(key);
    if (cached !== null) {
      return cached;
    }
  }

  const value = await factory();
  return setCacheValue(key, value, ttlMs);
}

// ─── Profile per tenant ────────────────────────────────────────────────────

type StoredZernioProfile = {
  profileId: string | null;
  profileName: string | null;
};

async function getStoredProfile(tenantId: number): Promise<StoredZernioProfile> {
  const row = await prisma.integrations.findUnique({
    where: { tenant_id_integration_type: { tenant_id: tenantId, integration_type: 'zernio_profile' } },
    select: { metadata: true },
  });
  const metadata = (row?.metadata as Record<string, unknown> | null) ?? null;
  return {
    profileId: typeof metadata?.profileId === 'string' ? metadata.profileId : null,
    profileName: typeof metadata?.profileName === 'string' ? metadata.profileName : null,
  };
}

async function resolveTenantProfileName(tenantId: number, tenantName?: string): Promise<string> {
  const explicitName = tenantName?.trim();
  if (explicitName) {
    return explicitName;
  }

  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      business_name: true,
    },
  });

  const resolvedName = tenant?.business_name?.trim() || `Tenant ${tenantId}`;

  return resolvedName;
}

async function updateProfileName(profileId: string, profileName: string): Promise<void> {
  await zFetch(`/profiles/${profileId}`, {
    method: 'PUT',
    body: JSON.stringify({ name: profileName }),
  });
}

async function storeProfileId(tenantId: number, profileId: string, profileName?: string): Promise<void> {
  await prisma.integrations.upsert({
    where: { tenant_id_integration_type: { tenant_id: tenantId, integration_type: 'zernio_profile' } },
    update: { metadata: { profileId, profileName: profileName || null }, is_active: true, status: 'active', updated_at: new Date() },
    create: { tenant_id: tenantId, integration_type: 'zernio_profile', status: 'active', is_active: true, metadata: { profileId, profileName: profileName || null } },
  });
}

export async function getOrCreateZernioProfile(tenantId: number, tenantName?: string): Promise<string> {
  const profileName = await resolveTenantProfileName(tenantId, tenantName);
  const existing = await getStoredProfile(tenantId);
  if (existing.profileId) {
    if (existing.profileName !== profileName) {
      try {
        await updateProfileName(existing.profileId, profileName);
      } catch {
        // Ignore remote rename failures so reads/connects keep working.
      }
      await storeProfileId(tenantId, existing.profileId, profileName);
    }
    return existing.profileId;
  }

  const data = await zFetch<{ profile: { _id: string } }>('/profiles', {
    method: 'POST',
    body: JSON.stringify({ name: profileName }),
  });

  await storeProfileId(tenantId, data.profile._id, profileName);
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
  const qs = new URLSearchParams({ profileId, redirect_url: redirectUrl });
  const data = await zFetch<{ authUrl: string }>(`/connect/${platform}?${qs}`);
  return data.authUrl;
}

export async function getAdsConnectUrl(
  tenantId: number,
  platform: string,
  redirectUrl: string,
  accountId?: string,
  tenantName?: string,
): Promise<string> {
  const profileId = await getOrCreateZernioProfile(tenantId, tenantName);
  const qs = new URLSearchParams({ profileId });
  if (redirectUrl) {
    qs.set('redirect_url', redirectUrl);
  }
  if (accountId) {
    qs.set('accountId', accountId);
  }
  const data = await zFetch<{ authUrl: string }>(`/connect/${platform}/ads?${qs}`);
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
  const qs = new URLSearchParams({
    profileId,
    includeOverLimit: 'true',
  });
  const data = await zFetch<{ accounts: any[] }>(`/accounts?${qs.toString()}`);
  return (data.accounts ?? []).map((a) => ({
    id: a._id ?? a.id,
    platform: a.platform,
    username: a.username ?? a.accountId ?? '',
    displayName: a.displayName ?? a.name ?? a.username ?? a.platform,
    profileUrl: a.profileUrl ?? null,
    isActive: a.isActive ?? true,
  }));
}

export async function disconnectZernioAccount(accountId: string, _tenantId?: number): Promise<void> {
  await zFetch(`/accounts/${accountId}`, { method: 'DELETE' });
  zernioCache.clear();
}

// ─── Post Management ───────────────────────────────────────────────────────

export interface ZernioPostPayload {
  text?: string;
  mediaUrls?: string[];
  socialAccountIds?: string[];
  platforms?: Array<{ platform: string; accountId: string }>;
  scheduledAt?: string;
  publishNow?: boolean;
  isDraft?: boolean;
}

export async function createZernioPost(
  tenantId: number,
  payload: ZernioPostPayload
): Promise<any> {
  const profileId = await getOrCreateZernioProfile(tenantId);
  const body = {
    profileId,
    ...payload,
  };
  
  const raw = await zFetch<any>('/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  
  return raw;
}

// ─── Media Management ──────────────────────────────────────────────────────

export async function generateZernioUploadLink(tenantId: number): Promise<any> {
  const profileId = await getOrCreateZernioProfile(tenantId);
  // Based on standard Zernio API for media
  const raw = await zFetch<any>(`/media/upload-link?profileId=${profileId}`, {
    method: 'POST',
  });
  return raw;
}

export async function checkZernioUploadStatus(tenantId: number, token: string): Promise<any> {
  await getOrCreateZernioProfile(tenantId); // ensure profile exists
  const raw = await zFetch<any>(`/media/status/${encodeURIComponent(token)}`);
  return raw;
}

// ─── Post analytics ───────────────────────────────────────────────────────

export interface ZernioPostAnalyticsItem {
  postId: string;
  content: string | null;
  status: string | null;
  scheduledFor: string | null;
  publishedAt: string | null;
  platform: string | null;
  platformPostUrl: string | null;
  thumbnailUrl: string | null;
  mediaType: string | null;
  analytics: {
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    clicks: number;
    views: number;
    engagementRate: number;
    lastUpdated: string | null;
  };
  platformAnalytics: Array<{
    platform: string;
    accountId: string | null;
    accountUsername: string | null;
    analytics: {
      impressions: number;
      reach: number;
      likes: number;
      comments: number;
      shares: number;
      saves: number;
    };
  }>;
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapAnalyticsPost(raw: any): ZernioPostAnalyticsItem {
  const a = raw.analytics ?? {};
  return {
    postId: String(raw.postId ?? raw._id ?? raw.id ?? ''),
    content: raw.content ?? raw.caption ?? null,
    status: raw.status ?? null,
    scheduledFor: raw.scheduledFor ?? null,
    publishedAt: raw.publishedAt ?? null,
    platform: raw.platform ?? null,
    platformPostUrl: raw.platformPostUrl ?? null,
    thumbnailUrl: raw.thumbnailUrl ?? null,
    mediaType: raw.mediaType ?? null,
    analytics: {
      impressions: toNum(a.impressions),
      reach: toNum(a.reach),
      likes: toNum(a.likes),
      comments: toNum(a.comments),
      shares: toNum(a.shares),
      saves: toNum(a.saves),
      clicks: toNum(a.clicks),
      views: toNum(a.views),
      engagementRate: toNum(a.engagementRate),
      lastUpdated: a.lastUpdated ?? null,
    },
    platformAnalytics: (raw.platformAnalytics ?? []).map((p: any) => ({
      platform: p.platform ?? '',
      accountId: p.accountId ?? null,
      accountUsername: p.accountUsername ?? null,
      analytics: {
        impressions: toNum(p.analytics?.impressions),
        reach: toNum(p.analytics?.reach),
        likes: toNum(p.analytics?.likes),
        comments: toNum(p.analytics?.comments),
        shares: toNum(p.analytics?.shares),
        saves: toNum(p.analytics?.saves),
      },
    })),
  };
}

export async function getZernioPostAnalytics(
  tenantId: number,
  params: {
    platform?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
    order?: string;
    refresh?: boolean;
  } = {},
): Promise<ZernioPostAnalyticsItem[]> {
  const profileId = await getOrCreateZernioProfile(tenantId);
  const cacheKey = `zernio-post-analytics-${tenantId}-${JSON.stringify(params)}`;
  return getOrSetCache(
    cacheKey,
    async () => {
      const qs = new URLSearchParams({ profileId, limit: String(params.limit ?? 50), page: String(params.page ?? 1) });
      if (params.platform) qs.set('platform', params.platform);
      if (params.fromDate) qs.set('fromDate', params.fromDate);
      if (params.toDate) qs.set('toDate', params.toDate);
      if (params.sortBy) qs.set('sortBy', params.sortBy);
      if (params.order) qs.set('order', params.order);
      const raw = await zFetch<any>(`/analytics?${qs}`);
      const list: any[] = raw.posts ?? raw.data ?? (Array.isArray(raw) ? raw : []);
      return list.map(mapAnalyticsPost);
    },
    params.refresh ?? false,
  );
}

// ─── CRM, Broadcasts, Sequences, Automations ───────────────────────────────

export async function listZernioContacts(tenantId: number): Promise<any> {
  const profileId = await getOrCreateZernioProfile(tenantId);
  const raw = await zFetch<any>(`/contacts?profileId=${profileId}`);
  return raw;
}

export async function createZernioBroadcast(tenantId: number, payload: any): Promise<any> {
  const profileId = await getOrCreateZernioProfile(tenantId);
  const raw = await zFetch<any>('/broadcasts', {
    method: 'POST',
    body: JSON.stringify({ profileId, ...payload }),
  });
  return raw;
}

export async function createZernioSequence(tenantId: number, payload: any): Promise<any> {
  const profileId = await getOrCreateZernioProfile(tenantId);
  const raw = await zFetch<any>('/sequences', {
    method: 'POST',
    body: JSON.stringify({ profileId, ...payload }),
  });
  return raw;
}

export async function createZernioAutomation(tenantId: number, payload: any): Promise<any> {
  const profileId = await getOrCreateZernioProfile(tenantId);
  const raw = await zFetch<any>('/automations', {
    method: 'POST',
    body: JSON.stringify({ profileId, ...payload }),
  });
  return raw;
}

// ─── Inbox conversations ──────────────────────────────────────────────────

export interface ZernioConversation {
  id: string;
  platform: string;
  accountId: string;
  accountUsername: string;
  participantId: string;
  participantName: string;
  participantPicture: string | null;
  participantVerifiedType: string | null;
  lastMessage: string;
  updatedTime: string;
  status: 'active' | 'archived';
  unreadCount: number;
  url: string | null;
}

export interface ZernioMessage {
  id: string;
  conversationId: string;
  text: string | null;
  attachments?: Array<{ type: string; url: string }>;
  timestamp: string;
  fromParticipant: boolean;
  senderName: string | null;
}

export async function getZernioConversations(
  tenantId: number,
  params: {
    platform?: string;
    status?: 'active' | 'archived';
    limit?: number;
    cursor?: string;
    accountId?: string;
    refresh?: boolean;
  } = {},
): Promise<{ conversations: ZernioConversation[]; hasMore: boolean; nextCursor: string | null }> {
  const profileId = await getOrCreateZernioProfile(tenantId);
  const cacheKey = `zernio-conversations-${tenantId}-${JSON.stringify(params)}`;
  return getOrSetCache(
    cacheKey,
    async () => {
      const qs = new URLSearchParams({ profileId, limit: String(params.limit ?? 50) });
      if (params.platform) qs.set('platform', params.platform);
      if (params.status) qs.set('status', params.status);
      if (params.cursor) qs.set('cursor', params.cursor);
      if (params.accountId) qs.set('accountId', params.accountId);
      const raw = await zFetch<{ data: any[]; pagination?: { hasMore?: boolean; nextCursor?: string } }>(`/inbox/conversations?${qs}`);
      const data = raw.data ?? (Array.isArray(raw) ? raw : []);
      return {
        conversations: data.map((c: any): ZernioConversation => ({
          id: String(c.id ?? c._id ?? ''),
          platform: c.platform ?? '',
          accountId: c.accountId ?? '',
          accountUsername: c.accountUsername ?? '',
          participantId: c.participantId ?? '',
          participantName: c.participantName ?? c.participantId ?? 'Unknown',
          participantPicture: c.participantPicture ?? null,
          participantVerifiedType: c.participantVerifiedType ?? null,
          lastMessage: c.lastMessage ?? '',
          updatedTime: c.updatedTime ?? new Date().toISOString(),
          status: (c.status === 'archived' ? 'archived' : 'active') as 'active' | 'archived',
          unreadCount: toNum(c.unreadCount),
          url: c.url ?? null,
        })),
        hasMore: raw.pagination?.hasMore ?? false,
        nextCursor: raw.pagination?.nextCursor ?? null,
      };
    },
    params.refresh ?? false,
    60 * 1000, // 1 min cache for inbox
  );
}

export async function getZernioConversationMessages(
  conversationId: string,
  accountId?: string,
): Promise<ZernioMessage[]> {
  const qs = new URLSearchParams();
  if (accountId) qs.set('accountId', accountId);
  const suffix = qs.size > 0 ? `?${qs}` : '';
  const raw = await zFetch<any>(`/inbox/conversations/${encodeURIComponent(conversationId)}/messages${suffix}`);
  const list: any[] = raw.messages ?? raw.data ?? (Array.isArray(raw) ? raw : []);
  return list.map((m: any): ZernioMessage => {
    const isIncoming = m.direction === 'incoming' || m.from === 'participant' || m.fromParticipant === true;
    return {
      id: String(m.id ?? m._id ?? ''),
      conversationId,
      text: m.text ?? m.message ?? null,
      attachments: m.attachments ?? [],
      timestamp: m.timestamp ?? m.createdAt ?? new Date().toISOString(),
      fromParticipant: isIncoming,
      senderName: m.senderName ?? (isIncoming ? 'Customer' : 'Me'),
    };
  });
}

export async function sendZernioDirectMessage(
  conversationId: string,
  accountId: string,
  message: string,
): Promise<{ messageId: string; status: string }> {
  zernioCache.clear();
  const raw = await zFetch<any>(`/inbox/conversations/${encodeURIComponent(conversationId)}/send`, {
    method: 'POST',
    body: JSON.stringify({ accountId, message }),
  });
  return { messageId: String(raw.messageId ?? raw.id ?? ''), status: raw.status ?? 'sent' };
}

// ─── Ads summary ──────────────────────────────────────────────────────────

const ZERNIO_ADS_ACCOUNT_PLATFORMS = new Set(['metaads', 'googleads', 'linkedinads', 'tiktokads', 'pinterestads', 'xads']);
const ZERNIO_ADS_NETWORK_ORDER = ['metaads', 'googleads', 'linkedinads', 'tiktokads', 'pinterestads', 'xads'] as const;

const ZERNIO_ADS_NETWORK_LABELS: Record<string, string> = {
  metaads: 'Meta Ads',
  googleads: 'Google Ads',
  linkedinads: 'LinkedIn Ads',
  tiktokads: 'TikTok Ads',
  pinterestads: 'Pinterest Ads',
  xads: 'X Ads',
};

const ZERNIO_ADS_PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook Ads',
  instagram: 'Instagram Ads',
  google: 'Google Ads',
  linkedin: 'LinkedIn Ads',
  tiktok: 'TikTok Ads',
  pinterest: 'Pinterest Ads',
  twitter: 'X Ads',
  metaads: 'Meta Ads',
  googleads: 'Google Ads',
  linkedinads: 'LinkedIn Ads',
  tiktokads: 'TikTok Ads',
  pinterestads: 'Pinterest Ads',
  xads: 'X Ads',
};

type ZernioAdsNetworkKey = typeof ZERNIO_ADS_NETWORK_ORDER[number];

type ZernioPagination = {
  page?: number;
  limit?: number;
  total?: number;
  pages?: number;
};

type ZernioApiAdAccount = {
  id?: string;
  name?: string;
  currency?: string | null;
  status?: string | null;
  timezoneName?: string | null;
  timezoneOffsetHoursUtc?: number | null;
};

type ZernioApiAdMetrics = {
  spend?: number | string | null;
  impressions?: number | string | null;
  reach?: number | string | null;
  clicks?: number | string | null;
  ctr?: number | string | null;
  cpc?: number | string | null;
  cpm?: number | string | null;
  engagement?: number | string | null;
  conversions?: number | string | null;
  costPerConversion?: number | string | null;
  purchaseValue?: number | string | null;
  roas?: number | string | null;
};

type ZernioApiAdCampaign = {
  platformCampaignId?: string;
  platform?: string;
  campaignName?: string;
  status?: string;
  reviewStatus?: string | null;
  adCount?: number;
  budget?: { amount?: number | null; type?: string | null } | null;
  campaignBudget?: { amount?: number | null; type?: string | null } | null;
  budgetLevel?: string | null;
  currency?: string | null;
  metrics?: ZernioApiAdMetrics | null;
  platformAdAccountId?: string | null;
  platformAdAccountName?: string | null;
  accountId?: string;
  profileId?: string;
  platformObjective?: string | null;
  optimizationGoal?: string | null;
};

type ZernioApiAd = {
  _id?: string;
  name?: string;
  platform?: string;
  status?: string;
  adType?: string;
  goal?: string | null;
  isExternal?: boolean;
  budget?: { amount?: number | null; type?: string | null } | null;
  metrics?: ZernioApiAdMetrics | null;
  platformAdId?: string;
  platformAdAccountId?: string;
  platformCampaignId?: string;
  platformAdSetId?: string;
  campaignName?: string;
  adSetName?: string;
  platformObjective?: string | null;
  optimizationGoal?: string | null;
  platformAdAccountName?: string | null;
  platformCreatedAt?: string | null;
  creative?: {
    thumbnailUrl?: string | null;
    imageUrl?: string | null;
    videoUrl?: string | null;
    mediaUrls?: string[] | null;
    body?: string | null;
    googleHeadline?: string | null;
    googleDescription?: string | null;
    linkUrl?: string | null;
  } | null;
};

type ZernioApiAdAnalyticsResponse = {
  ad?: {
    id?: string;
    name?: string;
    platform?: string;
    status?: string;
  } | null;
  analytics?: {
    summary?: ZernioApiAdMetrics | null;
    daily?: Array<ZernioApiAdMetrics & { date?: string }> | null;
    breakdowns?: Record<string, Array<Record<string, any>>> | null;
  } | null;
};

type MetricAccumulator = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  engagement: number;
  conversions: number;
  purchaseValue: number;
};

export interface ZernioCurrencyTotals {
  currency: string;
  spend: number;
  purchaseValue: number;
  conversions: number;
  cpc: number | null;
  cpm: number | null;
  costPerConversion: number | null;
  roas: number | null;
}

export interface ZernioAdsMetrics {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  engagement: number;
  conversions: number;
  purchaseValue: number;
  ctr: number;
  cpc: number | null;
  cpm: number | null;
  costPerConversion: number | null;
  roas: number | null;
}

export interface ZernioAdsCampaignSummary {
  id: string;
  name: string;
  networkKey: ZernioAdsNetworkKey;
  networkLabel: string;
  platform: string;
  platformLabel: string;
  socialAccountId: string;
  socialAccountName: string;
  adAccountId: string | null;
  adAccountName: string | null;
  currency: string | null;
  status: string;
  reviewStatus: string | null;
  objective: string | null;
  optimizationGoal: string | null;
  budgetLevel: string | null;
  budgetAmount: number | null;
  budgetType: string | null;
  adCount: number;
  metrics: ZernioAdsMetrics;
}

export interface ZernioAdsLinkedAccountSummary {
  id: string;
  name: string;
  currency: string | null;
  status: string | null;
  timezoneName: string | null;
  timezoneOffsetHoursUtc: number | null;
  totalCampaigns: number;
  activeCampaigns: number;
  metrics: ZernioAdsMetrics;
  spendByCurrency: ZernioCurrencyTotals[];
  campaigns: ZernioAdsCampaignSummary[];
}

export interface ZernioAdsWorkspaceAccountSummary {
  id: string;
  platform: string;
  networkKey: ZernioAdsNetworkKey;
  networkLabel: string;
  username: string;
  displayName: string;
  profileUrl: string | null;
  isActive: boolean;
  totalCampaigns: number;
  activeCampaigns: number;
  metrics: ZernioAdsMetrics;
  spendByCurrency: ZernioCurrencyTotals[];
  adAccounts: ZernioAdsLinkedAccountSummary[];
}

export interface ZernioAdsPlatformSummary {
  key: ZernioAdsNetworkKey;
  label: string;
  connectedAccounts: number;
  linkedAdAccounts: number;
  totalCampaigns: number;
  activeCampaigns: number;
  metrics: ZernioAdsMetrics;
  spendByCurrency: ZernioCurrencyTotals[];
}

export interface ZernioAdsSummary {
  connectedVia: 'zernio';
  profileId: string;
  generatedAt: string;
  totals: {
    networks: number;
    connectedAccounts: number;
    linkedAdAccounts: number;
    totalCampaigns: number;
    activeCampaigns: number;
    metrics: ZernioAdsMetrics;
    spendByCurrency: ZernioCurrencyTotals[];
  };
  platforms: ZernioAdsPlatformSummary[];
  accounts: ZernioAdsWorkspaceAccountSummary[];
  campaigns: ZernioAdsCampaignSummary[];
}

export interface ZernioAdListItem {
  id: string;
  name: string;
  platform: string;
  platformLabel: string;
  status: string;
  adType: string | null;
  goal: string | null;
  isExternal: boolean;
  campaignId: string | null;
  campaignName: string | null;
  adSetId: string | null;
  adSetName: string | null;
  adAccountId: string | null;
  adAccountName: string | null;
  createdAt: string | null;
  objective: string | null;
  optimizationGoal: string | null;
  budgetAmount: number | null;
  budgetType: string | null;
  metrics: ZernioAdsMetrics;
  creative: {
    thumbnailUrl: string | null;
    imageUrl: string | null;
    videoUrl: string | null;
    mediaUrls: string[];
    body: string | null;
    headline: string | null;
    linkUrl: string | null;
  };
}

export interface ZernioAdAnalyticsDailyRow extends ZernioAdsMetrics {
  date: string;
}

export interface ZernioAdAnalyticsSummary {
  id: string;
  name: string;
  platform: string;
  platformLabel: string;
  status: string;
  summary: ZernioAdsMetrics;
  daily: ZernioAdAnalyticsDailyRow[];
  breakdowns: Record<string, Array<Record<string, any>>>;
}

type InternalCampaignSummary = ZernioAdsCampaignSummary & { _baseMetrics: MetricAccumulator };

function isZernioAdsPlatform(platform: string): platform is ZernioAdsNetworkKey {
  return ZERNIO_ADS_ACCOUNT_PLATFORMS.has(platform.toLowerCase());
}

function getNetworkKeyFromAccountPlatform(platform: string): ZernioAdsNetworkKey {
  const lowered = platform.toLowerCase();
  switch (lowered) {
    case 'metaads':
      return 'metaads';
    case 'googleads':
      return 'googleads';
    case 'linkedinads':
      return 'linkedinads';
    case 'tiktokads':
      return 'tiktokads';
    case 'pinterestads':
      return 'pinterestads';
    case 'xads':
      return 'xads';
    default:
      return 'metaads';
  }
}

function getNetworkKeyFromCampaignPlatform(platform: string): ZernioAdsNetworkKey {
  const lowered = platform.toLowerCase();
  switch (lowered) {
    case 'facebook':
    case 'instagram':
      return 'metaads';
    case 'google':
      return 'googleads';
    case 'linkedin':
      return 'linkedinads';
    case 'tiktok':
      return 'tiktokads';
    case 'pinterest':
      return 'pinterestads';
    case 'twitter':
      return 'xads';
    default:
      return 'metaads';
  }
}

function getNetworkLabel(networkKey: ZernioAdsNetworkKey): string {
  return ZERNIO_ADS_NETWORK_LABELS[networkKey] ?? networkKey;
}

function getPlatformLabel(platform: string): string {
  return ZERNIO_ADS_PLATFORM_LABELS[platform.toLowerCase()] ?? platform;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toInteger(value: unknown): number {
  return Math.trunc(toNumber(value));
}

function buildBaseMetrics(metrics?: ZernioApiAdMetrics | null): MetricAccumulator {
  return {
    spend: toNumber(metrics?.spend),
    impressions: toInteger(metrics?.impressions),
    reach: toInteger(metrics?.reach),
    clicks: toInteger(metrics?.clicks),
    engagement: toInteger(metrics?.engagement),
    conversions: toInteger(metrics?.conversions),
    purchaseValue: toNumber(metrics?.purchaseValue),
  };
}

function emptyBaseMetrics(): MetricAccumulator {
  return {
    spend: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
    engagement: 0,
    conversions: 0,
    purchaseValue: 0,
  };
}

function sumBaseMetrics(items: MetricAccumulator[]): MetricAccumulator {
  return items.reduce<MetricAccumulator>((acc, item) => ({
    spend: acc.spend + item.spend,
    impressions: acc.impressions + item.impressions,
    reach: acc.reach + item.reach,
    clicks: acc.clicks + item.clicks,
    engagement: acc.engagement + item.engagement,
    conversions: acc.conversions + item.conversions,
    purchaseValue: acc.purchaseValue + item.purchaseValue,
  }), emptyBaseMetrics());
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildMetricSummary(metrics: MetricAccumulator, currencyCount: number): ZernioAdsMetrics {
  const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
  const singleCurrency = currencyCount <= 1;
  const cpc = singleCurrency && metrics.clicks > 0 ? metrics.spend / metrics.clicks : null;
  const cpm = singleCurrency && metrics.impressions > 0 ? (metrics.spend / metrics.impressions) * 1000 : null;
  const costPerConversion = singleCurrency && metrics.conversions > 0 ? metrics.spend / metrics.conversions : null;
  const roas = singleCurrency && metrics.spend > 0 ? metrics.purchaseValue / metrics.spend : null;

  return {
    spend: roundMetric(metrics.spend),
    impressions: metrics.impressions,
    reach: metrics.reach,
    clicks: metrics.clicks,
    engagement: metrics.engagement,
    conversions: metrics.conversions,
    purchaseValue: roundMetric(metrics.purchaseValue),
    ctr: roundMetric(ctr),
    cpc: cpc == null ? null : roundMetric(cpc),
    cpm: cpm == null ? null : roundMetric(cpm),
    costPerConversion: costPerConversion == null ? null : roundMetric(costPerConversion),
    roas: roas == null ? null : roundMetric(roas),
  };
}

function buildSpendByCurrency(items: Array<{ currency: string | null; metrics: MetricAccumulator }>): ZernioCurrencyTotals[] {
  const grouped = new Map<string, MetricAccumulator>();

  for (const item of items) {
    const currency = (item.currency || 'UNSPECIFIED').toUpperCase();
    const current = grouped.get(currency) ?? emptyBaseMetrics();
    grouped.set(currency, {
      spend: current.spend + item.metrics.spend,
      impressions: current.impressions + item.metrics.impressions,
      reach: current.reach + item.metrics.reach,
      clicks: current.clicks + item.metrics.clicks,
      engagement: current.engagement + item.metrics.engagement,
      conversions: current.conversions + item.metrics.conversions,
      purchaseValue: current.purchaseValue + item.metrics.purchaseValue,
    });
  }

  return Array.from(grouped.entries())
    .map(([currency, metrics]) => {
      const summary = buildMetricSummary(metrics, 1);
      return {
        currency,
        spend: summary.spend,
        purchaseValue: summary.purchaseValue,
        conversions: summary.conversions,
        cpc: summary.cpc,
        cpm: summary.cpm,
        costPerConversion: summary.costPerConversion,
        roas: summary.roas,
      };
    })
    .sort((left, right) => right.spend - left.spend);
}

function summarizeCampaignGroup(campaigns: InternalCampaignSummary[]) {
  const baseMetrics = sumBaseMetrics(campaigns.map((campaign) => campaign._baseMetrics));
  const spendByCurrency = buildSpendByCurrency(campaigns.map((campaign) => ({
    currency: campaign.currency,
    metrics: campaign._baseMetrics,
  })));
  const metrics = buildMetricSummary(baseMetrics, spendByCurrency.length);

  return {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter((campaign) => campaign.status === 'active').length,
    metrics,
    spendByCurrency,
  };
}

async function listZernioPlatformAdAccounts(accountId: string): Promise<ZernioApiAdAccount[]> {
  const data = await zFetch<{ accounts?: ZernioApiAdAccount[] }>(`/ads/accounts?accountId=${encodeURIComponent(accountId)}&limit=1000`);
  return data.accounts ?? [];
}

async function listAllZernioAdCampaigns(
  profileId: string,
  options?: { fromDate?: string; toDate?: string },
): Promise<ZernioApiAdCampaign[]> {
  const allCampaigns: ZernioApiAdCampaign[] = [];
  let page = 1;
  let pages = 1;

  do {
    const qs = new URLSearchParams({
      profileId,
      page: String(page),
      limit: '100',
      source: 'all',
    });

    if (options?.fromDate) {
      qs.set('fromDate', options.fromDate);
    }

    if (options?.toDate) {
      qs.set('toDate', options.toDate);
    }

    const data = await zFetch<{ campaigns?: ZernioApiAdCampaign[]; pagination?: ZernioPagination }>(`/ads/campaigns?${qs}`);
    allCampaigns.push(...(data.campaigns ?? []));
    pages = Math.max(1, data.pagination?.pages ?? 1);
    page += 1;
  } while (page <= pages);

  return allCampaigns;
}

function normalizeZernioAd(ad: ZernioApiAd): ZernioAdListItem {
  const baseMetrics = buildBaseMetrics(ad.metrics);

  return {
    id: ad._id ?? ad.platformAdId ?? ad.name ?? 'unknown-ad',
    name: ad.name ?? 'Untitled ad',
    platform: String(ad.platform ?? '').toLowerCase(),
    platformLabel: getPlatformLabel(String(ad.platform ?? '')),
    status: String(ad.status ?? 'unknown').toLowerCase(),
    adType: ad.adType ?? null,
    goal: ad.goal ?? null,
    isExternal: Boolean(ad.isExternal),
    campaignId: ad.platformCampaignId ?? null,
    campaignName: ad.campaignName ?? null,
    adSetId: ad.platformAdSetId ?? null,
    adSetName: ad.adSetName ?? null,
    adAccountId: ad.platformAdAccountId ?? null,
    adAccountName: ad.platformAdAccountName ?? null,
    createdAt: ad.platformCreatedAt ?? null,
    objective: ad.platformObjective ?? null,
    optimizationGoal: ad.optimizationGoal ?? null,
    budgetAmount: ad.budget?.amount == null ? null : roundMetric(toNumber(ad.budget.amount)),
    budgetType: ad.budget?.type ?? null,
    metrics: buildMetricSummary(baseMetrics, 1),
    creative: {
      thumbnailUrl: ad.creative?.thumbnailUrl ?? null,
      imageUrl: ad.creative?.imageUrl ?? null,
      videoUrl: ad.creative?.videoUrl ?? null,
      mediaUrls: ad.creative?.mediaUrls ?? [],
      body: ad.creative?.body ?? ad.creative?.googleDescription ?? null,
      headline: ad.creative?.googleHeadline ?? null,
      linkUrl: ad.creative?.linkUrl ?? null,
    },
  };
}

export async function listZernioAdsForCampaign(
  tenantId: number,
  campaignId: string,
  accountId?: string,
  adAccountId?: string,
  options?: { fromDate?: string; toDate?: string; refresh?: boolean },
): Promise<ZernioAdListItem[]> {
  const profileId = await getOrCreateZernioProfile(tenantId);
  const qs = new URLSearchParams({
    profileId,
    campaignId,
    source: 'all',
    limit: '500',
  });

  if (accountId) {
    qs.set('accountId', accountId);
  }

  if (adAccountId) {
    qs.set('adAccountId', adAccountId);
  }

  if (options?.fromDate) {
    qs.set('fromDate', options.fromDate);
  }

  if (options?.toDate) {
    qs.set('toDate', options.toDate);
  }

  const cacheKey = [
    'zernio-ads-by-campaign',
    tenantId,
    profileId,
    campaignId,
    accountId || '',
    adAccountId || '',
    options?.fromDate || '',
    options?.toDate || '',
  ].join(':');

  return getOrSetCache(
    cacheKey,
    async () => {
      const data = await zFetch<{ ads?: ZernioApiAd[] }>(`/ads?${qs}`);
      return (data.ads ?? [])
        .map(normalizeZernioAd)
        .sort((left, right) => right.metrics.spend - left.metrics.spend);
    },
    options?.refresh ?? false,
  );
}

export async function getZernioAdAnalytics(
  _tenantId: number,
  adId: string,
  options?: { fromDate?: string; toDate?: string; breakdowns?: string[]; refresh?: boolean },
): Promise<ZernioAdAnalyticsSummary | null> {
  try {
    const qs = new URLSearchParams();
    if (options?.fromDate) {
      qs.set('fromDate', options.fromDate);
    }
    if (options?.toDate) {
      qs.set('toDate', options.toDate);
    }
    if (options?.breakdowns?.length) {
      qs.set('breakdowns', options.breakdowns.join(','));
    }

    const suffix = qs.size > 0 ? `?${qs}` : '';
    const cacheKey = [
      'zernio-ad-analytics',
      _tenantId,
      adId,
      options?.fromDate || '',
      options?.toDate || '',
      options?.breakdowns?.join(',') || '',
    ].join(':');

    return getOrSetCache(
      cacheKey,
      async () => {
        const data = await zFetch<ZernioApiAdAnalyticsResponse>(`/ads/${encodeURIComponent(adId)}/analytics${suffix}`);
        const summaryBase = buildBaseMetrics(data.analytics?.summary);
        const daily = (data.analytics?.daily ?? []).map((row) => ({
          date: row.date ?? '',
          ...buildMetricSummary(buildBaseMetrics(row), 1),
        }));

        return {
          id: data.ad?.id ?? adId,
          name: data.ad?.name ?? 'Untitled ad',
          platform: String(data.ad?.platform ?? '').toLowerCase(),
          platformLabel: getPlatformLabel(String(data.ad?.platform ?? '')),
          status: String(data.ad?.status ?? 'unknown').toLowerCase(),
          summary: buildMetricSummary(summaryBase, 1),
          daily,
          breakdowns: data.analytics?.breakdowns ?? {},
        };
      },
      options?.refresh ?? false,
    );
  } catch {
    return null;
  }
}

export async function getZernioAdsSummary(
  tenantId: number,
  options?: { fromDate?: string; toDate?: string; refresh?: boolean },
): Promise<ZernioAdsSummary | null> {
  try {
    const profileId = await getOrCreateZernioProfile(tenantId);
    const cacheKey = [
      'zernio-ads-summary',
      tenantId,
      profileId,
      options?.fromDate || '',
      options?.toDate || '',
    ].join(':');

    return getOrSetCache(
      cacheKey,
      async () => {
    const allAccounts = await listZernioAccounts(tenantId);
    const adsWorkspaceAccounts = allAccounts
      .filter((account) => isZernioAdsPlatform(account.platform))
      .map((account) => ({
        ...account,
        networkKey: getNetworkKeyFromAccountPlatform(account.platform),
      }));

    if (adsWorkspaceAccounts.length === 0) {
      return null;
    }

    const [rawCampaigns, adAccountsByWorkspaceAccount] = await Promise.all([
      listAllZernioAdCampaigns(profileId, options).catch(() => []),
      Promise.all(
        adsWorkspaceAccounts.map(async (account) => ({
          workspaceAccountId: account.id,
          adAccounts: await listZernioPlatformAdAccounts(account.id).catch(() => []),
        })),
      ),
    ]);

    const workspaceAccountMap = new Map(adsWorkspaceAccounts.map((account) => [account.id, account]));
    const workspaceAccountsByNetwork = new Map<ZernioAdsNetworkKey, typeof adsWorkspaceAccounts>();
    for (const account of adsWorkspaceAccounts) {
      const bucket = workspaceAccountsByNetwork.get(account.networkKey) ?? [];
      bucket.push(account);
      workspaceAccountsByNetwork.set(account.networkKey, bucket);
    }

    const resolveWorkspaceAccount = (campaign: ZernioApiAdCampaign) => {
      if (campaign.accountId && workspaceAccountMap.has(campaign.accountId)) {
        return workspaceAccountMap.get(campaign.accountId)!;
      }

      const networkKey = getNetworkKeyFromCampaignPlatform(campaign.platform || '');
      const candidates = workspaceAccountsByNetwork.get(networkKey) ?? [];
      return candidates.length === 1 ? candidates[0] : null;
    };

    const normalizedCampaigns = rawCampaigns
      .map<InternalCampaignSummary | null>((campaign) => {
        const owner = resolveWorkspaceAccount(campaign);
        if (!owner) {
          return null;
        }

        const baseMetrics = buildBaseMetrics(campaign.metrics);
        const budget = campaign.campaignBudget ?? campaign.budget ?? null;

        return {
          id: campaign.platformCampaignId ?? `${owner.id}:${campaign.platformAdAccountId ?? 'unknown'}:${campaign.campaignName ?? 'campaign'}`,
          name: campaign.campaignName ?? 'Untitled campaign',
          networkKey: owner.networkKey,
          networkLabel: getNetworkLabel(owner.networkKey),
          platform: String(campaign.platform ?? '').toLowerCase(),
          platformLabel: getPlatformLabel(String(campaign.platform ?? '')),
          socialAccountId: owner.id,
          socialAccountName: owner.displayName || owner.username || getNetworkLabel(owner.networkKey),
          adAccountId: campaign.platformAdAccountId ?? null,
          adAccountName: campaign.platformAdAccountName ?? null,
          currency: campaign.currency ?? null,
          status: String(campaign.status ?? 'unknown').toLowerCase(),
          reviewStatus: campaign.reviewStatus ?? null,
          objective: campaign.platformObjective ?? null,
          optimizationGoal: campaign.optimizationGoal ?? null,
          budgetLevel: campaign.budgetLevel ?? null,
          budgetAmount: budget?.amount == null ? null : roundMetric(toNumber(budget.amount)),
          budgetType: budget?.type ?? null,
          adCount: toInteger(campaign.adCount),
          metrics: buildMetricSummary(baseMetrics, campaign.currency ? 1 : 0),
          _baseMetrics: baseMetrics,
        };
      })
      .filter((campaign): campaign is InternalCampaignSummary => campaign !== null)
      .sort((left, right) => right._baseMetrics.spend - left._baseMetrics.spend);

    const adAccountsLookup = new Map<string, ZernioApiAdAccount[]>(
      adAccountsByWorkspaceAccount.map((item) => [item.workspaceAccountId, item.adAccounts]),
    );

    const workspaceAccounts: ZernioAdsWorkspaceAccountSummary[] = adsWorkspaceAccounts.map((workspaceAccount) => {
      const campaignsForWorkspaceAccount = normalizedCampaigns.filter((campaign) => campaign.socialAccountId === workspaceAccount.id);
      const knownAdAccounts = adAccountsLookup.get(workspaceAccount.id) ?? [];
      const campaignBuckets = new Map<string, InternalCampaignSummary[]>();

      for (const campaign of campaignsForWorkspaceAccount) {
        const bucketKey = campaign.adAccountId ?? `unmapped:${workspaceAccount.id}`;
        const bucket = campaignBuckets.get(bucketKey) ?? [];
        bucket.push(campaign);
        campaignBuckets.set(bucketKey, bucket);
      }

      const linkedAdAccounts: ZernioAdsLinkedAccountSummary[] = [];

      for (const knownAdAccount of knownAdAccounts) {
        const id = knownAdAccount.id ?? knownAdAccount.name ?? `${workspaceAccount.id}-ad-account`;
        const campaignsForAdAccount = campaignBuckets.get(id) ?? [];
        const stats = summarizeCampaignGroup(campaignsForAdAccount);

        linkedAdAccounts.push({
          id,
          name: knownAdAccount.name ?? id,
          currency: knownAdAccount.currency ?? campaignsForAdAccount[0]?.currency ?? null,
          status: knownAdAccount.status ?? null,
          timezoneName: knownAdAccount.timezoneName ?? null,
          timezoneOffsetHoursUtc: knownAdAccount.timezoneOffsetHoursUtc ?? null,
          totalCampaigns: stats.totalCampaigns,
          activeCampaigns: stats.activeCampaigns,
          metrics: stats.metrics,
          spendByCurrency: stats.spendByCurrency,
          campaigns: campaignsForAdAccount.map(({ _baseMetrics: _discard, ...campaign }) => campaign),
        });
      }

      for (const [bucketKey, campaignsForBucket] of campaignBuckets.entries()) {
        if (linkedAdAccounts.some((item) => item.id === bucketKey)) {
          continue;
        }

        const stats = summarizeCampaignGroup(campaignsForBucket);
        linkedAdAccounts.push({
          id: bucketKey,
          name: campaignsForBucket[0]?.adAccountName ?? bucketKey,
          currency: campaignsForBucket[0]?.currency ?? null,
          status: null,
          timezoneName: null,
          timezoneOffsetHoursUtc: null,
          totalCampaigns: stats.totalCampaigns,
          activeCampaigns: stats.activeCampaigns,
          metrics: stats.metrics,
          spendByCurrency: stats.spendByCurrency,
          campaigns: campaignsForBucket.map(({ _baseMetrics: _discard, ...campaign }) => campaign),
        });
      }

      linkedAdAccounts.sort((left, right) => right.metrics.spend - left.metrics.spend);

      const workspaceStats = summarizeCampaignGroup(campaignsForWorkspaceAccount);

      return {
        id: workspaceAccount.id,
        platform: workspaceAccount.platform,
        networkKey: workspaceAccount.networkKey,
        networkLabel: getNetworkLabel(workspaceAccount.networkKey),
        username: workspaceAccount.username,
        displayName: workspaceAccount.displayName,
        profileUrl: workspaceAccount.profileUrl,
        isActive: workspaceAccount.isActive,
        totalCampaigns: workspaceStats.totalCampaigns,
        activeCampaigns: workspaceStats.activeCampaigns,
        metrics: workspaceStats.metrics,
        spendByCurrency: workspaceStats.spendByCurrency,
        adAccounts: linkedAdAccounts,
      };
    });

    const platformSummaries: ZernioAdsPlatformSummary[] = ZERNIO_ADS_NETWORK_ORDER
      .map((networkKey) => {
        const accountsForNetwork = workspaceAccounts.filter((account) => account.networkKey === networkKey);
        if (accountsForNetwork.length === 0) {
          return null;
        }

        const campaignsForNetwork = normalizedCampaigns.filter((campaign) => campaign.networkKey === networkKey);
        const stats = summarizeCampaignGroup(campaignsForNetwork);

        return {
          key: networkKey,
          label: getNetworkLabel(networkKey),
          connectedAccounts: accountsForNetwork.length,
          linkedAdAccounts: accountsForNetwork.reduce((count, account) => count + account.adAccounts.length, 0),
          totalCampaigns: stats.totalCampaigns,
          activeCampaigns: stats.activeCampaigns,
          metrics: stats.metrics,
          spendByCurrency: stats.spendByCurrency,
        };
      })
      .filter((summary): summary is ZernioAdsPlatformSummary => summary !== null);

    const totals = summarizeCampaignGroup(normalizedCampaigns);

        return {
          connectedVia: 'zernio',
          profileId,
          generatedAt: new Date().toISOString(),
          totals: {
            networks: platformSummaries.length,
            connectedAccounts: workspaceAccounts.length,
            linkedAdAccounts: workspaceAccounts.reduce((count, account) => count + account.adAccounts.length, 0),
            totalCampaigns: totals.totalCampaigns,
            activeCampaigns: totals.activeCampaigns,
            metrics: totals.metrics,
            spendByCurrency: totals.spendByCurrency,
          },
          platforms: platformSummaries,
          accounts: workspaceAccounts,
          campaigns: normalizedCampaigns.map(({ _baseMetrics: _discard, ...campaign }) => campaign),
        };
      },
      options?.refresh ?? false,
    );
  } catch {
    return null;
  }
}
