import api from './api';
import type { ManagedIntegrationHub } from './myCommerSocialIntegrations';
import type { ZernioAccount } from './medsosPostsService';

export interface MyCommerSocialAdminConfig {
  planName: string;
  monthlyPrice: number;
  billingMode: 'bundled' | 'custom';
  maxProfiles: number;
  maxSocialAccounts: number;
  maxAdsAccounts: number;
  maxTeamSeats: number;
  waInboxEnabled: boolean;
  socialAdsEnabled: boolean;
  marketplaceEnabled: boolean;
  autoCreateZernioProfile: boolean;
  notes: string;
}

export interface MyCommerSocialAdminTenantItem {
  id: number;
  businessName: string;
  ownerName: string;
  email: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  moduleEnabled: boolean;
  config: MyCommerSocialAdminConfig;
  usage: {
    userCount: number;
    outletCount: number;
  };
  workspace: {
    zernioProfileId: string | null;
    zernioProfileReady: boolean;
    waConnected: boolean;
    waStatus: string;
    waStatusLabel: string;
    waWorkspaceName: string | null;
    adsStatus: string;
    adsStatusLabel: string;
    lastSyncAt: string | null;
    connectionRefMasked: string | null;
  };
}

export interface MyCommerSocialAdminSummary {
  totalTenants: number;
  moduleEnabledTenants: number;
  zernioProfileReadyTenants: number;
  waConnectedTenants: number;
  estimatedMrr: number;
}

export interface MyCommerSocialAdminTenantDetail extends MyCommerSocialAdminTenantItem {
  tenant: {
    phone?: string | null;
    address?: string | null;
    maxOutlets: number;
    maxUsers: number;
  };
  integrationHub: ManagedIntegrationHub;
  internalConnectors: {
    marketplaceHub: {
      workspaceName: string | null;
      appIdMasked: string | null;
      hasSecretKey: boolean;
      botSenderEmail: string | null;
      aiWebhookUrl: string | null;
      aiWebhookTimeoutMs: number;
      notes: string;
    };
  };
  zernioAccounts: ZernioAccount[];
  socialAccounts: ZernioAccount[];
  adsAccounts: ZernioAccount[];
  zernioSyncError: string | null;
}

export interface MyCommerSocialAdminListResponse {
  summary: MyCommerSocialAdminSummary;
  items: MyCommerSocialAdminTenantItem[];
}

export interface UpdateMyCommerSocialAdminConfigPayload extends Partial<MyCommerSocialAdminConfig> {
  moduleEnabled?: boolean;
}

export interface SaveMyCommerSocialInternalConnectorPayload {
  connectionId?: string;
  appId?: string;
  secretKey?: string;
  botSenderEmail?: string;
  aiWebhookUrl?: string;
  aiWebhookAuthToken?: string;
  aiWebhookTimeoutMs?: number;
  workspaceName?: string;
  notes?: string;
  selectedAssets?: Array<{
    id?: string;
    label: string;
    kind: string;
    status?: string;
  }>;
}

export const myCommerSocialAdminService = {
  async getTenants(params?: { search?: string; moduleStatus?: string; plan?: string }) {
    const { data } = await api.get('/admin/mycommersocial/tenants', { params });
    return data.data as MyCommerSocialAdminListResponse;
  },

  async getTenantDetail(tenantId: number) {
    const { data } = await api.get(`/admin/mycommersocial/tenants/${tenantId}`);
    return data.data as MyCommerSocialAdminTenantDetail;
  },

  async updateTenantConfig(tenantId: number, payload: UpdateMyCommerSocialAdminConfigPayload) {
    const { data } = await api.patch(`/admin/mycommersocial/tenants/${tenantId}/config`, payload);
    return data.data as MyCommerSocialAdminTenantDetail;
  },

  async ensureProfile(tenantId: number) {
    const { data } = await api.post(`/admin/mycommersocial/tenants/${tenantId}/ensure-profile`);
    return data.data as { profileId: string; detail: MyCommerSocialAdminTenantDetail };
  },

  async syncConnector(tenantId: number, slug: 'social-hub' | 'marketplace-hub' | 'meta-ads-hub') {
    const { data } = await api.post(`/admin/mycommersocial/tenants/${tenantId}/connectors/${slug}/sync`);
    return data.data as { connector: unknown; detail: MyCommerSocialAdminTenantDetail };
  },

  async saveInternalConnectorConfig(
    tenantId: number,
    slug: 'social-hub' | 'marketplace-hub' | 'meta-ads-hub',
    payload: SaveMyCommerSocialInternalConnectorPayload,
  ) {
    const { data } = await api.patch(`/admin/mycommersocial/tenants/${tenantId}/connectors/${slug}/internal`, payload);
    return data.data as { connector: unknown; detail: MyCommerSocialAdminTenantDetail };
  },
};
