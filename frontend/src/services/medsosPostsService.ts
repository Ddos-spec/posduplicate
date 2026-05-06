import api from './api';

export type PostPlatform = 'instagram' | 'facebook' | 'tiktok';
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface SocialPost {
  id: number;
  content: string;
  media_urls: string[];
  platform: PostPlatform;
  scheduled_at: string | null;
  published_at: string | null;
  account_id: number | null;
  status: PostStatus;
  external_id: string | null;
  error_message: string | null;
  social_accounts?: { account_name: string; platform: string } | null;
  social_analytics?: {
    impressions?: number | null;
    reach?: number | null;
    likes?: number | null;
    comments?: number | null;
    shares?: number | null;
    saves?: number | null;
    engagement_rate?: number | null;
  } | null;
}

export interface SocialAccount {
  id: number;
  account_name: string;
  platform: PostPlatform;
  account_id: string;
}

export interface CreatePostPayload {
  content: string;
  platform: PostPlatform;
  scheduledAt?: string;
  accountId?: number;
  status?: PostStatus;
}

export async function getPosts(params?: {
  startDate?: string;
  endDate?: string;
  platform?: PostPlatform;
  status?: PostStatus;
}): Promise<SocialPost[]> {
  const { data } = await api.get('/medsos/posts', { params });
  return data.data as SocialPost[];
}

export async function createPost(payload: CreatePostPayload): Promise<SocialPost> {
  const { data } = await api.post('/medsos/posts', payload);
  return data.data as SocialPost;
}

export async function deletePost(id: number): Promise<void> {
  await api.delete(`/medsos/posts/${id}`);
}

export async function publishPost(id: number): Promise<void> {
  await api.post(`/medsos/posts/${id}/publish`);
}

export async function getSocialAccounts(): Promise<SocialAccount[]> {
  const { data } = await api.get('/medsos/accounts');
  return (data.data ?? []) as SocialAccount[];
}

export interface WACrmStats {
  totalCustomers: number;
  openChats: number;
  pendingChats: number;
  totalUnread: number;
  openEscalations: number;
  todayChats: number;
  todayMessages: number;
  totalUsers: number;
  tenant?: { company_name: string; session_id: string | null };
}

export async function getWACrmStats(): Promise<WACrmStats | null> {
  const { data } = await api.get('/medsos/integrations/proxy/social-hub/stats');
  return (data.data ?? null) as WACrmStats | null;
}

export interface MetaCampaignRow {
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
}

export interface MetaAdsSummary {
  metaUserName: string | null;
  adAccounts: Array<{ id: string; name: string; currency: string }>;
  activeCampaigns: number;
  totalCampaigns: number;
  campaigns: MetaCampaignRow[];
  totals: { spend: number; impressions: number; clicks: number };
}

export async function getMetaOAuthStartUrl(): Promise<string> {
  const { data } = await api.get('/medsos/meta-oauth/start-url', {
    params: { returnPath: '/medsos/meta-ads' },
  });
  return (data.data as { oauthUrl: string }).oauthUrl;
}

export async function getMetaAdsSummary(): Promise<MetaAdsSummary | null> {
  const { data } = await api.get('/medsos/meta-oauth/summary');
  return (data.data ?? null) as MetaAdsSummary | null;
}

// ─── Zernio ────────────────────────────────────────────────────────────────

export interface ZernioAccount {
  id: string;
  platform: string;
  username: string;
  displayName: string;
  profileUrl: string | null;
  isActive: boolean;
}

export async function getZernioConnectUrl(platform: string): Promise<string> {
  const { data } = await api.get('/medsos/zernio/connect-url', { params: { platform } });
  return (data.data as { authUrl: string }).authUrl;
}

export async function getZernioAccounts(): Promise<ZernioAccount[]> {
  const { data } = await api.get('/medsos/zernio/accounts');
  return (data.data?.accounts ?? []) as ZernioAccount[];
}

export async function disconnectZernioAccount(accountId: string): Promise<void> {
  await api.delete(`/medsos/zernio/accounts/${accountId}`);
}

export async function getZernioAdsSummary(): Promise<MetaAdsSummary | null> {
  const { data } = await api.get('/medsos/zernio/ads/summary');
  if (!data.data) return null;
  const z = data.data;
  return {
    metaUserName: z.accountName ?? null,
    adAccounts: z.adAccounts ?? [],
    activeCampaigns: (z.campaigns ?? []).filter((c: any) => c.status === 'ACTIVE').length,
    totalCampaigns: (z.campaigns ?? []).length,
    campaigns: (z.campaigns ?? []).map((c: any) => ({
      id: c.id, name: c.name, status: c.status, objective: c.objective ?? '-',
      spend: c.spend, impressions: c.impressions, clicks: c.clicks,
      ctr: c.ctr ?? '0', cpm: c.cpm ?? '0',
      dailyBudget: c.dailyBudget ?? null, lifetimeBudget: c.lifetimeBudget ?? null,
    })),
    totals: z.totals ?? { spend: 0, impressions: 0, clicks: 0 },
  } as MetaAdsSummary;
}
