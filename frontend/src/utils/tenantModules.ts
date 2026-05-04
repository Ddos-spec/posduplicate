import type { TenantFeatures } from '../services/tenantService';

export type TenantModuleKey = 'pos' | 'accounting' | 'inventory' | 'commerSocial';

export type TenantModulesState = Record<TenantModuleKey, boolean>;

export const ALL_MODULES_ENABLED: TenantModulesState = {
  pos: true,
  accounting: true,
  inventory: true,
  commerSocial: true,
};

export const MODULE_LABELS: Record<TenantModuleKey, string> = {
  pos: 'MyPOS',
  accounting: 'MyAkuntan',
  inventory: 'MyInventory',
  commerSocial: 'MyCommerSocial',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const normalizeTenantModules = (rawFeatures: unknown): TenantModulesState => {
  if (!isRecord(rawFeatures)) {
    return ALL_MODULES_ENABLED;
  }

  const explicitModules = isRecord(rawFeatures.modules) ? rawFeatures.modules : null;
  if (explicitModules) {
    return {
      pos: explicitModules.pos !== false,
      accounting: explicitModules.accounting !== false,
      inventory: explicitModules.inventory !== false,
      commerSocial: explicitModules.commerSocial !== false,
    };
  }

  const hasLegacyFlags = [
    'pos',
    'accounting',
    'inventory',
    'commerSocial',
    'reports',
    'multiOutlet',
    'analytics',
  ].some((key) => key in rawFeatures);

  if (!hasLegacyFlags) {
    return ALL_MODULES_ENABLED;
  }

  return {
    pos: rawFeatures.pos !== false,
    accounting: rawFeatures.accounting !== false,
    inventory: rawFeatures.inventory !== false,
    commerSocial: rawFeatures.commerSocial !== false,
  };
};

export const buildTenantFeatures = (
  modules: TenantModulesState,
  previous?: TenantFeatures | null
): TenantFeatures => {
  const preserved = isRecord(previous) ? previous : {};

  return {
    ...preserved,
    pos: modules.pos,
    accounting: modules.accounting,
    inventory: modules.inventory,
    commerSocial: modules.commerSocial,
    reports: true,
    multiOutlet: true,
    analytics: true,
    modules: {
      pos: modules.pos,
      accounting: modules.accounting,
      inventory: modules.inventory,
      commerSocial: modules.commerSocial,
    },
  };
};

export const hasTenantModuleAccess = (
  rawFeatures: unknown,
  moduleKey: TenantModuleKey
) => normalizeTenantModules(rawFeatures)[moduleKey];

export const getEnabledModuleLabels = (rawFeatures: unknown) =>
  (Object.entries(normalizeTenantModules(rawFeatures)) as Array<[TenantModuleKey, boolean]>)
    .filter(([, enabled]) => enabled)
    .map(([key]) => MODULE_LABELS[key]);
