import api from './api';

export interface ApiKey {
  id: number;
  key_name: string;
  is_active: boolean;
  created_at: string;
  last_used: string | null;
  expires_at: string | null;
}

export interface ApiKeyWithSecret extends ApiKey {
  api_key?: string; // Only returned when creating new key
}

export interface ApiDocumentation {
  baseUrl: string;
  version: string;
  authentication: {
    type: string;
    headerName: string;
    format: string;
  };
  endpoints: Array<{
    method: string;
    path: string;
    description: string;
    authentication: boolean;
    queryParameters: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
    }>;
    responseExample: any;
  }>;
  errorCodes: Array<{
    code: number;
    message: string;
    description: string;
  }>;
}

export const apiKeyService = {
  // Admin: Get all API keys for a tenant
  async getTenantApiKeys(tenantId: number): Promise<ApiKey[]> {
    const response = await api.get(`/api-keys/tenant/${tenantId}`);
    return response.data.data;
  },

  // Admin: Create new API key for a tenant
  async createApiKey(tenantId: number, keyName: string, expiresAt?: string): Promise<ApiKeyWithSecret> {
    const response = await api.post(`/api-keys/tenant/${tenantId}`, {
      keyName,
      expiresAt,
    });
    return response.data.data;
  },

  // Admin: Toggle API key status
  async toggleApiKeyStatus(keyId: number, isActive: boolean): Promise<ApiKey> {
    const response = await api.patch(`/api-keys/${keyId}/toggle`, { isActive });
    return response.data.data;
  },

  // Admin: Delete API key
  async deleteApiKey(keyId: number): Promise<void> {
    await api.delete(`/api-keys/${keyId}`);
  },

  // Admin: Get API documentation
  async getDocumentation(): Promise<ApiDocumentation> {
    const response = await api.get('/api-keys/documentation');
    return response.data.data;
  },

  // Owner: Get my API keys (read-only)
  async getMyApiKeys(): Promise<ApiKey[]> {
    const response = await api.get('/api-keys/my-keys');
    return response.data.data;
  },
};
