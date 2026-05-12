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
  agentCount?: number;
  tenant?: { company_name: string; session_id: string | null };
}

export interface WACrmConnectionStatus {
  configured: boolean;
  active: boolean;
  hasApiKey: boolean;
  hasWorkspaceUrl: boolean;
  reachable: boolean;
  statsAvailable: boolean;
  baseUrl: string | null;
  connectionRefMasked: string | null;
  checkedAt: string;
  status: 'not_configured' | 'configuration_incomplete' | 'reachable' | 'degraded';
  message: string;
  stats: WACrmStats | null;
}

export interface MarketplaceChatChannel {
  id: string;
  name: string;
  source: string;
}

export interface MarketplaceHubConnectionStatus {
  configured: boolean;
  active: boolean;
  hasAppId: boolean;
  hasSecretKey: boolean;
  hasBotSenderEmail: boolean;
  hasAiWebhook: boolean;
  reachable: boolean;
  checkedAt: string;
  status: 'not_configured' | 'configuration_incomplete' | 'reachable' | 'degraded';
  message: string;
  workspaceName: string | null;
  appIdMasked: string | null;
  botSenderEmail: string | null;
  aiWebhookUrl: string | null;
  webhookUrl: string | null;
  channels: MarketplaceChatChannel[];
}

export async function getWACrmStats(): Promise<WACrmStats | null> {
  const { data } = await api.get('/medsos/integrations/proxy/social-hub/stats');
  return (data.data ?? null) as WACrmStats | null;
}

export interface SocialPostAnalysisResult {
  analysis: string;
  generatedAt: string;
  model: string;
}

export async function generateSocialPostAnalysis(postId: number): Promise<SocialPostAnalysisResult> {
  const { data } = await api.post(`/medsos/posts/${postId}/analysis`);
  return data.data as SocialPostAnalysisResult;
}

export async function getWACrmStatus(): Promise<WACrmConnectionStatus> {
  const { data } = await api.get('/medsos/integrations/proxy/social-hub/status');
  return data.data as WACrmConnectionStatus;
}

export async function getMarketplaceHubStatus(): Promise<MarketplaceHubConnectionStatus> {
  const { data } = await api.get('/medsos/integrations/proxy/marketplace-hub/status');
  return data.data as MarketplaceHubConnectionStatus;
}

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
  networkKey: string;
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
  networkKey: string;
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
  key: string;
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

export async function getMetaOAuthStartUrl(): Promise<string> {
  const { data } = await api.get('/medsos/meta-oauth/start-url', {
    params: { returnPath: '/medsos/meta-ads' },
  });
  return (data.data as { oauthUrl: string }).oauthUrl;
}

export async function getMetaAdsSummary(): Promise<Record<string, any> | null> {
  const { data } = await api.get('/medsos/meta-oauth/summary');
  return (data.data ?? null) as Record<string, any> | null;
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

export async function getZernioConnectUrl(platform: string, returnPath = '/medsos/connections'): Promise<string> {
  const { data } = await api.get('/medsos/zernio/connect-url', { params: { platform, returnPath } });
  return (data.data as { authUrl: string }).authUrl;
}

export async function getZernioAdsConnectUrl(
  platform: string,
  accountId?: string,
  returnPath = '/medsos/ads'
): Promise<string> {
  const { data } = await api.get('/medsos/zernio/ads/connect-url', {
    params: { platform, accountId, returnPath },
  });
  return (data.data as { authUrl: string }).authUrl;
}

export async function getZernioAccounts(): Promise<ZernioAccount[]> {
  const { data } = await api.get('/medsos/zernio/accounts');
  return (data.data?.accounts ?? []) as ZernioAccount[];
}

export async function disconnectZernioAccount(accountId: string): Promise<void> {
  await api.delete(`/medsos/zernio/accounts/${accountId}`);
}

// ─── Zernio Post Management & Media ────────────────────────────────────────

export interface ZernioPostPayload {
  text?: string;
  mediaUrls?: string[];
  socialAccountIds?: string[];
  platforms?: Array<{ platform: string; accountId: string }>;
  scheduledAt?: string;
  publishNow?: boolean;
  isDraft?: boolean;
}

export async function createZernioPost(payload: ZernioPostPayload): Promise<any> {
  const { data } = await api.post('/medsos/zernio/post', payload);
  return data.data;
}

export async function generateZernioUploadLink(): Promise<any> {
  const { data } = await api.post('/medsos/zernio/media/upload-link');
  return data.data;
}

export async function checkZernioUploadStatus(token: string): Promise<any> {
  const { data } = await api.get(`/medsos/zernio/media/status/${encodeURIComponent(token)}`);
  return data.data;
}

// ─── Zernio Post Analytics ─────────────────────────────────────────────────

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
    analytics: { impressions: number; reach: number; likes: number; comments: number; shares: number; saves: number };
  }>;
}

export async function getZernioPostAnalytics(params?: {
  platform?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  page?: number;
  sortBy?: string;
  order?: string;
  refresh?: boolean;
}): Promise<ZernioPostAnalyticsItem[]> {
  const { data } = await api.get('/medsos/zernio/post-analytics', {
    params: {
      platform: params?.platform,
      fromDate: params?.fromDate,
      toDate: params?.toDate,
      limit: params?.limit,
      page: params?.page,
      sortBy: params?.sortBy,
      order: params?.order,
      refresh: params?.refresh ? 'true' : undefined,
    },
  });
  return (data.data?.posts ?? []) as ZernioPostAnalyticsItem[];
}

// ─── Zernio Inbox Conversations ────────────────────────────────────────────

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

export async function getZernioConversations(params?: {
  platform?: string;
  status?: 'active' | 'archived';
  limit?: number;
  cursor?: string;
  accountId?: string;
  refresh?: boolean;
}): Promise<{ conversations: ZernioConversation[]; hasMore: boolean; nextCursor: string | null }> {
  const { data } = await api.get('/medsos/zernio/conversations', {
    params: {
      platform: params?.platform,
      status: params?.status,
      limit: params?.limit,
      cursor: params?.cursor,
      accountId: params?.accountId,
      refresh: params?.refresh ? 'true' : undefined,
    },
  });
  return data.data as { conversations: ZernioConversation[]; hasMore: boolean; nextCursor: string | null };
}

export async function getZernioMessages(conversationId: string, accountId?: string): Promise<ZernioMessage[]> {
  const { data } = await api.get(`/medsos/zernio/conversations/${encodeURIComponent(conversationId)}/messages`, {
    params: accountId ? { accountId } : undefined,
  });
  return (data.data?.messages ?? []) as ZernioMessage[];
}

export async function sendZernioMessage(conversationId: string, accountId: string, message: string): Promise<{ messageId: string; status: string }> {
  const { data } = await api.post(`/medsos/zernio/conversations/${encodeURIComponent(conversationId)}/send`, { accountId, message });
  return data.data as { messageId: string; status: string };
}

// ─── Zernio CRM, Broadcasts, Sequences, Automations ────────────────────────

export async function listZernioContacts(): Promise<any> {
  const { data } = await api.get('/medsos/zernio/contacts');
  return data.data;
}

export async function createZernioBroadcast(payload: any): Promise<any> {
  const { data } = await api.post('/medsos/zernio/broadcasts', payload);
  return data.data;
}

export async function createZernioSequence(payload: any): Promise<any> {
  const { data } = await api.post('/medsos/zernio/sequences', payload);
  return data.data;
}

export async function createZernioAutomation(payload: any): Promise<any> {
  const { data } = await api.post('/medsos/zernio/automations', payload);
  return data.data;
}

export async function getZernioAdsSummary(params?: {
  fromDate?: string;
  toDate?: string;
  refresh?: boolean;
}): Promise<ZernioAdsSummary | null> {
  const { data } = await api.get('/medsos/zernio/ads/summary', {
    params: {
      fromDate: params?.fromDate,
      toDate: params?.toDate,
      refresh: params?.refresh ? '1' : undefined,
    },
  });
  return (data.data ?? null) as ZernioAdsSummary | null;
}

export async function getZernioAdsByCampaign(params: {
  campaignId: string;
  accountId?: string | null;
  adAccountId?: string | null;
  fromDate?: string;
  toDate?: string;
  refresh?: boolean;
}): Promise<ZernioAdListItem[]> {
  const { data } = await api.get('/medsos/zernio/ads/by-campaign', {
    params: {
      campaignId: params.campaignId,
      accountId: params.accountId || undefined,
      adAccountId: params.adAccountId || undefined,
      fromDate: params.fromDate,
      toDate: params.toDate,
      refresh: params.refresh ? '1' : undefined,
    },
  });
  return (data.data?.ads ?? []) as ZernioAdListItem[];
}

export async function getZernioAdAnalytics(params: {
  adId: string;
  fromDate?: string;
  toDate?: string;
  breakdowns?: string[];
  refresh?: boolean;
}): Promise<ZernioAdAnalyticsSummary | null> {
  const { data } = await api.get(`/medsos/zernio/ads/${params.adId}/analytics`, {
    params: {
      fromDate: params.fromDate,
      toDate: params.toDate,
      breakdowns: params.breakdowns?.join(','),
      refresh: params.refresh ? '1' : undefined,
    },
  });
  return (data.data ?? null) as ZernioAdAnalyticsSummary | null;
}

export async function generateAiCaption(prompt: string): Promise<string> {
  const { data } = await api.post('/medsos/posts/generate-caption', { prompt });
  return data.data.caption;
}

export async function generateAiReply(context: string): Promise<string> {
  const { data } = await api.post('/medsos/posts/generate-reply', { context });
  return data.data.suggestion;
}
