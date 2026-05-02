import api from './api';

export type ManagedIntegrationStatus =
  | 'not_connected'
  | 'pending_user_action'
  | 'connected'
  | 'action_required'
  | 'syncing'
  | 'degraded';

export type ManagedIntegrationBrand =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'shopee'
  | 'tokopedia';

export interface ManagedIntegrationChannel {
  brand: ManagedIntegrationBrand;
  label: string;
}

export interface ManagedIntegrationAsset {
  id?: string;
  label: string;
  kind: string;
  status?: string;
}

export interface ManagedIntegrationConnector {
  id: number | null;
  slug: string;
  integrationType: string;
  name: string;
  category: 'social' | 'marketplace' | 'ads';
  description: string;
  providerName: string;
  providerKey: string;
  status: ManagedIntegrationStatus;
  statusLabel: string;
  isActive: boolean;
  healthScore: number;
  supportedChannels: ManagedIntegrationChannel[];
  capabilities: string[];
  billingNote: string;
  dashboardFeeNote: string;
  selectedAssets: ManagedIntegrationAsset[];
  setupChecklist: string[];
  requiredUserActions: string[];
  nextActions: string[];
  launchMode: 'hosted_link' | 'manual_reference';
  launchUrlConfigured: boolean;
  pricingUrl: string | null;
  docsUrl: string | null;
  supportUrl: string | null;
  callbackUrl: string;
  webhookUrl: string;
  lastSyncAt: string | null;
  connectedAt: string | null;
  connectionRefMasked: string | null;
  launchSession: {
    state: string;
    createdAt: string;
    launchUrl: string | null;
    returnPath: string;
    callbackUrl: string;
  } | null;
  lastError: string | null;
  lastWebhookEvent: {
    receivedAt: string;
    eventType: string;
  } | null;
  updatedAt: string | null;
  customerPaysDirectly: boolean;
  dashboardFee: {
    currency: string;
    amount: number;
    label: string;
    description: string;
  };
}

export interface ManagedIntegrationHub {
  billing: {
    dashboardFee: {
      currency: string;
      amount: number;
      label: string;
      description: string;
    };
    customerPaysConnectorDirectly: boolean;
    architecture: string;
    promise: string;
  };
  summary: {
    total: number;
    connected: number;
    pending: number;
    actionRequired: number;
    providerLinksConfigured: number;
  };
  connectors: ManagedIntegrationConnector[];
}

export interface BeginConnectResponse {
  slug: string;
  providerName: string;
  launchMode: 'redirect' | 'manual_reference';
  launchUrl: string | null;
  callbackUrl: string;
  returnUrl: string;
  instructions: string[];
}

export interface CompleteManagedIntegrationPayload {
  connectionId?: string;
  workspaceName?: string;
  notes?: string;
  selectedAssets?: ManagedIntegrationAsset[];
}

export async function getMyCommerSocialIntegrationHub(): Promise<ManagedIntegrationHub> {
  const { data } = await api.get('/medsos/integrations/hub');
  return data.data as ManagedIntegrationHub;
}

export async function beginMyCommerSocialConnect(slug: string, returnPath = '/medsos/connections'): Promise<BeginConnectResponse> {
  const { data } = await api.post(`/medsos/integrations/${slug}/connect`, { returnPath });
  return data.data as BeginConnectResponse;
}

export async function completeMyCommerSocialConnect(slug: string, payload: CompleteManagedIntegrationPayload): Promise<ManagedIntegrationConnector> {
  const { data } = await api.post(`/medsos/integrations/${slug}/complete`, payload);
  return data.data as ManagedIntegrationConnector;
}

export async function syncMyCommerSocialIntegration(slug: string): Promise<ManagedIntegrationConnector> {
  const { data } = await api.post(`/medsos/integrations/${slug}/sync`);
  return data.data as ManagedIntegrationConnector;
}

export async function disconnectMyCommerSocialIntegration(slug: string): Promise<ManagedIntegrationConnector> {
  const { data } = await api.post(`/medsos/integrations/${slug}/disconnect`);
  return data.data as ManagedIntegrationConnector;
}

