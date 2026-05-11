import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';
import { decrypt } from '../../../utils/crypto';
import {
  completeManagedIntegrationConnect,
  getManagedIntegrationHub,
  syncManagedIntegration,
} from '../../medsos/services/integrationHub.service';
import { getOrCreateZernioProfile, listZernioAccounts, type ZernioAccount } from '../../medsos/services/zernio.service';

type JsonRecord = Record<string, any>;
type ManagedConnectorSlug = 'social-hub' | 'marketplace-hub' | 'meta-ads-hub';

interface MyCommerSocialAdminConfig {
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

const zernioAdsPlatforms = new Set([
  'metaads',
  'linkedinads',
  'pinterestads',
  'tiktokads',
  'googleads',
  'xads',
]);

const managedIntegrationTypeMap = {
  'social-hub': 'managed_social_hub',
  'marketplace-hub': 'managed_marketplace_hub',
  'meta-ads-hub': 'managed_meta_ads_hub',
  'zernio-profile': 'zernio_profile',
} as const;

const defaultMyCommerSocialConfig: MyCommerSocialAdminConfig = {
  planName: 'starter',
  monthlyPrice: 500000,
  billingMode: 'bundled',
  maxProfiles: 1,
  maxSocialAccounts: 3,
  maxAdsAccounts: 1,
  maxTeamSeats: 2,
  waInboxEnabled: true,
  socialAdsEnabled: true,
  marketplaceEnabled: false,
  autoCreateZernioProfile: true,
  notes: '',
};

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};

const asArray = <T = any>(value: unknown): T[] => Array.isArray(value) ? (value as T[]) : [];

const asPositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
};

const parseString = (value: unknown, fallback = '') => {
  if (typeof value === 'string') {
    return value.trim();
  }
  return fallback;
};

const maskReference = (reference?: string | null): string | null => {
  if (!reference) {
    return null;
  }

  if (reference.length <= 8) {
    return `${reference.slice(0, 2)}***${reference.slice(-2)}`;
  }

  return `${reference.slice(0, 4)}••••${reference.slice(-4)}`;
};

const decryptCredentials = (value: unknown): JsonRecord => {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      return asRecord(decrypt(value));
    } catch {
      return {};
    }
  }

  return asRecord(value);
};

const getModuleEnabled = (rawFeatures: unknown) => {
  const features = asRecord(rawFeatures);
  const modules = asRecord(features.modules);

  if ('commerSocial' in modules) {
    return modules.commerSocial !== false;
  }

  if ('commerSocial' in features) {
    return features.commerSocial !== false;
  }

  return true;
};

const getMyCommerSocialConfig = (rawFeatures: unknown): MyCommerSocialAdminConfig => {
  const features = asRecord(rawFeatures);
  const source = asRecord(features.commerSocialConfig);

  return {
    planName: parseString(source.planName, defaultMyCommerSocialConfig.planName) || defaultMyCommerSocialConfig.planName,
    monthlyPrice: asPositiveNumber(source.monthlyPrice, defaultMyCommerSocialConfig.monthlyPrice),
    billingMode: parseString(source.billingMode, defaultMyCommerSocialConfig.billingMode) === 'custom' ? 'custom' : 'bundled',
    maxProfiles: asPositiveNumber(source.maxProfiles, defaultMyCommerSocialConfig.maxProfiles),
    maxSocialAccounts: asPositiveNumber(source.maxSocialAccounts, defaultMyCommerSocialConfig.maxSocialAccounts),
    maxAdsAccounts: asPositiveNumber(source.maxAdsAccounts, defaultMyCommerSocialConfig.maxAdsAccounts),
    maxTeamSeats: asPositiveNumber(source.maxTeamSeats, defaultMyCommerSocialConfig.maxTeamSeats),
    waInboxEnabled: parseBoolean(source.waInboxEnabled, defaultMyCommerSocialConfig.waInboxEnabled),
    socialAdsEnabled: parseBoolean(source.socialAdsEnabled, defaultMyCommerSocialConfig.socialAdsEnabled),
    marketplaceEnabled: parseBoolean(source.marketplaceEnabled, defaultMyCommerSocialConfig.marketplaceEnabled),
    autoCreateZernioProfile: parseBoolean(source.autoCreateZernioProfile, defaultMyCommerSocialConfig.autoCreateZernioProfile),
    notes: parseString(source.notes, defaultMyCommerSocialConfig.notes),
  };
};

const buildTenantFeatures = (
  rawFeatures: unknown,
  config: MyCommerSocialAdminConfig,
  moduleEnabled: boolean
) => {
  const features = asRecord(rawFeatures);
  const modules = asRecord(features.modules);

  const mergedModules = {
    pos: modules.pos ?? features.pos ?? true,
    accounting: modules.accounting ?? features.accounting ?? true,
    inventory: modules.inventory ?? features.inventory ?? true,
    commerSocial: moduleEnabled,
  };

  return {
    ...features,
    pos: mergedModules.pos,
    accounting: mergedModules.accounting,
    inventory: mergedModules.inventory,
    commerSocial: moduleEnabled,
    reports: features.reports ?? true,
    multiOutlet: features.multiOutlet ?? true,
    analytics: features.analytics ?? true,
    modules: mergedModules,
    commerSocialConfig: config,
  };
};

const normalizeIntegrationState = (status?: string | null, isActive?: boolean | null) => {
  if (isActive && (status === 'active' || status === 'connected')) {
    return 'connected';
  }

  switch ((status || '').toLowerCase()) {
    case 'active':
    case 'connected':
      return 'connected';
    case 'pending':
    case 'pending_user_action':
      return 'pending_user_action';
    case 'syncing':
      return 'syncing';
    case 'warning':
    case 'degraded':
      return 'degraded';
    case 'action_required':
    case 'expired':
    case 'reconnect_required':
      return 'action_required';
    default:
      return 'not_connected';
  }
};

const integrationStatusLabel = (state: string) => {
  switch (state) {
    case 'connected':
      return 'Connected';
    case 'pending_user_action':
      return 'Waiting approval';
    case 'syncing':
      return 'Syncing';
    case 'degraded':
      return 'Degraded';
    case 'action_required':
      return 'Action required';
    default:
      return 'Not connected';
  }
};

const resolveLatestDate = (...values: Array<Date | null | undefined>) => {
  const timestamps = values
    .map((value) => value instanceof Date ? value.getTime() : null)
    .filter((value): value is number => value !== null && !Number.isNaN(value));

  if (!timestamps.length) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
};

const mapIntegrationSummary = (
  row?: {
    integration_type: string;
    status: string;
    is_active: boolean;
    configuration: unknown;
    credentials: unknown;
    metadata: unknown;
    last_sync_at: Date | null;
    updated_at: Date;
  } | null
) => {
  const configuration = asRecord(row?.configuration);
  const metadata = asRecord(row?.metadata);
  const credentials = decryptCredentials(row?.credentials);
  const status = normalizeIntegrationState(row?.status, row?.is_active);

  return {
    status,
    statusLabel: integrationStatusLabel(status),
    workspaceName: parseString(configuration.workspaceName, '') || null,
    selectedAssetsCount: asArray(metadata.selectedAssets).length,
    lastSyncAt: row?.last_sync_at?.toISOString() || null,
    updatedAt: row?.updated_at?.toISOString() || null,
    connectionRefMasked: maskReference(credentials.connectionId || credentials.connectionRef || null),
  };
};

const mapTenantListItem = (tenant: {
  id: number;
  business_name: string;
  owner_name: string;
  email: string;
  subscription_plan: string | null;
  subscription_status: string | null;
  is_active: boolean | null;
  features: unknown;
  created_at: Date | null;
  updated_at: Date | null;
  _count?: { outlets: number; users_users_tenant_idTotenants: number };
  integrations: Array<{
    integration_type: string;
    status: string;
    is_active: boolean;
    configuration: unknown;
    credentials: unknown;
    metadata: unknown;
    last_sync_at: Date | null;
    updated_at: Date;
  }>;
}) => {
  const moduleEnabled = getModuleEnabled(tenant.features);
  const config = getMyCommerSocialConfig(tenant.features);
  const rowByType = new Map(tenant.integrations.map((row) => [row.integration_type, row]));
  const waRow = rowByType.get(managedIntegrationTypeMap['social-hub']) || null;
  const adsRow = rowByType.get(managedIntegrationTypeMap['meta-ads-hub']) || null;
  const zernioRow = rowByType.get(managedIntegrationTypeMap['zernio-profile']) || null;
  const zernioProfileId = parseString(asRecord(zernioRow?.metadata).profileId, '') || null;
  const waSummary = mapIntegrationSummary(waRow);
  const adsSummary = mapIntegrationSummary(adsRow);

  return {
    id: tenant.id,
    businessName: tenant.business_name,
    ownerName: tenant.owner_name,
    email: tenant.email,
    subscriptionPlan: tenant.subscription_plan || 'standard',
    subscriptionStatus: tenant.subscription_status || 'trial',
    isActive: tenant.is_active ?? true,
    createdAt: tenant.created_at?.toISOString() || null,
    updatedAt: tenant.updated_at?.toISOString() || null,
    moduleEnabled,
    config,
    usage: {
      userCount: tenant._count?.users_users_tenant_idTotenants ?? 0,
      outletCount: tenant._count?.outlets ?? 0,
    },
    workspace: {
      zernioProfileId,
      zernioProfileReady: Boolean(zernioProfileId),
      waConnected: waSummary.status === 'connected' || waSummary.status === 'syncing',
      waStatus: waSummary.status,
      waStatusLabel: waSummary.statusLabel,
      waWorkspaceName: waSummary.workspaceName,
      adsStatus: adsSummary.status,
      adsStatusLabel: adsSummary.statusLabel,
      lastSyncAt: resolveLatestDate(waRow?.last_sync_at, adsRow?.last_sync_at, zernioRow?.last_sync_at),
      connectionRefMasked: waSummary.connectionRefMasked,
    },
  };
};

const buildAdminDetail = async (tenantId: number) => {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      business_name: true,
      owner_name: true,
      email: true,
      phone: true,
      address: true,
      subscription_plan: true,
      subscription_status: true,
      is_active: true,
      features: true,
      max_outlets: true,
      max_users: true,
      created_at: true,
      updated_at: true,
      integrations: {
        where: {
          integration_type: {
            in: Object.values(managedIntegrationTypeMap),
          },
        },
        select: {
          integration_type: true,
          status: true,
          is_active: true,
          configuration: true,
          credentials: true,
          metadata: true,
          last_sync_at: true,
          updated_at: true,
        },
      },
      _count: {
        select: {
          outlets: true,
          users_users_tenant_idTotenants: true,
        },
      },
    },
  });

  if (!tenant) {
    return null;
  }

  const summary = mapTenantListItem(tenant);
  const rowByType = new Map(tenant.integrations.map((row) => [row.integration_type, row]));
  const marketplaceRow = rowByType.get(managedIntegrationTypeMap['marketplace-hub']) || null;
  const marketplaceConfiguration = asRecord(marketplaceRow?.configuration);
  const marketplaceMetadata = asRecord(marketplaceRow?.metadata);
  const marketplaceCredentials = decryptCredentials(marketplaceRow?.credentials);
  const integrationHub = await getManagedIntegrationHub(tenantId);
  let zernioAccounts: ZernioAccount[] = [];
  let zernioSyncError: string | null = null;

  if (summary.moduleEnabled && summary.workspace.zernioProfileId) {
    try {
      zernioAccounts = await listZernioAccounts(tenantId, tenant.business_name);
    } catch (error) {
      zernioSyncError = error instanceof Error ? error.message : 'Gagal membaca akun social workspace';
    }
  }

  const socialAccounts = zernioAccounts.filter((account) => !zernioAdsPlatforms.has(account.platform.toLowerCase()));
  const adsAccounts = zernioAccounts.filter((account) => zernioAdsPlatforms.has(account.platform.toLowerCase()));

  return {
    ...summary,
    tenant: {
      phone: tenant.phone,
      address: tenant.address,
      maxOutlets: tenant.max_outlets ?? 0,
      maxUsers: tenant.max_users ?? 0,
    },
    integrationHub,
    internalConnectors: {
      marketplaceHub: {
        workspaceName: parseString(marketplaceConfiguration.workspaceName, '') || null,
        appIdMasked: maskReference(marketplaceCredentials.appId || marketplaceCredentials.connectionId || null),
        hasSecretKey: Boolean(parseString(marketplaceCredentials.secretKey, '')),
        botSenderEmail: parseString(marketplaceCredentials.botSenderEmail, '') || null,
        aiWebhookUrl: parseString(marketplaceConfiguration.aiWebhookUrl, '') || null,
        aiWebhookTimeoutMs: asPositiveNumber(marketplaceConfiguration.aiWebhookTimeoutMs, 15000),
        aiSystemMessage: parseString(marketplaceConfiguration.aiSystemMessage, '') || null,
        notes: parseString(marketplaceMetadata.notes, ''),
      },
    },
    zernioAccounts,
    socialAccounts,
    adsAccounts,
    zernioSyncError,
  };
};

export const listMyCommerSocialTenants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const moduleStatus = typeof req.query.moduleStatus === 'string' ? req.query.moduleStatus : 'all';
    const plan = typeof req.query.plan === 'string' ? req.query.plan : 'all';

    const tenants = await prisma.tenants.findMany({
      where: {
        deleted_at: null,
        ...(search
          ? {
              OR: [
                { business_name: { contains: search, mode: 'insensitive' } },
                { owner_name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updated_at: 'desc' },
      select: {
        id: true,
        business_name: true,
        owner_name: true,
        email: true,
        subscription_plan: true,
        subscription_status: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        features: true,
        integrations: {
          where: {
            integration_type: {
              in: Object.values(managedIntegrationTypeMap),
            },
          },
          select: {
            integration_type: true,
            status: true,
            is_active: true,
            configuration: true,
            credentials: true,
            metadata: true,
            last_sync_at: true,
            updated_at: true,
          },
        },
        _count: {
          select: {
            outlets: true,
            users_users_tenant_idTotenants: true,
          },
        },
      },
    });

    let items = tenants.map(mapTenantListItem);

    if (moduleStatus === 'enabled') {
      items = items.filter((item) => item.moduleEnabled);
    } else if (moduleStatus === 'disabled') {
      items = items.filter((item) => !item.moduleEnabled);
    }

    if (plan !== 'all') {
      items = items.filter((item) => item.config.planName === plan);
    }

    const summary = {
      totalTenants: items.length,
      moduleEnabledTenants: items.filter((item) => item.moduleEnabled).length,
      zernioProfileReadyTenants: items.filter((item) => item.workspace.zernioProfileReady).length,
      waConnectedTenants: items.filter((item) => item.workspace.waConnected).length,
      estimatedMrr: items
        .filter((item) => item.moduleEnabled && item.isActive)
        .reduce((total, item) => total + item.config.monthlyPrice, 0),
    };

    res.json({
      success: true,
      data: {
        summary,
        items,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyCommerSocialTenantDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = Number(req.params.tenantId);
    if (!Number.isFinite(tenantId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TENANT_ID', message: 'Tenant ID tidak valid' },
      });
      return;
    }

    const detail = await buildAdminDetail(tenantId);
    if (!detail) {
      res.status(404).json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Tenant tidak ditemukan' },
      });
      return;
    }

    res.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyCommerSocialTenantConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = Number(req.params.tenantId);
    if (!Number.isFinite(tenantId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TENANT_ID', message: 'Tenant ID tidak valid' },
      });
      return;
    }

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { id: true, business_name: true, features: true },
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Tenant tidak ditemukan' },
      });
      return;
    }

    const currentConfig = getMyCommerSocialConfig(tenant.features);
    const nextConfig: MyCommerSocialAdminConfig = {
      planName: parseString(req.body?.planName, currentConfig.planName) || currentConfig.planName,
      monthlyPrice: asPositiveNumber(req.body?.monthlyPrice, currentConfig.monthlyPrice),
      billingMode: parseString(req.body?.billingMode, currentConfig.billingMode) === 'custom' ? 'custom' : 'bundled',
      maxProfiles: asPositiveNumber(req.body?.maxProfiles, currentConfig.maxProfiles),
      maxSocialAccounts: asPositiveNumber(req.body?.maxSocialAccounts, currentConfig.maxSocialAccounts),
      maxAdsAccounts: asPositiveNumber(req.body?.maxAdsAccounts, currentConfig.maxAdsAccounts),
      maxTeamSeats: asPositiveNumber(req.body?.maxTeamSeats, currentConfig.maxTeamSeats),
      waInboxEnabled: parseBoolean(req.body?.waInboxEnabled, currentConfig.waInboxEnabled),
      socialAdsEnabled: parseBoolean(req.body?.socialAdsEnabled, currentConfig.socialAdsEnabled),
      marketplaceEnabled: parseBoolean(req.body?.marketplaceEnabled, currentConfig.marketplaceEnabled),
      autoCreateZernioProfile: parseBoolean(req.body?.autoCreateZernioProfile, currentConfig.autoCreateZernioProfile),
      notes: parseString(req.body?.notes, currentConfig.notes),
    };

    const moduleEnabled = typeof req.body?.moduleEnabled === 'boolean'
      ? req.body.moduleEnabled
      : getModuleEnabled(tenant.features);

    const nextFeatures = buildTenantFeatures(tenant.features, nextConfig, moduleEnabled);

    await prisma.tenants.update({
      where: { id: tenantId },
      data: {
        features: nextFeatures as any,
        updated_at: new Date(),
      },
    });

    if (moduleEnabled && nextConfig.autoCreateZernioProfile) {
      await getOrCreateZernioProfile(tenantId, tenant.business_name);
    }

    const detail = await buildAdminDetail(tenantId);
    res.json({
      success: true,
      message: 'Konfigurasi MyCommerSocial berhasil diperbarui',
      data: detail,
    });
  } catch (error) {
    next(error);
  }
};

export const ensureMyCommerSocialZernioProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = Number(req.params.tenantId);
    if (!Number.isFinite(tenantId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TENANT_ID', message: 'Tenant ID tidak valid' },
      });
      return;
    }

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        business_name: true,
        features: true,
      },
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Tenant tidak ditemukan' },
      });
      return;
    }

    if (!getModuleEnabled(tenant.features)) {
      res.status(400).json({
        success: false,
        error: { code: 'MODULE_DISABLED', message: 'Aktifkan modul MyCommerSocial terlebih dahulu' },
      });
      return;
    }

    const profileId = await getOrCreateZernioProfile(tenantId, tenant.business_name);
    const detail = await buildAdminDetail(tenantId);

    res.json({
      success: true,
      message: 'Social workspace siap dipakai',
      data: {
        profileId,
        detail,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const syncMyCommerSocialConnector = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = Number(req.params.tenantId);
    const slug = req.params.slug as ManagedConnectorSlug;

    if (!Number.isFinite(tenantId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TENANT_ID', message: 'Tenant ID tidak valid' },
      });
      return;
    }

    if (!['social-hub', 'marketplace-hub', 'meta-ads-hub'].includes(slug)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CONNECTOR', message: 'Connector tidak dikenali' },
      });
      return;
    }

    const connector = await syncManagedIntegration(tenantId, slug);
    const detail = await buildAdminDetail(tenantId);

    res.json({
      success: true,
      message: 'Status connector berhasil disegarkan',
      data: {
        connector,
        detail,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const saveMyCommerSocialConnectorInternalConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = Number(req.params.tenantId);
    const slug = req.params.slug as ManagedConnectorSlug;

    if (!Number.isFinite(tenantId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TENANT_ID', message: 'Tenant ID tidak valid' },
      });
      return;
    }

    if (!['social-hub', 'marketplace-hub', 'meta-ads-hub'].includes(slug)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CONNECTOR', message: 'Connector tidak dikenali' },
      });
      return;
    }

    const connector = await completeManagedIntegrationConnect(tenantId, slug, {
      connectionId: typeof req.body?.connectionId === 'string' ? req.body.connectionId : undefined,
      appId: typeof req.body?.appId === 'string' ? req.body.appId : undefined,
      secretKey: typeof req.body?.secretKey === 'string' ? req.body.secretKey : undefined,
      botSenderEmail: typeof req.body?.botSenderEmail === 'string' ? req.body.botSenderEmail : undefined,
      aiWebhookUrl: typeof req.body?.aiWebhookUrl === 'string' ? req.body.aiWebhookUrl : undefined,
      aiWebhookAuthToken: typeof req.body?.aiWebhookAuthToken === 'string' ? req.body.aiWebhookAuthToken : undefined,
      aiWebhookTimeoutMs: typeof req.body?.aiWebhookTimeoutMs === 'number'
        ? req.body.aiWebhookTimeoutMs
        : typeof req.body?.aiWebhookTimeoutMs === 'string'
          ? Number(req.body.aiWebhookTimeoutMs)
          : undefined,
      aiSystemMessage: typeof req.body?.aiSystemMessage === 'string' ? req.body.aiSystemMessage : undefined,
      workspaceName: typeof req.body?.workspaceName === 'string' ? req.body.workspaceName : undefined,
      notes: typeof req.body?.notes === 'string' ? req.body.notes : undefined,
      vendorWorkspaceUrl: typeof req.body?.vendorWorkspaceUrl === 'string' ? req.body.vendorWorkspaceUrl : undefined,
      vendorWorkspaceEmail: typeof req.body?.vendorWorkspaceEmail === 'string' ? req.body.vendorWorkspaceEmail : undefined,
      subscriptionPlan: typeof req.body?.subscriptionPlan === 'string' ? req.body.subscriptionPlan : undefined,
      subscriptionStatus: typeof req.body?.subscriptionStatus === 'string' ? req.body.subscriptionStatus : undefined,
      renewalDate: typeof req.body?.renewalDate === 'string' ? req.body.renewalDate : undefined,
      billingOwnerName: typeof req.body?.billingOwnerName === 'string' ? req.body.billingOwnerName : undefined,
      selectedAssets: Array.isArray(req.body?.selectedAssets) ? req.body.selectedAssets : undefined,
    });
    const detail = await buildAdminDetail(tenantId);

    res.json({
      success: true,
      message: 'Konfigurasi internal connector berhasil disimpan',
      data: {
        connector,
        detail,
      },
    });
  } catch (error) {
    next(error);
  }
};
